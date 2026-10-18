<script>
  import { onDestroy, tick } from 'svelte'
  import { ethers } from 'ethers'
  import { selectedNetwork } from '../../stores/network.js'
  import { wallet, refreshWalletBalance, applyBalanceDelta } from '../../stores/wallet.js'
  import { beneficiaries } from '../../stores/beneficiaries.js'
  import { getEvmSigner } from '../../services/evmWallet.js'
  import { prepareRemittance, sendRemittance, trackRemittance, friendlyRemittanceError } from '../../services/remittance.js'
  import { reloadHistory } from '../../stores/history.js'
  import { referencePen, formatPen, formatFeePen, estimateSavings, TRADITIONAL_FEE_RATE, REMITTANCE_REASONS } from '../../config/remittances.js'
  import TransactionHistory from './TransactionHistory.svelte'
  import BeneficiaryList from '../remittances/BeneficiaryList.svelte'
  import Stepper from '../remittances/Stepper.svelte'
  import RemittanceReceipt from '../remittances/RemittanceReceipt.svelte'

  export let recent = []
  export let busy = false
  let step = 1, to = '', alias = '', amount = '', asset = 'native', reason = '', reference = ''
  let acknowledged = false
  let prepared = null, estimating = false, error = '', receipt = null
  let heading, quoteTimer, quoteId = 0, quoteKey = '', contextKey = '', lastContext = '', alive = true
  let activePanel = 'summary', lastNetwork = null, contextNotice = ''

  $: network = $selectedNetwork
  $: token = asset === 'usdc' ? network.tokens?.find((item) => item.symbol === 'USDC') : null
  $: symbol = token?.symbol || network.symbol
  $: pen = referencePen(amount, symbol)
  $: feeNative = prepared ? ethers.formatUnits(prepared.fee, network.decimals) : null
  $: savings = estimateSavings(amount, symbol, feeNative, network.symbol)
  // Permite que el sondeo del historial actualice el comprobante tras un timeout.
  $: receiptView = receipt ? recent.find((tx) => tx.hash === receipt.hash) || receipt : null
  $: total = prepared ? (token ? `${amount} ${symbol} + ${feeNative} ${network.symbol}` : `${ethers.formatUnits(prepared.value + prepared.fee, network.decimals)} ${symbol}`) : 'Se calcula al revisar'
  $: addressError = !to.trim() ? 'Escribe la dirección del beneficiario o selecciona uno guardado.' : !ethers.isAddress(to.trim()) || to.trim() === ethers.ZeroAddress ? 'Escribe una dirección válida que empiece con 0x. No uses la dirección cero.' : ''
  $: aliasError = alias.trim() ? '' : 'Escribe un alias para identificar a tu familiar.'
  $: amountError = validateAmount(amount, token?.decimals ?? network.decimals)
  $: networkError = network.type !== 'evm' || !network.rpcUrl ? 'Selecciona una red EVM compatible en el encabezado para enviar remesas.' : Number($wallet.chainId) !== network.chainId ? `Cambia Pali a ${network.name} desde el selector del encabezado para continuar.` : ''
  $: stepReason = networkError || (step === 1 ? addressError || aliasError : step === 2 ? amountError || (!reason ? 'Selecciona el motivo de tu envío.' : '') : '')
  $: contextKey = `${$wallet.address.toLowerCase()}:${network.id}:${$wallet.chainId}`
  $: if (contextKey !== lastContext) {
    const changed = !!lastContext
    const previousNetwork = lastNetwork
    lastContext = contextKey; lastNetwork = network
    prepared = null; acknowledged = false; quoteId += 1; estimating = false
    if (changed) {
      step = step === 4 ? 1 : Math.min(step, 2); receipt = null; busy = false; error = ''
      contextNotice = to || alias || amount || reason ? 'Cambió la cuenta o la red. Conservamos tu borrador; revisa los datos antes de continuar.' : ''
      if (asset === 'usdc' && !network.tokens?.some((item) => item.symbol === 'USDC')) {
        asset = 'native'; amount = ''
        contextNotice = 'USDC no está disponible en esta red. Conservamos el beneficiario y el motivo; elige un activo y un monto nuevos.'
      } else if (asset === 'native' && previousNetwork?.symbol !== network.symbol) {
        amount = ''
        contextNotice = 'Cambió la moneda nativa de la red. Conservamos el beneficiario y el motivo; ingresa un monto en ' + network.symbol + '.'
      }
    }
  }
  $: inputKey = `${contextKey}:${to}:${amount}:${asset}`
  $: if (inputKey !== quoteKey) {
    quoteKey = inputKey
    scheduleEstimate(inputKey, !addressError && !amountError && !networkError && $wallet.connected && step < 4)
  }


  onDestroy(() => { alive = false; clearTimeout(quoteTimer); quoteId += 1 })

  function selectFrequent(item) {
    if (busy) return
    reset()
    to = item.address; alias = item.name
  }

  function validateAmount(value, decimals) {
    if (!value) return 'Escribe un monto mayor que cero.'
    try { if (ethers.parseUnits(String(value), decimals) > 0n) return '' } catch { /* Mensaje común para formato y precisión. */ }
    return `Usa un monto positivo con hasta ${decimals} decimales, sin comas.`
  }
  async function focusHeading() { await tick(); heading?.focus() }
  function go(next) { step = next; error = ''; contextNotice = ''; acknowledged = false; void focusHeading() }
  function scheduleEstimate(key, valid) {
    clearTimeout(quoteTimer); const id = ++quoteId
    prepared = null; acknowledged = false; estimating = false
    if (!valid || busy) return
    quoteTimer = setTimeout(async () => {
      estimating = true
      try {
        const result = await prepareRemittance({ signer: await getEvmSigner(), network, to: to.trim(), amount, token })
        if (alive && id === quoteId && key === quoteKey) { prepared = result; error = '' }
      } catch (e) { if (alive && id === quoteId) error = friendlyRemittanceError(e) }
      finally { if (alive && id === quoteId) estimating = false }
    }, 650)
  }
  async function next() {
    if (busy || stepReason) return
    if (step === 1) { go(2); return }
    const key = contextKey
    busy = true; error = ''; clearTimeout(quoteTimer); quoteId += 1; estimating = true
    try {
      if (asset === 'usdc' && !token) throw new Error('USDC no está disponible en esta red.')
      const quote = await prepareRemittance({ signer: await getEvmSigner(), network, to: to.trim(), amount, token })
      if (!alive || key !== contextKey) return
      prepared = quote; go(3)
    } catch (e) { if (alive && key === contextKey) error = friendlyRemittanceError(e) }
    finally { if (alive && key === contextKey) { busy = false; estimating = false } }
  }
  async function confirm() {
    if (busy || !prepared || !acknowledged || networkError) return
    const key = contextKey, sendingNetwork = network, quote = prepared
    const metadata = { to: to.trim(), from: quote.from, amount: String(amount), symbol,
      networkId: network.id, networkName: network.name, network, reason, reference: reference.trim(), beneficiaryName: alias.trim(),
      penAmount: pen, feeNative, tokenAddress: token?.address || null }
    busy = true; error = ''; contextNotice = ''; clearTimeout(quoteTimer); quoteId += 1
    try {
      const signer = await getEvmSigner()
      if ((await signer.getAddress()).toLowerCase() !== $wallet.address.toLowerCase()) throw new Error('Cambió la cuenta de Pali. Conecta de nuevo y revisa la remesa.')
      const sent = await sendRemittance({ signer, prepared: quote })
      // El saldo baja al transmitir y se reconcilia con la red al confirmar o fallar.
      if (alive && key === contextKey) applyBalanceDelta({ amount: metadata.amount, symbol: metadata.symbol, networkId: sendingNetwork.id, feeNative: metadata.feeNative })
      const result = await trackRemittance(sent, metadata, (tx) => {
        if (alive && key === contextKey) { receipt = tx; step = 4; void focusHeading() }
      })
      if (alive && key === contextKey) {
        if (result.status !== 'Pendiente') await refreshWalletBalance(sendingNetwork)
        void reloadHistory(true)
      }
    } catch (e) { if (alive && key === contextKey) { error = friendlyRemittanceError(e); prepared = null; acknowledged = false; step = 2 } }
    finally { if (alive && key === contextKey) busy = false }
  }
  function reset() {
    if (busy) return
    to = ''; alias = ''; amount = ''; reference = ''; reason = ''; asset = 'native'; prepared = null; receipt = null; go(1)
  }
