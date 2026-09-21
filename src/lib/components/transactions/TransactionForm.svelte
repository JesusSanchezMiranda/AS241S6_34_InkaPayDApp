<script>
  import { ethers } from 'ethers';
  import { getEvmSigner, switchEvmNetwork } from '../../services/evmWallet.js';
  import { switchUtxoNetwork, getUtxoSnapshot } from '../../services/utxoWallet.js';
  import { selectedNetwork, selectNetwork } from '../../stores/network.js';
  import { wallet, setConnectedWallet, refreshWalletBalance } from '../../stores/wallet.js';
  import { addTransaction, updateTransaction } from '../../stores/transactions.js';
  import { getExplorerTransactionUrl } from '../../services/explorers.js';
  import { NETWORKS } from '../../config/networks.js';

  export let onTransactionChange = () => {};

  let to = '';
  let amount = '';
  let status = '';
  let hash = '';
  let error = '';
  let sending = false;
  let switching = false;

  // Custom Network Select Dropdown State
  let dropdownOpen = false;

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  async function selectCustomNetwork(targetNet) {
    closeDropdown();
    if (targetNet.id === $selectedNetwork.id) return;

    error = '';
    switching = true;
    try {
      if ($wallet.connected) {
        const snapshot =
          targetNet.type === 'evm'
            ? await switchEvmNetwork(targetNet)
            : (await switchUtxoNetwork(targetNet), await getUtxoSnapshot());
        await setConnectedWallet({ ...snapshot, network: targetNet, symbol: targetNet.symbol });
      }
      selectNetwork(targetNet);
    } catch (e) {
      error = e?.message || 'No fue posible conmutar la red.';
    } finally {
      switching = false;
    }
  }

  $: onTransactionChange({ to, amount, status, hash, error, sending });

  async function send() {
    status = '';
    hash = '';
    error = '';
    sending = true;
    try {
      if ($selectedNetwork.type !== 'evm')
        throw new Error('Las transferencias directas en esta demo usan redes EVM.');
      if (!ethers.isAddress(to))
        throw new Error('La dirección destino no es una dirección EVM válida.');
      if (!amount || Number(amount) <= 0)
        throw new Error('Escribe un monto mayor que cero.');

      const value = ethers.toBeHex(ethers.parseEther(String(amount)));
      const signer = await getEvmSigner();
      const tx = await signer.sendTransaction({ to, value });
      hash = tx.hash;
      status = 'Pendiente';
      addTransaction({
        type: 'send',
        hash,
        to,
        from: $wallet.address || '0xLocalWallet',
        amount: String(amount),
        symbol: $selectedNetwork.symbol,
        networkName: $selectedNetwork.name,
        network: $selectedNetwork,
        status,
        createdAt: Date.now()
      });
      await tx.wait();
      status = 'Confirmada';
      updateTransaction(hash, { status });

      // Limpiar los campos del formulario tras envío exitoso
      to = '';
      amount = '';

      // Actualizar el saldo en tiempo real en la billetera
      await refreshWalletBalance($selectedNetwork);
    } catch (e) {
      error =
        e?.code === 'ACTION_REJECTED' || e?.code === 4001
          ? 'Transacción rechazada en la wallet.'
          : e?.shortMessage || e?.message || 'No se pudo enviar la transacción.';
      if (hash) updateTransaction(hash, { status: 'Error', error });
    } finally {
      sending = false;
    }
  }

  function handleWindowClick(event) {
    const el = event.target;
    if (dropdownOpen && !el.closest('.custom-select-container')) {
      closeDropdown();
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<form onsubmit={(event) => { event.preventDefault(); send(); }}>
  <!-- 1. DIV SEPARADO EXCLUSIVO PARA LA SELECCIÓN DE RED CON DESPLEGABLE PERSONALIZADO -->
  <div class="network-selector-card">
    <div class="selector-header">
      <span class="selector-label"><i class="ri-global-line"></i> Red seleccionada para la transacción</span>
      <span class="type-pill" class:evm={$selectedNetwork.type === 'evm'}>
        {$selectedNetwork.type.toUpperCase()}
      </span>
    </div>

    <!-- Custom Styled Dropdown (Reemplaza al <select> nativo) -->
    <div class="custom-select-container">
      <button
        type="button"
        class="custom-select-trigger"
        onclick={toggleDropdown}
        disabled={switching}
      >
        <div class="trigger-info">
          <span class="net-icon">{$selectedNetwork.icon || '🌐'}</span>
          <div class="net-names">
            <strong class="net-name">{$selectedNetwork.name}</strong>
            <span class="net-symbol font-mono">{$selectedNetwork.symbol} · {$selectedNetwork.type === 'evm' ? `Chain ID ${$selectedNetwork.chainId}` : `Red ${$selectedNetwork.networkKey}`}</span>
          </div>
        </div>
        <i class="ri-arrow-down-s-line chevron" class:open={dropdownOpen}></i>
      </button>

      {#if dropdownOpen}
        <div class="custom-dropdown-menu">
          <div class="dropdown-group-title"><i class="ri-swap-box-line"></i> Redes EVM</div>
          {#each NETWORKS.filter((n) => n.type === 'evm') as net}
            <div
              class="dropdown-item"
              class:selected={net.id === $selectedNetwork.id}
              onclick={() => selectCustomNetwork(net)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectCustomNetwork(net); }}
              role="option"
              aria-selected={net.id === $selectedNetwork.id}
              tabindex="0"
            >
              <div class="item-left">
                <span class="item-icon">{net.icon}</span>
                <div class="item-text">
                  <strong class="item-title">{net.name}</strong>
                  <span class="item-sub font-mono">{net.symbol} · Chain ID {net.chainId}</span>
                </div>
              </div>
              {#if net.id === $selectedNetwork.id}
                <i class="ri-check-line check-icon"></i>
              {/if}
            </div>
          {/each}

          <div class="dropdown-group-title"><i class="ri-bit-coin-line"></i> Redes UTXO</div>
          {#each NETWORKS.filter((n) => n.type === 'utxo') as net}
            <div
              class="dropdown-item"
              class:selected={net.id === $selectedNetwork.id}
              onclick={() => selectCustomNetwork(net)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectCustomNetwork(net); }}
              role="option"
              aria-selected={net.id === $selectedNetwork.id}
              tabindex="0"
            >
              <div class="item-left">
                <span class="item-icon">{net.icon}</span>
                <div class="item-text">
                  <strong class="item-title">{net.name}</strong>
                  <span class="item-sub font-mono">{net.symbol} · API window.pali</span>
                </div>
              </div>
              {#if net.id === $selectedNetwork.id}
                <i class="ri-check-line check-icon"></i>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- 2. CAMPOS DE DESTINO Y MONTO EN DIV SEPARADO -->
  <div class="form-fields-card">
    <div class="field-group">
      <label for="to"><i class="ri-user-shared-line"></i> Dirección destino</label>
      <input id="to" bind:value={to} placeholder="0x…" required />
    </div>

    <div class="field-group">
      <label for="amount"><i class="ri-coins-line"></i> Monto ({$selectedNetwork.symbol})</label>
      <input id="amount" bind:value={amount} type="number" min="0" step="any" placeholder="0.001" required />
    </div>

    <button class="primary-btn submit" disabled={sending || switching}>
      {#if sending}
        <i class="ri-loader-4-line spin"></i> Firmando transacción...
      {:else if switching}
        <i class="ri-loader-4-line spin"></i> Cambiando red...
      {:else}
        <i class="ri-send-plane-fill"></i> Enviar transacción en {$selectedNetwork.name}
      {/if}
    </button>
  </div>
</form>

{#if status}
  <div class="feedback success">
    <i class="ri-checkbox-circle-fill"></i> <strong>{status}</strong>
    {#if hash}
      <br />
      <a href={getExplorerTransactionUrl($selectedNetwork, hash)} target="_blank" rel="noreferrer">
        Ver en explorador de {$selectedNetwork.name} <i class="ri-external-link-line"></i>
      </a>
    {/if}
  </div>
{/if}

{#if error}
  <div class="feedback error"><i class="ri-error-warning-fill"></i> {error}</div>
{/if}

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* 1. CONTAINER EXCLUSIVO SEPARADO PARA EL SELECTOR DE REDES */
  .network-selector-card {
    background: #090f20;
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .selector-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #c4d7ca;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .type-pill {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(168, 85, 247, 0.14);
    color: #c4b0ff;
    border: 1px solid rgba(168, 85, 247, 0.28);
  }

  .type-pill.evm {
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    border-color: rgba(77, 242, 255, 0.25);
  }

  /* CUSTOM DROPDOWN CONTAINER AND TRIGGER */
  .custom-select-container {
    position: relative;
    width: 100%;
  }

  .custom-select-trigger {
    width: 100%;
    background: #0b142c;
    border: 1px solid rgba(148, 170, 255, 0.25);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .custom-select-trigger:hover:not(:disabled) {
    border-color: var(--accent-lime);
    background: #0e1936;
  }

  .trigger-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .net-icon {
    font-size: 1.2rem;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(77, 242, 255, 0.12);
    color: var(--accent-lime);
    flex: none;
  }

  .net-names {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .net-name {
    font-size: 0.98rem;
    color: #ffffff;
    font-family: var(--font-heading);
  }

  .net-symbol {
    font-size: 0.78rem;
    color: #8ca69a;
  }

  .chevron {
    color: #8ca69a;
    font-size: 1.2rem;
    transition: transform 0.25s ease;
  }

  .chevron.open {
    transform: rotate(180deg);
    color: var(--accent-lime);
  }

  /* CUSTOM DROPDOWN MENU POPUP */
  .custom-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 100;
    background: #0b1226;
    border: 1px solid rgba(77, 242, 255, 0.3);
    border-radius: 14px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    max-height: 280px;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: menuFadeIn 0.2s ease;
  }

  .custom-dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  .custom-dropdown-menu::-webkit-scrollbar-thumb {
    background: rgba(77, 242, 255, 0.25);
    border-radius: 6px;
  }

  .dropdown-group-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #6fd8ea;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 8px 10px 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .dropdown-item:hover {
    background: rgba(77, 242, 255, 0.12);
  }

  .dropdown-item.selected {
    background: rgba(77, 242, 255, 0.18);
    border: 1px solid rgba(77, 242, 255, 0.3);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .item-icon {
    font-size: 1rem;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: rgba(148, 170, 255, 0.1);
    display: grid;
    place-items: center;
    color: #fff;
  }

  .item-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .item-title {
    font-size: 0.9rem;
    color: #fff;
  }

  .item-sub {
    font-size: 0.75rem;
    color: #8ca69a;
  }

  .check-icon {
    color: var(--accent-lime);
    font-size: 1.1rem;
  }

  /* 2. FORM FIELDS CONTAINER */
  .form-fields-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #c4d7ca;
    font-size: 0.85rem;
    font-weight: 600;
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
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--accent-lime);
  }

  input::placeholder {
    color: #76918d;
  }

  .primary-btn {
    border: 0;
    border-radius: 12px;
    padding: 14px 20px;
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
    margin-top: 4px;
    transition: all 0.25s ease;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(77, 242, 255, 0.28);
  }

  .primary-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes menuFadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .feedback {
    margin-top: 14px;
    padding: 14px;
    border-radius: 12px;
    background: rgba(77, 242, 255, 0.1);
    border: 1px solid rgba(77, 242, 255, 0.25);
    color: #e2f9ff;
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .feedback.error {
    background: rgba(89, 38, 42, 0.8);
    color: #ffd1d1;
    border: 1px solid rgba(255, 151, 151, 0.3);
  }

  .feedback a {
    color: var(--accent-lime);
    text-decoration: none;
    font-weight: 600;
  }

  .feedback a:hover {
    text-decoration: underline;
  }
</style>
