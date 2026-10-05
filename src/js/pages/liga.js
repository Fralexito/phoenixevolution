// Página Liga: solo interacción (los datos ya vienen pintados desde el servidor).
//  · Selector de edición → muestra una edición y oculta las demás de esa liga.
//  · Selector de fecha + flechas ‹ › → muestran el panel de esa fecha (sin barra de desplazamiento).
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function mostrarEdicion(liga, edicion) {
  const bloques = $$(`[data-liga-ed="${liga}"]`);
  if (!bloques.some((b) => b.dataset.edicion === edicion)) { console.warn('[liga] edición desconocida:', liga, edicion); return; }
  bloques.forEach((b) => { b.hidden = b.dataset.edicion !== edicion; });
  const sel = document.querySelector(`[data-ed-select="${liga}"]`); if (sel) sel.value = edicion;
}

document.addEventListener('change', (e) => {
  const s = e.target.closest('[data-ed-select]'); if (s) mostrarEdicion(s.dataset.edSelect, s.value);
});
/** Muestra la fecha `n` de la caja y sincroniza el selector. */
function mostrarFecha(caja, n) {
  const sel = caja.querySelector('[data-fecha-select]');
  const paneles = $$('[data-fecha-panel]', caja);
  if (!paneles.some((p) => p.dataset.fechaPanel === String(n))) { console.warn('[liga] fecha desconocida:', n); return; }
  paneles.forEach((p) => { p.hidden = p.dataset.fechaPanel !== String(n); });
  if (sel) sel.value = String(n);
}
document.addEventListener('change', (e) => {
  const s = e.target.closest('[data-fecha-select]'); if (s) mostrarFecha(s.closest('[data-fechas]'), s.value);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fecha-paso]'); if (!b) return;
  const caja = b.closest('[data-fechas]'); const sel = caja?.querySelector('[data-fecha-select]'); if (!sel) return;
  const i = Math.min(sel.options.length - 1, Math.max(0, sel.selectedIndex + Number(b.dataset.fechaPaso)));
  mostrarFecha(caja, sel.options[i].value);
});

// ---- Selector de liga (reversible: pulsar la otra liga vuelve al instante) ----
function mostrarLiga(id) {
  const secs = $$('[data-liga-sec]'); if (!secs.some((x) => x.dataset.ligaSec === id)) { console.warn('[liga] liga desconocida:', id); return; }
  document.documentElement.classList.add('liga-multi');
  secs.forEach((x) => x.classList.toggle('liga-activa', x.dataset.ligaSec === id));
  $$('[data-liga-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ligaBtn === id)));
  try { history.replaceState(null, '', `#liga-${id}`); } catch { /* sin historial: no pasa nada */ }
  window.scrollTo({ top: 0 });
  $$('[data-forma-strip]', secs.find((x) => x.dataset.ligaSec === id)).forEach(finDeLaRacha);
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-liga-btn]'); if (b) mostrarLiga(b.dataset.ligaBtn); });
{ const h = (location.hash || '').replace('#liga-', ''); const act = $$('[data-liga-btn]').find((b) => b.dataset.ligaBtn === h); if (act) mostrarLiga(h); }

// ---- «Últimos»: recorrer los partidos anteriores con flechas, rueda o arrastrando ----
const paso = (strip) => { const c = strip.firstElementChild; return c ? c.getBoundingClientRect().width + 3 : 20; };
function finDeLaRacha(strip) { strip.scrollLeft = strip.scrollWidth; actualizarFlechas(strip); }   // arranca en lo más reciente
function actualizarFlechas(strip) {
  const w = strip.closest('[data-forma]'); if (!w) return;
  const ini = strip.scrollLeft <= 1, fin = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  const [a, b] = w.querySelectorAll('[data-forma-paso]'); a?.toggleAttribute('disabled', ini); b?.toggleAttribute('disabled', fin);
  w.classList.toggle('forma-sin-mas', ini && fin);
}
$$('[data-forma-strip]').forEach((s) => { finDeLaRacha(s); s.addEventListener('scroll', () => actualizarFlechas(s), { passive: true }); });
window.addEventListener('load', () => $$('[data-forma-strip]').forEach(finDeLaRacha));
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-forma-paso]'); if (!b) return;
  const s = b.closest('[data-forma]')?.querySelector('[data-forma-strip]'); if (s) s.scrollBy({ left: Number(b.dataset.formaPaso) * paso(s) * 2, behavior: 'smooth' });
});
document.addEventListener('wheel', (e) => {   // la rueda del ratón sobre los cuadros los desplaza (sin mover la página mientras haya más)
  const s = e.target.closest?.('[data-forma-strip]'); if (!s) return;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; const max = s.scrollWidth - s.clientWidth;
  if ((d < 0 && s.scrollLeft <= 0) || (d > 0 && s.scrollLeft >= max - 1)) return;
  e.preventDefault(); s.scrollLeft += d;
}, { passive: false });
let arr = null;   // arrastre con el ratón
document.addEventListener('pointerdown', (e) => { const s = e.target.closest?.('[data-forma-strip]'); if (s && e.pointerType === 'mouse') arr = { s, x: e.clientX, l: s.scrollLeft }; });
document.addEventListener('pointermove', (e) => { if (arr) arr.s.scrollLeft = arr.l - (e.clientX - arr.x); });
document.addEventListener('pointerup', () => { arr = null; });
document.addEventListener('keydown', (e) => {
  const s = e.target.closest?.('[data-forma-strip]'); if (!s || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault(); s.scrollBy({ left: (e.key === 'ArrowLeft' ? -1 : 1) * paso(s), behavior: 'smooth' });
});
