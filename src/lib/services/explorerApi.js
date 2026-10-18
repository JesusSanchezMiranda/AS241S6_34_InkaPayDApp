import { ethers } from 'ethers'

// Se reutiliza un minuto de datos y se comparte la pausa del proveedor entre cuentas/vistas.
const CACHE_MS = 60000
const MIN_REQUEST_INTERVAL_MS = 450
const cache = new Map()
const inFlight = new Map()
const providerCooldowns = new Map()
const v2Pages = new Map()
const v2ContextKey = (address, network, explorer, offset) => `${explorer.apiUrl}:${network.id}:${address.toLowerCase()}:${offset}`
const v2CursorSignature = (address, network, explorer, page, offset) => page === 1 ? 'start' : JSON.stringify(v2Pages.get(v2ContextKey(address, network, explorer, offset))?.get(page))
let apiQueue = Promise.resolve()
let lastApiRequestAt = 0

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

export function explorerRateLimitError(retryAfter, now = Date.now()) {
  const seconds = retryAfter == null || retryAfter === '' ? NaN : Number(retryAfter)
  const date = Number.isNaN(seconds) ? Date.parse(retryAfter) : NaN
  const delay = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Number.isFinite(date) ? Math.max(0, date - now) : 60000
  return Object.assign(new Error('El explorador está limitando temporalmente las consultas. Conservamos los movimientos disponibles y volveremos a consultar después de la pausa.'), { rateLimited: true, retryAt: now + delay })
}

function assertProviderReady(providerKey) {
  const retryAt = providerCooldowns.get(providerKey) || 0
  if (retryAt > Date.now()) throw Object.assign(explorerRateLimitError(null), { retryAt })
}

function scheduleApiRequest(request) {
  const queued = apiQueue.then(async () => {
    const pause = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastApiRequestAt))
    if (pause) await wait(pause)
    lastApiRequestAt = Date.now()
    return request()
  })
  apiQueue = queued.catch(() => {})
  return queued
}

async function readExplorerJson(url, providerKey, emptyAddress = false) {
  return scheduleApiRequest(async () => {
    assertProviderReady(providerKey)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (response.status === 429) {
        const error = explorerRateLimitError(response.headers?.get?.('Retry-After'))
        providerCooldowns.set(providerKey, error.retryAt)
        throw error
      }
      if (response.status === 404 && emptyAddress) return { items: [], next_page_params: null }
      if (!response.ok) throw new Error('El explorador no está disponible en este momento. Conservamos los movimientos anteriores; puedes volver a intentarlo.')
      return await response.json()
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('El explorador tardó demasiado en responder. Puedes volver a intentarlo.')
      if (error instanceof TypeError) throw new Error('No pudimos conectar con el explorador. Comprueba tu conexión y vuelve a intentar.')
      throw error
    } finally { clearTimeout(timeout) }
  })
}

async function fetchBlockscoutV2(address, network, explorer, page, offset) {
  const contextKey = v2ContextKey(address, network, explorer, offset)
  if (page === 1) v2Pages.set(contextKey, new Map([[1, { native: null, token: null }]]))
  const pages = v2Pages.get(contextKey), cursor = pages?.get(page)
  if (!cursor) throw new Error('Actualiza el historial antes de cargar movimientos anteriores.')
  const providerKey = new URL(explorer.apiUrl).origin
  async function fetchStream(type) {
    if (cursor[type] === false) return { items: [], next_page_params: null }
    const endpoint = type === 'native' ? 'transactions' : 'token-transfers'
    const url = new URL(`${explorer.apiUrl.replace(/\/$/, '')}/addresses/${address}/${endpoint}`)
    if (type === 'token') url.searchParams.set('type', 'ERC-20')
    Object.entries(cursor[type] || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)))
    const result = await readExplorerJson(url, providerKey, true)
    if (!Array.isArray(result.items)) throw new Error('El explorador devolvió una respuesta no válida. Vuelve a intentarlo.')
    return result
  }
  const native = await fetchStream('native')
  let token = { items: [], next_page_params: null }, partialError = null
  try { token = await fetchStream('token') }
  catch (error) { if (!native.items.length) throw error; partialError = error }
  // Cada flujo tiene su propio cursor: nunca se reutiliza el de monedas para tokens.
  const next = { native: native.next_page_params || false, token: partialError ? cursor.token : token.next_page_params || false }
  pages.set(page + 1, next)
  const normalized = [
    ...native.items.map((tx) => normalizeV2(tx, address, network, false)).filter((tx) => Number(tx.value) > 0 || tx.status === 'Error'),
    ...token.items.map((tx) => normalizeV2(tx, address, network, true))
  ]
  return { supported: true, hasMore: !!(next.native || next.token), warning: partialError?.message || '', retryAt: partialError?.retryAt || 0,
    transactions: [...new Map(normalized.map((tx) => [tx.id, tx])).values()].sort(compareTransactions) }
}