</script>

<div class="remittance-layout">
  <section class="panel flow" data-step={step} aria-label="Enviar remesa" aria-busy={busy}>
    <div class="flow-scroll">
    <div class="step-progress"><Stepper {step} compact /></div>
    <header class="step-heading">
    <h2 bind:this={heading} tabindex="-1">{['Beneficiario', 'Monto y motivo', 'Revisa tu remesa', 'Tu comprobante'][step - 1]}</h2>
    {#if step < 4}<p class="lead">{['Elige a quién quieres acompañar hoy.', 'Define cuánto enviar y para qué lo necesita tu familiar.', 'Confirma los datos. Pali te pedirá autorizar el envío.'][step - 1]}</p>{/if}
      {#if step === 1 && $beneficiaries.length}<p class="beneficiary-hint"><i class="ri-contacts-line" aria-hidden="true"></i> Elige un beneficiario de la lista o completa sus datos.</p>{/if}
    </header>
    <div class="step-content">
    {#if step === 1}
      <div class="fields">
          <div class="field-group"><label for="remittance-address">Dirección de su wallet</label><input id="remittance-address" bind:value={to} placeholder="0x…" autocomplete="off" spellcheck="false" aria-invalid={!!to && !!addressError} aria-describedby="address-help" />
          <small id="address-help" class:error={!!to && !!addressError}>{addressError || 'Dirección válida. Comprueba que pertenece a tu familiar.'}</small></div>
          <div class="field-group"><label for="remittance-alias">Nombre o alias</label><input id="remittance-alias" bind:value={alias} maxlength="50" placeholder="Ej. Mamá" aria-describedby="alias-help" />
          <small id="alias-help">{aliasError || 'Así aparecerá en tu comprobante.'}</small></div>
      </div>
    {:else if step === 2}
      <fieldset class="amount-fields" disabled={busy}>
        <div class="asset-amount"><div class="asset-field">
        <label for="remittance-asset">Activo</label><select id="remittance-asset" bind:value={asset}><option value="native">{network.symbol} · moneda nativa</option>{#if network.tokens?.some((item) => item.symbol === 'USDC')}<option value="usdc">USDC</option>{/if}</select>
        {#if !network.tokens?.some((item) => item.symbol === 'USDC')}<small>USDC no está disponible en esta red. Puedes usar {network.symbol}.</small>{/if}
        </div><div class="asset-field">
        <label for="remittance-amount">Monto ({symbol})</label><input id="remittance-amount" type="text" inputmode="decimal" bind:value={amount} placeholder="0.00" aria-invalid={!!amount && !!amountError} aria-describedby="amount-help" />
        <small id="amount-help" class:error={!!amount && !!amountError}>{amountError || `${formatPen(pen)} · equivalente referencial`}</small>
        </div></div>
        <div class="field-group"><span id="reason-label" class="label">Motivo</span><div class="chips" role="group" aria-labelledby="reason-label">{#each REMITTANCE_REASONS as item}<button type="button" class:chosen={reason === item} aria-pressed={reason === item} onclick={() => reason = item}>{item}</button>{/each}</div></div>
        <div class="field-group"><label for="remittance-reference">Referencia libre (opcional)</label><input id="remittance-reference" bind:value={reference} maxlength="100" placeholder="Ej. Gastos de octubre" /></div>
      </fieldset>
    {:else if step === 3}
      <dl class="review">
        {#each [['Red', network.name], ['Beneficiario', alias], ['Dirección', to], ['Motivo', reason], ['Referencia', reference || 'Sin referencia'], ['Monto', `${amount} ${symbol}`], ['Equivalente referencial', formatPen(pen)], ['Comisión de red estimada', `${feeNative} ${network.symbol} · ${formatFeePen(referencePen(feeNative, network.symbol))}`], ['Total máximo estimado', total], ['Total referencial en soles', feeNative == null ? 'Por estimar' : pen == null || referencePen(feeNative, network.symbol) == null ? 'Sin referencia' : formatPen(pen + referencePen(feeNative, network.symbol))]] as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
      </dl>
      <p class="notice">Tu familiar recibirá el monto en {network.name}. Pali confirmará la comisión final en {network.symbol}.</p>
      <label class="check"><input type="checkbox" bind:checked={acknowledged} disabled={busy} />Confirmo que el beneficiario, la red y el monto son correctos.</label>
    {:else if receiptView}
      <p class="status" role="status">{receiptView.status === 'Confirmada' ? 'Pendiente → Confirmada · envío verificado en la red' : receiptView.status === 'Error' ? 'El envío no se completó.' : busy ? 'Pendiente · esperando confirmación de la red…' : 'Pendiente · consulta el historial para verificar el resultado.'}</p>
      <RemittanceReceipt transaction={receiptView} compact />
    {/if}
    </div>
    {#if contextNotice}<p class="notice" role="status">{contextNotice}</p>{/if}
    {#if error}<p class="error notice" role="alert">{error}</p>{/if}
    </div>
    <footer class="flow-footer">
    {#if step < 4}
      <div class="navigation">
        {#if step > 1}<button class="secondary" type="button" onclick={() => go(step - 1)} disabled={busy}>Atrás</button>{/if}
        <button class="primary" type="button" onclick={step === 3 ? confirm : next} disabled={busy || !!stepReason || (step === 3 && (!prepared || !acknowledged))} aria-describedby="continue-help">{busy ? step === 3 ? 'Autoriza el envío en Pali…' : 'Estimando comisión…' : step === 3 ? 'Confirmar y enviar' : step === 2 ? 'Continuar a revisión' : 'Continuar'}</button>
      </div>
      <small id="continue-help" role="status">{busy ? 'Espera mientras se procesa tu solicitud.' : stepReason || (step === 3 && !acknowledged ? 'Marca la confirmación para habilitar el envío.' : step === 3 ? 'Pali te pedirá la autorización final.' : 'Puedes volver atrás sin perder lo ingresado.')}</small>
    {:else}
      <button class="primary" type="button" onclick={reset} disabled={busy}>Nueva remesa</button>
      {#if busy}<small>Espera el resultado del envío antes de iniciar otro.</small>{/if}
    {/if}
    </footer>
  </section>

  <!-- Los botones y el contenido son tarjetas independientes en la columna central. -->
  <div class="information-column">
    <div class="panel panel-switch switch-panel" role="group" aria-label="Contenido de remesas">
      <button type="button" class:active={activePanel === 'summary'} aria-pressed={activePanel === 'summary'} aria-controls="remittance-summary" onclick={() => activePanel = 'summary'}>Resumen</button>
      <button type="button" class:active={activePanel === 'history'} aria-pressed={activePanel === 'history'} aria-controls="remittance-history" onclick={() => activePanel = 'history'}>Historial</button>
    </div>
    <section class="information" aria-label="Resumen e historial">
      <div id="remittance-summary" class="summary-content" hidden={activePanel !== 'summary'}>
        <section class="panel summary"><header class="card-heading"><span class="card-icon" aria-hidden="true"><i class="ri-send-plane-line"></i></span><div><span class="eyebrow">Tu familia, más cerca</span><h3>Resumen de tu envío</h3></div></header><dl><div><dt>Red</dt><dd>{network.name}</dd></div><div><dt>Para</dt><dd>{alias || 'Elige un beneficiario'}</dd></div><div><dt>Monto</dt><dd>{amount || '0'} {symbol}</dd></div><div><dt>En soles, referencial</dt><dd>{formatPen(pen)}</dd></div><div><dt>Motivo</dt><dd>{reason || 'Por elegir'}</dd></div><div><dt>Comisión estimada</dt><dd>{estimating ? 'Estimando…' : feeNative != null ? `${feeNative} ${network.symbol} · ${formatFeePen(referencePen(feeNative, network.symbol))}` : 'Completa el monto para estimar'}</dd></div></dl><small>Tasas ilustrativas de demostración; no son una cotización.</small></section>
        <section class="panel comparison"><header class="card-heading"><span class="card-icon" aria-hidden="true"><i class="ri-bar-chart-grouped-line"></i></span><h3>InkaPay vs envío tradicional</h3></header><p>Comisión tradicional de referencia: {(TRADITIONAL_FEE_RATE * 100).toFixed(0)}%.</p><dl><div><dt>Tradicional</dt><dd>{pen == null ? 'Sin referencia' : formatFeePen(pen * TRADITIONAL_FEE_RATE)}</dd></div><div><dt>Comisión InkaPay</dt><dd>{feeNative == null ? 'Por estimar' : formatFeePen(referencePen(feeNative, network.symbol))}{#if feeNative != null}<small>{feeNative} {network.symbol}</small>{/if}</dd></div></dl>{#if savings}<p class="saving">{savings.pen >= 0 ? 'Ahorro' : 'Costo adicional'}: {formatPen(Math.abs(savings.pen))}<small>{Math.abs(savings.asset).toLocaleString('es-PE', { maximumFractionDigits: 8 })} {symbol}</small></p>{:else if pen == null}<p>Sin referencia para calcular el ahorro.</p>{/if}<small>Estimado referencial. Compara solo comisiones de envío; la conversión y el retiro pueden tener otros costos.</small></section>
      </div>
      <!-- Se mantiene montado para conservar filtros y evitar nuevas consultas al alternar. -->
      <div id="remittance-history" class="panel history-content" hidden={activePanel !== 'history'}><TransactionHistory remittancesOnly embedded /></div>
    </section>
  </div>
  <div class="beneficiary-column"><BeneficiaryList {recent} contextKey={`${$wallet.address.toLowerCase()}:${network.id}`} selectedAddress={to} disabled={busy} onRepeat={selectFrequent} /></div>
</div>

<style>
  .remittance-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.1fr) minmax(0,.9fr);gap:var(--space-5);align-items:start}.panel{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);padding:var(--space-5);min-width:0;box-shadow:var(--shadow-panel)}.flow{display:flex;flex-direction:column;gap:var(--space-4)}h2,h3{font-family:var(--font-heading);letter-spacing:-.03em;margin:0}h2{font-size:1.65rem}h2:focus{outline:none}h3{font-size:1.05rem}p{color:var(--text-secondary);line-height:1.6;font-size:.85rem;margin:var(--space-2) 0}.lead{margin:0 0 var(--space-2)}.fields,fieldset{display:flex;flex-direction:column;gap:var(--space-3)}fieldset{border:0;padding:0;margin:0;min-width:0}label,.label{font-size:.85rem;color:var(--text-primary);font-weight:600}input:not([type=checkbox]),select{width:100%;border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);color:var(--text-primary);padding:var(--space-3);font:inherit;min-width:0}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}.check{display:flex;gap:var(--space-2);align-items:flex-start;font-size:.8rem;line-height:1.6}.check input{accent-color:var(--accent-primary);margin:3px 0 0;flex:none;width:18px;height:18px}button{border:1px solid var(--border-input);border-radius:var(--radius-control);padding:var(--space-3) var(--space-4);background:var(--surface-input);color:var(--text-primary);font:600 .85rem var(--font-sans);cursor:pointer}button:hover{border-color:var(--accent-primary)}button:disabled{opacity:.5;cursor:not-allowed}.primary{background:var(--accent-primary);border-color:var(--accent-primary);color:var(--bg-page)}.primary:hover:not(:disabled){box-shadow:var(--shadow-panel)}.secondary{align-self:flex-start}.navigation{display:flex;gap:var(--space-3);flex-wrap:wrap}.navigation{margin-top:var(--space-3)}.navigation .primary{flex:1}.chips{display:flex;gap:var(--space-2);flex-wrap:wrap}.chips button{padding:var(--space-2) var(--space-3);font-size:.75rem;border-radius:999px}.chips .chosen{border-color:var(--accent-primary);color:var(--accent-primary)}small{display:block;color:var(--text-secondary);font-size:.75rem;line-height:1.6}.error{color:var(--text-error)}.notice{border:1px solid var(--border-input);border-radius:var(--radius-control);padding:var(--space-3)}dl{margin:var(--space-4) 0;display:grid;gap:var(--space-3)}dl div{display:flex;justify-content:space-between;gap:var(--space-4);font-size:.85rem}dt{color:var(--text-secondary)}dd{margin:0;text-align:right;overflow-wrap:anywhere;max-width:65%}.review{margin:0}.review div{border-bottom:1px solid var(--border-card);padding-bottom:var(--space-3)}.eyebrow{color:var(--accent-primary);text-transform:uppercase;font-size:.7rem;letter-spacing:.1em;display:block;margin-bottom:var(--space-2)}.card-heading{display:flex;align-items:center;gap:10px;min-width:0;margin-bottom:14px}.card-heading>div{min-width:0}.card-heading .eyebrow{margin-bottom:4px}.card-icon{width:32px;height:32px;flex:none;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--accent-primary) 8%,transparent);color:var(--accent-primary);font-size:1rem}.saving{color:var(--accent-success);font-family:var(--font-heading);font-size:1.1rem}.status{color:var(--accent-primary)}
  [hidden]{display:none!important}.information-column{display:grid;grid-template-rows:auto minmax(0,1fr);gap:var(--space-4);min-width:0;min-height:0}.information{min-width:0;min-height:0}.panel-switch{display:flex;gap:var(--space-1);padding:var(--space-1);background:var(--surface-input);border:1px solid var(--border-input);border-radius:var(--radius-control);flex:none}.panel-switch button{flex:1;border-color:transparent;padding:var(--space-2);background:transparent;color:var(--text-secondary)}.switch-panel{background:var(--surface-panel);border-color:var(--border-panel);border-radius:var(--radius-panel);padding:8px}.panel-switch .active{background:color-mix(in srgb,var(--accent-primary) 9%,var(--surface-input));border-color:color-mix(in srgb,var(--accent-primary) 45%,transparent);color:var(--accent-primary)}.summary-content{display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);height:100%;min-height:0;gap:var(--space-4)}.summary-content>.panel,.history-content{height:100%;min-height:0;overflow-y:auto}.history-content{min-width:0}.beneficiary-column{min-width:0;display:flex;overflow:hidden;border-radius:var(--radius-panel)}
  @media(min-width:1280px) and (max-width:1399px){.remittance-layout{gap:var(--space-4)}}
  @media(max-width:1279px){.remittance-layout{grid-template-columns:repeat(2,minmax(0,1fr))}.flow{grid-column:1/-1}.information-column,.beneficiary-column{height:520px;max-height:520px}}
  @media(max-width:700px){.remittance-layout{grid-template-columns:1fr}.panel{padding:var(--space-4)}.information-column,.beneficiary-column{height:520px;max-height:520px}dl div{flex-direction:column;gap:var(--space-1)}dd{text-align:left;max-width:100%}}
  .step-heading{display:grid;gap:var(--space-2)}.step-content,.field-group{display:flex;flex-direction:column;gap:var(--space-3)}.step-heading .beneficiary-hint{margin:0}.step-heading .lead{margin:0}
  .asset-amount{display:grid;gap:var(--space-3)}.asset-field{display:flex;flex-direction:column;gap:var(--space-2);min-width:0}
  .flow-scroll{display:flex;flex-direction:column;gap:var(--space-4);min-width:0}.flow-footer{display:flex;flex-direction:column;gap:var(--space-2)}.beneficiary-hint{margin:0;color:var(--text-secondary)}
  /* Los cuatro pasos comparten la misma tarjeta; solo las listas extensas se desplazan. */
  @media(min-width:1001px){
    .remittance-layout{height:100%;min-height:0;grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,.85fr);grid-template-rows:minmax(0,1fr);gap:var(--remittance-gap,24px);align-items:stretch}
    .panel{padding:20px;min-height:0;height:100%;max-height:none}.flow{grid-column:auto;gap:8px;overflow:hidden}.flow-scroll{flex:1;min-height:0;overflow-y:auto;padding:2px;gap:8px;scrollbar-gutter:stable}.flow-footer{flex:none;gap:5px;padding-top:6px;border-top:1px solid var(--border-card)}.flow-footer>.primary{width:100%}
    h2{font-size:1.15rem}h3{font-size:.9rem}.lead{margin:0;font-size:.73rem;line-height:1.4}.beneficiary-hint{font-size:.7rem;line-height:1.4}
    .asset-amount{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.asset-field{gap:5px}
    .fields,fieldset{gap:5px}label,.label{font-size:.75rem}input:not([type=checkbox]),select{padding:8px 10px;font-size:.8rem;min-height:34px}small{font-size:.65rem;line-height:1.4}button{padding:8px 12px;font-size:.75rem}.check{font-size:.7rem;line-height:1.4;gap:6px}.check input{width:15px;height:15px;margin-top:1px}.chips{gap:5px}.chips button{padding:5px 8px;font-size:.66rem}
    .navigation{margin:0;gap:8px}.notice{padding:7px 9px;font-size:.68rem;line-height:1.4;margin:0}.status{font-size:.7rem;line-height:1.4;margin:0}
    dl{gap:8px;margin:10px 0}dl div{font-size:.75rem;gap:12px}.review{margin:0;gap:6px 12px;grid-template-columns:repeat(2,minmax(0,1fr))}.review div{padding-bottom:5px;font-size:.7rem;display:block;min-width:0}.review dt{font-size:.6rem;margin-bottom:2px}.review dd{max-width:100%;text-align:left;line-height:1.35}.eyebrow{font-size:.6rem;margin-bottom:5px}.summary-content{gap:var(--remittance-gap,24px)}.comparison p{font-size:.72rem;line-height:1.4}.saving{font-size:.95rem}
    .information-column{height:100%;max-height:none;gap:var(--remittance-gap,24px)}.switch-panel{height:auto;min-height:48px;padding:5px}.information{height:100%;max-height:none}.panel-switch button{padding:7px;font-size:.75rem}.beneficiary-column{height:100%;max-height:none;min-height:0}
  }
  @media(min-width:1001px) and (max-height:800px){.panel{padding:12px}.card-heading{gap:8px;margin-bottom:8px}.card-icon{width:26px;height:26px;font-size:.85rem;border-radius:8px}.flow-scroll{gap:6px}h2{font-size:1.05rem}.lead{font-size:.68rem}.review{gap:4px}.review div{padding-bottom:4px;font-size:.65rem}.flow-footer{gap:4px;padding-top:4px}.summary-content{gap:var(--remittance-gap,18px)}dl{gap:6px;margin:8px 0}.comparison p{margin:6px 0}.information-column{gap:var(--remittance-gap,18px)}.switch-panel{min-height:44px;padding:4px}.information small{font-size:.62rem}}
  /* Los campos mantienen una separación moderada; el espacio sobrante queda antes del pie de acciones. */
  @media(min-width:1001px){
    .flow{container-name:remittance-flow;container-type:size}
    .flow-scroll{gap:6px}.step-progress,.step-heading{flex:none}.step-heading{gap:5px}
    .step-content{flex:1 0 auto;gap:6px;min-width:0}
    .fields,.amount-fields{flex:none;justify-content:flex-start;gap:12px}
    .field-group{gap:5px;min-width:0}
    .review{flex:1;grid-auto-rows:auto;align-content:space-between}
    .review div{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:2px}
    .review dt{margin:0}.review dd{width:100%}
    .flow[data-step="4"] .step-content{justify-content:space-evenly}
  }
  @container remittance-flow (min-height:560px){
    .flow-scroll{gap:14px}.step-heading{gap:8px}.step-heading h2{font-size:1.2rem}.step-heading .lead{font-size:.8rem;line-height:1.5}.step-heading .beneficiary-hint{font-size:.73rem;line-height:1.5}
    .step-content{gap:12px}.fields,.amount-fields{gap:20px}.field-group,.asset-field{gap:8px}.asset-amount{gap:16px}
    .field-group>label,.asset-field>label,.field-group>.label{font-size:.8rem}
    .field-group>input,.asset-field>input,.asset-field>select{min-height:42px;padding:10px 12px;font-size:.85rem}
    .field-group>small,.asset-field>small{font-size:.7rem;line-height:1.5}
    .chips{gap:8px}.chips button{padding:7px 10px;font-size:.73rem}
    .step-content>.check{font-size:.76rem;line-height:1.5;gap:8px}.check input{width:17px;height:17px}
    .step-content>.notice{padding:10px 12px;font-size:.73rem;line-height:1.5}
  }
  @container remittance-flow (min-height:680px){
    .flow-scroll{gap:20px}.step-heading{gap:10px}.step-heading h2{font-size:1.25rem}
    .fields,.amount-fields{gap:20px}.field-group>input,.asset-field>input,.asset-field>select{min-height:46px}
  }
  @container remittance-flow (min-height:560px) and (min-width:500px){
    .review{gap:8px 20px}.review div{padding:4px 0;gap:4px}.review dt{font-size:.7rem}.review dd{font-size:.8rem;line-height:1.4}
  }
  .summary-content h3{font-size:1rem}.summary-content dl div{font-size:.85rem}
  .summary-content p{font-size:.82rem}.summary-content small{font-size:.73rem}
  .summary-content .eyebrow{font-size:.66rem}
  @media(min-width:1001px) and (max-height:800px){
    .summary-content dl{gap:5px;margin:8px 0}.summary-content dl div{font-size:.8rem}
    .summary-content h3{font-size:.95rem}.summary-content p{font-size:.77rem}.summary-content small{font-size:.69rem}
    .card-heading{margin-bottom:6px}.card-heading .eyebrow{display:none}
  }
  @media(min-width:1001px) and (max-height:740px){
    .flow{padding:10px}.flow-scroll{gap:4px}.step-content{gap:5px}.flow[data-step="3"] .step-heading{gap:3px}
    .review{row-gap:2px}.review div{padding-bottom:2px;gap:1px}.step-content>.notice{padding:6px 8px}
    .summary-content{grid-template-rows:minmax(0,.95fr) minmax(0,1.05fr)}
    .card-heading{margin-bottom:6px}.card-heading .eyebrow{display:none}.card-icon{width:24px;height:24px}
    .summary dl{gap:5px}.comparison p{margin:4px 0}
  }
</style>
