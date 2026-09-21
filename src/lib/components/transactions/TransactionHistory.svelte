<script>
  import { transactions, clearTransactions } from '../../stores/transactions.js';
  import { getExplorerTransactionUrl } from '../../services/explorers.js';
  import { NETWORKS } from '../../config/networks.js';
  import TransactionModal from './TransactionModal.svelte';

  let activeTab = 'all'; // 'all' | 'received' | 'sent' | 'pending'
  let selectedNetworkFilter = 'all'; // 'all' or network.id
  let selectedTxForModal = null;

  const short = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  function timeAgo(timestamp) {
    if (!timestamp) return 'Reciente';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Hace instantes';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `Hace ${days} d`;
    return new Date(timestamp).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  $: totalCount = $transactions.length;
  $: receivedCount = $transactions.filter((t) => t.type === 'receive').length;
  $: sentCount = $transactions.filter((t) => t.type === 'send' || !t.type).length;
  $: pendingCount = $transactions.filter((t) => t.status === 'Pendiente').length;

  $: filteredTransactions = $transactions.filter((item) => {
    // Filter by type tab
    if (activeTab === 'received' && item.type !== 'receive') return false;
    if (activeTab === 'sent' && (item.type !== 'send' && item.type)) return false;
    if (activeTab === 'pending' && item.status !== 'Pendiente') return false;

    // Filter by network dropdown
    if (selectedNetworkFilter !== 'all') {
      const netId = item.network?.id || item.networkId;
      if (netId && netId !== selectedNetworkFilter) return false;
      if (!netId && item.networkName && item.networkName.toLowerCase() !== selectedNetworkFilter.toLowerCase()) {
        const matchingNet = NETWORKS.find((n) => n.id === selectedNetworkFilter);
        if (matchingNet && matchingNet.name.toLowerCase() !== item.networkName.toLowerCase()) return false;
      }
    }
    return true;
  });
</script>

<div class="panel history-panel">
  <!-- Header Filter Bar matching Image 2 -->
  <div class="history-top-bar">
    <!-- Left Filter Tabs -->
    <div class="filter-tabs" role="tablist">
      <button
        class="tab-btn"
        class:active={activeTab === 'all'}
        onclick={() => (activeTab = 'all')}
      >
        Todas <span class="badge-count">{totalCount}</span>
      </button>

      <button
        class="tab-btn"
        class:active={activeTab === 'received'}
        onclick={() => (activeTab = 'received')}
      >
        <span class="dot green">●</span> Recibidas <span class="badge-count green">{receivedCount}</span>
      </button>

      <button
        class="tab-btn"
        class:active={activeTab === 'sent'}
        onclick={() => (activeTab = 'sent')}
      >
        <span class="dot blue">●</span> Enviadas <span class="badge-count blue">{sentCount}</span>
      </button>

      <button
        class="tab-btn"
        class:active={activeTab === 'pending'}
        onclick={() => (activeTab = 'pending')}
      >
        <span class="dot yellow">●</span> Pendientes <span class="badge-count yellow">{pendingCount}</span>
      </button>
    </div>

    <!-- Right Network Filter Dropdown -->
    <div class="network-select-wrap">
      <i class="ri-global-line select-icon"></i>
      <select bind:value={selectedNetworkFilter} class="network-filter-select">
        <option value="all">Todas las redes</option>
        {#each NETWORKS as net}
          <option value={net.id}>{net.name}</option>
        {/each}
      </select>
      <i class="ri-arrow-down-s-line arrow-icon"></i>
    </div>
  </div>

  <!-- Transaction List matching Image 2 style -->
  {#if filteredTransactions.length}
    <div class="history-list">
      {#each filteredTransactions as tx}
        <div
          class="tx-card"
          onclick={() => (selectedTxForModal = tx)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectedTxForModal = tx; }}
          role="button"
          tabindex="0"
        >
          <!-- Direction Icon -->
          <div class="tx-icon" class:receive={tx.type === 'receive'}>
            {#if tx.type === 'receive'}
              <i class="ri-arrow-down-line"></i>
            {:else}
              <i class="ri-arrow-up-line"></i>
            {/if}
          </div>

          <!-- Main Info -->
          <div class="tx-main">
            <div class="tx-title-row">
              <span class="tx-type-label" class:receive={tx.type === 'receive'}>
                {tx.type === 'receive' ? 'RECIBIDO' : 'ENVIADO'}
              </span>
              <strong class="tx-amount" class:receive={tx.type === 'receive'}>
                {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.symbol}
              </strong>
              <span class="network-pill {tx.network?.id || 'default'}">
                {tx.networkName || tx.network?.name || 'Ethereum Hoodi'}
              </span>
            </div>

            <div class="tx-details-row">
              <span class="tx-address">
                {tx.type === 'receive' ? 'De:' : 'Para:'} {short(tx.from || tx.to)}
              </span>
              <span class="bullet">·</span>
              <span class="tx-hash">
                Tx: {short(tx.hash)}
              </span>
            </div>
          </div>

          <!-- Status & Time Badge -->
          <div class="tx-status-col">
            <span class="status-pill" class:confirmed={tx.status === 'Confirmada'} class:pending={tx.status === 'Pendiente'} class:error={tx.status === 'Error'}>
              {#if tx.status === 'Confirmada'}
                <i class="ri-checkbox-circle-line"></i> Confirmada
              {:else if tx.status === 'Pendiente'}
                <i class="ri-loader-4-line spin"></i> Pendiente
              {:else}
                <i class="ri-close-circle-line"></i> Error
              {/if}
            </span>
            <span class="tx-time">{timeAgo(tx.createdAt)}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty">
      <i class="ri-inbox-archive-line"></i> No se encontraron transacciones en esta categoría.
    </div>
  {/if}

  {#if $transactions.length}
    <div class="history-footer">
      <button class="clear-btn" onclick={clearTransactions}>
        <i class="ri-delete-bin-line"></i> Limpiar historial local
      </button>
    </div>
  {/if}
</div>

<!-- Modal for full transaction details -->
{#if selectedTxForModal}
  <TransactionModal
    transaction={selectedTxForModal}
    onClose={() => (selectedTxForModal = null)}
  />
{/if}

<style>
  .panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 24px 28px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }

  /* TOP FILTER BAR */
  .history-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    flex: none;
  }

  .filter-tabs {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0b1226;
    padding: 5px;
    border-radius: 14px;
    border: 1px solid rgba(148, 170, 255, 0.16);
  }

  .tab-btn {
    border: 0;
    background: transparent;
    color: #a6bbb1;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #fff;
  }

  .tab-btn.active {
    background: #141f3d;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .dot {
    font-size: 0.7rem;
  }
  .dot.green { color: #2ed573; }
  .dot.blue { color: #38bdf8; }
  .dot.yellow { color: #eccc68; }

  .badge-count {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .badge-count.green { background: rgba(46, 213, 115, 0.18); color: #2ed573; }
  .badge-count.blue { background: rgba(56, 189, 248, 0.18); color: #38bdf8; }
  .badge-count.yellow { background: rgba(236, 204, 104, 0.18); color: #eccc68; }

  /* NETWORK SELECTOR */
  .network-select-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .select-icon {
    position: absolute;
    left: 14px;
    color: #6fd8ea;
    font-size: 1.05rem;
    pointer-events: none;
  }

  .arrow-icon {
    position: absolute;
    right: 14px;
    color: #8ca69a;
    font-size: 1.1rem;
    pointer-events: none;
  }

  .network-filter-select {
    appearance: none;
    background: #0b1226;
    color: #effff2;
    border: 1px solid rgba(148, 170, 255, 0.2);
    border-radius: 12px;
    padding: 9px 38px 9px 38px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .network-filter-select:focus {
    border-color: var(--accent-lime);
  }

  /* TRANSACTION CARDS MATCHING IMAGE 2 WITH INTERNAL SCROLL */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    max-height: 410px;
    overflow-y: auto;
    padding-right: 6px;
  }

  .history-list::-webkit-scrollbar {
    width: 6px;
  }

  .history-list::-webkit-scrollbar-track {
    background: rgba(11, 18, 38, 0.5);
    border-radius: 8px;
  }

  .history-list::-webkit-scrollbar-thumb {
    background: rgba(77, 242, 255, 0.25);
    border-radius: 8px;
  }

  .history-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-lime);
  }

  .tx-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #0c142b;
    border: 1px solid rgba(148, 170, 255, 0.12);
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tx-card:hover {
    border-color: rgba(77, 242, 255, 0.4);
    background: #0e1732;
    transform: translateY(-1px);
  }

  .tx-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
    display: grid;
    place-items: center;
    font-size: 1.25rem;
    font-weight: 700;
    flex: none;
  }

  .tx-icon.receive {
    background: rgba(46, 213, 115, 0.12);
    color: #2ed573;
  }

  .tx-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .tx-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .tx-type-label {
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #38bdf8;
  }

  .tx-type-label.receive {
    color: #2ed573;
  }

  .tx-amount {
    font-size: 1.05rem;
    color: #fff;
    font-weight: 700;
  }

  .tx-amount.receive {
    color: #2ed573;
  }

  .network-pill {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: rgba(255, 100, 160, 0.12);
    color: #ff9ebb;
    border: 1px solid rgba(255, 100, 160, 0.25);
  }

  .network-pill.sepolia {
    background: rgba(46, 213, 115, 0.12);
    color: #6effb0;
    border-color: rgba(46, 213, 115, 0.25);
  }

  .tx-details-row {
    font-size: 0.82rem;
    color: #8ca69a;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .bullet {
    color: #435b6b;
  }

  .tx-status-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex: none;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    background: rgba(148, 170, 255, 0.1);
    color: #a8baff;
    border: 1px solid rgba(148, 170, 255, 0.2);
  }

  .status-pill.confirmed {
    background: rgba(46, 213, 115, 0.12);
    color: #2ed573;
    border-color: rgba(46, 213, 115, 0.3);
  }

  .status-pill.pending {
    background: rgba(236, 204, 104, 0.12);
    color: #eccc68;
    border-color: rgba(236, 204, 104, 0.3);
  }

  .status-pill.error {
    background: rgba(255, 100, 100, 0.12);
    color: #ff9797;
    border-color: rgba(255, 100, 100, 0.3);
  }

  .tx-time {
    font-size: 0.76rem;
    color: #76918d;
  }

  .history-footer {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
  }

  .clear-btn {
    background: transparent;
    color: #8ca69a;
    border: 1px solid rgba(148, 170, 255, 0.2);
    padding: 7px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    color: #ff9797;
    border-color: rgba(255, 100, 100, 0.3);
  }

  .empty {
    border: 1px dashed rgba(148, 170, 255, 0.2);
    border-radius: 14px;
    padding: 32px;
    color: #8ca69a;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.95rem;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .history-top-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .filter-tabs {
      overflow-x: auto;
      width: 100%;
    }
    .tx-card {
      flex-direction: column;
      align-items: flex-start;
    }
    .tx-status-col {
      align-items: flex-start;
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
      border-top: 1px solid rgba(148, 170, 255, 0.1);
      padding-top: 10px;
      margin-top: 6px;
    }
  }
</style>
