<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Home from './pages/Home.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Networks from './pages/Networks.svelte';
  import Remesas from './views/Remesas.svelte';
  import Login from './pages/Login.svelte';
  import { subscribeToPaliEvents } from './lib/services/evmWallet.js';
  import { setConnectedWallet, disconnectWallet, refreshWallet } from './lib/stores/wallet.js';
  import { selectNetwork } from './lib/stores/network.js';
  import { auth, signIn, signOut, restoreAuthSession } from './lib/stores/auth.js';
  import { getNetworkByChainId } from './lib/config/networks.js';
  import logoImg from './assets/logo_inkapay.webp';

  const protectedViews = new Set(['dashboard', 'remesas']);
  let currentView = 'home';
  let pendingView = '';
  let errorMessage = '';
  let unsubscribe = () => {};
  let isScrolled = false;

  const shortAddress = (address) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  async function applyWalletSnapshot(snapshot) {
    if (!snapshot) return;
    await setConnectedWallet(snapshot);
    if (snapshot.network?.type === 'evm' && snapshot.network.chainId) selectNetwork(snapshot.network);
  }

  function navigate(view) {
    if (view === 'home') pendingView = '';
    if (protectedViews.has(view) && !get(auth).authenticated) {
      pendingView = view;
      currentView = 'login';
      return;
    }
    currentView = view;
  }

  onMount(() => {
    let ticking = false;
    let frameId = 0;

    // Throttle con requestAnimationFrame: el estado del navbar se evalúa una vez por frame
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      frameId = requestAnimationFrame(() => {
        isScrolled = window.scrollY > 60;
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const handleWalletEvent = async ({ accounts, chainId }) => {
      const currentAuth = get(auth);
      // La sesión es la fuente de verdad: sin login no se adopta una cuenta por evento.
      if (!currentAuth.authenticated) return;

      const authorized = Array.isArray(accounts) ? accounts : [];

      if (!authorized.length) {
        signOut();
        disconnectWallet();
        errorMessage = 'Tu wallet se desconectó. Inicia sesión de nuevo para continuar.';
        if (protectedViews.has(currentView)) {
          pendingView = currentView;
          currentView = 'login';
        }
        return;
      }

      // Puede haber varias cuentas autorizadas; la sesión sigue válida si conserva la suya.
      if (!authorized.some((account) => account.toLowerCase() === currentAuth.address.toLowerCase())) {
        signOut();
        disconnectWallet();
        errorMessage = 'La cuenta con la que iniciaste sesión ya no está autorizada en tu wallet. Inicia sesión con la cuenta que quieras usar.';
        if (protectedViews.has(currentView)) {
          pendingView = currentView;
          currentView = 'login';
        }
        return;
      }

      try {
        const activeNetwork = getNetworkByChainId(chainId) || { id: `evm-${chainId}`, name: `Red ${chainId}`, type: 'evm', chainId, symbol: 'ETH', decimals: 18 };
        selectNetwork(activeNetwork);
        await refreshWallet({ address: currentAuth.address, chainId });
      } catch { errorMessage = 'No pudimos actualizar la cuenta o la red. Vuelve a conectar Pali.'; }
    };

    const attachWalletEvents = () => {
      unsubscribe();
      unsubscribe = subscribeToPaliEvents(handleWalletEvent);
    };

    attachWalletEvents();

    // Algunas extensiones inyectan el provider después de montar la app.
    // Si hay una sesión guardada, se reintenta la restauración sin abrir diálogos.
    let restoring = false;
    let retryPending = false;
    const retryRestore = async () => {
      if (restoring) {
        retryPending = true;
        return;
      }
      if (get(auth).authenticated) return;
      restoring = true;
      try {
        const snapshot = await restoreAuthSession();
        await applyWalletSnapshot(snapshot);
      } catch {
        errorMessage = 'No pudimos restaurar la sesión guardada. Inicia sesión de nuevo.';
      } finally {
        restoring = false;
        if (retryPending) {
          retryPending = false;
          retryRestore();
        }
      }
    };

    retryRestore();

    const handleProviderReady = () => {
      attachWalletEvents();
      retryRestore();
    };
    window.addEventListener('ethereum#initialized', handleProviderReady);

    // Cierra la sesión en cuanto vence, aunque la pestaña siga abierta.
    const expiryTimer = window.setInterval(() => {
      const currentAuth = get(auth);
      if (!currentAuth.authenticated || Number(currentAuth.expiresAt) > Date.now()) return;
      signOut();
      disconnectWallet();
      errorMessage = 'Tu sesión expiró. Inicia sesión de nuevo para continuar.';
      pendingView = protectedViews.has(currentView) ? currentView : '';
      currentView = 'login';
    }, 60000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('ethereum#initialized', handleProviderReady);
      window.clearInterval(expiryTimer);
      cancelAnimationFrame(frameId);
      unsubscribe();
    };
  });

  async function connect() {
    errorMessage = '';
    try {
      const snapshot = await signIn();
      await applyWalletSnapshot(snapshot);
      if (currentView === 'login') currentView = pendingView || 'dashboard';
      else if (currentView !== 'remesas') currentView = 'dashboard';
    } catch (error) {
      errorMessage = get(auth).error || error?.message || 'No fue posible iniciar sesión.';
    }
  }

  function goToWalletOrLogin() {
    if (get(auth).authenticated) {
      currentView = 'dashboard';
      return;
    }
    openLogin();
  }

  async function handleLoggedIn(snapshot) {
    errorMessage = '';
    await applyWalletSnapshot(snapshot);
    currentView = pendingView || 'dashboard';
    pendingView = '';
  }

  function handleSignOut() {
    signOut();
    disconnectWallet();
    errorMessage = '';
    pendingView = '';
    currentView = 'home';
  }

  function disconnect() {
    signOut();
    disconnectWallet();
    errorMessage = '';
    pendingView = '';
    currentView = 'home';
  }

  function openLogin() {
    errorMessage = '';
    pendingView = '';
    currentView = 'login';
  }

  // Al cambiar de sección, llevar la vista al inicio de la nueva sección
  $: if (typeof window !== 'undefined' && currentView) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
</script>

<svelte:head>
  <title>InkaPay | Wallet blockchain para Perú</title>
  <meta name="description" content="Wallet no custodial multi-red para remesas accesibles en Perú." />
</svelte:head>

<div class="app-shell" class:finance-view={currentView !== 'home'}>
  <header class="topbar" class:scrolled={isScrolled}>
    <button class="brand" onclick={() => navigate('home')} aria-label="Ir al inicio">
      <img src={logoImg} alt="InkaPay Logo" class="brand-logo" width="1024" height="576" decoding="async" />
      <span class="brand-name">InkaPay</span>
    </button>

    <nav aria-label="Navegación principal">
      <button class:active={currentView === 'home'} onclick={() => navigate('home')}>Inicio</button>
      <button class:active={currentView === 'dashboard'} onclick={() => navigate('dashboard')}>Billetera</button>
      <button class:active={currentView === 'remesas'} onclick={() => navigate('remesas')}>Remesas</button>
      <button class:active={currentView === 'networks'} onclick={() => navigate('networks')}>Redes</button>
    </nav>

    <div class="account-area">
      {#if $auth.authenticated}
        <button class="account-chip" class:active={currentView === 'login'} onclick={() => { pendingView = ''; currentView = 'login'; }} title="Ver sesión y cuenta conectada">
          <span class="account-dot" aria-hidden="true"></span>
          <span class="account-address">{shortAddress($auth.address)}</span>
        </button>
        <button class="session-exit" onclick={disconnect} aria-label="Cerrar sesión" title="Cerrar sesión">
          <i class="ri-logout-box-r-line" aria-hidden="true"></i>
        </button>
      {:else}
        <button class="login-cta" class:active={currentView === 'login'} onclick={openLogin} aria-label="Iniciar sesión">
          <i class="ri-login-box-line" aria-hidden="true"></i>
          <span>Iniciar sesión</span>
        </button>
      {/if}
    </div>
  </header>

  {#if errorMessage}
    <div class="global-error" role="alert">{errorMessage}</div>
  {/if}

  {#if currentView === 'home'}
    <Home onGoToWallet={goToWalletOrLogin} />
  {:else if currentView === 'login'}
    <Login
      onLoggedIn={handleLoggedIn}
      onSignOut={handleSignOut}
      onGoHome={() => navigate('home')}
      redirectLabel={pendingView === 'remesas' ? 'Remesas' : pendingView === 'dashboard' ? 'Billetera' : ''}
    />
  {:else if currentView === 'dashboard'}
    <Dashboard onDisconnect={disconnect} onConnect={connect} />
  {:else if currentView === 'remesas'}
    <Remesas onConnect={connect} />
  {:else}
    <Networks />
  {/if}
</div>

<style>
  .app-shell {
    min-height: 100vh;
  }

  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 100;
    padding: 18px clamp(24px, 5vw, 64px);
    display: flex;
    align-items: center;
    gap: 28px;
    /* Estado inicial: se funde con el Hero, sin fondo, borde ni sombra */
    background: transparent;
    border-bottom: 1px solid transparent;
    box-shadow: none;
    transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease;
  }

  /* Estado con scroll: barra flotante. Evita backdrop-filter a ancho completo,
     que obliga a recalcular el desenfoque en cada fotograma de desplazamiento. */
  .topbar.scrolled {
    padding: 14px clamp(24px, 5vw, 64px);
    background: rgba(10, 14, 26, 0.88);
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
    box-shadow: 0 16px 40px rgba(2, 8, 20, 0.65);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    background: none;
    cursor: pointer;
    padding: 0;
    text-decoration: none;
  }

  .brand-logo {
    height: 40px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 0 14px rgba(77, 242, 255, 0.5));
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.35s ease;
  }

  .brand:hover .brand-logo {
    transform: scale(1.1) rotate(-3deg);
    filter: drop-shadow(0 0 20px rgba(77, 242, 255, 0.75));
  }

  .brand-name {
    font-family: var(--font-heading);
    font-size: 1.45rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    position: relative;
    display: inline-block;
    background: linear-gradient(
      110deg,
      #4df2ff 0%,
      #4df2ff 35%,
      #ffffff 50%,
      #a855f7 65%,
      #a855f7 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
    animation: shimmerGlow 3.5s linear infinite;
    filter: drop-shadow(0 2px 10px rgba(77, 242, 255, 0.35));
  }

  @keyframes shimmerGlow {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .topbar nav {
    display: flex;
    gap: 8px;
    margin-left: auto;
    padding: 4px;
    background: rgba(16, 24, 51, 0.82);
    border: 1px solid rgba(148, 170, 255, 0.15);
    border-radius: 999px;
    backdrop-filter: blur(8px);
  }

  .topbar nav button {
    border: 0;
    background: transparent;
    color: #a6bbb1;
    padding: 9px 20px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.92rem;
    font-weight: 500;
    transition: color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.25s;
  }

  .topbar nav button:hover {
    color: #ffffff;
    background: rgba(77, 242, 255, 0.12);
  }

  .topbar nav button.active {
    color: #091326;
    font-weight: 700;
    background: linear-gradient(135deg, #4df2ff 0%, #38bdf8 100%);
    box-shadow: 0 4px 18px rgba(77, 242, 255, 0.35);
  }

  .account-area {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
  }

  .login-cta,
  .account-chip,
  .session-exit {
    font-family: var(--font-sans);
    cursor: pointer;
    transition: transform 0.2s ease, background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .login-cta {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid rgba(77, 242, 255, 0.45);
    border-radius: 999px;
    padding: 9px 18px;
    background: linear-gradient(135deg, #4df2ff 0%, #38bdf8 100%);
    color: #091326;
    font-size: 0.88rem;
    font-weight: 700;
    box-shadow: 0 4px 18px rgba(77, 242, 255, 0.3);
  }

  .login-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba(77, 242, 255, 0.42);
  }

  .login-cta.active {
    box-shadow: 0 0 0 2px rgba(10, 14, 26, 0.9), 0 0 0 3px rgba(77, 242, 255, 0.55);
  }

  .account-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid rgba(77, 242, 255, 0.25);
    border-radius: 999px;
    padding: 8px 14px;
    background: rgba(16, 24, 51, 0.82);
    color: var(--accent-primary);
    font-size: 0.82rem;
    font-weight: 600;
    backdrop-filter: blur(8px);
  }

  .account-chip:hover,
  .account-chip.active {
    border-color: rgba(77, 242, 255, 0.6);
    background: rgba(34, 211, 238, 0.12);
  }

  .account-dot {
    width: 7px;
    height: 7px;
    flex: none;
    border-radius: 50%;
    background: var(--accent-success);
    box-shadow: 0 0 9px rgba(52, 211, 153, 0.8);
  }

  .session-exit {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(148, 170, 255, 0.22);
    border-radius: 50%;
    background: rgba(16, 24, 51, 0.82);
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .session-exit:hover {
    border-color: rgba(255, 151, 151, 0.55);
    background: rgba(112, 65, 68, 0.35);
    color: #ffb9b9;
  }

  .login-cta:focus-visible,
  .account-chip:focus-visible,
  .session-exit:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 3px;
  }

  .global-error {
    max-width: 1100px;
    margin: 95px auto 16px;
    padding: 14px 20px;
    border-radius: 14px;
    background: #59262a;
    color: #ffd1d1;
    border: 1px solid rgba(255, 151, 151, 0.3);
  }

  @media (max-width: 1000px) {
    .topbar {
      gap: 16px;
    }
  }

  @media (max-width: 800px) {
    .topbar {
      padding: 14px 20px;
      flex-wrap: wrap;
    }
    .topbar nav {
      order: 3;
      width: 100%;
      justify-content: space-around;
      margin-top: 8px;
    }
    .account-area {
      order: 2;
      margin-left: auto;
    }
  }

  @media (max-width: 520px) {
    .topbar {
      gap: 12px;
      padding: 12px 16px;
    }
    .brand-logo {
      height: 32px;
    }
    .brand-name {
      font-size: 1.25rem;
    }
    .login-cta {
      padding: 8px 12px;
      font-size: 0.76rem;
    }
    .login-cta span {
      display: none;
    }
    .login-cta i {
      font-size: 1rem;
    }
    .account-chip {
      padding: 7px 10px;
      font-size: 0.74rem;
    }
    .topbar nav {
      gap: 4px;
      overflow-x: auto;
      justify-content: flex-start;
      border-radius: 14px;
    }
    .topbar nav button {
      padding: 7px 14px;
      font-size: 0.84rem;
    }
  }
</style>
