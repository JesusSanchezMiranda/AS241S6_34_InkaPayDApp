<script>
  import { onMount } from 'svelte';
  import Home from './pages/Home.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Networks from './pages/Networks.svelte';
  import { connectPaliWallet, subscribeToPaliEvents } from './lib/services/evmWallet.js';
  import { setConnectedWallet, disconnectWallet, refreshWallet } from './lib/stores/wallet.js';
  import logoImg from './assets/logo_inkapay.png';

  let currentView = 'home';
  let errorMessage = '';
  let unsubscribe = () => {};
  let isScrolled = false;

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

    unsubscribe = subscribeToPaliEvents(async ({ accounts, chainId }) => {
      if (!accounts?.length) return disconnectWallet();
      await refreshWallet({ address: accounts[0], chainId });
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frameId);
      unsubscribe();
    };
  });

  async function connect() {
    errorMessage = '';
    try {
      const result = await connectPaliWallet();
      await setConnectedWallet(result);
      currentView = 'dashboard';
    } catch (error) {
      errorMessage = error?.message || 'No fue posible conectar Pali Wallet.';
    }
  }

  function disconnect() {
    disconnectWallet();
    currentView = 'home';
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

<div class="app-shell">
  <header class="topbar" class:scrolled={isScrolled}>
    <button class="brand" onclick={() => (currentView = 'home')} aria-label="Ir al inicio">
      <img src={logoImg} alt="InkaPay Logo" class="brand-logo" />
      <span class="brand-name">InkaPay</span>
    </button>

    <nav aria-label="Navegación principal">
      <button class:active={currentView === 'home'} onclick={() => (currentView = 'home')}>Inicio</button>
      <button class:active={currentView === 'dashboard'} onclick={() => (currentView = 'dashboard')}>Billetera</button>
      <button class:active={currentView === 'networks'} onclick={() => (currentView = 'networks')}>Redes</button>
    </nav>
  </header>

  {#if errorMessage}
    <div class="global-error" role="alert">{errorMessage}</div>
  {/if}

  {#if currentView === 'home'}
    <Home onGoToWallet={() => (currentView = 'dashboard')} />
  {:else if currentView === 'dashboard'}
    <Dashboard onDisconnect={disconnect} onConnect={connect} />
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
    transition: background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease;
  }

  /* Estado con scroll: barra flotante con efecto vidrio esmerilado */
  .topbar.scrolled {
    padding: 14px clamp(24px, 5vw, 64px);
    background: rgba(10, 14, 26, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
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
    background: rgba(16, 24, 51, 0.65);
    border: 1px solid rgba(148, 170, 255, 0.15);
    border-radius: 999px;
    backdrop-filter: blur(12px);
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

  .global-error {
    max-width: 1100px;
    margin: 95px auto 16px;
    padding: 14px 20px;
    border-radius: 14px;
    background: #59262a;
    color: #ffd1d1;
    border: 1px solid rgba(255, 151, 151, 0.3);
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
