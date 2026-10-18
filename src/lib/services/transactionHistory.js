import { getExplorerTransactionUrl } from './explorers.js'

export const compareTransactions = (a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0) || Number(b.blockNumber || 0) - Number(a.blockNumber || 0) || Number(b.transactionIndex || b.logIndex || 0) - Number(a.transactionIndex || a.logIndex || 0)

// La vista de Remesas lista solo los envíos hechos con InkaPay: el explorador no puede
// distinguir una remesa recibida de cualquier otra transferencia entrante a la cuenta.
export function remittanceRows(transactions) {
  return transactions.filter((tx) => tx.kind === 'remesa')
}

export function belongsToAccount(tx, address, networkId) {
  const account = address?.toLowerCase()
  return !!account && (tx.networkId || tx.network?.id) === networkId && [tx.from, tx.to].some((value) => value?.toLowerCase() === account)
}

// El explorador aporta movimientos/estado; el respaldo local aporta los datos del producto.
export function mergeTransactions(remote, local, address, network) {
  remote = remote.filter((tx) => belongsToAccount(tx, address, network.id))
  const own = local.filter((tx) => belongsToAccount(tx, address, network.id))
  const localByHash = new Map(own.map((tx) => [tx.hash.toLowerCase(), tx]))
  const remoteHashes = new Set(remote.map((tx) => tx.hash.toLowerCase()))
  const merged = remote.map((tx) => {
    const candidate = localByHash.get(tx.hash.toLowerCase())
    // Un transfer ERC-20 revertido aparece como llamada fallida al contrato.
    const failedToken = candidate?.tokenAddress && !tx.tokenAddress && tx.status === 'Error' && tx.to?.toLowerCase() === candidate.tokenAddress.toLowerCase()
    const match = candidate && (candidate.tokenAddress
      ? failedToken || tx.tokenAddress?.toLowerCase() === candidate.tokenAddress.toLowerCase() && tx.to?.toLowerCase() === candidate.to?.toLowerCase()
      : !tx.tokenAddress) ? candidate : null
    return { ...match, ...tx, ...(failedToken ? { to: candidate.to, amount: candidate.amount, value: candidate.amount, symbol: candidate.symbol, tokenAddress: candidate.tokenAddress } : {}), type: tx.direction === 'recibida' ? 'receive' : 'send',
      feeNative: tx.feeNative ?? match?.feeNative,
      error: tx.status === 'Confirmada' ? '' : match?.error,
      status: tx.status === 'Pendiente' && match?.status === 'Confirmada' ? match.status : tx.status,
      kind: match?.kind, explorerUrl: getExplorerTransactionUrl(network, tx.hash), source: 'explorer' }
  })
  for (const tx of own) {
    if (!remoteHashes.has(tx.hash.toLowerCase())) merged.push({ ...tx, id: tx.hash,
      direction: tx.from?.toLowerCase() === address.toLowerCase() ? 'enviada' : 'recibida',
      explorerUrl: getExplorerTransactionUrl(network, tx.hash), source: 'local' })
  }
  return merged.sort(compareTransactions)
}
