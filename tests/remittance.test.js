import test from 'node:test'
import assert from 'node:assert/strict'
import { ethers } from 'ethers'
import { get } from 'svelte/store'
import { prepareRemittance, sendRemittance, trackRemittance, friendlyRemittanceError } from '../src/lib/services/remittance.js'
import { transactions, clearTransactions } from '../src/lib/stores/transactions.js'
import { mergeTransactions, remittanceRows } from '../src/lib/services/transactionHistory.js'
import { referencePen, estimateSavings } from '../src/lib/config/remittances.js'
import { formatPen, formatFeePen, ETH_PEN, SYS_PEN, USDC_PEN } from '../src/lib/config/rates.js'
import { fetchAddressTransactions, explorerRateLimitError } from '../src/lib/services/explorerApi.js'
import { wallet, applyBalanceDelta } from '../src/lib/stores/wallet.js'

const from = '0x1111111111111111111111111111111111111111'
const to = '0x2222222222222222222222222222222222222222'
const hash = `0x${'a'.repeat(64)}`
const token = { symbol: 'USDC', address: '0x3333333333333333333333333333333333333333', decimals: 6 }
const network = { id: 'test', chainId: 123, symbol: 'ETH', decimals: 18, type: 'evm', tokens: [token], explorer: { baseUrl: 'https://test.invalid', apiUrl: 'https://test.invalid/api', type: 'blockscout' } }
function signer(overrides = {}) {
  return { getAddress: async () => from, sendTransaction: async (tx) => tx,
    call: async ({ data }) => data.startsWith('0x313ce567') ? ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [6]) : ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [100000000n]),
    provider: { getNetwork: async () => ({ chainId: 123n }), getBalance: async () => ethers.parseEther('10'),
      getFeeData: async () => ({ gasPrice: 1000000000n }), estimateGas: async () => 21000n, getCode: async () => '0x1234', ...overrides } }
}

