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
  if (!provider) {
    const ethereum = getEthereum()
    if (!ethereum) throw new Error('No existe un provider EVM disponible.')
    provider = new ethers.BrowserProvider(ethereum)
  }
  const [balance, network] = await Promise.all([provider.getBalance(address), provider.getNetwork()])
  const config = getNetworkByChainId(network.chainId)
  return { address, balance: ethers.formatEther(balance), symbol: config?.symbol || 'ETH', chainId: Number(network.chainId), network: config || { name: network.name, type: 'evm', chainId: Number(network.chainId), symbol: 'ETH' } }
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

export function getEvmSigner() { if (!provider) throw new Error('Conecta Pali Wallet antes de enviar una transacción.'); return provider.getSigner() }

export async function switchEvmNetwork(network) {
  const ethereum = getEthereum()
  if (!ethereum) throw new Error('Pali Wallet no está disponible.')
  try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.chainIdHex }] }) }
  catch (error) {
    if (Number(error?.code) !== 4902) throw error
    await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: network.chainIdHex, chainName: network.name, rpcUrls: [network.rpcUrl], nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: network.decimals }, blockExplorerUrls: [network.explorer] }] })
  }
  provider = new ethers.BrowserProvider(ethereum)
  return getWalletSnapshot((await provider.send('eth_accounts', []))[0])
}
