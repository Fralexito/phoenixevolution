// Página /panel/ (solo admin): edita la configuración del sitio con Guardar · Deshacer · Rehacer.
// Esquema: pages/panel → core/sitio (lógica pura) · features/sitioAplicar (aplica en la web) · RPC sitio_estado / sitio_guardar / sitio_mover.
import { onSession, can } from '../core/session.js';
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { normalizar, mover, moverA, alternar, iguales, esBase, hrefValido, VENTANAS, VISTAS, MAX_EXTRA, MAX_ENLACES } from '../core/sitio.js';
import { aplicar, guardarCache } from '../features/sitioAplicar.js';
import Sortable from 'sortablejs';
import { animate } from 'motion';
import { celebrar } from '../features/celebrar.js';
import { FX } from '../../data/experimento.js';
import { hayMovimientoReducido } from '../features/ajustes.js';

const $ = (id) => document.getElementById(id);
import { NAV, NAV_EXTRA } from '../../data/site.js';
const PAGINAS = [...NAV, ...NAV_EXTRA].filter((n, i, a) => n.id !== 'central' && a.findIndex((m) => m.id === n.id) === i).map((n) => [n.id, n.label]);
const NOMBRES = { social: 'Zona Social', competencia: 'Competencia', duelos: 'Duelos', club: 'Mi Club' };
const VISTA_TXT = { '': 'Como está', vivo: 'Botón grande + atajos', mosaico: 'Mosaico de iconos', grande: 'Una grande y dos chicas' };
const S = { tab: 'portada', sel: null, arrastra: null, guardada: normalizar({}), borrador: normalizar({}), puedeDes: false, puedeReh: false, ocupado: false, iniciado: false };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sucio = () => !iguales(S.borrador, S.guardada);
const clone = (o) => JSON.parse(JSON.stringify(o));

function error(msg) { const e = $('pn-error'); e.textContent = msg || ''; e.hidden = !msg; }
const msg = (err) => /NADA_QUE/.test(err?.message || '') ? 'No hay más pasos.' : /NO_AUTORIZADO/.test(err?.message || '') ? 'Solo el admin puede cambiar esto.' : (err?.message || 'Algo salió mal. Inténtalo de nuevo.');

const COLOR = { social: '#7c3aed', competencia: '#fbbf24', duelos: '#00e5ff', club: '#00ff85' };
const ICONO = { social: 'fa-comments', competencia: 'fa-trophy', duelos: 'fa-gamepad', club: 'fa-shirt' };
const campo = (rot, v, extra = '') => `<label class="block text-[12px] text-gray-400 uppercase tracking-wider">${rot}<input type="text" class="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white" value="${esc(v)}" ${extra}></label>`;
const ojo = (on) => `<i class="fa-solid ${on ? 'fa-eye' : 'fa-eye-slash'}"></i>`;

/* Dibujitos de cada diseño al girar (solo CSS, sin imágenes). */
const DIBUJO = {
  '': '<i class="pn-d"></i><i class="pn-d pn-d2"></i><i class="pn-d pn-d3"></i>',
  vivo: '<i class="pn-d"></i><i class="pn-d pn-bt"></i><span class="pn-fila"><i class="pn-d pn-ch"></i><i class="pn-d pn-ch"></i></span>',
  mosaico: '<span class="pn-mos"><i class="pn-d"></i><i class="pn-d"></i><i class="pn-d"></i><i class="pn-d"></i></span>',
  grande: '<i class="pn-d pn-gr"></i><span class="pn-fila"><i class="pn-d pn-ch"></i><i class="pn-d pn-ch"></i></span>',
};