test('prepara nativo con monto exacto y margen de gas; envía la misma solicitud', async () => {
  const account = signer()
  const quote = await prepareRemittance({ signer: account, network, to, amount: '0.1' })
  assert.equal(quote.value, ethers.parseEther('0.1'))
  assert.equal(quote.gasLimit, 25200n)
  assert.equal(quote.fee, 25200000000000n)
  assert.equal((await sendRemittance({ signer: account, prepared: quote })).to, to)
})
test('rechaza direcciones, montos no positivos y decimales fuera de precisión', async () => {
  for (const amount of ['0', '-1', 'NaN', '0.0000000000000000001']) await assert.rejects(prepareRemittance({ signer: signer(), network, to, amount }), /monto/)
  for (const address of ['0xno', ethers.ZeroAddress]) await assert.rejects(prepareRemittance({ signer: signer(), network, to: address, amount: '1' }), /dirección/)
})
test('rechaza fondos insuficientes y ausencia de precio de gas', async () => {
  await assert.rejects(prepareRemittance({ signer: signer({ getBalance: async () => 1n }), network, to, amount: '1' }), /Saldo insuficiente/)
  await assert.rejects(prepareRemittance({ signer: signer({ getFeeData: async () => ({}) }), network, to, amount: '1' }), /comisión/)
})
test('USDC usa transfer y seis decimales sin confundir monto con gas nativo', async () => {
  const quote = await prepareRemittance({ signer: signer(), network, to, amount: '2.5', token })
  assert.equal(quote.value, 2500000n)
  assert.equal(quote.txRequest.to.toLowerCase(), token.address.toLowerCase())
  const decoded = new ethers.Interface(['function transfer(address,uint256)']).decodeFunctionData('transfer', quote.txRequest.data)
  assert.equal(decoded[0], to); assert.equal(decoded[1], 2500000n)
  await assert.rejects(prepareRemittance({ signer: signer({ getBalance: async () => 0n }), network, to, amount: '1', token }), /comisión/)
})
test('rechaza token no configurado o sin contrato desplegado', async () => {
  await assert.rejects(prepareRemittance({ signer: signer(), network: { ...network, tokens: [] }, to, amount: '1', token }), /no está disponible/)
  await assert.rejects(prepareRemittance({ signer: signer({ getCode: async () => '0x' }), network, to, amount: '1', token }), /no está disponible/)
})
test('impide enviar una revisión vencida o firmar tras cambiar cuenta/red', async () => {
  const account = signer(), quote = await prepareRemittance({ signer: account, network, to, amount: '1' })
  await assert.rejects(sendRemittance({ signer: account, prepared: { ...quote, preparedAt: 0 } }), /venció/)
  await assert.rejects(sendRemittance({ signer: signer({ getNetwork: async () => ({ chainId: 999n }) }), prepared: quote }), /cuenta o la red/)
  await assert.rejects(sendRemittance({ signer: { ...account, getAddress: async () => to }, prepared: quote }), /cuenta o la red/)
})
test('registra Pendiente → Confirmada conservando motivo, referencia y red', async () => {
  clearTransactions(); const states = []
  const result = await trackRemittance({ hash, wait: async () => ({ status: 1, fee: 21000n, blockNumber: 10 }) }, { network, networkId: network.id, reason: 'Salud', reference: 'Medicinas', from, to }, (tx) => states.push(tx.status))
  assert.deepEqual(states, ['Pendiente', 'Confirmada'])
  assert.equal(result.kind, 'remesa'); assert.equal(get(transactions)[0].reference, 'Medicinas')
})
test('un timeout conserva Pendiente y una reversión sí registra Error', async () => {
  for (const [error, status] of [[{ code: 'TIMEOUT' }, 'Pendiente'], [{ receipt: { status: 0 } }, 'Error']]) {
    clearTransactions()
    const result = await trackRemittance({ hash, wait: async () => { throw error } }, { network, networkId: network.id })
    assert.equal(result.status, status)
  }
})
test('aceleración actualiza hash y cancelación no anuncia éxito', async () => {
  clearTransactions(); const replacement = `0x${'b'.repeat(64)}`
  const result = await trackRemittance({ hash, wait: async () => { throw { code: 'TRANSACTION_REPLACED', cancelled: false, replacement: { hash: replacement }, receipt: { status: 1, fee: 1n } } } }, { network, networkId: network.id })
  assert.equal(result.hash, replacement); assert.equal(result.status, 'Confirmada')
  assert.equal(get(transactions).find((tx) => tx.hash === hash).status, 'Reemplazada')
  const cancelled = await trackRemittance({ hash, wait: async () => { throw { code: 'TRANSACTION_REPLACED', cancelled: true } } }, { network, networkId: network.id })
  assert.equal(cancelled.status, 'Error')
})
test('el historial excluye otras cuentas y redes; conserva metadata sin duplicar', () => {
  const local = { hash, from, to, networkId: network.id, kind: 'remesa', amount: '1', reason: 'Salud', status: 'Pendiente', feeNative: '0.001', tokenAddress: token.address }
  const remote = { ...local, id: `${hash}:token`, status: 'Confirmada', feeNative: undefined, kind: undefined }
  const rows = mergeTransactions([remote], [local, { ...local, hash: `0x${'c'.repeat(64)}`, networkId: 'other' }], from, network)
  assert.equal(rows.length, 1); assert.equal(rows[0].kind, 'remesa'); assert.equal(rows[0].status, 'Confirmada'); assert.equal(rows[0].feeNative, '0.001')
  assert.equal(mergeTransactions([remote], [local], token.address, network).length, 0)
  assert.equal(mergeTransactions([remote], [local], from, { ...network, id: 'other-network' }).length, 0)
})
test('el explorador determina estado, paginación y token; rechaza respuestas inválidas', async () => {
  const previousFetch = globalThis.fetch; const calls = []
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url)); return { ok: true, json: async () => ({ status: '1', result: [{ hash, from, to, value: '1000000', tokenDecimal: '6', tokenSymbol: 'USDC', contractAddress: token.address, blockNumber: '1', timeStamp: '1000', isError: '0' }] }) }
    }
    const result = await fetchAddressTransactions(from, network, 1, 1, { force: true })
    assert.equal(calls.length, 2); assert.equal(result.hasMore, true)
    assert.equal(result.transactions.find((tx) => tx.tokenAddress).amount, '1.0')
    assert.ok(result.transactions.every((tx) => tx.status === 'Confirmada'))
    assert.ok(calls.every((url) => url.includes(`address=${from}`)))
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ error: 'invalid' }) })
    await assert.rejects(fetchAddressTransactions(to, network), /no válida/)
    assert.equal((await fetchAddressTransactions(from, { ...network, explorer: {} })).supported, false)
  } finally { globalThis.fetch = previousFetch }
})
test('USDC y gas nativo se convierten a PEN por separado; el ahorro puede ser negativo', () => {
  assert.equal(referencePen(1, 'USDC'), 3.45)
  const saving = estimateSavings(10, 'USDC', '0.00001', 'ETH')
  assert.ok(Math.abs(saving.feePen - 0.08349) < 1e-10); assert.ok(saving.pen > 0)
  assert.ok(estimateSavings(1, 'USDC', '1', 'ETH').pen < 0)
  assert.equal(estimateSavings(1, 'USDC', null, 'ETH'), null)
})
test('los errores de la wallet tienen mensajes en español', () => {
  assert.match(friendlyRemittanceError({ code: 4001 }), /rechazada/)
  assert.match(friendlyRemittanceError({ code: 'INSUFFICIENT_FUNDS' }), /Fondos insuficientes/)
  assert.match(friendlyRemittanceError({ code: 'NETWORK_ERROR' }), /red/)
})

