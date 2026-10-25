// Página /draft/ (función nueva 8/8): lista de drafts, formularios para crearlos y la sala EN VIVO (?id=).
// RPC de la migración 151 · lógica pura en core/competicion/draft.js.
// Blindaje:
//   · La BD decide turnos, reloj y elecciones; la pantalla solo pregunta (cada 3 s en vivo, 15 s si no) y muestra.
//   · El reloj se corrige con la hora del servidor (un celular con la hora mal no ve un tiempo falso).
//   · Botones bloqueados mientras se envía (sin doble elección); sin pedidos encimados; al volver a la pestaña se refresca enseguida.
//   · Sin migración → aviso «llega pronto»; sin sesión → aviso para entrar. Errores → mensaje claro y Reintentar.
//   · Aviso cuando te toca: título de la pestaña y vibración corta (si el aparato lo permite y el usuario no pidió menos movimiento).
import { onSession, can } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar } from '../core/sistema/dialogo.js';
import { href } from '../core/sistema/config.js';
import { segundosRestantes, reloj, tablero, ESTADOS_DRAFT, parsearOpciones } from '../core/competicion/draft.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const ID = Number(q.get('id')) || null;
const TORNEO = Number(q.get('torneo')) || null;
const sinFuncion = (e) => e?.code === 'PGRST202' || /could not find the function|schema cache/i.test(e?.message ?? '');
const TITULO_BASE = document.title;
const S = { d: null, recibido: 0, disp: [], buscar: '', ocupado: false, cargando: false, temporizador: null, tic: null, meTocaba: false };

function aviso(html) { $('dr-aviso').hidden = !html; $('dr-aviso').innerHTML = html || ''; }
function falla(e, donde) {
  console.error(`[draft] ${donde}:`, e);
  if (sinFuncion(e)) { aviso('<i class="fa-solid fa-hourglass-half mr-1"></i>El draft en vivo llega muy pronto: falta activarlo en la base de datos.'); $('dr-contenido').innerHTML = ''; return true; }
  aviso(`${esc(e?.message || 'No se pudo cargar.')} <button type="button" data-dr-reintentar class="btn btn-ghost !min-h-9 ml-2">Reintentar</button>`);
  return false;
}
const chip = (estado) => {
  const c = { en_vivo: 'text-ok border-ok/50 bg-ok/10', pausado: 'text-amber-300 border-amber-400/40 bg-amber-400/10', preparando: 'text-galaxy-400 border-galaxy-400/40' }[estado] ?? 'text-gray-400 border-galaxy-border';
  return `<span class="px-2 py-0.5 rounded border text-[12px] font-display font-bold uppercase ${c}">${esc(ESTADOS_DRAFT[estado] ?? estado)}</span>`;
};

