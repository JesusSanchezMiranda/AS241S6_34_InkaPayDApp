<script>
  import { tick } from 'svelte';
  import NetworkIcon from './NetworkIcon.svelte';
  import { NETWORKS } from '../../config/networks.js';
  import { selectedNetwork, selectNetwork } from '../../stores/network.js';
  import { wallet, setConnectedWallet } from '../../stores/wallet.js';
  import { switchEvmNetwork } from '../../services/evmWallet.js';
  import { switchUtxoNetwork, getUtxoSnapshot } from '../../services/utxoWallet.js';

  export let disabled = false;
  export let compact = false;
  export let inlineStatus = false;
  export let onSwitchingChange = () => {};
  let activeType = $selectedNetwork.type;
  let lastType = activeType;
  let changing = false;
  let error = '';
  let open = false, root, trigger, menu, focusedIndex = 0;
  let placement = 'below', menuHeight = 320;
  const menuNetworks = [...NETWORKS.filter((network) => network.type === 'evm'), ...NETWORKS.filter((network) => network.type === 'utxo')];
  $: if (disabled || changing) open = false;
  $: if ($selectedNetwork.type !== lastType) { lastType = $selectedNetwork.type; activeType = lastType; }
  $: networks = NETWORKS.filter((network) => network.type === activeType);

  async function openMenu() {
    if (disabled || changing) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 16, above = rect.top - 90;
    placement = below >= 180 || below >= above ? 'below' : 'above';
    menuHeight = Math.max(80, Math.min(340, placement === 'below' ? below : above));
    focusedIndex = Math.max(0, menuNetworks.findIndex((network) => network.id === $selectedNetwork.id));
    open = true;
    await tick();
    menu?.querySelectorAll('[role="option"]')[focusedIndex]?.focus();
  }
  function closeMenu(restoreFocus = false) { open = false; if (restoreFocus) trigger?.focus(); }
  function outside(event) { if (open && !root?.contains(event.target)) closeMenu(); }
  function menuKeys(event) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') return closeMenu(true);
    if (event.key === 'Home') focusedIndex = 0;
    else if (event.key === 'End') focusedIndex = menuNetworks.length - 1;
    else focusedIndex = (focusedIndex + (event.key === 'ArrowDown' ? 1 : -1) + menuNetworks.length) % menuNetworks.length;
    menu?.querySelectorAll('[role="option"]')[focusedIndex]?.focus();
  }

  // La selección conserva los mismos servicios de Pali que usaba el formulario.
  async function change(network) {
    if (changing || disabled) return;
    closeMenu();
    error = '';
    changing = true;
    onSwitchingChange(true);
    try {
      if ($wallet.connected) {
        const snapshot = network.type === 'evm'
          ? await switchEvmNetwork(network)
          : (await switchUtxoNetwork(network), await getUtxoSnapshot());
        await setConnectedWallet({ ...snapshot, network, symbol: network.symbol });
      }
      selectNetwork(network);
    } catch (e) { error = e?.message || 'No fue posible cambiar de red. Inténtalo de nuevo.'; }
    finally { changing = false; onSwitchingChange(false); void tick().then(() => trigger?.focus()); }
  }
</script>

<svelte:window onpointerdown={outside} onresize={() => closeMenu()} />

