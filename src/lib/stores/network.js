import { writable } from 'svelte/store'
import { NETWORKS } from '../config/networks.js'
import { refreshWalletBalance } from './wallet.js'

export const availableNetworks = NETWORKS

// Red predeterminada: Ethereum Hoodi (red EVM con fondos de prueba) o la primera red EVM de la lista
const defaultEthereumNetwork = NETWORKS.find((n) => n.id === 'hoodi') || NETWORKS.find((n) => n.type === 'evm') || NETWORKS[0]

export const selectedNetwork = writable(defaultEthereumNetwork)

export function selectNetwork(network) {
  selectedNetwork.set(network)
  refreshWalletBalance(network)
}
