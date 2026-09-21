<script>
  import { onMount } from 'svelte';
  import NetworkSwitcher from '../lib/components/network/NetworkSwitcher.svelte';
  import Skeleton from '../lib/components/common/Skeleton.svelte';
  import { NETWORKS, EVM_NETWORKS, UTXO_NETWORKS } from '../lib/config/networks.js';
  import { getBalance } from '../lib/services/evmWallet.js';
  import { getUtxoBalance } from '../lib/services/utxoWallet.js';
  import { wallet } from '../lib/stores/wallet.js';
  import { selectedNetwork } from '../lib/stores/network.js';

  let externalAddress = '';
  let externalBalance = '';
  let massResults = [];
  let queryError = '';
  let querying = false;
  let queryMode = 'single'; // 'single' (primera opción por defecto) | 'multi'
  let activeTab = 'evm'; // 'evm' | 'utxo'
  let loading = true;

  onMount(() => {
    // Simula la carga de datos (redes, proveedores y saldos) al entrar a la sección
    const timer = setTimeout(() => (loading = false), 1000);
    return () => clearTimeout(timer);
  });

  function handleTabChange(tab) {
    activeTab = tab;
    // Si cambia de tab mientras está en consulta multi-red, refrescar resultados filtrados por tab
    if (queryMode === 'multi' && (externalAddress || $wallet.address)) {
      queryMassive();
    }
  }

  async function queryExternal() {
    queryError = '';
    externalBalance = '';
    if (!externalAddress) return (queryError = 'Escribe una dirección pública para consultar.');
    try {
      if ($selectedNetwork.type === 'evm') {
        externalBalance = await getBalance(externalAddress, $selectedNetwork);
      } else {
        externalBalance = await getUtxoBalance(externalAddress, $selectedNetwork);
      }
    } catch (e) {
      queryError = e?.shortMessage || e?.message || 'No se pudo consultar el saldo.';
    }
  }

  async function queryMassive() {
    queryError = '';
    massResults = [];
    const address = externalAddress || $wallet.address;
    if (!address) return (queryError = 'Conecta tu wallet o escribe una dirección en el campo.');
    
    // Filtrar únicamente las redes que pertenecen al tipo de proveedor actualmente seleccionado (EVM o UTXO)
    const targetNetworks = activeTab === 'utxo' ? UTXO_NETWORKS : EVM_NETWORKS;
    
    querying = true;
    massResults = await Promise.all(
      targetNetworks.map(async (network) => {
        try {
          const balance =
            network.type === 'evm'
              ? await getBalance(address, network)
              : await getUtxoBalance(address, network);
          return { ...network, balance, error: false };
        } catch (e) {
          return { ...network, balance: e?.message || 'No disponible', error: true };
        }
      })
    );
    querying = false;
  }
</script>

