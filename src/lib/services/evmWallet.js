import { ethers } from 'ethers'
import { getNetworkByChainId } from '../config/networks.js'

const getEthereum = () => typeof window !== 'undefined' ? window.ethereum : null
let provider = null

// Conecta la cuenta EVM activa de Pali y devuelve un snapshot listo para el store.
export async function connectPaliWallet() {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('No se encontró una wallet EVM compatible (Pali Wallet o MetaMask).')
  provider = new ethers.BrowserProvider(ethereum)
  const accounts = await provider.send('eth_requestAccounts', [])
  if (!accounts?.length) throw new Error('Pali no devolvió ninguna cuenta.')
  return getWalletSnapshot(accounts[0])
}

// Obtiene el saldo nativo y la red de una dirección usando el provider conectado.
export async function getWalletSnapshot(address) {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('No existe un provider EVM disponible.')
  // Un cambio externo de red invalida la caché de BrowserProvider.
  const snapshotProvider = new ethers.BrowserProvider(ethereum)
  provider = snapshotProvider
  const [balance, network] = await Promise.all([snapshotProvider.getBalance(address), snapshotProvider.getNetwork()])
  const config = getNetworkByChainId(network.chainId)
  return { address, balance: ethers.formatEther(balance), symbol: config?.symbol || 'ETH', chainId: Number(network.chainId), network: config || { id: `evm-${network.chainId}`, name: `Red ${network.chainId}`, type: 'evm', chainId: Number(network.chainId), symbol: 'ETH', decimals: 18 } }
}

export async function getBalance(address, networkConfig) {
  if (!address || typeof address !== 'string') throw new Error('Dirección requerida')
  const cleanAddress = address.trim()
  if (!cleanAddress.startsWith('0x') || cleanAddress.length !== 42) {
    throw new Error('No compatible (Requiere dirección EVM)')
  }
  const rpcs = [networkConfig?.rpcUrl, ...(networkConfig?.fallbackRpcUrls || [])].filter(Boolean)
  let lastError
  for (const rpc of rpcs) {
    try {
      const readProvider = new ethers.JsonRpcProvider(rpc, undefined, { staticNetwork: true })
      const balance = await readProvider.getBalance(cleanAddress)
      return ethers.formatUnits(balance, networkConfig?.decimals ?? 18)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError || new Error('Error al consultar el saldo en esta red.')
}

// Conserva el patrón de eventos probado en la implementación original.
export function subscribeToPaliEvents(callback) {
  const ethereum = getEthereum()
  if (!ethereum?.on) return () => {}
  const onAccountsChanged = async (accounts) => callback({ accounts, chainId: Number(await ethereum.request({ method: 'eth_chainId' })) })
  const onChainChanged = async (chainId) => callback({ accounts: await ethereum.request({ method: 'eth_accounts' }), chainId: Number(chainId) })
  ethereum.on('accountsChanged', onAccountsChanged)
  ethereum.on('chainChanged', onChainChanged)
  return () => { ethereum.removeListener?.('accountsChanged', onAccountsChanged); ethereum.removeListener?.('chainChanged', onChainChanged) }
}

export function getEvmSigner() {
  if (!provider) throw new Error('Conecta Pali Wallet antes de enviar una transacción.')
  provider = new ethers.BrowserProvider(getEthereum())
  return provider.getSigner()
}

export async function switchEvmNetwork(network) {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('Pali Wallet no está disponible.')
  try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.chainIdHex }] }) }
  catch (error) {
    if (Number(error?.code) !== 4902) throw error
    await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: network.chainIdHex, chainName: network.name, rpcUrls: [network.rpcUrl], nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: network.decimals }, blockExplorerUrls: [typeof network.explorer === 'string' ? network.explorer : network.explorer?.baseUrl].filter(Boolean) }] })
    // Agregar una red no implica que la wallet cambie a ella; solicita el cambio por separado.
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.chainIdHex }] })
  }
  provider = new ethers.BrowserProvider(ethereum)
  const [address] = await provider.send('eth_accounts', [])
  if (!address) throw new Error('No hay una cuenta EVM activa en Pali Wallet.')
  const snapshot = await getWalletSnapshot(address)
  if (snapshot.chainId !== network.chainId) throw new Error(`Pali no cambió a ${network.name}. Revisa la red activa en la wallet e inténtalo otra vez.`)
  return snapshot
}
