<script>
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import ConnectButton from '../lib/components/common/ConnectButton.svelte';
  import DotCanvas from '../lib/components/common/DotCanvas.svelte';
  import WaveCanvas from '../lib/components/common/WaveCanvas.svelte';
  import devPhoto from '../assets/developer.webp';
  import heroImg from '../assets/ilustration-hero.webp';
  import cardImg1 from '../assets/imagen_card1_dapp.webp';
  import cardImg2 from '../assets/imagen_card2_dapp.webp';
  import cardImg3 from '../assets/imagen_card3_dapp.webp';
  import cardImg4 from '../assets/imagen_card4_dapp.webp';
  import elejirImg from '../assets/Elejir_InkaPay.webp';
  import featMultired from '../assets/multired.webp';
  import featNocustodial from '../assets/nocustodial.webp';
  import featCash from '../assets/cash-in-cash-out.webp';
  import featQr from '../assets/pagoQr.webp';
  import featHistory from '../assets/historial.webp';
  import featWallet from '../assets/multiwallet.webp';
  import { createTypewriter } from '../lib/stores/typewriter.js';

  export let onGoToWallet = () => {};

  let photoFailed = false;

  // Sección 04 · Carrusel 3D de características
  const features = [
    {
      title: 'Multi-red',
      icon: 'ri-swap-line',
      img: featMultired,
      accent: '#22d3ee',
      glow: 'rgba(34, 211, 238, 0.45)',
      desc: 'Conexión unificada a cadenas EVM y redes UTXO desde una capa de interfaz coherente.'
    },
    {
      title: 'No custodial',
      icon: 'ri-shield-keyhole-line',
      img: featNocustodial,
      accent: '#a78bfa',
      glow: 'rgba(167, 139, 250, 0.45)',
      desc: 'Firma local de transacciones asegurada por Pali Wallet sin custodios centralizados.'
    },
    {
      title: 'Cash-in / Cash-out',
      icon: 'ri-exchange-dollar-line',
      img: featCash,
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.4)',
      desc: 'Arquitectura optimizada para conectar rampas de entrada y salida a dinero en efectivo local.'
    },
    {
      title: 'Pago con QR',
      icon: 'ri-qr-code-line',
      img: featQr,
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.45)',
      desc: 'Generación y escaneo dinámico de códigos QR para solicitar y realizar pagos al instante.'
    },
    {
      title: 'Historial On-Chain',
      icon: 'ri-history-line',
      img: featHistory,
      accent: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.45)',
      desc: 'Registro transparente e inmutable de cada operación con enlace directo a exploradores de bloques.'
    },
    {
      title: 'Multi-wallet',
      icon: 'ri-wallet-3-line',
      img: featWallet,
      accent: '#d946ef',
      glow: 'rgba(217, 70, 239, 0.4)',
      desc: 'Soporte versátil para extensión Pali, wallets Web3 inyectadas y consultas públicas de solo lectura.'
    }
  ];

  const featureCount = features.length;
  let activeFeature = 0;
  let carouselPaused = false;
  let carouselInView = false;
  let touchStartX = 0;

  // Desplazamiento con envoltura para que el carrusel muestre tarjetas a ambos lados.
  function featureOffset(i, active) {
    let d = i - active;
    const half = featureCount / 2;
    if (d > half) d -= featureCount;
    else if (d < -half) d += featureCount;
    return d;
  }

  function goToFeature(i) {
    activeFeature = (i + featureCount) % featureCount;
  }

  function nextFeature() {
    goToFeature(activeFeature + 1);
  }

  function prevFeature() {
    goToFeature(activeFeature - 1);
  }

  function onCarouselTouchStart(event) {
    touchStartX = event.touches[0].clientX;
  }

  function onCarouselTouchEnd(event) {
    const dx = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) nextFeature();
    else prevFeature();
  }

  async function onCarouselKeydown(event) {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowRight') nextFeature();
    else if (event.key === 'ArrowLeft') prevFeature();
    else if (event.key === 'Home') goToFeature(0);
    else goToFeature(featureCount - 1);
    const carousel = event.currentTarget.closest('.feature-carousel');
    await tick();
    carousel?.querySelector('.feature-slide.is-active')?.focus();
  }

  // Posición de cada tarjeta respecto a la activa (reactivo al carrusel).
  $: featureSlides = features.map((feature, i) => {
    const offset = featureOffset(i, activeFeature);
    return { ...feature, i, offset, abs: Math.abs(offset) };
  });

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

    // Las secciones posteriores al hero respetan la preferencia de movimiento reducido.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
      // Cabeceras editoriales: numeración, eyebrow y título entran escalonados.
      gsap.utils.toArray('.section-head').forEach((head) => {
        gsap.from(gsap.utils.toArray(head.children), {
          scrollTrigger: { trigger: head, start: 'top 85%', toggleActions: 'play none none reverse' },
          y: 26, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out'
        });
      });

      gsap.from(gsap.utils.toArray('.split-card > *'), {
        scrollTrigger: { trigger: '#about .split-card', start: 'top 82%', toggleActions: 'play none none reverse' },
        y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out'
      });

      gsap.from('.objective-feature', {
        scrollTrigger: { trigger: '.objectives-grid', start: 'top 82%', toggleActions: 'play none none reverse' },
        y: 42, opacity: 0, duration: 0.9, ease: 'power3.out'
      });

      gsap.from('.objective-row', {
        scrollTrigger: { trigger: '.objectives-grid', start: 'top 78%', toggleActions: 'play none none reverse' },
        x: 34, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out'
      });

      gsap.from(gsap.utils.toArray('.benefits-head > *'), {
        scrollTrigger: { trigger: '.benefits-layout', start: 'top 82%', toggleActions: 'play none none reverse' },
        y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out'
      });

      gsap.from('.benefit-card', {
        scrollTrigger: { trigger: '.benefits-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
        y: 42, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out'
      });

      gsap.from('.feature-carousel', {
        scrollTrigger: { trigger: '.feature-carousel', start: 'top 82%', toggleActions: 'play none none reverse' },
        y: 44, opacity: 0, duration: 0.9, ease: 'power3.out'
      });

      gsap.from('.developer-card-container', {
        scrollTrigger: { trigger: '.developer-card-container', start: 'top 85%', toggleActions: 'play none none reverse' },
        y: 42, opacity: 0, duration: 0.9, ease: 'power3.out'
      });
    }

    // Carrusel 04: avance automático suave; se pausa al interactuar, fuera de vista
    // o si el usuario prefiere movimiento reducido.
    const carousel = document.querySelector('.feature-carousel');
    let carouselAutoplayId;
    let carouselObserver;

    if (carousel) {
      carouselObserver = new IntersectionObserver(
        (entries) => { carouselInView = entries[0].isIntersecting; },
        { threshold: 0.35 }
      );
      carouselObserver.observe(carousel);

      if (!reduceMotion) {
        carouselAutoplayId = window.setInterval(() => {
          if (!carouselPaused && carouselInView && !document.hidden) nextFeature();
        }, 5200);
      }
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      waveObserver.disconnect();
      if (carouselAutoplayId) window.clearInterval(carouselAutoplayId);
      if (carouselObserver) carouselObserver.disconnect();
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
        <img class="hero-img" src={heroImg} alt="Ilustración 3D de InkaPay" width="1024" height="975" fetchpriority="high" decoding="async" />
        <div class="float-chip chip-usdc" aria-hidden="true"><span class="chip-icon"><i class="ri-coin-line"></i></span> USDC</div>
        <div class="float-chip chip-qr" aria-hidden="true"><span class="chip-icon"><i class="ri-qr-code-line"></i></span> Pago con QR</div>
        <div class="float-chip chip-secure" aria-hidden="true"><span class="chip-icon"><i class="ri-shield-keyhole-line"></i></span> No custodial</div>
        <div class="float-chip chip-fast" aria-hidden="true"><span class="chip-icon"><i class="ri-swap-line"></i></span> Multi-red</div>
      </div>
    </section>

    <!-- 01 · DESCRIPCIÓN -->
    <section id="about" class="section section-about">
      <div class="section-head">
        <div class="eyebrow"><span class="section-index">01</span> El proyecto</div>
        <h2>Una puerta de entrada a la economía digital.</h2>
      </div>
      <div class="split-card">
        <div class="split-copy">
          <p class="section-intro">
            InkaPay es una infraestructura de pagos no custodial diseñada para conectar a las familias peruanas con transferencias blockchain de bajo costo, alta velocidad y trazabilidad transparente. Mediante la abstracción de redes EVM y UTXO, eliminamos los intermediarios bancarios costosos y los tiempos de espera prolongados de las remesas tradicionales.
          </p>
          <ul class="mini-stats">
            <li class="mini-stat">
              <span class="stat-icon"><i class="ri-swap-line"></i></span>
              <div>
                <strong>Multi-red</strong>
                <span>EVM + UTXO unificados</span>
              </div>
            </li>
            <li class="mini-stat">
              <span class="stat-icon"><i class="ri-shield-keyhole-line"></i></span>
              <div>
                <strong>No custodial</strong>
                <span>Tus claves, tu control</span>
              </div>
            </li>
            <li class="mini-stat">
              <span class="stat-icon"><i class="ri-flashlight-line"></i></span>
              <div>
                <strong>Bajo costo</strong>
                <span>Sin comisiones abusivas</span>
              </div>
            </li>
          </ul>
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
    <div class="section-head">
      <div class="eyebrow"><span class="section-index">02</span> Objetivos</div>
      <h2>Metas claras, tecnología simple.</h2>
      <p class="section-intro">Diseñados para transformar la experiencia de envío y recepción de fondos.</p>
    </div>

    <div class="objectives-grid">
      <article class="objective-feature">
        <span class="objective-num" aria-hidden="true">01</span>
        <div class="outline-icon-wrap" aria-hidden="true">
          <i class="ri-target-line"></i>
        </div>
        <h3>Objetivo general</h3>
        <p>Crear una wallet accesible y de alto rendimiento que permita transferir valor de forma rápida, segura y con comisiones casi nulas entre cualquier usuario en Perú.</p>
      </article>

      <div class="objective-list">
        <article class="objective-row">
          <span class="objective-num" aria-hidden="true">02</span>
          <div class="outline-icon-wrap" aria-hidden="true">
            <i class="ri-checkbox-circle-line"></i>
          </div>
          <div class="objective-row-copy">
            <h3>Objetivos específicos</h3>
            <p>Integrar la billetera Pali, abstraer la complejidad técnica de varias redes blockchain y ofrecer herramientas transparentes de consulta y movimiento de fondos.</p>
          </div>
        </article>

        <article class="objective-row">
          <span class="objective-num" aria-hidden="true">03</span>
          <div class="outline-icon-wrap" aria-hidden="true">
            <i class="ri-group-line"></i>
          </div>
          <div class="objective-row-copy">
            <h3>Impacto social</h3>
            <p>Impulsar la inclusión financiera y democratizar el acceso a la tecnología Web3 para personas y pequeños negocios sin depender de la banca tradicional.</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- 03 · BENEFICIOS -->
  <section class="section section-alt section-benefits">
    <div class="benefits-layout">
      <div class="benefits-head">
        <div class="eyebrow"><span class="section-index">03</span> Beneficios</div>
        <h2>Por qué elegir InkaPay.</h2>
        <p class="section-intro">
          Ventajas competitivas diseñadas para brindar libertad financiera, comisiones transparentes y liquidación instantánea para personas y comercios en todo el Perú.
        </p>
        <div class="benefits-head-visual">
          <img src={elejirImg} alt="Por qué elegir InkaPay" class="header-elejir-img" width="956" height="830" loading="lazy" decoding="async" />
        </div>
      </div>

      <div class="benefits-grid">
        <!-- 01 · BAJO COSTO -->
        <article class="benefit-card theme-lime">
          <span class="benefit-num" aria-hidden="true">01</span>
          <div class="benefit-media">
            <div class="benefit-glow" aria-hidden="true"></div>
            <img src={cardImg1} alt="Ilustración de bajo costo" width="465" height="425" loading="lazy" decoding="async" />
          </div>
          <div class="benefit-body">
            <h3>Bajo costo</h3>
            <p>Elimina las comisiones excesivas de intermediarios bancarios y conoce el costo exacto de red antes de autorizar cada envío.</p>
          </div>
        </article>

        <!-- 02 · RAPIDEZ DE LIQUIDACIÓN -->
        <article class="benefit-card theme-indigo">
          <span class="benefit-num" aria-hidden="true">02</span>
          <div class="benefit-media">
            <div class="benefit-glow" aria-hidden="true"></div>
            <img src={cardImg2} alt="Ilustración de rapidez de liquidación" width="445" height="429" loading="lazy" decoding="async" />
          </div>
          <div class="benefit-body">
            <h3>Rapidez de liquidación</h3>
            <p>Tus transferencias se confirman e instancian en minutos a través de contratos blockchain en lugar de esperar días laborables.</p>
          </div>
        </article>

        <!-- 03 · INCLUSIÓN FINANCIERA -->
        <article class="benefit-card theme-violet">
          <span class="benefit-num" aria-hidden="true">03</span>
          <div class="benefit-media">
            <div class="benefit-glow" aria-hidden="true"></div>
            <img src={cardImg3} alt="Ilustración de inclusión financiera" width="436" height="412" loading="lazy" decoding="async" />
          </div>
          <div class="benefit-body">
            <h3>Inclusión financiera</h3>
            <p>Una experiencia digital abierta e intuitiva, accesible para cualquier persona con internet sin requerir historial crediticio.</p>
          </div>
        </article>

        <!-- 04 · SEGURIDAD NO-CUSTODIAL -->
        <article class="benefit-card theme-cyan">
          <span class="benefit-num" aria-hidden="true">04</span>
          <div class="benefit-media">
            <div class="benefit-glow" aria-hidden="true"></div>
            <img src={cardImg4} alt="Ilustración de seguridad no-custodial" width="475" height="473" loading="lazy" decoding="async" />
          </div>
          <div class="benefit-body">
            <h3>Seguridad no-custodial</h3>
            <p>Las claves privadas permanecen bajo tu absoluto control local en tu dispositivo; nadie más puede congelar ni mover tus activos.</p>
          </div>
        </article>
      </div>
    </div>
  </section>

  <div class="features-dev-wrapper">
    <div class="features-wave-wrapper" aria-hidden="true">
      <WaveCanvas />
    </div>

    <!-- 04 · CARACTERÍSTICAS -->
    <section class="section section-features">
      <div class="section-head">
        <div class="eyebrow"><span class="section-index">04</span> Características</div>
        <h2>Diseñada para crecer contigo.</h2>
        <p class="section-intro">Infraestructura completa adaptada a las necesidades de la economía digital en Perú.</p>
      </div>

      <div
        class="feature-carousel"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Características de InkaPay"
        onmouseenter={() => (carouselPaused = true)}
        onmouseleave={() => (carouselPaused = false)}
        onfocusin={() => (carouselPaused = true)}
        onfocusout={() => (carouselPaused = false)}
        ontouchstart={onCarouselTouchStart}
        ontouchend={onCarouselTouchEnd}
      >
        <div class="carousel-stage">
          {#each featureSlides as slide (slide.title)}
            <button
              type="button"
              class="feature-slide"
              class:is-active={slide.offset === 0}
              class:is-far={slide.abs > 2}
              style="--offset:{slide.offset}; --abs:{slide.abs}; --accent:{slide.accent}; --accent-glow:{slide.glow}; z-index:{50 - slide.abs}; pointer-events:{slide.abs > 2 ? 'none' : 'auto'}"
              tabindex={slide.offset === 0 ? 0 : -1}
              aria-hidden={slide.abs > 2 ? 'true' : undefined}
              aria-label={`${slide.title}. ${slide.desc}`}
              onclick={() => goToFeature(slide.i)}
              onkeydown={onCarouselKeydown}
            >
              <span class="slide-media">
                <span class="slide-glow" aria-hidden="true"></span>
                <img src={slide.img} alt={`Característica: ${slide.title}`} width="720" height="720" loading="lazy" decoding="async" />
              </span>
              <span class="slide-body">
                <span class="slide-head">
                  <span class="slide-icon" aria-hidden="true"><i class={slide.icon}></i></span>
                  <span class="slide-index" aria-hidden="true">{String(slide.i + 1).padStart(2, '0')}</span>
                </span>
                <span class="slide-title">{slide.title}</span>
                <span class="slide-desc">{slide.desc}</span>
              </span>
            </button>
          {/each}
        </div>

        <div class="carousel-controls">
          <button class="carousel-arrow" type="button" onclick={prevFeature} aria-label="Característica anterior">
            <i class="ri-arrow-left-s-line" aria-hidden="true"></i>
          </button>

          <div class="carousel-dots">
            {#each features as feature, i}
              <button
                class="carousel-dot"
                class:is-active={i === activeFeature}
                type="button"
                aria-label={`Ir a ${feature.title}`}
                onclick={() => goToFeature(i)}
                aria-current={i === activeFeature ? 'true' : undefined}
              ></button>
            {/each}
          </div>

          <button class="carousel-arrow" type="button" onclick={nextFeature} aria-label="Siguiente característica">
            <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- 05 · DESARROLLADOR -->
    <section class="section section-alt section-developer">
      <div class="section-head">
        <div class="eyebrow"><span class="section-index">05</span> El desarrollador</div>
        <h2>Detrás del proyecto.</h2>
      </div>
      <div class="developer-card-container">
        <div class="developer-photo">
          <div class="photo-glow" aria-hidden="true"></div>
          {#if !photoFailed}
            <img src={devPhoto} alt="Foto del desarrollador Jesús Sánchez" width="855" height="1337" loading="lazy" decoding="async" onerror={() => (photoFailed = true)} />
          {:else}
            <div class="avatar-fallback">JS</div>
          {/if}
        </div>
        <div class="developer-info">
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

    /* Tokens locales de la landing, derivados de la paleta existente. */
    --l-rule: rgba(148, 163, 184, 0.14);
    --l-rule-strong: rgba(148, 163, 184, 0.28);
    --l-panel: linear-gradient(135deg, var(--bg-card) 0%, color-mix(in srgb, var(--bg-card) 85%, black) 100%);
    --l-shadow-panel: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    --l-shadow-panel-hover: 0 4px 8px rgba(0, 0, 0, 0.4), 0 16px 40px rgba(34, 211, 238, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    --l-radius-panel: 20px;
    --l-frame: 1240px;
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

  /* Cabecera editorial común: numeral + eyebrow + titular + entradilla. */
  .section-head {
    display: grid;
    gap: 14px;
    max-width: 780px;
    margin-bottom: 72px;
  }

  .section-head h2 {
    margin: 0;
  }

  .section-head .section-intro {
    max-width: 640px;
    margin: 0;
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

  /* Numeral de sección: anclaje editorial, se repite como firma del sistema. */
  .section-index {
    font-family: var(--font-heading);
    font-size: 1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    color: var(--text-primary);
    opacity: 0.55;
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
    /* El filtro se rasteriza una vez y la flotación se anima en el compositor. */
    will-change: transform;
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
    list-style: none;
    margin: 36px 0 0;
    padding: 0;
    border-top: 1px solid var(--l-rule);
  }

  .mini-stat {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 2px;
    border-bottom: 1px solid var(--l-rule);
    transition: padding-left 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease;
  }

  .mini-stat:hover {
    padding-left: 12px;
    border-color: var(--l-rule-strong);
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

  /* 02 · OBJETIVOS: panel destacado + lista editorial con guías verticales */
  .objectives-grid {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 30px;
    align-items: stretch;
  }

  .objective-feature {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 360px;
    padding: 96px 36px 40px;
    border-radius: var(--l-radius-panel);
    border: 1px solid var(--border-card);
    background: var(--l-panel);
    box-shadow: var(--l-shadow-panel);
    transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease;
  }

  .objective-feature::after {
    content: '';
    position: absolute;
    right: -30%;
    bottom: -55%;
    width: 70%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34, 211, 238, 0.16) 0%, rgba(167, 139, 250, 0.12) 45%, transparent 72%);
    pointer-events: none;
  }

  .objective-feature:hover {
    border-color: var(--border-card-hover);
    box-shadow: var(--l-shadow-panel-hover);
    transform: translateY(-4px);
  }

  .objective-num {
    font-family: var(--font-heading);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--accent-primary);
    opacity: 0.7;
  }

  .objective-feature .objective-num {
    position: absolute;
    top: 32px;
    left: 36px;
  }

  .objective-feature h3 {
    position: relative;
    z-index: 1;
    font-size: 1.7rem;
    margin: 22px 0 12px;
  }

  .objective-feature p {
    position: relative;
    z-index: 1;
    margin: 0;
    max-width: 46ch;
    font-size: 1.04rem;
    line-height: 1.65;
  }

  .objective-list {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 30px;
  }

  .objective-row {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 20px;
    align-items: start;
    padding: 30px 30px 30px 34px;
    border-radius: var(--l-radius-panel);
    border: 1px solid var(--border-card);
    background: var(--l-panel);
    box-shadow: var(--l-shadow-panel);
    transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease;
  }

  .objective-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 26px;
    bottom: 26px;
    width: 2px;
    border-radius: 99px;
    background: linear-gradient(180deg, var(--accent-primary), transparent);
    opacity: 0.6;
  }

  .objective-row:hover {
    border-color: var(--border-card-hover);
    box-shadow: var(--l-shadow-panel-hover);
    transform: translateY(-4px);
  }

  .objective-row .objective-num {
    position: absolute;
    top: 24px;
    right: 26px;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .objective-row-copy {
    min-width: 0;
  }

  .objective-row h3 {
    font-size: 1.25rem;
    margin: 2px 0 8px;
  }

  .objective-row p {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.62;
  }

  /* Iluminación de los iconos de objetivos */
  .outline-icon-wrap {
    position: relative;
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
    transition: box-shadow 0.35s ease, border-color 0.35s ease, transform 0.35s ease;
  }

  /* El pulso anima solo la opacidad: se compone en la GPU en vez de repintar la sombra. */
  .outline-icon-wrap::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    box-shadow: 0 0 24px rgba(77, 242, 255, 0.35), inset 0 0 14px rgba(77, 242, 255, 0.18);
    opacity: 0;
    pointer-events: none;
    animation: iconPulse 3.2s ease-in-out infinite;
  }

  .outline-icon-wrap i {
    font-size: 1.7rem;
    filter: drop-shadow(0 0 8px rgba(77, 242, 255, 0.55));
  }

  .objective-feature:hover .outline-icon-wrap,
  .objective-row:hover .outline-icon-wrap {
    border-color: rgba(77, 242, 255, 0.65);
    box-shadow: 0 0 24px rgba(77, 242, 255, 0.4), inset 0 0 14px rgba(77, 242, 255, 0.2);
    transform: scale(1.08);
  }

  @keyframes iconPulse {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }

  /* 03 · BENEFICIOS: composición compacta que cabe en una pantalla.
     El z-index deja que el resplandor de la ilustración se derrame sobre la
     sección 04 y se mezcle con ella en lugar de cortarse en el borde. */
  .section-benefits {
    position: relative;
    z-index: 1;
    overflow: visible;
    padding-top: clamp(48px, 6vh, 92px);
    padding-bottom: clamp(48px, 6vh, 92px);
  }

  .benefits-layout {
    display: grid;
    grid-template-columns: 0.82fr 1.18fr;
    align-items: center;
    gap: clamp(32px, 4vw, 64px);
  }

  .benefits-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .benefits-head .eyebrow {
    margin-bottom: 16px;
  }

  .benefits-head h2 {
    font-size: clamp(2rem, 3.4vw, 2.9rem);
    margin: 0 0 16px;
    color: #ffffff;
  }

  .benefits-head .section-intro {
    max-width: 460px;
    font-size: 1.05rem;
    line-height: 1.62;
    color: var(--text-muted, #94a3b8);
    margin: 0;
  }

  .benefits-head-visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    margin-top: 16px;
  }

  /* Glow con blur detrás de la imagen */
  .benefits-head-visual::before {
    content: '';
    position: absolute;
    width: 62%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(139, 92, 246, 0.25) 45%, rgba(13, 29, 50, 0) 72%);
    filter: blur(26px);
    z-index: 1;
    pointer-events: none;
  }

  .header-elejir-img {
    position: relative;
    z-index: 2;
    width: auto;
    max-width: 100%;
    max-height: 168px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 24px 52px rgba(2, 10, 24, 0.65)) drop-shadow(0 0 28px rgba(99, 102, 241, 0.35));
    /* Igual que el hero: sin repintar el filtro en cada fotograma de la flotación. */
    will-change: transform;
    animation: heroFloat 7.5s ease-in-out infinite;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .benefit-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 18px 18px 16px;
    border-radius: var(--l-radius-panel);
    border: 1px solid var(--border-card);
    background: var(--l-panel);
    box-shadow: var(--l-shadow-panel);
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                border-color 0.4s ease,
                box-shadow 0.4s ease;
  }

  /* Barra de acento superior que se completa al hacer hover */
  .benefit-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: 54px;
    background: var(--benefit-accent, var(--accent-primary));
    transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .benefit-num {
    position: absolute;
    top: 18px;
    right: 20px;
    z-index: 3;
    font-family: var(--font-heading);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .benefit-body {
    position: relative;
    z-index: 3;
    min-width: 0;
  }

  .benefit-body h3 {
    font-size: 1.1rem;
    margin: 0 0 7px;
    color: #ffffff;
  }

  .benefit-body p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  .benefit-media {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    height: 92px;
    margin-bottom: 12px;
  }

  .benefit-glow {
    position: absolute;
    z-index: 1;
    inset: 8%;
    border-radius: 50%;
    background: var(--benefit-glow, radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%));
    filter: blur(26px);
    opacity: 0.55;
    transition: opacity 0.5s ease, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .benefit-media img {
    position: relative;
    z-index: 2;
    width: auto;
    max-width: 100%;
    max-height: 92px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.6));
    transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Acentos y halos por beneficio, dentro de la paleta existente */
  .theme-lime {
    --benefit-accent: linear-gradient(90deg, #4df2ff, #22c55e);
    --benefit-glow: radial-gradient(circle, rgba(77, 242, 255, 0.5) 0%, rgba(34, 197, 94, 0.28) 50%, transparent 72%);
  }

  .theme-indigo {
    --benefit-accent: linear-gradient(90deg, #6366f1, #a78bfa);
    --benefit-glow: radial-gradient(circle, rgba(99, 102, 241, 0.55) 0%, rgba(139, 92, 246, 0.3) 50%, transparent 72%);
  }

  .theme-violet {
    --benefit-accent: linear-gradient(90deg, #a78bfa, #d946ef);
    --benefit-glow: radial-gradient(circle, rgba(168, 85, 247, 0.55) 0%, rgba(217, 70, 239, 0.28) 50%, transparent 72%);
  }

  .theme-cyan {
    --benefit-accent: linear-gradient(90deg, #22d3ee, #38bdf8);
    --benefit-glow: radial-gradient(circle, rgba(6, 182, 212, 0.55) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 72%);
  }

  /* Interacción contenida: la tarjeta se eleva y la imagen flota, sin mover el texto. */
  .benefit-card:hover {
    transform: translateY(-4px);
    border-color: var(--border-card-hover);
    box-shadow: var(--l-shadow-panel-hover);
  }

  .benefit-card:hover::after {
    width: 100%;
  }

  .benefit-card:hover .benefit-media img {
    transform: translateY(-6px) scale(1.05);
  }

  .benefit-card:hover .benefit-glow {
    opacity: 0.85;
    transform: scale(1.08);
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

  /* 04 · CARACTERÍSTICAS: carrusel 3D tipo coverflow.
     Cada tarjeta se ubica en el espacio según su distancia a la activa. */
  .feature-carousel {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(24px, 3vw, 38px);
    outline: none;
  }

  .feature-carousel:focus-visible .carousel-stage {
    border-radius: 30px;
    box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.45);
  }

  .carousel-stage {
    position: relative;
    width: 100%;
    max-width: 1340px;
    height: clamp(520px, 64vh, 660px);
    perspective: 2200px;
    perspective-origin: 50% 45%;
    transform-style: preserve-3d;
    --fw-card-w: clamp(300px, 27vw, 400px);
    --fw-step: 64%;
    --fw-depth: 200px;
    --fw-angle: 26deg;
    --fw-shrink: 0.06;
    --fw-fade: 0.22;
  }

  /* Halo suave detrás de la tarjeta activa */
  .carousel-stage::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(700px, 72%);
    aspect-ratio: 1.05 / 1;
    transform: translate(-50%, -54%);
    background: radial-gradient(circle, rgba(34, 211, 238, 0.16) 0%, rgba(167, 139, 250, 0.1) 46%, transparent 72%);
    filter: blur(36px);
    pointer-events: none;
    z-index: 0;
  }

  .feature-slide {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--fw-card-w);
    height: clamp(430px, 54vh, 520px);
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    appearance: none;
    -webkit-appearance: none;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid var(--border-card);
    background: var(--l-panel);
    box-shadow: var(--l-shadow-panel);
    cursor: pointer;
    transform-origin: center center;
    backface-visibility: hidden;
    will-change: transform, opacity;
    transform:
      translate(-50%, -50%)
      translateX(calc(var(--offset) * var(--fw-step)))
      translateZ(calc(var(--abs) * -1 * var(--fw-depth)))
      rotateY(calc(var(--offset) * var(--fw-angle)))
      scale(calc(1 - var(--abs) * var(--fw-shrink)));
    opacity: max(0, calc(1 - var(--abs) * var(--fw-fade)));
    transition:
      transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.6s ease,
      border-color 0.4s ease,
      box-shadow 0.4s ease;
  }

  .feature-slide.is-active {
    border-color: var(--border-card-hover);
    box-shadow:
      0 30px 60px rgba(2, 8, 22, 0.6),
      0 0 0 1px var(--accent),
      0 0 42px -6px var(--accent-glow);
  }

  .feature-slide.is-far {
    filter: saturate(0.82) brightness(0.72);
  }

  .slide-media {
    position: relative;
    --media-h: clamp(230px, 32vh, 310px);
    flex: 0 0 var(--media-h);
    display: grid;
    place-items: center;
    overflow: hidden;
    border-bottom: 1px solid var(--l-rule);
    background:
      radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 62%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, transparent 100%);
  }

  .slide-glow {
    position: absolute;
    inset: 12% 22%;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    filter: blur(28px);
    opacity: 0.5;
    transition: opacity 0.6s ease;
  }

  .slide-media img {
    position: relative;
    z-index: 1;
    height: var(--media-h);
    width: auto;
    max-width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 16px 26px rgba(0, 0, 0, 0.55));
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .feature-slide.is-active .slide-media img {
    transform: scale(1.04);
  }

  .feature-slide.is-active .slide-glow {
    opacity: 0.75;
  }

  .slide-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px 22px 22px;
  }

  .slide-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 2px;
  }

  .slide-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 1.05rem;
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    box-shadow: 0 0 14px -2px var(--accent-glow);
  }

  .slide-index {
    font-family: var(--font-heading);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--text-secondary);
    opacity: 0.55;
  }

  .feature-slide .slide-title {
    display: block;
    margin: 0;
    font-size: 1.22rem;
    font-weight: 700;
    color: #ffffff;
  }

  .feature-slide .slide-desc {
    display: block;
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  /* Controles del carrusel */
  .carousel-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(16px, 2.4vw, 28px);
  }

  .carousel-arrow {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--l-rule-strong);
    background: rgba(19, 26, 46, 0.7);
    color: var(--text-primary);
    font-size: 1.4rem;
    cursor: pointer;
    transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease, transform 0.3s ease;
  }

  .carousel-arrow:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    background: rgba(34, 211, 238, 0.1);
    transform: translateY(-2px);
  }

  .carousel-dots {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .carousel-dot {
    width: 8px;
    height: 8px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(148, 163, 184, 0.32);
    cursor: pointer;
    transition: width 0.35s ease, background 0.35s ease;
  }

  .carousel-dot.is-active {
    width: 26px;
    border-radius: 5px;
    background: var(--accent-primary);
  }

  @media (max-width: 1024px) {
    .carousel-stage {
      height: clamp(500px, 62vh, 600px);
      --fw-card-w: clamp(280px, 40vw, 360px);
      --fw-step: 68%;
      --fw-depth: 180px;
      --fw-angle: 24deg;
    }

    .feature-slide {
      height: clamp(410px, 52vh, 480px);
    }

    .slide-media {
      --media-h: clamp(220px, 30vh, 280px);
    }
  }

  @media (max-width: 800px) {
    .carousel-stage {
      --fw-card-w: clamp(260px, 62vw, 340px);
      --fw-step: 76%;
      --fw-depth: 150px;
      --fw-angle: 22deg;
      --fw-fade: 0.26;
    }
  }

  @media (max-width: 560px) {
    .carousel-stage {
      height: clamp(430px, 62vh, 520px);
      --fw-card-w: min(82vw, 330px);
      --fw-step: 84%;
      --fw-depth: 120px;
      --fw-angle: 20deg;
      --fw-fade: 0.3;
    }

    .feature-slide {
      height: clamp(370px, 54vh, 450px);
    }

    .slide-media {
      --media-h: clamp(190px, 30vh, 240px);
    }
  }

  /* 05 · DESARROLLADOR: retrato y ficha en composición horizontal editorial */
  .section-developer {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .section-developer .section-head {
    width: 100%;
    max-width: 980px;
    margin-bottom: 56px;
  }

  .developer-card-container {
    position: relative;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(220px, 280px) 1fr;
    align-items: center;
    gap: clamp(28px, 5vw, 64px);
    max-width: 980px;
    margin: 0 auto;
    padding: clamp(32px, 4vw, 56px);
    border-radius: var(--l-radius-panel);
    border: 1px solid var(--border-card);
    background: var(--l-panel);
    box-shadow: var(--l-shadow-panel);
    overflow: hidden;
    transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease;
  }

  .developer-card-container::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
    opacity: 0.85;
  }

  .developer-card-container:hover {
    border-color: var(--border-card-hover);
    transform: translateY(-4px);
    box-shadow: var(--l-shadow-panel-hover);
  }

  .developer-photo {
    position: relative;
    width: 100%;
    max-width: 260px;
    aspect-ratio: 1;
    margin: 0 auto;
  }

  .developer-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    min-width: 0;
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
    font-size: 1.75rem;
    color: #fff;
    margin: 0 0 6px;
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
    justify-content: flex-start;
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

  @media (max-width: 960px) {
    .objectives-grid {
      grid-template-columns: 1fr;
    }

    .objective-list {
      grid-template-rows: none;
    }

    .objective-feature {
      min-height: 300px;
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
    .section-head { margin-bottom: 48px; }
    .developer-card-container {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
      padding: 40px 28px;
    }
    .developer-info { align-items: center; text-align: center; }
    .social-row { justify-content: center; }
  }

  @media (max-width: 1024px) {
    .benefits-layout {
      grid-template-columns: 1fr;
      gap: 32px;
    }

    .benefits-head {
      max-width: 640px;
    }

    .benefits-head-visual {
      margin-top: 6px;
    }

    .header-elejir-img {
      max-height: 170px;
    }
  }

  @media (max-width: 620px) {
    .benefits-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .benefit-media {
      height: 120px;
    }

    .benefit-media img {
      max-height: 120px;
    }
  }

  @media (max-width: 520px) {
    .section { padding: 60px 18px; }
    .developer-card-container { padding: 32px 20px; }
    .mockup { padding: 18px; border-radius: 16px; }
    .mockup-balance { font-size: 1.7rem; }
    .eyebrow { letter-spacing: 0.14em; gap: 8px; }
    .eyebrow::before { width: 18px; }
  }

  /* Accesibilidad: sin animaciones decorativas en las secciones posteriores al hero. */
  @media (prefers-reduced-motion: reduce) {
    .section-head *,
    .objectives-grid *,
    .benefits-layout *,
    .feature-carousel *,
    .developer-card-container * {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
</style>
