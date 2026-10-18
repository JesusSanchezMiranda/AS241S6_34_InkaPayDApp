// Catálogo de redes y metadatos de exploradores usados por la DApp.
const evmExplorer = (name, baseUrl, apiUrl = null, type = null) => ({ name, baseUrl, apiUrl, type })

export const NETWORKS = [
  { id: 'bitcoin', name: 'Bitcoin', icon: '₿', type: 'utxo', networkKey: 'bitcoin', symbol: 'BTC', decimals: 8, blockbookUrl: 'https://btc1.trezor.io', explorer: evmExplorer('Trezor', 'https://btc1.trezor.io') },
  { id: 'syscoin-mainnet', name: 'Syscoin Mainnet', icon: 'S', type: 'utxo', networkKey: 'mainnet', symbol: 'SYS', decimals: 8, blockbookUrl: 'https://blockbook.syscoin.org', explorer: evmExplorer('Blockbook', 'https://blockbook.syscoin.org') },
  { id: 'syscoin-testnet', testnet: true, name: 'Syscoin Testnet', icon: 'S', type: 'utxo', networkKey: 'testnet', symbol: 'tSYS', decimals: 8, blockbookUrl: 'https://blockbook-testnet.syscoin.org', explorer: evmExplorer('Blockbook Testnet', 'https://blockbook-testnet.syscoin.org') },
  { id: 'rollux', name: 'Rollux', icon: '◐', type: 'evm', chainId: 570, chainIdHex: '0x23a', rpcUrl: 'https://rpc.rollux.com', fallbackRpcUrls: ['https://rollux.rpc.subquery.network/public'], symbol: 'SYS', decimals: 18, explorer: evmExplorer('Rollux Explorer', 'https://explorer.rollux.com', 'https://explorer.rollux.com/api', 'blockscout') },
  { id: 'syscoin-nevm', name: 'Syscoin NEVM', icon: 'S', type: 'evm', chainId: 57, chainIdHex: '0x39', rpcUrl: 'https://rpc.syscoin.org', fallbackRpcUrls: ['https://syscoin-evm.publicnode.com'], symbol: 'SYS', decimals: 18, explorer: evmExplorer('Syscoin Explorer', 'https://explorer.syscoin.org', 'https://explorer.syscoin.org/api', 'blockscout') },
  { id: 'ethereum', name: 'Ethereum Mainnet', icon: '♦', type: 'evm', chainId: 1, chainIdHex: '0x1', rpcUrl: 'https://ethereum-rpc.publicnode.com', fallbackRpcUrls: ['https://rpc.ankr.com/eth', 'https://1rpc.io/eth'], symbol: 'ETH', decimals: 18, explorer: evmExplorer('Etherscan', 'https://etherscan.io', 'https://api.etherscan.io/v2/api', 'etherscan') },
  { id: 'polygon', name: 'Polygon Mainnet', icon: '✦', type: 'evm', chainId: 137, chainIdHex: '0x89', rpcUrl: 'https://polygon.drpc.org', fallbackRpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://1rpc.io/matic'], symbol: 'POL', decimals: 18, explorer: evmExplorer('PolygonScan', 'https://polygonscan.com', 'https://api.etherscan.io/v2/api', 'etherscan') },
  { id: 'syscoin-nevm-testnet', testnet: true, name: 'Syscoin NEVM Testnet', icon: 'S', type: 'evm', chainId: 5700, chainIdHex: '0x1644', rpcUrl: 'https://rpc.tanenbaum.io', symbol: 'tSYS', decimals: 18, explorer: evmExplorer('Tanenbaum Explorer', 'https://explorer.tanenbaum.io', 'https://explorer.tanenbaum.io/api', 'blockscout') },
  { id: 'zksys', testnet: true, name: 'zkSYS', icon: '◈', type: 'evm', chainId: 57057, chainIdHex: '0xdee1', rpcUrl: 'https://rpc-zk.tanenbaum.io', symbol: 'SYS', decimals: 18, explorer: evmExplorer('zkSYS Explorer', 'https://explorer-zk.tanenbaum.io', 'https://explorer-zk.tanenbaum.io/api', 'blockscout') },
  { id: 'hoodi', testnet: true, name: 'Ethereum Hoodi', icon: '♦', type: 'evm', chainId: 560048, chainIdHex: '0x88bb0', rpcUrl: 'https://rpc.hoodi.ethpandaops.io', symbol: 'ETH', decimals: 18, explorer: evmExplorer('Hoodi Explorer', 'https://hoodi.etherscan.io', 'https://eth-hoodi.blockscout.com/api/v2', 'blockscout-v2') },
  { id: 'sepolia', testnet: true, name: 'Ethereum Sepolia', icon: '♦', type: 'evm', chainId: 11155111, chainIdHex: '0xaa36a7', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', fallbackRpcUrls: ['https://1rpc.io/sepolia'], symbol: 'ETH', decimals: 18, tokens: [{ symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 }], explorer: evmExplorer('Sepolia Explorer', 'https://sepolia.etherscan.io', 'https://eth-sepolia.blockscout.com/api/v2', 'blockscout-v2') }
]

export const EVM_NETWORKS = NETWORKS.filter((network) => network.type === 'evm')
export const UTXO_NETWORKS = NETWORKS.filter((network) => network.type === 'utxo')
export const getNetworkById = (id) => NETWORKS.find((network) => network.id === id)
export const getNetworkByChainId = (chainId) => EVM_NETWORKS.find((network) => Number(chainId) === network.chainId)
