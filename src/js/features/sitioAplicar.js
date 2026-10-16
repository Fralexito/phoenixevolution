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

/** Aplica una config (ya normalizada o no) a la página actual. Lo usa también el Panel para la vista previa. */
export function aplicar(cfg) {
  const c = normalizar(cfg);
  portada(c.portada);
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
