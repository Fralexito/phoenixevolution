// CALENDARIO PHOENIX (27-oct-2026). Misma regla que el Selector Phoenix («nunca más algo arcaico y feo», Fralex):
// las casillas de FECHA y HORA (<input type="date | time | datetime-local | month">) ya no abren el calendario del sistema,
// sino uno propio con la identidad Galaxy. PC = panel bajo la casilla · celular = hoja desde abajo (como el selector).
//   · date: tocar un día lo elige y cierra.            · month: tocar un mes lo elige y cierra.
//   · time: columnas de hora y minutos + «Listo».       · datetime-local: días + hora + «Listo».
//   · Tocar el título («Octubre 2026») salta a los años (útil para la fecha de nacimiento).
// El <input> de verdad sigue ahí (valor, formularios, min/max, required); al elegir se le pone el valor y se dispara «input» y «change».
// Escuchar a todo el documento = sirve en todas las páginas y en las casillas creadas con JavaScript. Escribir con el teclado sigue
// funcionando. Quedan nativas: readonly, disabled o data-nativo. Si esto fallara, sale el calendario del sistema (nada se rompe).
// Lógica pura y pruebas: core/sistema/cuadriculaFechas.js · estilos: styles/calendarioPhoenix.css (usa la base de styles/selectorPhoenix.css).
import '../../styles/selectorPhoenix.css';
import '../../styles/calendarioPhoenix.css';
import { MESES, DIAS, dos, aISO, deISO, cuadricula, moverMes, fueraDeRango, deHora, minutos } from '../core/sistema/cuadriculaFechas.js';

const TIPOS = new Set(['date', 'time', 'datetime-local', 'month']);
const esNuestro = (el) => el?.tagName === 'INPUT' && TIPOS.has(el.type) && !el.readOnly && !el.disabled && !el.hasAttribute('data-nativo') && !el.closest('[data-nativo]');
const modoHoja = () => matchMedia('(max-width: 640px), (pointer: coarse)').matches;
const quieto = () => document.documentElement.getAttribute('data-aj-mov-efectivo') === 'reducido' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoy = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(), h: t.getHours(), mi: t.getMinutes() }; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let A = null;   // estado del calendario abierto

