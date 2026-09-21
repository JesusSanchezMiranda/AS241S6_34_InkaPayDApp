<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import ConnectButton from '../lib/components/common/ConnectButton.svelte';
  import DotCanvas from '../lib/components/common/DotCanvas.svelte';
  import WaveCanvas from '../lib/components/common/WaveCanvas.svelte';
  import devPhoto from '../assets/developer.jpeg';
  import heroImg from '../assets/ilustration-hero.png';
  import cardImg1 from '../assets/imagen_card1_dapp.png';
  import cardImg2 from '../assets/imagen_card2_dapp.png';
  import cardImg3 from '../assets/imagen_card3_dapp.png';
  import cardImg4 from '../assets/imagen_card4_dapp.png';
  import elejirImg from '../assets/Elejir_InkaPay.png';
  import { createTypewriter } from '../lib/stores/typewriter.js';

  export let onGoToWallet = () => {};

  let photoFailed = false;

  // Frases que cicla la parte variable del título del Hero
  const heroPhrases = [
    'para todos.',
    'sin fronteras.',
    'sin bancos de por medio.',
    'en minutos, no días.'
  ];

  // La frase más larga fija el tamaño del título y evita saltos de layout
  const longestPhrase = heroPhrases.reduce((longest, phrase) => (phrase.length > longest.length ? phrase : longest));

  // Efecto máquina de escribir: escribe, pausa, borra y pasa a la siguiente frase
  const typed = createTypewriter(heroPhrases, { typeSpeed: 70, deleteSpeed: 35, pauseMs: 1800, startDelay: 900 });

  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Extiende las ondas de características hasta la mitad de la sección del desarrollador
    const featuresWrapper = document.querySelector('.features-dev-wrapper');
    const waveWrapper = document.querySelector('.features-wave-wrapper');
    const devSection = document.querySelector('.section-developer');

    const updateWaveHeight = () => {
      if (!featuresWrapper || !waveWrapper || !devSection) return;
      const devMidpoint = devSection.offsetTop + devSection.offsetHeight / 2;
      waveWrapper.style.height = `${Math.round(devMidpoint)}px`;
    };

    updateWaveHeight();
    const waveObserver = new ResizeObserver(updateWaveHeight);
    if (featuresWrapper) waveObserver.observe(featuresWrapper);

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
    heroTl.from('.hero-badge', { y: -20, opacity: 0, delay: 0.1 })
          .from('.hero h1', { y: 30, opacity: 0 }, '-=0.7')
          .from('.hero p', { y: 25, opacity: 0 }, '-=0.7')
          .from('.hero-actions', { y: 20, opacity: 0 }, '-=0.6')
          .from('.hero-img', { scale: 0.88, opacity: 0, duration: 1.2 }, '-=0.9')
          .from('.float-chip', { y: 20, opacity: 0, stagger: 0.12 }, '-=0.8');

    gsap.from('#about .split-card', {
      scrollTrigger: { trigger: '#about', start: 'top 82%', toggleActions: 'play none none reverse' },
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out'
    });

    gsap.from('.objectives-grid .card', {
      scrollTrigger: { trigger: '.objectives-grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      y: 40, opacity: 0, stagger: 0.15, duration: 0.85, ease: 'power3.out'
    });

    gsap.from('.benefits-cards-row .benefit-compact-card', {
      scrollTrigger: { trigger: '.benefits-cards-row', start: 'top 80%', toggleActions: 'play none none reverse' },
      y: 40, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out'
    });

    gsap.from('.features-grid-3x2 .feature-card', {
      scrollTrigger: { trigger: '.features-grid-3x2', start: 'top 82%', toggleActions: 'play none none reverse' },
      y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out'
    });

    gsap.from('.developer-card-container', {
      scrollTrigger: { trigger: '.developer-card-container', start: 'top 85%', toggleActions: 'play none none reverse' },
      scale: 0.94, opacity: 0, duration: 0.9, ease: 'back.out(1.4)'
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      waveObserver.disconnect();
    };
  });
</script>

