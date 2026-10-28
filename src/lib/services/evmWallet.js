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

const normalizeAccounts = (accounts) =>
  Array.isArray(accounts) ? accounts.filter((account) => typeof account === 'string' && account) : []

const sameAddress = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())

const isRejectedRequest = (error) =>
  Number(error?.code) === 4001 || error?.code === 'ACTION_REJECTED' || /reject|cancel|deneg|denied/i.test(String(error?.message || ''))

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const accountsKey = (accounts) => accounts.map((account) => account.toLowerCase()).sort().join(',')

// Devuelve todas las cuentas que la DApp tiene autorizadas (sin abrir diálogos).
export async function getAuthorizedAccounts() {
  const ethereum = getEthereum()
  if (!ethereum?.request) return []
  try {
    return normalizeAccounts(await ethereum.request({ method: 'eth_accounts' }))
  } catch {
    return []
  }
}

// Devuelve la cuenta ya autorizada (sin abrir el diálogo de conexión).
export async function getAuthorizedAccount() {
  const [account] = await getAuthorizedAccounts()
  return account || null
}

// Pali actualiza la cuenta conectada al cerrar su selector; se reintenta brevemente.
async function readAccountsAfterSelection(previous = []) {
  const previousKey = accountsKey(previous)
  let accounts = await getAuthorizedAccounts()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (accounts.length && accountsKey(accounts) !== previousKey) break
    await wait(150)
    accounts = await getAuthorizedAccounts()
  }
  return accounts
}

/**
 * Abre el selector de cuentas de la wallet y devuelve las cuentas autorizadas.
 * Pali expone wallet_changeAccount; MetaMask usa wallet_requestPermissions.
 * Después se lee eth_accounts para reflejar exactamente lo que el usuario autorizó.
 */
export async function chooseWalletAccount() {
  const ethereum = getEthereum()
  if (!ethereum?.request) throw new Error('No se encontró una wallet EVM compatible (Pali Wallet o MetaMask).')

  const authorized = await getAuthorizedAccounts()

  // Primera conexión: el diálogo de conexión de la wallet permite elegir la cuenta.
  if (!authorized.length) {
    const requested = normalizeAccounts(await ethereum.request({ method: 'eth_requestAccounts', params: [] }))
    if (!requested.length) throw new Error('La wallet no devolvió ninguna cuenta. Desbloquéala e inténtalo de nuevo.')
    return { accounts: requested, selectorOpened: true }
  }

  let selectorOpened = false
  let lastError = null

  // Pali: selector nativo con todas las cuentas de la wallet.
  if (typeof window !== 'undefined' && window.pali?.request) {
    try {
      await ethereum.request({ method: 'wallet_changeAccount', params: [] })
      const accounts = await readAccountsAfterSelection(authorized)
      if (accounts.length) return { accounts, selectorOpened: true }
      throw new Error('Pali no devolvió la cuenta seleccionada. Desbloquéala e inténtalo de nuevo.')
    } catch (error) {
      if (isRejectedRequest(error)) throw error
      lastError = error
      // La wallet no implementa wallet_changeAccount; se prueba EIP-2255.
    }
  }

  // MetaMask y otras wallets EIP-2255 abren su selector de cuentas.
  try {
    await ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
    selectorOpened = true
    const accounts = await readAccountsAfterSelection(authorized)
    if (accounts.length) return { accounts, selectorOpened }
  } catch (error) {
    if (isRejectedRequest(error)) throw error
    lastError = error
    // Sin soporte EIP-2255: se conservan las cuentas ya autorizadas.
  }

  const accounts = await getAuthorizedAccounts()
  if (accounts.length) return { accounts, selectorOpened }
  if (lastError) throw lastError
  return { accounts, selectorOpened }
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

export function getEvmSigner(address) {
  if (!provider) throw new Error('Conecta Pali Wallet antes de enviar una transacción.')
  provider = new ethers.BrowserProvider(getEthereum())
  return address ? provider.getSigner(address) : provider.getSigner()
}

export async function switchEvmNetwork(network, preferredAddress) {
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
  const accounts = await provider.send('eth_accounts', [])
  // Con varias cuentas autorizadas, conserva la que inició sesión.
  const address = accounts.find((account) => sameAddress(account, preferredAddress)) || accounts[0]
  if (!address) throw new Error('No hay una cuenta EVM activa en Pali Wallet.')
  const snapshot = await getWalletSnapshot(address)
  if (snapshot.chainId !== network.chainId) throw new Error(`Pali no cambió a ${network.name}. Revisa la red activa en la wallet e inténtalo otra vez.`)
  return snapshot
}
