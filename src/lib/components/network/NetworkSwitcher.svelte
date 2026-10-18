<script>
  import NetworkIcon from './NetworkIcon.svelte';
  import { EVM_NETWORKS, UTXO_NETWORKS } from '../../config/networks.js';
  import { selectedNetwork, selectNetwork } from '../../stores/network.js';
  import { switchEvmNetwork } from '../../services/evmWallet.js';
  import { switchUtxoNetwork, getUtxoSnapshot } from '../../services/utxoWallet.js';
  import { wallet, setConnectedWallet } from '../../stores/wallet.js';

  export let activeTab = 'evm'; // 'evm' | 'utxo'
  export let onTabChange = () => {};

  let message = '';
  let error = '';
  let changing = false;

  function setTab(tab) {
    if (changing || activeTab === tab) return;
    message = ''; error = '';
    activeTab = tab;
    onTabChange(tab);
  }

  async function change(network) {
    if (changing || $selectedNetwork.id === network.id) return;
    message = '';
    error = '';
    changing = true;
    try {
      if ($wallet.connected) {
        const snapshot =
          network.type === 'evm'
            ? await switchEvmNetwork(network)
            : (await switchUtxoNetwork(network), await getUtxoSnapshot());
        await setConnectedWallet({ ...snapshot, network, symbol: network.symbol });
      }
      selectNetwork(network);
      message = `Red activa conmutada a: ${network.name}`;
    } catch (e) {
      error = e?.message || 'No fue posible conmutar de red.';
    } finally {
      changing = false;
    }
  }

  $: currentList = activeTab === 'utxo' ? UTXO_NETWORKS : EVM_NETWORKS;
</script>

<div class="network-switcher-wrap" aria-busy={changing}>
  <div class="tab-bar" role="group" aria-label="Tipo de red">
    <button class:active={activeTab === 'evm'} aria-pressed={activeTab === 'evm'} onclick={() => setTab('evm')} disabled={changing}><i class="ri-swap-box-line" aria-hidden="true"></i> EVM <span>{EVM_NETWORKS.length}</span></button>
    <button class:active={activeTab === 'utxo'} aria-pressed={activeTab === 'utxo'} onclick={() => setTab('utxo')} disabled={changing}><i class="ri-bit-coin-line" aria-hidden="true"></i> UTXO <span>{UTXO_NETWORKS.length}</span></button>
  </div>
  {#if message}<p class="feedback success" role="status"><i class="ri-checkbox-circle-line" aria-hidden="true"></i>{message}</p>{/if}
  {#if error}<p class="feedback error" role="alert">{error}</p>{/if}
  <ul class="network-list" aria-label={activeTab === 'evm' ? 'Redes EVM' : 'Redes UTXO'}>
    {#each currentList as network (network.id)}
      <li><button class="network-row" class:selected={$selectedNetwork.id === network.id} aria-label={`Seleccionar ${network.name}`} aria-pressed={$selectedNetwork.id === network.id} onclick={() => change(network)} disabled={changing}>
        <NetworkIcon {network} />
        <span class="network-info"><strong>{network.name}</strong><small>{network.symbol} · {network.type === 'evm' ? `Chain ID ${network.chainId}` : network.networkKey}</small></span>
        {#if network.testnet}<span class="testnet">Testnet</span>{/if}
        <span class="selection" aria-hidden="true"><i class={$selectedNetwork.id === network.id ? 'ri-checkbox-circle-fill' : 'ri-arrow-right-s-line'}></i></span>
      </button></li>
    {/each}
  </ul>
</div>

<style>
  .network-switcher-wrap{display:flex;flex-direction:column;gap:16px;min-height:0;flex:1}
  .tab-bar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:none;padding:4px;border:1px solid var(--border-input);background:var(--surface-input);border-radius:12px}
  button{font:inherit;cursor:pointer;color:var(--text-secondary);border:1px solid transparent;background:transparent}
  .tab-bar button{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:9px;font-size:.82rem;font-weight:600}
  .tab-bar button.active{color:var(--accent-primary);border-color:color-mix(in srgb,var(--accent-primary) 45%,transparent);background:color-mix(in srgb,var(--accent-primary) 9%,var(--surface-input))}
  .tab-bar button>span{font-size:.68rem;padding:2px 7px;border-radius:6px;background:var(--bg-card)}
  button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-3px}button:disabled{opacity:.55;cursor:wait}
  .network-list{list-style:none;margin:0;padding:2px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;min-height:0;scrollbar-gutter:stable}
  .network-row{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:10px 14px;background:var(--surface-input);border-color:var(--border-panel);border-radius:12px;transition:border-color .2s,background .2s}
  .network-row:hover:not(:disabled){border-color:var(--border-input);background:var(--bg-card)}
  .network-row.selected{border-color:color-mix(in srgb,var(--accent-primary) 65%,var(--border-input));background:color-mix(in srgb,var(--accent-primary) 5%,var(--surface-input))}
  .network-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.network-info strong{font-size:.88rem;font-weight:600;color:var(--text-primary);overflow-wrap:anywhere}.network-info small{font-size:.7rem;line-height:1.4}
  .selection{font-size:1.15rem;flex:none;color:var(--text-secondary)}.selected .selection{color:var(--accent-primary)}
  .testnet{font-size:.6rem;color:var(--accent-secondary);background:color-mix(in srgb,var(--accent-secondary) 8%,transparent);border-radius:6px;padding:4px 6px;flex:none}
  .feedback{display:flex;align-items:center;gap:8px;margin:0;padding:10px 12px;border:1px solid var(--border-input);border-radius:10px;font-size:.75rem;line-height:1.45;flex:none;overflow-wrap:anywhere}.success{color:var(--accent-primary)}.error{color:var(--text-error)}
  @media(min-width:1001px) and (max-height:800px){.network-switcher-wrap{gap:12px}.network-row{padding:10px 12px}.network-info strong{font-size:.83rem}.network-info small{font-size:.68rem}}
  @media(prefers-reduced-motion:reduce){.network-row{transition:none}}
</style>
