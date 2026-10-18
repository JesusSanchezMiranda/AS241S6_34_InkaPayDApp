import { writable } from 'svelte/store'

const STORAGE_KEY = 'inkapay:transactions:v2'

const INITIAL_DEMO_TXS = []

function loadTransactions() {
  if (typeof window === 'undefined') return INITIAL_DEMO_TXS
  try {
    const data = window.localStorage.getItem(STORAGE_KEY)
    if (!data) return INITIAL_DEMO_TXS
    const saved = JSON.parse(data)
    // Elimina las filas de muestra antiguas, que no corresponden a hashes reales.
    return Array.isArray(saved) ? saved.filter((item) => /^0x[0-9a-f]{64}$/i.test(item?.hash || '') || /^[0-9a-f]{64}$/i.test(item?.hash || '')) : INITIAL_DEMO_TXS
  } catch {
    return INITIAL_DEMO_TXS
  }
}

export const transactions = writable(loadTransactions())

transactions.subscribe((items) => {
  // Un navegador sin almacenamiento no debe interrumpir una transacción ya enviada.
  try { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* Se conserva el historial en memoria y se consulta el explorador. */ }
})

export function addTransaction(transaction) {
  transactions.update((items) => [transaction, ...items.filter((item) => item.hash !== transaction.hash || (item.networkId || item.network?.id) !== (transaction.networkId || transaction.network?.id))])
}

export function updateTransaction(hash, changes, networkId) {
  transactions.update((items) => items.map((item) => item.hash === hash && (!networkId || (item.networkId || item.network?.id) === networkId) ? { ...item, ...changes } : item))
}

export function clearTransactions() { transactions.set([]) }
export function clearPendingTransactions() { transactions.update((items) => items.filter((item) => item.status !== 'Pendiente')) }

// Solicita desde un formulario que el historial abra el comprobante recién creado.
export const transactionModalRequest = writable(null)
export function openTransactionModal(transaction) { transactionModalRequest.set(transaction) }
