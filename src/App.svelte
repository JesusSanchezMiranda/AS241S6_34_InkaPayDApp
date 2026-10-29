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
  let navOpen = false;
  let navVisible = false;
  let drawerEl = null;
  let menuBtnEl = null;
  let closeTimer = 0;

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

    // Si la ventana crece a escritorio con el menú abierto, se cierra sin animación.
    const desktopQuery = window.matchMedia('(min-width: 901px)');
    const handleDesktopLayout = (event) => {
      if (event.matches && drawerEl?.open) drawerEl.close();
    };
    desktopQuery.addEventListener('change', handleDesktopLayout);

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
      desktopQuery.removeEventListener('change', handleDesktopLayout);
      document.body.classList.remove('nav-open');
      window.clearTimeout(closeTimer);
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

  function openNav() {
    if (!drawerEl || drawerEl.open) return;
    navOpen = true;
    drawerEl.showModal();
    drawerEl.querySelector('.drawer-close')?.focus({ preventScroll: true });
    document.body.classList.add('nav-open');
    // Doble rAF: garantiza que el navegador pinte el estado inicial antes de animar.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        navVisible = true;
      });
    });
  }

  // Espera el fin de la transición antes de cerrar el <dialog>.
  function requestCloseNav() {
    if (!drawerEl?.open) return;
    navVisible = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (drawerEl?.open) drawerEl.close();
    }, reduceMotion ? 0 : 480);
  }

  function handleDrawerClosed() {
    window.clearTimeout(closeTimer);
    navVisible = false;
    document.body.classList.remove('nav-open');
    navOpen = false;
  }

  function handleDrawerCancel(event) {
    event.preventDefault();
    requestCloseNav();
  }

  function handleDrawerClick(event) {
    if (event.target === drawerEl) requestCloseNav();
  }

  // Cierra el ciclo de Tab dentro del panel: el <dialog> nativo puede dejar
  // el foco en <body> al pasar del último control.
  function handleDrawerKeydown(event) {
    if (event.key !== 'Tab' || !drawerEl?.open) return;
    const focusables = [...drawerEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerEl)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawerEl)) {
      event.preventDefault();
      first.focus();
    }
  }

  function goTo(view) {
    navigate(view);
    requestCloseNav();
  }

  function goToLoginFromNav() {
    openLogin();
    requestCloseNav();
  }

  function goToSession() {
    errorMessage = '';
    pendingView = '';
    currentView = 'login';
    requestCloseNav();
  }

  function signOutFromNav() {
    disconnect();
    requestCloseNav();
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
    <button class="brand" onclick={() => navigate('home')} aria-label="InkaPay, ir al inicio">
      <img src={logoImg} alt="" class="brand-logo" width="1024" height="576" decoding="async" />
      <span class="brand-name">InkaPay</span>
    </button>

    <nav class="desktop-nav" aria-label="Navegación principal">
      <button class:active={currentView === 'home'} aria-current={currentView === 'home' ? 'page' : undefined} onclick={() => navigate('home')}>Inicio</button>
      <button class:active={currentView === 'dashboard'} aria-current={currentView === 'dashboard' ? 'page' : undefined} onclick={() => navigate('dashboard')}>Billetera</button>
      <button class:active={currentView === 'remesas'} aria-current={currentView === 'remesas' ? 'page' : undefined} onclick={() => navigate('remesas')}>Remesas</button>
      <button class:active={currentView === 'networks'} aria-current={currentView === 'networks' ? 'page' : undefined} onclick={() => navigate('networks')}>Redes</button>
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

    <button
      class="menu-toggle"
      class:open={navOpen}
      bind:this={menuBtnEl}
      aria-label={navOpen ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={navOpen}
      aria-controls="mobile-nav"
      onclick={() => (navOpen ? requestCloseNav() : openNav())}
    >
      <span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>
  </header>

  <dialog
    class="nav-drawer"
    class:is-open={navVisible}
    id="mobile-nav"
    bind:this={drawerEl}
    aria-labelledby="mobile-nav-title"
    onclick={handleDrawerClick}
    onkeydown={handleDrawerKeydown}
    oncancel={handleDrawerCancel}
    onclose={handleDrawerClosed}
  >
    <div class="drawer-surface">
      <div class="drawer-head">
        <p class="drawer-kicker" id="mobile-nav-title">Menú</p>
        <button class="drawer-close" onclick={requestCloseNav} aria-label="Cerrar menú">
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>

      <nav class="drawer-nav" aria-label="Navegación móvil">
        <button
          class="drawer-link"
          class:active={currentView === 'home'}
          style="--i: 0"
          aria-current={currentView === 'home' ? 'page' : undefined}
          onclick={() => goTo('home')}
        >
          <span class="link-index">01</span>
          <span class="link-label">Inicio</span>
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button
          class="drawer-link"
          class:active={currentView === 'dashboard'}
          style="--i: 1"
          aria-current={currentView === 'dashboard' ? 'page' : undefined}
          onclick={() => goTo('dashboard')}
        >
          <span class="link-index">02</span>
          <span class="link-label">Billetera</span>
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button
          class="drawer-link"
          class:active={currentView === 'remesas'}
          style="--i: 2"
          aria-current={currentView === 'remesas' ? 'page' : undefined}
          onclick={() => goTo('remesas')}
        >
          <span class="link-index">03</span>
          <span class="link-label">Remesas</span>
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
        <button
          class="drawer-link"
          class:active={currentView === 'networks'}
          style="--i: 3"
          aria-current={currentView === 'networks' ? 'page' : undefined}
          onclick={() => goTo('networks')}
        >
          <span class="link-index">04</span>
          <span class="link-label">Redes</span>
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
      </nav>

      <div class="drawer-foot">
        {#if $auth.authenticated}
          <div class="drawer-session">
            <span class="drawer-dot" aria-hidden="true"></span>
            <div>
              <small>Sesión activa</small>
              <strong>{shortAddress($auth.address)}</strong>
            </div>
          </div>
          <button class="drawer-primary" onclick={goToSession}>
            <i class="ri-shield-user-line" aria-hidden="true"></i>
            Ver mi cuenta
          </button>
          <button class="drawer-ghost" onclick={signOutFromNav}>
            <i class="ri-logout-box-r-line" aria-hidden="true"></i>
            Cerrar sesión
          </button>
        {:else}
          <button class="drawer-primary" onclick={goToLoginFromNav}>
            <i class="ri-login-box-line" aria-hidden="true"></i>
            Iniciar sesión
          </button>
          <p class="drawer-note">Wallet no custodial · Elige tu cuenta en Pali</p>
        {/if}
      </div>
    </div>
  </dialog>

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
    padding-top: 12px;
    padding-bottom: 12px;
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

  .desktop-nav {
    display: flex;
    gap: 8px;
    margin-left: auto;
    padding: 4px;
    background: rgba(16, 24, 51, 0.82);
    border: 1px solid rgba(148, 170, 255, 0.15);
    border-radius: 999px;
    backdrop-filter: blur(8px);
  }

  .desktop-nav button {
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

  .desktop-nav button:hover {
    color: #ffffff;
    background: rgba(77, 242, 255, 0.12);
  }

  .desktop-nav button.active {
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
  .session-exit:focus-visible,
  .menu-toggle:focus-visible,
  .drawer-close:focus-visible,
  .drawer-link:focus-visible,
  .drawer-primary:focus-visible,
  .drawer-ghost:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 3px;
  }

  .menu-toggle {
    display: none;
    place-items: center;
    width: 46px;
    height: 46px;
    margin-left: auto;
    flex: none;
    border: 1px solid rgba(148, 170, 255, 0.22);
    border-radius: 14px;
    background: rgba(16, 24, 51, 0.82);
    color: var(--text-primary);
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: border-color 0.25s ease, background 0.25s ease, transform 0.2s ease;
  }

  .menu-toggle:hover {
    border-color: rgba(77, 242, 255, 0.55);
    background: rgba(34, 211, 238, 0.12);
  }

  .menu-toggle:active {
    transform: scale(0.95);
  }

  .menu-bars {
    display: grid;
    gap: 5px;
    width: 20px;
  }

  .menu-bars i {
    display: block;
    height: 2px;
    width: 100%;
    border-radius: 2px;
    background: currentColor;
    transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
  }

  .menu-toggle.open .menu-bars i:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  .menu-toggle.open .menu-bars i:nth-child(2) {
    opacity: 0;
    transform: scaleX(0.2);
  }

  .menu-toggle.open .menu-bars i:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  :global(body.nav-open) {
    overflow: hidden;
  }

  .nav-drawer {
    position: fixed;
    inset: 0 0 0 auto;
    margin: 0;
    padding: 0;
    width: min(90vw, 392px);
    max-width: none;
    height: 100dvh;
    max-height: none;
    border: 0;
    border-left: 1px solid rgba(77, 242, 255, 0.18);
    background: linear-gradient(180deg, #0b1326 0%, #0a0f1f 62%, #080c18 100%);
    box-shadow: -30px 0 80px rgba(2, 6, 18, 0.55);
    color: var(--text-primary);
    overflow: hidden;
    opacity: 0;
    transform: translate3d(100%, 0, 0);
    transition: transform 0.46s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease;
    z-index: 200;
  }

  .nav-drawer.is-open {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .nav-drawer::backdrop {
    background: rgba(4, 8, 20, 0.66);
    backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 0.32s ease;
  }

  .nav-drawer.is-open::backdrop {
    opacity: 1;
  }

  .drawer-surface {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: calc(18px + env(safe-area-inset-top)) 20px calc(22px + env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(148, 170, 255, 0.12);
  }

  .drawer-kicker {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .drawer-close {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(148, 170, 255, 0.18);
    border-radius: 12px;
    background: rgba(16, 24, 51, 0.7);
    color: var(--text-secondary);
    font-size: 1.15rem;
    cursor: pointer;
    transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .drawer-close:hover {
    color: var(--accent-primary);
    border-color: rgba(77, 242, 255, 0.5);
    background: rgba(34, 211, 238, 0.1);
  }

  .drawer-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 22px 0;
  }

  .drawer-link {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 15px 14px;
    border: 0;
    border-radius: 14px;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-heading);
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    text-align: left;
    cursor: pointer;
    opacity: 0;
    transform: translate3d(26px, 0, 0);
    transition: opacity 0.34s ease, transform 0.46s cubic-bezier(0.16, 1, 0.3, 1),
      color 0.2s ease, background 0.2s ease;
    transition-delay: calc(var(--i) * 55ms + 110ms);
  }

  .nav-drawer.is-open .drawer-link {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .drawer-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 2px;
    height: 0;
    border-radius: 2px;
    background: linear-gradient(180deg, #4df2ff 0%, #38bdf8 100%);
    opacity: 0;
    transform: translateY(-50%);
    transition: height 0.3s ease, opacity 0.3s ease;
  }

  .drawer-link:hover {
    color: #ffffff;
    background: rgba(77, 242, 255, 0.06);
  }

  .drawer-link.active {
    color: var(--accent-primary);
    background: rgba(77, 242, 255, 0.07);
  }

  .drawer-link.active::before {
    height: 46%;
    opacity: 1;
    box-shadow: 0 0 14px rgba(77, 242, 255, 0.7);
  }

  .link-index {
    font-family: var(--font-sans);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.5);
  }

  .drawer-link.active .link-index {
    color: rgba(77, 242, 255, 0.75);
  }

  .link-label {
    line-height: 1.1;
  }

  .drawer-link i {
    color: var(--accent-primary);
    font-size: 1rem;
    opacity: 0;
    transform: translateX(-6px);
    transition: opacity 0.2s ease, transform 0.3s ease;
  }

  .drawer-link:hover i,
  .drawer-link.active i {
    opacity: 1;
    transform: translateX(0);
  }

  .drawer-foot {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: auto;
    padding-top: 18px;
    border-top: 1px solid rgba(148, 170, 255, 0.12);
    opacity: 0;
    transform: translate3d(0, 16px, 0);
    transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.34s;
  }

  .nav-drawer.is-open .drawer-foot {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .drawer-session {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 14px;
    border: 1px solid rgba(77, 242, 255, 0.22);
    border-radius: 14px;
    background: rgba(16, 24, 51, 0.7);
  }

  .drawer-session small {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .drawer-session strong {
    display: block;
    margin-top: 2px;
    font-family: var(--font-heading);
    font-size: 1rem;
    color: var(--accent-primary);
  }

  .drawer-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--accent-success);
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
  }

  .drawer-primary,
  .drawer-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    border-radius: 14px;
    font-family: var(--font-sans);
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .drawer-primary {
    border: 1px solid rgba(77, 242, 255, 0.45);
    background: linear-gradient(135deg, #4df2ff 0%, #38bdf8 100%);
    color: #091326;
    box-shadow: 0 8px 24px rgba(77, 242, 255, 0.22);
  }

  .drawer-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(77, 242, 255, 0.34);
  }

  .drawer-primary:active {
    transform: translateY(0) scale(0.99);
  }

  .drawer-ghost {
    border: 1px solid rgba(148, 170, 255, 0.18);
    background: transparent;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .drawer-ghost:hover {
    border-color: rgba(255, 151, 151, 0.5);
    background: rgba(112, 65, 68, 0.28);
    color: #ffb9b9;
  }

  .drawer-note {
    margin: 0;
    text-align: center;
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--text-secondary);
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

  @media (max-width: 900px) {
    .topbar {
      padding: 12px 18px;
      gap: 14px;
    }

    .desktop-nav,
    .account-area {
      display: none;
    }

    .menu-toggle {
      display: grid;
    }
  }

  @media (max-width: 520px) {
    .topbar {
      padding: 10px 14px;
    }

    .brand-logo {
      height: 34px;
    }

    .brand-name {
      font-size: 1.3rem;
    }

    .menu-toggle {
      width: 44px;
      height: 44px;
    }

    .drawer-surface {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-drawer,
    .nav-drawer::backdrop,
    .drawer-link,
    .drawer-foot,
    .menu-bars i {
      transition-duration: 0.01ms !important;
      transition-delay: 0ms !important;
    }
  }
</style>
