import { writable } from 'svelte/store'

const STORAGE_KEY = 'inkapay:transactions:v2'

const INITIAL_DEMO_TXS = [
  {
    type: 'receive',
    hash: '0xb7a7ed05718293ab18239a01823a0182319fbf42',
    from: '0x0f0a8817293a1f42',
    to: '0xMe',
    amount: '0.0080',
    symbol: 'ETH',
    networkName: 'Ethereum Hoodi',
    network: { id: 'hoodi', name: 'Ethereum Hoodi', symbol: 'ETH', explorer: 'https://hoodi.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 2 * 60 * 1000
  },
  {
    type: 'send',
    hash: '0xfedf66a182938127391823912830192830192f42',
    from: '0xMe',
    to: '0x0f0a8817293a1f42',
    amount: '0.3280',
    symbol: 'ETH',
    networkName: 'Ethereum Sepolia',
    network: { id: 'sepolia', name: 'Ethereum Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 28 * 60 * 1000
  },
  {
    type: 'send',
    hash: '0xfb6378a872938127391823912830192830192a8a',
    from: '0xMe',
    to: '0x0f0a8817293a1f42',
    amount: '0.0080',
    symbol: 'ETH',
    networkName: 'Ethereum Hoodi',
    network: { id: 'hoodi', name: 'Ethereum Hoodi', symbol: 'ETH', explorer: 'https://hoodi.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 4 * 60 * 60 * 1000
  },
  {
    type: 'send',
    hash: '0x9f52e9ad72938127391823912830192830192ad9',
    from: '0xMe',
    to: '0x0f0a8817293a1f42',
    amount: '0.0600',
    symbol: 'ETH',
    networkName: 'Ethereum Hoodi',
    network: { id: 'hoodi', name: 'Ethereum Hoodi', symbol: 'ETH', explorer: 'https://hoodi.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 18 * 60 * 60 * 1000
  },
  {
    type: 'send',
    hash: '0x691a131072938127391823912830192830192131',
    from: '0xMe',
    to: '0x0f0a8817293a1f42',
    amount: '8.0000',
    symbol: 'ETH',
    networkName: 'Ethereum Hoodi',
    network: { id: 'hoodi', name: 'Ethereum Hoodi', symbol: 'ETH', explorer: 'https://hoodi.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 19 * 60 * 60 * 1000
  },
  {
    type: 'receive',
    hash: '0x2e8c024b7293812739182391283019283019224b',
    from: '0x6cc9f65518293f655',
    to: '0xMe',
    amount: '0.1437',
    symbol: 'ETH',
    networkName: 'Ethereum Hoodi',
    network: { id: 'hoodi', name: 'Ethereum Hoodi', symbol: 'ETH', explorer: 'https://hoodi.etherscan.io' },
    status: 'Confirmada',
    createdAt: Date.now() - 24 * 60 * 60 * 1000
  },
  {
    type: 'receive',
    hash: '0x11223344556677889900aabbccddeeff00112233',
    from: '0x3a4b881122334455',
    to: '0xMe',
    amount: '1.5000',
    symbol: 'SYS',
    networkName: 'Rollux',
    network: { id: 'rollux', name: 'Rollux', symbol: 'SYS', explorer: 'https://explorer.rollux.com' },
    status: 'Confirmada',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
  },
  {
    type: 'receive',
    hash: '0x556677889900aabbccddeeff0011223344556677',
    from: '0x9988776655443322',
    to: '0xMe',
    amount: '0.5000',
    symbol: 'POL',
    networkName: 'Polygon Mainnet',
    network: { id: 'polygon', name: 'Polygon Mainnet', symbol: 'POL', explorer: 'https://polygonscan.com' },
    status: 'Confirmada',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
  },
  {
    type: 'receive',
    hash: '0x990011223344556677889900aabbccddeeff0011',
    from: '0x1234567890abcdef',
    to: '0xMe',
    amount: '0.0500',
    symbol: 'SYS',
    networkName: 'Syscoin NEVM',
    network: { id: 'syscoin-nevm', name: 'Syscoin NEVM', symbol: 'SYS', explorer: 'https://explorer.syscoin.org' },
    status: 'Confirmada',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000
  }
]

function loadTransactions() {
  if (typeof window === 'undefined') return INITIAL_DEMO_TXS
  try {
    const data = window.localStorage.getItem(STORAGE_KEY)
    if (!data) return INITIAL_DEMO_TXS
    return JSON.parse(data)
  } catch {
    return INITIAL_DEMO_TXS
  }
}

export const transactions = writable(loadTransactions())

transactions.subscribe((items) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)))
})

export function addTransaction(transaction) {
  transactions.update((items) => [transaction, ...items.filter((item) => item.hash !== transaction.hash)].slice(0, 100))
}

export function updateTransaction(hash, changes) {
  transactions.update((items) => items.map((item) => item.hash === hash ? { ...item, ...changes } : item))
}

export function clearTransactions() { transactions.set([]) }