function normalizeV2(tx, address, network, token) {
  const row = normalize({ hash: token ? tx.transaction_hash : tx.hash, from: tx.from?.hash, to: tx.to?.hash,
    value: token ? tx.total?.value || '0' : tx.value || '0', tokenDecimal: tx.total?.decimals ?? tx.token?.decimals,
    tokenSymbol: tx.token?.symbol, contractAddress: tx.token?.address_hash, logIndex: String(tx.log_index ?? 0),
    timeStamp: tx.timestamp ? Math.floor(Date.parse(tx.timestamp) / 1000) : 0,
    blockNumber: tx.block_number, transactionIndex: tx.position ?? 0, confirmations: tx.confirmations,
    isError: tx.status === 'error' ? '1' : '0', gasUsed: tx.gas_used, gasPrice: tx.gas_price
  }, address, network, token ? 'token' : 'nativa')
  if (!token && tx.fee?.type === 'actual' && tx.fee.value != null) row.feeNative = ethers.formatUnits(tx.fee.value, network.decimals)
  return row
}

// Consulta los endpoints compatibles con Etherscan y normaliza nativas/ERC-20.
export async function fetchAddressTransactions(address, network, page = 1, offset = 20, { force = false } = {}) {
  let explorer = network?.explorer
  if (!explorer?.apiUrl || !explorer?.type || network.type !== 'evm') {
    return { supported: false, transactions: [] }
  }
  const apiKey = import.meta.env?.VITE_ETHERSCAN_API_KEY || ''
  // La clave de mainnet no debe sustituir silenciosamente la API pública de testnet.
  if (import.meta.env?.VITE_TESTNET_HISTORY_PROVIDER === 'etherscan' && [560048, 11155111].includes(network.chainId)) explorer = { ...explorer, apiUrl: 'https://api.etherscan.io/v2/api', type: 'etherscan' }
  if (explorer.type === 'etherscan' && !apiKey) {
    throw new Error('Este explorador requiere una API key. Configura VITE_ETHERSCAN_API_KEY en .env.local y reinicia Vite.')
  }

  const providerKey = new URL(explorer.apiUrl).origin
  const cacheKey = `${explorer.apiUrl}:${network.id}:${address.toLowerCase()}:${page}:${offset}`
  const cached = cache.get(cacheKey)
  const cursorSignature = explorer.type === 'blockscout-v2' ? v2CursorSignature(address, network, explorer, page, offset) : null
  if (!force && cached && Date.now() - cached.at < CACHE_MS && (explorer.type !== 'blockscout-v2' || cached.cursorSignature === cursorSignature)) {
    if (explorer.type === 'blockscout-v2') {
      const contextKey = v2ContextKey(address, network, explorer, offset)
      if (!v2Pages.has(contextKey)) v2Pages.set(contextKey, new Map())
      v2Pages.get(contextKey).set(page + 1, cached.nextCursor)
    }
    return cached.value
  }
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey)
  assertProviderReady(providerKey)

  const requestPromise = (async () => {
    if (explorer.type === 'blockscout-v2') {
      const value = await fetchBlockscoutV2(address, network, explorer, page, offset)
      cache.set(cacheKey, { at: Date.now(), value, cursorSignature, nextCursor: v2Pages.get(v2ContextKey(address, network, explorer, offset))?.get(page + 1) })
      return value
    }
    const baseParams = { address, page, offset, sort: 'desc', ...(explorer.type === 'etherscan' ? { chainid: network.chainId } : {}) }
    const fetchAction = async (action) => {
      const url = new URL(explorer.apiUrl)
      Object.entries({ ...baseParams, module: 'account', action, ...(apiKey && explorer.type === 'etherscan' ? { apikey: apiKey } : {}) })
        .forEach(([key, value]) => url.searchParams.set(key, String(value)))
      try {
          const payload = await readExplorerJson(url, providerKey)
          const apiMessage = `${payload.message || ''} ${payload.result || ''}`
          // Blockscout usa mensajes distintos cuando una dirección no tiene
          // transferencias de tokens; eso es un resultado vacío válido, no un error.
          if (payload.status === '0' && !/no (?:token )?(?:transactions|transfers) found/i.test(apiMessage)) {
            const rateLimited = /rate limit|max calls per sec|too many requests/i.test(apiMessage)
            if (rateLimited) {
              const error = explorerRateLimitError(null)
              providerCooldowns.set(providerKey, error.retryAt)
              throw error
            }
            throw new Error(typeof payload.result === 'string' ? payload.result : payload.message || 'No se pudieron consultar los movimientos.')
          }
          if (payload.status !== '0' && !Array.isArray(payload.result)) throw new Error('El explorador devolvió una respuesta no válida. Vuelve a intentarlo.')
          return Array.isArray(payload.result) ? payload.result : []
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('El explorador tardó demasiado en responder. Puedes volver a intentarlo.')
        if (error instanceof TypeError) throw new Error('No pudimos conectar con el explorador. Comprueba tu conexión y vuelve a intentar.')
        throw error
      }
    }

    // Las llamadas se serializan para no consumir el límite con txlist/tokentx paralelos.
    const nativeRows = await fetchAction('txlist')
    let tokenRows = [], partialError = null
    try { tokenRows = await fetchAction('tokentx') }
    catch (error) {
      // Si los tokens fallan, los movimientos nativos recibidos siguen siendo útiles.
      if (!nativeRows.length) throw error
      partialError = error
    }
    const normalizedNative = nativeRows.map((tx) => normalize(tx, address, network, 'nativa'))
    const normalizedTokens = tokenRows.map((tx) => normalize(tx, address, network, 'token'))
    // Las llamadas de contrato sin transferencia nativa no son movimientos de moneda.
    const movements = [...normalizedNative.filter((tx) => Number(tx.value) > 0 || tx.status === 'Error'), ...normalizedTokens]
    const unique = new Map()
    for (const tx of movements) unique.set(tx.id, tx)
    const value = {
      supported: true,
      warning: partialError?.message || '',
      retryAt: partialError?.retryAt || 0,
      hasMore: nativeRows.length >= offset || tokenRows.length >= offset,
      transactions: [...unique.values()].sort(compareTransactions)
    }
    cache.set(cacheKey, { at: Date.now(), value })
    return value
  })()
  inFlight.set(cacheKey, requestPromise)
  try { return await requestPromise }
  finally { inFlight.delete(cacheKey) }
}