function tituloDe(inp) {
  const l = (inp.id && document.querySelector(`label[for="${CSS.escape(inp.id)}"]`)) || inp.closest('label');
  const t = (inp.getAttribute('aria-label') || l?.textContent || inp.title || '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 50 ? `${t.slice(0, 47)}…` : t) : ({ date: 'Elige la fecha', month: 'Elige el mes', time: 'Elige la hora', 'datetime-local': 'Elige fecha y hora' }[inp.type]);
}

function cerrar(foco = true) {
  const a = A; if (!a) return; A = null;
  removeEventListener('resize', a.alMover); removeEventListener('scroll', a.alMover, true);
  document.documentElement.classList.remove('sx-bloqueo'); a.inp.removeAttribute('aria-expanded');
  if (quieto()) a.velo.remove(); else { a.velo.classList.add('sx-sale'); setTimeout(() => a.velo.remove(), 180); }
  if (foco) try { a.inp.focus({ preventScroll: true }); } catch { /* nada */ }
}

function aplicar(valor) {
  const a = A; if (!a) return; const inp = a.inp; cerrar();
  if (inp.value === valor) return;
  inp.value = valor;
  inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---------- Pintar ----------
function htmlDias(a) {
  const t = hoy(); const hoyISO = aISO(t.y, t.m, t.d); const selISO = a.sel ? aISO(a.sel.y, a.sel.m, a.sel.d) : ''; const curISO = aISO(a.cur.y, a.cur.m, a.cur.d);
  const celdas = cuadricula(a.vy, a.vm).map((c) => {
    const iso = aISO(c.y, c.m, c.d); const fuera = fueraDeRango(iso, a.min, a.max);
    return `<button type="button" class="cal-dia${c.fuera ? ' cal-fuera' : ''}${iso === hoyISO ? ' cal-hoy' : ''}" data-dia="${iso}" aria-pressed="${iso === selISO}" ${fuera ? 'disabled' : ''} tabindex="${iso === curISO ? 0 : -1}" aria-label="${c.d} de ${MESES[c.m - 1]} de ${c.y}">${c.d}</button>`;
  }).join('');
  return `<div class="cal-sem" aria-hidden="true">${DIAS.map((d) => `<span>${d}</span>`).join('')}</div><div class="cal-grid" role="grid">${celdas}</div>`;
}
function htmlMeses(a) {
  const sel = a.sel && a.sel.y === a.vy ? a.sel.m : 0; const t = hoy();
  return `<div class="cal-meses">${MESES.map((n, i) => { const v = `${a.vy}-${dos(i + 1)}`; return `<button type="button" class="cal-mes${a.vy === t.y && i + 1 === t.m ? ' cal-hoy' : ''}" data-mes="${i + 1}" aria-pressed="${sel === i + 1}" ${fueraDeRango(v, a.min, a.max) ? 'disabled' : ''}>${n.slice(0, 3)}</button>`; }).join('')}</div>`;
}
function htmlAnios(a) {
  const t = hoy(); const mn = deISO(a.min)?.y ?? t.y - 100; const mx = deISO(a.max)?.y ?? t.y + 20; const out = [];
  for (let y = mx; y >= mn; y--) out.push(`<button type="button" class="cal-anio${y === t.y ? ' cal-hoy' : ''}" data-anio="${y}" aria-pressed="${y === a.vy}">${y}</button>`);
  return `<div class="cal-anios" data-anios>${out.join('')}</div>`;
}
function htmlHora(a) {
  const col = (lista, cual, val) => `<div class="cal-col" data-col="${cual}" role="listbox" aria-label="${cual === 'h' ? 'Hora' : 'Minutos'}">${lista.map((n) => `<button type="button" role="option" data-${cual}="${n}" aria-selected="${n === val}">${dos(n)}</button>`).join('')}</div>`;
  const hs = Array.from({ length: 24 }, (_, i) => i);
  return `<div class="cal-hora"><p class="cal-hora-t"><i class="fa-regular fa-clock" aria-hidden="true"></i> <b>${dos(a.h)}:${dos(a.mi)}</b></p><div class="cal-cols">${col(hs, 'h', a.h)}<span class="cal-dos" aria-hidden="true">:</span>${col(minutos(a.inp.step), 'mi', a.mi)}</div></div>`;
}
function pintar(enfocar = true) {
  const a = A; if (!a) return;
  const conFecha = a.tipo !== 'time';
  let cab = '', cuerpo = '';
  if (conFecha) {
    const tit = a.vista === 'dias' ? `${MESES[a.vm - 1]} ${a.vy}` : a.vista === 'meses' ? `${a.vy}` : 'Elige el año';
    cab = `<div class="cal-cab"><button type="button" class="cal-flecha" data-paso="-1" aria-label="Anterior" ${a.vista === 'anios' ? 'hidden' : ''}><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="cal-titulo" data-titulo aria-label="${esc(tit)}: cambiar">${esc(tit)} <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
      <button type="button" class="cal-flecha" data-paso="1" aria-label="Siguiente" ${a.vista === 'anios' ? 'hidden' : ''}><i class="fa-solid fa-chevron-right"></i></button></div>`;
    cuerpo = a.vista === 'dias' ? htmlDias(a) : a.vista === 'meses' ? htmlMeses(a) : htmlAnios(a);
  }
  const hora = a.tipo === 'time' || a.tipo === 'datetime-local' ? htmlHora(a) : '';
  const conListo = !!hora;
  const pie = `<div class="cal-pie">
    <button type="button" class="cal-txt" data-hoy>${a.tipo === 'time' ? 'Ahora' : a.tipo === 'month' ? 'Este mes' : a.tipo === 'datetime-local' ? 'Ahora' : 'Hoy'}</button>
    ${a.inp.required ? '' : '<button type="button" class="cal-txt" data-borrar>Borrar</button>'}
    ${conListo ? '<button type="button" class="cal-listo" data-listo>Listo</button>' : ''}</div>`;
  a.cuerpo.innerHTML = `<div class="cal-partes${conFecha && hora ? ' cal-doble' : ''}">${conFecha ? `<div class="cal-fecha">${cab}${cuerpo}</div>` : ''}${hora}</div>${pie}`;
  a.cuerpo.querySelectorAll('.cal-col').forEach((c) => { const s = c.querySelector('[aria-selected="true"]'); if (s) c.scrollTop = s.offsetTop - (c.clientHeight - s.offsetHeight) / 2; });
  const an = a.cuerpo.querySelector('[data-anios] [aria-pressed="true"]'); if (an) an.parentElement.scrollTop = an.offsetTop - (an.parentElement.clientHeight - an.offsetHeight) / 2;
  if (!a.hoja) colocar();
  if (enfocar) (a.cuerpo.querySelector('.cal-dia[tabindex="0"]:not([disabled])') ?? a.cuerpo.querySelector('[aria-pressed="true"]') ?? a.cuerpo.querySelector('button:not([disabled])'))?.focus({ preventScroll: true });
}

function colocar() {
  const a = A; if (!a || a.hoja) return;
  const r = a.inp.getBoundingClientRect(); const m = 8; const p = a.panel;
  const ancho = Math.min(p.offsetWidth || 320, innerWidth - m * 2);
  const abajo = innerHeight - r.bottom - m, arriba = r.top - m; const alto = p.offsetHeight;
  const va = abajo >= alto || abajo >= arriba ? 'abajo' : 'arriba';
  Object.assign(p.style, { left: `${Math.min(Math.max(m, r.left), innerWidth - ancho - m)}px`, top: va === 'abajo' ? `${r.bottom + 6}px` : 'auto', bottom: va === 'arriba' ? `${innerHeight - r.top + 6}px` : 'auto', maxHeight: `${Math.max(260, va === 'abajo' ? abajo - 6 : arriba - 6)}px` });
  p.dataset.lado = va;
}

// ---------- Abrir ----------
function abrir(inp) {
  if (A) cerrar(false);
  const tipo = inp.type; const hoja = modoHoja(); const t = hoy();
  const sel = tipo === 'time' ? null : deISO(inp.value);
  const hm = deHora(tipo === 'datetime-local' ? String(inp.value).split('T')[1] : inp.value);
  const base = sel ?? deISO(inp.min && fueraDeRango(aISO(t.y, t.m, t.d), inp.min, '') ? inp.min : '') ?? t;
  const velo = document.createElement('div'); velo.className = `sx-velo${hoja ? ' sx-hoja' : ''}`;
  const tit = tituloDe(inp);
  if (hoja) {
    const cab = document.createElement('div'); cab.className = 'sx-cab';
    cab.innerHTML = '<span class="sx-asa" aria-hidden="true"></span><b></b><button type="button" class="sx-x" aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
    cab.querySelector('b').textContent = tit; velo.append(cab);
  }
  const panel = document.createElement('div'); panel.className = `sx-panel cal-panel cal-${tipo}`; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', tit); panel.tabIndex = -1;
  const cuerpo = document.createElement('div'); cuerpo.className = 'cal-cuerpo'; panel.append(cuerpo); velo.append(panel); document.body.append(velo);
  const alMover = (e) => { if (e?.type === 'scroll' && panel.contains(e.target)) return; if (hoja) return; if (e?.type === 'resize') { colocar(); return; } cerrar(false); };
  A = { inp, tipo, hoja, velo, panel, cuerpo, alMover, min: inp.min, max: inp.max, sel, cur: sel ?? { y: base.y, m: base.m, d: base.d ?? 1 },
    vy: base.y, vm: base.m, vista: tipo === 'month' ? 'meses' : 'dias', h: hm?.h ?? (tipo === 'time' ? t.h : 20), mi: hm?.mi ?? 0 };
  if (!minutos(inp.step).includes(A.mi)) A.mi = 0;
  inp.setAttribute('aria-expanded', 'true');
  if (hoja) document.documentElement.classList.add('sx-bloqueo');
  addEventListener('resize', alMover); addEventListener('scroll', alMover, true);
  pintar();
  velo.addEventListener('pointerdown', (e) => { if (e.target === velo) { e.preventDefault(); cerrar(); } });
  velo.addEventListener('click', alClic);
  panel.addEventListener('keydown', alTecla);
}

function valorActual(a) {
  const f = a.sel ?? (a.tipo === 'datetime-local' ? hoy() : null);
  if (a.tipo === 'time') return `${dos(a.h)}:${dos(a.mi)}`;
  if (a.tipo === 'datetime-local') return `${aISO(f.y, f.m, f.d)}T${dos(a.h)}:${dos(a.mi)}`;
  return '';
}

function alClic(e) {
  const a = A; if (!a) return; const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.classList.contains('sx-x')) { cerrar(); return; }
  if (b.dataset.paso) { const p = Number(b.dataset.paso); if (a.vista === 'dias') ({ y: a.vy, m: a.vm } = moverMes(a.vy, a.vm, p)); else a.vy += p; pintar(false); return; }
  if (b.hasAttribute('data-titulo')) { a.vista = a.vista === 'anios' ? (a.tipo === 'month' ? 'meses' : 'dias') : 'anios'; pintar(); return; }
  if (b.dataset.anio) { a.vy = Number(b.dataset.anio); a.vista = 'meses'; pintar(); return; }
  if (b.dataset.mes) {
    const m = Number(b.dataset.mes);
    if (a.tipo === 'month') { aplicar(`${a.vy}-${dos(m)}`); return; }
    a.vm = m; a.vista = 'dias'; pintar(); return;
  }
  if (b.dataset.dia) {
    const d = deISO(b.dataset.dia);
    if (a.tipo === 'date') { aplicar(b.dataset.dia); return; }
    a.sel = d; a.cur = d; a.vy = d.y; a.vm = d.m; pintar(false); return;
  }
  if (b.dataset.h !== undefined) { a.h = Number(b.dataset.h); pintar(false); return; }
  if (b.dataset.mi !== undefined) { a.mi = Number(b.dataset.mi); pintar(false); return; }
  if (b.hasAttribute('data-hoy')) {
    const t = hoy();
    if (a.tipo === 'date') { aplicar(aISO(t.y, t.m, t.d)); return; }
    if (a.tipo === 'month') { aplicar(`${t.y}-${dos(t.m)}`); return; }
    a.sel = { y: t.y, m: t.m, d: t.d }; a.cur = a.sel; a.vy = t.y; a.vm = t.m; a.h = t.h; a.mi = minutos(a.inp.step).reduce((x, n) => (n <= t.mi ? n : x), 0); pintar(false); return;
  }
  if (b.hasAttribute('data-borrar')) { aplicar(''); return; }
  if (b.hasAttribute('data-listo')) { aplicar(valorActual(a)); }
}

function alTecla(e) {
  const a = A; if (!a) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return; }
  if (e.key === 'Tab') {   // el foco no se escapa del calendario
    const f = [...a.panel.querySelectorAll('button:not([disabled]):not([hidden])')].filter((x) => x.tabIndex !== -1 || x === document.activeElement);
    if (!f.length) return; const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    return;
  }
  const dia = e.target.closest?.('.cal-dia'); if (!dia || a.vista !== 'dias') return;
  const salto = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (salto || e.key === 'PageUp' || e.key === 'PageDown') {
    e.preventDefault();
    const c = deISO(dia.dataset.dia); const fecha = new Date(Date.UTC(c.y, c.m - 1, c.d));
    if (salto) fecha.setUTCDate(fecha.getUTCDate() + salto); else fecha.setUTCMonth(fecha.getUTCMonth() + (e.key === 'PageUp' ? -1 : 1));
    a.cur = { y: fecha.getUTCFullYear(), m: fecha.getUTCMonth() + 1, d: fecha.getUTCDate() }; a.vy = a.cur.y; a.vm = a.cur.m; pintar();
  }
}

