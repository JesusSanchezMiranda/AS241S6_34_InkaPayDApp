<script>
  import { onDestroy, onMount } from 'svelte'
  import { transactionModalRequest } from '../../stores/transactions.js'
  import { wallet } from '../../stores/wallet.js'
  import { selectedNetwork } from '../../stores/network.js'
  import { history, reloadHistory, loadMoreHistory } from '../../stores/history.js'
  import { remittanceRows } from '../../services/transactionHistory.js'
  import Skeleton from '../common/Skeleton.svelte'
  import TransactionModal from './TransactionModal.svelte'

  export let remittancesOnly = false
  export let compact = false
  export let embedded = false
  let activeTab = 'all'
  let selectedTxForModal = null
  let lastKey = ''
  let now = Date.now()
  const statusTabs = [{ id: 'Pendiente', label: 'Pendientes' }, { id: 'Confirmada', label: 'Confirmadas' }, { id: 'Error', label: 'Con error' }]
  const movementTabs = [{ id: 'all', label: 'Todas' }, { id: 'received', label: 'Recibidas' }, { id: 'sent', label: 'Enviadas' }, ...statusTabs]
  const remittanceTabs = [{ id: 'all', label: 'Todas' }, ...statusTabs]
  onMount(() => { const timer = setInterval(() => now = Date.now(), 1000); return () => clearInterval(timer) })
  $: retryIn = Math.max(0, Math.ceil((($history.retryAt || 0) - now) / 1000))
  const unsubscribe = transactionModalRequest.subscribe((tx) => {
    if (tx && tx.network?.id === $selectedNetwork.id && [tx.from, tx.to].some((a) => a?.toLowerCase() === $wallet.address?.toLowerCase())) selectedTxForModal = tx
  })
  onDestroy(unsubscribe)
  $: key = `${$wallet.address}:${$selectedNetwork.id}`
  $: if (key !== lastKey) { lastKey = key; activeTab = 'all'; selectedTxForModal = null }
  // Remesas lista solo lo enviado con InkaPay; Billetera muestra todos los movimientos.
  $: rows = remittancesOnly ? remittanceRows($history.transactions) : $history.transactions
  $: filtered = rows.filter((tx) => activeTab === 'all' || (activeTab === 'received' ? tx.direction === 'recibida' : activeTab === 'sent' ? tx.direction === 'enviada' : tx.status === activeTab))
  $: tabs = remittancesOnly ? remittanceTabs : movementTabs
  $: if (!tabs.some((tab) => tab.id === activeTab)) activeTab = 'all'
  const isRemittance = (tx) => tx.kind === 'remesa'
  // El detalle abierto se actualiza cuando el explorador confirma el envío.
  $: selected = selectedTxForModal ? $history.transactions.find((tx) => tx.hash === selectedTxForModal.hash) || selectedTxForModal : null
  const short = (value) => value ? `${value.slice(0, 8)}…${value.slice(-6)}` : ''
</script>

