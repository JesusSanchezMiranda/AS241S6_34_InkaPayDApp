<script>
  import { referencePen, formatPen } from '../../config/rates.js'
  import { tick } from 'svelte';
  import { getExplorerTransactionUrl } from '../../services/explorers.js';
  import { downloadRemittanceReceipt } from '../../services/remittanceReceipt.js';

  export let transaction = null;
  export let onClose = () => {};

  let copiedHash = false;
  let copiedFrom = false;
  let copiedTo = false;
  let actionError = '';

  async function download() {
    try { await downloadRemittanceReceipt(transaction); }
    catch { actionError = 'No pudimos descargar el comprobante. Vuelve a intentarlo.'; }
  }

  // El foco permanece en el diálogo y vuelve al botón que lo abrió al cerrar.
  function focusDialog(node) {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let disposed = false;
    void tick().then(() => { if (!disposed) node.querySelector('button')?.focus(); });
    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const elements = [...node.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    node.addEventListener('keydown', trap);
    return { destroy() { disposed = true; node.removeEventListener('keydown', trap); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); } };
  }

  async function copyText(text, type) {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch { actionError = 'No pudimos copiar. Selecciona el texto y cópialo manualmente.'; return; }
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
    <div class="modal-card" class:remittance={transaction.kind === 'remesa'} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1" use:focusDialog>
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-header-title">
          <i class="ri-file-list-3-line modal-icon"></i>
          <h3 id="modal-title">{transaction.kind === 'remesa' ? 'Comprobante de remesa' : 'Detalle de la Transacción'}</h3>
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
              <i class={transaction.status === 'Confirmada' ? 'ri-checkbox-circle-fill' : transaction.status === 'Pendiente' ? 'ri-loader-4-line spin' : 'ri-error-warning-line'}></i>
              {transaction.status}
            </span>
          </div>
        </div>
      </div>

      <!-- Detail Fields List -->
      <div class="modal-details-list">
        {#if transaction.kind === 'remesa'}
          <div class="detail-row single"><div class="detail-info"><span class="field-label">Motivo</span><span class="field-value">{transaction.reason || 'Sin motivo'}</span></div></div>
          <div class="detail-row single"><div class="detail-info"><span class="field-label">Beneficiario</span><span class="field-value">{transaction.beneficiaryName || 'Sin alias'}</span></div></div>
          <div class="detail-row single"><div class="detail-info"><span class="field-label">Referencia o motivo</span><span class="field-value">{transaction.reference || 'Sin referencia'}</span></div></div>
          <div class="detail-row single"><div class="detail-info"><span class="field-label">Equivalente referencial</span><span class="field-value">{formatPen(referencePen(transaction.amount, transaction.symbol))}</span></div></div>
        {/if}
        <!-- Hash -->
        <div class="detail-row full-width">
          <div class="detail-info">
            <span class="field-label"><i class="ri-hashtag"></i> Hash de Transacción (TxHash)</span>
            <span class="field-value mono">{transaction.hash}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.hash, 'hash')}>
            {#if copiedHash}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- From -->
        <div class="detail-row address-row">
          <div class="detail-info">
            <span class="field-label"><i class="ri-user-shared-line"></i> Remitente (De)</span>
            <span class="field-value mono">{transaction.from || 'Wallet activa'}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.from, 'from')}>
            {#if copiedFrom}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- To -->
        <div class="detail-row address-row">
          <div class="detail-info">
            <span class="field-label"><i class="ri-user-received-line"></i> Destinatario (Para)</span>
            <span class="field-value mono">{transaction.to}</span>
          </div>
          <button class="copy-small-btn" onclick={() => copyText(transaction.to, 'to')}>
            {#if copiedTo}<i class="ri-check-line"></i> Copiado{:else}<i class="ri-file-copy-line"></i> Copiar{/if}
          </button>
        </div>

        <!-- Date -->
        <div class="detail-row single full-width">
          <div class="detail-info">
            <span class="field-label"><i class="ri-time-line"></i> Fecha y Hora de Registro</span>
            <span class="field-value">{formatDate(transaction.createdAt || transaction.timestamp)}</span>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      {#if actionError}<p role="alert">{actionError}</p>{/if}
      <div class="modal-footer">
        <a
          class="explorer-btn"
          href={transaction.explorerUrl || getExplorerTransactionUrl(transaction.network, transaction.hash)}
          target="_blank"
          rel="noreferrer"
        >
          <i class="ri-external-link-line"></i> Ver en explorador de bloques oficial
        </a>
        {#if transaction.kind === 'remesa'}<button class="secondary-btn" onclick={download}>Descargar comprobante PNG</button>{/if}
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
    scrollbar-width: thin;
    scrollbar-color: var(--border-input) var(--surface-input);
    padding: 28px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(77, 242, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 22px;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-card::-webkit-scrollbar{width:6px}.modal-card::-webkit-scrollbar-track{background:var(--surface-input)}.modal-card::-webkit-scrollbar-thumb{background:var(--border-input);border-radius:999px}

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

  /* El comprobante usa dos columnas; las direcciones y el hash siguen completos. */
  .modal-card.remittance{max-width:880px;padding:24px;gap:16px;max-height:calc(100dvh - 40px)}
  .remittance>*{flex-shrink:0}
  .remittance .modal-header{padding-bottom:12px;gap:16px}
  .remittance .modal-summary-box{padding:16px 18px;gap:14px}
  .remittance .modal-details-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .remittance .full-width{grid-column:1/-1}
  .remittance .detail-row{min-width:0;padding:12px 14px;border-radius:12px}
  .remittance .field-value{word-break:normal;overflow-wrap:anywhere;font-size:.85rem;line-height:1.4}
  .remittance .field-value.mono{font-size:.76rem}
  .remittance .address-row{position:relative;align-items:flex-start}
  .remittance .address-row .detail-info{width:100%}
  .remittance .address-row .field-label{padding-right:82px;min-height:28px}
  .remittance .address-row .copy-small-btn{position:absolute;right:12px;top:10px}
  .remittance .modal-footer{margin:0;align-items:stretch;gap:10px}
  .remittance .explorer-btn,.remittance .secondary-btn{font-size:.8rem;padding:11px 14px;line-height:1.35}
  .remittance .explorer-btn{box-shadow:none}
  @media(min-width:701px) and (max-height:800px){
    .modal-card.remittance{padding:18px;gap:12px}
    .remittance .modal-header{padding-bottom:10px}.remittance h3{font-size:1.1rem}
    .remittance .modal-summary-box{padding:12px 16px}.remittance .summary-icon{width:44px;height:44px}
    .remittance .amount-val{font-size:1.4rem}.remittance .type-label{font-size:.68rem}
    .remittance .modal-details-list{gap:8px}.remittance .detail-row{padding:10px 12px}
    .remittance .field-label{font-size:.72rem}.remittance .field-value{font-size:.8rem}
    .remittance .address-row .copy-small-btn{top:8px;right:10px}
    .remittance .explorer-btn,.remittance .secondary-btn{padding:10px 12px;font-size:.75rem}
  }
  @media(max-width:700px){
    .modal-backdrop{padding:12px}
    .modal-card.remittance{padding:16px;gap:14px;max-height:calc(100dvh - 24px)}
    .remittance .modal-details-list{grid-template-columns:1fr}
    .remittance .modal-footer{flex-wrap:wrap}.remittance .explorer-btn{flex-basis:100%}
    .remittance .modal-footer .secondary-btn{flex:1}
    .remittance .modal-header-title{gap:8px}.remittance h3{font-size:1.05rem}
    .remittance .summary-amount-col{min-width:0}.remittance .amount-val{overflow-wrap:anywhere}
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
