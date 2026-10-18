import { ethers } from 'ethers'
import { addTransaction, updateTransaction } from '../stores/transactions.js'

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

// Estima gas y revisa saldo antes de que la wallet solicite la firma.
export async function prepareRemittance({ signer, network, to, amount, token }) {
  if (!signer || !network || network.type !== 'evm') throw new Error('Conecta la wallet a una red EVM para enviar una remesa.')
  if (!ethers.isAddress(to) || to === ethers.ZeroAddress) throw new Error('La dirección del beneficiario no es válida.')
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('Escribe un monto mayor que cero.')
  const provider = signer.provider
  const current = await provider.getNetwork()
  if (Number(current.chainId) !== network.chainId) throw new Error('La red de Pali no coincide con la red activa. Cambia la red e inténtalo de nuevo.')
  const from = await signer.getAddress()
  const overrides = { from }
  let txRequest, value, gasLimit, gasPrice, tokenDecimals = network.decimals
  if (token) {
    const configuredToken = network.tokens?.find((item) => item.address.toLowerCase() === token.address?.toLowerCase() && item.symbol === 'USDC')
    if (!configuredToken) throw new Error('USDC no está disponible en la red activa.')
    if (await provider.getCode(token.address) === '0x') throw new Error('El token configurado no está disponible en esta red.')
    const contract = new ethers.Contract(token.address, ERC20_ABI, signer)
    tokenDecimals = Number(await contract.decimals())
    value = parseAmount(amount, tokenDecimals)
    const tokenBalance = await contract.balanceOf(from)
    if (tokenBalance < value) throw new Error(`Saldo insuficiente de ${token.symbol}.`)
    txRequest = await contract.transfer.populateTransaction(to, value, overrides)
    gasPrice = await gasPriceFor(provider)
    gasLimit = (await provider.estimateGas(txRequest)) * 120n / 100n
  } else {
    value = parseAmount(amount, network.decimals)
    txRequest = { to, value, ...overrides }
    gasPrice = await gasPriceFor(provider)
    gasLimit = (await provider.estimateGas(txRequest)) * 120n / 100n
    const balance = await provider.getBalance(from)
    if (balance < value + gasLimit * gasPrice) throw new Error('Saldo insuficiente para cubrir el monto y la comisión de red.')
  }
  const fee = gasLimit * gasPrice
  const nativeBalance = await provider.getBalance(from)
  if (token && nativeBalance < fee) throw new Error(`Saldo insuficiente de ${network.symbol} para pagar la comisión de red.`)
  return { txRequest, value, gasLimit, gasPrice, fee, tokenDecimals, from, chainId: network.chainId, preparedAt: Date.now() }
}

export async function sendRemittance({ signer, prepared }) {
  if (!prepared || Date.now() - prepared.preparedAt > 120000) throw new Error('La estimación venció. Vuelve a revisar la remesa.')
  const [current, from] = await Promise.all([signer.provider.getNetwork(), signer.getAddress()])
  if (Number(current.chainId) !== prepared.chainId || from.toLowerCase() !== prepared.from.toLowerCase()) throw new Error('Cambió la cuenta o la red de Pali. Vuelve a revisar la remesa.')
  return signer.sendTransaction({ ...prepared.txRequest, chainId: prepared.chainId, gasLimit: prepared.gasLimit, gasPrice: prepared.gasPrice })
}

function parseAmount(amount, decimals) {
  try {
    const value = ethers.parseUnits(String(amount), decimals)
    if (value <= 0n) throw new Error()
    return value
  } catch { throw new Error(`Escribe un monto mayor que cero con hasta ${decimals} decimales.`) }
}

async function gasPriceFor(provider) {
  const data = await provider.getFeeData()
  const price = data.gasPrice ?? data.maxFeePerGas
  if (price == null) throw new Error('No pudimos estimar la comisión. Vuelve a intentarlo.')
  return price
}

export function friendlyRemittanceError(error) {
  const code = error?.code ?? error?.info?.error?.code
  if (code === 'ACTION_REJECTED' || Number(code) === 4001) return 'Solicitud rechazada en Pali. Puedes revisarla y volver a intentar.'
  if (code === 'INSUFFICIENT_FUNDS') return 'Fondos insuficientes para cubrir el monto y la comisión de red.'
  if (code === 'NETWORK_ERROR') return 'La red de Pali cambió. Selecciona la red correcta y vuelve a revisar.'
  if (code === 'CALL_EXCEPTION') return 'La red rechazó el envío. Revisa el saldo y que el token esté disponible.'
  if (['SERVER_ERROR', 'TIMEOUT', 'UNKNOWN_ERROR'].includes(code)) return 'No pudimos comunicarnos con la wallet o la red. Vuelve a intentarlo.'
  return error?.message || 'No fue posible enviar la remesa. Vuelve a intentarlo.'
}

// El seguimiento sigue vivo aunque se abandone la vista o cambie la red activa.
export async function trackRemittance(sent, metadata, onChange = () => {}) {
  let transaction = { ...metadata, hash: sent.hash, status: 'Pendiente', createdAt: Date.now(), kind: 'remesa', type: 'send' }
  addTransaction(transaction)
  onChange(transaction)
  try {
    let receipt
    try { receipt = await sent.wait(1, 120000) }
    catch (error) {
      if (error.code !== 'TRANSACTION_REPLACED') throw error
      if (error.cancelled) {
        transaction = { ...transaction, status: 'Error', error: 'El envío fue cancelado o reemplazado desde Pali.' }
        updateTransaction(sent.hash, transaction, metadata.networkId)
        onChange(transaction)
        return transaction
      }
      // Una aceleración conserva el destinatario pero usa un nuevo hash.
      updateTransaction(sent.hash, { status: 'Reemplazada', replacementHash: error.replacement.hash }, metadata.networkId)
      transaction = { ...transaction, hash: error.replacement.hash }
      receipt = error.receipt
      addTransaction(transaction)
    }
    if (!receipt) throw new Error('Aún no se pudo confirmar. Consulta el historial antes de repetir el envío.')
    transaction = { ...transaction, status: receipt.status === 1 ? 'Confirmada' : 'Error', feeNative: ethers.formatUnits(receipt.fee, metadata.network.decimals), blockNumber: receipt.blockNumber }
  } catch (error) {
    // Un fallo de conexión no equivale a una transacción fallida: se conserva Pendiente.
    const failed = error.receipt?.status === 0
    transaction = { ...transaction, status: failed ? 'Error' : 'Pendiente', error: failed ? 'La transacción falló en la red. Se cobró la comisión utilizada.' : 'Envío pendiente de verificación. Revisa el explorador o actualiza el historial antes de volver a enviar.' }
  }
  updateTransaction(transaction.hash, transaction, metadata.networkId)
  onChange(transaction)
  return transaction
}
