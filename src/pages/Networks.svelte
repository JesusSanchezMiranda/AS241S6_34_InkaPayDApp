<script>
  import { onMount, onDestroy } from 'svelte'
  import NetworkSwitcher from '../lib/components/network/NetworkSwitcher.svelte'
  import NetworkIcon from '../lib/components/network/NetworkIcon.svelte'
  import Skeleton from '../lib/components/common/Skeleton.svelte'
  import { EVM_NETWORKS, UTXO_NETWORKS } from '../lib/config/networks.js'
  import { getBalance } from '../lib/services/evmWallet.js'
  import { getUtxoBalance } from '../lib/services/utxoWallet.js'
  import { wallet } from '../lib/stores/wallet.js'
  import { selectedNetwork } from '../lib/stores/network.js'

  let externalAddress = '', externalBalance = null, massResults = [], queryError = ''
  let querying = false, queryMode = 'single', activeTab = 'evm', loading = true
  let requestId = 0, lastContext = ''
  $: context = `${$selectedNetwork.id}:${activeTab}:${queryMode}:${externalAddress}:${$wallet.address}`
  $: if (context !== lastContext) {
    lastContext = context; requestId += 1
    externalBalance = null; massResults = []; queryError = ''; querying = false
  }
  onMount(() => { const timer = setTimeout(() => loading = false, 500); return () => clearTimeout(timer) })
  onDestroy(() => requestId += 1)

  function handleTabChange(tab) { activeTab = tab }
  async function query() {
    if (querying) return
    const address = externalAddress.trim() || $wallet.address
    queryError = ''; externalBalance = null; massResults = []
    if (!address) { queryError = 'Escribe una dirección pública para consultar.'; return }
    const id = ++requestId, network = $selectedNetwork
    querying = true
    try {
      if (queryMode === 'single') {
        const balance = network.type === 'evm' ? await getBalance(address, network) : await getUtxoBalance(address, network)
        if (id === requestId) externalBalance = { balance, network }
      } else {
        const networks = activeTab === 'utxo' ? UTXO_NETWORKS : EVM_NETWORKS
        const results = await Promise.all(networks.map(async (item) => {
          try { return { ...item, balance: item.type === 'evm' ? await getBalance(address, item) : await getUtxoBalance(address, item), error: false } }
          catch (error) { return { ...item, balance: error?.shortMessage || error?.message || 'No disponible', error: true } }
        }))
        if (id === requestId) massResults = results
      }
    } catch (error) { if (id === requestId) queryError = error?.shortMessage || error?.message || 'No se pudo consultar el saldo.' }
    finally { if (id === requestId) querying = false }
  }
</script>

