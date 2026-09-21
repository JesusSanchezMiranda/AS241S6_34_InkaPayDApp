<script>
  import { getExplorerTransactionUrl } from '../../services/explorers.js';

  export let transaction = null;
  export let onClose = () => {};

  let copiedHash = false;
  let copiedFrom = false;
  let copiedTo = false;

  async function copyText(text, type) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    if (type === 'hash') { copiedHash = true; setTimeout(() => (copiedHash = false), 1600); }
    if (type === 'from') { copiedFrom = true; setTimeout(() => (copiedFrom = false), 1600); }
    if (type === 'to') { copiedTo = true; setTimeout(() => (copiedTo = false), 1600); }
  }

  function formatDate(val) {
    if (!val) return 'Desconocida';
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(new Date(val));
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  // Portal: mueve el modal al <body> para que su posicionamiento fijo y su centrado
  // sean siempre relativos al viewport, sin importar transforms de ancestros
  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if transaction}
  <div class="modal-backdrop" use:portal onclick={handleBackdropClick} role="presentation">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-header-title">
          <i class="ri-file-list-3-line modal-icon"></i>
          <h3 id="modal-title">Detalle de la Transacción</h3>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Cerrar modal">
          <i class="ri-close-line"></i>
        </button>
      </div>

      <!-- Hero Summary -->
      <div class="modal-summary-box">
        <div class="summary-icon" class:receive={transaction.type === 'receive'}>
          <i class={transaction.type === 'receive' ? 'ri-arrow-down-line' : 'ri-arrow-up-line'}></i>
        </div>

        <div class="summary-amount-col">
          <span class="type-label" class:receive={transaction.type === 'receive'}>
            {transaction.type === 'receive' ? 'TRANSACCIÓN RECIBIDA' : 'TRANSACCIÓN ENVIADA'}
          </span>
          <div class="amount-val" class:receive={transaction.type === 'receive'}>
            {transaction.type === 'receive' ? '+' : '-'}{transaction.amount} {transaction.symbol}
          </div>
          <div class="tags-row">
            <span class="net-badge">
              <i class="ri-global-line"></i> {transaction.networkName || transaction.network?.name || 'Blockchain Network'}
            </span>
            <span class="status-badge" class:confirmed={transaction.status === 'Confirmada'} class:pending={transaction.status === 'Pendiente'}>
              <i class={transaction.status === 'Confirmada' ? 'ri-checkbox-circle-fill' : 'ri-loader-4-line spin'}></i>
              {transaction.status}
            </span>
          </div>
        </div>
      </div>

      <!-- Detail Fields List -->
      <div class="modal-details-list">
        <!-- Hash -->
        <div class="detail-row">
          <div class="detail-info">
            <span class="field-label"><i class="ri-hashtag"></i> Hash de Transacción (TxHash)</span>
            <span class="field-value mono">{transaction.hash}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.hash, 'hash')}>
            {#if copiedHash}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- From -->
        <div class="detail-row">
          <div class="detail-info">
            <span class="field-label"><i class="ri-user-shared-line"></i> Remitente (De)</span>
            <span class="field-value mono">{transaction.from || 'Wallet activa'}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.from, 'from')}>
            {#if copiedFrom}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- To -->
        <div class="detail-row">
          <div class="detail-info">
            <span class="field-label"><i class="ri-user-received-line"></i> Destinatario (Para)</span>
            <span class="field-value mono">{transaction.to}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.to, 'to')}>
            {#if copiedTo}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- Date -->
        <div class="detail-row single">
          <div class="detail-info">
            <span class="field-label"><i class="ri-time-line"></i> Fecha y Hora de Registro</span>
            <span class="field-value">{formatDate(transaction.createdAt)}</span>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <a
          class="explorer-btn"
          href={getExplorerTransactionUrl(transaction.network, transaction.hash)}
          target="_blank"
          rel="noreferrer"
        >
          <i class="ri-external-link-line"></i> Ver en explorador de bloques oficial
        </a>
        <button class="secondary-btn" onclick={onClose}>Cerrar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    /* Fondo con efecto vidrio esmerilado: se ve la página desenfocada, no un overlay negro */
    background: rgba(10, 14, 26, 0.35);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    display: grid;
    place-items: center;
    padding: 20px;
    animation: fadeIn 0.25s ease;
  }

  .modal-card {
    background: linear-gradient(160deg, #101731 0%, #0c1226 100%);
    border: 1px solid rgba(77, 242, 255, 0.3);
    border-radius: 24px;
    width: 100%;
    max-width: 580px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 28px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(77, 242, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 22px;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(148, 170, 255, 0.12);
    padding-bottom: 16px;
  }

  .modal-header-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-icon {
    color: var(--accent-lime);
    font-size: 1.4rem;
  }

  h3 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 1.2rem;
    color: #fff;
  }

  .close-btn {
    background: rgba(148, 170, 255, 0.1);
    border: 1px solid rgba(148, 170, 255, 0.2);
    color: #a6bbb1;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(255, 100, 100, 0.2);
    color: #fff;
    border-color: rgba(255, 100, 100, 0.4);
  }

  /* HERO SUMMARY */
  .modal-summary-box {
    display: flex;
    align-items: center;
    gap: 18px;
    background: #0b1226;
    border: 1px solid rgba(148, 170, 255, 0.18);
    border-radius: 18px;
    padding: 20px;
  }

  .summary-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    display: grid;
    place-items: center;
    font-size: 1.6rem;
    font-weight: 700;
    flex: none;
  }

  .summary-icon.receive {
    background: rgba(46, 213, 115, 0.15);
    color: #2ed573;
  }

  .summary-amount-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .type-label {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #38bdf8;
  }

  .type-label.receive {
    color: #2ed573;
  }

  .amount-val {
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    font-family: var(--font-heading);
  }

  .amount-val.receive {
    color: #2ed573;
  }

  .tags-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .net-badge {
    font-size: 0.78rem;
    color: #c4b0ff;
    background: rgba(168, 85, 247, 0.14);
    border: 1px solid rgba(168, 85, 247, 0.28);
    padding: 3px 10px;
    border-radius: 999px;
  }

  .status-badge {
    font-size: 0.78rem;
    color: #eccc68;
    background: rgba(236, 204, 104, 0.14);
    border: 1px solid rgba(236, 204, 104, 0.28);
    padding: 3px 10px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .status-badge.confirmed {
    color: #2ed573;
    background: rgba(46, 213, 115, 0.14);
    border-color: rgba(46, 213, 115, 0.28);
  }

  /* DETAILS LIST */
  .modal-details-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detail-row {
    background: #090f20;
    border: 1px solid rgba(148, 170, 255, 0.12);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .detail-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .field-label {
    font-size: 0.78rem;
    color: #8ca69a;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .field-value {
    font-size: 0.9rem;
    color: #fff;
    word-break: break-all;
  }

  .field-value.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--accent-lime);
    font-size: 0.85rem;
  }

  .copy-small-btn {
    border: 1px solid rgba(77, 242, 255, 0.25);
    background: rgba(77, 242, 255, 0.08);
    color: #cde9ca;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }

  .copy-small-btn:hover {
    background: rgba(77, 242, 255, 0.2);
    color: #fff;
    border-color: var(--accent-lime);
  }

  /* FOOTER */
  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-top: 6px;
  }

  .explorer-btn {
    flex: 1;
    border: 0;
    border-radius: 12px;
    padding: 13px;
    background: var(--accent-lime);
    color: #0a2430;
    font-weight: 700;
    font-size: 0.92rem;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s ease;
    box-shadow: 0 8px 20px rgba(77, 242, 255, 0.18);
  }

  .explorer-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(77, 242, 255, 0.32);
  }

  .secondary-btn {
    border: 1px solid rgba(148, 170, 255, 0.25);
    background: rgba(11, 18, 38, 0.8);
    color: #c4d7ca;
    padding: 13px 20px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .secondary-btn:hover {
    color: #fff;
    border-color: rgba(77, 242, 255, 0.4);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
