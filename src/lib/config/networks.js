// Catálogo de redes configuradas en InkaPay Demo.
// Incluye soporte para UTXO Networks (Bitcoin, Syscoin) y EVM Networks.

export const NETWORKS = [
  // --- UTXO NETWORKS ---
  { id: 'bitcoin', name: 'Bitcoin', icon: '₿', type: 'utxo', networkKey: 'bitcoin', symbol: 'BTC', decimals: 8, blockbookUrl: 'https://btc1.trezor.io', explorer: 'https://btc1.trezor.io' },
  { id: 'syscoin-mainnet', name: 'Syscoin Mainnet', icon: 'S', type: 'utxo', networkKey: 'mainnet', symbol: 'SYS', decimals: 8, blockbookUrl: 'https://blockbook.syscoin.org', explorer: 'https://blockbook.syscoin.org' },
  { id: 'syscoin-testnet', name: 'Syscoin Testnet', icon: 'S', type: 'utxo', networkKey: 'testnet', symbol: 'tSYS', decimals: 8, blockbookUrl: 'https://blockbook-testnet.syscoin.org', explorer: 'https://blockbook-testnet.syscoin.org' },

  // --- EVM NETWORKS ---
  { id: 'rollux', name: 'Rollux', icon: '◐', type: 'evm', chainId: 570, chainIdHex: '0x23a', rpcUrl: 'https://rpc.rollux.com', fallbackRpcUrls: ['https://rollux.rpc.subquery.network/public'], symbol: 'SYS', decimals: 18, explorer: 'https://explorer.rollux.com' },
  { id: 'syscoin-nevm', name: 'Syscoin NEVM', icon: 'S', type: 'evm', chainId: 57, chainIdHex: '0x39', rpcUrl: 'https://rpc.syscoin.org', fallbackRpcUrls: ['https://syscoin-evm.publicnode.com'], symbol: 'SYS', decimals: 18, explorer: 'https://explorer.syscoin.org' },
  { id: 'ethereum', name: 'Ethereum Mainnet', icon: '♦', type: 'evm', chainId: 1, chainIdHex: '0x1', rpcUrl: 'https://ethereum-rpc.publicnode.com', fallbackRpcUrls: ['https://rpc.ankr.com/eth', 'https://1rpc.io/eth'], symbol: 'ETH', decimals: 18, explorer: 'https://etherscan.io' },
  { id: 'polygon', name: 'Polygon Mainnet', icon: '✦', type: 'evm', chainId: 137, chainIdHex: '0x89', rpcUrl: 'https://polygon.drpc.org', fallbackRpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://1rpc.io/matic'], symbol: 'POL', decimals: 18, explorer: 'https://polygonscan.com' },
  { id: 'syscoin-nevm-testnet', name: 'Syscoin NEVM Testnet', icon: 'S', type: 'evm', chainId: 5700, chainIdHex: '0x1644', rpcUrl: 'https://rpc.tanenbaum.io', symbol: 'SYS', decimals: 18, explorer: 'https://tanenbaum.io' },
  { id: 'zksys', name: 'zkSYS', icon: '◈', type: 'evm', chainId: 57057, chainIdHex: '0xdee1', rpcUrl: 'https://rpc-zk.tanenbaum.io', symbol: 'SYS', decimals: 18, explorer: 'https://explorer-zk.tanenbaum.io' },
  { id: 'hoodi', name: 'Ethereum Hoodi', icon: '♦', type: 'evm', chainId: 560048, chainIdHex: '0x889f0', rpcUrl: 'https://rpc.hoodi.ethpandaops.io', symbol: 'ETH', decimals: 18, explorer: 'https://hoodi.etherscan.io' },
  { id: 'sepolia', name: 'Ethereum Sepolia', icon: '♦', type: 'evm', chainId: 11155111, chainIdHex: '0xaa36a7', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', fallbackRpcUrls: ['https://1rpc.io/sepolia'], symbol: 'ETH', decimals: 18, explorer: 'https://sepolia.etherscan.io' }
]

export const EVM_NETWORKS = NETWORKS.filter((network) => network.type === 'evm')
export const UTXO_NETWORKS = NETWORKS.filter((network) => network.type === 'utxo')
export const getNetworkById = (id) => NETWORKS.find((network) => network.id === id)
export const getNetworkByChainId = (chainId) => EVM_NETWORKS.find((network) => Number(chainId) === network.chainId)
