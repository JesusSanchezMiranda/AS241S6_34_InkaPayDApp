import { writable, get } from 'svelte/store'
import { getBalance, getWalletSnapshot } from '../services/evmWallet.js'
import { getUtxoBalance } from '../services/utxoWallet.js'

export const wallet = writable({ connected: false, address: '', balance: '', symbol: '', chainId: null, network: null, error: '' })
let balanceRequest = 0
let snapshotRequest = 0

export async function setConnectedWallet(snapshot) {
  balanceRequest += 1
  snapshotRequest += 1
  wallet.set({ ...snapshot, connected: true, error: '' })
}

export function disconnectWallet() {
  balanceRequest += 1
  snapshotRequest += 1
  wallet.set({ connected: false, address: '', balance: '', symbol: '', chainId: null, network: null, error: '' })
}

export async function refreshWallet({ address = get(wallet).address } = {}) {
  if (!address) return;
  const request = ++snapshotRequest;
  balanceRequest += 1;
  const snapshot = await getWalletSnapshot(address);
  if (request !== snapshotRequest) return;
  wallet.set({ ...snapshot, connected: true, error: '' });
  return snapshot;
}

// Refleja un envío en el saldo al instante, sin recargar; la red reconcilia al confirmar.
export function applyBalanceDelta({ amount = 0, symbol, networkId, feeNative = 0 } = {}) {
  const current = get(wallet);
  if (!current.address) return;
  if (networkId && current.network?.id && current.network.id !== networkId) return;
  const spent = (!symbol || symbol === current.symbol ? Number(amount) : 0) + Number(feeNative || 0);
  if (!Number.isFinite(spent) || spent <= 0) return;
  // Invalida consultas de saldo en vuelo para que no pisen el valor optimista.
  balanceRequest += 1;
  wallet.update((w) => ({ ...w, balance: String(Math.max(0, Number(w.balance || 0) - spent)) }));
}

export async function refreshWalletBalance(targetNetwork) {
  const currentWallet = get(wallet);
  if (!currentWallet.address) return;
  const request = ++balanceRequest;
  try {
    const newBalance =
      targetNetwork.type === 'evm'
        ? await getBalance(currentWallet.address, targetNetwork)
        : await getUtxoBalance(currentWallet.address, targetNetwork);
    if (request !== balanceRequest || currentWallet.address !== get(wallet).address) return;
    wallet.update((w) => ({
      ...w,
      network: targetNetwork,
      symbol: targetNetwork.symbol,
      balance: newBalance
    }));
  } catch {
    if (request !== balanceRequest || currentWallet.address !== get(wallet).address) return;
    wallet.update((w) => ({
      ...w,
      network: targetNetwork,
      symbol: targetNetwork.symbol,
      balance: '0.00000'
    }));
  }
}