test('un transfer USDC revertido conserva la etiqueta, el beneficiario y el monto original', () => {
  const local = { hash, from, to, networkId: network.id, kind: 'remesa', amount: '2.5', symbol: 'USDC', tokenAddress: token.address, status: 'Pendiente' }
  const remote = { hash, from, to: token.address, networkId: network.id, amount: '0', symbol: 'ETH', status: 'Error', direction: 'enviada' }
  const rows = mergeTransactions([remote], [local], from, network)
  assert.equal(rows.length, 1); assert.equal(rows[0].kind, 'remesa'); assert.equal(rows[0].amount, '2.5'); assert.equal(rows[0].to, to); assert.equal(rows[0].status, 'Error')
})

test('Remesas lista solo los envíos hechos con InkaPay y no los movimientos de la billetera', () => {
  const remesa = { hash, from, to, networkId: network.id, kind: 'remesa', amount: '1', status: 'Confirmada' }
  const recibida = { hash: `0x${'d'.repeat(64)}`, from: to, to: from, networkId: network.id, amount: '0.5', status: 'Confirmada', direction: 'recibida' }
  const enviada = { hash: `0x${'e'.repeat(64)}`, from, to, networkId: network.id, amount: '0.2', status: 'Confirmada', direction: 'enviada' }
  const rows = remittanceRows([remesa, recibida, enviada])
  assert.equal(rows.length, 1); assert.equal(rows[0].hash, hash)
  assert.equal(remittanceRows([recibida, enviada]).length, 0)
})
test('el store de historial descarta respuestas tardías al cambiar de red y vuelve a consultar por cuenta', async () => {
  const { wallet } = await import('../src/lib/stores/wallet.js')
  const { selectedNetwork } = await import('../src/lib/stores/network.js')
  const { history } = await import('../src/lib/stores/history.js')
  const oldFetch = globalThis.fetch, oldWallet = get(wallet), oldNetwork = get(selectedNetwork)
  let release, latest, stop
  const gate = new Promise((resolve) => { release = resolve })
  const until = async (predicate) => {
    const start = Date.now()
    while (!predicate()) { if (Date.now() - start > 8000) throw new Error('El historial no terminó de cargar.'); await new Promise((resolve) => setTimeout(resolve, 10)) }
  }
  try {
    clearTransactions()
    globalThis.fetch = async (url) => {
      const parsed = new URL(url), account = parsed.searchParams.get('address')
      if (parsed.hostname === 'slow.invalid') await gate
      return { ok: true, json: async () => ({ status: '1', result: parsed.searchParams.get('action') === 'tokentx' ? [] : [{ hash, from: account, to, value: '1000', blockNumber: '1', timeStamp: '1000', isError: '0' }] }) }
    }
    const slow = { ...network, id: 'slow', explorer: { ...network.explorer, apiUrl: 'https://slow.invalid/api' } }
    const fast = { ...network, id: 'fast', explorer: { ...network.explorer, apiUrl: 'https://fast.invalid/api' } }
    wallet.set({ connected: true, address: from })
    selectedNetwork.set(slow)
    stop = history.subscribe((value) => { latest = value })
    assert.equal(latest.loading, true)
    selectedNetwork.set(fast)
    assert.equal(latest.transactions.length, 0)
    release()
    await until(() => !latest.loading && latest.transactions.length === 1)
    assert.equal(latest.transactions[0].networkId, 'fast')
    wallet.set({ connected: true, address: token.address })
    assert.equal(latest.transactions.length, 0)
    await until(() => !latest.loading && latest.transactions.length === 1)
    assert.equal(latest.transactions[0].from, token.address)
    wallet.set({ connected: false, address: '' })
    assert.equal(latest.transactions.length, 0)
  } finally { release(); stop?.(); globalThis.fetch = oldFetch; wallet.set(oldWallet); selectedNetwork.set(oldNetwork) }
})