<main class="container">
  <!-- 1. ENCABEZADO Y BANNER (MATCHING IMAGE 4) -->
  <div class="header-section">
    <div class="eyebrow-badge">
      <i class="ri-global-line"></i> GESTOR MULTICADENA
    </div>
    <h1 class="main-title">Gestión de Redes y Proveedores</h1>
    <p class="section-desc">
      Conmuta dinámicamente entre redes UTXO (PaliWallet) y EVM (MetaMask / Web3). El sistema gestiona la configuración de RPCs, Chain IDs y lectura de saldos en tiempo real.
    </p>

    <div class="cream-info-banner">
      <span class="bullet">•</span>
      <span>Inicia sesión con tu wallet para visualizar la red activa y consultar el saldo en tiempo real.</span>
    </div>
  </div>

  {#if loading}
    <!-- SKELETON DE CARGA: Redes (misma estructura que los bloques reales) -->
    <div class="skeleton-page" aria-busy="true">
      <!-- Conmutador de redes: tabs + tarjetas de red (igual que NetworkSwitcher) -->
      <div class="skeleton-panel sk-switcher-panel">
        <div class="sk-tab-bar">
          <Skeleton width="330px" height="42px" radius="12px" />
          <Skeleton width="344px" height="42px" radius="12px" delay={100} />
        </div>
        <div class="sk-cards">
          {#each Array.from({ length: EVM_NETWORKS.length }) as _, i}
            <div class="sk-net-card">
              <div class="sk-card-header">
                <Skeleton width="34px" height="22px" radius="6px" delay={180 + i * 40} />
                <div class="sk-net-info">
                  <Skeleton width="55%" height="16px" delay={210 + i * 40} />
                  <Skeleton width="45%" height="11px" delay={240 + i * 40} />
                </div>
                <Skeleton width="48px" height="22px" radius="8px" delay={270 + i * 40} />
              </div>
              <div class="sk-card-footer">
                <Skeleton width="150px" height="14px" delay={300 + i * 40} />
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Consulta de saldo -->
      <div class="skeleton-panel">
        <div class="sk-head-row">
          <div class="sk-col">
            <Skeleton width="230px" height="18px" delay={420} />
            <Skeleton width="320px" height="12px" delay={460} />
          </div>
          <div class="sk-toggle">
            <Skeleton width="150px" height="36px" radius="999px" delay={500} />
            <Skeleton width="190px" height="36px" radius="999px" delay={540} />
          </div>
        </div>
        <div class="sk-divider"></div>
        <div class="sk-fields">
          <Skeleton width="190px" height="12px" delay={580} />
          <Skeleton height="46px" radius="12px" delay={620} />
          <div class="sk-selected-banner">
            <div class="sk-col">
              <Skeleton width="170px" height="10px" delay={660} />
              <Skeleton width="200px" height="16px" delay={700} />
            </div>
            <Skeleton width="48px" height="22px" radius="999px" delay={740} />
          </div>
          <Skeleton height="46px" radius="12px" delay={780} />
        </div>
      </div>

      <!-- Proveedores -->
      <div class="skeleton-panel">
        <div class="sk-head-row">
          <div class="sk-col">
            <Skeleton width="330px" height="18px" delay={700} />
            <Skeleton width="360px" height="12px" delay={740} />
          </div>
        </div>
        <div class="sk-cards sk-cards-auto">
          {#each [0, 1, 2] as i}
            <div class="sk-provider-card">
              <div class="sk-card-header">
                <Skeleton width="38px" height="38px" radius="10px" delay={780 + i * 30} />
                <Skeleton width="60%" height="15px" delay={810 + i * 30} />
              </div>
              <Skeleton height="10px" delay={840 + i * 30} />
              <Skeleton width="85%" height="10px" delay={870 + i * 30} />
              <Skeleton width="60%" height="10px" delay={900 + i * 30} />
              <div class="sk-tags">
                <Skeleton width="92px" height="22px" radius="6px" delay={930 + i * 30} />
                <Skeleton width="72px" height="22px" radius="6px" delay={950 + i * 30} />
                <Skeleton width="80px" height="22px" radius="6px" delay={970 + i * 30} />
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
  <!-- 2. CONMUTADOR DE REDES INTERACTIVO (TARJETAS OSCURAS DEL SISTEMA) -->
  <section class="section-block page-enter">
    <NetworkSwitcher {activeTab} onTabChange={handleTabChange} />
  </section>

  <!-- 3. CONSULTA DE SALDO POR ADDRESS -->
  <section class="section-block page-enter page-enter-late">
    <div class="panel query-section-panel">
      <div class="panel-head query-head">
        <div>
          <h3><i class="ri-search-eye-line"></i> Consultar saldo por address</h3>
          <p class="muted">Sin iniciar sesión, utilizando RPC público de solo lectura o consulta por proveedor.</p>
        </div>

        <!-- TOGGLE DE MODO: 1. Consulta por Red (Primero), 2. Consulta Multi-Red (Segundo) -->
        <div class="query-mode-toggle" role="tablist">
          <button
            class:active={queryMode === 'single'}
            onclick={() => (queryMode = 'single')}
            role="tab"
          >
            <i class="ri-search-line"></i> Consulta por Red
          </button>
          <button
            class:active={queryMode === 'multi'}
            onclick={() => { queryMode = 'multi'; queryMassive(); }}
            role="tab"
          >
            <i class="ri-global-line"></i> Consulta Multi-Red ({activeTab.toUpperCase()})
          </button>
        </div>
      </div>

      <div class="query-body">
        <div class="input-group">
          <label for="external">Dirección o Address a consultar</label>
          <div class="input-with-icon">
            <i class="ri-wallet-3-line input-icon"></i>
            <input id="external" bind:value={externalAddress} placeholder={$wallet.address || '0x… o sys1…'} />
          </div>
        </div>

        {#if queryMode === 'single'}
          <!-- Se eliminó el listado/select de redes. La red se elige seleccionando las tarjetas superiores -->
          <div class="selected-net-banner">
            <div class="selected-net-info">
              <span class="label-tiny">Red seleccionada en las tarjetas:</span>
              <strong class="net-name-highlight">
                {$selectedNetwork.icon || '🌐'} {$selectedNetwork.name} ({$selectedNetwork.symbol})
              </strong>
            </div>
            <span class="type-badge-mini" class:evm={$selectedNetwork.type === 'evm'}>
              {$selectedNetwork.type.toUpperCase()}
            </span>
          </div>

          <button class="primary-btn query-btn" onclick={queryExternal}>
            <i class="ri-search-2-line"></i> Consultar Saldo en {$selectedNetwork.name}
          </button>

          {#if externalBalance}
            <div class="feedback success">
              <i class="ri-checkbox-circle-line"></i>
              Saldo encontrado: <strong>{Number(externalBalance).toFixed(6)} {$selectedNetwork.symbol}</strong> en {$selectedNetwork.name}
            </div>
          {/if}
        {:else}
          <!-- Consulta Multi-Red filtrada por el proveedor/tab activo -->
          <button class="primary-btn query-btn" onclick={queryMassive} disabled={querying}>
            {#if querying}
              <i class="ri-loader-4-line spin"></i> Consultando redes {activeTab.toUpperCase()}...
            {:else}
              <i class="ri-global-line"></i> Consultar en redes {activeTab.toUpperCase()} ({activeTab === 'utxo' ? UTXO_NETWORKS.length : EVM_NETWORKS.length})
            {/if}
          </button>

          {#if massResults.length}
            <div class="table-wrap">
              <table class="balance-table">
                <thead>
                  <tr>
                    <th>Red</th>
                    <th>Tipo</th>
                    <th>Símbolo</th>
                    <th>Saldo Actual / Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {#each massResults as result}
                    <tr>
                      <td><strong>{result.name}</strong></td>
                      <td><span class="type-pill" class:evm={result.type === 'evm'}>{result.type.toUpperCase()}</span></td>
                      <td>{result.symbol}</td>
                      <td class="balance-cell" class:balance-error={result.error}>
                        {result.balance}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if !querying}
            <div class="empty">
              <i class="ri-information-line"></i> Escribe una dirección arriba y pulsa "Consultar en redes {activeTab.toUpperCase()}".
            </div>
          {/if}
        {/if}

        {#if queryError}
          <div class="feedback error"><i class="ri-error-warning-line"></i> {queryError}</div>
        {/if}
      </div>
    </div>
  </section>

  <!-- 4. DESCRIPCIÓN DE PROVEEDORES DE INFRAESTRUCTURA -->
  <section class="section-block page-enter page-enter-later">
    <div class="panel providers-panel">
      <div class="panel-head">
        <div>
          <h3><i class="ri-server-line"></i> Arquitectura de Proveedores de Redes y RPCs</h3>
          <p class="muted">Explicación técnica de los proveedores de infraestructura blockchain integrados.</p>
        </div>
      </div>

      <div class="providers-grid">
        <div class="provider-card">
          <div class="provider-header">
            <i class="ri-cpu-line provider-icon"></i>
            <h4>Nodos RPC Públicos (EVM)</h4>
          </div>
          <p>
            Proveedores como <strong>PublicNode, dRPC, Ankr y EthPandaOps</strong> procesan solicitudes JSON-RPC bajo los estándares EIP-1193. Permiten consultar saldos y enviar transacciones on-chain.
          </p>
          <div class="provider-tags">
            <span>eth_getBalance</span>
            <span>EIP-1193</span>
            <span>JSON-RPC</span>
          </div>
        </div>

        <div class="provider-card">
          <div class="provider-header">
            <i class="ri-database-2-line provider-icon"></i>
            <h4>Indexadores Blockbook (UTXO)</h4>
          </div>
          <p>
            Infraestructura de indexación como <strong>Trezor y Syscoin Blockbook</strong>. Indexan cada bloque de Bitcoin y Syscoin para responder rápidamente por las salidas de transacciones no gastadas (UTXOs).
          </p>
          <div class="provider-tags">
            <span>/api/v2/address</span>
            <span>Formatos Bech32</span>
            <span>Mempool UTXO</span>
          </div>
        </div>

        <div class="provider-card">
          <div class="provider-header">
            <i class="ri-shield-flash-line provider-icon"></i>
            <h4>Redundancia y Fallback System</h4>
          </div>
          <p>
            Capa de failover automático en <code>evmWallet.js</code>. Si el nodo primario no responde, el cliente conmuta automáticamente a los RPCs de respaldo configurados sin interrumpir la app.
          </p>
          <div class="provider-tags">
            <span>Zero-Downtime</span>
            <span>Auto-Failover</span>
            <span>Multi-Endpoint</span>
          </div>
        </div>
      </div>
    </div>
  </section>
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

  /* HEADER SECTION MATCHING IMAGE 4 */
  .header-section {
    margin-bottom: 32px;
  }

  .eyebrow-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    border: 1px solid rgba(168, 85, 247, 0.28);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }

  .main-title {
    font-family: var(--font-heading);
    letter-spacing: -0.04em;
    font-size: clamp(2.2rem, 4.5vw, 3.4rem);
    margin: 0 0 12px;
    color: #fff;
    font-weight: 700;
  }

  .section-desc {
    color: #a6bbb1;
    font-size: 1.05rem;
    line-height: 1.6;
    max-width: 850px;
    margin: 0 0 20px;
  }

  /* DARK SYSTEM INFO BANNER */
  .cream-info-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, rgba(16, 24, 51, 0.95) 0%, rgba(12, 18, 40, 0.95) 100%);
    color: #e2f9ff;
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 14px;
    padding: 14px 20px;
    font-size: 0.92rem;
    font-weight: 500;
    max-width: 900px;
    box-shadow: 0 8px 24px rgba(4, 8, 20, 0.4);
  }

  .bullet {
    color: var(--accent-lime);
    font-size: 1.2rem;
  }

  .section-block {
    margin-bottom: 36px;
  }

  .panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 28px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }

  h3 {
    margin: 0 0 4px;
    font-family: var(--font-heading);
    color: #fff;
    font-size: 1.2rem;
  }

  .muted {
    color: #8ca69a;
    font-size: 0.88rem;
  }

  /* QUERY PANEL */
  .query-head {
    border-bottom: 1px solid rgba(148, 170, 255, 0.12);
    padding-bottom: 18px;
  }

  .query-mode-toggle {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    background: rgba(11, 18, 38, 0.85);
    border: 1px solid rgba(148, 170, 255, 0.2);
    border-radius: 999px;
  }

  .query-mode-toggle button {
    border: 0;
    background: transparent;
    color: #a6bbb1;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.25s ease;
  }

  .query-mode-toggle button:hover {
    color: #fff;
  }

  .query-mode-toggle button.active {
    background: linear-gradient(135deg, #4df2ff 0%, #38bdf8 100%);
    color: #091326;
    font-weight: 700;
    box-shadow: 0 4px 16px rgba(77, 242, 255, 0.3);
  }

  .query-body {
    margin-top: 20px;
    display: grid;
    gap: 16px;
  }

  .input-group label {
    display: block;
    color: #c4d7ca;
    font-size: 0.85rem;
    margin-bottom: 8px;
  }

  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 14px;
    color: #6fd8ea;
    font-size: 1.1rem;
    pointer-events: none;
  }

  .input-with-icon input {
    padding-left: 42px;
  }

  input {
    width: 100%;
    background: #0b1226;
    color: #effff2;
    border: 1px solid #33406e;
    border-radius: 12px;
    padding: 13px 14px;
    outline: none;
    font-size: 0.95rem;
    transition: border-color 0.2s ease;
  }

  input::placeholder {
    color: #76918d;
  }

  input:focus {
    border-color: var(--accent-lime);
  }

  .selected-net-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0b1226;
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 12px;
    padding: 12px 18px;
  }

  .selected-net-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .label-tiny {
    font-size: 0.75rem;
    color: #8ca69a;
    text-transform: uppercase;
  }

  .net-name-highlight {
    color: var(--accent-lime);
    font-size: 1.05rem;
  }

  .type-badge-mini {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    border: 1px solid rgba(168, 85, 247, 0.28);
  }

  .type-badge-mini.evm {
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border-color: rgba(77, 242, 255, 0.25);
  }

  .primary-btn {
    border: 0;
    border-radius: 12px;
    padding: 13px 22px;
    background: var(--accent-lime);
    color: #0a2430;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(77, 242, 255, 0.15);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s ease;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(77, 242, 255, 0.28);
  }

  .feedback {
    padding: 14px 18px;
    border-radius: 12px;
    background: rgba(77, 242, 255, 0.1);
    border: 1px solid rgba(77, 242, 255, 0.25);
    color: #e2f9ff;
    font-size: 0.92rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .feedback.error {
    background: rgba(89, 38, 42, 0.8);
    color: #ffd1d1;
    border: 1px solid rgba(255, 151, 151, 0.3);
  }

  .table-wrap {
    overflow: auto;
    margin-top: 8px;
    border: 1px solid #232c52;
    border-radius: 14px;
  }

  .balance-table {
    width: 100%;
    border-collapse: collapse;
  }

  .balance-table th, .balance-table td {
    text-align: left;
    padding: 14px 16px;
    border-bottom: 1px solid #1e2748;
  }

  .balance-table th {
    color: #8ca69a;
    font-size: 0.82rem;
    text-transform: uppercase;
    background: #090f20;
  }

  .type-pill {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
  }

  .type-pill.evm {
    background: rgba(148, 170, 255, 0.12);
    color: #a8baff;
  }

  .balance-cell {
    color: var(--accent-lime);
    font-family: ui-monospace, monospace;
    font-weight: 700;
  }

  .balance-cell.balance-error {
    color: #8ba89b;
    font-size: 0.85rem;
    font-weight: 400;
    font-family: inherit;
  }

  .empty {
    border: 1px dashed #315b4b;
    border-radius: 14px;
    padding: 24px;
    color: #8ca69a;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  /* PROVIDERS ARCHITECTURE SECTION */
  .providers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 10px;
  }

  .provider-card {
    background: rgba(11, 18, 38, 0.7);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 16px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
  }

  .provider-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .provider-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    flex: none;
  }

  .provider-header h4 {
    margin: 0;
    font-size: 1.05rem;
    color: #fff;
    font-family: var(--font-heading);
  }

  .provider-card p {
    margin: 0;
    font-size: 0.88rem;
    color: #a6bbb1;
    line-height: 1.6;
  }

  .provider-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .provider-tags span {
    font-size: 0.72rem;
    font-family: ui-monospace, monospace;
    background: rgba(77, 242, 255, 0.08);
    color: #6fd8ea;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(77, 242, 255, 0.2);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* SKELETON DE CARGA (espejo de la estructura real de cada bloque) */
  .skeleton-page {
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .skeleton-panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* El conmutador real no lleva panel: tabs y tarjetas directas sobre el fondo */
  .sk-switcher-panel {
    background: transparent;
    border: 0;
    padding: 0;
    gap: 22px;
  }

  /* Tab bar: igual que .tab-bar del conmutador */
  .sk-tab-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* Grid de tarjetas de red: igual que .cards-grid (3 columnas) */
  .sk-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  /* Grid de proveedores: igual que .providers-grid */
  .sk-cards-auto {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    margin-top: 10px;
  }

  /* Tarjeta de red: igual que .net-card */
  .sk-net-card {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 18px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
  }

  /* Cabecera de tarjeta: igual que .card-header */
  .sk-card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .sk-net-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-top: 3px;
  }

  /* Pie de tarjeta: igual que .card-footer */
  .sk-card-footer {
    display: flex;
    align-items: center;
    border-top: 1px solid rgba(148, 170, 255, 0.1);
    padding-top: 14px;
  }

  /* Tarjeta de proveedor: igual que .provider-card */
  .sk-provider-card {
    background: rgba(11, 18, 38, 0.7);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 16px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
  }

  .sk-head-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .sk-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  /* Toggle de modo: igual que .query-mode-toggle */
  .sk-toggle {
    display: flex;
    gap: 4px;
    padding: 3px;
    background: rgba(11, 18, 38, 0.85);
    border: 1px solid rgba(148, 170, 255, 0.2);
    border-radius: 999px;
  }

  .sk-divider {
    height: 1px;
    background: rgba(148, 170, 255, 0.12);
  }

  .sk-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Banner de red seleccionada: igual que .selected-net-banner */
  .sk-selected-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0b1226;
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 12px;
    padding: 12px 18px;
  }

  .sk-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  @media (max-width: 1024px) {
    .sk-cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 650px) {
    .sk-cards {
      grid-template-columns: 1fr;
    }
  }

  /* Transición de entrada del contenido real tras el skeleton.
     `backwards` (no `both`): retener el transform final rompería el posicionamiento
     de los elementos position: fixed descendientes */
  .page-enter {
    animation: pageFadeIn 0.5s ease backwards;
  }

  .page-enter-late {
    animation-delay: 90ms;
  }

  .page-enter-later {
    animation-delay: 180ms;
  }

  @keyframes pageFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 800px) {
    .container {
      padding: 90px 20px 60px;
    }
  }
</style>