<main class="container networks-view">
  <header class="view-heading"><div><h1>Gestión de Redes y Proveedores</h1><p>Selecciona una red y consulta saldos por dirección.</p></div><span class="public-badge"><i class="ri-search-eye-line" aria-hidden="true"></i> Consultas públicas, sin firmas</span></header>
  {#if loading}
    <div class="networks-workspace skeleton-page" role="status" aria-label="Cargando Redes" aria-busy="true">
      <div class="panel skeleton-panel" aria-hidden="true">
        <div class="sk-heading"><Skeleton width="50%" height="20px" /><Skeleton width="75%" height="12px" /></div>
        <div class="sk-tabs"><Skeleton width="48%" height="38px" /><Skeleton width="48%" height="38px" delay={60} /></div>
        <div class="sk-network-list">{#each EVM_NETWORKS as network, i}<div class="sk-network"><Skeleton width="32px" height="32px" radius="9px" delay={i * 50} /><div class="sk-lines"><Skeleton width="62%" height="14px" delay={i * 50 + 30} /><Skeleton width="42%" height="10px" delay={i * 50 + 60} /></div><Skeleton width="20px" height="20px" circle delay={i * 50 + 90} /></div>{/each}</div>
      </div>
      <div class="panel skeleton-panel" aria-hidden="true">
        <div class="sk-heading"><Skeleton width="45%" height="20px" /><Skeleton width="70%" height="12px" /></div>
        <div class="sk-tabs"><Skeleton width="48%" height="38px" /><Skeleton width="48%" height="38px" delay={60} /></div>
        <Skeleton width="40%" height="12px" delay={120} /><Skeleton height="46px" radius="12px" delay={160} />
        <Skeleton height="74px" radius="12px" delay={200} /><Skeleton height="44px" radius="12px" delay={240} />
        <div class="sk-empty"><Skeleton width="44px" height="44px" circle /><Skeleton width="55%" height="14px" /></div>
      </div>
    </div>
  {:else}
    <div class="networks-workspace">
      <section class="panel network-panel" aria-label="Seleccionar red">
        <header class="panel-heading"><span class="heading-icon" aria-hidden="true"><i class="ri-global-line"></i></span><div><h2>Redes disponibles</h2><p>Elige el tipo de red y selecciona una de la lista.</p></div></header>
        <NetworkSwitcher {activeTab} onTabChange={handleTabChange} />
      </section>
      <section class="panel query-panel" aria-label="Consultor de redes">
        <header class="panel-heading"><span class="heading-icon" aria-hidden="true"><i class="ri-search-eye-line"></i></span><div><h2>Consultar saldo por dirección</h2><p>Consulta una red o compara todas las del tipo seleccionado.</p></div></header>
        <div class="query-mode-toggle" role="group" aria-label="Modo de consulta">
          <button class:active={queryMode === 'single'} aria-pressed={queryMode === 'single'} onclick={() => queryMode = 'single'}><i class="ri-search-line" aria-hidden="true"></i> Consulta por red</button>
          <button class:active={queryMode === 'multi'} aria-pressed={queryMode === 'multi'} onclick={() => queryMode = 'multi'}><i class="ri-global-line" aria-hidden="true"></i> Consulta multi-red ({activeTab.toUpperCase()})</button>
        </div>
        <div class="query-content">
          <form class="query-controls" onsubmit={(event) => { event.preventDefault(); void query() }}>
            <div class="input-group"><div class="label-row"><label for="external">Dirección pública</label>{#if $wallet.connected}<button class="use-wallet" type="button" onclick={() => externalAddress = $wallet.address}>Usar mi dirección</button>{/if}</div><div class="input-with-icon"><i class="ri-wallet-3-line" aria-hidden="true"></i><input id="external" bind:value={externalAddress} placeholder={$wallet.address || '0x… o una dirección UTXO'} spellcheck="false" autocomplete="off" aria-describedby="address-hint" /></div><small id="address-hint">{$wallet.connected ? 'Puedes usar tu wallet conectada o escribir otra dirección.' : 'No necesitas conectar una wallet para consultar.'}</small></div>
            <div class="selected-net-banner">
              {#if queryMode === 'single'}<NetworkIcon network={$selectedNetwork} /><div><small>Red seleccionada</small><strong>{$selectedNetwork.name}</strong></div><span class="type-badge">{$selectedNetwork.symbol} · {$selectedNetwork.type.toUpperCase()}</span>
              {:else}<span class="heading-icon" aria-hidden="true"><i class="ri-stack-line"></i></span><div><small>Redes a consultar</small><strong>{activeTab === 'evm' ? EVM_NETWORKS.length : UTXO_NETWORKS.length} redes {activeTab.toUpperCase()}</strong></div>{/if}
            </div>
            <button class="primary-btn" type="submit" disabled={querying}><i class={querying ? 'ri-loader-4-line spin' : 'ri-search-2-line'} aria-hidden="true"></i>{querying ? 'Consultando saldos…' : queryMode === 'single' ? `Consultar saldo en ${$selectedNetwork.name}` : `Consultar en redes ${activeTab.toUpperCase()}`}</button>
          </form>
          <div class="query-results" aria-busy={querying}>
            {#if querying}<div class="query-skeleton" role="status" aria-label="Consultando saldos">{#each [0, 1, 2] as i}<Skeleton height="56px" radius="12px" delay={i * 70} />{/each}</div>
            {:else if queryError}<p class="feedback error" role="alert"><i class="ri-error-warning-line" aria-hidden="true"></i>{queryError}</p>
            {:else if externalBalance}<div class="balance-result" role="status"><span>Saldo disponible en {externalBalance.network.name}</span><strong>{Number(externalBalance.balance).toLocaleString('es-PE', { maximumFractionDigits: 8 })} <small>{externalBalance.network.symbol}</small></strong><span>Consulta pública de solo lectura.</span></div>
            {:else if massResults.length}<table class="balance-table"><thead><tr><th>Red</th><th>Saldo / estado</th></tr></thead><tbody>{#each massResults as result (result.id)}<tr><td><div class="result-network"><NetworkIcon network={result} /><div><strong>{result.name}</strong><small>{result.symbol} · {result.type.toUpperCase()}</small></div></div></td><td class:error={result.error}>{result.error ? result.balance : `${Number(result.balance).toLocaleString('es-PE', { maximumFractionDigits: 8 })} ${result.symbol}`}</td></tr>{/each}</tbody></table>
            {:else}<div class="query-placeholder"><span class="placeholder-icon" aria-hidden="true"><i class="ri-wallet-3-line"></i></span><strong>Explora el saldo de una dirección</strong><p>Los resultados de tu consulta aparecerán aquí.</p></div>{/if}
          </div>
        </div>
      </section>
    </div>
  {/if}
</main>

<style>
  .container{--radius-panel:18px;height:100dvh;min-height:0;padding:94px var(--workspace-gutter) 24px;display:flex;flex-direction:column;gap:24px;position:relative;z-index:2}
  .view-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;flex:none}.view-heading>div{min-width:0}h1,h2{font-family:var(--font-heading);letter-spacing:-.035em;margin:0}h1{font-size:1.8rem}.view-heading p{font-size:.82rem;color:var(--text-secondary);line-height:1.5;margin:6px 0 0}.public-badge{display:flex;align-items:center;gap:8px;border:1px solid var(--border-panel);border-radius:999px;background:var(--surface-input);color:var(--text-secondary);font-size:.72rem;padding:9px 13px;white-space:nowrap}
  .networks-workspace{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.2fr);gap:24px}
  .panel{min-width:0;min-height:0;display:flex;flex-direction:column;gap:20px;padding:24px;background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);box-shadow:0 8px 24px rgba(4,8,20,.22)}
  .panel-heading{display:flex;align-items:center;gap:12px;flex:none}.panel-heading>div{min-width:0}.heading-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:11px;background:color-mix(in srgb,var(--accent-primary) 8%,transparent);color:var(--accent-primary);font-size:1.15rem}h2{font-size:1.05rem}.panel-heading p{font-size:.76rem;color:var(--text-secondary);line-height:1.5;margin:5px 0 0}
  button,input{font:inherit}button{cursor:pointer}button:disabled{cursor:wait;opacity:.6}button:focus-visible,input:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}
  .query-mode-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:4px;border:1px solid var(--border-input);border-radius:12px;background:var(--surface-input);flex:none}.query-mode-toggle button{border:1px solid transparent;border-radius:9px;background:transparent;color:var(--text-secondary);padding:10px;font-size:.8rem;font-weight:600;line-height:1.4}.query-mode-toggle button.active{color:var(--accent-primary);border-color:color-mix(in srgb,var(--accent-primary) 45%,transparent);background:color-mix(in srgb,var(--accent-primary) 9%,var(--surface-input))}
  .query-content{min-height:0;flex:1;display:flex;flex-direction:column;gap:20px;overflow-y:auto}.query-controls{display:grid;gap:18px;flex:none}.label-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}label{font-size:.8rem;color:var(--text-primary);font-weight:500}.use-wallet{padding:3px 0;border:0;color:var(--accent-primary);background:none;font-size:.7rem}.input-with-icon{position:relative}.input-with-icon>i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--accent-primary)}input{width:100%;min-width:0;padding:12px 14px 12px 42px;border:1px solid var(--border-input);border-radius:12px;background:var(--surface-input);color:var(--text-primary);font-size:.85rem}.input-group>small{display:block;margin-top:7px;font-size:.7rem;color:var(--text-secondary);line-height:1.45}
  .selected-net-banner{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--border-input);border-radius:12px;background:var(--surface-input);min-width:0}.selected-net-banner>div{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.selected-net-banner small{font-size:.68rem;color:var(--text-secondary)}.selected-net-banner strong{font-size:.88rem;overflow-wrap:anywhere}.type-badge{font-size:.65rem;border-radius:6px;padding:5px 7px;color:var(--accent-primary);background:color-mix(in srgb,var(--accent-primary) 8%,transparent);flex:none}
  .primary-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 16px;border:1px solid var(--accent-primary);border-radius:12px;color:var(--bg-page);background:var(--accent-primary);font-size:.83rem;font-weight:600;line-height:1.4}
  .query-results{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}.query-placeholder{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;min-height:120px;padding:16px;color:var(--text-secondary)}.placeholder-icon{font-size:1.6rem;color:var(--accent-primary);display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--border-panel);border-radius:16px;background:var(--surface-input)}.query-placeholder strong{font-size:.85rem;font-weight:500}.query-placeholder p{font-size:.73rem;line-height:1.5;margin:0}
  .balance-result{display:flex;flex-direction:column;gap:12px;padding:20px;border:1px solid var(--border-input);border-radius:14px;background:var(--surface-input);overflow-wrap:anywhere}.balance-result>span{font-size:.74rem;color:var(--text-secondary)}.balance-result>strong{font-size:1.8rem;color:var(--accent-primary)}.balance-result small{font-size:.85rem}
  .balance-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.8rem}.balance-table th{text-align:left;font-size:.68rem;font-weight:500;color:var(--text-secondary);padding:10px 12px;background:var(--surface-input);position:sticky;top:0;z-index:1}.balance-table th:first-child{width:53%}.balance-table td{padding:12px;border-bottom:1px solid var(--border-panel);overflow-wrap:anywhere}.balance-table td:last-child{color:var(--accent-primary)}.result-network{display:flex;align-items:center;gap:10px;min-width:0}.result-network>div{display:grid;gap:4px;min-width:0}.result-network strong{font-size:.78rem;font-weight:500}.result-network small{font-size:.65rem;color:var(--text-secondary)}.balance-table td.error,.error{color:var(--text-error)}.feedback{display:flex;align-items:center;gap:8px;font-size:.8rem;line-height:1.5;padding:14px;margin:0;border:1px solid var(--border-input);border-radius:12px;overflow-wrap:anywhere}.query-skeleton{display:grid;gap:10px}
  .sk-heading{display:grid;gap:10px;flex:none}.sk-tabs{display:flex;justify-content:space-between;gap:8px}.sk-network-list{display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden}.sk-network{display:flex;align-items:center;gap:12px;padding:10px 14px;min-height:62px;border:1px solid var(--border-panel);border-radius:12px;flex:none}.sk-lines{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}.sk-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;flex:1;min-height:0}
  .networks-view :global(*){scrollbar-width:thin;scrollbar-color:var(--border-input) var(--surface-input)}
  .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  @media(min-width:1001px) and (max-height:800px){.container{padding-top:84px;padding-bottom:16px;gap:18px}h1{font-size:1.55rem}.view-heading p{font-size:.75rem}.panel{padding:18px;gap:14px}.networks-workspace{gap:20px}.panel-heading p{font-size:.72rem}h2{font-size:.95rem}.query-content{gap:14px}.query-controls{gap:14px}.selected-net-banner{padding:12px}.primary-btn{padding:10px 14px}.query-placeholder{min-height:90px}.placeholder-icon{width:40px;height:40px;font-size:1.3rem}.sk-network{padding:10px 12px}}
  @media(max-width:1000px){.container{height:auto;min-height:100dvh;padding-top:100px}.public-badge{display:none}.networks-workspace{grid-template-columns:1fr;flex:none}.network-panel{height:570px}.query-panel{min-height:570px}.skeleton-panel{min-height:550px}.query-results{min-height:180px;max-height:400px}.query-content{overflow:visible}.sk-network-list{overflow:auto}}
  @media(max-width:800px){.container{padding-top:154px}}
  @media(max-width:520px){.container{gap:20px;padding-left:16px;padding-right:16px}.view-heading h1{font-size:1.55rem}.view-heading p{font-size:.8rem}.panel{padding:16px;gap:16px}.heading-icon{width:32px;height:32px}.panel-heading{gap:10px}.panel-heading h2{font-size:.95rem}.query-mode-toggle button{font-size:.72rem;padding:9px 6px}.type-badge{font-size:.6rem}.selected-net-banner{padding:12px;gap:8px}}
  @media(prefers-reduced-motion:reduce){.spin{animation:none}}
</style>
