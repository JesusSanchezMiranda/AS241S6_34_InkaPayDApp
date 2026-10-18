// Construye enlaces de transacción consistentes para cada explorador configurado.
export function getExplorerTransactionUrl(network, hash) {
  if (!network?.explorer || !hash) return ''
  const base = (typeof network.explorer === 'string' ? network.explorer : network.explorer?.baseUrl || '').replace(/\/$/, '')
  return `${base}/tx/${hash}`
}
