// SELECTOR PHOENIX (27-oct-2026, pedido de Fralex: «que la página nunca más tenga algo así, tan arcaico y feo»).
// Reemplaza la LISTA DESPLEGABLE NATIVA del sistema (la ventana gris de Android/Windows) por una propia con la identidad Galaxy:
//   · PC: un panel que cae justo debajo del selector (o encima si no cabe).
//   · Celular / pantalla táctil: una hoja que sube desde abajo, con título y filas grandes.
// Cómo funciona (sin tocar ninguna página): escucha a TODO el documento. Cuando alguien va a abrir un <select>, se cancela la lista
// nativa y se muestra la propia. El <select> de verdad sigue ahí: guarda el valor, se ve igual cerrado, funciona en formularios
// y con su <label>; al elegir, se le pone el valor y se dispara «input» y «change» como siempre (el código de cada página no cambia).
// Sirve también para los <select> que se crean después con JavaScript. Quedan nativos: los de varias opciones (multiple / size>1)
// y los que tengan data-nativo. Si este archivo fallara, se ve la lista nativa (nada se rompe).
// Regla para siempre: REDISENO.md («Nunca listas nativas»). Lógica pura y pruebas: core/sistema/listaOpciones.js.
import '../../styles/selectorPhoenix.css';
import { siguienteHabilitada, primeraHabilitada, ultimaHabilitada, buscarPorTexto } from '../core/sistema/listaOpciones.js';

const esNativo = (s) => !s || s.multiple || s.size > 1 || s.disabled || s.hasAttribute('data-nativo') || s.closest('[data-nativo]');
const modoHoja = () => matchMedia('(max-width: 640px), (pointer: coarse)').matches;
const quieto = () => document.documentElement.getAttribute('data-aj-mov-efectivo') === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;
let abierto = null;   // { sel, velo, panel, items, ops, activo, teclas, t }
let n = 0;

