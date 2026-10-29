<script>
  import FinanceLoading from '../lib/components/common/FinanceLoading.svelte';
  import { wallet } from '../lib/stores/wallet.js';
  import { selectedNetwork } from '../lib/stores/network.js';
  import WalletNetworkSelect from '../lib/components/network/WalletNetworkSelect.svelte';
  import TransactionForm from '../lib/components/transactions/TransactionForm.svelte';
  import TransactionHistory from '../lib/components/transactions/TransactionHistory.svelte';

  export let onDisconnect = () => {};
  export let onConnect = () => {};

  let copied = false;
  let copyError = '';
  let sending = false;
  let switching = false;
  const short = (address) => address ? `${address.slice(0, 10)}…${address.slice(-8)}` : 'Conecta tu wallet para operar';

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText($wallet.address);
      copied = true;
      copyError = '';
      setTimeout(() => copied = false, 1600);
    } catch { copyError = 'No se pudo copiar. Selecciona la dirección y cópiala manualmente.'; }
  }
</script>

<main class="container" aria-label="Billetera">
  <div class="dashboard-header">
    <h2>Mi Billetera</h2>
    {#if !$wallet.connected}<button class="connect-btn" onclick={onConnect}>Iniciar sesión</button>{/if}
  </div>

  <FinanceLoading variant="wallet" connected={$wallet.connected}>
  <!-- Se conserva el banner original en dos filas, con espaciado y tipografía menores. -->
  <div class="wallet-banner">
    <div class="banner-top">
      <div class="banner-badges">
        <span class="status-badge" class:connected={$wallet.connected}><i class={$wallet.connected ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'} aria-hidden="true"></i> {$wallet.connected ? 'Conectado' : 'Sin conexión'}</span>
        <span class="network-badge"><i class="ri-global-line" aria-hidden="true"></i> {$selectedNetwork.name} ({$wallet.symbol || $selectedNetwork.symbol})</span>
      </div>
      {#if $wallet.connected}<button class="disconnect-btn" onclick={onDisconnect}><i class="ri-logout-box-r-line" aria-hidden="true"></i> Desconectar</button>{/if}
    </div>
    <div class="banner-body">
      <div class="address-info"><span class="banner-label">Dirección pública</span><div class="address-row"><span class="address-text" title={$wallet.address}>{short($wallet.address)}</span>{#if $wallet.address}<button class="copy-btn" onclick={copyAddress} aria-label="Copiar dirección pública"><i class={copied ? 'ri-check-line' : 'ri-file-copy-line'} aria-hidden="true"></i> {copied ? 'Copiado' : 'Copiar'}</button>{/if}</div><div class="banner-specs"><span><i class="ri-shield-keyhole-line" aria-hidden="true"></i> No custodial</span><span>Red activa: {$selectedNetwork.name}</span></div></div>
      <div class="balance-info"><span class="banner-label">Saldo disponible</span><strong class="balance">{Number($wallet.balance || 0).toLocaleString('es-PE', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} <small>{$wallet.symbol || $selectedNetwork.symbol}</small></strong></div>
    </div>
  </div>
  {#if copyError}<p class="copy-error" role="alert">{copyError}</p>{/if}

  <!-- Redes y envío forman la columna izquierda; el historial abarca ambas filas. -->
  <div class="wallet-workspace">
    <div class="workspace-panel network-panel" aria-label="Seleccionar red">
      <h3>Seleccionar red</h3>
      <WalletNetworkSelect compact disabled={sending} onSwitchingChange={(value) => switching = value} />
    </div>
    <div class="workspace-panel send-panel" aria-label="Enviar cuenta a cuenta">
      <div class="transfer-header"><span class="transfer-icon" aria-hidden="true"><i class="ri-send-plane-line"></i></span><div><h3>Enviar cuenta a cuenta</h3><p>Envía saldo directamente a otra wallet.</p></div></div>
      <TransactionForm compact {switching} onTransactionChange={(value) => sending = value.sending} />
    </div>
    <div class="workspace-panel history-panel">
      <TransactionHistory compact />
    </div>
  </div>
  </FinanceLoading>
</main>

<style>
  .network-panel{position:relative;z-index:3}.transfer-header{display:flex;align-items:center;gap:12px;flex:none;border-bottom:1px solid var(--border-panel);padding-bottom:16px;margin-bottom:16px}.transfer-icon{display:grid;place-items:center;width:40px;height:40px;flex:none;border:1px solid var(--border-input);border-radius:12px;color:var(--accent-primary);background:var(--bg-card);font-size:1.3rem}.transfer-header h3{margin:0;min-height:0}.transfer-header p{font-size:.78rem;color:var(--text-secondary);margin:5px 0 0;line-height:1.5}
  .container{height:100dvh;padding:96px var(--workspace-gutter) 24px;display:flex;flex-direction:column;gap:16px;min-height:0;position:relative;z-index:2}
  .dashboard-header{display:flex;align-items:center;gap:12px;justify-content:space-between;flex:none;min-height:38px}h2,h3{font-family:var(--font-heading);letter-spacing:-.035em;margin:0}h2{font-size:clamp(1.5rem,2.5vw,2rem)}h3{font-size:1rem;margin-bottom:12px;flex:none;min-height:28px;display:flex;align-items:center}
  button{font:600 .78rem var(--font-sans);cursor:pointer;border-radius:10px;padding:8px 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px}button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}.connect-btn{background:var(--accent-primary);color:var(--bg-page);border:0}.disconnect-btn{background:rgba(112,65,68,.3);border:1px solid rgba(255,151,151,.35);color:#ffb9b9}.disconnect-btn:hover{border-color:var(--text-error)}.status-badge{font-size:.7rem;border:1px solid var(--border-input);color:var(--text-secondary);border-radius:999px;padding:4px 10px}.status-badge.connected{color:var(--accent-primary);border-color:var(--accent-primary)}
  .wallet-banner{flex:none;background:var(--surface-panel);border:1px solid rgba(77,242,255,.25);border-radius:var(--radius-panel);padding:16px 20px}.banner-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid var(--border-panel)}.banner-badges{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.status-badge,.network-badge{display:inline-flex;align-items:center;gap:6px}.network-badge{font-size:.7rem;border:1px solid rgba(168,85,247,.28);background:rgba(168,85,247,.14);color:#c4b0ff;border-radius:999px;padding:4px 10px}.banner-body{display:flex;justify-content:space-between;align-items:center;gap:24px}.banner-label{display:block;font-size:.73rem;color:var(--text-secondary);margin-bottom:6px}.address-info{min-width:0}.address-row{display:flex;gap:10px;align-items:center}.address-text{font-size:.95rem;color:var(--accent-primary);overflow-wrap:anywhere;min-width:0;font-weight:600}.copy-btn{background:var(--surface-input);border:1px solid var(--border-input);color:var(--text-primary);padding:5px 10px;flex:none}.copy-btn:hover{border-color:var(--accent-primary)}.banner-specs{display:flex;flex-wrap:wrap;gap:12px;font-size:.7rem;color:var(--text-secondary);margin-top:8px}.balance-info{text-align:right}.balance{font:700 clamp(1.5rem,2.5vw,2.25rem) var(--font-heading);white-space:nowrap}.balance small{font:600 .8rem var(--font-sans);color:var(--accent-primary)}.copy-error{margin:0;color:var(--text-error);font-size:.75rem}
  .wallet-workspace{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto minmax(0,1fr);gap:16px;flex:1;min-height:0}.workspace-panel{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);padding:20px;display:flex;flex-direction:column;min-width:0;min-height:0}.network-panel{grid-column:1;grid-row:1}.send-panel{grid-column:1;grid-row:2;overflow-y:auto;scrollbar-width:thin}.history-panel{grid-column:2;grid-row:1 / span 2}
  @media(min-width:1001px) and (max-height:760px){.container{padding-top:84px;padding-bottom:16px;gap:12px}.wallet-banner{padding:12px 16px}.banner-top{padding-bottom:8px;margin-bottom:8px}.workspace-panel{padding:12px 16px}.wallet-workspace{gap:12px}h3{margin-bottom:8px;min-height:24px}.balance{font-size:1.6rem}}
  @media(min-width:1001px) and (max-height:760px){.container{padding-top:82px;padding-bottom:12px;gap:10px}.dashboard-header{min-height:30px}.wallet-banner{padding:8px 14px}.banner-top{padding-bottom:6px;margin-bottom:6px}.banner-label{margin-bottom:4px}.copy-btn{padding:3px 8px}.banner-specs{margin-top:4px;font-size:.65rem}.disconnect-btn{padding:6px 10px;font-size:.7rem}.network-panel h3{min-height:20px;margin-bottom:6px}.transfer-header{padding-bottom:10px;margin-bottom:10px;gap:10px}.transfer-icon{width:32px;height:32px;font-size:1.1rem}.transfer-header h3{font-size:.92rem;min-height:0;margin:0}.transfer-header p{font-size:.7rem;margin-top:3px}.balance{font-size:1.5rem}}
  /* En móvil se apilan sin recortar campos ni ocultar controles. */
  @media(max-width:1000px){.container{height:auto;min-height:100dvh;padding:96px 20px 24px}.wallet-workspace{grid-template-columns:1fr;grid-template-rows:none;flex:none}.workspace-panel{grid-column:auto;grid-row:auto}.history-panel{height:390px}.send-panel{overflow:visible}.banner-body{gap:16px}}
  @media(max-width:520px){.container{padding-left:16px;padding-right:16px;gap:12px}.wallet-banner{padding:16px}.banner-body{align-items:flex-start;flex-direction:column}.banner-top{align-items:flex-start}.banner-badges{gap:6px}.balance-info{text-align:left}.workspace-panel{padding:16px}.disconnect-btn{font-size:.7rem;padding:8px}.address-text{font-size:.8rem}}
</style>
