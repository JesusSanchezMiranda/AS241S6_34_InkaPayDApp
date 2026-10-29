<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { auth, signIn, signOut, describeAuthError } from '../lib/stores/auth.js'
  import { wallet } from '../lib/stores/wallet.js'
  import { selectedNetwork } from '../lib/stores/network.js'
  import logoImg from '../assets/logo_inkapay.webp'

  export let onLoggedIn = () => {}
  export let onSignOut = () => {}
  export let onGoHome = () => {}
  export let redirectLabel = ''

  let providerAvailable = false
  let checkingProvider = true
  let busy = false
  let busyLabel = 'Elige tu cuenta en Pali…'
  let localError = ''
  let copied = false
  let copiedTimer = 0

  const shortAddress = (value) => (value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '')
  const formatDate = (value) => new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  $: networkName = $auth.authenticated
    ? ($wallet.network?.name || $auth.networkName || $selectedNetwork.name)
    : $selectedNetwork.name

  $: if ($auth.authenticated) localError = ''

  onMount(() => {
    let detectionTimer = 0

    const detectProvider = () => {
      if (typeof window === 'undefined') return
      providerAvailable = Boolean(window.ethereum)
      if (providerAvailable) {
        checkingProvider = false
        window.clearTimeout(detectionTimer)
      }
    }

    detectProvider()
    window.addEventListener('ethereum#initialized', detectProvider, { once: true })
    // Algunas extensiones inyectan el provider después del primer render.
    detectionTimer = window.setTimeout(() => {
      if (!providerAvailable) detectProvider()
      checkingProvider = false
    }, 1200)

    return () => {
      window.removeEventListener('ethereum#initialized', detectProvider)
      window.clearTimeout(detectionTimer)
      window.clearTimeout(copiedTimer)
    }
  })

  async function handleSignIn() {
    if (busy || !providerAvailable) return
    busy = true
    busyLabel = 'Elige tu cuenta en Pali…'
    localError = ''
    try {
      const snapshot = await signIn()
      await onLoggedIn(snapshot)
    } catch (error) {
      localError = get(auth).error || describeAuthError(error)
    } finally {
      busy = false
    }
  }

  async function copyAddress() {
    if (!$auth.address) return
    try {
      await navigator.clipboard.writeText($auth.address)
      copied = true
      window.clearTimeout(copiedTimer)
      copiedTimer = window.setTimeout(() => (copied = false), 1800)
    } catch {
      localError = 'No se pudo copiar la dirección. Selecciónala y cópiala manualmente.'
    }
  }

  function handleSignOut() {
    signOut()
    onSignOut()
  }
</script>

