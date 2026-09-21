import { writable, get } from 'svelte/store'
import { getBalance, getWalletSnapshot } from '../services/evmWallet.js'
import { getUtxoBalance } from '../services/utxoWallet.js'

export const wallet = writable({ connected: false, address: '', balance: '', symbol: '', chainId: null, network: null, error: '' })

export async function setConnectedWallet(snapshot) {
  wallet.set({ ...snapshot, connected: true, error: '' })
}

export function disconnectWallet() {
  wallet.set({ connected: false, address: '', balance: '', symbol: '', chainId: null, network: null, error: '' })
}

export async function refreshWallet({ address = get(wallet).address } = {}) {
  if (!address) return;
  const snapshot = await getWalletSnapshot(address);
  wallet.set({ ...snapshot, connected: true, error: '' });
  return snapshot;
}

export async function refreshWalletBalance(targetNetwork) {
  const currentWallet = get(wallet);
  if (!currentWallet.address) return;
  try {
    const newBalance =
      targetNetwork.type === 'evm'
        ? await getBalance(currentWallet.address, targetNetwork)
        : await getUtxoBalance(currentWallet.address, targetNetwork);
    wallet.update((w) => ({
      ...w,
      network: targetNetwork,
      symbol: targetNetwork.symbol,
      balance: newBalance
    }));
  } catch {
    wallet.update((w) => ({
      ...w,
      network: targetNetwork,
      symbol: targetNetwork.symbol,
      balance: '0.00000'
    }));
  }
}
