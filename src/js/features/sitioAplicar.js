// Aplica en TODAS las páginas lo que el admin decidió en el Panel (/panel/). Se carga desde boot.js.
// Guarda la última config en localStorage para pintar al instante la próxima vez y luego la pone al día desde Supabase.
import { supabase } from '../core/supabase.js';
import { normalizar, hrefValido } from '../core/sitio.js';

const LLAVE = 'pes-sitio-v1';
const url = (h) => (/^https:/i.test(h) ? h : `${import.meta.env.BASE_URL}${h.replace(/^\//, '')}`);

function ocultar(ids, selector) {
  document.querySelectorAll(selector).forEach((el) => { el.style.display = ids.includes(el.dataset.navId) ? 'none' : ''; });
}

function portada(p) {
  const grid = document.querySelector('[data-vt-grid]');
  if (!grid) return;
  const sub = document.querySelector('.vt-sub'); if (sub && p.sub) sub.textContent = p.sub;
  const l1 = document.querySelector('.esc-l1'); if (l1 && p.titulo) l1.textContent = p.titulo;
  p.orden.forEach((id, i) => {
    const v = grid.querySelector(`[data-vt-ventana="${id}"]`); if (!v) return;
    const c = p.ventanas[id];
    v.style.order = String(i); v.style.display = c.on ? '' : 'none';
    const dorso = v.querySelector('.vt-dorso');
    if (dorso && c.vista) dorso.dataset.vista = c.vista;
    const pr = v.querySelector('.vt-principal');
    if (pr && c.principal) { pr.setAttribute('href', url(c.principal.href)); const s = pr.querySelector('span'); if (s) s.textContent = c.principal.titulo; }
    const at = v.querySelector('.vt-atajos');
    if (at) {
      at.querySelectorAll('[data-extra]').forEach((n) => n.remove());
      c.extra.filter((e) => hrefValido(e.href)).forEach((e) => {
        const a = document.createElement('a'); a.dataset.extra = ''; a.href = url(e.href); a.textContent = e.titulo; at.appendChild(a);
      });
    }
  });
}

// Cambia el texto del primer título (h1) de una página sin romper sus iconos: reemplaza solo el último trozo de texto.
function textos(t) {
  const main = document.querySelector('main[data-activa]'); const id = main?.dataset.activa;
  if (!id || !t[id]) return;
  const h1 = main.querySelector('h1'); if (!h1) return;
  if (!h1.dataset.orig) h1.dataset.orig = h1.textContent;
  const w = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT); let ult = null;
  while (w.nextNode()) if (w.currentNode.nodeValue.trim()) ult = w.currentNode;
  if (ult) ult.nodeValue = t[id];
}

function enlaces(lista) {
  document.querySelectorAll('[data-enlace-extra]').forEach((n) => n.remove());
  const lat = document.querySelector('#barra-lat .barra-sec:last-of-type'); const pie = document.querySelector('footer nav[aria-label="Exploración rápida"]');
  for (const e of lista.filter((x) => hrefValido(x.href))) {
    const ext = /^https:/i.test(e.href);
    if (lat) { const a = document.createElement('a'); a.className = 'barra-item'; a.dataset.enlaceExtra = ''; a.href = url(e.href); a.title = e.titulo; if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } const sp = document.createElement('span'); sp.className = 'barra-txt'; sp.textContent = e.titulo; a.appendChild(sp); lat.appendChild(a); }
    if (pie) { const a = document.createElement('a'); a.className = 'text-gray-400 hover:text-galaxy-400 transition-colors'; a.dataset.enlaceExtra = ''; a.href = url(e.href); if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } a.textContent = e.titulo; pie.appendChild(a); }
  }
}

/** Aplica una config (ya normalizada o no) a la página actual. Lo usa también el Panel para la vista previa. */
export function aplicar(cfg) {
  const c = normalizar(cfg);
  portada(c.portada);
  textos(c.textos); enlaces(c.enlaces);
  ocultar(c.menu.ocultos, '.pilar-item[data-nav-id]');
  ocultar(c.lateral.ocultos, '.barra-item[data-nav-id]');
  return c;
}

export async function initSitio() {
  try { const g = localStorage.getItem(LLAVE); if (g) aplicar(JSON.parse(g)); } catch { /* sin caché */ }
  try {
    const { data, error } = await supabase.rpc('sitio_estado');
    if (error || !data) return;
    aplicar(data.config);
    try { localStorage.setItem(LLAVE, JSON.stringify(data.config)); } catch { /* sin espacio */ }
  } catch { /* sin red: se queda como está */ }
}
export const guardarCache = (cfg) => { try { localStorage.setItem(LLAVE, JSON.stringify(cfg)); } catch { /* nada */ } };
