// Página /mensajes/: lista de chats, sala con mensajes en vivo, nuevo chat (directo o grupo), gestión de grupo, silenciar, reportar.
// Esquema: pages → features/chat/api (RPC + RLS) → core/chat (lógica pura). La privacidad la decide el servidor; aquí solo se muestran sus errores.
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { supabase } from '../core/supabase.js';
import { me, data, loadPerfiles } from '../features/duelos/data.js';
import { cargarRed } from '../features/amigos/api.js';
import { buscarPerfiles, normalizarRed } from '../core/red.js';
import { validarTexto, tituloConv, vistaPrevia, agruparMensajes, etiquetaDia, hoyClave, totalNoLeidos, MAX_TEXTO } from '../core/chat.js';
import * as api from '../features/chat/api.js';
import { regionAhora } from '../features/ajustes.js';

const $ = (id) => document.getElementById(id);
const S = { convs: [], red: normalizarRed(null), abierta: null, mensajes: [], miembros: [], nuevo: null, info: false, ocupado: false, buscar: '', sel: new Set(), nombreGrupo: '' };
const nombre = (id) => data.perfiles.get(id)?.nombre_display || 'Jugador';
const tz = () => regionAhora().timeZone || 'America/Lima';
const hora = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', ...regionAhora() });

function avatar(id, size = 'w-10 h-10') {
  const p = data.perfiles.get(id) ?? {}; const src = safeImg(p.avatar_url);
  return src ? `<img src="${escapeHTML(src)}" alt="" class="${size} rounded-full object-cover border border-galaxy-border shrink-0" loading="lazy">`
    : `<span class="${size} rounded-full bg-galaxy-900 border border-galaxy-border flex items-center justify-center font-display font-bold text-galaxy-400 shrink-0">${escapeHTML((p.nombre_display || '?').trim().charAt(0).toUpperCase())}</span>`;
}
const iconoGrupo = (size = 'w-10 h-10') => `<span class="${size} rounded-full bg-galaxy-600/30 border border-galaxy-400/40 flex items-center justify-center text-galaxy-400 shrink-0"><i class="fa-solid fa-user-group"></i></span>`;

/* ---------- Lista de conversaciones ---------- */
function pintarLista() {
  const nl = totalNoLeidos(S.convs);
  document.title = nl ? `(${nl}) Mensajes` : 'Mensajes';
  $('lista-conv').innerHTML = S.convs.length ? S.convs.map((c) => `
    <button type="button" data-conv="${escapeHTML(c.id)}" class="w-full text-left flex items-center gap-2.5 rounded-xl px-2.5 py-2 border ${S.abierta === c.id ? 'bg-galaxy-600/20 border-galaxy-400/50' : 'bg-galaxy-panel border-galaxy-border/70 hover:border-galaxy-400/40'}">
      ${c.tipo === 'GRUPO' ? iconoGrupo() : avatar(c.otro_id)}
      <span class="min-w-0 flex-1"><b class="block text-white text-xs font-display uppercase truncate">${escapeHTML(tituloConv(c, nombre))}${c.silenciado ? ' <i class="fa-solid fa-bell-slash text-gray-500 text-[10px]"></i>' : ''}</b>
        <span class="block text-[11px] text-gray-400 truncate">${escapeHTML(vistaPrevia(c, me(), nombre))}</span></span>
      ${c.no_leidos ? `<b class="min-w-5 h-5 px-1 rounded-full bg-galaxy-400 text-black text-[10px] flex items-center justify-center">${c.no_leidos > 9 ? '9+' : c.no_leidos}</b>` : ''}
    </button>`).join('')
    : '<div class="text-center py-8 text-gray-500 text-xs">Aún no tienes chats. Pulsa «Nuevo chat».</div>';
  // Móvil: o la lista o la sala.
  $('chat-lista').classList.toggle('hidden', !!S.abierta); $('chat-lista').classList.toggle('lg:flex', true);
  $('chat-sala').classList.toggle('hidden', !S.abierta); $('chat-sala').classList.toggle('lg:flex', true);
}

