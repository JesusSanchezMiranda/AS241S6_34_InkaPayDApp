<script>
  import { ethers } from 'ethers';
  import { getEvmSigner } from '../../services/evmWallet.js';
  import { selectedNetwork } from '../../stores/network.js';
  import { wallet, refreshWalletBalance, applyBalanceDelta } from '../../stores/wallet.js';
  import { addTransaction, updateTransaction } from '../../stores/transactions.js';
  import { getExplorerTransactionUrl } from '../../services/explorers.js';

  export let onTransactionChange = () => {};
  export let switching = false;
  export let compact = false;
  let to = '', amount = '', status = '', hash = '', error = '', sending = false;
  let sentNetwork = null;
  $: onTransactionChange({ to, amount, status, hash, error, sending });
  $: disabledReason = !$wallet.connected ? 'Conecta tu wallet para enviar saldo.' : $selectedNetwork.type !== 'evm' ? 'Selecciona una red EVM para enviar saldo.' : '';

  async function send() {
    if (sending || switching || disabledReason) return;
    // Conserva el contexto del envío aunque Pali cambie de cuenta o red después.
    const network = $selectedNetwork;
    const from = $wallet.address;
    const recipient = to.trim();
    const sentAmount = String(amount);
    status = ''; hash = ''; error = ''; sending = true; sentNetwork = network;
    try {
      if (!ethers.isAddress(recipient)) throw new Error('La dirección destino no es una dirección EVM válida.');
      if (!amount || Number(amount) <= 0) throw new Error('Escribe un monto mayor que cero.');
      const value = ethers.toBeHex(ethers.parseUnits(sentAmount, network.decimals));
      const signer = await getEvmSigner($wallet.address);
      const actualNetwork = await signer.provider.getNetwork();
      if (Number(actualNetwork.chainId) !== network.chainId || (await signer.getAddress()).toLowerCase() !== from?.toLowerCase())
        throw new Error('Cambió la cuenta o la red de Pali. Revisa los datos antes de enviar.');
      const tx = await signer.sendTransaction({ to: recipient, value, chainId: network.chainId });
      hash = tx.hash;
      status = 'Pendiente';
      addTransaction({ type: 'send', hash, to: recipient, from, amount: sentAmount, symbol: network.symbol,
        networkId: network.id, networkName: network.name, network, status, createdAt: Date.now() });
      // El saldo se descuenta al transmitir; la red lo confirma al recibir el comprobante.
      applyBalanceDelta({ amount: sentAmount, symbol: network.symbol, networkId: network.id });
      await tx.wait();
      status = 'Confirmada';
      updateTransaction(hash, { status }, network.id);
      to = ''; amount = '';
      if ($selectedNetwork.id === network.id && $wallet.address === from) await refreshWalletBalance(network);
    } catch (e) {
      error = e?.code === 'ACTION_REJECTED' || e?.code === 4001 ? 'Transacción rechazada en la wallet.' : e?.shortMessage || e?.message || 'No se pudo enviar la transacción.';
      if (hash) {
        updateTransaction(hash, { status: e?.receipt?.status === 0 ? 'Error' : 'Pendiente', error }, network.id);
        if ($selectedNetwork.id === network.id && $wallet.address === from) await refreshWalletBalance(network);
      }
    } finally { sending = false; }
  }
</script>

<!-- El selector de red vive en su propia tarjeta, junto a este formulario. -->
<form class:compact onsubmit={(event) => { event.preventDefault(); send(); }}>
  <div class="form-fields-card">
    <div class="field-group"><label for="to">Dirección destino</label><input id="to" bind:value={to} placeholder="0x…" required disabled={sending} autocomplete="off" /></div>
    <div class="field-group"><label for="amount">Monto ({$selectedNetwork.symbol})</label><input id="amount" bind:value={amount} type="number" min="0" step="any" placeholder="0.001" required disabled={sending} /></div>
    <button class="primary-btn" disabled={sending || switching || !!disabledReason} aria-describedby={disabledReason ? 'send-help' : undefined}>
      {#if sending}<i class="ri-loader-4-line spin" aria-hidden="true"></i> Firmando transacción…
      {:else if switching}Cambiando red…
      {:else}<i class="ri-send-plane-fill" aria-hidden="true"></i> Enviar transacción en {$selectedNetwork.name}{/if}
    </button>
    {#if disabledReason}<small id="send-help">{disabledReason}</small>{/if}
  </div>
  {#if status}<div class="feedback success" role="status"><strong>{status}</strong>{#if hash}<a href={getExplorerTransactionUrl(sentNetwork, hash)} target="_blank" rel="noreferrer">Ver en explorador de {sentNetwork.name} ↗</a>{/if}</div>{/if}
  {#if error}<div class="feedback error" role="alert">{error}</div>{/if}
</form>

<style>
  .compact{flex:1}.compact .form-fields-card{flex:1}.compact .primary-btn{margin-top:auto}
  /* En escritorios de poca altura se juntan los campos, sin ocultar el botón de envío. */
  @media(min-width:1001px) and (max-height:760px){.compact .form-fields-card{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:10px 12px}.compact .primary-btn,.compact .form-fields-card>small{grid-column:1 / -1}.compact input{padding:9px 12px}.compact .primary-btn{padding:10px}.compact{gap:10px}}
  form,.form-fields-card{display:flex;flex-direction:column;gap:14px;min-width:0}.field-group{display:flex;flex-direction:column;gap:7px}label{color:var(--text-primary);font-size:.8rem;font-weight:600}input{width:100%;background:var(--surface-input);color:var(--text-primary);border:1px solid var(--border-input);border-radius:var(--radius-control);padding:11px 12px;font:inherit;font-size:.85rem;min-width:0}input:focus-visible,button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px}input::placeholder{color:var(--text-secondary)}.primary-btn{border:0;border-radius:var(--radius-control);padding:12px;background:var(--accent-primary);color:var(--bg-page);font:700 .8rem var(--font-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;line-height:1.5;margin-top:2px}.primary-btn:hover:not(:disabled){box-shadow:var(--shadow-panel)}.primary-btn:disabled{opacity:.5;cursor:not-allowed}small{font-size:.75rem;line-height:1.5;color:var(--text-secondary)}.feedback{padding:12px;border:1px solid var(--border-input);border-radius:var(--radius-control);color:var(--accent-primary);font-size:.8rem;display:flex;flex-direction:column;gap:6px;overflow-wrap:anywhere}.feedback.error{color:var(--text-error)}.feedback a{color:var(--accent-primary);font-size:.75rem}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
