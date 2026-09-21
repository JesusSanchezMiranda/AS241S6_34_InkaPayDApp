<script>
  import { wallet } from '../../stores/wallet.js';
</script>

<div class="balance-card">
  <div class="muted">Saldo disponible</div>
  <div class="balance">
    {$wallet.balance ? Number($wallet.balance).toFixed(5) : '0.00000'}
    <small>{$wallet.symbol || '—'}</small>
  </div>
  <div class="status">
    {#if $wallet.connected}
      <i class="ri-checkbox-circle-fill"></i> {$wallet.network?.name || 'Red conectada'}
    {:else}
      <i class="ri-close-circle-line"></i> Wallet no conectada
    {/if}
  </div>
</div>

<style>
  .balance-card {
    margin-top: 12px;
  }

  .muted {
    color: #8ca69a;
    font-size: 0.9rem;
  }

  .balance {
    font-size: clamp(2.3rem, 6vw, 4.5rem);
    font-family: var(--font-heading);
    margin: 14px 0 0;
    color: #fff;
    line-height: 1;
  }

  .balance small {
    color: #6fd8ea;
    font-size: 1rem;
  }

  .status {
    color: var(--accent-lime);
    font-size: 0.85rem;
    margin-top: 8px;
  }
</style>