test('429 respeta Retry-After y bloquea consultas de otras cuentas al mismo proveedor', async () => {
  const previousFetch = globalThis.fetch; let calls = 0
  const rateNetwork = { ...network, id: 'rate', explorer: { ...network.explorer, apiUrl: 'https://rate.invalid/api' } }
  try {
    globalThis.fetch = async () => { calls += 1; return { ok: false, status: 429, headers: { get: () => '120' } } }
    const now = Date.now()
    await assert.rejects(fetchAddressTransactions(from, rateNetwork), (error) => error.rateLimited && error.retryAt >= now + 120000 && !error.message.includes('HTTP'))
    await assert.rejects(fetchAddressTransactions(from, rateNetwork, 1, 20, { force: true }), (error) => error.rateLimited)
    await assert.rejects(fetchAddressTransactions(to, rateNetwork), (error) => error.rateLimited)
    assert.equal(calls, 1)
    assert.equal(explorerRateLimitError(null, 1000).retryAt, 61000)
    assert.equal(explorerRateLimitError('2', 1000).retryAt, 3000)
    assert.equal(explorerRateLimitError('Thu, 01 Jan 1970 00:00:05 GMT', 1000).retryAt, 5000)
  } finally { globalThis.fetch = previousFetch }
})

test('si el proveedor limita los tokens, conserva los movimientos nativos recibidos', async () => {
  const previousFetch = globalThis.fetch
  const partialNetwork = { ...network, id: 'partial', explorer: { ...network.explorer, apiUrl: 'https://partial.invalid/api' } }
  try {
    globalThis.fetch = async (url) => new URL(url).searchParams.get('action') === 'tokentx'
      ? { ok: false, status: 429, headers: { get: () => '60' } }
      : { ok: true, json: async () => ({ status: '1', result: [{ hash, from, to, value: '1000', blockNumber: '10' }] }) }
    const result = await fetchAddressTransactions(from, partialNetwork)
    assert.equal(result.transactions.length, 1)
    assert.ok(result.warning); assert.ok(result.retryAt > Date.now())
  } finally { globalThis.fetch = previousFetch }
})