function normalize(tx, address, network, type) {
  const isOutgoing = tx.from?.toLowerCase() === address.toLowerCase()
  const decimals = type === 'token' ? Number(tx.tokenDecimal || 18) : network.decimals
  let amount = '0'
  try { amount = ethers.formatUnits(tx.value || '0', decimals) } catch { /* el explorer puede omitir value */ }
  return {
    id: type === 'token'
      ? `${tx.hash}:token:${tx.contractAddress || tx.tokenID || tx.tokenSymbol}:${tx.logIndex || tx.to}:${tx.value}`
      : tx.hash,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: amount,
    amount,
    symbol: type === 'token' ? (tx.tokenSymbol || 'TOKEN') : network.symbol,
    timestamp: Number(tx.timeStamp || 0) * 1000,
    createdAt: Number(tx.timeStamp || 0) * 1000,
    blockNumber: Number(tx.blockNumber || 0),
    transactionIndex: Number(tx.transactionIndex || 0),
    logIndex: Number(tx.logIndex || 0),
    status: tx.isError === '1' || tx.txreceipt_status === '0' ? 'Error' : (Number(tx.blockNumber) > 0 || Number(tx.confirmations) > 0 ? 'Confirmada' : 'Pendiente'),
    tokenAddress: type === 'token' ? tx.contractAddress : null,
    feeNative: type === 'nativa' && tx.gasUsed && tx.gasPrice ? ethers.formatUnits(BigInt(tx.gasUsed) * BigInt(tx.gasPrice), network.decimals) : undefined,
    direction: isOutgoing ? 'enviada' : 'recibida',
    type,
    networkId: network.id,
    networkName: network.name,
    network
  }
}

function compareTransactions(a, b) {
  const timeDifference = (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0)
  if (timeDifference) return timeDifference
  const blockDifference = Number(b.blockNumber || 0) - Number(a.blockNumber || 0)
  if (blockDifference) return blockDifference
  return Number(b.transactionIndex || b.logIndex || 0) - Number(a.transactionIndex || a.logIndex || 0)
}