/** Arranca el calendario para toda la página (una sola vez). */
export function initCalendarioPhoenix() {
  if (window.__calendarioPhoenix) return; window.__calendarioPhoenix = true;
  try {
    document.addEventListener('mousedown', (e) => {
      const i = e.target; if (e.button !== 0 || !esNuestro(i)) return;
      e.preventDefault(); try { i.focus({ preventScroll: true }); } catch { /* nada */ }
      if (A?.inp === i) cerrar(); else abrir(i);
    }, true);
    document.addEventListener('click', (e) => { if (esNuestro(e.target)) e.preventDefault(); }, true);   // Firefox abre el suyo al hacer clic
    let toque = null;
    document.addEventListener('touchstart', (e) => { const i = e.target; if (!esNuestro(i)) return; e.preventDefault(); const t = e.touches[0]; toque = { i, x: t.clientX, y: t.clientY }; }, { capture: true, passive: false });
    document.addEventListener('touchend', (e) => {
      if (!toque) return; const { i, x, y } = toque; toque = null; const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - x, t.clientY - y) > 12) return; e.preventDefault(); abrir(i);
    }, { capture: true, passive: false });
    document.addEventListener('keydown', (e) => {
      const i = e.target; if (!esNuestro(i) || A) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); abrir(i); }
    }, true);
    document.documentElement.setAttribute('data-calendario-phoenix', '');
  } catch (e) { console.warn('[calendario] queda el del sistema:', e?.message ?? e); }
}