<section class="panel" class:compact class:embedded aria-label={remittancesOnly ? 'Remesas recientes' : 'Historial de movimientos'} aria-busy={$history.loading}>
  <div class="heading"><div><h3>{remittancesOnly ? 'Remesas recientes' : compact ? 'Historial' : 'Historial de movimientos'}</h3>{#if !compact}<p>Red actual: {$selectedNetwork.name}</p>{/if}</div><button onclick={() => reloadHistory(true)} disabled={$history.loading || !$wallet.connected || retryIn > 0}>↻ Actualizar</button></div>
  <div class="filters" aria-label="Filtrar movimientos">
    {#each tabs as tab}<button class:active={activeTab === tab.id} aria-pressed={activeTab === tab.id} onclick={() => activeTab = tab.id}>{tab.label}</button>{/each}
  </div>
  <div class="history-body">
  {#if !$wallet.connected}<p class="notice">Conecta una wallet para consultar sus movimientos.</p>
  {:else if $history.unsupported}<p class="notice">Esta red no tiene una API de historial compatible. Solo se muestra el respaldo de este navegador; puedes verificar cada hash en el explorador.</p>{/if}
  {#if $history.error}
    {#if $history.retryAt}<div class="notice paused" role="status"><strong>Actualización en pausa</strong><p>{$history.error}</p><p>{retryIn ? `Reintentaremos automáticamente en ${retryIn} s.` : 'Reintentando la consulta…'}</p><button onclick={() => reloadHistory(true)} disabled={$history.loading || retryIn > 0}>{retryIn ? `Espera ${retryIn} s` : 'Reintentar'}</button></div>
    {:else}<div class="notice error" role="alert"><p>{$history.error}</p><p>El respaldo local se identifica debajo de cada movimiento.</p><button onclick={() => reloadHistory(true)} disabled={$history.loading}>Reintentar</button></div>{/if}
  {/if}
  {#if $history.loading && !rows.length}
    <div class="history-skeleton" role="status" aria-label="Cargando movimientos">
      {#each [0, 1, 2] as row}<div class="skeleton-row" aria-hidden="true"><Skeleton width="28px" height="28px" circle delay={row * 90} /><div class="skeleton-lines"><Skeleton width="45%" height="14px" delay={row * 90} /><Skeleton width="80%" height="11px" delay={row * 90 + 40} /><Skeleton width="65%" height="10px" delay={row * 90 + 80} /></div><Skeleton width="64px" height="12px" delay={row * 90 + 120} /></div>{/each}
    </div>
  {:else if $history.loading}<p class="notice" role="status">Actualizando movimientos…</p>{/if}
  {#if filtered.length}
    <div class="history-list">
      {#each filtered as tx (tx.id || tx.hash)}
        <button class="tx-card" onclick={() => selectedTxForModal = tx} aria-label={`Ver ${isRemittance(tx) ? 'comprobante de remesa' : 'detalle'}: ${tx.amount} ${tx.symbol}, ${tx.status}`}>
          <span class="direction" class:receive={tx.direction === 'recibida'} aria-hidden="true">{tx.direction === 'recibida' ? '↓' : '↑'}</span>
          <span class="body"><span class="top"><strong>{tx.amount} {tx.symbol}</strong>{#if isRemittance(tx)}<em>Remesa</em>{/if}</span><span class="detail">{tx.kind === 'remesa' ? `${tx.beneficiaryName || short(tx.to)} · ${tx.reason || tx.reference || 'Sin motivo'}` : `${tx.direction === 'recibida' ? 'De' : 'Para'} ${short(tx.direction === 'recibida' ? tx.from : tx.to)}`}</span><small title={tx.source === 'local' ? 'Respaldo local · aún no verificado por el explorador' : 'Verificado en explorador'}>{short(tx.hash)} · {tx.source === 'local' ? compact ? 'Local' : 'Respaldo local · aún no verificado por el explorador' : compact ? 'Explorador' : 'Verificado en explorador'}</small></span>
          <span class="meta"><span class:confirmed={tx.status === 'Confirmada'} class:error={tx.status === 'Error'}>{tx.status}</span><small>{new Date(tx.createdAt || tx.timestamp).toLocaleDateString('es-PE')}</small></span>
        </button>
      {/each}
    </div>
  {:else if !$history.loading && !$history.error && $wallet.connected}
    <p class="notice empty">{activeTab !== 'all' ? 'No hay movimientos con este filtro.' : remittancesOnly ? 'Aún no hay remesas en esta red' : 'Aún no tienes movimientos en esta red.'}</p>
  {/if}
  {#if $history.hasMore}<button class="more" onclick={loadMoreHistory} disabled={$history.loading || retryIn > 0}>Cargar movimientos anteriores</button>{/if}
  {#if $wallet.connected && $selectedNetwork.explorer?.type === 'etherscan'}<small class="attribution">Powered by Etherscan.io APIs</small>{/if}
  </div>
</section>

{#if selected}<TransactionModal transaction={selected} onClose={() => selectedTxForModal = null} />{/if}

<style>
  .history-skeleton{display:grid;gap:10px}.skeleton-row{display:flex;align-items:center;gap:12px;border:1px solid var(--border-input);border-radius:12px;padding:12px;min-width:0}.skeleton-lines{display:flex;flex-direction:column;gap:7px;flex:1;min-width:0}
  .paused{border-style:solid}.paused>strong{color:var(--accent-secondary);font-size:.8rem}.compact .filters{flex:none;gap:6px;margin-bottom:12px}.compact .filters button{font-size:.72rem;padding:7px 9px}
  .panel{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);padding:var(--space-5);min-width:0}
  .heading{display:flex;justify-content:space-between;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);flex-wrap:wrap}h3{margin:0;font-family:var(--font-heading)}p{margin:var(--space-2) 0;color:var(--text-secondary);font-size:.85rem}
  button{font:inherit;border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);color:var(--text-secondary);padding:var(--space-2) var(--space-3);cursor:pointer;font-size:.8rem}button:hover{border-color:var(--accent-primary);color:var(--text-primary)}button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}button:disabled{opacity:.5;cursor:not-allowed}
  .filters{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)}.filters .active{color:var(--accent-primary);border-color:var(--accent-primary)}.history-list{display:flex;flex-direction:column;gap:var(--space-2);max-height:480px;overflow-y:auto}.tx-card{width:100%;display:flex;align-items:center;gap:var(--space-3);text-align:left;padding:var(--space-3);color:var(--text-primary)}.direction{color:var(--accent-primary);font-size:1.5rem}.receive{color:var(--accent-success)}.body{min-width:0;flex:1;display:flex;flex-direction:column;gap:var(--space-1)}.top{display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap}.top em{font-style:normal;font-size:.7rem;border:1px solid var(--accent-secondary);border-radius:999px;padding:2px 8px;color:var(--accent-secondary)}.detail,small,.meta{font-size:.75rem;color:var(--text-secondary);overflow-wrap:anywhere}.meta{display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2)}.notice{padding:var(--space-4);border:1px dashed var(--border-input);border-radius:var(--radius-control);color:var(--text-secondary);font-size:.85rem}.error,.notice.error p{color:var(--text-error)}.confirmed{color:var(--accent-success)}.empty{text-align:center}.more{display:block;margin:var(--space-4) auto 0}.attribution{display:block;margin-top:var(--space-4)}
  @media(max-width:520px){.panel{padding:var(--space-4)}.tx-card{flex-wrap:wrap}.meta{width:100%;flex-direction:row;justify-content:space-between}}
  /* La variante de Billetera ocupa su tarjeta; la lista absorbe todo el desplazamiento. */
  .panel.compact{background:none;border:0;border-radius:0;padding:0;height:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden}.compact .heading{flex:none;min-height:32px;margin-bottom:16px;gap:8px;flex-wrap:nowrap}.compact h3{font-size:1rem;letter-spacing:-.035em}.compact .heading button{font-size:.72rem;padding:7px 9px;flex:none}.compact .history-body{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;padding-right:2px}.compact .history-list{max-height:none;overflow:visible}.compact .tx-card{padding:10px;gap:8px}.compact .top strong{font-size:.8rem}.compact .detail,.compact small,.compact .meta{font-size:.68rem}.compact .notice{margin-top:0;padding:12px;font-size:.75rem}.compact .notice p{font-size:.75rem}.compact .attribution{font-size:.65rem}
  @media(min-width:1001px) and (max-height:680px){.compact .heading{margin-bottom:12px}}
  .panel.embedded{padding:0;border:0;background:none;border-radius:0}.embedded .history-list{max-height:none;overflow:visible}.embedded h3{font-size:1.05rem}.embedded .heading{gap:var(--space-2)}
</style>
