<script>
  import { onMount } from 'svelte';

  let canvasElement;

  onMount(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvasElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      canvasElement.width = width * dpr;
      canvasElement.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    function handleMouseMove(e) {
      const rect = canvasElement.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }

    function handleMouseLeave() {
      mouse.active = false;
    }

    let time = 0;

    const WAVES = [
      {
        amplitude: 38,
        frequency: 0.006,
        speed: 0.018,
        colorStart: 'rgba(77, 242, 255, 0.35)',
        colorEnd: 'rgba(168, 85, 247, 0.15)',
        lineWidth: 2.2,
        offsetY: 0.3,
        fillColor: 'rgba(77, 242, 255, 0.05)'
      },
      {
        amplitude: 48,
        frequency: 0.005,
        speed: -0.014,
        colorStart: 'rgba(168, 85, 247, 0.3)',
        colorEnd: 'rgba(56, 189, 248, 0.12)',
        lineWidth: 1.8,
        offsetY: 0.45
      },
      {
        amplitude: 30,
        frequency: 0.008,
        speed: 0.022,
        colorStart: 'rgba(56, 189, 248, 0.25)',
        colorEnd: 'rgba(77, 242, 255, 0.1)',
        lineWidth: 1.5,
        offsetY: 0.6
      },
      {
        amplitude: 55,
        frequency: 0.0045,
        speed: -0.01,
        colorStart: 'rgba(168, 85, 247, 0.24)',
        colorEnd: 'rgba(77, 242, 255, 0.08)',
        lineWidth: 1.2,
        offsetY: 0.78,
        fillColor: 'rgba(168, 85, 247, 0.05)'
      }
    ];

    function drawWave(wave) {
      const baseCenterY = height * wave.offsetY;
      ctx.beginPath();
      ctx.lineWidth = wave.lineWidth;

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, wave.colorStart);
      grad.addColorStop(0.5, wave.colorEnd);
      grad.addColorStop(1, wave.colorStart);
      ctx.strokeStyle = grad;

      const step = 6;
      let first = true;

      for (let x = 0; x <= width + step; x += step) {
        let mouseEffect = 0;
        if (mouse.active) {
          const dx = x - mouse.x;
          const dist = Math.abs(dx);
          if (dist < 180) {
            const factor = Math.cos((dist / 180) * (Math.PI / 2));
            mouseEffect = factor * factor * 24;
          }
        }

        const angle = x * wave.frequency + time * wave.speed * 60;
        const y = baseCenterY + Math.sin(angle) * wave.amplitude + Math.cos(angle * 0.5) * (wave.amplitude * 0.4) - mouseEffect;

        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Relleno suave bajo la cresta para dar profundidad a las ondas extendidas
      if (wave.fillColor) {
        ctx.lineTo(width + step, height);
        ctx.lineTo(-step, height);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, baseCenterY, 0, height);
        fillGrad.addColorStop(0, wave.fillColor);
        fillGrad.addColorStop(1, 'rgba(10, 14, 26, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }
    }

    // Dibuja nodos brillantes que viajan sobre una ola
    function drawNodes(wave, nodeCount, baseRadius, pulseScale, glowAlpha) {
      for (let i = 0; i < nodeCount; i++) {
        const nx = (width / (nodeCount - 1)) * i;
        const angle = nx * wave.frequency + time * wave.speed * 60;
        const ny = height * wave.offsetY + Math.sin(angle) * wave.amplitude;

        const pulse = (Math.sin(time * 2 + i) + 1) * 0.5;
        const radius = baseRadius + pulse * pulseScale;

        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);

        const nodeGlow = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius * 4);
        nodeGlow.addColorStop(0, `rgba(77, 242, 255, ${glowAlpha})`);
        nodeGlow.addColorStop(0.5, `rgba(168, 85, 247, ${glowAlpha * 0.5})`);
        nodeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = nodeGlow;
        ctx.fill();
      }
    }

    function render() {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Draw background wave fills & lines
      for (let i = 0; i < WAVES.length; i++) {
        drawWave(WAVES[i]);
      }

      // Draw floating glowing wave nodes/dots
      drawNodes(WAVES[0], 18, 1.8, 1.5, 0.8);
      // Nodos tenues sobre la ola profunda (zona extendida hacia el desarrollador)
      drawNodes(WAVES[WAVES.length - 1], 12, 1.2, 1.0, 0.45);

      animationFrameId = requestAnimationFrame(render);
    }

    resize();
    render();

    // Re-mide el lienzo cuando el contenedor cambie de tamaño (p. ej. al extenderse hasta el desarrollador)
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvasElement);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  });
</script>

<canvas bind:this={canvasElement} class="wave-canvas" aria-hidden="true"></canvas>

<style>
  .wave-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 0.85;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%);
  }
</style>
