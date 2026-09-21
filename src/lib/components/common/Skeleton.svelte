<script>
  /**
   * Skeleton reutilizable para estados de carga.
   * Barra o bloque gris con barrido brillante (shimmer) en los acentos del sistema.
   *
   * Props:
   *  - width / height: tamaño del bloque (CSS, ej. "120px", "55%").
   *  - radius: radio de esquina (se ignora si circle es true).
   *  - circle: bloque circular (avatares, iconos).
   *  - delay: retraso del shimmer en ms (para escalonar filas).
   */
  export let width = '100%';
  export let height = '14px';
  export let radius = '8px';
  export let circle = false;
  export let delay = 0;
</script>

<span
  class="skeleton"
  class:circle
  style="width: {width}; height: {height}; border-radius: {circle ? '50%' : radius}; --sk-delay: {delay}ms;"
  aria-hidden="true"
></span>

<style>
  .skeleton {
    display: inline-block;
    position: relative;
    overflow: hidden;
    flex: none;
    background: rgba(148, 170, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(148, 170, 255, 0.06);
    vertical-align: middle;
  }

  /* Barrido brillante (shimmer) */
  .skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      rgba(77, 242, 255, 0) 0%,
      rgba(77, 242, 255, 0.1) 40%,
      rgba(168, 85, 247, 0.14) 60%,
      rgba(168, 85, 247, 0) 100%
    );
    animation: skeletonShimmer 1.5s ease-in-out infinite;
    animation-delay: var(--sk-delay, 0ms);
  }

  @keyframes skeletonShimmer {
    100% { transform: translateX(100%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton::after {
      animation: none;
    }
  }
</style>