test('Blockscout v2 normaliza nativo y USDC y pagina cada flujo con su propio cursor', async () => {
  const previousFetch = globalThis.fetch, calls = []
  const v2Network = { ...network, id: 'v2', explorer: { ...network.explorer, type: 'blockscout-v2', apiUrl: 'https://v2.invalid/api/v2' } }
  try {
    globalThis.fetch = async (url) => {
      const parsed = new URL(url); calls.push(parsed)
      const isToken = parsed.pathname.endsWith('token-transfers'), pageTwo = parsed.searchParams.has('block_number')
      const tx = { hash, transaction_hash: hash, from: { hash: from }, to: { hash: to }, value: ethers.parseEther('1').toString(), status: 'ok', timestamp: '2026-10-17T12:00:00Z', block_number: 100,
        ...(isToken ? { total: { value: '2500000', decimals: '6' }, token: { symbol: 'USDC', address_hash: token.address, decimals: '6' }, log_index: 1 } : { fee: { type: 'actual', value: '21000000000000' } }) }
      return { ok: true, json: async () => ({ items: pageTwo ? [] : [tx], next_page_params: pageTwo ? null : isToken ? { block_number: 100, log_index: 1 } : { block_number: 100, index: 10 } }) }
    }
    const first = await fetchAddressTransactions(from, v2Network)
    assert.equal(first.transactions.length, 2); assert.equal(first.hasMore, true)
    assert.equal(first.transactions.find((tx) => tx.symbol === 'USDC').amount, '2.5')
    assert.equal(first.transactions.find((tx) => tx.symbol === 'ETH').feeNative, '0.000021')
    const second = await fetchAddressTransactions(from, v2Network, 2)
    assert.equal(second.hasMore, false)
    assert.equal(calls[2].searchParams.get('index'), '10')
    assert.equal(calls[3].searchParams.get('log_index'), '1')
    assert.equal(calls[3].searchParams.get('type'), 'ERC-20')
    await fetchAddressTransactions(from, v2Network, 1, 20, { force: true })
    await fetchAddressTransactions(from, v2Network, 2)
    const exhausted = await fetchAddressTransactions(from, v2Network, 3)
    assert.equal(exhausted.transactions.length, 0)
    assert.equal(exhausted.hasMore, false)
  } finally { globalThis.fetch = previousFetch }
})

test('referencias únicas, decimales de SYS y comisiones pequeñas sin redondeo a cero', () => {
  assert.equal(ETH_PEN, 8349)
  assert.ok(Math.abs(SYS_PEN - 0.0069) < 1e-12)
  assert.equal(USDC_PEN, 3.45)
  assert.equal(referencePen(1, 'ETH'), ETH_PEN)
  assert.equal(referencePen(1, 'SYS'), SYS_PEN)
  assert.equal(referencePen(1, 'tSYS'), SYS_PEN)
  assert.equal(formatPen(referencePen(1, 'ETH')), 'S/ 8,349.00')
  assert.equal(formatPen(referencePen(1, 'SYS')), 'S/ 0.0069')
  assert.equal(formatPen(referencePen(1, 'USDC')), 'S/ 3.45')
  for (const symbol of ['POL', 'BTC', 'desconocido']) {
    assert.equal(referencePen(1, symbol), null)
    assert.equal(formatPen(referencePen(1, symbol)), 'Sin referencia')
    assert.equal(estimateSavings(1, symbol, '0.001', symbol), null)
  }
  assert.equal(formatFeePen(referencePen('0.0000001', 'ETH')), '< S/ 0.01')
  assert.equal(formatFeePen(0.01), 'S/ 0.01')
  assert.equal(formatFeePen(0), 'S/ 0.00')
})
test('el envío descuenta el saldo al instante sin recargar y respeta red y token', () => {
  const original = get(wallet)
  try {
    wallet.set({ connected: true, address: from, balance: '10', symbol: 'ETH', chainId: 123, network, error: '' })
    applyBalanceDelta({ amount: '0.1', symbol: 'ETH', networkId: 'test', feeNative: '0.000021' })
    assert.equal(Number(get(wallet).balance).toFixed(5), Number('9.899979').toFixed(5))
    // Un envío de token descuenta solo la comisión nativa.
    applyBalanceDelta({ amount: '5', symbol: 'USDC', networkId: 'test', feeNative: '0.0001' })
    assert.equal(Number(get(wallet).balance).toFixed(5), Number('9.899879').toFixed(5))
    // Un envío en otra red no altera el saldo mostrado.
    applyBalanceDelta({ amount: '1', symbol: 'SYS', networkId: 'otra', feeNative: '0' })
    assert.equal(Number(get(wallet).balance).toFixed(5), Number('9.899879').toFixed(5))
    // El saldo nunca se vuelve negativo.
    applyBalanceDelta({ amount: '100', symbol: 'ETH', networkId: 'test' })
    assert.equal(get(wallet).balance, '0')
    // Sin cuenta conectada no hay nada que descontar.
    wallet.set({ connected: false, address: '', balance: '', symbol: '', chainId: null, network: null, error: '' })
    applyBalanceDelta({ amount: '1', symbol: 'ETH', networkId: 'test' })
    assert.equal(get(wallet).balance, '')
  } finally { wallet.set(original) }
})
