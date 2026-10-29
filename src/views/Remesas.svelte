<script>
  import FinanceLoading from '../lib/components/common/FinanceLoading.svelte'
  import { wallet } from '../lib/stores/wallet.js'
  import { selectedNetwork } from '../lib/stores/network.js'
  import { history } from '../lib/stores/history.js'
  import { formatPen, referencePen, estimateSavings, TRADITIONAL_FEE_RATE } from '../lib/config/remittances.js'
  import RemittanceForm from '../lib/components/transactions/RemittanceForm.svelte'
  import WalletNetworkSelect from '../lib/components/network/WalletNetworkSelect.svelte'

  export let onConnect = () => {}
  let connecting = false, sending = false
  $: remittances = $history.transactions.filter((tx) => tx.kind === 'remesa' && tx.direction === 'enviada' && tx.status !== 'Reemplazada')
  $: confirmed = remittances.filter((tx) => tx.status === 'Confirmada')
  $: totals = confirmed.reduce((result, tx) => ({ ...result, [tx.symbol]: (result[tx.symbol] || 0) + Number(tx.amount) }), {})
  $: totalText = Object.entries(totals).map(([symbol, value]) => `${value.toLocaleString('es-PE', { maximumFractionDigits: 8 })} ${symbol}`).join(' + ') || `0 ${$selectedNetwork.symbol}`
  $: totalPen = confirmed.some((tx) => referencePen(tx.amount, tx.symbol) == null) || (!confirmed.length && referencePen(1, $selectedNetwork.symbol) == null) ? null : confirmed.reduce((total, tx) => total + referencePen(tx.amount, tx.symbol), 0)
  $: savings = confirmed.map((tx) => estimateSavings(tx.amount, tx.symbol, tx.feeNative, $selectedNetwork.symbol))
  $: estimatedSavings = totalPen == null || savings.some((item) => item == null) ? null : savings.reduce((total, item) => total + item.pen, 0)
  let copiedAddress = false
  const shortAddress = (value) => (value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '')
  async function copyAddress() {
    if (!$wallet.address) return
    try { await navigator.clipboard.writeText($wallet.address); copiedAddress = true; setTimeout(() => (copiedAddress = false), 1600) } catch { /* El navegador puede bloquear el portapapeles. */ }
  }
  $: connectedNetworkName = $wallet.network?.name || $selectedNetwork.name
  $: balanceText = Number($wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 5, maximumFractionDigits: 5 })
  async function connect() { connecting = true; try { await onConnect() } finally { connecting = false } }
</script>

