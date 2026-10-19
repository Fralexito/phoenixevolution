// Marco (FX.marco, ronda 258): al BAJAR la página el ticker «Última hora» se esconde detrás del menú y la barra izquierda sube;
// al SUBIR (aunque sea un poco) vuelven. Responde solo a lo que haces. Como máximo un cálculo por cuadro.
import { FX } from '../../data/experimento.js';

export function initMarco() {
  if (!FX.marco) return;
  try {
    const html = document.documentElement;
    // «ultimo» se lee en el primer scroll, NO al arrancar: leer scrollY en plena carga obligaba a calcular el diseño de toda la página
    // antes de tiempo (2,1 s de bloqueo en un celular lento, medido el 19-oct-2026).
    let ultimo = null; let raf = 0;
    const revisar = () => {
      raf = 0;
      const y = window.scrollY; if (ultimo === null) ultimo = y; const dy = y - ultimo;
      if (y < 120) html.removeAttribute('data-cab-compacta');
      else if (dy > 6) html.setAttribute('data-cab-compacta', '');
      else if (dy < -6) html.removeAttribute('data-cab-compacta');
      if (Math.abs(dy) > 6 || y < 120) ultimo = y;
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(revisar); }, { passive: true });
  } catch (e) { console.warn('[marco] desactivado:', e); }
}
