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
  document.documentElement.classList.add('liga-multi'); document.documentElement.dataset.tema = id;   // CSS cambia la paleta según la liga
  secs.forEach((x) => x.classList.toggle('liga-activa', x.dataset.ligaSec === id));
  $$('[data-liga-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ligaBtn === id)));
  try { history.replaceState(null, '', `#liga-${id}`); } catch { /* sin historial: no pasa nada */ }
  window.scrollTo({ top: 0 });
  $$('[data-forma-strip]', secs.find((x) => x.dataset.ligaSec === id)).forEach(finDeLaRacha);
  moverPiedra();
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-liga-btn]'); if (b) mostrarLiga(b.dataset.ligaBtn); });
{ const h = (location.hash || '').replace('#liga-', ''); const act = $$('[data-liga-btn]').find((b) => b.dataset.ligaBtn === h); if (act) mostrarLiga(h); }

// ---- «Últimos»: recorrer los partidos anteriores con flechas, rueda o arrastrando ----
const paso = (strip) => { const c = strip.firstElementChild; return c ? c.getBoundingClientRect().width + 3 : 20; };
function finDeLaRacha(strip) { strip.scrollLeft = strip.scrollWidth; actualizarFlechas(strip); }   // arranca en lo más reciente
function actualizarFlechas(strip) {
  const w = strip.closest('[data-forma]'); if (!w) return;
  const cont = w.querySelector('[data-forma-cont]'); if (cont) { const tot = Number(cont.dataset.total), ini1 = Math.round(strip.scrollLeft / paso(strip)) + 1; cont.textContent = tot <= 5 ? `${tot}/${tot}` : `${ini1}–${Math.min(tot, ini1 + 4)}/${tot}`; }
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

// ---- Piedra deslizante del selector de liga ----
function moverPiedra() {
  const sel = document.querySelector('.liga-sel'); if (!sel) return;
  const on = sel.querySelector('[aria-pressed="true"]'), t = sel.querySelector('.liga-thumb'); if (!on || !t || !on.offsetWidth) return;
  t.style.width = `${on.offsetWidth}px`; t.style.transform = `translateX(${on.offsetLeft - 4}px)`; sel.classList.add('lista');
}
moverPiedra(); window.addEventListener('load', moverPiedra); window.addEventListener('resize', moverPiedra); document.fonts?.ready?.then(moverPiedra);

// ---- Tocar un jugador de la tabla resalta sus partidos en Resultados (tocar otra vez, o «Quitar», lo limpia) ----
function resaltar(ed, nombre) {
  $$('tr[data-jug]', ed).forEach((t) => t.classList.toggle('liga-sel-fila', t.dataset.jug === nombre));
  const caja = ed.querySelector('[data-fechas]'); if (!caja) return;
  caja.classList.toggle('liga-resalta', !!nombre);
  $$('.liga-partido', caja).forEach((li) => li.classList.toggle('liga-ped', !!nombre && (li.dataset.mL === nombre || li.dataset.mV === nombre)));
  let chip = caja.querySelector('.liga-filtro-w');
  if (!nombre) { chip?.remove(); return; }
  if (!chip) { chip = document.createElement('div'); chip.className = 'liga-filtro-w'; caja.querySelector('.liga-prog').after(chip); }
  chip.innerHTML = `<span class="liga-filtro"><i class="fa-solid fa-eye"></i><span class="liga-filtro-n"></span><button type="button" data-liga-quitar aria-label="Quitar resalte"><i class="fa-solid fa-xmark"></i></button></span>`;
  chip.querySelector('.liga-filtro-n').textContent = nombre;
}
document.addEventListener('click', (e) => {
  const ed = e.target.closest('[data-edicion]'); if (!ed) return;
  if (e.target.closest('[data-liga-quitar]')) { resaltar(ed, null); return; }
  if (e.target.closest('[data-forma-paso], [data-forma-strip]')) return;
  const tr = e.target.closest('tr[data-jug]'); if (!tr) return;
  resaltar(ed, tr.classList.contains('liga-sel-fila') ? null : tr.dataset.jug);
});

// ---- Organizador → su carta: busca la ficha en Jugadores por nombre/apodo y apunta el enlace a su perfil (si falla, queda el enlace a Jugadores) ----
(async () => {
  const enlaces = $$('[data-org-jugador]'); if (!enlaces.length) return;
  try {
    const [{ supabase }, { coincide }, { href }] = await Promise.all([import('../core/supabase.js'), import('../core/perfil.js'), import('../core/config.js')]);
    const { data, error } = await supabase.from('jugadores').select('id, nombre, apodo'); if (error) throw error;
    for (const a of enlaces) { const j = (data ?? []).find((x) => coincide(x, a.dataset.orgJugador)); if (j) a.href = href(`jugador/?id=${encodeURIComponent(j.id)}`); else console.warn('[liga] organizador sin ficha:', a.dataset.orgJugador); }
  } catch (e) { console.warn('[liga] no se pudo enlazar al organizador:', e); }
})();
