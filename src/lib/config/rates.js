// Referencias ilustrativas acordadas para la demo; no son cotizaciones en vivo.
export const RATE_REFERENCE_DATE = '2026-10-17'
export const USD_PEN = 3.45
export const ETH_USD = 2420
export const SYS_USD = 0.002
export const USDC_USD = 1
export const POL_USD = null
export const USD_PRICES = Object.freeze({ ETH: ETH_USD, SYS: SYS_USD, tSYS: SYS_USD, USDC: USDC_USD, POL: POL_USD })
export const ETH_PEN = ETH_USD * USD_PEN
export const SYS_PEN = SYS_USD * USD_PEN
export const USDC_PEN = USDC_USD * USD_PEN

export function referencePen(amount, symbol) {
  const rate = Object.hasOwn(USD_PRICES, symbol) ? USD_PRICES[symbol] : null
  const value = Number(amount || 0)
  return rate == null || !Number.isFinite(value) ? null : value * rate * USD_PEN
}

// Conserva los decimales de importes pequeños como SYS sin perder la lectura en soles.
export function formatPen(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'Sin referencia'
  return `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(value) > 0 && Math.abs(value) < 0.01 ? 8 : 2 })}`
}

export function formatFeePen(value) {
  return value > 0 && value < 0.01 ? '< S/ 0.01' : formatPen(value)
}
