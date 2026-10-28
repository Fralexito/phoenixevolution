// Formulario «Lanzar reto» más simple (FX.duelosPro, ronda 260). Fralex: «haz lo que mejor consideres».
// NADA se quita: todas las opciones siguen ahí y la lógica (features/duelos/form.js) es la misma. Solo cambia qué se ve de primera:
//  1. Tamaño: una fila «1v1 · 2v2 · 3v3 · 4v4 · Otro»; los contadores A/B aparecen solo con «Otro».
//  2. «Detalles de la sala» (host, plataforma, espectadores) se resume en una línea con [Cambiar].
//  3. El resumen pasa a ser la segunda línea del botón «Emitir reto» (botón tipo boleto).
//  4. Las ayudas largas se muestran solo cuando cambias esa opción (lo hace el CSS en duelosPro.css).
import { FX } from '../../data/experimento.js';

export function simplificarFormReto() {
  if (!FX.duelosPro) return;
  const form = document.getElementById('form-crear-reto'); if (!form) return;
  try {
    form.classList.add('fr-simple');
    const $ = (id) => document.getElementById(id);

    // 1 · Tamaño: chip 1v1 al inicio y «Personalizar» pasa a llamarse «Otro»
    const presets = $('tam-presets');
    if (presets && !presets.dataset.frListo) { presets.dataset.frListo = '1';
      if (!presets.querySelector('[data-t="1-1"]')) presets.insertAdjacentHTML('afterbegin', '<button type="button" class="chip" data-t="1-1" aria-pressed="true">1v1</button>');
      const otro = $('tam-personal'); if (otro) { otro.textContent = 'Otro'; otro.title = 'Elige cuántos jugadores por equipo (contadores A y B)'; }
      const caja = presets.parentElement;
      presets.addEventListener('click', (e) => {
        if (e.target.closest('#tam-personal')) caja.setAttribute('data-fr-otro', '');
        else if (e.target.closest('[data-t]')) caja.removeAttribute('data-fr-otro');
      });
    }

    // 2 · Detalles de la sala en una línea
    const grupo = form.querySelector('[aria-labelledby="h-detalles-sala"]');
    const h3 = $('h-detalles-sala');
    if (grupo && h3 && !h3.querySelector('.fr-res')) {
      grupo.setAttribute('data-fr-plegado', '');
      h3.insertAdjacentHTML('beforeend', '<span class="fr-res" aria-live="polite"></span><button type="button" class="fr-cambiar" aria-expanded="false">Cambiar</button>');
      const res = h3.querySelector('.fr-res'); const btn = h3.querySelector('.fr-cambiar');
      const pintar = () => {
        const host = document.querySelector('#seg-host [aria-pressed="true"]')?.textContent.trim() ?? '';
        const plat = $('select-plataforma')?.value ?? '';
        const esp = $('select-espectadores'); const espTxt = esp?.selectedOptions?.[0]?.textContent.trim() ?? '';
        const espCorto = !espTxt ? '' : /no acepto/i.test(espTxt) ? 'Sin espectadores' : `Espectadores: ${espTxt.toLowerCase()}`;
        res.textContent = [host, plat, espCorto].filter(Boolean).join(' · ');
      };
      btn.addEventListener('click', () => { const abrir = grupo.hasAttribute('data-fr-plegado'); grupo.toggleAttribute('data-fr-plegado', !abrir); btn.setAttribute('aria-expanded', String(abrir)); btn.textContent = abrir ? 'Listo' : 'Cambiar'; pintar(); });
      form.addEventListener('click', () => setTimeout(pintar, 0));
      form.addEventListener('change', pintar);
      new MutationObserver(pintar).observe($('seg-host'), { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
      pintar(); setTimeout(pintar, 600);
    }

    // 3 · Resumen dentro del botón
    const boton = $('btn-emitir-reto'); const resumen = $('resumen');
    if (boton && resumen && !boton.querySelector('.fr-boleto')) {
      boton.insertAdjacentHTML('beforeend', '<span class="fr-boleto" aria-hidden="true"></span>');
      const copia = boton.querySelector('.fr-boleto');
      const pasar = () => { copia.textContent = resumen.textContent.trim() === '—' ? '' : resumen.textContent.trim(); };
      new MutationObserver(pasar).observe(resumen, { childList: true, characterData: true, subtree: true });
      pasar();
    }
  } catch (e) { console.warn('[formRetoSimple] desactivado:', e); }
}
