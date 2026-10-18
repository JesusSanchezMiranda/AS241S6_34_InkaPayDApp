<script>
  import { referencePen, formatPen } from '../../config/rates.js'
  import { getExplorerTransactionUrl } from '../../services/explorers.js'
  import { downloadRemittanceReceipt } from '../../services/remittanceReceipt.js'
  export let compact = false
  export let transaction
  export let onNew = null
  let copied = false, error = ''
  async function copy() {
    try { await navigator.clipboard.writeText(transaction.hash); copied = true }
    catch { error = 'No se pudo copiar. Selecciona el hash y cópialo manualmente.' }
  }
  async function download() {
    try { await downloadRemittanceReceipt(transaction) }
    catch (e) { error = e.message }
  }
</script>

<div class="receipt" class:compact>
  <span class="badge" class:confirmed={transaction.status === 'Confirmada'}>Remesa · {transaction.status}</span>
  <h3>{transaction.amount} {transaction.symbol}</h3>
  <p>Equivalente referencial: {formatPen(referencePen(transaction.amount, transaction.symbol))}</p>
  <dl>
    {#each [['Beneficiario', transaction.beneficiaryName || 'Sin alias'], ['Dirección', transaction.to], ['Motivo', transaction.reason || 'Sin motivo'], ['Referencia', transaction.reference || 'Sin referencia'], ['Red', transaction.networkName || transaction.network?.name], ['Fecha', new Date(transaction.createdAt).toLocaleString('es-PE')], ['Hash', transaction.hash]] as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
  </dl>
  {#if transaction.error}<p class="error" role="status">{transaction.error}</p>{/if}
  <a href={getExplorerTransactionUrl(transaction.network, transaction.hash)} target="_blank" rel="noreferrer">Verificar en el explorador ↗</a>
  <div class="actions"><button type="button" onclick={copy}>{copied ? 'Hash copiado' : 'Copiar hash'}</button><button type="button" onclick={download}>Descargar comprobante</button></div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <small>Equivalente ilustrativo. Verifica el hash y el estado en la red.</small>
  {#if onNew}<button class="primary" type="button" onclick={onNew}>Nueva remesa</button>{/if}
</div>

<style>
  .receipt{display:flex;flex-direction:column;gap:var(--space-4);min-width:0}.badge{align-self:flex-start;border:1px solid var(--accent-secondary);border-radius:999px;color:var(--accent-secondary);padding:var(--space-1) var(--space-3);font-size:.8rem}.confirmed{color:var(--accent-success);border-color:var(--accent-success)}h3{font:700 2rem var(--font-heading);margin:0}p{margin:0;color:var(--text-secondary)}dl{margin:0;display:grid;gap:var(--space-3)}dl div{padding-bottom:var(--space-3);border-bottom:1px solid var(--border-card)}dt,small{color:var(--text-secondary);font-size:.8rem}dd{margin:var(--space-1) 0 0;overflow-wrap:anywhere;font-size:.9rem}a{color:var(--accent-primary);font-size:.85rem}.actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}button{font:inherit;border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);color:var(--text-primary);padding:var(--space-3);cursor:pointer;font-size:.85rem}button:hover{border-color:var(--accent-primary)}button:focus-visible,a:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}.primary{background:var(--accent-primary);color:var(--bg-page);font-weight:700;border:0}.error{color:var(--text-error)}
  @media(min-width:1001px){
    .receipt.compact{gap:5px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center}.compact .badge{font-size:.63rem;padding:3px 7px;grid-column:2;grid-row:1;justify-self:end}.compact h3{font-size:1.25rem;grid-column:1;grid-row:1}.compact>p,.compact>dl,.compact>a,.compact>.actions,.compact>small{grid-column:1/-1}.compact>p{font-size:.72rem}.compact dl{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px}.compact dl div{padding-bottom:4px;min-width:0}.compact dl div:last-child{grid-column:1/-1}.compact dt{font-size:.6rem}.compact dd{font-size:.7rem;margin:2px 0 0;line-height:1.35}.compact a{font-size:.7rem;grid-column:1;grid-row:4}.compact>.actions{grid-column:2;grid-row:4;gap:5px}.compact button{padding:7px 9px;font-size:.7rem}.compact small{font-size:.6rem;line-height:1.4}
  }
</style>
