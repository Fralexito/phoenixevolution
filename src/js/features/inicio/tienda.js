// Vitrina de la tienda en la portada: carrusel de objetos reales (catálogo público). Si no se puede leer, la sección se queda oculta.
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { tienda } from '../economia/api.js';
import { vistaPrevia, formatoTokens, CATEGORIAS } from '../../core/economia.js';
import { montarCarrusel } from '../carrusel.js';
import { activarReveal } from '../reveal.js';

export async function iniciarVitrina() {
  const sec = document.getElementById('inicio-tienda'); if (!sec) return;
  try {
    const items = (await tienda()).filter((i) => !i.agotado).slice(0, 10); if (!items.length) return;
    $car(sec).innerHTML = `<div class="car multi"><div class="car-track">${items.map((i) => `<div class="car-slide"><a href="${href('tienda/')}" class="item-tienda glass-panel"><span class="h-14 flex items-center justify-center">${vistaPrevia(i)}</span>
      <span><b class="block font-display font-bold text-white text-sm truncate">${escapeHTML(i.nombre)}</b><span class="block text-[10px] text-gray-500 uppercase tracking-wider">${escapeHTML(CATEGORIAS[i.categoria].etiqueta)}${i.nivelMin > 1 ? ` · Nv ${i.nivelMin}` : ''}</span></span>
      <span class="font-display font-extrabold text-amber-300 text-sm"><i class="fa-solid fa-coins"></i> ${formatoTokens(i.precio)}</span></a></div>`).join('')}</div></div>`;
    montarCarrusel(sec.querySelector('.car'), { auto: 0 }); sec.hidden = false; activarReveal(sec);
  } catch (e) { console.warn('[inicio] vitrina:', e?.message ?? e); }
}
const $car = (sec) => sec.querySelector('#vitrina-cuerpo');
