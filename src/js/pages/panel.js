// Página /panel/ (solo admin): edita la configuración del sitio con Guardar · Deshacer · Rehacer.
// Esquema: pages/panel → core/sitio (lógica pura) · features/sitioAplicar (aplica en la web) · RPC sitio_estado / sitio_guardar / sitio_mover.
import { onSession, can } from '../core/session.js';
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { normalizar, mover, alternar, iguales, esBase, hrefValido, VENTANAS, VISTAS, MAX_EXTRA } from '../core/sitio.js';
import { aplicar, guardarCache } from '../features/sitioAplicar.js';

const $ = (id) => document.getElementById(id);
const NOMBRES = { social: 'Zona Social', competencia: 'Competencia', duelos: 'Duelos', club: 'Mi Club' };
const VISTA_TXT = { '': 'Como está', vivo: 'Botón grande + atajos', mosaico: 'Mosaico de iconos', grande: 'Una grande y dos chicas' };
const S = { guardada: normalizar({}), borrador: normalizar({}), puedeDes: false, puedeReh: false, ocupado: false, iniciado: false };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sucio = () => !iguales(S.borrador, S.guardada);
const clone = (o) => JSON.parse(JSON.stringify(o));

function error(msg) { const e = $('pn-error'); e.textContent = msg || ''; e.hidden = !msg; }
const msg = (err) => /NADA_QUE/.test(err?.message || '') ? 'No hay más pasos.' : /NO_AUTORIZADO/.test(err?.message || '') ? 'Solo el admin puede cambiar esto.' : (err?.message || 'Algo salió mal. Inténtalo de nuevo.');

function lista(selector) {
  const m = new Map();
  document.querySelectorAll(selector).forEach((a) => { const id = a.dataset.navId; if (id && !a.dataset.soloStaff && !m.has(id)) m.set(id, (a.getAttribute('title') || a.textContent || id).replace(/\s+/g, ' ').trim()); });
  return [...m];
}
const checks = (items, ocultos, nombre) => items.length ? `<ul class="grid sm:grid-cols-2 gap-1.5">${items.map(([id, t]) => `<li><label class="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-200 cursor-pointer"><input type="checkbox" data-${nombre}="${esc(id)}" ${ocultos.includes(id) ? '' : 'checked'}> ${esc(t)}</label></li>`).join('')}</ul>` : '<p class="text-xs text-gray-400">No hay botones para mostrar aquí.</p>';
const campo = (rot, v, extra = '') => `<label class="block text-[12px] text-gray-400 uppercase tracking-wider">${rot}<input type="text" class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" value="${esc(v)}" ${extra}></label>`;