function tileHTML(id, i) {
  const c = S.borrador.portada.ventanas[id]; const sel = S.sel === id;
  const pr = c.principal?.titulo || 'Botón grande';
  return `<div class="pn-tile ${c.on ? '' : 'pn-off'} ${sel ? 'pn-sel' : ''}" data-v="${id}" style="--c:${COLOR[id]}" tabindex="0" role="button" aria-pressed="${sel}">
    <div class="pn-tile-cab"><i class="fa-solid fa-grip-vertical pn-grip" title="Arrastra para cambiar el orden"></i><i class="fa-solid ${ICONO[id]}"></i><b>${NOMBRES[id]}</b>
      <button type="button" data-izq class="pn-mini" aria-label="Mover a la izquierda" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-left"></i></button>
      <button type="button" data-der class="pn-mini" aria-label="Mover a la derecha" ${i === VENTANAS.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-right"></i></button>
      <button type="button" data-ojo class="pn-mini" aria-label="${c.on ? 'Ocultar' : 'Mostrar'} ${NOMBRES[id]}">${ojo(c.on)}</button></div>
    <div class="pn-tile-cuerpo">${DIBUJO[c.vista] ?? DIBUJO['']}</div>
    <div class="pn-tile-pie">${esc(pr)}</div></div>`;
}

