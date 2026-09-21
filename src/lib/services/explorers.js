// Construye enlaces de transacción consistentes para cada explorador configurado.
export function getExplorerTransactionUrl(network, hash) {
  if (!network?.explorer || !hash) return ''
  const base = network.explorer.replace(/\/$/, '')
  return `${base}/tx/${hash}`
}
