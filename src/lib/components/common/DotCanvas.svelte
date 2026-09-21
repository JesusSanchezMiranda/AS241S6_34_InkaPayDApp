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

    const GRID_SPACING = 28;
    const HOVER_RADIUS = 220;
    const HOVER_RADIUS_SQ = HOVER_RADIUS * HOVER_RADIUS;

    let mouse = { x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false };
    let dots = [];

    function initGrid() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvasElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      canvasElement.width = width * dpr;
      canvasElement.height = height * dpr;
      ctx.scale(dpr, dpr);

      dots = [];
      const cols = Math.ceil(width / GRID_SPACING) + 1;
      const rows = Math.ceil(height / GRID_SPACING) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const baseX = i * GRID_SPACING;
          const baseY = j * GRID_SPACING;
          dots.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            vx: 0,
            vy: 0,
            radius: 1.2,
            targetRadius: 1.2,
            alpha: 0.24,
            targetAlpha: 0.24,
            distRatio: 1,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }

    function handleMouseMove(e) {
      const rect = canvasElement.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    }

    function handleMouseLeave() {
      mouse.active = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    }

    function handleTouchMove(e) {
      if (e.touches.length > 0) {
        const rect = canvasElement.getBoundingClientRect();
        mouse.targetX = e.touches[0].clientX - rect.left;
        mouse.targetY = e.touches[0].clientY - rect.top;
        mouse.active = true;
      }
    }

    function handleTouchEnd() {
      mouse.active = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    }

    let time = 0;

    function render() {
      time += 0.02;

      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x = -9999;
        mouse.y = -9999;
      }

      ctx.clearRect(0, 0, width, height);

      if (mouse.active && mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < dots.length; i++) {
          const dot = dots[i];
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const distSq = dx * dx + dy * dy;
          const maxLineDist = 120;

          if (distSq < maxLineDist * maxLineDist) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxLineDist) * 0.35;

            const grad = ctx.createLinearGradient(mouse.x, mouse.y, dot.x, dot.y);
            grad.addColorStop(0, `rgba(77, 242, 255, ${lineAlpha})`);
            grad.addColorStop(1, `rgba(168, 85, 247, ${lineAlpha})`);

            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(dot.x, dot.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const ambientWave = Math.sin(time + dot.baseX * 0.012 + dot.baseY * 0.012) * 1.2;
        const targetBaseY = dot.baseY + ambientWave;

        let forceX = 0;
        let forceY = 0;

        if (mouse.active) {
          const dx = dot.x - mouse.x;
          const dy = dot.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < HOVER_RADIUS_SQ && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / HOVER_RADIUS;
            const force = factor * factor * 52;

            forceX = (dx / dist) * force;
            forceY = (dy / dist) * force;

            dot.targetRadius = 1.2 + factor * 3.6;
            dot.targetAlpha = 0.24 + factor * 0.72;
            dot.distRatio = dist / HOVER_RADIUS;
          } else {
            dot.targetRadius = 1.2;
            dot.targetAlpha = 0.24;
            dot.distRatio = 1;
          }
        } else {
          dot.targetRadius = 1.2;
          dot.targetAlpha = 0.24;
          dot.distRatio = 1;
        }

        const targetX = dot.baseX + forceX;
        const targetY = targetBaseY + forceY;

        dot.x += (targetX - dot.x) * 0.1;
        dot.y += (targetY - dot.y) * 0.1;
        dot.radius += (dot.targetRadius - dot.radius) * 0.14;
        dot.alpha += (dot.targetAlpha - dot.alpha) * 0.14;

        const t = Math.max(0, Math.min(1, dot.distRatio));
        const r = Math.round(77 + (168 - 77) * t);
        const g = Math.round(242 + (85 - 242) * t);
        const b = Math.round(255 + (247 - 255) * t);

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);

        if (dot.alpha > 0.4) {
          const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.radius * 3);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dot.alpha})`);
          glow.addColorStop(0.5, `rgba(168, 85, 247, ${dot.alpha * 0.5})`);
          glow.addColorStop(1, `rgba(13, 29, 50, 0)`);
          ctx.fillStyle = glow;
        } else {
          ctx.fillStyle = `rgba(148, 197, 255, ${dot.alpha})`;
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    initGrid();
    render();

    const handleResize = () => {
      initGrid();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  });
</script>

<canvas bind:this={canvasElement} class="dot-canvas" aria-hidden="true"></canvas>

<style>
  .dot-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%);
  }
</style>