function editorHTML(id) {
  if (!id) return '<p class="text-sm text-gray-400 text-center py-4"><i class="fa-solid fa-hand-pointer mr-1"></i>Toca una ventana para editarla.</p>';
  const c = S.borrador.portada.ventanas[id]; const pr = c.principal ?? { titulo: '', href: '' };
  return `<div data-v="${id}" class="space-y-3" style="--c:${COLOR[id]}">
    <p class="font-display font-bold text-white uppercase tracking-wider text-sm"><i class="fa-solid ${ICONO[id]} mr-2" style="color:var(--c)"></i>Editando: ${NOMBRES[id]}</p>
    <div><p class="text-[12px] text-gray-400 uppercase tracking-wider mb-1.5">Cómo se ve al girar</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${['', ...VISTAS].map((v) => `<button type="button" data-vista="${v}" class="pn-op ${c.vista === v ? 'pn-op-on' : ''}" aria-pressed="${c.vista === v}"><span class="pn-dib">${DIBUJO[v]}</span><span>${VISTA_TXT[v]}</span></button>`).join('')}</div></div>
    <div class="grid sm:grid-cols-2 gap-2">${campo('Botón grande · texto', pr.titulo, 'data-pt maxlength="28" placeholder="Como está"')}${campo('Botón grande · a dónde va', pr.href, 'data-ph placeholder="liga/"')}</div>
    <div class="space-y-2"><p class="text-[12px] text-gray-400 uppercase tracking-wider">Atajos que tú añades (${c.extra.length}/${MAX_EXTRA})</p>
      ${c.extra.map((e, k) => `<div class="grid grid-cols-[1fr_1fr_auto] gap-2" data-k="${k}">${campo('', e.titulo, 'data-et maxlength="22"')}${campo('', e.href, 'data-eh')}<button type="button" class="btn btn-ghost !min-h-9 !px-2.5" data-quita aria-label="Quitar atajo"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}
      ${c.extra.length < MAX_EXTRA ? '<button type="button" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]" data-suma><i class="fa-solid fa-plus mr-1"></i>Añadir atajo</button>' : ''}</div>
  </div>`;
}

/* Menú de arriba: se lee de la propia página (cada grupo y sus botones). */
function gruposMenu() {
  const out = [];
  document.querySelectorAll('.pilar[data-pilar]').forEach((p) => {
    const rot = (p.querySelector('.pilar-btn')?.textContent || p.dataset.pilar).replace(/\s+/g, ' ').trim();
    const m = new Map();
    p.querySelectorAll('.pilar-item[data-nav-id]').forEach((a) => { if (!a.dataset.soloStaff && !m.has(a.dataset.navId)) m.set(a.dataset.navId, { t: (a.querySelector('b')?.textContent || a.textContent).replace(/\s+/g, ' ').trim().slice(0, 28), ic: a.querySelector('i')?.className || '' }); });
    if (m.size) out.push({ rot, items: [...m] });
  });
  return out;
}
const chip = (id, t, ocultos, attr, ico = '') => { const on = !ocultos.includes(id); return `<button type="button" ${attr}="${esc(id)}" class="pn-chip ${on ? '' : 'pn-chip-off'}" aria-pressed="${on}">${ico}<span>${esc(t)}</span>${ojo(on)}</button>`; };
function menuHTML() {
  const g = gruposMenu(); const o = S.borrador.menu.ocultos;
  if (!g.length) return '<p class="text-xs text-gray-400">Abre esta página en una pantalla ancha para ver el menú.</p>';
  return `<div class="pn-barra-menu">${g.map((x) => `<div class="pn-pilar"><p>${esc(x.rot)}</p><div class="flex flex-wrap gap-1.5">${x.items.map(([id, v]) => chip(id, v.t, o, 'data-menu', v.ic ? `<i class="${esc(v.ic)}"></i>` : '')).join('')}</div></div>`).join('')}</div>`;
}
function lateralHTML() {
  const o = S.borrador.lateral.ocultos; const m = new Map();
  document.querySelectorAll('.barra-item[data-nav-id]').forEach((a) => { const id = a.dataset.navId; if (!m.has(id)) m.set(id, { t: (a.getAttribute('title') || a.textContent).replace(/\s+/g, ' ').trim(), ic: a.querySelector('i')?.className || 'fa-solid fa-circle' }); });
  if (!m.size) return '<p class="text-xs text-gray-400">La barra lateral solo se ve en pantallas anchas.</p>';
  return `<div class="pn-lateral">${[...m].map(([id, v]) => chip(id, v.t, o, 'data-lat', `<i class="${esc(v.ic)}"></i>`)).join('')}</div>`;
}

function textosHTML() {
  const t = S.borrador.textos;
  return `<div class="grid sm:grid-cols-2 gap-2">${PAGINAS.map(([id, n]) => `<label class="pn-campo"><span class="text-[12px] text-gray-400">${esc(n)}</span><input type="text" data-tx="${id}" class="pn-tit" maxlength="60" value="${esc(t[id] ?? '')}" placeholder="Título original"></label>`).join('')}</div>`;
}
function enlacesHTML() {
  const l = S.borrador.enlaces;
  return `<div class="space-y-2">${l.map((e, k) => `<div class="grid grid-cols-[1fr_1fr_auto] gap-2" data-en="${k}"><input type="text" data-en-t class="pn-tit" maxlength="22" value="${esc(e.titulo)}" aria-label="Nombre del botón"><input type="text" data-en-h class="pn-tit" value="${esc(e.href)}" aria-label="Dirección (liga/ o https://…)"><button type="button" class="btn btn-ghost !min-h-9 !px-2.5" data-en-quita aria-label="Quitar enlace"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}
    ${l.length < MAX_ENLACES ? '<button type="button" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]" data-en-suma><i class="fa-solid fa-plus mr-1"></i>Añadir enlace</button>' : '<p class="text-[12px] text-gray-400">Máximo 4 enlaces.</p>'}</div>`;
}

function pintar() {
  const b = S.borrador;
  if (S.sel && !VENTANAS.includes(S.sel)) S.sel = null;
  const TABS = [['portada', 'fa-house', 'Portada'], ['menu', 'fa-bars', 'Menú de arriba'], ['lateral', 'fa-table-columns', 'Barra lateral'], ['textos', 'fa-pen', 'Textos'], ['enlaces', 'fa-link', 'Enlaces']];
  const AYUDA = { portada: 'Arrastra las ventanas para ordenarlas. Toca una para editarla.', menu: 'Toca un botón para ocultarlo o mostrarlo.', lateral: 'Toca un acceso para ocultarlo o mostrarlo.', textos: 'Cambia el título grande de cada página. Déjalo vacío para volver al original.', enlaces: 'Crea botones nuevos: salen en la barra lateral y en el pie de página.' };
  const foco = document.activeElement?.id;
  const tab = S.tab;
  const cont = tab === 'portada'
    ? `<div class="grid lg:grid-cols-[minmax(0,1fr)_21rem] gap-3 items-start">
        <div class="pn-lienzo">
          <input type="text" data-titulo class="pn-tit" value="${esc(b.portada.titulo)}" maxlength="40" placeholder="Bienvenido a la" aria-label="Título de arriba">
          <p class="pn-galaxy">Galaxy</p>
          <input type="text" data-sub class="pn-sub" value="${esc(b.portada.sub)}" maxlength="120" placeholder="Esto está pasando ahora en la comunidad." aria-label="Frase debajo del título">
          <div class="pn-tiles">${b.portada.orden.map(tileHTML).join('')}</div></div>
        <aside class="pn-lado" id="pn-editor">${editorHTML(S.sel)}</aside></div>`
    : tab === 'menu' ? menuHTML() : tab === 'textos' ? textosHTML() : tab === 'enlaces' ? enlacesHTML() : lateralHTML();
  $('pn-cuerpo').innerHTML =
    `<nav class="pn-tabs" role="tablist" aria-label="Qué quieres cambiar">${TABS.map(([id, ic, t]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" class="pn-tab ${tab === id ? 'pn-tab-on' : ''}"><i class="fa-solid ${ic}"></i><span>${t}</span></button>`).join('')}</nav>
     <p class="pn-ayuda"><i class="fa-solid fa-lightbulb"></i> ${AYUDA[tab]}</p>${cont}`;
  if (foco) $(foco)?.focus();
  montarArrastre();
  const hay = sucio();
  $('pn-estado').textContent = S.ocupado ? 'Guardando…' : hay ? 'Tienes cambios sin guardar.' : 'Todo guardado.';
  $('pn-guardar').disabled = S.ocupado || !hay; $('pn-descartar').disabled = S.ocupado || !hay;
  $('pn-deshacer').disabled = S.ocupado || hay || !S.puedeDes; $('pn-rehacer').disabled = S.ocupado || hay || !S.puedeReh;
  $('pn-restaurar').hidden = esBase(S.guardada) && !hay;
}

/* Arrastrar (SortableJS): funciona con mouse y con el dedo. Se ata de nuevo cada vez que se repinta. */
function montarArrastre() {
  const cont = document.querySelector('.pn-tiles'); if (!cont) return;
  Sortable.create(cont, {
    animation: hayMovimientoReducido() ? 0 : 160, handle: '.pn-grip', draggable: '.pn-tile', ghostClass: 'pn-arrastrando', delay: 120, delayOnTouchOnly: true, filter: 'button', preventOnFilter: false,
    onEnd: () => { const orden = [...cont.querySelectorAll('.pn-tile')].map((t) => t.dataset.v); cambiar((b) => { b.portada.orden = orden; }); },
  });
}

function cambiar(fn) { fn(S.borrador); S.borrador = normalizar(S.borrador); pintar(); aplicar(S.borrador); }
const V = (el) => el.closest('[data-v]').dataset.v;

function enlazar() {
  const c = $('pn-cuerpo');
  c.addEventListener('click', (e) => {
    const bt = e.target.closest('button'); const tile = e.target.closest('.pn-tile');
    if (bt?.matches('[data-tab]')) { S.tab = bt.dataset.tab; return pintar(); }
    if (bt?.matches('[data-ojo]')) return cambiar((b) => { const v = b.portada.ventanas[V(bt)]; v.on = !v.on; });
    if (bt?.matches('[data-izq]')) return cambiar((b) => { b.portada.orden = mover(b.portada.orden, V(bt), -1); });
    if (bt?.matches('[data-der]')) return cambiar((b) => { b.portada.orden = mover(b.portada.orden, V(bt), 1); });
    if (bt?.matches('[data-vista]')) return cambiar((b) => { b.portada.ventanas[V(bt)].vista = bt.dataset.vista; });
    if (bt?.matches('[data-suma]')) return cambiar((b) => { b.portada.ventanas[V(bt)].extra.push({ titulo: 'Nuevo', href: 'liga/' }); });
    if (bt?.matches('[data-quita]')) return cambiar((b) => { b.portada.ventanas[V(bt)].extra.splice(Number(bt.closest('[data-k]').dataset.k), 1); });
    if (bt?.matches('[data-en-suma]')) return cambiar((b) => { b.enlaces.push({ titulo: 'Nuevo', href: 'liga/' }); });
    if (bt?.matches('[data-en-quita]')) return cambiar((b) => { b.enlaces.splice(Number(bt.closest('[data-en]').dataset.en), 1); });
    if (bt?.matches('[data-menu]')) return cambiar((b) => { b.menu.ocultos = alternar(b.menu.ocultos, bt.dataset.menu); });
    if (bt?.matches('[data-lat]')) return cambiar((b) => { b.lateral.ocultos = alternar(b.lateral.ocultos, bt.dataset.lat); });
    if (tile) { S.sel = tile.dataset.v; pintar(); if (!hayMovimientoReducido()) { const e = $('pn-editor'); if (e) animate(e, { opacity: [0.4, 1], transform: ['translateY(6px)', 'translateY(0px)'] }, { duration: 0.22 }); } }
  });
  c.addEventListener('keydown', (e) => { const t = e.target.closest?.('.pn-tile'); if (t && t === e.target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); S.sel = t.dataset.v; pintar(); } });
  const campoTxt = (t) => {
    const b = S.borrador;
    if (t.matches('[data-titulo]')) b.portada.titulo = t.value;
    else if (t.matches('[data-sub]')) b.portada.sub = t.value;
    else if (t.matches('[data-pt],[data-ph]')) { const v = b.portada.ventanas[V(t)]; const p = v.principal ?? { titulo: '', href: '' }; if (t.matches('[data-pt]')) p.titulo = t.value; else p.href = t.value; v.principal = p; }
    else if (t.matches('[data-tx]')) { if (t.value.trim()) b.textos[t.dataset.tx] = t.value; else delete b.textos[t.dataset.tx]; }
    else if (t.matches('[data-en-t],[data-en-h]')) { const e = b.enlaces[Number(t.closest('[data-en]').dataset.en)]; if (t.matches('[data-en-t]')) e.titulo = t.value; else e.href = t.value; }
    else if (t.matches('[data-et],[data-eh]')) { const v = b.portada.ventanas[V(t)]; const k = Number(t.closest('[data-k]').dataset.k); if (t.matches('[data-et]')) v.extra[k].titulo = t.value; else v.extra[k].href = t.value; }
  };
  // Al escribir NO se repinta (se perdería el cursor); solo se actualizan los botones de arriba.
  c.addEventListener('input', (e) => { if (!e.target.matches('input[type=text]')) return; campoTxt(e.target); const hay = !iguales(S.borrador, S.guardada); $('pn-guardar').disabled = !hay; $('pn-descartar').disabled = !hay; $('pn-estado').textContent = hay ? 'Tienes cambios sin guardar.' : 'Todo guardado.'; $('pn-deshacer').disabled = hay || !S.puedeDes; $('pn-rehacer').disabled = hay || !S.puedeReh; });
  c.addEventListener('focusout', (e) => { if (e.target.matches('input[type=text]')) { S.borrador = normalizar(S.borrador); error(validar()); pintar(); aplicar(S.borrador); } });
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
    guardarCache(S.guardada); aplicar(S.guardada);
    return true;
  } catch (e) { console.error('[panel]', e); error(msg(e)); return false; }
  finally { S.ocupado = false; pintar(); }
}

async function cargar() {
  const { data, error: err } = await supabase.rpc('sitio_estado');
  if (err) { error('Falta preparar la base de datos (migración 114, archivo 114_sitio_ajustes.sql). ' + (err.message || '')); $('pn-estado').textContent = 'Sin conexión al panel.'; return; }
  S.guardada = normalizar(data.config); S.borrador = clone(S.guardada); S.puedeDes = !!data.puede_deshacer; S.puedeReh = !!data.puede_rehacer;
  pintar(); aplicar(S.borrador);
}

function iniciar() {
  if (S.iniciado) return; S.iniciado = true; enlazar();
  $('pn-guardar').addEventListener('click', async () => { const a = validar(); if (a) return error(a); if (await rpc('sitio_guardar', { p_config: S.borrador, p_nota: 'Cambios del panel' })) { toast('Guardado. Ya se ve en la web.', 'ok'); if (FX.confeti) celebrar($('pn-guardar')); } });
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
