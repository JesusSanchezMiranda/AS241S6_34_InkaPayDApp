// Valores ilustrativos de la demo: no representan una cotización ni una oferta.
export const TRADITIONAL_FEE_RATE = 0.07
import { referencePen } from './rates.js'
export { referencePen, formatPen, formatFeePen } from './rates.js'
export const REMITTANCE_REASONS = ['Apoyo familiar', 'Estudios', 'Salud', 'Alquiler', 'Otro']

// La comisión siempre está en moneda nativa, incluso si se envía USDC.
export function estimateSavings(amount, symbol, feeNative, nativeSymbol) {
  const principalPen = referencePen(amount, symbol)
  const feePen = feeNative == null ? null : referencePen(feeNative, nativeSymbol)
  if (principalPen == null || feePen == null) return null
  const pen = principalPen * TRADITIONAL_FEE_RATE - feePen
  return { pen, asset: pen / referencePen(1, symbol), traditionalPen: principalPen * TRADITIONAL_FEE_RATE, feePen }
}