<main class="login-page">
  <div class="aurora" aria-hidden="true"></div>
  <div class="grid-glow" aria-hidden="true"></div>

  <section class="login-layout">
    <div class="login-copy">
      <div class="eyebrow"><span class="section-index">01</span> Acceso con wallet</div>
      <h1>Tu cuenta Web3,<br /><span class="gradient-text">sin contraseñas.</span></h1>
      <p class="lead">
        Elige la cuenta con la que quieres operar en InkaPay. Pali abrirá su selector y entrarás directo,
        sin firmar mensajes ni enviar transacciones.
      </p>

      <ul class="trust-list">
        <li>
          <span class="trust-icon" aria-hidden="true"><i class="ri-shield-keyhole-line"></i></span>
          <div><strong>No custodial</strong><span>InkaPay no guarda claves privadas ni frases de recuperación.</span></div>
        </li>
        <li>
          <span class="trust-icon" aria-hidden="true"><i class="ri-user-shared-line"></i></span>
          <div><strong>Elige tu cuenta</strong><span>Pali muestra tus cuentas y tú decides con cuál entrar.</span></div>
        </li>
        <li>
          <span class="trust-icon" aria-hidden="true"><i class="ri-time-line"></i></span>
          <div><strong>Sesión de 24 horas</strong><span>Se guarda en este navegador y puedes cerrarla cuando quieras.</span></div>
        </li>
      </ul>

      <div class="network-note">
        <span class="network-dot" aria-hidden="true"></span>
        <span>Red activa en esta sesión: <strong>{networkName}</strong></span>
      </div>
    </div>

    <section class="login-panel" aria-label="Iniciar sesión en InkaPay">
      <div class="panel-head">
        <div class="panel-brand">
          <img src={logoImg} alt="InkaPay" width="1024" height="576" decoding="async" />
          <div><strong>InkaPay</strong><span>Acceso a tu wallet</span></div>
        </div>
        <span class="status-pill" class:active={$auth.authenticated}>
          <i class={$auth.authenticated ? 'ri-checkbox-circle-fill' : 'ri-lock-line'} aria-hidden="true"></i>
          {$auth.authenticated ? 'Sesión activa' : 'Sin sesión'}
        </span>
      </div>

      {#if $auth.authenticated}
        <div class="session-view" aria-live="polite">
          <span class="session-icon" aria-hidden="true"><i class="ri-shield-check-line"></i></span>
          <h2>Bienvenido de nuevo</h2>
          <p class="panel-sub">Tu wallet está conectada y la sesión está activa en este navegador.</p>

          <div class="account-card">
            <span class="account-label">Cuenta conectada</span>
            <div class="account-row">
              <code title={$auth.address}>{shortAddress($auth.address)}</code>
              <button type="button" class="copy-btn" onclick={copyAddress} aria-label="Copiar mi dirección pública">
                <i class={copied ? 'ri-check-line' : 'ri-file-copy-line'} aria-hidden="true"></i>
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div class="account-meta">
              <span><i class="ri-global-line" aria-hidden="true"></i> {networkName}</span>
              <span><i class="ri-calendar-check-line" aria-hidden="true"></i> Hasta {formatDate($auth.expiresAt)}</span>
            </div>
          </div>

          <button type="button" class="submit-btn" onclick={() => onLoggedIn(null)} disabled={busy}>
            <i class="ri-wallet-3-line" aria-hidden="true"></i>
            Ir a mi billetera
          </button>
          <button type="button" class="secondary-btn" onclick={handleSignOut}>
            <i class="ri-logout-box-r-line" aria-hidden="true"></i>
            Cerrar sesión
          </button>
        </div>
      {:else}
        <div class="login-form" aria-live="polite">
          <h2>Inicia sesión con tu wallet</h2>
          <p class="panel-sub">Pulsa el botón y elige tu cuenta en Pali. Entrarás directo a InkaPay, sin firmar mensajes.</p>

          <div class="wallet-card" class:detected={providerAvailable}>
            <span class="wallet-icon" aria-hidden="true"><i class="ri-wallet-3-line"></i></span>
            <div class="wallet-info">
              <strong>Pali Wallet</strong>
              <span>También MetaMask u otra wallet EVM</span>
            </div>
            {#if checkingProvider}
              <span class="wallet-status checking">Buscando…</span>
            {:else if providerAvailable}
              <span class="wallet-status ok"><i class="ri-checkbox-circle-fill" aria-hidden="true"></i> Detectada</span>
            {:else}
              <span class="wallet-status missing"><i class="ri-error-warning-line" aria-hidden="true"></i> No detectada</span>
            {/if}
          </div>

          {#if !checkingProvider && !providerAvailable}
            <div class="alert warning" role="status">
              <i class="ri-plugin-line" aria-hidden="true"></i>
              <span>No encontramos una wallet EVM en este navegador. Instala o activa <a href="https://paliwallet.com/" target="_blank" rel="noreferrer">Pali Wallet</a> y recarga la página.</span>
            </div>
          {/if}

          {#if localError}
            <div class="alert error" role="alert">
              <i class="ri-error-warning-line" aria-hidden="true"></i>
              <span>{localError}</span>
            </div>
          {/if}

          <button type="button" class="submit-btn" onclick={handleSignIn} disabled={busy || !providerAvailable}>
            {#if busy}
              <span class="spinner" aria-hidden="true"></span>
              {busyLabel}
            {:else}
              <i class="ri-wallet-3-line" aria-hidden="true"></i>
              Iniciar sesión
            {/if}
          </button>

          {#if redirectLabel}
            <p class="redirect-note"><i class="ri-arrow-right-line" aria-hidden="true"></i> Al iniciar sesión continuarás a <strong>{redirectLabel}</strong>.</p>
          {/if}

          <ol class="steps" aria-label="Pasos para iniciar sesión">
            <li><span>1</span> Pulsa el botón</li>
            <li><span>2</span> Elige tu cuenta</li>
            <li><span>3</span> Entra a InkaPay</li>
          </ol>

          <p class="fine-print">
            No se firma ningún mensaje ni se envía ninguna transacción. InkaPay solo crea una sesión local de 24 horas en este navegador.
          </p>

          <button type="button" class="link-btn" onclick={onGoHome}>Explorar InkaPay sin iniciar sesión</button>
        </div>
      {/if}
    </section>
  </section>
</main>

<style>
  .login-page {
    position: relative;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    padding: 128px var(--workspace-gutter) 64px;
    overflow-x: clip;
  }

  .aurora,
  .grid-glow {
    position: absolute;
    pointer-events: none;
  }

  .aurora {
    top: -18%;
    left: 42%;
    width: min(900px, 90vw);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, rgba(167, 139, 250, 0.1) 42%, transparent 70%);
    filter: blur(36px);
  }

  .grid-glow {
    inset: 0;
    background-image:
      linear-gradient(rgba(148, 170, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 170, 255, 0.045) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: radial-gradient(circle at 50% 42%, #000 0%, transparent 68%);
    -webkit-mask-image: radial-gradient(circle at 50% 42%, #000 0%, transparent 68%);
    opacity: 0.65;
  }

  .login-layout {
    position: relative;
    z-index: 1;
    width: min(1160px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.82fr);
    align-items: center;
    gap: clamp(36px, 6vw, 92px);
  }

  .login-copy {
    min-width: 0;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent-primary);
  }

  .eyebrow::before {
    content: '';
    width: 28px;
    height: 1px;
    background: linear-gradient(90deg, var(--accent-primary), transparent);
  }

  .section-index {
    font-family: var(--font-heading);
    font-size: 1rem;
    letter-spacing: 0.04em;
    color: var(--text-primary);
    opacity: 0.55;
  }

  h1 {
    margin: 18px 0 20px;
    font-family: var(--font-heading);
    font-size: clamp(2.5rem, 5vw, 4.4rem);
    line-height: 1.02;
    letter-spacing: -0.045em;
  }

  .gradient-text {
    background: linear-gradient(110deg, #4df2ff 0%, #38bdf8 42%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .lead {
    max-width: 58ch;
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.02rem;
    line-height: 1.68;
  }

  .trust-list {
    list-style: none;
    margin: 34px 0 0;
    padding: 0;
    border-top: 1px solid var(--border-panel);
  }

  .trust-list li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 2px;
    border-bottom: 1px solid var(--border-panel);
  }

  .trust-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: none;
    border-radius: 12px;
    border: 1px solid rgba(34, 211, 238, 0.28);
    background: rgba(34, 211, 238, 0.08);
    color: var(--accent-primary);
    font-size: 1.2rem;
  }

  .trust-list strong {
    display: block;
    margin-bottom: 2px;
    color: var(--text-primary);
    font-family: var(--font-heading);
    font-size: 0.96rem;
  }

  .trust-list span:not(.trust-icon) {
    display: block;
    color: var(--text-secondary);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .network-note {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 24px;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .network-note strong {
    color: var(--accent-primary);
    font-weight: 600;
  }

  .network-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--accent-success);
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.7);
  }

  .login-panel {
    position: relative;
    padding: clamp(22px, 2.8vw, 32px);
    border: 1px solid var(--border-panel);
    border-radius: var(--radius-panel);
    background: var(--surface-panel);
    box-shadow: var(--shadow-panel);
    overflow: hidden;
  }

  .login-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 92px;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  }

  .login-panel::after {
    content: '';
    position: absolute;
    right: -28%;
    bottom: -32%;
    width: 68%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(167, 139, 250, 0.14) 0%, transparent 70%);
    pointer-events: none;
  }

  .panel-head {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 16px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--border-panel);
  }

  .panel-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .panel-brand img {
    width: 38px;
    height: 38px;
    object-fit: contain;
    filter: drop-shadow(0 0 12px rgba(77, 242, 255, 0.35));
  }

  .panel-brand strong {
    display: block;
    font-family: var(--font-heading);
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  .panel-brand span {
    display: block;
    color: var(--text-secondary);
    font-size: 0.7rem;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    padding: 5px 10px;
    border: 1px solid var(--border-input);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 0.68rem;
    font-weight: 600;
  }

  .status-pill.active {
    border-color: rgba(52, 211, 153, 0.4);
    background: rgba(52, 211, 153, 0.1);
    color: var(--accent-success);
  }

  .login-form,
  .session-view {
    position: relative;
    z-index: 1;
  }

  h2 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: clamp(1.55rem, 2.4vw, 2rem);
    letter-spacing: -0.035em;
  }

  .panel-sub {
    margin: 6px 0 18px;
    color: var(--text-secondary);
    font-size: 0.84rem;
    line-height: 1.6;
  }

  .wallet-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border-input);
    border-radius: var(--radius-control);
    background: var(--surface-input);
  }

  .wallet-card.detected {
    border-color: rgba(34, 211, 238, 0.3);
  }

  .wallet-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: none;
    border-radius: 11px;
    background: rgba(34, 211, 238, 0.1);
    color: var(--accent-primary);
    font-size: 1.2rem;
  }

  .wallet-info {
    min-width: 0;
  }

  .wallet-info strong {
    display: block;
    font-size: 0.88rem;
  }

  .wallet-info span {
    display: block;
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 0.7rem;
    line-height: 1.4;
  }

  .wallet-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    flex: none;
    font-size: 0.68rem;
    font-weight: 600;
  }

  .wallet-status.ok { color: var(--accent-success); }
  .wallet-status.missing { color: #ffd27a; }
  .wallet-status.checking { color: var(--text-secondary); }

  .alert {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 14px;
    padding: 11px 13px;
    border-radius: var(--radius-control);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .alert i {
    margin-top: 1px;
    flex: none;
    font-size: 1rem;
  }

  .alert.warning {
    border: 1px solid rgba(255, 210, 122, 0.3);
    background: rgba(255, 210, 122, 0.08);
    color: #ffe0a3;
  }

  .alert.error {
    border: 1px solid rgba(255, 151, 151, 0.32);
    background: rgba(112, 65, 68, 0.3);
    color: #ffd1d1;
  }

  .alert a {
    color: #ffe0a3;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .submit-btn,
  .secondary-btn,
  .link-btn {
    font-family: var(--font-sans);
    cursor: pointer;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    width: 100%;
    margin-top: 18px;
    padding: 13px 18px;
    border: 0;
    border-radius: var(--radius-control);
    background: linear-gradient(135deg, #4df2ff 0%, #38bdf8 100%);
    color: #071827;
    font-size: 0.88rem;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(34, 211, 238, 0.22);
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(34, 211, 238, 0.32);
  }

  .submit-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .secondary-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 10px;
    padding: 11px 18px;
    border: 1px solid var(--border-input);
    border-radius: var(--radius-control);
    background: rgba(11, 18, 38, 0.7);
    color: var(--text-primary);
    font-size: 0.82rem;
    font-weight: 600;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .secondary-btn:hover {
    border-color: var(--accent-primary);
    background: rgba(34, 211, 238, 0.07);
  }

  .link-btn {
    display: block;
    width: 100%;
    margin-top: 10px;
    padding: 4px;
    border: 0;
    background: none;
    color: var(--text-secondary);
    font-size: 0.74rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .link-btn:hover {
    color: var(--accent-primary);
  }

  .submit-btn:focus-visible,
  .secondary-btn:focus-visible,
  .link-btn:focus-visible,
  .copy-btn:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 3px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    flex: none;
    border: 2px solid rgba(7, 24, 39, 0.28);
    border-top-color: #071827;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .redirect-note {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 12px 0 0;
    color: var(--text-secondary);
    font-size: 0.72rem;
  }

  .redirect-note strong {
    color: var(--accent-primary);
  }

  .steps {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    list-style: none;
    margin: 16px 0 0;
    padding: 12px 0 0;
    border-top: 1px solid var(--border-panel);
  }

  .steps li {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary);
    font-size: 0.66rem;
    line-height: 1.3;
  }

  .steps span {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: 1px solid var(--border-input);
    border-radius: 50%;
    color: var(--accent-primary);
    font-family: var(--font-heading);
    font-size: 0.6rem;
    font-weight: 700;
  }

  .fine-print {
    margin: 12px 0 0;
    color: var(--text-secondary);
    font-size: 0.66rem;
    line-height: 1.5;
    opacity: 0.8;
  }

  .session-view {
    text-align: center;
  }

  .session-icon {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin: 4px auto 14px;
    border-radius: 50%;
    border: 1px solid rgba(52, 211, 153, 0.35);
    background: rgba(52, 211, 153, 0.1);
    color: var(--accent-success);
    font-size: 1.9rem;
    box-shadow: 0 0 26px rgba(52, 211, 153, 0.16);
  }

  .session-view .panel-sub {
    margin-bottom: 20px;
  }

  .account-card {
    padding: 16px;
    border: 1px solid var(--border-input);
    border-radius: var(--radius-control);
    background: var(--surface-input);
    text-align: left;
  }

  .account-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .account-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 7px;
  }

  .account-row code {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--accent-primary);
    font-family: 'Space Grotesk', monospace;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    padding: 5px 9px;
    border: 1px solid var(--border-input);
    border-radius: 8px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 0.68rem;
    cursor: pointer;
  }

  .copy-btn:hover {
    border-color: var(--accent-primary);
  }

  .account-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 12px;
    padding-top: 11px;
    border-top: 1px solid var(--border-panel);
    color: var(--text-secondary);
    font-size: 0.7rem;
  }

  .account-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .account-meta i {
    color: var(--accent-secondary);
  }

  @media (max-width: 1000px) {
    .login-page {
      padding-top: 108px;
      padding-bottom: 48px;
      align-items: flex-start;
    }

    .login-layout {
      grid-template-columns: 1fr;
      gap: 32px;
      max-width: 620px;
    }

    .login-copy h1 {
      font-size: clamp(2.3rem, 7vw, 3.4rem);
    }

    .trust-list {
      margin-top: 24px;
    }

    .network-note {
      margin-top: 16px;
    }
  }

  @media (min-width: 1001px) and (max-height: 820px) {
    .login-page {
      padding-top: 104px;
      padding-bottom: 28px;
    }

    .login-panel {
      padding: 22px 28px;
    }

    .panel-head {
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    h1 {
      margin: 14px 0;
      font-size: clamp(2.4rem, 4vw, 3.7rem);
    }

    .lead {
      font-size: 0.95rem;
      line-height: 1.55;
    }

    .trust-list {
      margin-top: 20px;
    }

    .trust-list li {
      padding: 11px 2px;
    }

    .trust-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      font-size: 1.05rem;
    }

    .network-note {
      margin-top: 16px;
    }

    .panel-sub {
      margin: 6px 0 16px;
    }

    .submit-btn {
      margin-top: 14px;
      padding: 11px 16px;
    }

    .steps {
      margin-top: 16px;
      padding-top: 12px;
    }

    .fine-print {
      margin-top: 12px;
    }
  }

  @media (max-width: 560px) {
    .login-page {
      padding: 150px 16px 36px;
    }

    .login-panel {
      order: -1;
      padding: 20px 18px;
    }

    .panel-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .steps {
      flex-direction: column;
      align-items: flex-start;
      gap: 9px;
    }

    .steps li {
      flex-direction: row;
      align-items: center;
    }

    .wallet-card {
      flex-wrap: wrap;
    }

    .wallet-status {
      margin-left: 52px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 1.6s;
    }
    .submit-btn,
    .secondary-btn {
      transition: none;
    }
  }
</style>
