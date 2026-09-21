<script>
  import { selectedNetwork } from '../../stores/network.js';
  import { wallet } from '../../stores/wallet.js';

  export let formState = { to: '', amount: '', status: '', hash: '', error: '', sending: false };

  const short = (addr) => (addr ? `${addr.slice(0, 10)}…${addr.slice(-8)}` : 'Sin definir');
</script>

<div class="panel summary-panel">
  <div class="panel-head">
    <div>
      <h3>Detalle general de la transacción</h3>
      <span class="muted">Inspección de parámetros en tiempo real</span>
    </div>
    <span class="type-badge" class:evm={$selectedNetwork.type === 'evm'}>
      <i class={$selectedNetwork.type === 'evm' ? 'ri-swap-box-line' : 'ri-bit-coin-line'}></i>
      {$selectedNetwork.type.toUpperCase()}
    </span>
  </div>

  <div class="summary-cards">
    <!-- Target Network Card -->
    <div class="card network-card">
      <div class="card-icon">{ $selectedNetwork.icon }</div>
      <div class="card-info">
        <span class="card-label">Red seleccionada</span>
        <strong class="card-title">{$selectedNetwork.name}</strong>
        <span class="card-sub">
          {$selectedNetwork.type === 'evm' ? `Chain ID ${$selectedNetwork.chainId}` : `Red ${$selectedNetwork.networkKey}`}
        </span>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="details-grid">
      <div class="detail-item">
        <span class="detail-label"><i class="ri-user-follow-line"></i> Origen (Remitente)</span>
        <span class="detail-value mono">
          {$wallet.address ? short($wallet.address) : 'Wallet no conectada'}
        </span>
      </div>

      <div class="detail-item">
        <span class="detail-label"><i class="ri-user-received-line"></i> Destino (Receptor)</span>
        <span class="detail-value mono">
          {formState.to ? short(formState.to) : 'Esperando dirección...'}
        </span>
      </div>

      <div class="detail-item">
        <span class="detail-label"><i class="ri-coins-line"></i> Monto estimado</span>
        <span class="detail-value highlight">
          {formState.amount ? formState.amount : '0.00'} {$selectedNetwork.symbol}
        </span>
      </div>

      <div class="detail-item">
        <span class="detail-label"><i class="ri-fire-line"></i> Estimación de Gas / Fee</span>
        <span class="detail-value">
          {$selectedNetwork.type === 'evm' ? '~0.00015 ETH (Est. Estándar)' : '~0.00005 SYS (Est. UTXO)'}
        </span>
      </div>
    </div>

    <!-- Security & Status Box -->
    <div class="status-box" class:sending={formState.sending} class:confirmed={formState.status === 'Confirmada'}>
      <div class="status-box-header">
        <i class={formState.sending ? 'ri-loader-4-line spin' : formState.status === 'Confirmada' ? 'ri-checkbox-circle-fill' : 'ri-shield-check-line'}></i>
        <strong>
          {#if formState.sending}
            Firmando e inyectando transacción...
          {:else if formState.status === 'Confirmada'}
            Transacción confirmada en bloque
          {:else}
            Lista para ser ejecutada on-chain
          {/if}
        </strong>
      </div>
      <p class="status-box-desc">
        {$selectedNetwork.type === 'evm'
          ? 'Las transacciones EVM requieren aprobación en Pali/MetaMask mediante el estándar EIP-1193.'
          : 'Red UTXO activa. Las transacciones se difunden a la mempool de Syscoin/Bitcoin.'}
      </p>
    </div>
  </div>
</div>

<style>
  .panel {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 22px;
    padding: 28px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  h3 {
    margin: 0 0 4px;
    font-family: var(--font-heading);
    font-size: 1.15rem;
    color: #fff;
  }

  .muted {
    color: #8ca69a;
    font-size: 0.85rem;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    font-size: 0.78rem;
    font-weight: 700;
    border: 1px solid rgba(168, 85, 247, 0.28);
  }

  .type-badge.evm {
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border-color: rgba(77, 242, 255, 0.25);
  }

  .summary-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    justify-content: space-between;
  }

  .network-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: rgba(11, 18, 38, 0.7);
    border: 1px solid rgba(77, 242, 255, 0.2);
    border-radius: 14px;
  }

  .card-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    display: grid;
    place-items: center;
    font-size: 1.3rem;
    font-weight: 700;
    flex: none;
  }

  .card-info {
    display: flex;
    flex-direction: column;
  }

  .card-label {
    font-size: 0.75rem;
    color: #8ca69a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-title {
    font-size: 1.05rem;
    color: #fff;
  }

  .card-sub {
    font-size: 0.8rem;
    color: #6fd8ea;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .detail-item {
    background: #0b1226;
    border: 1px solid #1e2748;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-size: 0.76rem;
    color: #8ca69a;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .detail-value {
    font-size: 0.9rem;
    color: #e2f9ff;
    font-weight: 600;
  }

  .detail-value.mono {
    font-family: ui-monospace, monospace;
    font-size: 0.85rem;
    color: #6fd8ea;
  }

  .detail-value.highlight {
    color: var(--accent-lime);
    font-size: 1rem;
    font-weight: 700;
  }

  .status-box {
    background: rgba(148, 170, 255, 0.06);
    border: 1px solid rgba(148, 170, 255, 0.16);
    border-radius: 14px;
    padding: 14px 16px;
  }

  .status-box.sending {
    background: rgba(77, 242, 255, 0.08);
    border-color: rgba(77, 242, 255, 0.3);
  }

  .status-box.confirmed {
    background: rgba(46, 213, 115, 0.1);
    border-color: rgba(46, 213, 115, 0.3);
  }

  .status-box-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 0.9rem;
    margin-bottom: 4px;
  }

  .status-box-header i {
    color: var(--accent-lime);
    font-size: 1.1rem;
  }

  .status-box-desc {
    margin: 0;
    font-size: 0.8rem;
    color: #8ca69a;
    line-height: 1.4;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .details-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
