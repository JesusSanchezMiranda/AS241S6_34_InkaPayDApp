import { readable } from 'svelte/store';

/**
 * Efecto máquina de escribir reutilizable.
 *
 * Crea un store de Svelte que escribe y borra carácter por carácter las frases
 * recibidas, en un ciclo infinito. El componente solo necesita suscribirse con
 * `$typed.text` para pintar la parte variable del texto.
 *
 * @param {string[]} phrases Frases que ciclarán una a una.
 * @param {object} [options]
 * @param {number} [options.typeSpeed=70]   Ms por carácter al escribir.
 * @param {number} [options.deleteSpeed=35] Ms por carácter al borrar (más rápido que al escribir).
 * @param {number} [options.pauseMs=1800]   Pausa con la frase completa, cursor parpadeando.
 * @param {number} [options.gapMs=400]      Pausa entre frases (tras borrar la anterior).
 * @param {number} [options.startDelay=600] Espera inicial antes de comenzar.
 * @returns {import('svelte/store').Readable<{ text: string, phraseIndex: number, isDeleting: boolean }>}
 */
export function createTypewriter(phrases, options = {}) {
  const {
    typeSpeed = 70,
    deleteSpeed = 35,
    pauseMs = 1800,
    gapMs = 400,
    startDelay = 600
  } = options;

  return readable({ text: '', phraseIndex: 0, isDeleting: false }, (set) => {
    if (!phrases.length) return;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const tick = () => {
      const phrase = phrases[phraseIndex];
      let delay;

      if (!isDeleting) {
        charIndex += 1;
        if (charIndex >= phrase.length) {
          isDeleting = true;
          delay = pauseMs; // pausa con la frase completa y el cursor parpadeando
        } else {
          delay = typeSpeed;
        }
      } else {
        charIndex -= 1;
        if (charIndex <= 0) {
          charIndex = 0;
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          delay = gapMs;
        } else {
          delay = deleteSpeed;
        }
      }

      set({ text: phrase.slice(0, charIndex), phraseIndex, isDeleting });
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, startDelay);

    return () => clearTimeout(timeoutId);
  });
}
