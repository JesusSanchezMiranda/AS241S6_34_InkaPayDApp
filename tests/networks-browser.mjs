import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { NETWORKS } from '../src/lib/config/networks.js'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.INKAPAY_PLAYWRIGHT_PATH || 'playwright')
const browser = await chromium.launch({ headless: true, ...(process.env.INKAPAY_BROWSER_PATH ? { executablePath: process.env.INKAPAY_BROWSER_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1920, height: 945 } })
const output = process.env.INKAPAY_TEST_OUTPUT || 'test-results'
await mkdir(output, { recursive: true })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let gate = null, started = () => {}
// Todas las consultas son simuladas: no se utiliza ninguna wallet ni RPC real.
await page.route(/^https:\/\//, async (route) => {
  const request = route.request(), url = new URL(request.url())
  if (request.method() === 'POST') {
    const data = request.postDataJSON(), rows = Array.isArray(data) ? data : [data]
    const waiting = gate
    if (waiting) { started(); await waiting }
    const network = NETWORKS.find((item) => [item.rpcUrl, ...(item.fallbackRpcUrls || [])].some((rpc) => rpc && new URL(rpc).host === url.host))
    const result = rows.map((item) => ({ jsonrpc: '2.0', id: item.id, result: item.method === 'eth_chainId' ? `0x${(network?.chainId || 1).toString(16)}` : '0x30927f74c9de0000' }))
    await route.fulfill({ json: Array.isArray(data) ? result : result[0] })
  } else if (url.pathname.startsWith('/api/v2/address/')) await route.fulfill({ json: { balance: '125000000' } })
  else await route.fallback()
})
try {
  await page.goto(process.env.INKAPAY_TEST_URL || 'http://localhost:5173/')
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('button', { name: 'Redes', exact: true }).click()
  await page.getByRole('status', { name: 'Cargando Redes', exact: true }).waitFor()
  assert.equal(await page.locator('.skeleton-page > .panel').count(), 2)
  await page.screenshot({ path: `${output}/redes-skeleton.png`, animations: 'disabled' })
  await page.locator('.skeleton-page').waitFor({ state: 'hidden' })
  assert.equal(await page.getByText('Arquitectura de Proveedores de Redes y RPCs', { exact: true }).count(), 0)
  const family = page.getByRole('group', { name: 'Tipo de red', exact: true })
  assert.equal(await family.getByRole('button').count(), 2)
  assert.equal(await page.getByRole('list', { name: 'Redes EVM', exact: true }).getByRole('button').count(), 8)
  for (const [width, height] of [[1920, 945], [1440, 900], [1366, 768], [1280, 720], [1100, 800]]) {
    await page.setViewportSize({ width, height })
    const layout = await page.locator('.networks-workspace').evaluate((el) => {
      const boxes = [...el.children].map((node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, x: r.x, right: r.right } })
      return { boxes, height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth }
    })
    assert.ok(layout.height <= height + 1 && layout.width <= width, `${width}x${height}: scroll de página`)
    assert.equal(layout.boxes.length, 2)
    assert.ok(Math.abs(layout.boxes[0].top - layout.boxes[1].top) < 2 && Math.abs(layout.boxes[0].height - layout.boxes[1].height) < 2)
    assert.ok(layout.boxes[1].x >= layout.boxes[0].right + 18 && layout.boxes.every((box) => box.bottom <= height))
    if (width === 1920 || width === 1280) await page.screenshot({ path: `${output}/redes-lista-${width}.png`, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: /Consultar saldo en/ }).click()
  await page.getByRole('alert').filter({ hasText: 'Escribe una dirección pública' }).waitFor()
  await page.getByLabel('Dirección pública', { exact: true }).fill('0x1111111111111111111111111111111111111111')
  await page.getByRole('button', { name: 'Seleccionar Ethereum Sepolia', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Seleccionar Ethereum Sepolia', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: /Consultar saldo en Ethereum Sepolia/ }).click()
  await page.locator('.balance-result').waitFor()
  assert.match(await page.locator('.balance-result').innerText(), /3.5 ETH/)
  await page.getByRole('button', { name: /Consulta multi-red/ }).click()
  await page.getByRole('button', { name: 'Consultar en redes EVM', exact: true }).click()
  await page.locator('.balance-table').waitFor()
  assert.equal(await page.locator('.balance-table tbody tr').count(), 8)
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true)
  await family.getByRole('button', { name: /UTXO/ }).click()
  assert.equal(await page.getByRole('list', { name: 'Redes UTXO', exact: true }).getByRole('button').count(), 3)
  assert.equal(await page.locator('.balance-table').count(), 0)
  await page.getByRole('button', { name: 'Seleccionar Bitcoin', exact: true }).click()
  await page.getByRole('button', { name: 'Consulta por red', exact: true }).click()
  await page.getByLabel('Dirección pública', { exact: true }).fill('bc1qtestonly')
  await page.getByRole('button', { name: 'Consultar saldo en Bitcoin', exact: true }).click()
  await page.locator('.balance-result').waitFor()
  assert.match(await page.locator('.balance-result').innerText(), /1.25 BTC/)
  await page.getByRole('button', { name: /Consulta multi-red/ }).click()
  await page.getByRole('button', { name: 'Consultar en redes UTXO', exact: true }).click()
  await page.locator('.balance-table').waitFor()
  assert.equal(await page.locator('.balance-table tbody tr').count(), 3)
  // Un resultado de la red anterior no debe aparecer después de cambiar la selección.
  await family.getByRole('button', { name: /EVM/ }).click()
  await page.getByRole('button', { name: 'Seleccionar Ethereum Hoodi', exact: true }).click()
  await page.getByRole('button', { name: 'Consulta por red', exact: true }).click()
  await page.getByLabel('Dirección pública', { exact: true }).fill('0x1111111111111111111111111111111111111111')
  let release
  gate = new Promise((resolve) => release = resolve)
  const requestStarted = new Promise((resolve) => started = resolve)
  await page.getByRole('button', { name: /Consultar saldo en Ethereum Hoodi/ }).click()
  await requestStarted
  await page.getByRole('status', { name: 'Consultando saldos', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Seleccionar Ethereum Sepolia', exact: true }).click()
  const finished = page.waitForResponse((response) => response.url().includes('hoodi.ethpandaops.io'))
  release(); gate = null
  await finished
  assert.equal(await page.locator('.balance-result').count(), 0)
  await page.getByRole('button', { name: /Consultar saldo en Ethereum Sepolia/ }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${output}/redes-lista-movil.png`, fullPage: true, animations: 'disabled' })
  assert.deepEqual(errors, [])
  console.log('CUMPLE: dos columnas alineadas sin scroll de página en cinco resoluciones, skeleton, lista EVM/UTXO, selección, saldo por red, multi-red, errores, resultados obsoletos descartados y móvil. Consultas simuladas.')
} finally { await browser.close() }
