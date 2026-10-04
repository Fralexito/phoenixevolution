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