/* ---------- Sala ---------- */
const convAbierta = () => S.convs.find((c) => c.id === S.abierta) ?? null;

function pintarMensajes() {
  const yo = me(); const hoy = hoyClave(tz()); const esGrupo = convAbierta()?.tipo === 'GRUPO';
  const dias = agruparMensajes(S.mensajes, yo, tz());
  $('mensajes').innerHTML = dias.length ? dias.map((d) => `<div class="space-y-2"><p class="text-center text-[10px] uppercase tracking-widest text-gray-500">${escapeHTML(etiquetaDia(d.dia, hoy))}</p>
    ${d.items.map((it) => `<div class="flex ${it.mios ? 'justify-end' : 'justify-start'}"><div class="max-w-[85%] sm:max-w-[70%] space-y-1">
      ${esGrupo && !it.mios ? `<p class="text-[10px] text-galaxy-400 font-bold uppercase">${escapeHTML(nombre(it.autor))}</p>` : ''}
      ${it.mensajes.map((m) => m.eliminado ? `<p class="text-xs italic text-gray-500 px-3 py-1.5 rounded-xl border border-galaxy-border/50">Mensaje eliminado</p>`
        : `<div class="group relative px-3 py-1.5 rounded-2xl text-sm ${it.mios ? 'bg-galaxy-600/40 border border-galaxy-400/30 text-white' : 'bg-galaxy-panel border border-galaxy-border text-gray-100'}">
            <p class="whitespace-pre-wrap break-words">${escapeHTML(m.texto)}</p>
            <p class="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 justify-end">${escapeHTML(hora(m.created_at))}
              ${it.mios ? `<button type="button" data-borrar="${m.id}" class="hover:text-bad" aria-label="Borrar mensaje"><i class="fa-regular fa-trash-can"></i></button>`
                : `<button type="button" data-reportar="${m.id}" class="hover:text-bad" aria-label="Reportar mensaje"><i class="fa-regular fa-flag"></i></button>`}</p></div>`).join('')}
    </div></div>`).join('')}</div>`).join('')
    : '<p class="text-center text-gray-500 text-xs py-10">Aún no hay mensajes. ¡Escribe el primero!</p>';
  const el = $('mensajes'); el.scrollTop = el.scrollHeight;
}

function pintarInfo() {
  const c = convAbierta(); const p = $('info-panel'); $('btn-info').setAttribute('aria-expanded', String(S.info)); p.hidden = !S.info || !c; if (p.hidden) return;
  const base = `<div class="flex flex-wrap gap-1.5">
    <button type="button" data-info="silenciar" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]"><i class="fa-solid ${c.silenciado ? 'fa-bell' : 'fa-bell-slash'}"></i> ${c.silenciado ? 'Activar avisos' : 'Silenciar'}</button>
    <button type="button" data-info="salir" class="btn btn-ghost !min-h-8 !px-3 !text-[11px] !text-bad !border-bad/50"><i class="fa-solid fa-right-from-bracket"></i> ${c.tipo === 'GRUPO' ? 'Salir del grupo' : 'Quitar de mi lista'}</button></div>`;
  if (c.tipo !== 'GRUPO') { p.innerHTML = base; return; }
  const ids = new Set(S.miembros.map((m) => m.usuario_id));
  const agregables = S.red.amigos.filter((id) => !ids.has(id));
  p.innerHTML = base + `<p class="text-[11px] text-gray-400 uppercase tracking-widest pt-1">Miembros (${S.miembros.length}/20)</p>
    <div class="space-y-1">${S.miembros.map((m) => `<div class="flex items-center gap-2">${avatar(m.usuario_id, 'w-7 h-7')}<span class="text-xs text-white flex-1 truncate">${escapeHTML(nombre(m.usuario_id))}${m.rol === 'ADMIN' ? ' <i class="fa-solid fa-crown text-amber-300 text-[10px]"></i>' : ''}${m.usuario_id === me() ? ' (tú)' : ''}</span>
      ${c.es_admin && m.usuario_id !== me() ? `<button type="button" data-quitar="${escapeHTML(m.usuario_id)}" class="text-[11px] text-bad hover:underline">Quitar</button>` : ''}</div>`).join('')}</div>`
    + (c.es_admin ? `<div class="flex gap-1.5 pt-1"><select id="sel-agregar" class="field !py-1.5 flex-1" aria-label="Agregar amigo"><option value="">Agregar un amigo…</option>${agregables.map((id) => `<option value="${escapeHTML(id)}">${escapeHTML(nombre(id))}</option>`).join('')}</select>
      <button type="button" data-info="agregar" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]">Agregar</button></div>` : '');
}

