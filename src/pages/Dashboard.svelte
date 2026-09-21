<script>
  import { onMount } from 'svelte';
  import { wallet } from '../lib/stores/wallet.js';
  import { selectedNetwork } from '../lib/stores/network.js';
  import Skeleton from '../lib/components/common/Skeleton.svelte';
  import TransactionForm from '../lib/components/transactions/TransactionForm.svelte';
  import TransactionHistory from '../lib/components/transactions/TransactionHistory.svelte';

  export let onDisconnect = () => {};
  export let onConnect = () => {};

  let copied = false;
  let loading = true;

  onMount(() => {
    // Simula la carga de datos (wallet, saldo e historial) al entrar a la sección
    const timer = setTimeout(() => (loading = false), 900);
    return () => clearTimeout(timer);
  });

  const short = (a) => (a ? `${a.slice(0, 10)}…${a.slice(-8)}` : '');

  async function copyAddress() {
    if (!$wallet.address) return;
    await navigator.clipboard.writeText($wallet.address);
    copied = true;
    setTimeout(() => (copied = false), 1600);
  }
</script>

<main class="container">
  <div class="dashboard-header">
    <div>
      <div class="eyebrow">Área privada</div>
      <h2>Mi Billetera</h2>
    </div>
    {#if !$wallet.connected}
      <button class="connect-header-btn" onclick={onConnect}>Conectar wallet</button>
    {/if}
  </div>

  {#if loading}
    <!-- SKELETON DE CARGA: Billetera (banner + panel de envío + historial) -->
    <div class="skeleton-page" aria-busy="true">
      <!-- Banner superior -->
      <div class="skeleton-banner">
        <div class="sk-row">
          <div class="sk-pills">
            <Skeleton width="110px" height="30px" radius="999px" />
            <Skeleton width="160px" height="30px" radius="999px" delay={120} />
          </div>
          <Skeleton width="140px" height="38px" radius="12px" delay={200} />
        </div>
        <div class="sk-divider"></div>
        <div class="sk-banner-body">
          <div class="sk-col">
            <Skeleton width="120px" height="12px" delay={240} />
            <Skeleton width="290px" height="24px" radius="10px" delay={280} />
            <div class="sk-inline">
              <Skeleton width="120px" height="12px" delay={320} />
              <Skeleton width="190px" height="12px" delay={360} />
            </div>
          </div>
          <div class="sk-col sk-col-end">
            <Skeleton width="130px" height="12px" delay={300} />
            <Skeleton width="230px" height="52px" radius="12px" delay={340} />
          </div>
        </div>
      </div>

      <!-- Panel de envío + historial -->
      <div class="skeleton-grid">
        <div class="skeleton-panel">
          <div class="sk-head-row">
            <div class="sk-col">
              <Skeleton width="190px" height="18px" delay={400} />
              <Skeleton width="230px" height="12px" delay={440} />
            </div>
            <Skeleton width="70px" height="26px" radius="999px" delay={480} />
          </div>
          <div class="sk-fields">
            <div class="sk-trigger">
              <Skeleton width="32px" height="32px" radius="8px" delay={520} />
              <div class="sk-col">
                <Skeleton width="150px" height="14px" delay={560} />
                <Skeleton width="200px" height="10px" delay={600} />
              </div>
            </div>
            <Skeleton width="130px" height="12px" delay={640} />
            <Skeleton height="46px" radius="12px" delay={680} />
            <Skeleton width="110px" height="12px" delay={700} />
            <Skeleton height="46px" radius="12px" delay={720} />
            <Skeleton height="50px" radius="12px" delay={740} />
          </div>
        </div>

        <!-- Historial -->
        <div class="skeleton-panel">
          <div class="sk-pills">
            <Skeleton width="80px" height="32px" radius="999px" delay={420} />
            <Skeleton width="104px" height="32px" radius="999px" delay={460} />
            <Skeleton width="98px" height="32px" radius="999px" delay={500} />
            <Skeleton width="112px" height="32px" radius="999px" delay={540} />
          </div>
          {#each [0, 1, 2, 3] as i}
            <div class="sk-tx-row">
              <Skeleton width="42px" height="42px" radius="12px" delay={560 + i * 80} />
              <div class="sk-col">
                <Skeleton width="55%" height="13px" delay={600 + i * 80} />
                <Skeleton width="35%" height="10px" delay={640 + i * 80} />
              </div>
              <Skeleton width="70px" height="18px" delay={680 + i * 80} />
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
  <!-- 1. BANNER SUPERIOR DE WALLET -->
  <div class="wallet-banner page-enter">
    <div class="banner-top">
      <div class="banner-status-wrap">
        <span class="status-badge" class:connected={$wallet.connected}>
          {#if $wallet.connected}
            <i class="ri-checkbox-circle-fill"></i> Conectado
          {:else}
            <i class="ri-close-circle-line"></i> Sin conexión
          {/if}
        </span>
        {#if $wallet.network}
          <span class="network-badge">
            <i class="ri-global-line"></i> {$wallet.network.name} ({$wallet.symbol})
          </span>
        {/if}
      </div>

      {#if $wallet.connected}
        <button class="danger-btn" onclick={onDisconnect}>
          <i class="ri-logout-box-r-line"></i> Desconectar
        </button>
      {/if}
    </div>

    <div class="banner-body">
      <div class="banner-address-info">
        <span class="banner-label">Dirección pública</span>
        <div class="banner-address-row">
          <span class="address-text">
            {$wallet.address ? short($wallet.address) : 'Conecta tu wallet para operar'}
          </span>
          {#if $wallet.address}
            <button class="copy-btn" onclick={copyAddress}>
              {#if copied}
                <i class="ri-check-line"></i> Copiado
              {:else}
                <i class="ri-file-copy-line"></i> Copiar
              {/if}
            </button>
          {/if}
        </div>
        <div class="banner-specs">
          <span><i class="ri-shield-keyhole-line"></i> No custodial</span>
          <span><i class="ri-swap-line"></i> Red activa: {$wallet.network?.name || $selectedNetwork.name}</span>
        </div>
      </div>

      <div class="banner-balance-info">
        <span class="banner-label">Saldo disponible</span>
        <div class="banner-balance-amount">
          {$wallet.balance ? Number($wallet.balance).toFixed(5) : '0.00000'}
          <small>{$wallet.symbol || $selectedNetwork.symbol}</small>
        </div>
      </div>
    </div>
  </div>

  <!-- 2. DOS COLUMNAS DE MISMA ALTURA: ENVÍO A LA IZQUIERDA E HISTORIAL SCROLLEABLE A LA DERECHA -->
  <div class="row-two-grid page-enter page-enter-late">
    <div class="panel send-panel">
      <div class="panel-head">
        <div>
          <h3>Enviar cuenta a cuenta</h3>
          <span class="muted">Transferencias aseguradas en tiempo real</span>
        </div>
        <span class="badge-type">
          <i class={$selectedNetwork.type === 'evm' ? 'ri-swap-box-line' : 'ri-bit-coin-line'}></i>
          {$selectedNetwork.type.toUpperCase()}
        </span>
      </div>
      <TransactionForm />
    </div>

    <div class="history-column">
      <TransactionHistory />
    </div>
  </div>
  {/if}
</main>

<style>
  .container {
    width: 100%;
    margin: 0;
    padding: 125px 150px 80px;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }

  /* Botón conectar wallet (movido desde la barra de navegación) */
  .connect-header-btn {
    border: 0;
    border-radius: 999px;
    padding: 11px 22px;
    background: linear-gradient(135deg, #4df2ff 0%, #a855f7 100%);
    color: #061220;
    font-weight: 700;
    font-size: 0.92rem;
    box-shadow: 0 6px 22px rgba(77, 242, 255, 0.25), 0 0 18px rgba(168, 85, 247, 0.18);
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
    flex: none;
  }

  .connect-header-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(168, 85, 247, 0.4), 0 0 15px rgba(77, 242, 255, 0.4);
    filter: brightness(1.08);
  }

  .eyebrow {
    color: #6fd8ea;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.75rem;
    font-weight: 700;
  }

  h2, h3 {
    font-family: var(--font-heading);
    letter-spacing: -0.04em;
  }

  h2 {
    font-size: clamp(2rem, 4vw, 3.2rem);
    margin: 0;
  }

  h3 {
    margin: 0 0 4px;
    color: #fff;
  }

  /* 1. WALLET BANNER */
  .wallet-banner {
    background: linear-gradient(135deg, rgba(16, 24, 51, 0.95) 0%, rgba(12, 18, 40, 0.95) 60%, rgba(13, 29, 50, 0.95) 100%);
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 24px;
    padding: 28px 36px;
    box-shadow: 0 16px 40px rgba(4, 8, 20, 0.5), 0 0 24px rgba(77, 242, 255, 0.08);
    margin-bottom: 32px;
  }

  .banner-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(148, 170, 255, 0.12);
    margin-bottom: 22px;
  }

  .banner-status-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
    background: rgba(255, 100, 100, 0.12);
    color: #ff9797;
    border: 1px solid rgba(255, 100, 100, 0.25);
  }

  .status-badge.connected {
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border: 1px solid rgba(77, 242, 255, 0.3);
  }

  .network-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 600;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    border: 1px solid rgba(168, 85, 247, 0.28);
  }

  .danger-btn {
    background: rgba(112, 65, 68, 0.3);
    border: 1px solid rgba(255, 151, 151, 0.35);
    color: #ffb9b9;
    padding: 9px 18px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.25s ease;
  }

  .danger-btn:hover {
    background: rgba(180, 50, 60, 0.6);
    color: #fff;
    border-color: #ff6e6e;
  }

  .banner-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 32px;
    flex-wrap: wrap;
  }

  .banner-label {
    display: block;
    color: #8ca69a;
    font-size: 0.85rem;
    margin-bottom: 6px;
  }

  .banner-address-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .address-text {
    color: var(--accent-lime);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: clamp(1.1rem, 2.5vw, 1.4rem);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .copy-btn {
    border: 1px solid rgba(77, 242, 255, 0.3);
    color: #cde9ca;
    background: rgba(77, 242, 255, 0.08);
    border-radius: 10px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;
  }

  .copy-btn:hover {
    background: rgba(77, 242, 255, 0.2);
    color: #fff;
    border-color: var(--accent-lime);
  }

  .banner-specs {
    display: flex;
    gap: 16px;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .banner-specs span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .banner-balance-info {
    text-align: right;
  }

  .banner-balance-amount {
    font-size: clamp(2.3rem, 5vw, 3.8rem);
    font-family: var(--font-heading);
    font-weight: 700;
    color: #ffffff;
    line-height: 1;
  }

  .banner-balance-amount small {
    color: #6fd8ea;
    font-size: 1.1rem;
    margin-left: 4px;
  }

  /* 2. GRID 2 COLUMNAS (ENVÍO E HISTORIAL DE MISMA ALTURA) */
  .row-two-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    align-items: stretch;
  }

  .panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 28px;
  }

  .send-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .history-column {
    height: 100%;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
  }

  .badge-type {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    font-size: 0.78rem;
    font-weight: 700;
    border: 1px solid rgba(77, 242, 255, 0.25);
  }

  .muted {
    color: #8ca69a;
    font-size: 0.88rem;
  }

  /* SKELETON DE CARGA */
  .skeleton-page {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .skeleton-banner {
    background: linear-gradient(135deg, rgba(16, 24, 51, 0.95) 0%, rgba(12, 18, 40, 0.95) 60%, rgba(13, 29, 50, 0.95) 100%);
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 24px;
    padding: 28px 36px;
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    align-items: stretch;
  }

  .skeleton-panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sk-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .sk-pills {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .sk-divider {
    height: 1px;
    background: rgba(148, 170, 255, 0.12);
    margin: 22px 0;
  }

  .sk-banner-body {
    display: flex;
    justify-content: space-between;
    gap: 32px;
  }

  .sk-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .sk-col-end {
    align-items: flex-end;
  }

  .sk-inline {
    display: flex;
    gap: 14px;
  }

  .sk-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .sk-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .sk-trigger {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid rgba(148, 170, 255, 0.25);
    border-radius: 12px;
    background: #0b142c;
  }

  .sk-tx-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(148, 170, 255, 0.08);
  }

  .sk-tx-row:last-child {
    border-bottom: 0;
  }

  /* Transición de entrada del contenido real tras el skeleton.
     `backwards` (no `both`): retener el transform final rompería el posicionamiento
     de los elementos position: fixed descendientes (p. ej. el modal de transacciones) */
  .page-enter {
    animation: pageFadeIn 0.5s ease backwards;
  }

  .page-enter-late {
    animation-delay: 90ms;
  }

  @keyframes pageFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 900px) {
    .container {
      padding: 100px 20px 60px;
    }
    .banner-body {
      flex-direction: column;
      align-items: flex-start;
    }
    .banner-balance-info {
      text-align: left;
    }
    .row-two-grid,
    .skeleton-grid {
      grid-template-columns: 1fr;
    }
    .sk-banner-body {
      flex-direction: column;
    }
    .sk-col-end {
      align-items: flex-start;
    }
  }
</style>
