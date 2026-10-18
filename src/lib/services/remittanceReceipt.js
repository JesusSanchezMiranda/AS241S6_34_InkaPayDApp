import { referencePen, formatPen } from '../config/rates.js'

// Se dibuja texto en canvas; nunca se interpreta el alias o la referencia como HTML.
export async function downloadRemittanceReceipt(tx) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200; canvas.height = 1220
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tu navegador no permite generar el comprobante.')
  const tokens = getComputedStyle(document.documentElement)
  context.fillStyle = tokens.getPropertyValue('--bg-page').trim()
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = tokens.getPropertyValue('--accent-primary').trim()
  context.font = 'bold 42px sans-serif'
  context.fillText('InkaPay · Comprobante de remesa', 60, 90)
  const rows = [
    ['Estado', tx.status], ['Red', tx.networkName || tx.network?.name],
    ['Beneficiario', tx.beneficiaryName || 'Sin alias'], ['Dirección', tx.to],
    ['Monto', `${tx.amount} ${tx.symbol}`], ['Equivalente referencial', formatPen(referencePen(tx.amount, tx.symbol))],
    ['Motivo', tx.reason || 'Sin motivo'], ['Referencia', tx.reference || 'Sin referencia'],
    ['Hash', tx.hash], ['Fecha', new Date(tx.createdAt).toLocaleString('es-PE')],
    ['Explorador', tx.explorerUrl || `${tx.network?.explorer?.baseUrl}/tx/${tx.hash}`]
  ]
  let y = 150
  for (const [label, value] of rows) {
    context.fillStyle = tokens.getPropertyValue('--text-secondary').trim(); context.font = '22px sans-serif'
    context.fillText(label, 60, y)
    context.fillStyle = tokens.getPropertyValue('--text-primary').trim(); context.font = '24px sans-serif'
    const text = String(value || '—')
    const lines = text.match(/.{1,70}/gu) || ['—']
    for (const line of lines) { y += 32; context.fillText(line, 60, y) }
    y += 44
  }
  context.fillStyle = tokens.getPropertyValue('--text-secondary').trim(); context.font = '18px sans-serif'
  context.fillText('Tasas ilustrativas de demostración. El hash permite verificar el envío en la red.', 60, 1170)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar el archivo. Inténtalo de nuevo.')
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `InkaPay-remesa-${tx.hash}.png`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
