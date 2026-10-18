import { derived, get, writable } from 'svelte/store'
import { ethers } from 'ethers'
import { wallet } from './wallet.js'
import { selectedNetwork } from './network.js'
import { transactions, updateTransaction } from './transactions.js'
import { fetchAddressTransactions } from '../services/explorerApi.js'
import { belongsToAccount, mergeTransactions } from '../services/transactionHistory.js'

const empty = { transactions: [], loading: false, error: '', retryAt: 0, hasMore: false, unsupported: false, page: 1 }
let lastAttemptAt = 0, resumeAt = 0
let activeKey = '', requestId = 0, remote = [], readContext, reloading = false
const state = writable(empty, () => {
  // Una única fuente compartida por Billetera y Remesas; se limpia al cambiar cuenta/red.
  const stop = derived([wallet, selectedNetwork], ([$wallet, $network]) => ({ address: $wallet.connected ? $wallet.address : '', network: $network }))
    .subscribe((context) => {
      const key = `${context.address.toLowerCase()}:${context.network.id}`
      readContext = context
      if (key === activeKey) return
      activeKey = key; requestId += 1; remote = []; reloading = false; resumeAt = 0
      state.set({ ...empty, unsupported: !context.network.explorer?.apiUrl || context.network.type !== 'evm' })
      void reloadHistory()
    })
  const timer = setInterval(() => {
    if (globalThis.document?.hidden || !readContext?.address) return
    const { retryAt } = get(state)
    if (retryAt ? Date.now() >= retryAt : Date.now() - lastAttemptAt >= 60000) void reloadHistory(!!retryAt, true)
  }, 1000)
  return () => { stop(); clearInterval(timer); requestId += 1; activeKey = '' }
})

export const history = derived([state, transactions, wallet, selectedNetwork], ([$state, $transactions, $wallet, $network]) => ({
  ...$state, transactions: $wallet.connected ? mergeTransactions($state.transactions, $transactions, $wallet.address, $network) : []
}))

async function reconcilePending(context) {
  if (context.network.type !== 'evm' || !context.network.rpcUrl) return
  const pending = get(transactions).filter((tx) => tx.status === 'Pendiente' && belongsToAccount(tx, context.address, context.network.id)).slice(0, 10)
  if (!pending.length) return
  const provider = new ethers.JsonRpcProvider(context.network.rpcUrl, context.network.chainId, { staticNetwork: true })
  try {
    await Promise.allSettled(pending.map(async (tx) => {
      const receipt = await provider.getTransactionReceipt(tx.hash)
      if (receipt) updateTransaction(tx.hash, { status: receipt.status === 1 ? 'Confirmada' : 'Error', error: receipt.status === 1 ? '' : 'La transacción falló en la red.', feeNative: ethers.formatUnits(receipt.fee, context.network.decimals) }, context.network.id)
    }))
  } finally { provider.destroy() }
}

export async function reloadHistory(force = false, background = false) {
  if (!readContext?.address || reloading) return
  if (resumeAt > Date.now()) return
  const context = readContext, id = ++requestId
  reloading = true
  lastAttemptAt = Date.now()
  resumeAt = 0
  state.update((s) => ({ ...s, loading: !background, error: '', retryAt: 0 }))
  // La confirmación RPC también funciona cuando el explorador tarda en indexar.
  void reconcilePending(context).catch(() => {})
  try {
    const pages = background ? get(state).page : 1
    const results = []
    for (let page = 1; page <= pages; page += 1) {
      const result = await fetchAddressTransactions(context.address, context.network, page, 100, { force })
      if (id !== requestId) return
      results.push(result)
      if (!result.hasMore) break
    }
    const incoming = results.flatMap((result) => result.transactions)
    const last = results.at(-1)
    const warning = results.find((result) => result.warning)
    remote = warning ? [...new Map([...remote, ...incoming].map((tx) => [tx.id || tx.hash, tx])).values()] : incoming
    resumeAt = warning?.retryAt || 0
    state.set({ transactions: remote, loading: false, error: warning?.warning || '', retryAt: warning?.retryAt || 0, page: results.length, hasMore: !!last?.hasMore, unsupported: !last?.supported })
  } catch (error) {
    if (id === requestId) { resumeAt = error.retryAt || 0; state.update((s) => ({ ...s, error: error.message || 'No se pudo consultar el explorador.', retryAt: resumeAt, loading: false })) }
  } finally { if (id === requestId) reloading = false }
}

export async function loadMoreHistory() {
  const snapshot = get(state)
  if (snapshot.loading || reloading || snapshot.retryAt > Date.now() || !snapshot.hasMore || !readContext?.address) return
  const context = readContext, id = ++requestId
  reloading = true
  lastAttemptAt = Date.now()
  state.update((s) => ({ ...s, loading: true }))
  try {
    const result = await fetchAddressTransactions(context.address, context.network, snapshot.page + 1, 100)
    if (id !== requestId) return
    const unique = new Map([...remote, ...result.transactions].map((tx) => [tx.id || tx.hash, tx]))
    remote = [...unique.values()]
    resumeAt = result.retryAt || 0
    state.set({ ...snapshot, transactions: remote, loading: false, error: result.warning || '', retryAt: result.retryAt || 0, page: snapshot.page + 1, hasMore: !!result.hasMore })
  } catch (error) {
    if (id === requestId) { resumeAt = error.retryAt || 0; state.update((s) => ({ ...s, error: error.message, retryAt: resumeAt, loading: false })) }
  } finally { if (id === requestId) reloading = false }
}