function ventanaHTML(id, i) {
  const c = S.borrador.portada.ventanas[id];
  const pr = c.principal ?? { titulo: '', href: '' };
  return `<div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3" data-v="${id}">
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-2 flex-1 font-display font-bold text-white uppercase tracking-wider text-sm"><input type="checkbox" data-on ${c.on ? 'checked' : ''}> ${NOMBRES[id]}</label>
      <button type="button" class="btn btn-ghost !min-h-8 !px-2.5 !text-[12px]" data-sube aria-label="Subir" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="btn btn-ghost !min-h-8 !px-2.5 !text-[12px]" data-baja aria-label="Bajar" ${i === VENTANAS.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
    </div>
    <label class="block text-[12px] text-gray-400 uppercase tracking-wider">Diseño al girar
      <select data-vista class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">${['', ...VISTAS].map((v) => `<option value="${v}" ${c.vista === v ? 'selected' : ''}>${VISTA_TXT[v]}</option>`).join('')}</select></label>
    <div class="grid sm:grid-cols-2 gap-2">${campo('Botón grande · texto', pr.titulo, 'data-pt maxlength="28" placeholder="Como está"')}${campo('Botón grande · a dónde va', pr.href, 'data-ph placeholder="liga/"')}</div>
    <div class="space-y-2"><p class="text-[12px] text-gray-400 uppercase tracking-wider">Atajos añadidos (${c.extra.length}/${MAX_EXTRA})</p>
      ${c.extra.map((e, k) => `<div class="grid grid-cols-[1fr_1fr_auto] gap-2" data-k="${k}">${campo('', e.titulo, 'data-et maxlength="22"')}${campo('', e.href, 'data-eh')}<button type="button" class="btn btn-ghost !min-h-9 !px-2.5" data-quita aria-label="Quitar atajo"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}
      ${c.extra.length < MAX_EXTRA ? '<button type="button" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]" data-suma><i class="fa-solid fa-plus mr-1"></i>Añadir atajo</button>' : ''}</div>
  </div>`;
}

function pintar() {
  const b = S.borrador;
  const sec = (ico, t, res, cont, ab = false) => `<details class="glass-panel rounded-2xl px-4 py-3" ${ab ? 'open' : ''}><summary class="cursor-pointer font-display font-bold text-white uppercase tracking-wider text-sm select-none"><i class="fa-solid ${ico} text-galaxy-400 mr-2"></i>${t} <span class="text-gray-400 normal-case tracking-normal font-normal text-xs">· ${res}</span></summary><div class="mt-3 space-y-3">${cont}</div></details>`;
  const foco = document.activeElement?.id;
  $('pn-cuerpo').innerHTML =
    sec('fa-house', 'Portada', 'ventanas, orden y textos',
      `<div class="grid sm:grid-cols-2 gap-2">${campo('Título de arriba (vacío = «Bienvenido a la», sigue «Galaxy» debajo)', b.portada.titulo, 'data-titulo maxlength="40"')}${campo('Frase debajo del título', b.portada.sub, 'data-sub maxlength="120"')}</div>` + b.portada.orden.map(ventanaHTML).join(''), true) +
    sec('fa-bars', 'Menú de arriba', 'quita o pon botones', checks(lista('.pilar-item[data-nav-id]'), b.menu.ocultos, 'menu')) +
    sec('fa-table-columns', 'Barra lateral izquierda', 'quita o pon accesos', checks(lista('.barra-item[data-nav-id]'), b.lateral.ocultos, 'lat'));
  if (foco) $(foco)?.focus();
  const hay = sucio();
  $('pn-estado').textContent = S.ocupado ? 'Guardando…' : hay ? 'Tienes cambios sin guardar.' : 'Todo guardado.';
  $('pn-guardar').disabled = S.ocupado || !hay; $('pn-descartar').disabled = S.ocupado || !hay;
  $('pn-deshacer').disabled = S.ocupado || hay || !S.puedeDes; $('pn-rehacer').disabled = S.ocupado || hay || !S.puedeReh;
  $('pn-restaurar').hidden = esBase(S.guardada) && !hay;
  aplicar(S.borrador); // vista previa en vivo de los menús de esta página
}

function cambiar(fn) { fn(S.borrador); S.borrador = normalizar(S.borrador); pintar(); }
const V = (el) => el.closest('[data-v]').dataset.v;

function enlazar() {
  const c = $('pn-cuerpo');
  c.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-on]')) cambiar((b) => { b.portada.ventanas[V(t)].on = t.checked; });
    else if (t.matches('[data-vista]')) cambiar((b) => { b.portada.ventanas[V(t)].vista = t.value; });
    else if (t.matches('[data-menu]')) cambiar((b) => { b.menu.ocultos = alternar(b.menu.ocultos, t.dataset.menu); });
    else if (t.matches('[data-lat]')) cambiar((b) => { b.lateral.ocultos = alternar(b.lateral.ocultos, t.dataset.lat); });
  });
  const campoTxt = (t) => {
    const b = S.borrador;
    if (t.matches('[data-titulo]')) b.portada.titulo = t.value;
    else if (t.matches('[data-sub]')) b.portada.sub = t.value;
    else if (t.matches('[data-pt],[data-ph]')) { const v = b.portada.ventanas[V(t)]; const p = v.principal ?? { titulo: '', href: '' }; if (t.matches('[data-pt]')) p.titulo = t.value; else p.href = t.value; v.principal = p; }
    else if (t.matches('[data-et],[data-eh]')) { const v = b.portada.ventanas[V(t)]; const k = Number(t.closest('[data-k]').dataset.k); if (t.matches('[data-et]')) v.extra[k].titulo = t.value; else v.extra[k].href = t.value; }
  };
  // Al escribir NO se repinta (se perdería el cursor); se guarda el borrador y solo se actualizan los botones de arriba.
  c.addEventListener('input', (e) => { if (!e.target.matches('input[type=text]')) return; const v = e.target.closest('[data-v]'); const antes = clone(S.borrador); campoTxt(e.target); if (JSON.stringify(antes) !== JSON.stringify(S.borrador)) { const hay = !iguales(normalizar(S.borrador), S.guardada); $('pn-guardar').disabled = !hay; $('pn-descartar').disabled = !hay; $('pn-estado').textContent = hay ? 'Tienes cambios sin guardar.' : 'Todo guardado.'; $('pn-deshacer').disabled = hay || !S.puedeDes; $('pn-rehacer').disabled = hay || !S.puedeReh; void v; } });
  c.addEventListener('focusout', (e) => { if (e.target.matches('input[type=text]')) { S.borrador = normalizar(S.borrador); const aviso = validar(); if (aviso) error(aviso); else error(''); pintar(); } });
  c.addEventListener('click', (e) => {
    const bt = e.target.closest('button'); if (!bt) return;
    if (bt.matches('[data-sube]')) cambiar((b) => { b.portada.orden = mover(b.portada.orden, V(bt), -1); });
    else if (bt.matches('[data-baja]')) cambiar((b) => { b.portada.orden = mover(b.portada.orden, V(bt), 1); });
    else if (bt.matches('[data-suma]')) cambiar((b) => { b.portada.ventanas[V(bt)].extra.push({ titulo: 'Nuevo', href: 'liga/' }); });
    else if (bt.matches('[data-quita]')) cambiar((b) => { b.portada.ventanas[V(bt)].extra.splice(Number(bt.closest('[data-k]').dataset.k), 1); });
  });
}

function validar() {
  for (const id of VENTANAS) {
    const c = S.borrador.portada.ventanas[id];
    const raw = c.principal;
    if (raw && !hrefValido(raw.href)) return `${NOMBRES[id]}: el enlace del botón grande no es válido.`;
  }
  return '';
}

async function rpc(nombre, args) {
  S.ocupado = true; error(''); pintar();
  try {
    const { data, error: err } = await supabase.rpc(nombre, args);
    if (err) throw err;
    S.guardada = normalizar(data.config); S.borrador = clone(S.guardada);
    S.puedeDes = !!data.puede_deshacer; S.puedeReh = !!data.puede_rehacer;
    guardarCache(S.guardada);
    return true;
  } catch (e) { console.error('[panel]', e); error(msg(e)); return false; }
  finally { S.ocupado = false; pintar(); }
}

async function cargar() {
  const { data, error: err } = await supabase.rpc('sitio_estado');
  if (err) { error('Falta preparar la base de datos (migración 108). ' + (err.message || '')); $('pn-estado').textContent = 'Sin conexión al panel.'; return; }
  S.guardada = normalizar(data.config); S.borrador = clone(S.guardada); S.puedeDes = !!data.puede_deshacer; S.puedeReh = !!data.puede_rehacer;
  pintar();
}

function iniciar() {
  if (S.iniciado) return; S.iniciado = true; enlazar();
  $('pn-guardar').addEventListener('click', async () => { const a = validar(); if (a) return error(a); if (await rpc('sitio_guardar', { p_config: S.borrador, p_nota: 'Cambios del panel' })) toast('Guardado. Ya se ve en la web.', 'ok'); });
  $('pn-descartar').addEventListener('click', () => { S.borrador = clone(S.guardada); error(''); pintar(); });
  $('pn-deshacer').addEventListener('click', async () => { if (await rpc('sitio_mover', { p_paso: -1 })) toast('Deshecho.', 'ok'); });
  $('pn-rehacer').addEventListener('click', async () => { if (await rpc('sitio_mover', { p_paso: 1 })) toast('Rehecho.', 'ok'); });
  $('pn-restaurar').addEventListener('click', async () => { if (await confirmar('Se quitan todos los cambios y el sitio vuelve a como era. Después puedes usar «Deshacer» para recuperarlos.', { titulo: 'Volver al original', aceptar: 'Volver al original', peligro: true })) { if (await rpc('sitio_guardar', { p_config: {}, p_nota: 'Volver al original' })) toast('Listo: sitio original.', 'ok'); } });
  cargar();
}

onSession(({ session }) => {
  const admin = !!session && can('verAuditoriaCompleta');
  $('pn-sinsesion').hidden = !!session;
  $('pn-denegado').hidden = !session || admin;
  $('pn-app').hidden = !admin;
  if (admin) iniciar();
});
