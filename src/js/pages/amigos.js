// Página /amigos/: pestañas (Amigos · Solicitudes · Buscar · Seguidores · Siguiendo · Bloqueados · Privacidad).
// Esquema: pages → features/amigos/api (RPC) → core/red (lógica pura).
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { href } from '../core/config.js';
import { me, data, loadPerfiles } from '../features/duelos/data.js';
import { supabase } from '../core/supabase.js';
import { normalizarRed, relacion, buscarPerfiles, contadores, PRIVACIDAD_OPCIONES } from '../core/red.js';
import * as api from '../features/amigos/api.js';

const $ = (id) => document.getElementById(id);
const S = { red: normalizarRed(null), tab: 'amigos', texto: '', ocupado: false };
const perfil = (id) => data.perfiles.get(id) ?? { id, nombre_display: 'Jugador' };

const TABS = [
  ['amigos', 'Amigos', 'fa-user-group'], ['solicitudes', 'Solicitudes', 'fa-inbox'], ['buscar', 'Buscar', 'fa-magnifying-glass'],
  ['seguidores', 'Seguidores', 'fa-heart'], ['siguiendo', 'Siguiendo', 'fa-eye'], ['bloqueados', 'Bloqueados', 'fa-ban'], ['privacidad', 'Privacidad', 'fa-shield-halved'],
];
const vacio = (t) => `<div class="text-center py-8 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${t}</div>`;

const btn = (act, id, texto, icono, tono = '') => `<button type="button" data-act="${act}" data-id="${escapeHTML(id)}" class="btn btn-ghost !min-h-9 !px-3 !text-[11px] ${tono}"><i class="fa-solid ${icono}"></i><span>${texto}</span></button>`;
const MAL = '!text-bad !border-bad/50';

function avatar(p) {
  const src = safeImg(p.avatar_url);
  return src ? `<img src="${escapeHTML(src)}" alt="" class="w-10 h-10 rounded-full object-cover border border-galaxy-border" loading="lazy">`
    : `<span class="w-10 h-10 rounded-full bg-galaxy-900 border border-galaxy-border flex items-center justify-center font-display font-bold text-galaxy-400">${escapeHTML((p.nombre_display || '?').trim().charAt(0).toUpperCase())}</span>`;
}
const msg = (id) => `<a href="${escapeHTML(href('mensajes/'))}?con=${escapeHTML(id)}" class="btn btn-ghost !min-h-9 !px-3 !text-[11px] !text-galaxy-400 !border-galaxy-400/50"><i class="fa-solid fa-comment-dots"></i><span>Mensaje</span></a>`;
const fila = (id, acciones, extra = '') => { const p = perfil(id);
  return `<div class="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-galaxy-panel border border-galaxy-border/80">${avatar(p)}
    <div class="min-w-0 flex-1"><p class="font-display font-bold text-white uppercase text-sm truncate">${escapeHTML(p.nombre_display || 'Jugador')}</p>${extra ? `<p class="text-[11px] text-gray-400 truncate">${extra}</p>` : ''}</div>
    <div class="flex flex-wrap justify-end gap-1.5 shrink-0">${acciones}</div></div>`; };

/** Botones según mi relación con la persona (misma lógica en Buscar, Seguidores, etc.). */
function accionesPara(id) {
  const rel = relacion(S.red, id, me()); const sigo = S.red.siguiendo.includes(id);
  const amistad = { ninguna: btn('solicitar', id, 'Agregar', 'fa-user-plus', '!text-galaxy-400 !border-galaxy-400/50'),
    enviada: btn('cancelar', id, 'Cancelar solicitud', 'fa-clock'), amigos: btn('quitar', id, 'Quitar', 'fa-user-minus'),
    recibida: btn('aceptar', id, 'Aceptar', 'fa-check', '!text-ok !border-ok/50') + btn('rechazar', id, 'Rechazar', 'fa-xmark'), yo: '', bloqueado: btn('desbloquear', id, 'Desbloquear', 'fa-lock-open') }[rel];
  if (rel === 'yo' || rel === 'bloqueado') return amistad;
  return amistad + (sigo ? btn('dejar', id, 'Siguiendo', 'fa-check') : btn('seguir', id, 'Seguir', 'fa-heart')) + btn('bloquear', id, '', 'fa-ban', MAL);
}