<div class="network-picker" class:compact aria-busy={changing} bind:this={root} onfocusout={(event) => { if (!root?.contains(event.relatedTarget)) closeMenu(); }}>
  {#if compact}
    <div class="menu-anchor">
      <button class="network-trigger" type="button" aria-label={`Red para el envío: ${$selectedNetwork.name}`} aria-haspopup="listbox" aria-expanded={open} disabled={disabled || changing} bind:this={trigger} onclick={() => open ? closeMenu() : openMenu()} onkeydown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); void openMenu(); } }}>
        <NetworkIcon network={$selectedNetwork} /><span class="info"><strong>{$selectedNetwork.name}</strong><small>{inlineStatus && changing ? 'Confirma el cambio en Pali…' : inlineStatus && disabled ? 'Operación en proceso…' : `${$selectedNetwork.symbol} · ${$selectedNetwork.type.toUpperCase()}`}</small></span><i class={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} aria-hidden="true"></i>
      </button>
      {#if open}
        <div class="network-menu" class:above={placement === 'above'} style:max-height={`${menuHeight}px`} role="listbox" aria-label="Redes disponibles" tabindex="-1" bind:this={menu} onkeydown={menuKeys}>
          {#each ['evm', 'utxo'] as type}<div role="group" aria-label={`Redes ${type.toUpperCase()}`}><div class="group-title">Redes {type.toUpperCase()}</div>{#each menuNetworks.filter((network) => network.type === type) as network}<button class="network-option" class:active={$selectedNetwork.id === network.id} type="button" role="option" aria-selected={$selectedNetwork.id === network.id} tabindex={menuNetworks.indexOf(network) === focusedIndex ? 0 : -1} onclick={() => change(network)} onfocus={() => focusedIndex = menuNetworks.indexOf(network)}><NetworkIcon {network} /><span class="info"><strong>{network.name}</strong><small>{network.symbol}{network.chainId ? ` · ${network.chainId}` : ''}</small></span>{#if $selectedNetwork.id === network.id}<i class="ri-check-line" aria-hidden="true"></i>{/if}</button>{/each}</div>{/each}
        </div>
      {/if}
    </div>
  {:else}
  <div class="type-filter" role="group" aria-label="Tipo de red">{#each ['evm', 'utxo'] as type}<button type="button" class:active={activeType === type} aria-pressed={activeType === type} disabled={disabled || changing} onclick={() => activeType = type}>{type.toUpperCase()}</button>{/each}</div>
  <div class="network-list" role="group" aria-label="Redes disponibles">
    {#each networks as network}
      <button class="network-option" type="button" class:active={$selectedNetwork.id === network.id} aria-pressed={$selectedNetwork.id === network.id} disabled={disabled || changing} onclick={() => change(network)}>
        <span class="icon" aria-hidden="true">{network.icon}</span><span class="info"><strong>{network.name}</strong><small>{network.symbol}{network.type === 'evm' ? ` · ${network.chainId}` : ''}</small></span>{#if $selectedNetwork.id === network.id}<i class="ri-check-line" aria-hidden="true"></i>{/if}
      </button>
    {/each}
  </div>
  {/if}
  {#if !inlineStatus && changing}<small class="hint" role="status">Confirma el cambio de red en Pali…</small>{:else if !inlineStatus && disabled}<small class="hint">Espera a que termine el envío para cambiar de red.</small>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .network-picker.compact{flex:none;gap:8px}.menu-anchor{position:relative}.network-trigger{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;min-height:50px}.network-trigger>.info{flex:1}.network-menu{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:60;background:var(--surface-input);border:1px solid var(--accent-primary);border-radius:14px;box-shadow:var(--shadow-panel);padding:8px;overflow-y:auto;scrollbar-width:thin}.network-menu.above{top:auto;bottom:calc(100% + 8px)}.network-menu .network-option{width:100%;margin:4px 0;border-color:transparent}.network-menu .network-option.active{border-color:var(--accent-primary);background:var(--bg-card)}.group-title{padding:8px 10px;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-secondary);font-weight:700}
  .network-picker{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0}.type-filter{display:flex;gap:6px;flex:none}.type-filter button{padding:7px 14px;font-size:.75rem}.network-list{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;padding:2px}.network-list:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px;border-radius:var(--radius-control)}button{font:inherit;border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);color:var(--text-secondary);cursor:pointer}button:hover:not(:disabled){border-color:var(--accent-primary);color:var(--text-primary)}button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:1px}button:disabled{opacity:.5;cursor:not-allowed}button.active{border-color:var(--accent-primary);color:var(--accent-primary)}.network-option{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;flex:none;min-width:0}.icon{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:8px;background:var(--bg-card);color:var(--accent-primary)}.info{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.info strong{font-size:.8rem;font-weight:600;color:var(--text-primary);overflow-wrap:anywhere}.info small,.hint{font-size:.7rem;color:var(--text-secondary)}.error{font-size:.75rem;line-height:1.5;color:var(--text-error);margin:0;max-height:30%;overflow-y:auto}
</style>