<main class="container">
  <div class="hero-about-wrapper">
    <div class="dots-extended-wrapper" aria-hidden="true">
      <DotCanvas />
    </div>

    <!-- HERO SECTION -->
    <section class="hero">
      <div class="hero-copy">
        <div class="hero-badge">Pagos digitales hechos para Perú</div>
        <h1>
          <span class="type-ghost" aria-hidden="true">Remesas más justas, {longestPhrase}</span>
          <span class="type-live">Remesas más justas, <span class="type-text">{$typed.text}</span><span class="type-cursor" aria-hidden="true">|</span></span>
        </h1>
        <p>InkaPay conecta personas con una wallet no custodial, multi-red y de bajo costo. Enviar dinero no debería significar perderlo en comisiones ni esperar días.</p>
        <div class="hero-actions">
          <ConnectButton onConnect={onGoToWallet} />
          <a class="secondary-btn" href="#about">Conocer el proyecto</a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-glow" aria-hidden="true"></div>
        <img class="hero-img" src={heroImg} alt="Ilustración 3D de InkaPay" />
        <div class="float-chip chip-usdc" aria-hidden="true"><span class="chip-icon"><i class="ri-coin-line"></i></span> USDC</div>
        <div class="float-chip chip-qr" aria-hidden="true"><span class="chip-icon"><i class="ri-qr-code-line"></i></span> Pago con QR</div>
        <div class="float-chip chip-secure" aria-hidden="true"><span class="chip-icon"><i class="ri-shield-keyhole-line"></i></span> No custodial</div>
        <div class="float-chip chip-fast" aria-hidden="true"><span class="chip-icon"><i class="ri-swap-line"></i></span> Multi-red</div>
      </div>
    </section>

    <!-- 01 · DESCRIPCIÓN -->
    <section id="about" class="section section-about">
      <div class="section-header">
        <h2>Una puerta de entrada a la economía digital.</h2>
      </div>
      <div class="split-card">
        <div class="split-copy">
          <p class="section-intro">
            InkaPay es una infraestructura de pagos no custodial diseñada para conectar a las familias peruanas con transferencias blockchain de bajo costo, alta velocidad y trazabilidad transparente. Mediante la abstracción de redes EVM y UTXO, eliminamos los intermediarios bancarios costosos y los tiempos de espera prolongados de las remesas tradicionales.
          </p>
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="stat-icon"><i class="ri-swap-line"></i></span>
              <div>
                <strong>Multi-red</strong>
                <span>EVM + UTXO unificados</span>
              </div>
            </div>
            <div class="mini-stat">
              <span class="stat-icon"><i class="ri-shield-keyhole-line"></i></span>
              <div>
                <strong>No custodial</strong>
                <span>Tus claves, tu control</span>
              </div>
            </div>
            <div class="mini-stat">
              <span class="stat-icon"><i class="ri-flashlight-line"></i></span>
              <div>
                <strong>Bajo costo</strong>
                <span>Sin comisiones abusivas</span>
              </div>
            </div>
          </div>
        </div>
        <div class="split-visual">
          <div class="mockup-glow" aria-hidden="true"></div>
          <div class="mockup">
            <div class="mockup-bar" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="mockup-label">Balance total</div>
            <div class="mockup-balance">1,250.00 <small>USDC</small></div>
            <div class="mockup-row"><span class="mockup-dot up" aria-hidden="true"><i class="ri-arrow-up-line"></i></span><div class="mockup-line w-58"></div><span class="mockup-pill">Recibido</span></div>
            <div class="mockup-row"><span class="mockup-dot down" aria-hidden="true"><i class="ri-arrow-down-line"></i></span><div class="mockup-line w-40"></div><span class="mockup-pill pending">Pendiente</span></div>
            <div class="mockup-row"><span class="mockup-dot up" aria-hidden="true"><i class="ri-arrow-up-line"></i></span><div class="mockup-line w-48"></div><span class="mockup-pill">Confirmado</span></div>
          </div>
          <div class="float-chip mock-chip-a" aria-hidden="true"><span class="chip-icon"><i class="ri-swap-line"></i></span> Multi-red</div>
          <div class="float-chip mock-chip-b" aria-hidden="true"><span class="chip-icon"><i class="ri-shield-keyhole-line"></i></span> No custodial</div>
        </div>
      </div>
    </section>
  </div>

  <!-- 02 · OBJETIVOS -->
  <section id="objectives" class="section section-objectives">
    <div class="section-header">
      <h2>Metas claras, tecnología simple.</h2>
      <p class="section-intro">Diseñados para transformar la experiencia de envío y recepción de fondos.</p>
    </div>
    <div class="grid objectives-grid">
      <div class="card outline-card">
        <div class="outline-icon-wrap" aria-hidden="true">
          <i class="ri-target-line"></i>
        </div>
        <h3>Objetivo general</h3>
        <p>Crear una wallet accesible y de alto rendimiento que permita transferir valor de forma rápida, segura y con comisiones casi nulas entre cualquier usuario en Perú.</p>
      </div>

      <div class="card outline-card">
        <div class="outline-icon-wrap" aria-hidden="true">
          <i class="ri-checkbox-circle-line"></i>
        </div>
        <h3>Objetivos específicos</h3>
        <p>Integrar la billetera Pali, abstraer la complejidad técnica de varias redes blockchain y ofrecer herramientas transparentes de consulta y movimiento de fondos.</p>
      </div>

      <div class="card outline-card">
        <div class="outline-icon-wrap" aria-hidden="true">
          <i class="ri-group-line"></i>
        </div>
        <h3>Impacto social</h3>
        <p>Impulsar la inclusión financiera y democratizar el acceso a la tecnología Web3 para personas y pequeños negocios sin depender de la banca tradicional.</p>
      </div>
    </div>
  </section>

  <!-- 03 · BENEFICIOS -->
  <section class="section section-alt section-benefits">
    <div class="benefits-header-row">
      <div class="benefits-header-copy">
        <h2>Por qué elegir InkaPay.</h2>
        <p class="section-intro">
          Ventajas competitivas diseñadas para brindar libertad financiera, comisiones transparentes y liquidación instantánea para personas y comercios en todo el Perú.
        </p>
      </div>
      <div class="benefits-header-visual">
        <img src={elejirImg} alt="Por qué elegir InkaPay" class="header-elejir-img" />
      </div>
    </div>
    
    <div class="benefits-cards-row">
      <!-- 01 · BAJO COSTO -->
      <div class="benefit-compact-card theme-lime">
        <div class="compact-glow"></div>
        <div class="compact-visual">
          <img src={cardImg1} alt="Bajo costo" class="compact-img" />
        </div>
        <div class="compact-body">
          <h3 class="compact-title">Bajo costo</h3>
          <div class="compact-desc-wrap">
            <p class="compact-desc">
              Elimina las comisiones excesivas de intermediarios bancarios y conoce el costo exacto de red antes de autorizar cada envío.
            </p>
          </div>
        </div>
      </div>

      <!-- 02 · RAPIDEZ DE LIQUIDACIÓN -->
      <div class="benefit-compact-card theme-indigo">
        <div class="compact-glow"></div>
        <div class="compact-visual">
          <img src={cardImg2} alt="Rapidez de liquidación" class="compact-img" />
        </div>
        <div class="compact-body">
          <h3 class="compact-title">Rapidez de liquidación</h3>
          <div class="compact-desc-wrap">
            <p class="compact-desc">
              Tus transferencias se confirman e instancian en minutos a través de contratos blockchain en lugar de esperar días laborables.
            </p>
          </div>
        </div>
      </div>

      <!-- 03 · INCLUSIÓN FINANCIERA -->
      <div class="benefit-compact-card theme-violet">
        <div class="compact-glow"></div>
        <div class="compact-visual">
          <img src={cardImg3} alt="Inclusión financiera" class="compact-img" />
        </div>
        <div class="compact-body">
          <h3 class="compact-title">Inclusión financiera</h3>
          <div class="compact-desc-wrap">
            <p class="compact-desc">
              Una experiencia digital abierta e intuitiva, accesible para cualquier persona con internet sin requerir historial crediticio.
            </p>
          </div>
        </div>
      </div>

      <!-- 04 · SEGURIDAD NO-CUSTODIAL -->
      <div class="benefit-compact-card theme-cyan">
        <div class="compact-glow"></div>
        <div class="compact-visual">
          <img src={cardImg4} alt="Seguridad no-custodial" class="compact-img" />
        </div>
        <div class="compact-body">
          <h3 class="compact-title">Seguridad no-custodial</h3>
          <div class="compact-desc-wrap">
            <p class="compact-desc">
              Las claves privadas permanecen bajo tu absoluto control local en tu dispositivo; nadie más puede congelar ni mover tus activos.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="features-dev-wrapper">
    <div class="features-wave-wrapper" aria-hidden="true">
      <WaveCanvas />
    </div>

    <!-- 04 · CARACTERÍSTICAS -->
    <section class="section section-features">
      <div class="section-header">
        <h2>Diseñada para crecer contigo.</h2>
        <p class="section-intro">Infraestructura completa adaptada a las necesidades de la economía digital en Perú.</p>
      </div>
      <div class="grid features-grid-3x2">
        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-swap-line"></i></span>
            <h3>Multi-red</h3>
          </div>
          <div class="feature-hover-info">
            <p>Conexión unificada a cadenas EVM y redes UTXO desde una capa de interfaz coherente.</p>
          </div>
        </div>

        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-shield-keyhole-line"></i></span>
            <h3>No custodial</h3>
          </div>
          <div class="feature-hover-info">
            <p>Firma local de transacciones asegurada por Pali Wallet sin custodios centralizados.</p>
          </div>
        </div>

        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-exchange-dollar-line"></i></span>
            <h3>Cash-in / Cash-out</h3>
          </div>
          <div class="feature-hover-info">
            <p>Arquitectura optimizada para conectar rampas de entrada y salida a dinero en efectivo local.</p>
          </div>
        </div>

        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-qr-code-line"></i></span>
            <h3>Pago con QR</h3>
          </div>
          <div class="feature-hover-info">
            <p>Generación y escaneo dinámico de códigos QR para solicitar y realizar pagos al instante.</p>
          </div>
        </div>

        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-history-line"></i></span>
            <h3>Historial On-Chain</h3>
          </div>
          <div class="feature-hover-info">
            <p>Registro transparente e inmutable de cada operación con enlace directo a exploradores de bloques.</p>
          </div>
        </div>

        <div class="card feature-card">
          <div class="feature-default">
            <span class="feature-icon" aria-hidden="true"><i class="ri-wallet-3-line"></i></span>
            <h3>Multi-wallet</h3>
          </div>
          <div class="feature-hover-info">
            <p>Soporte versátil para extensión Pali, wallets Web3 inyectadas y consultas públicas de solo lectura.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 05 · DESARROLLADOR -->
    <section class="section section-alt section-developer">
      <div class="section-header section-header-center">
        <h2>Detrás del proyecto.</h2>
      </div>
      <div class="developer-card-container">
        <div class="developer-photo">
          <div class="photo-glow" aria-hidden="true"></div>
          {#if !photoFailed}
            <img src={devPhoto} alt="Foto del desarrollador Jesús Sánchez" onerror={() => (photoFailed = true)} />
          {:else}
            <div class="avatar-fallback">JS</div>
          {/if}
        </div>
        <h3>Jesús Sánchez</h3>
        <p class="dev-role">Desarrollador Blockchain · Proyecto Universitario InkaPay</p>
        <p class="dev-bio">Apasionado por resolver problemas reales de inclusión financiera mediante tecnología blockchain.</p>
        <div class="social-row">
          <a class="social-btn" href="https://github.com/" target="_blank" rel="noreferrer">
            <i class="ri-github-fill"></i>
            <span>GitHub</span>
          </a>
          <a class="social-btn" href="https://www.linkedin.com/" target="_blank" rel="noreferrer">
            <i class="ri-linkedin-box-fill"></i>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>
    </section>
  </div>
</main>

<style>
  .hero-about-wrapper {
    position: relative;
    width: 100%;
  }

  .dots-extended-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 72%;
    pointer-events: none;
    z-index: 1;
  }

  .container {
    max-width: none;
    width: 100%;
    margin: 0;
    padding: 0;
    position: relative;
    z-index: 2;
  }

  h1, h2, h3 {
    font-family: var(--font-heading);
    letter-spacing: -0.04em;
  }

  h1 {
    font-size: clamp(2.7rem, 7vw, 5.8rem);
    line-height: 0.98;
    max-width: 760px;
    margin: 18px 0;
  }

  h2 {
    font-size: clamp(2rem, 4vw, 3.2rem);
    margin: 0 0 14px;
  }

  h3 {
    margin: 0 0 10px;
    color: #fff;
  }

  p {
    color: var(--text-muted);
    line-height: 1.65;
  }

  .section-header {
    margin-bottom: 64px;
  }

  .section-header-center {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hero {
    position: relative;
    display: grid;
    grid-template-columns: 1.05fr 0.9fr;
    align-items: center;
    gap: 32px;
    min-height: 90vh;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-top: -48px;
    padding: 210px clamp(24px, 6vw, 96px) 160px;
    margin-bottom: 60px;
    background: transparent;
  }

  .hero-copy, .hero-visual {
    position: relative;
    z-index: 3;
  }

  .hero p {
    max-width: 560px;
    font-size: 1.16rem;
  }

  .hero-actions {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    align-items: center;
  }

  .secondary-btn {
    color: var(--text-primary);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 12px;
    padding: 14px 26px;
    font-size: 1rem;
    background: rgba(10, 16, 32, 0.6);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .secondary-btn:hover {
    background: #263b5a;
    border-color: #6a8ba9;
    color: #fff;
  }

  .hero h1 {
    font-size: clamp(2.7rem, 5.2vw, 5rem);
    margin: 20px 0 18px;
    /* Apila el texto visible y el fantasma en la misma celda: el tamaño del título
       queda fijado por la frase más larga y el layout no salta entre frases */
    display: grid;
  }

  .hero h1 > span {
    grid-area: 1 / 1;
  }

  /* Fantasma invisible con la frase más larga: reserva el espacio del título */
  .type-ghost {
    visibility: hidden;
    pointer-events: none;
    user-select: none;
  }

  .type-text {
    color: inherit;
  }

  /* Cursor parpadeante al final del texto */
  .type-cursor {
    display: inline-block;
    margin-left: 4px;
    color: var(--accent-lime);
    font-weight: 700;
    text-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
    animation: cursorBlink 0.5s ease-in-out infinite;
  }

  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 999px;
    border: 1px solid rgba(151, 188, 181, 0.28);
    background: rgba(18, 42, 70, 0.7);
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.74rem;
    font-weight: 700;
  }

  .hero-visual {
    position: relative;
    min-height: 500px;
    display: grid;
    place-items: center;
  }

  .hero-img {
    position: relative;
    z-index: 2;
    width: min(138%, 760px);
    max-width: 760px;
    height: auto;
    transform: scale(1.06);
    filter: drop-shadow(0 32px 70px rgba(2, 10, 24, 0.65));
    animation: heroFloat 7s ease-in-out infinite;
  }

  .hero-glow {
    position: absolute;
    z-index: 1;
    width: 88%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(139, 92, 246, 0.22) 45%, rgba(13, 29, 50, 0) 72%);
    filter: blur(18px);
  }

  .float-chip {
    position: absolute;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary);
    background: rgba(13, 29, 50, 0.82);
    border: 1px solid rgba(151, 188, 181, 0.24);
    box-shadow: 0 10px 26px rgba(2, 10, 24, 0.45);
    backdrop-filter: blur(8px);
  }

  .chip-icon {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.68rem;
    font-weight: 700;
    background: rgba(77, 242, 255, 0.16);
    color: var(--accent-lime);
    flex: none;
  }

  .chip-usdc { top: 9%; left: 2%; animation: heroFloat 8s ease-in-out infinite; }
  .chip-qr { bottom: 13%; left: 4%; animation: heroFloat 6.4s 0.5s ease-in-out infinite; }
  .chip-secure { top: 14%; right: 2%; animation: heroFloat 7.6s 0.8s ease-in-out infinite; }
  .chip-fast { bottom: 16%; right: 4%; animation: heroFloat 6.8s 0.3s ease-in-out infinite; }

  @keyframes heroFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .section {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    padding: 140px clamp(24px, 7vw, 100px);
    scroll-margin-top: 130px;
    position: relative;
    background: transparent;
    border: none;
    transition: background 0.4s ease;
  }

  /* Sección 1 (DESCRIPCIÓN): Transición de difuminado desde la mitad hacia el fondo oscuro */
  .section-about {
    position: relative;
    background: transparent;
    padding-top: 70px;
  }

  .section-about::before {
    content: '';
    position: absolute;
    top: 35%;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    margin-left: calc(50% - 50vw);
    background: linear-gradient(
      180deg,
      rgba(10, 14, 26, 0) 0%,
      rgba(10, 14, 26, 0.5) 35%,
      rgba(10, 14, 26, 0.92) 75%,
      var(--bg-page) 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  .section-about > * {
    position: relative;
    z-index: 2;
  }

  /* Secciones 2, 3, 4 y 5: Fondo de página unificado */
  .hero-about-wrapper ~ .section,
  .hero-about-wrapper ~ .features-dev-wrapper {
    background: var(--bg-page);
  }

  .section-alt {
    background: transparent;
  }

  .section-intro {
    max-width: 680px;
    margin-bottom: 0;
    font-size: 1.05rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 34px;
    align-items: stretch;
  }

  .card {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    height: 100%;
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    border: 1px solid var(--border-card);
    border-radius: 18px;
    padding: 28px 24px;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.3s ease,
                border-color 0.3s ease,
                background 0.3s ease;
  }

  .card:hover {
    border-color: var(--border-card-hover);
    transform: translateY(-4px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 16px 40px rgba(34, 211, 238, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .card p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  /* 01 · DESCRIPCIÓN */
  .split-card {
    position: relative;
    display: grid;
    grid-template-columns: 1.05fr 0.9fr;
    align-items: center;
    gap: 48px;
    background: transparent;
  }

  .split-copy {
    position: relative;
    z-index: 2;
  }

  .mini-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 32px;
  }

  .mini-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(148, 170, 255, 0.16);
    background: rgba(10, 16, 32, 0.6);
  }

  .stat-icon {
    font-size: 1.3rem;
    color: var(--accent-lime);
    flex: none;
  }

  .mini-stat strong {
    display: block;
    font-size: 0.88rem;
    color: #fff;
  }

  .mini-stat span {
    font-size: 0.72rem;
    color: var(--text-secondary);
  }

  .split-visual {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    min-height: 360px;
  }

  .mockup-glow {
    position: absolute;
    z-index: 1;
    width: 70%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(59, 130, 246, 0.2) 45%, transparent 72%);
    filter: blur(12px);
  }

  .mockup {
    position: relative;
    z-index: 2;
    width: min(100%, 380px);
    padding: 22px;
    border-radius: 18px;
    border: 1px solid var(--border-card);
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .mockup-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 18px;
  }

  .mockup-bar span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgba(148, 170, 255, 0.25);
  }

  .mockup-bar span:first-child { background: var(--accent-lime); }

  .mockup-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-secondary);
  }

  .mockup-balance {
    font-family: var(--font-heading);
    font-size: 2.1rem;
    color: #fff;
    margin: 6px 0 18px;
  }

  .mockup-balance small {
    color: var(--accent-lime);
    font-size: 0.9rem;
  }

  .mockup-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(148, 170, 255, 0.12);
  }

  .mockup-row:last-child { border-bottom: 0; }

  .mockup-dot {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-size: 0.7rem;
    flex: none;
    background: rgba(77, 242, 255, 0.14);
    color: var(--accent-lime);
  }

  .mockup-dot.down {
    background: rgba(167, 139, 250, 0.18);
    color: var(--accent-secondary);
  }

  .mockup-line {
    height: 8px;
    border-radius: 99px;
    background: rgba(148, 170, 255, 0.16);
  }

  .w-58 { width: 58%; }
  .w-40 { width: 40%; }
  .w-48 { width: 48%; }

  .mockup-pill {
    margin-left: auto;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-primary);
    padding: 4px 9px;
    border-radius: 99px;
    border: 1px solid rgba(34, 211, 238, 0.3);
    flex: none;
  }

  .mockup-pill.pending {
    color: #ffd27a;
    border-color: rgba(255, 210, 122, 0.3);
  }

  .mock-chip-a { top: 8%; right: 0; animation: heroFloat 7s ease-in-out infinite; }
  .mock-chip-b { bottom: 10%; left: 0; animation: heroFloat 6.2s 0.6s ease-in-out infinite; }

  /* 02 · OBJETIVOS */
  .outline-card {
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    min-height: 300px;
  }

  .outline-card h3 {
    font-size: 1.45rem;
  }

  .outline-card p {
    font-size: 1.04rem;
    line-height: 1.65;
  }

  /* Iluminación de los iconos de objetivos */
  .outline-icon-wrap {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    border: 1px solid rgba(77, 242, 255, 0.3);
    background: rgba(77, 242, 255, 0.08);
    color: var(--accent-lime);
    margin-bottom: 22px;
    box-shadow: 0 0 14px rgba(77, 242, 255, 0.18), inset 0 0 10px rgba(77, 242, 255, 0.1);
    animation: iconPulse 3.2s ease-in-out infinite;
    transition: box-shadow 0.35s ease, border-color 0.35s ease, transform 0.35s ease;
  }

  .outline-icon-wrap i {
    font-size: 1.7rem;
    filter: drop-shadow(0 0 8px rgba(77, 242, 255, 0.55));
  }

  .outline-card:hover .outline-icon-wrap {
    border-color: rgba(77, 242, 255, 0.65);
    box-shadow: 0 0 24px rgba(77, 242, 255, 0.4), inset 0 0 14px rgba(77, 242, 255, 0.2);
    transform: scale(1.08);
  }

  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 14px rgba(77, 242, 255, 0.18), inset 0 0 10px rgba(77, 242, 255, 0.1); }
    50% { box-shadow: 0 0 24px rgba(77, 242, 255, 0.35), inset 0 0 14px rgba(77, 242, 255, 0.18); }
  }

  /* 03 · BENEFICIOS - COMPACT CARDS & INTERACTIVE HOVER */
  .section-benefits {
    position: relative;
    overflow: visible;
  }

  .benefits-header-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 48px;
    margin-bottom: 84px;
  }

  .benefits-header-copy h2 {
    font-size: clamp(2.4rem, 4.5vw, 3.8rem);
    margin: 0 0 18px;
    color: #ffffff;
  }

  .benefits-header-copy .section-intro {
    max-width: 600px;
    font-size: 1.26rem;
    line-height: 1.68;
    color: var(--text-muted, #94a3b8);
    margin: 0;
  }

  .benefits-header-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Glow con blur detrás de la imagen */
  .benefits-header-visual::before {
    content: '';
    position: absolute;
    width: 72%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(139, 92, 246, 0.25) 45%, rgba(13, 29, 50, 0) 72%);
    filter: blur(26px);
    z-index: 1;
    animation: heroFloat 8s ease-in-out infinite;
    pointer-events: none;
  }

  .header-elejir-img {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 580px;
    height: auto;
    object-fit: contain;
    transform: scale(1.05);
    filter: drop-shadow(0 28px 60px rgba(2, 10, 24, 0.65)) drop-shadow(0 0 30px rgba(99, 102, 241, 0.35));
    animation: heroFloat 7.5s ease-in-out infinite;
  }

  .benefits-cards-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 48px; /* Separar las cards un poco */
    align-items: stretch;
    overflow: visible;
  }

  .benefit-compact-card {
    position: relative;
    overflow: visible !important;
    height: 350px;
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    border: 1px solid var(--border-card);
    border-radius: 26px;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    transition: background 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                border-color 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
  }

  /* 3D Visual positioning (Imágenes más grandes y pegadas al lado derecho) */
  .compact-visual {
    position: absolute;
    top: -65px;
    right: -45px;
    width: 340px; /* Imagen aún más grande */
    height: 340px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
    perspective: 900px;
    transition: top 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                right 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                z-index 0s 0.3s;
  }

  .compact-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 20px 32px rgba(0, 0, 0, 0.8));
    transform-style: preserve-3d;
    transition: transform 0.7s cubic-bezier(0.34, 1.2, 0.64, 1),
                filter 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Radial glow behind 3D image */
  .compact-glow {
    position: absolute;
    top: -55px;
    right: -40px;
    width: 340px;
    height: 340px;
    border-radius: 50%;
    filter: blur(34px);
    opacity: 0.65;
    pointer-events: none;
    transition: top 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                right 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .theme-lime .compact-glow {
    background: radial-gradient(circle, rgba(77, 242, 255, 0.5) 0%, rgba(34, 197, 94, 0.3) 50%, transparent 75%);
  }

  .theme-indigo .compact-glow {
    background: radial-gradient(circle, rgba(99, 102, 241, 0.55) 0%, rgba(139, 92, 246, 0.3) 50%, transparent 75%);
  }

  .theme-violet .compact-glow {
    background: radial-gradient(circle, rgba(168, 85, 247, 0.55) 0%, rgba(217, 70, 239, 0.3) 50%, transparent 75%);
  }

  .theme-cyan .compact-glow {
    background: radial-gradient(circle, rgba(6, 182, 212, 0.55) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 75%);
  }

  /* Card Body (Información centrada) */
  .compact-body {
    position: relative;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    transform: translateY(0);
    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .compact-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.3;
    transition: color 0.3s ease;
  }

  .compact-desc-wrap {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.05s;
  }

  .compact-desc {
    margin: 10px 0 0 0;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--text-muted, #94a3b8);
  }

  /* HOVER INTERACTION: la imagen gira y se intercambia con la tarjeta (pasa al fondo) mientras la info sube y se centra */

  .benefit-compact-card:hover {
    border-color: var(--border-card-hover);
    transform: translateY(-5px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 16px 40px rgba(34, 211, 238, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .theme-lime:hover,
  .theme-indigo:hover,
  .theme-violet:hover,
  .theme-cyan:hover {
    border-color: var(--border-card-hover);
  }

  /* a) La imagen gira (flip 3D) viajando al centro de la tarjeta y queda DETRÁS del contenido */
  .benefit-compact-card:hover .compact-visual {
    z-index: 1;
    top: calc(50% - 170px);
    right: calc(50% - 170px);
  }

  .benefit-compact-card:hover .compact-img {
    opacity: 0.14;
    transform: rotateY(180deg) rotate(20deg) scale(0.8);
    filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.55));
  }

  .benefit-compact-card:hover .compact-glow {
    z-index: 0;
    top: calc(50% - 170px);
    right: calc(50% - 170px);
    opacity: 0.35;
    filter: blur(40px);
  }

  /* b) El contenido pasa al frente y sube al centro de la tarjeta */
  .benefit-compact-card:hover .compact-body {
    transform: translateY(-130px);
  }

  /* c) La descripción se expande debajo del título centrado */
  .benefit-compact-card:hover .compact-desc-wrap {
    max-height: 160px;
    opacity: 1;
  }

  /* 04 · CARACTERÍSTICAS & WAVE ANIMATION */
  .features-dev-wrapper {
    position: relative;
    width: 100%;
  }

  .features-wave-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    /* Respaldo: JS ajusta esta altura hasta la mitad exacta de la sección del desarrollador */
    height: 76%;
    pointer-events: none;
    z-index: 0;
  }

  .section-features {
    position: relative;
    overflow: visible;
  }

  .features-grid-3x2 {
    grid-template-columns: repeat(3, 1fr);
    position: relative;
    z-index: 2;
    gap: 38px;
  }

  .feature-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 230px;
    padding: 36px 28px;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    border: 1px solid var(--border-card);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease, background 0.35s ease;
  }

  .feature-default {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
  }

  .feature-icon {
    font-size: 2.6rem;
    color: var(--accent-lime);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.4s ease, opacity 0.35s ease, filter 0.35s ease;
    filter: drop-shadow(0 0 10px rgba(77, 242, 255, 0.35));
  }

  .feature-card h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffffff;
    transition: opacity 0.3s ease, transform 0.35s ease;
  }

  .feature-hover-info {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 120px 28px 28px;
    opacity: 0;
    transform: scale(0.92) translateY(10px);
    pointer-events: none;
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .feature-hover-info p {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.65;
    color: var(--text-primary);
    text-align: center;
  }

  .feature-card:hover {
    border-color: var(--border-card-hover);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 16px 40px rgba(34, 211, 238, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transform: translateY(-6px);
  }

  .feature-card:hover .feature-default {
    opacity: 1;
    transform: translateY(-58px) scale(0.9);
  }

  .feature-card:hover .feature-icon {
    font-size: 1.6rem;
  }

  .feature-card:hover .feature-hover-info {
    opacity: 1;
    transform: scale(1) translateY(0);
    pointer-events: auto;
  }

  /* 05 · DESARROLLADOR */
  .developer-card-container {
    max-width: 650px;
    margin: 0 auto;
    padding: 44px 36px;
    border-radius: 24px;
    border: 1px solid var(--border-card);
    background: var(--bg-card);
    background: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease, background 0.35s ease;
  }

  .developer-card-container:hover {
    border-color: var(--border-card-hover);
    transform: translateY(-4px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      0 16px 40px rgba(34, 211, 238, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .developer-photo {
    position: relative;
    width: 120px;
    height: 120px;
    margin-bottom: 18px;
  }

  .developer-photo img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(77, 242, 255, 0.6);
  }

  .avatar-fallback {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #2b3a6e 0%, #172448 100%);
    color: var(--accent-lime);
    display: grid;
    place-items: center;
    font-family: var(--font-heading);
    font-size: 2.2rem;
    font-weight: 700;
    border: 2px solid rgba(77, 242, 255, 0.6);
  }

  .photo-glow {
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(77, 242, 255, 0.35) 0%, rgba(139, 92, 246, 0.25) 50%, transparent 72%);
    filter: blur(12px);
  }

  .developer-card-container h3 {
    font-size: 1.6rem;
    color: #fff;
    margin: 4px 0;
  }

  .dev-role {
    color: var(--accent-primary);
    font-size: 0.95rem;
    font-weight: 500;
    margin: 0 0 10px;
  }

  .dev-bio {
    max-width: 480px;
    font-size: 0.95rem;
    color: var(--text-muted);
    margin: 0 0 24px;
    line-height: 1.55;
  }

  .social-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .social-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 999px;
    padding: 10px 22px;
    background: rgba(10, 16, 32, 0.7);
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s, transform 0.2s;
  }

  .social-btn:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-2px);
  }

  @media (max-width: 900px) {
    .features-grid-3x2 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 800px) {
    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
      padding: 100px 20px 48px;
      margin-top: 0;
      gap: 16px;
    }
    .hero p { max-width: none; }
    .hero-visual { min-height: 320px; margin-top: 12px; }
    .hero-img { width: min(100%, 380px); }
    .float-chip { font-size: 0.72rem; padding: 7px 11px; }
    .chip-usdc { top: 2%; left: 0; }
    .chip-qr { bottom: 6%; left: 0; }
    .chip-secure { top: 4%; right: 0; }
    .chip-fast { bottom: 9%; right: 0; }
    .split-card { grid-template-columns: 1fr; gap: 24px; }
    .split-visual { min-height: 300px; margin-top: 10px; }
    .mini-stats { grid-template-columns: 1fr; }
    .grid, .features-grid-3x2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 1100px) {
    .benefits-cards-row {
      grid-template-columns: repeat(2, 1fr);
      gap: 52px 24px;
    }
  }

  @media (max-width: 768px) {
    .benefits-header-row {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .benefits-header-visual {
      justify-content: center;
    }

    .header-elejir-img {
      max-width: 260px;
    }

    .benefits-cards-row {
      grid-template-columns: 1fr;
      gap: 52px;
    }

    .benefit-compact-card {
      height: auto;
      min-height: 280px;
      padding: 56px 24px 28px 24px;
    }
  }

  @media (max-width: 520px) {
    .section { padding: 60px 18px; }
    .developer-card-container { padding: 32px 20px; }
    .mockup { padding: 18px; border-radius: 16px; }
    .mockup-balance { font-size: 1.7rem; }
  }
</style>
