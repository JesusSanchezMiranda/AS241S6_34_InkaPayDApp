<script>
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
    activeTab = tab;
    onTabChange(tab);
  }

  async function change(network) {
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

<div class="network-switcher-wrap">
  <!-- Tabs Selector Bar -->
  <div class="tab-bar">
    <button
      class="tab-btn"
      class:active={activeTab === 'evm'}
      onclick={() => setTab('evm')}
    >
      <i class="ri-swap-box-line"></i> EVM Networks (Rollux / Sepolia) <span class="tab-badge">{EVM_NETWORKS.length}</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'utxo'}
      onclick={() => setTab('utxo')}
    >
      <i class="ri-bit-coin-line"></i> UTXO Networks (Bitcoin / Syscoin) <span class="tab-badge">{UTXO_NETWORKS.length}</span>
    </button>
  </div>

  <!-- Feedback Messages -->
  {#if message}
    <div class="feedback success"><i class="ri-checkbox-circle-fill"></i> {message}</div>
  {/if}
  {#if error}
    <div class="feedback error"><i class="ri-error-warning-fill"></i> {error}</div>
  {/if}

  <!-- Network Cards Grid (3 Columns matching System Dark Theme) -->
  <div class="cards-grid">
    {#each currentList as network}
      <div
        class="net-card"
        class:selected={$selectedNetwork.id === network.id}
        onclick={() => change(network)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') change(network); }}
        tabindex="0"
        role="button"
      >
        <div class="card-header">
          <span class="symbol-pill">{network.symbol}</span>
          <div class="net-info">
            <h4 class="net-title">{network.name}</h4>
            <span class="net-sub font-mono">
              {network.symbol} · Chain ID: {network.type === 'evm' ? network.chainId : network.networkKey}
            </span>
          </div>
          <span class="type-pill" class:evm={network.type === 'evm'}>
            {network.type.toUpperCase()}
          </span>
        </div>

        <div class="card-footer">
          <button
            class="switch-action-btn"
            class:active={$selectedNetwork.id === network.id}
            onclick={(e) => { e.stopPropagation(); change(network); }}
            disabled={changing}
          >
            {#if $selectedNetwork.id === network.id}
              <span class="active-label"><i class="ri-checkbox-circle-fill"></i> Red activa</span>
            {:else}
              <span>Seleccionar y conmutar</span> <i class="ri-arrow-right-line arrow"></i>
            {/if}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .network-switcher-wrap {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* TABS BAR */
  .tab-bar {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .tab-btn {
    border: 1px solid rgba(148, 170, 255, 0.2);
    background: rgba(11, 18, 38, 0.75);
    color: #a6bbb1;
    padding: 10px 22px;
    border-radius: 12px;
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: all 0.25s ease;
  }

  .tab-btn:hover {
    color: #fff;
    border-color: rgba(77, 242, 255, 0.4);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, #101938 0%, #0c1226 100%);
    color: #fff;
    border-color: var(--accent-lime);
    box-shadow: 0 4px 20px rgba(77, 242, 255, 0.15);
  }

  .tab-badge {
    background: rgba(77, 242, 255, 0.15);
    color: var(--accent-lime);
    font-size: 0.78rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }

  /* CARDS GRID 3 COLUMNS MATCHING SYSTEM DARK THEME */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .net-card {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    color: #ffffff;
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 18px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .net-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(4, 8, 20, 0.5), 0 0 15px rgba(77, 242, 255, 0.15);
    border-color: rgba(77, 242, 255, 0.4);
  }

  .net-card.selected {
    border: 1px solid var(--accent-lime);
    box-shadow: 0 0 20px rgba(77, 242, 255, 0.2);
    background: linear-gradient(160deg, #121c3d 0%, #0e1630 100%);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .symbol-pill {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border: 1px solid rgba(77, 242, 255, 0.25);
    flex: none;
    font-family: ui-monospace, monospace;
  }

  .net-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .net-title {
    margin: 0;
    font-size: 1.1rem;
    color: #ffffff;
    font-family: var(--font-heading);
    font-weight: 700;
  }

  .net-sub {
    font-size: 0.78rem;
    color: #8ca69a;
  }

  .type-pill {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    border: 1px solid rgba(168, 85, 247, 0.28);
    flex: none;
  }

  .type-pill.evm {
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border-color: rgba(77, 242, 255, 0.25);
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(148, 170, 255, 0.1);
    padding-top: 14px;
  }

  .switch-action-btn {
    border: 0;
    background: transparent;
    color: #a6bbb1;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    transition: color 0.2s ease;
  }

  .net-card:hover .switch-action-btn {
    color: #4df2ff;
  }

  .switch-action-btn.active .active-label {
    color: var(--accent-lime);
    font-weight: 700;
  }

  .feedback {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .feedback.success {
    background: rgba(77, 242, 255, 0.1);
    border: 1px solid rgba(77, 242, 255, 0.3);
    color: #e2f9ff;
  }

  .feedback.error {
    background: rgba(89, 38, 42, 0.8);
    border: 1px solid rgba(255, 151, 151, 0.3);
    color: #ffd1d1;
  }

  @media (max-width: 1024px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 650px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