<main class="container remesas-view">
  <header class="view-heading"><div><span class="eyebrow">El corazón de InkaPay</span><h1>Remesas</h1><p>Envía dinero a tu familia con comisiones mínimas y comprobante verificable.</p></div><div class="heading-network"><WalletNetworkSelect compact inlineStatus disabled={sending} /></div></header>
  <FinanceLoading variant="remittances" connected={$wallet.connected}>
  <div class="metrics" aria-label="Resumen de remesas en la red actual">
    <section class="metric account accent"><span>Mi cuenta</span><strong>{balanceText} <em>{$wallet.symbol || $selectedNetwork.symbol}</em></strong><small class="network-line"><i class="ri-global-line" aria-hidden="true"></i> {connectedNetworkName}</small><small class="address-line">{#if $wallet.address}<span class="address-value" title={$wallet.address}>{shortAddress($wallet.address)}</span><button type="button" class="copy-address" onclick={copyAddress} aria-label={copiedAddress ? 'Dirección copiada' : 'Copiar mi dirección pública'}><i class={copiedAddress ? 'ri-check-line' : 'ri-file-copy-line'} aria-hidden="true"></i></button>{:else}<span>Conecta tu wallet para ver tu dirección</span>{/if}</small></section>
    <section class="metric accent"><span>Total enviado</span><strong>{totalText}</strong><small>{formatPen(totalPen)} · referencial</small></section>
    <section class="metric"><span>Remesas enviadas</span><strong>{confirmed.length}</strong><small>{confirmed.length ? 'Envíos confirmados en esta red' : 'Tu primer envío empieza aquí'}</small></section>
    <section class="metric"><span>Ahorro {estimatedSavings < 0 ? '(costo adicional)' : 'estimado'}</span><strong>{formatPen(estimatedSavings)}</strong><small>Estimado referencial frente al {(TRADITIONAL_FEE_RATE * 100).toFixed(0)}% tradicional</small></section>
  </div>
  {#if $wallet.connected}
    <div class="workspace"><RemittanceForm recent={remittances} bind:busy={sending} /></div>
  {:else}
    <section class="empty"><span class="empty-icon" aria-hidden="true"><i class="ri-hand-heart-line"></i></span><h2>Más cerca de quienes quieres</h2><p>Conecta tu wallet para elegir un beneficiario, enviar tu remesa y guardar un comprobante verificable.</p><button class="primary" onclick={connect} disabled={connecting}>{connecting ? 'Esperando a Pali…' : 'Iniciar sesión'}</button><small>Tu wallet autoriza cada envío. InkaPay no guarda tus claves.</small></section>
  {/if}
  </FinanceLoading>
</main>

<style>
  .container{--shadow-panel:0 8px 24px rgba(4,8,20,.22);--radius-panel:18px;--remittance-gap:24px;max-width:none;margin:0;padding:125px var(--workspace-gutter) 80px}.view-heading{margin-bottom:var(--space-5);display:flex;align-items:center;justify-content:space-between;gap:var(--space-5)}.view-heading>div:first-child{min-width:0}.heading-network{width:280px;flex:none;position:relative;z-index:5}.eyebrow{color:var(--accent-primary);text-transform:uppercase;letter-spacing:.15em;font-size:.75rem;font-weight:700}h1,h2{font-family:var(--font-heading);letter-spacing:-.04em;margin:var(--space-2) 0}h1{font-size:clamp(2rem,4vw,3.2rem)}p{color:var(--text-secondary);line-height:1.7}.view-heading p{max-width:680px;margin:var(--space-2) 0 var(--space-4)}.metrics{display:grid;grid-template-columns:1.15fr repeat(3,minmax(0,1fr));gap:var(--space-4)}.metric,.empty{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);padding:var(--space-5)}.metric{display:flex;flex-direction:column;gap:var(--space-3);min-width:0}.metric>span{color:var(--text-secondary);font-size:.8rem}.metric strong{font-family:var(--font-heading);font-size:clamp(1.2rem,2vw,1.7rem);overflow-wrap:anywhere}.metric.accent strong{color:var(--accent-primary)}small{color:var(--text-secondary);font-size:.75rem;line-height:1.6}.empty{text-align:center;margin-top:var(--space-5);padding:var(--space-6);display:flex;flex-direction:column;align-items:center;gap:var(--space-4)}.empty h2{font-size:1.8rem}.empty p{max-width:560px;margin:0}.empty-icon{font-size:3rem;color:var(--accent-primary)}button{font:inherit;border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);color:var(--accent-primary);padding:var(--space-2) var(--space-3);cursor:pointer}button:hover{border-color:var(--accent-primary)}button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}button:disabled{opacity:.5;cursor:not-allowed}.primary{background:var(--accent-primary);color:var(--bg-page);padding:var(--space-3) var(--space-5);font-weight:700}.primary:hover{box-shadow:var(--shadow-panel)}
  .metric.account strong em{font-style:normal;font-size:.68rem;color:var(--text-secondary);letter-spacing:.05em}.metric.account .network-line{display:flex;align-items:center;gap:6px}.metric.account .network-line i{color:var(--accent-secondary)}.metric.account .address-line{display:flex;align-items:center;gap:8px;min-width:0}.metric.account .address-value{font-family:monospace;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.copy-address{flex:none;display:grid;place-items:center;width:26px;height:26px;padding:0;font-size:.85rem;line-height:1}
  @media(max-width:1000px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:800px){.container{padding-top:104px}.view-heading{align-items:stretch;flex-direction:column}.heading-network{width:100%}}@media(max-width:600px){.metrics{grid-template-columns:1fr}.metric{padding:var(--space-4)}.empty{padding:var(--space-5)}}
  .workspace{min-width:0}
  /* La altura común usa el espacio disponible de la pantalla y no cambia entre pasos. */
  @media(min-width:1001px){
    .container{height:100dvh;min-height:0;display:flex;flex-direction:column;gap:16px;padding:90px var(--workspace-gutter) 24px;overflow:visible}
    .view-heading{margin:0;flex:none;gap:20px}.eyebrow{display:none}h1{font-size:1.65rem;margin:2px 0 4px}.view-heading p{font-size:.75rem;line-height:1.4;margin:0}.heading-network{width:240px}
    
    .metrics{flex:none;gap:var(--remittance-gap)}.metric{padding:10px 16px;gap:2px;border-radius:14px}.metric>span{font-size:.72rem}.metric strong{font-size:1.2rem;line-height:1.2}.metric small{font-size:.65rem;line-height:1.4}
    
    .workspace{flex:1;min-height:0}.empty{margin-top:0}
  }
  @media(min-width:1001px) and (max-height:800px){.container{--remittance-gap:18px;padding-top:82px;padding-bottom:16px;gap:12px}.eyebrow{display:none}h1{font-size:1.5rem}.view-heading p{font-size:.7rem}.metric{padding:8px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 10px}.metric>span{grid-column:1;grid-row:1}.metric strong{font-size:1.15rem;grid-column:2;grid-row:1;text-align:right}.metric small{grid-column:1/-1}}
  /* Todos los desplazamientos de Remesas comparten la paleta oscura. */
  .remesas-view :global(*){scrollbar-width:thin;scrollbar-color:var(--border-input) var(--surface-input)}
  .remesas-view :global(*::-webkit-scrollbar){width:6px;height:6px}
  .remesas-view :global(*::-webkit-scrollbar-track){background:var(--surface-input)}
  .remesas-view :global(*::-webkit-scrollbar-thumb){background:var(--border-input);border-radius:999px}
</style>
