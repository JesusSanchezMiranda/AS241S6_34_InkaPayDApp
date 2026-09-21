<script>
  import { wallet } from '../../stores/wallet.js';

  let copied = false;

  const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : 'Sin conectar');

  async function copy() {
    if (!$wallet.address) return;
    await navigator.clipboard.writeText($wallet.address);
    copied = true;
    setTimeout(() => (copied = false), 1600);
  }
</script>

<div class="address-container">
  <div class="muted">Dirección pública</div>
  <div class="address">
    <span>{$wallet.address ? short($wallet.address) : 'Conecta tu wallet'}</span>
    {#if $wallet.address}
      <button class="copy-btn" onclick={copy}>
        {#if copied}
          <i class="ri-check-line"></i> Copiado
        {:else}
          <i class="ri-file-copy-line"></i> Copiar
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .address-container {
    margin-bottom: 16px;
  }

  .muted {
    color: #8ca69a;
    font-size: 0.9rem;
    margin-bottom: 4px;
  }

  .address {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    color: var(--accent-lime);
    font-family: monospace;
    word-break: break-all;
    font-size: 1.05rem;
  }

  .copy-btn {
    border: 1px solid #315b4b;
    color: #cde9ca;
    background: transparent;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: border-color 0.2s, color 0.2s;
  }

  .copy-btn:hover {
    border-color: var(--accent-lime);
    color: #fff;
  }
</style>
