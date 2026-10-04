// Página Liga: solo interacción (los datos ya vienen pintados desde el servidor).
//  · Selector de edición → muestra una edición y oculta las demás de esa liga.
//  · Botones de fecha → muestran el panel de esa fecha.
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
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-fecha-btn]'); if (!b) return;
  const caja = b.closest('[data-fechas]'); if (!caja) return;
  $$('[data-fecha-btn]', caja).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $$('[data-fecha-panel]', caja).forEach((p) => { p.hidden = p.dataset.fechaPanel !== b.dataset.fechaBtn; });
});