async function abrir(id) {
  S.abierta = id; S.info = false; S.mensajes = []; S.miembros = [];
  const c = convAbierta(); if (!c) return;
  $('sala-vacia').hidden = true; $('sala').hidden = false;
  $('sala-titulo').textContent = tituloConv(c, nombre);
  $('sala-sub').textContent = c.tipo === 'GRUPO' ? `${c.miembros} miembros` : 'Chat privado';
  pintarLista(); pintarInfo(); $('mensajes').innerHTML = '<p class="text-center text-gray-500 text-xs py-10">Cargando…</p>';
  try {
    const [m, mi] = await Promise.all([api.cargarMensajes(id), api.cargarMiembros(id)]);
    if (S.abierta !== id) return;   // el usuario cambió de chat mientras cargaba
    S.mensajes = m; S.miembros = mi; pintarMensajes(); pintarInfo();
    await api.marcarLeido(id); await refrescarLista();
  } catch (e) { toast(e.message, 'error', { key: 'chat-carga' }); }
}

async function refrescarLista() {
  try { S.convs = await api.listarConversaciones(); } catch (e) { toast(e.message, 'error', { key: 'chat-lista' }); }
  if (S.abierta && !convAbierta()) { S.abierta = null; $('sala').hidden = true; $('sala-vacia').hidden = false; }
  pintarLista();
  window.dispatchEvent(new CustomEvent('pendientes:refresh'));
}

async function refrescarSala() {
  if (!S.abierta) return;
  const id = S.abierta;
  try {
    const [m, mi] = await Promise.all([api.cargarMensajes(id), api.cargarMiembros(id)]);
    if (S.abierta !== id) return;
    S.mensajes = m; S.miembros = mi; pintarMensajes(); pintarInfo();
    if (!document.hidden) await api.marcarLeido(id);
  } catch (e) { console.error('[mensajes] refrescar sala:', e); }
}

/* ---------- Acciones ---------- */
async function ejecutar(fn, { recargar = true } = {}) {
  if (S.ocupado) return null; S.ocupado = true;
  try { return await fn(); } catch (e) { toast(e.message || 'No se pudo completar la acción.', 'error'); return null; }
  finally { S.ocupado = false; if (recargar) await refrescarLista(); }
}

async function enviar(e) {
  e.preventDefault();
  const v = validarTexto($('txt-msg').value);
  if (!v.ok) { toast(v.error, 'error', { key: 'chat-vacio' }); return; }
  if (!S.abierta) return;
  $('btn-enviar').disabled = true;
  const ok = await ejecutar(async () => { await api.enviar(S.abierta, v.texto); return true; });
  $('btn-enviar').disabled = false;
  if (ok) { $('txt-msg').value = ''; $('txt-msg').style.height = ''; await refrescarSala(); }   // si falló, el texto se conserva
  $('txt-msg').focus();
}

