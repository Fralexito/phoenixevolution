// «Patrocinado por» en torneos y clanes (migración 139, ronda 363). Las páginas dejan un hueco <div data-patro="torneo:12"></div>
// y rellenarPatrocinios(raiz) pone ahí el logo. Si la tabla aún no existe o falla la red, no se muestra nada (es un adorno).
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { patrociniosDe } from '../core/economia/patrocinios.js';

let vigentes = null;
async function leerVigentes() {
  if (vigentes) return vigentes;
  vigentes = supabase.from('patrocinios').select('id, tipo, objetivo_id, nombre, logo_url, enlace, desde, hasta')
    .then(({ data, error }) => { if (error) throw error; return data ?? []; })
    .catch((e) => { console.warn('[patrocinios] sin datos:', e?.message ?? e); return []; });
  return vigentes;
}
/** Para el admin: vuelve a leer después de guardar. */
export const olvidarPatrocinios = () => { vigentes = null; };

export function tiraPatrocinioHTML(lista) {
  if (!lista?.length) return '';
  const uno = (p) => {
    const logo = safeUrl(p.logo_url ?? ''); const web = safeUrl(p.enlace ?? '');
    const cuerpo = `${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" decoding="async">` : ''}<b>${esc(p.nombre)}</b>`;
    return web ? `<a class="pat-item" href="${esc(web)}" target="_blank" rel="sponsored noopener noreferrer">${cuerpo}</a>` : `<span class="pat-item">${cuerpo}</span>`;
  };
  return `<div class="pat-tira"><span class="pat-et">Patrocinado por</span>${lista.map(uno).join('')}</div>`;
}

export async function rellenarPatrocinios(raiz = document) {
  const huecos = [...raiz.querySelectorAll('[data-patro]')]; if (!huecos.length) return;
  const lista = await leerVigentes();
  for (const h of huecos) { const [tipo, id] = h.dataset.patro.split(':'); h.innerHTML = tiraPatrocinioHTML(patrociniosDe(lista, tipo, id)); }
}
