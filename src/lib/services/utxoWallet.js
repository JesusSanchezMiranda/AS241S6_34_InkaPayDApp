const getPali = () => typeof window !== 'undefined' ? window.pali : null

// Conecta con la API UTXO documentada por Pali (separada de window.ethereum).
export async function connectUtxoWallet() {
  const pali = getPali()
  if (!pali?.request) throw new Error('La API UTXO de Pali no está disponible.')
  await pali.request({ method: 'sys_requestAccounts', params: [] })
  return getUtxoSnapshot()
}

export async function getUtxoSnapshot() {
  const pali = getPali()
  if (!pali?.request) throw new Error('La API UTXO de Pali no está disponible.')
  const [address, balance, network] = await Promise.all([
    pali.request({ method: 'wallet_getAddress' }),
    pali.request({ method: 'wallet_getBalance' }),
    pali.request({ method: 'wallet_getNetwork' })
  ])
  return { address, balance: String(balance ?? 0), network }
}

// Consulta pública de saldo Syscoin UTXO mediante Blockbook; no necesita wallet conectada.
export async function getUtxoBalance(address, network) {
  if (!network?.blockbookUrl) throw new Error('La red UTXO no tiene Blockbook configurado.')
  if (!address || typeof address !== 'string') throw new Error('Dirección requerida')
  const cleanAddress = address.trim()
  if (cleanAddress.startsWith('0x')) {
    throw new Error('No compatible (Requiere dirección UTXO)')
  }
  const response = await fetch(`${network.blockbookUrl}/api/v2/address/${encodeURIComponent(cleanAddress)}`)
  if (!response.ok) throw new Error('Address UTXO no encontrada.')
  const data = await response.json()
  return (Number(data.balance || 0) / 10 ** (network.decimals ?? 8)).toFixed(8)
}

// Las versiones actuales documentan lectura de red, pero no un método universal
// para cambiarla. Probamos las variantes que han existido y damos un error útil.
export async function switchUtxoNetwork(network) {
  const pali = getPali()
  if (!pali) throw new Error('La API UTXO de Pali no está disponible.')
  if (typeof pali.switchNetwork === 'function') return pali.switchNetwork(network.networkKey)
  const candidates = ['wallet_switchNetwork', 'wallet_switchUtxoNetwork']
  for (const method of candidates) {
    try { return await pali.request({ method, params: [{ network: network.networkKey }] }) } catch { /* probar la siguiente variante */ }
  }
  throw new Error('Esta versión de Pali no expone cambio programático de redes UTXO. Cámbiala desde la extensión y vuelve a intentar.')
}