function tituloDe(sel) {
  const l = (sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`)) || sel.closest('label');
  const t = (sel.getAttribute('aria-label') || l?.textContent || sel.title || '').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

function cerrar(devolverFoco = true) {
  const a = abierto; if (!a) return; abierto = null;
  removeEventListener('resize', a.alMover); removeEventListener('scroll', a.alMover, true);
  document.documentElement.classList.remove('sx-bloqueo');
  a.sel.removeAttribute('aria-expanded');
  const fuera = () => { a.velo.remove(); };
  if (quieto()) fuera(); else { a.velo.classList.add('sx-sale'); setTimeout(fuera, 180); }
  if (devolverFoco) try { a.sel.focus({ preventScroll: true }); } catch { /* sin foco: nada */ }
}

function marcar(i, desplazar = true) {
  const a = abierto; if (!a || i < 0) return;
  a.items[a.activo]?.classList.remove('sx-activa');
  a.activo = i; const li = a.items[i]; if (!li) return;
  li.classList.add('sx-activa'); a.panel.setAttribute('aria-activedescendant', li.id);
  if (desplazar) li.scrollIntoView({ block: 'nearest' });
}

function elegir(i) {
  const a = abierto; if (!a || a.ops[i]?.desactivada) return;
  const sel = a.sel; const cambio = sel.selectedIndex !== i;
  cerrar();
  if (!cambio) return;
  sel.selectedIndex = i;
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function colocar() {
  const a = abierto; if (!a || a.hoja) return;
  const r = a.sel.getBoundingClientRect(); const m = 8;
  const ancho = Math.min(Math.max(r.width, 220), innerWidth - m * 2);
  const abajo = innerHeight - r.bottom - m, arriba = r.top - m;
  const alto = Math.min(a.panel.scrollHeight, 360);
  const va = abajo >= Math.min(alto, 220) || abajo >= arriba ? 'abajo' : 'arriba';
  const max = Math.max(140, Math.min(360, va === 'abajo' ? abajo - 6 : arriba - 6));
  Object.assign(a.panel.style, { width: `${ancho}px`, left: `${Math.min(Math.max(m, r.left), innerWidth - ancho - m)}px`, maxHeight: `${max}px`,
    top: va === 'abajo' ? `${r.bottom + 6}px` : 'auto', bottom: va === 'arriba' ? `${innerHeight - r.top + 6}px` : 'auto' });
  a.panel.dataset.lado = va;
}

function abrir(sel) {
  if (abierto) cerrar(false);
  const id = `sx-${++n}`; const hoja = modoHoja();
  const velo = document.createElement('div'); velo.className = `sx-velo${hoja ? ' sx-hoja' : ''}`;
  const panel = document.createElement('div'); panel.className = 'sx-panel'; panel.id = id; panel.tabIndex = -1;
  panel.setAttribute('role', 'listbox'); const tit = tituloDe(sel); if (tit) panel.setAttribute('aria-label', tit);
  if (hoja) {
    const cab = document.createElement('div'); cab.className = 'sx-cab';
    cab.innerHTML = '<span class="sx-asa" aria-hidden="true"></span><b></b><button type="button" class="sx-x" aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
    cab.querySelector('b').textContent = tit || 'Elige una opción';
    velo.append(cab);
  }
  const lista = document.createElement('ul'); lista.className = 'sx-lista'; lista.setAttribute('role', 'presentation');
  const ops = []; const items = [];
  const ponerOpcion = (o, dentro) => {
    const i = o.index; if (o.hidden) { ops[i] = { texto: o.text, desactivada: true }; return; }
    const des = o.disabled || o.parentElement?.disabled;
    ops[i] = { texto: o.text, desactivada: des };
    const li = document.createElement('li'); li.id = `${id}-${i}`; li.className = 'sx-op'; li.dataset.i = i;
    li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel.selectedIndex));
    if (des) li.setAttribute('aria-disabled', 'true');
    li.innerHTML = '<span class="sx-txt"></span><i class="fa-solid fa-check sx-check" aria-hidden="true"></i>';
    li.querySelector('.sx-txt').textContent = o.text;
    if (dentro) li.classList.add('sx-en-grupo');
    items[i] = li; lista.append(li);
  };
  for (const h of sel.children) {
    if (h.tagName === 'OPTGROUP') {
      const g = document.createElement('li'); g.className = 'sx-grupo'; g.setAttribute('role', 'presentation'); g.textContent = h.label; lista.append(g);
      for (const o of h.children) if (o.tagName === 'OPTION') ponerOpcion(o, true);
    } else if (h.tagName === 'OPTION') ponerOpcion(h, false);
  }
  panel.append(lista); velo.append(panel); document.body.append(velo);
  const alMover = (e) => { if (e?.type === 'scroll' && panel.contains(e.target)) return; if (hoja) return; if (e?.type === 'resize') { colocar(); return; } cerrar(false); };
  abierto = { sel, velo, panel, items, ops, activo: -1, teclas: '', t: 0, hoja, alMover };
  sel.setAttribute('aria-expanded', 'true');
  if (hoja) document.documentElement.classList.add('sx-bloqueo'); else colocar();
  addEventListener('resize', alMover); addEventListener('scroll', alMover, true);
  marcar(sel.selectedIndex >= 0 && !ops[sel.selectedIndex]?.desactivada ? sel.selectedIndex : primeraHabilitada(ops), false);
  // La elegida queda a la vista (centrada) al abrir
  const li = items[abierto.activo]; if (li) lista.scrollTop = li.offsetTop - (lista.clientHeight - li.offsetHeight) / 2;
  if (hoja && lista.scrollHeight <= lista.clientHeight) lista.scrollTop = 0;
  try { panel.focus({ preventScroll: true }); } catch { /* nada */ }

  velo.addEventListener('pointerdown', (e) => { if (e.target === velo) { e.preventDefault(); cerrar(); } });
  velo.addEventListener('click', (e) => {
    if (e.target.closest('.sx-x')) { cerrar(); return; }
    const op = e.target.closest('.sx-op'); if (op) elegir(Number(op.dataset.i));
  });
  if (!hoja) lista.addEventListener('pointermove', (e) => { const op = e.target.closest('.sx-op:not([aria-disabled])'); if (op && Number(op.dataset.i) !== abierto?.activo) marcar(Number(op.dataset.i), false); });
  panel.addEventListener('keydown', teclaPanel);
}

function teclaPanel(e) {
  const a = abierto; if (!a) return;
  const ops = a.ops; let i = a.activo;
  switch (e.key) {
    case 'ArrowDown': i = siguienteHabilitada(ops, i, 1); break;
    case 'ArrowUp': if (e.altKey) { elegir(a.activo); e.preventDefault(); return; } i = siguienteHabilitada(ops, i, -1); break;
    case 'Home': i = primeraHabilitada(ops); break;
    case 'End': i = ultimaHabilitada(ops); break;
    case 'PageDown': for (let k = 0; k < 8; k++) i = siguienteHabilitada(ops, i, 1); break;
    case 'PageUp': for (let k = 0; k < 8; k++) i = siguienteHabilitada(ops, i, -1); break;
    case 'Enter': case ' ': if (e.key === ' ' && a.teclas) break; e.preventDefault(); elegir(a.activo); return;
    case 'Escape': e.preventDefault(); e.stopPropagation(); cerrar(); return;
    case 'Tab': cerrar(); return;
    default:
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ahora = performance.now(); a.teclas = ahora - a.t > 700 ? e.key : a.teclas + e.key; a.t = ahora;
        const j = buscarPorTexto(ops, a.teclas, a.teclas.length > 1 ? a.activo - 1 : a.activo); if (j >= 0) i = j;
        e.preventDefault(); marcar(i); return;
      }
      return;
  }
  e.preventDefault(); marcar(i);
}

/** Arranca el selector para toda la página (una sola vez). */
export function initSelectorPhoenix() {
  if (window.__selectorPhoenix) return; window.__selectorPhoenix = true;
  try {
    // PC (mouse): se cancela la lista nativa al apretar y se abre la propia
    document.addEventListener('mousedown', (e) => {
      const s = e.target.closest?.('select'); if (!s || e.button !== 0 || esNativo(s)) return;
      e.preventDefault(); try { s.focus({ preventScroll: true }); } catch { /* nada */ }
      if (abierto?.sel === s) cerrar(); else abrir(s);
    }, true);
    // Celular: tocar (sin arrastrar) abre la hoja. Se cancela el toque para que el sistema no abra la suya.
    let toque = null;
    document.addEventListener('touchstart', (e) => {
      const s = e.target.closest?.('select'); if (!s || esNativo(s)) return;
      e.preventDefault(); const t = e.touches[0]; toque = { s, x: t.clientX, y: t.clientY };
    }, { capture: true, passive: false });
    document.addEventListener('touchend', (e) => {
      if (!toque) return; const { s, x, y } = toque; toque = null; const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - x, t.clientY - y) > 12) return;
      e.preventDefault(); abrir(s);
    }, { capture: true, passive: false });
    // Teclado: Enter, Espacio, F4 o Alt+↓ abren la propia (las flechas solas siguen cambiando el valor como siempre)
    document.addEventListener('keydown', (e) => {
      const s = e.target; if (s?.tagName !== 'SELECT' || esNativo(s) || abierto) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) { e.preventDefault(); abrir(s); }
    }, true);
    document.documentElement.setAttribute('data-selector-phoenix', '');
  } catch (e) { console.warn('[selector] queda la lista nativa:', e?.message ?? e); }
}