/* ---------- Nuevo chat ---------- */
function pintarNuevo() {
  const p = $('nuevo-panel'); p.hidden = !S.nuevo; if (!S.nuevo) return;
  const tabs = `<div class="grid grid-cols-2 gap-1">${[['directo', 'Directo'], ['grupo', 'Grupo']].map(([k, t]) => `<button type="button" data-nuevo="${k}" class="aj-tab justify-center" aria-selected="${S.nuevo === k}">${t}</button>`).join('')}</div>`;
  if (S.nuevo === 'directo') {
    const r = S.buscar.trim().length >= 2 ? buscarPerfiles([...data.perfiles.values()], S.buscar, S.red, me(), 8) : S.red.amigos.map((id) => data.perfiles.get(id)).filter(Boolean);
    p.innerHTML = tabs + `<input id="q-nuevo" type="search" maxlength="40" autocomplete="off" class="field" placeholder="Buscar jugador (o elige un amigo)" value="${escapeHTML(S.buscar)}">
      <div class="space-y-1 max-h-48 overflow-y-auto">${r.length ? r.map((x) => `<button type="button" data-directo="${escapeHTML(x.id)}" class="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 hover:bg-white/5">${avatar(x.id, 'w-7 h-7')}<span class="text-xs text-white truncate">${escapeHTML(x.nombre_display || 'Jugador')}</span>${S.red.amigos.includes(x.id) ? '<i class="fa-solid fa-user-group text-galaxy-400 text-[10px] ml-auto"></i>' : ''}</button>`).join('')
        : '<p class="text-[11px] text-gray-500 py-2">Sin resultados. Agrega amigos en «Amigos» o busca por nombre.</p>'}</div>
      <p class="text-[10px] text-gray-500">Si la persona restringe quién le escribe, el servidor te lo dirá.</p>`;
  } else {
    p.innerHTML = tabs + `<input id="nom-grupo" type="text" maxlength="40" class="field" placeholder="Nombre del grupo" value="${escapeHTML(S.nombreGrupo)}">
      <p class="text-[11px] text-gray-400">Elige a quienes quieres invitar (${S.sel.size}/19):</p>
      <div class="space-y-1 max-h-40 overflow-y-auto">${S.red.amigos.length ? S.red.amigos.map((id) => `<label class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 cursor-pointer"><input type="checkbox" data-sel="${escapeHTML(id)}" ${S.sel.has(id) ? 'checked' : ''} class="accent-[#8000ff]">${avatar(id, 'w-6 h-6')}<span class="text-xs text-white truncate">${escapeHTML(nombre(id))}</span></label>`).join('')
        : '<p class="text-[11px] text-gray-500 py-2">Necesitas tener amigos para crear un grupo.</p>'}</div>
      <button type="button" data-crear-grupo class="btn btn-primary !min-h-9 w-full !text-[11px]"><i class="fa-solid fa-user-group"></i> Crear grupo</button>`;
  }
}

/* ---------- Eventos ---------- */
$('btn-nuevo').addEventListener('click', () => { S.nuevo = S.nuevo ? null : 'directo'; S.buscar = ''; pintarNuevo(); });
$('nuevo-panel').addEventListener('click', async (e) => {
  const k = e.target.closest('[data-nuevo]')?.dataset.nuevo; if (k) { S.nuevo = k; pintarNuevo(); return; }
  const d = e.target.closest('[data-directo]')?.dataset.directo;
  if (d) { const id = await ejecutar(() => api.abrirDirecto(d)); if (id) { S.nuevo = null; pintarNuevo(); await refrescarLista(); await abrir(id); } return; }
  if (e.target.closest('[data-crear-grupo]')) {
    const id = await ejecutar(() => api.crearGrupo(S.nombreGrupo.trim(), [...S.sel]));
    if (id) { S.nuevo = null; S.sel.clear(); S.nombreGrupo = ''; pintarNuevo(); await refrescarLista(); await abrir(id); toast('Grupo creado.', 'ok'); }
  }
});
$('nuevo-panel').addEventListener('input', (e) => {
  if (e.target.id === 'q-nuevo') { S.buscar = e.target.value; const pos = e.target.selectionStart; pintarNuevo(); const q = $('q-nuevo'); q.focus(); q.setSelectionRange(pos, pos); }
  if (e.target.id === 'nom-grupo') S.nombreGrupo = e.target.value;
});
$('nuevo-panel').addEventListener('change', (e) => {
  const id = e.target.dataset.sel; if (!id) return;
  if (e.target.checked) { if (S.sel.size >= 19) { e.target.checked = false; toast('Un grupo admite hasta 20 personas.', 'error', { key: 'g-max' }); return; } S.sel.add(id); } else S.sel.delete(id);
  pintarNuevo();
});
$('lista-conv').addEventListener('click', (e) => { const id = e.target.closest('[data-conv]')?.dataset.conv; if (id) abrir(id); });
$('btn-atras').addEventListener('click', () => { S.abierta = null; $('sala').hidden = true; $('sala-vacia').hidden = false; pintarLista(); });
$('btn-info').addEventListener('click', () => { S.info = !S.info; pintarInfo(); });
$('form-msg').addEventListener('submit', enviar);
$('txt-msg').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('form-msg').requestSubmit(); } });
$('txt-msg').addEventListener('input', (e) => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; if (e.target.value.length > MAX_TEXTO - 50) e.target.title = `${e.target.value.length}/${MAX_TEXTO}`; });
$('mensajes').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-borrar]'); const r = e.target.closest('[data-reportar]');
  if (b && confirm('¿Borrar este mensaje para todos?')) { await ejecutar(() => api.borrar(Number(b.dataset.borrar)), { recargar: false }); await refrescarSala(); }
  if (r) { const motivo = prompt('¿Por qué reportas este mensaje? (mín. 3 letras)'); if (motivo) await ejecutar(async () => { await api.reportar(Number(r.dataset.reportar), motivo); toast('Reporte enviado a los administradores.', 'ok'); }, { recargar: false }); }
});
$('info-panel').addEventListener('click', async (e) => {
  const c = convAbierta(); if (!c) return;
  const q = e.target.closest('[data-quitar]')?.dataset.quitar;
  if (q && confirm(`¿Quitar a ${nombre(q)} del grupo?`)) { await ejecutar(() => api.expulsarDeGrupo(c.id, q), { recargar: false }); await refrescarSala(); await refrescarLista(); return; }
  const a = e.target.closest('[data-info]')?.dataset.info;
  if (a === 'silenciar') { await ejecutar(() => api.silenciar(c.id, !c.silenciado)); pintarInfo(); }
  if (a === 'salir' && confirm(c.tipo === 'GRUPO' ? '¿Salir de este grupo?' : '¿Quitar este chat de tu lista? Volverá a aparecer si te escriben.')) {
    await ejecutar(() => api.salir(c.id)); S.abierta = null; $('sala').hidden = true; $('sala-vacia').hidden = false; pintarLista();
  }
  if (a === 'agregar') { const v = $('sel-agregar')?.value; if (v) { await ejecutar(() => api.agregarAGrupo(c.id, v), { recargar: false }); await refrescarSala(); await refrescarLista(); } }
});

/* ---------- Arranque y tiempo real ---------- */
onSession(async ({ session }) => {
  $('chat-vacio').hidden = !!session; $('chat-app').hidden = !session; if (!session) return;
  await loadPerfiles();
  try { S.red = await cargarRed(); } catch (e) { console.warn('[mensajes] red:', e.message); }
  await refrescarLista();
  const objetivo = new URLSearchParams(location.search).get('con');   // /mensajes/?con=<id> abre (o crea) el chat directo
  if (objetivo) { const id = await ejecutar(() => api.abrirDirecto(objetivo)); if (id) { await refrescarLista(); await abrir(id); } }
});
let t; const soon = () => { clearTimeout(t); t = setTimeout(async () => { await refrescarLista(); await refrescarSala(); }, 250); };
supabase.channel('chat-privado')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_privados' }, soon)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'conv_miembros' }, soon)
  .subscribe();
setInterval(() => { if (!document.hidden && me()) refrescarLista(); }, 60000);