const VISTAS = {
  amigos: () => S.red.amigos.length ? S.red.amigos.map((id) => fila(id, msg(id) + btn('quitar', id, 'Quitar', 'fa-user-minus') + btn('bloquear', id, '', 'fa-ban', MAL))).join('')
    : vacio('Aún no tienes amigos. Usa «Buscar» para encontrar jugadores.'),
  solicitudes: () => `<h3 class="text-[11px] text-gray-400 tracking-[0.2em] uppercase">Recibidas <b class="text-galaxy-400">${S.red.recibidas.length || ''}</b></h3>`
    + (S.red.recibidas.length ? S.red.recibidas.map((id) => fila(id, btn('aceptar', id, 'Aceptar', 'fa-check', '!text-ok !border-ok/50') + btn('rechazar', id, 'Rechazar', 'fa-xmark') + btn('bloquear', id, '', 'fa-ban', MAL))).join('') : vacio('No tienes solicitudes pendientes.'))
    + `<h3 class="text-[11px] text-gray-400 tracking-[0.2em] uppercase pt-2">Enviadas <b class="text-galaxy-400">${S.red.enviadas.length || ''}</b></h3>`
    + (S.red.enviadas.length ? S.red.enviadas.map((id) => fila(id, btn('cancelar', id, 'Cancelar', 'fa-xmark'), 'Esperando respuesta')).join('') : vacio('No has enviado solicitudes.')),
  buscar: () => `<label class="label" for="q-red">Buscar jugador</label>
    <input id="q-red" type="search" autocomplete="off" maxlength="40" class="field w-full" placeholder="Nombre o usuario (mín. 2 letras)" value="${escapeHTML(S.texto)}">
    <div id="res-red" class="space-y-2 pt-1">${resultadosBusqueda()}</div>`,
  seguidores: () => S.red.seguidores.length ? S.red.seguidores.map((id) => fila(id, accionesPara(id))).join('') : vacio('Nadie te sigue todavía.'),
  siguiendo: () => S.red.siguiendo.length ? S.red.siguiendo.map((id) => fila(id, btn('dejar', id, 'Dejar de seguir', 'fa-heart-crack'))).join('') : vacio('No sigues a nadie todavía.'),
  bloqueados: () => (S.red.bloqueados.length ? S.red.bloqueados.map((id) => fila(id, btn('desbloquear', id, 'Desbloquear', 'fa-lock-open'))).join('') : vacio('No has bloqueado a nadie.'))
    + '<p class="text-[11px] text-gray-500 pt-1">Quien bloqueas no puede enviarte solicitudes, seguirte ni escribirte, y no se entera de que lo bloqueaste.</p>',
  privacidad: () => PRIVACIDAD_OPCIONES.map((o) => `<div class="rounded-xl bg-galaxy-panel border border-galaxy-border/80 p-3"><label class="label !mb-1.5" for="pv-${o.clave}"><i class="fa-solid ${o.icono} text-galaxy-400 mr-1"></i>${o.titulo}</label>
      <select id="pv-${o.clave}" data-priv="${o.clave}" class="field w-full">${o.opciones.map(([v, t]) => `<option value="${v}" ${S.red.privacidad[o.clave] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('')
    + `<label class="flex items-center justify-between gap-3 rounded-xl bg-galaxy-panel border border-galaxy-border/80 p-3 cursor-pointer"><span class="text-sm text-white"><i class="fa-solid fa-circle text-ok text-[8px] mr-1.5"></i>Mostrar que estoy conectado
      <span class="block text-[11px] text-gray-400">Si lo apagas, no apareces «en línea» para tus amigos.</span></span>
      <input type="checkbox" data-priv="mostrar_conexion" ${S.red.privacidad.mostrar_conexion ? 'checked' : ''} class="w-5 h-5 accent-[#8000ff]"></label>`,
};

function resultadosBusqueda() {
  if (S.texto.trim().length < 2) return vacio('Escribe al menos 2 letras.');
  const r = buscarPerfiles([...data.perfiles.values()], S.texto, S.red, me());
  return r.length ? r.map((p) => fila(p.id, accionesPara(p.id))).join('') : vacio('Sin resultados.');
}

function pintar() {
  const c = contadores(S.red); const n = { amigos: c.amigos, solicitudes: c.solicitudes, seguidores: c.seguidores, siguiendo: c.siguiendo, bloqueados: c.bloqueados };
  $('tabs-red').innerHTML = TABS.map(([id, t, i]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${S.tab === id}" class="aj-tab shrink-0"><i class="fa-solid ${i} mr-1.5"></i>${t}${n[id] ? ` <b class="text-galaxy-400">${n[id]}</b>` : ''}</button>`).join('');
  const activo = document.activeElement?.id === 'q-red';
  $('panel-red').innerHTML = VISTAS[S.tab]();
  if (activo || S.tab === 'buscar') { const q = $('q-red'); if (q && activo) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}

async function recargar() {
  try { S.red = await api.cargarRed(); pintar(); window.dispatchEvent(new CustomEvent('pendientes:refresh')); }
  catch (e) { toast(e.message, 'error', { key: 'red-carga' }); }
}

const ACCIONES = {
  solicitar: (id) => api.solicitar(id).then((r) => toast(r === 'ACEPTADA' ? '¡Ya son amigos!' : 'Solicitud enviada.', 'ok')),
  cancelar: (id) => api.cancelarSolicitud(id), quitar: (id) => confirm('¿Quitar a este amigo?') && api.eliminarAmigo(id),
  aceptar: (id) => api.responder(id, true).then(() => toast('Solicitud aceptada.', 'ok')), rechazar: (id) => api.responder(id, false),
  seguir: (id) => api.seguir(id), dejar: (id) => api.dejarDeSeguir(id),
  bloquear: (id) => confirm('¿Bloquear a esta persona? Se cortará la amistad y los seguimientos.') && api.bloquear(id).then(() => toast('Persona bloqueada.', 'info')),
  desbloquear: (id) => api.desbloquear(id),
};

async function ejecutar(fn) {
  if (S.ocupado) return; S.ocupado = true;
  try { await fn(); } catch (e) { toast(e.message || 'No se pudo completar la acción.', 'error'); }
  finally { S.ocupado = false; await recargar(); }
}

$('tabs-red').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]')?.dataset.tab; if (t) { S.tab = t; pintar(); } });
$('panel-red').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); const f = b && ACCIONES[b.dataset.act]; if (f) ejecutar(() => f(b.dataset.id)); });
$('panel-red').addEventListener('input', (e) => { if (e.target.id === 'q-red') { S.texto = e.target.value; $('res-red').innerHTML = resultadosBusqueda(); } });
$('panel-red').addEventListener('change', (e) => {
  const k = e.target.dataset.priv; if (!k) return;
  const nuevo = { ...S.red.privacidad, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value };
  ejecutar(async () => { await api.guardarPrivacidad(nuevo); toast('Privacidad guardada.', 'ok', { key: 'priv' }); });
});

onSession(async ({ session }) => {
  $('amigos-vacio').hidden = !!session; $('amigos-app').hidden = !session;
  if (!session) return;
  await loadPerfiles(); await recargar();
});
let t; const soon = () => { clearTimeout(t); t = setTimeout(recargar, 300); };
supabase.channel('amistades').on('postgres_changes', { event: '*', schema: 'public', table: 'amistades' }, soon).subscribe();