// ── Lista + crear ──────────────────────────────────────────────────────────────────────────────────────────
function formLm() {
  return `<section class="glass-panel rounded-2xl p-4 space-y-2"><h2 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-plus text-galaxy-400 mr-1"></i>Nuevo draft de Liga Máster (staff)</h2>
    <p class="text-[12px] text-gray-400">Entran todos los clubes aprobados que tienen DT. Se eligen los agentes libres de la liga; cada elección es un fichaje real (queda en los movimientos para el option file).</p>
    <form id="dr-form-lm" class="grid sm:grid-cols-4 gap-2 items-end">
      <label class="sm:col-span-2 text-[12px] text-gray-400">Título<input name="titulo" maxlength="80" class="field mt-1 w-full" value="Draft de agentes libres" required></label>
      <label class="text-[12px] text-gray-400">Rondas<input name="rondas" type="number" min="1" max="30" value="3" class="field mt-1 w-full"></label>
      <label class="text-[12px] text-gray-400">Segundos por turno<input name="segundos" type="number" min="15" max="600" value="90" class="field mt-1 w-full"></label>
      <label class="sm:col-span-3 text-[12px] text-gray-300 flex items-center gap-2"><input type="checkbox" name="serpiente" checked> Serpiente (1-2-3, 3-2-1…): más justo para el último</label>
      <button class="btn btn-primary !min-h-9 !text-xs">Crear</button></form></section>`;
}
function formTorneo() {
  return `<section class="glass-panel rounded-2xl p-4 space-y-2"><h2 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-plus text-galaxy-400 mr-1"></i>Draft de equipos para este torneo</h2>
    <p class="text-[12px] text-gray-400">Cada inscrito con cuenta elige un equipo, por turnos. Escribe los equipos (uno por línea o separados por comas); necesitas al menos uno por inscrito.</p>
    <form id="dr-form-torneo" class="grid sm:grid-cols-4 gap-2 items-end">
      <label class="sm:col-span-4 text-[12px] text-gray-400">Título<input name="titulo" maxlength="80" class="field mt-1 w-full" value="Draft de equipos" required></label>
      <label class="sm:col-span-4 text-[12px] text-gray-400">Equipos<textarea name="opciones" rows="5" class="field mt-1 w-full" placeholder="Perú&#10;Argentina&#10;Brasil"></textarea></label>
      <label class="text-[12px] text-gray-400">Segundos por turno<input name="segundos" type="number" min="15" max="600" value="60" class="field mt-1 w-full"></label>
      <label class="sm:col-span-2 text-[12px] text-gray-300 flex items-center gap-2"><input type="checkbox" name="serpiente"> Serpiente</label>
      <button class="btn btn-primary !min-h-9 !text-xs">Crear</button></form></section>`;
}
async function cargarLista() {
  try {
    const { data, error } = await supabase.rpc('drafts_lista', { p_torneo: TORNEO });
    if (error) { falla(error, 'lista'); return; }
    aviso('');
    const lista = Array.isArray(data) ? data : [];
    const filas = lista.map((x) => `<a href="${esc(href(`draft/?id=${Number(x.id)}`))}" class="glass-panel rounded-2xl p-3 flex flex-wrap items-center gap-2 hover:border-galaxy-400/50">
        ${chip(x.estado)}<span class="flex-1 min-w-0 truncate text-white text-sm font-display font-bold">${esc(x.titulo)}</span>
        <span class="text-[12px] text-gray-400">${x.ambito === 'lm' ? 'Liga Máster' : 'Torneo'} · ${Number(x.participantes) || 0} participantes</span></a>`).join('');
    const crear = TORNEO ? formTorneo() : (can('gestionarClanes') ? formLm() : '');
    $('dr-contenido').innerHTML = `${crear}<section class="space-y-2"><h2 class="text-base font-display font-bold text-white uppercase tracking-wider border-b border-galaxy-border pb-2">${TORNEO ? 'Drafts de este torneo' : 'Drafts'}</h2>
      ${filas || '<p class="text-center py-6 text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">Aún no hay drafts.</p>'}</section>`;
  } catch (e) { falla(e, 'lista'); }
}

// ── Sala en vivo ───────────────────────────────────────────────────────────────────────────────────────────
function pintarReloj() {
  const el = document.querySelector('[data-dr-reloj]'); if (!el || !S.d) return;
  const s = segundosRestantes(S.d, S.recibido, Date.now());
  el.textContent = reloj(s);
  el.classList.toggle('text-bad', s != null && s <= 10 && S.d.estado === 'en_vivo');
  if (s === 0 && S.d.estado === 'en_vivo') programar(800);   // venció: pedir el siguiente turno ya
}
function nombrePart(orden) { return S.d?.participantes?.find((p) => p.orden === orden)?.nombre ?? '—'; }

