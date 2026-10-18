import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'

// Playwright es opcional: puede usarse la instalación del entorno sin tocar dependencias.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.INKAPAY_PLAYWRIGHT_PATH || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.INKAPAY_BROWSER_PATH ? { executablePath: process.env.INKAPAY_BROWSER_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const output = process.env.INKAPAY_TEST_OUTPUT || 'test-results'
await mkdir(output, { recursive: true })

// Ninguna prueba transmite fondos: el proveedor EIP-1193 y los endpoints se simulan.
await page.addInitScript(() => {
  const listeners = {}
  const from = '0x1111111111111111111111111111111111111111'
  const zeroHash = `0x${'0'.repeat(64)}`
  window.mockWallet = { address: from, chainId: '0xaa36a7', sent: [], rejected: false, mined: false, requests: [] }
  window.mockWallet.change = (chainId, address) => {
    if (chainId) { window.mockWallet.chainId = chainId; (listeners.chainChanged || []).forEach((fn) => fn(chainId)) }
    if (address) { window.mockWallet.address = address; (listeners.accountsChanged || []).forEach((fn) => fn([address])) }
  }
  const word = (value) => `0x${BigInt(value).toString(16).padStart(64, '0')}`
  const transaction = () => {
    const state = window.mockWallet, tx = state.sent.at(-1)
    return { ...tx, hash: `0x${state.sent.length.toString(16).padStart(64, 'a')}`, nonce: '0x0', blockHash: state.mined ? zeroHash : null, blockNumber: state.mined ? '0x64' : null, transactionIndex: state.mined ? '0x0' : null, input: tx?.data || '0x', value: tx?.value || '0x0', gas: tx?.gas || '0x5208', gasPrice: '0x3b9aca00', type: '0x0', chainId: state.chainId, v: '0x1b', r: word(1), s: word(2) }
  }
  window.ethereum = {
    on: (event, fn) => { (listeners[event] ||= []).push(fn) },
    removeListener: (event, fn) => { listeners[event] = (listeners[event] || []).filter((item) => item !== fn) },
    request: async ({ method, params = [] }) => {
      const state = window.mockWallet; state.requests.push(method)
      switch (method) {
        case 'eth_requestAccounts': case 'eth_accounts': return [state.address]
        case 'eth_chainId': return state.chainId
        case 'eth_getBalance': return '0x8ac7230489e80000'
        case 'eth_blockNumber': return `0x${(100 + state.sent.length + (state.mined ? 1 : 0)).toString(16)}`
        case 'eth_estimateGas': return '0x5208'
        case 'eth_gasPrice': case 'eth_maxPriorityFeePerGas': return '0x3b9aca00'
        case 'eth_getTransactionCount': return '0x0'
        case 'eth_getCode': return '0x1234'
        case 'eth_call': return params[0].data.startsWith('0x313ce567') ? word(6) : word(100000000)
        case 'eth_getBlockByNumber': return { hash: zeroHash, parentHash: zeroHash, number: '0x64', timestamp: '0x65000000', nonce: '0x0000000000000000', difficulty: '0x0', gasLimit: '0x1c9c380', gasUsed: '0x5208', miner: from, extraData: '0x', transactions: [], baseFeePerGas: '0x3b9aca00' }
        case 'eth_sendTransaction': {
          if (state.rejected) throw Object.assign(new Error('User rejected'), { code: 4001 })
          state.mined = false; state.sent.push(params[0])
          setTimeout(() => { state.mined = true }, 1600)
          return transaction().hash
        }
        case 'eth_getTransactionByHash': return transaction()
        case 'eth_getTransactionReceipt': return !state.mined ? null : { transactionHash: params[0], transactionIndex: '0x0', blockHash: zeroHash, blockNumber: '0x64', from: state.address, to: transaction().to, cumulativeGasUsed: '0x5208', gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00', contractAddress: null, logs: [], logsBloom: `0x${'0'.repeat(512)}`, status: '0x1', type: '0x0' }
        case 'wallet_switchEthereumChain': if (state.requireAdd) throw Object.assign(new Error('Red desconocida'), { code: 4902 }); state.change(params[0].chainId); return null
        case 'wallet_addEthereumChain': state.requireAdd = false; return null
        default: throw new Error(`RPC simulado sin método ${method}`)
      }
    }
  }
})
let apiFailure = false
let releaseHistory = null
const apiRequests = []
await page.route(/https:\/\/(?:.*blockscout\.com|explorer.*\.tanenbaum\.io|api\.etherscan\.io)\/(?:v2\/)?api(?:\/v2\/addresses\/[^/?]+\/(?:transactions|token-transfers))?(?:\?|$)/, async (route) => {
  const url = new URL(route.request().url()); apiRequests.push(url.toString())
  if (releaseHistory) await releaseHistory
  const v2 = url.pathname.includes('/api/v2/')
  const tokenAction = v2 ? url.pathname.endsWith('token-transfers') : url.searchParams.get('action') === 'tokentx'
  const state = await page.evaluate(() => ({ sent: window.mockWallet.sent, mined: window.mockWallet.mined }))
  const result = (url.hostname.includes('sepolia') || url.searchParams.get('chainid') === '11155111') && state.mined ? state.sent.flatMap((tx, index) => {
    const isToken = !!tx.data?.startsWith('0xa9059cbb')
    if (isToken !== tokenAction) return []
    return [{ hash: `0x${(index + 1).toString(16).padStart(64, 'a')}`, from: tx.from,
      to: isToken ? `0x${tx.data.slice(34, 74)}` : tx.to,
      value: isToken ? BigInt(`0x${tx.data.slice(74)}`).toString() : BigInt(tx.value).toString(),
      ...(isToken ? { tokenSymbol: 'USDC', tokenDecimal: '6', contractAddress: tx.to, logIndex: '0' } : {}),
      timeStamp: String(1700000000 + index), blockNumber: String(100 + index), confirmations: '1', isError: '0', gasUsed: '21000', gasPrice: '1000000000' }]
  }) : []
  const items = result.map((tx) => ({ hash: tx.hash, transaction_hash: tx.hash, from: { hash: tx.from }, to: { hash: tx.to }, value: tx.value,
    block_number: tx.blockNumber, timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(), status: 'ok', gas_used: tx.gasUsed, gas_price: tx.gasPrice,
    ...(tokenAction ? { log_index: 0, total: { value: tx.value, decimals: tx.tokenDecimal }, token: { address_hash: tx.contractAddress, decimals: tx.tokenDecimal, symbol: tx.tokenSymbol } } : {}) }))
  await route.fulfill({ json: apiFailure ? { status: '0', message: 'NOTOK', result: 'Explorador temporalmente no disponible.' } : v2 ? { items, next_page_params: null } : { status: '1', result } })
})
// Evita consultas reales de saldo/RPC de lectura durante las pruebas.
await page.route(/https:\/\/(?:ethereum-sepolia-rpc\.publicnode\.com|rpc\.hoodi\.ethpandaops\.io|rpc-zk\.tanenbaum\.io|polygon\.drpc\.org)\/?$/, async (route) => {
  const body = route.request().postDataJSON(), rows = Array.isArray(body) ? body : [body]
  const results = rows.map((item) => ({ jsonrpc: '2.0', id: item.id, result: item.method === 'eth_chainId' ? route.request().url().includes('polygon') ? '0x89' : route.request().url().includes('hoodi') ? '0x88bb0' : route.request().url().includes('rpc-zk') ? '0xdee1' : '0xaa36a7' : item.method === 'eth_getBalance' ? '0x8ac7230489e80000' : null }))
  await route.fulfill({ json: Array.isArray(body) ? results : results[0] })
})
const desktopPanelHeights = new Map()
const remesasGutters = new Map()
async function checkDesktopLayout(stage) {
  for (const [width, height] of [[1920, 945], [1440, 900], [1366, 768], [1280, 720]]) {
    await page.setViewportSize({ width, height })
    const layout = await page.evaluate(() => {
      const panels = ['.flow', '.information-column', '.beneficiary-column > section'].map((selector) => document.querySelector(selector).getBoundingClientRect())
      const controls = document.querySelector('.switch-panel').getBoundingClientRect()
      const content = document.querySelector('.information').getBoundingClientRect()
      const summaryCards = [...document.querySelectorAll('#remittance-summary > section')].filter((card) => card.getClientRects().length).map((card) => {
        const { x, y, width, bottom } = card.getBoundingClientRect()
        return { x, y, width, bottom }
      })
      const body = document.querySelector('.flow-scroll')
      return { gutter: getComputedStyle(document.querySelector('main')).paddingLeft, pageHeight: document.documentElement.scrollHeight, viewport: innerHeight, pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, panels: panels.map(({ x, y, width, height, bottom }) => ({ x, y, width, height, bottom })), formOverflow: body.scrollHeight - body.clientHeight, controls: { x: controls.x, y: controls.y, width: controls.width, bottom: controls.bottom }, content: { x: content.x, y: content.y, width: content.width, bottom: content.bottom }, summaryCards }
    })
    assert.ok(layout.pageHeight <= height + 1, `${stage} ${width}x${height}: scroll de página (${layout.pageHeight})`)
    assert.ok(layout.pageWidth <= width, `${stage}: desbordamiento horizontal`)
    assert.ok(layout.panels.every((panel) => Math.abs(panel.height - layout.panels[0].height) < 2 && Math.abs(panel.y - layout.panels[0].y) < 2 && panel.bottom <= height), `${stage}: paneles desalineados`)
    assert.ok(Math.abs(layout.controls.x - layout.content.x) < 2 && Math.abs(layout.controls.width - layout.content.width) < 2, `${stage}: botones y contenido deben compartir ancho`)
    assert.ok(layout.content.y >= layout.controls.bottom + 8, `${stage}: las dos tarjetas centrales deben estar separadas`)
    assert.ok(Math.abs(layout.controls.y - layout.panels[0].y) < 2 && Math.abs(layout.content.bottom - layout.panels[0].bottom) < 2, `${stage}: la columna central debe alinearse arriba y abajo`)
    if (layout.summaryCards.length) {
      assert.equal(layout.summaryCards.length, 2)
      assert.ok(layout.summaryCards.every((card) => Math.abs(card.x - layout.content.x) < 2 && Math.abs(card.width - layout.content.width) < 2), `${stage}: ambas tarjetas de resumen deben compartir ancho`)
      assert.ok(layout.summaryCards[1].y >= layout.summaryCards[0].bottom + 8 && Math.abs(layout.summaryCards[1].bottom - layout.content.bottom) < 2, `${stage}: resumen y comparación deben estar separados y ocupar la altura disponible`)
    }
    remesasGutters.set(width, layout.gutter)
    const size = `${width}x${height}`
    if (!desktopPanelHeights.has(size)) desktopPanelHeights.set(size, layout.panels[0].height)
    assert.ok(Math.abs(desktopPanelHeights.get(size) - layout.panels[0].height) < 2, `${stage}: cambió la altura estándar entre pasos`)
    assert.ok(layout.formOverflow <= 1, `${stage} ${width}x${height}: formulario requiere ${layout.formOverflow}px de scroll interno`)
    if (width === 1366 || width === 1920) await page.screenshot({ path: `${output}/remesas-paso-${stage}-${height}.png`, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}

try {
  await page.goto(process.env.INKAPAY_TEST_URL || 'http://localhost:5173/')
  await page.getByRole('button', { name: 'Remesas', exact: true }).click()
  await page.getByRole('status', { name: 'Cargando Remesas', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Conectar wallet', exact: true }).count(), 0)
  await page.getByRole('status', { name: 'Cargando Remesas', exact: true }).waitFor({ state: 'hidden' })
  assert.equal(await page.locator('input').count(), 0)
  await page.getByRole('button', { name: 'Conectar wallet', exact: true }).click()
  await page.getByRole('heading', { name: 'Beneficiario', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.querySelector('#remittance-history section')?.getAttribute('aria-busy') === 'false')
  let finishHistory
  releaseHistory = new Promise((resolve) => finishHistory = resolve)
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  await page.getByRole('button', { name: '↻ Actualizar', exact: true }).click()
  await page.getByRole('status', { name: 'Cargando movimientos', exact: true }).waitFor()
  assert.equal(await page.locator('.history-skeleton .skeleton-row').count(), 3)
  finishHistory(); releaseHistory = null
  await page.getByRole('status', { name: 'Cargando movimientos', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Resumen', exact: true }).click()
  assert.match(await page.locator('main').innerText(), /Ethereum Sepolia/)
  assert.equal(await page.getByRole('heading', { name: '¿Cómo recibe tu familiar?', exact: true }).count(), 0)
  assert.equal(await page.locator('.remittance-layout > *').count(), 3)
  assert.equal(await page.locator('.beneficiary-column').getByRole('heading', { name: 'Beneficiarios frecuentes', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Resumen', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Historial', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Nuevo beneficiario', exact: false }).count(), 0)
  assert.equal(await page.locator('.demo-notice, .scope').count(), 0)
  assert.equal(await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize), '18px')
  assert.ok(await page.locator('.summary dl div').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)) >= 15)
  await checkDesktopLayout('beneficiario')
  assert.equal(await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled(), true)
  await page.getByLabel('Dirección de su wallet').fill('incorrecta')
  assert.equal(await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled(), true)
  await page.getByLabel('Dirección de su wallet').fill('0x2222222222222222222222222222222222222222')
  await page.getByLabel('Nombre o alias').fill('Mamá')
  assert.equal(await page.locator('.flow input[type=checkbox]').count(), 0)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('1')
  assert.match(await page.locator('#remittance-summary').innerText(), /S\/ 8,349.00/)
  await checkDesktopLayout('monto')
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const boxes = await Promise.all(['.flow', '.information-column', '.beneficiary-column'].map((selector) => page.locator(selector).boundingBox()))
    assert.ok(boxes.every((box) => Math.abs(box.y - boxes[0].y) < 2))
    assert.ok(boxes[1].x >= boxes[0].x + boxes[0].width)
    assert.ok(boxes[2].x >= boxes[1].x + boxes[1].width)
    assert.ok(boxes[2].width >= 265)
    assert.ok(boxes[1].height <= boxes[0].height + 2)
    assert.ok(boxes[2].height <= boxes[0].height + 2)
    if (width === 1280) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page.screenshot({ path: `${output}/remesas-1280.png`, fullPage: true, animations: 'disabled' })
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  }
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('0.001')
  await page.getByRole('button', { name: 'Salud', exact: true }).click()
  await page.getByLabel('Referencia libre (opcional)').fill('Medicinas de octubre')
  await page.getByRole('button', { name: 'Atrás', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  assert.equal(await page.getByLabel('Monto (ETH)', { exact: true }).inputValue(), '0.001')
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('1000')
  await page.getByRole('button', { name: 'Continuar a revisión' }).click()
  await page.getByRole('alert').filter({ hasText: /Saldo insuficiente|Fondos insuficientes/ }).waitFor()
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('0.001')
  await page.getByRole('button', { name: 'Continuar a revisión' }).click()
  await page.getByRole('heading', { name: 'Revisa tu remesa' }).waitFor()
  await checkDesktopLayout('revision')
  assert.equal(await page.getByRole('button', { name: 'Confirmar y enviar', exact: true }).isDisabled(), true)
  await page.getByText('Confirmo que el beneficiario').click()
  await page.evaluate(() => { window.mockWallet.rejected = true })
  await page.getByRole('button', { name: 'Confirmar y enviar', exact: true }).click()
  await page.getByRole('heading', { name: 'Monto y motivo' }).waitFor()
  assert.match(await page.locator('main').innerText(), /rechazada en Pali/)
  assert.equal(await page.evaluate(() => window.mockWallet.sent.length), 0)
  await page.evaluate(() => { window.mockWallet.rejected = false })
  await page.getByRole('button', { name: 'Continuar a revisión' }).click()
  await page.getByText('Confirmo que el beneficiario').click()
  await page.getByRole('button', { name: 'Confirmar y enviar', exact: true }).click()
  await page.getByRole('heading', { name: 'Tu comprobante' }).waitFor()
  assert.match(await page.locator('.flow').innerText(), /Pendiente/)
  assert.equal(await page.getByRole('button', { name: /^Red para el envío:/ }).isDisabled(), true)
  await page.getByText('Pendiente → Confirmada', { exact: false }).waitFor({ timeout: 15000 })
  await checkDesktopLayout('comprobante')
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  await page.getByText(/Verificado en explorador/).first().waitFor()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar comprobante', exact: true }).click()
  const download = await downloadPromise
  assert.match(download.suggestedFilename(), /\.png$/)
  await download.saveAs(`${output}/comprobante.png`)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: `${output}/remesas-escritorio.png`, fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Nueva remesa', exact: true }).click()
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Editar a Mamá', exact: true }).click()
  await page.getByLabel('Nombre del beneficiario').fill('Mamá Rosa')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  assert.equal(await page.getByLabel('Nombre o alias').inputValue(), '')
  await page.getByRole('button', { name: 'Volver a elegir a Mamá Rosa', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Activo', { exact: true }).selectOption('usdc')
  await page.getByLabel('Monto (USDC)', { exact: true }).fill('2.5')
  await page.getByRole('button', { name: 'Estudios', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar a revisión' }).click()
  await page.getByRole('heading', { name: 'Revisa tu remesa' }).waitFor()
  await checkDesktopLayout('revision-usdc')
  await page.getByText('Confirmo que el beneficiario').click()
  await page.getByRole('button', { name: 'Confirmar y enviar', exact: true }).click()
  await page.getByText('Pendiente → Confirmada', { exact: false }).waitFor({ timeout: 15000 })
  await checkDesktopLayout('comprobante-usdc')
  const sent = await page.evaluate(() => window.mockWallet.sent)
  assert.equal(sent.length, 2)
  assert.equal(sent[1].to.toLowerCase(), '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238')
  assert.ok(sent[1].data.startsWith('0xa9059cbb'))
  await page.getByRole('button', { name: /Ver comprobante de remesa: 2.5 USDC/ }).click()
  await page.getByRole('dialog').waitFor()
  await page.waitForFunction(() => document.querySelector('[role=dialog]')?.contains(document.activeElement))
  assert.equal(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)), true)
  for (const [width, height] of [[1920, 945], [1440, 900], [1366, 768], [1280, 720]]) {
    await page.setViewportSize({ width, height })
    const modal = await page.getByRole('dialog').evaluate((el) => {
      const box = el.getBoundingClientRect()
      const rows = [...el.querySelectorAll('.detail-row')].map((row) => { const r = row.getBoundingClientRect(); return { y: r.y, width: r.width } })
      return { width: box.width, top: box.top, bottom: box.bottom, overflow: el.scrollHeight - el.clientHeight, horizontal: el.scrollWidth - el.clientWidth, rows, footerBottom: el.querySelector('.modal-footer').getBoundingClientRect().bottom }
    })
    assert.ok(modal.width >= 800 && modal.top >= 0 && modal.bottom <= height + 1, 'El comprobante debe ser ancho y quedar dentro de la pantalla')
    assert.ok(modal.overflow <= 1 && modal.horizontal <= 1 && modal.footerBottom <= modal.bottom, `${width}x${height}: el modal no debe requerir scroll`)
    assert.ok(Math.abs(modal.rows[0].y - modal.rows[1].y) < 2 && modal.rows[0].width < modal.width / 2, 'Los campos del comprobante deben compartir fila')
    if (width === 1920 || width === 1280) await page.screenshot({ path: `${output}/modal-remesa-${width}.png`, animations: 'disabled' })
  }
  const modalDownload = page.waitForEvent('download')
  await page.getByRole('dialog').getByRole('button', { name: 'Descargar comprobante PNG', exact: true }).click()
  assert.match((await modalDownload).suggestedFilename(), /\.png$/)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => window.mockWallet.change('0x88bb0'))
  await page.getByRole('heading', { name: 'Beneficiario', exact: true }).waitFor()
  await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('2.5 USDC'))
  assert.equal(await page.getByRole('button', { name: /Ver comprobante de remesa/ }).count(), 0)
  assert.ok(apiRequests.some((url) => url.includes('eth-hoodi.blockscout.com') || url.includes('chainid=560048')))
  await page.evaluate(() => window.mockWallet.change('0xaa36a7'))
  await page.getByRole('button', { name: /Ver comprobante de remesa: 2.5 USDC/ }).waitFor()
  await page.evaluate(() => window.mockWallet.change(null, '0x4444444444444444444444444444444444444444'))
  await page.waitForFunction(() => !document.querySelector('main')?.innerText.includes('2.5 USDC'))
  assert.equal(await page.getByRole('button', { name: /Ver comprobante de remesa/ }).count(), 0)
  await page.evaluate(() => window.mockWallet.change(null, '0x1111111111111111111111111111111111111111'))
  await page.getByRole('button', { name: /Ver comprobante de remesa: 2.5 USDC/ }).waitFor()
  apiFailure = true
  await page.getByRole('button', { name: '↻ Actualizar', exact: true }).click()
  await page.getByRole('button', { name: 'Reintentar', exact: true }).waitFor()
  apiFailure = false
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await page.getByRole('button', { name: '↻ Actualizar', exact: true }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Con error', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: /Ver comprobante de remesa/ }).count(), 0)
  await page.waitForFunction(() => document.querySelector('#remittance-history section')?.getAttribute('aria-busy') === 'false')
  const requestCount = apiRequests.length
  await page.getByRole('button', { name: 'Resumen', exact: true }).click()
  assert.equal(await page.locator('#remittance-summary > section:visible').count(), 2)
  assert.equal(await page.locator('#remittance-history').isVisible(), false)
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  assert.equal(await page.locator('#remittance-summary').isVisible(), false)
  assert.equal(await page.locator('.information > .panel:visible').count(), 1)
  const historySize = await page.locator('#remittance-history').boundingBox()
  const contentSize = await page.locator('.information').boundingBox()
  assert.ok(Math.abs(historySize.height - contentSize.height) < 2 && Math.abs(historySize.width - contentSize.width) < 2, 'El historial debe ocupar el área completa en una sola tarjeta')
  assert.equal(await page.getByRole('button', { name: 'Con error', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.equal(apiRequests.length, requestCount)
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  // Solo el botón explícito precarga el beneficiario, en el paso 1 y sin repetir el importe.
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Volver a elegir a Mamá Rosa', exact: true }).click()
  await page.getByRole('heading', { name: 'Beneficiario', exact: true }).waitFor()
  assert.equal(await page.getByLabel('Nombre o alias').inputValue(), 'Mamá Rosa')
  assert.equal(await page.getByLabel('Dirección de su wallet').inputValue(), '0x2222222222222222222222222222222222222222')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  assert.equal(await page.getByLabel('Activo', { exact: true }).inputValue(), 'native')
  assert.equal(await page.getByLabel('Monto (ETH)', { exact: true }).inputValue(), '')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: `${output}/remesas-movil.png`, fullPage: true, animations: 'disabled' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Billetera', exact: true }).click()
  await page.getByRole('status', { name: 'Cargando Billetera', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Copiar dirección pública', exact: true }).count(), 0)
  await page.getByRole('status', { name: 'Cargando Billetera', exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('heading', { name: 'Enviar cuenta a cuenta', exact: true }).waitFor()
  for (const [width, height] of [[1280, 720], [1920, 945]]) {
    await page.setViewportSize({ width, height })
    assert.equal(await page.locator('main').evaluate((el) => getComputedStyle(el).paddingLeft), remesasGutters.get(width))
    assert.equal(await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize), '18px')
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true)
    assert.match(await page.locator('main').evaluate((el) => getComputedStyle(el).fontFamily), /Space Grotesk/)
    if (width === 1920) await page.screenshot({ path: `${output}/billetera-tipografia.png`, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.getByRole('heading', { name: 'Enviar remesa', exact: true }).count(), 0)
  await page.getByLabel('Dirección destino', { exact: true }).fill('0x2222222222222222222222222222222222222222')
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('0.0001')
  await page.getByRole('button', { name: 'Enviar transacción en Ethereum Sepolia' }).click()
  await page.waitForFunction(() => window.mockWallet.sent.length === 3)
  await page.waitForFunction(() => document.querySelector('.feedback.success')?.innerText.includes('Confirmada'), { timeout: 15000 })
  await page.getByRole('button', { name: 'Remesas', exact: true }).click()
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Eliminar a Mamá Rosa' }).click()
  await page.getByRole('button', { name: 'Sí, eliminar', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Editar a Mamá Rosa' }).count(), 0)
  assert.match(await page.locator('.beneficiary-column').innerText(), /Aún no tienes beneficiarios guardados/)
  // Los frecuentes anteriores se recuperan del historial sin guardar el contacto.
  await page.evaluate(async () => {
    const { addTransaction } = await import('/src/lib/stores/transactions.js')
    const { getNetworkById } = await import('/src/lib/config/networks.js')
    const network = getNetworkById('sepolia')
    addTransaction({ hash: `0x${'d'.repeat(64)}`, from: window.mockWallet.address, to: '0x5555555555555555555555555555555555555555', networkId: network.id, network, kind: 'remesa', status: 'Confirmada', amount: '0.01', symbol: 'ETH', beneficiaryName: 'Andre', reason: 'Alquiler', reference: 'Casa', feeNative: '0.00001', createdAt: new Date().toISOString() })
  })
  await page.locator('.beneficiary-column').getByText('Andre', { exact: true }).waitFor()
  await page.locator('.beneficiary-column').getByText('Andre', { exact: true }).click()
  assert.equal(await page.getByLabel('Nombre o alias').inputValue(), '')
  assert.equal(await page.getByLabel('Dirección de su wallet').inputValue(), '')
  assert.equal(await page.locator('.beneficiary-column .choose').getByRole('button').count(), 0)
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Volver a elegir a Andre', exact: true }).click()
  await page.getByRole('heading', { name: 'Beneficiario', exact: true }).waitFor()
  assert.equal(await page.getByLabel('Nombre o alias').inputValue(), 'Andre')
  assert.equal(await page.getByLabel('Dirección de su wallet').inputValue(), '0x5555555555555555555555555555555555555555')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  assert.equal(await page.getByLabel('Monto (ETH)', { exact: true }).inputValue(), '')
  assert.equal(await page.getByRole('button', { name: 'Alquiler', exact: true }).getAttribute('aria-pressed'), 'false')
  await page.getByRole('button', { name: 'Resumen', exact: true }).click()
  await page.setViewportSize({ width: 1920, height: 945 })
  await page.screenshot({ path: `${output}/remesas-andre-tercera-columna.png`, animations: 'disabled' })
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Editar a Andre', exact: true }).click()
  const editor = page.getByRole('form', { name: 'Editar beneficiario Andre', exact: true })
  assert.equal(await editor.getByLabel('Nombre del beneficiario').inputValue(), 'Andre')
  await editor.getByLabel('Nombre del beneficiario').fill('Andre guardado')
  await editor.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  assert.equal(await editor.count(), 0)
  assert.equal(await page.getByRole('heading', { name: 'Monto y motivo', exact: true }).count(), 1)
  assert.match(await page.locator('#remittance-summary').innerText(), /Andre/)
  assert.doesNotMatch(await page.locator('#remittance-summary').innerText(), /Andre guardado/)
  assert.equal(await page.locator('.beneficiary-column').getByText('Andre guardado', { exact: true }).count(), 1)
  await page.locator('.beneficiary-column').getByRole('button', { name: 'Eliminar a Andre guardado', exact: true }).click()
  await page.getByRole('button', { name: 'Sí, eliminar', exact: true }).click()
  assert.equal(await page.locator('.beneficiary-column').getByRole('button', { name: 'Volver a elegir a Andre guardado', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Billetera', exact: true }).click()
  await page.getByRole('button', { name: 'Remesas', exact: true }).click()
  assert.equal(await page.locator('.beneficiary-column').getByRole('button', { name: 'Volver a elegir a Andre guardado', exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  await page.getByRole('button', { name: 'Ver comprobante de remesa: 0.01 ETH, Confirmada', exact: true }).waitFor()
  await page.evaluate(async () => {
    const { saveBeneficiary } = await import('/src/lib/stores/beneficiaries.js')
    for (let i = 1; i <= 7; i++) saveBeneficiary({ name: `Familiar ${i}`, address: `0x${String(i).repeat(40)}` })
  })
  await page.locator('.beneficiary-column').getByRole('searchbox', { name: 'Buscar beneficiario' }).fill('Familiar 3')
  assert.equal(await page.locator('.beneficiary-column .row').count(), 1)
  await page.getByRole('button', { name: 'Volver a elegir a Familiar 3', exact: true }).click()
  assert.equal(await page.getByLabel('Nombre o alias').inputValue(), 'Familiar 3')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('heading', { name: 'Monto y motivo', exact: true }).waitFor()
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Salud', exact: true }).click()
  await page.getByRole('button', { name: 'Resumen', exact: true }).click()
  // Se usa el selector compartido, incluidos los eventos reales de cambio EIP-1193 simulados.
  async function changeNetwork(name) {
    await page.getByRole('button', { name: /^Red para el envío:/ }).click()
    await page.getByRole('option', { name, exact: false }).click()
    await page.waitForFunction(() => !document.querySelector('.heading-network [aria-busy=true]'))
  }
  await changeNetwork('Ethereum Hoodi')
  assert.equal(await page.getByLabel('Monto (ETH)', { exact: true }).inputValue(), '1')
  assert.match(await page.locator('#remittance-summary').innerText(), /Familiar 3[\s\S]*S\/ 8,349.00/)
  await changeNetwork('zkSYS')
  assert.equal(await page.getByLabel('Monto (SYS)', { exact: true }).inputValue(), '')
  await page.getByLabel('Monto (SYS)', { exact: true }).fill('1')
  assert.match(await page.locator('#remittance-summary').innerText(), /S\/ 0.0069/)
  await page.getByRole('button', { name: 'Continuar a revisión' }).click()
  await page.getByRole('heading', { name: 'Revisa tu remesa' }).waitFor()
  assert.match(await page.locator('.review').innerText(), /< S\/ 0.01/)
  await changeNetwork('Ethereum Sepolia')
  await page.getByLabel('Activo', { exact: true }).selectOption('usdc')
  await page.getByLabel('Monto (USDC)', { exact: true }).fill('1')
  assert.match(await page.locator('#remittance-summary').innerText(), /S\/ 3.45/)
  await changeNetwork('Ethereum Hoodi')
  assert.equal(await page.getByLabel('Monto (ETH)', { exact: true }).inputValue(), '')
  assert.match(await page.locator('.flow').innerText(), /USDC no está disponible en esta red/)
  await page.setViewportSize({ width: 1100, height: 900 })
  const medium = await Promise.all(['.flow', '.information-column', '.beneficiary-column'].map((selector) => page.locator(selector).boundingBox()))
  assert.ok(Math.abs(medium[1].y - medium[0].y) < 2)
  assert.ok(Math.abs(medium[1].y - medium[2].y) < 2)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('.beneficiary-column input').fill('')
  await page.getByLabel('Monto (ETH)', { exact: true }).fill('1')
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: `${output}/remesas-tres-paneles.png`, fullPage: true, animations: 'disabled' })
  await page.evaluate(() => { window.mockWallet.requireAdd = true })
  await changeNetwork('Polygon Mainnet')
  await page.getByLabel('Monto (POL)', { exact: true }).fill('1')
  assert.match(await page.locator('#remittance-summary').innerText(), /Sin referencia/)
  assert.equal(await page.locator('.demo-notice').count(), 0)
  assert.equal(await page.evaluate(() => window.mockWallet.requests.includes('wallet_addEthereumChain')), true)
  await changeNetwork('Ethereum Hoodi')
  await page.evaluate(() => window.mockWallet.change('0x999'))
  await page.getByRole('button', { name: 'Historial', exact: true }).click()
  await page.getByText('Esta red no tiene una API de historial compatible.', { exact: false }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Continuar a revisión', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Redes', exact: true }).click()
  await page.getByRole('heading', { name: 'Gestión de Redes y Proveedores', exact: true }).waitFor()
  assert.equal(await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize), '18px')
  assert.match(await page.locator('main').evaluate((el) => getComputedStyle(el).fontFamily), /Space Grotesk/)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('.skeleton-page').waitFor({ state: 'hidden' })
  await page.screenshot({ path: `${output}/redes-tipografia.png`, fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Inicio', exact: true }).click()
  assert.equal(await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize), '16px')
  assert.deepEqual(errors, [])
  console.log('CUMPLE: navegación, validación, beneficiarios, atrás/continuar, rechazo, nativo, USDC, pendiente/confirmada, PNG, modal/foco, cuenta/red, error/reintento, filtros persistentes, botones separados arriba y contenido alternable debajo, altura común estable, cuatro pasos sin scroll en 1920x945/1440x900/1366x768/1280x720, grid 1100/móvil, referencias ETH/SYS/USDC, búsqueda, selector/agregado de red, aviso testnet, tarjeta retirada, frecuentes anteriores en tercera columna y Billetera. Proveedor simulado; sin envíos reales.')
} catch (error) {
  console.error({ error: error.message, ui: await page.locator('body').innerText({ timeout: 3000 }), requests: await page.evaluate(() => window.mockWallet.requests.slice(-20)), pageErrors: errors })
  await page.screenshot({ path: `${output}/fallo.png`, fullPage: true })
  throw error
} finally { await browser.close() }
