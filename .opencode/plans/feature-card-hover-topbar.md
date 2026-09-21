# Plan: Hover de tarjetas "Diseñada para crecer contigo" — top bar

Archivo: `src/pages/Home.svelte` (sección 04 · CARACTERÍSTICAS, `.feature-card`)

## Objetivo
Al pasar el cursor por una card, el icono y el nombre NO desaparecen: se trasladan a la parte superior de la tarjeta (top bar, dentro de la card, tamaño reducido) y la descripción aparece debajo, como actualmente.

## Cambios CSS

1. Reemplazar el hide del icono+nombre en hover:

```css
/* ANTES */
.feature-card:hover .feature-default {
  opacity: 0;
  transform: scale(0.35) translateY(-20px);
  pointer-events: none;
}

/* DESPUÉS */
.feature-card:hover .feature-default {
  opacity: 1;
  transform: translateY(-58px) scale(0.9);
}

.feature-card:hover .feature-icon {
  font-size: 1.6rem;
}
```

2. Reubicar la descripción debajo del top bar:

```css
.feature-hover-info {
  ...
  align-items: flex-start;       /* antes: center */
  padding: 120px 28px 28px;      /* antes: 28px 24px */
  ...
}
```

3. Mantener tokens de color ya implementados (`--accent-primary`, `--border-card-hover`, `--bg-card-hover`) y la elevación `translateY(-6px)` con sombras en capas.

## Verificación
- `npm run build`
- Revisar visualmente: icono+nombre suben suavemente al top sin salirse; el texto aparece debajo sin solaparse.