function pintarSala() {
  const d = S.d; if (!d) return;
  $('dr-titulo').textContent = d.titulo;
  document.title = d.me_toca ? `¡Te toca! · ${TITULO_BASE}` : TITULO_BASE;
  const filas = tablero(d);
  const cab = d.participantes.map((p) => `<th scope="col" class="px-2 py-1 text-left text-[12px] text-gray-300 font-display uppercase ${p.orden === d.turno_de ? 'text-amber-300' : ''}">${esc(p.nombre)}${p.orden === d.mi_orden ? ' <span class="text-galaxy-400">(tú)</span>' : ''}</th>`).join('');
  const cuerpo = filas.map((f, r) => `<tr><th scope="row" class="px-2 py-1 text-[12px] text-gray-500 text-left">R${r + 1}</th>${f.map((c) => `<td class="px-2 py-1 align-top"><div class="rounded-lg border px-2 py-1 min-h-9 text-[12px] ${c?.actual ? 'border-amber-400/70 bg-amber-400/10' : 'border-galaxy-border'}">
      ${c?.pick ? `<span class="${c.pick.saltado ? 'text-gray-500' : 'text-white'}">${esc(c.pick.nombre)}</span>${c.pick.auto && !c.pick.saltado ? ' <span class="text-gray-500" title="Elegido por el sistema">(auto)</span>' : ''}` : c?.actual ? '<span class="text-amber-300">eligiendo…</span>' : `<span class="text-gray-600">#${(c?.n ?? 0) + 1}</span>`}</div></td>`).join('')}</tr>`).join('');
  const gestor = d.soy_gestor ? `<div class="flex flex-wrap gap-2">
      ${d.estado === 'preparando' ? '<button type="button" data-dr-ctl="iniciar" class="btn btn-primary !min-h-9 !text-xs"><i class="fa-solid fa-play"></i> Empezar</button>' : ''}
      ${d.estado === 'en_vivo' ? '<button type="button" data-dr-ctl="pausar" class="btn btn-ghost !min-h-9 !text-xs"><i class="fa-solid fa-pause"></i> Pausar</button>' : ''}
      ${d.estado === 'pausado' ? '<button type="button" data-dr-ctl="reanudar" class="btn btn-primary !min-h-9 !text-xs"><i class="fa-solid fa-play"></i> Reanudar</button>' : ''}
      ${['preparando', 'en_vivo', 'pausado'].includes(d.estado) ? '<button type="button" data-dr-ctl="cancelar" class="btn btn-ghost !min-h-9 !text-xs !text-rose-300">Cancelar draft</button>' : ''}</div>` : '';
  const estadoTxt = d.estado === 'en_vivo' || d.estado === 'pausado'
    ? `Ronda ${Number(d.ronda) || 1} de ${Number(d.rondas)} · elige <b class="text-white">${esc(nombrePart(d.turno_de))}</b>`
    : d.estado === 'preparando' ? 'Esperando a que el organizador lo empiece.' : d.estado === 'terminado' ? 'El draft terminó.' : 'El draft fue cancelado (lo ya elegido se queda).';
  const elegir = d.me_toca ? `<section class="glass-panel rounded-2xl p-4 space-y-2 border border-amber-400/50"><h2 class="font-display font-bold text-amber-300 text-sm uppercase tracking-wider"><i class="fa-solid fa-hand-pointer mr-1"></i>¡Te toca elegir!</h2>
      <form id="dr-buscar" class="flex gap-2"><input name="q" value="${esc(S.buscar)}" maxlength="40" class="field flex-1 min-w-0" placeholder="${d.ambito === 'lm' ? 'Buscar jugador libre' : 'Buscar equipo'}" aria-label="Buscar"><button class="btn btn-ghost !min-h-9 !text-xs">Buscar</button></form>
      <div id="dr-disp" class="grid sm:grid-cols-2 gap-2">${listaDisp()}</div></section>` : '';
  $('dr-contenido').innerHTML = `<section class="glass-panel rounded-2xl p-4 space-y-3">
      <div class="flex flex-wrap items-center gap-3">${chip(d.estado)}<p class="text-sm text-gray-300 flex-1 min-w-0">${estadoTxt}</p>
        ${['en_vivo', 'pausado'].includes(d.estado) ? `<span class="font-display font-extrabold text-2xl text-white tabular-nums" data-dr-reloj aria-label="Tiempo del turno"></span>` : ''}</div>
      <p class="text-[12px] text-gray-400">${d.ambito === 'lm' ? 'Liga Máster' : 'Torneo'} · ${Number(d.segundos_turno)} s por turno · ${d.serpiente ? 'serpiente' : 'orden fijo'} · ${Number(d.picks?.length) || 0}/${Number(d.total) || 0} elecciones</p>${gestor}</section>
    ${elegir}
    <section class="glass-panel rounded-2xl p-2 overflow-x-auto"><table class="w-full min-w-[32rem] border-separate border-spacing-0"><thead><tr><th class="w-8"></th>${cab}</tr></thead><tbody>${cuerpo}</tbody></table></section>
    <p class="text-[12px] text-gray-500"><a class="underline" href="${esc(href(d.torneo_id ? `draft/?torneo=${Number(d.torneo_id)}` : 'draft/'))}">← Todos los drafts</a>${d.torneo_id ? ` · <a class="underline" href="${esc(href(`torneo/?id=${Number(d.torneo_id)}`))}">Ver el torneo</a>` : ''}</p>`;
  pintarReloj();
}
function listaDisp() {
  if (!S.disp.length) return '<p class="text-[12px] text-gray-400 sm:col-span-2">No hay opciones con ese filtro.</p>';
  return S.disp.map((x) => `<button type="button" data-dr-elegir="${Number(x.id)}" class="btn btn-ghost !justify-start !min-h-10 !text-xs text-left">
    <span class="flex-1 min-w-0 truncate">${esc(x.nombre)}</span>${S.d?.ambito === 'lm' ? `<span class="text-[12px] text-gray-400">${esc(x.posicion ?? '')} ${x.media != null ? `· ${Number(x.media)}` : ''}</span>` : ''}</button>`).join('');
}
async function cargarDisp() {
  try {
    const { data, error } = await supabase.rpc('draft_disponibles', { p_draft: ID, p_buscar: S.buscar || null });
    if (error) throw error;
    S.disp = Array.isArray(data) ? data : [];
  } catch (e) { console.warn('[draft] disponibles:', e); S.disp = []; }
}
function avisarTurno() {
  try { if (navigator.userActivation?.hasBeenActive && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.([120, 60, 120]); } catch { /* sin vibración */ }
  toast('¡Te toca elegir!', 'info');
}
function programar(ms) {
  clearTimeout(S.temporizador);
  S.temporizador = setTimeout(() => { if (!document.hidden) cargarSala(); else programar(ms); }, ms);
}
async function cargarSala() {
  if (S.cargando) return; S.cargando = true;
  try {
    const { data, error } = await supabase.rpc('draft_estado', { p_draft: ID });
    if (error) { if (falla(error, 'estado')) return; programar(10000); return; }
    if (!data) { aviso('Ese draft no existe.'); $('dr-contenido').innerHTML = ''; return; }
    aviso('');
    S.recibido = Date.now(); S.d = data;
    if (data.me_toca) { if (!S.meTocaba) { S.meTocaba = true; avisarTurno(); } await cargarDisp(); } else S.meTocaba = false;
    pintarSala();
    programar(['en_vivo', 'pausado', 'preparando'].includes(data.estado) ? 3000 : 15000);
  } catch (e) { falla(e, 'estado'); programar(10000); }
  finally { S.cargando = false; }
}

// ── Eventos ────────────────────────────────────────────────────────────────────────────────────────────────
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-dr-reintentar]')) { aviso(''); ID ? cargarSala() : cargarLista(); return; }
  const ctl = e.target.closest('[data-dr-ctl]');
  if (ctl && !S.ocupado) {
    const acc = ctl.dataset.drCtl;
    if (acc === 'cancelar' && !(await confirmar('Se detiene el draft. Lo ya elegido se queda (en Liga Máster son fichajes reales).', { titulo: 'Cancelar draft', aceptar: 'Cancelar draft', peligro: true }))) return;
    S.ocupado = true;
    try { const { error } = await supabase.rpc('draft_control', { p_draft: ID, p_accion: acc }); if (error) throw error; }
    catch (err) { toast(err?.message || 'No se pudo.', 'error'); }
    finally { S.ocupado = false; cargarSala(); }
    return;
  }
  const el = e.target.closest('[data-dr-elegir]');
  if (el && !S.ocupado && S.d?.me_toca) {
    const x = S.disp.find((o) => Number(o.id) === Number(el.dataset.drElegir)); if (!x) return;
    if (!(await confirmar(`¿Eliges a ${x.nombre}?`, { titulo: 'Confirmar elección', aceptar: 'Elegir' }))) return;
    S.ocupado = true; document.querySelectorAll('[data-dr-elegir]').forEach((b) => { b.disabled = true; });
    try {
      const args = S.d.ambito === 'lm' ? { p_draft: ID, p_lm_jugador: Number(x.id) } : { p_draft: ID, p_opcion: Number(x.id) };
      const { error } = await supabase.rpc('draft_elegir', args); if (error) throw error;
      toast(`Elegiste a ${x.nombre}.`, 'ok'); S.buscar = '';
    } catch (err) { toast(err?.message || 'No se pudo elegir.', 'error'); }
    finally { S.ocupado = false; cargarSala(); }
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.id === 'dr-buscar') { e.preventDefault(); S.buscar = String(new FormData(f).get('q') ?? '').trim().slice(0, 40); await cargarDisp(); const box = $('dr-disp'); if (box) box.innerHTML = listaDisp(); return; }
  if (f.id !== 'dr-form-lm' && f.id !== 'dr-form-torneo') return;
  e.preventDefault(); if (S.ocupado) return;
  const fd = new FormData(f); const titulo = String(fd.get('titulo') ?? '').trim();
  const segundos = Math.round(Number(fd.get('segundos'))); const serpiente = fd.get('serpiente') === 'on';
  if (titulo.length < 3 || titulo.length > 80 || /[<>]/.test(titulo)) { toast('El título: de 3 a 80 caracteres, sin < ni >.', 'error'); return; }
  if (!(segundos >= 15 && segundos <= 600)) { toast('Los segundos por turno van de 15 a 600.', 'error'); return; }
  let args; let fn;
  if (f.id === 'dr-form-lm') {
    const rondas = Math.round(Number(fd.get('rondas')));
    if (!(rondas >= 1 && rondas <= 30)) { toast('Las rondas van de 1 a 30.', 'error'); return; }
    fn = 'draft_crear_lm'; args = { p_titulo: titulo, p_rondas: rondas, p_segundos: segundos, p_serpiente: serpiente };
  } else {
    const opciones = parsearOpciones(fd.get('opciones'));
    if (opciones.length < 2) { toast('Escribe al menos 2 equipos.', 'error'); return; }
    fn = 'draft_crear_torneo'; args = { p_torneo: TORNEO, p_titulo: titulo, p_opciones: opciones, p_segundos: segundos, p_serpiente: serpiente };
  }
  S.ocupado = true; f.querySelector('button')?.setAttribute('disabled', '');
  try {
    const { data, error } = await supabase.rpc(fn, args); if (error) throw error;
    toast('Draft creado. Empiézalo cuando todos estén listos.', 'ok');
    location.href = href(`draft/?id=${Number(data)}`);
  } catch (err) { toast(err?.message || 'No se pudo crear.', 'error'); f.querySelector('button')?.removeAttribute('disabled'); }
  finally { S.ocupado = false; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && ID) cargarSala(); });
setInterval(pintarReloj, 250);

onSession(({ session }) => {
  if (!session) { aviso('<i class="fa-solid fa-right-to-bracket mr-1"></i>Entra con tu cuenta para ver los drafts.'); $('dr-contenido').innerHTML = ''; return; }
  ID ? cargarSala() : cargarLista();
});
