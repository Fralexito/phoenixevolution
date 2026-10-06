// Página /clanes/: mi clan (miembros, solicitudes, votación de capitán) y exploración. Esquema: pages/clanes → features/clanes/api → core/clan (puro).
// Las reglas (adultos, edades, 70 %, 5 días…) viven en la BD (migración 043); aquí solo se muestran y se piden.
import { onSession, can } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { buscarPersonas } from '../features/social/api.js';
import * as api from '../features/clanes/api.js';
import { LIMITES, ROLES, validarClan, puede, restante, textoMotivo } from '../core/clan.js';

const $ = (id) => document.getElementById(id);
// S.req = «versión» de la última carga (descarta respuestas viejas); S.busy = acción en curso (evita dobles clics).
const S = { tab: 'mio', yo: null, listo: false, req: 0, busy: false, mi: null, lista: [], busqueda: '', encontrados: [], moderando: null };
const avisoError = (m) => { $('cl-error-txt').textContent = m; $('cl-error').hidden = !m; };
const perfilHref = (u) => href(`perfil/?u=${encodeURIComponent(u)}`);
const chipRol = (r) => `<span class="text-[10px] font-display font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${ROLES[r].clase}"><i class="fa-solid ${ROLES[r].icono}"></i> ${ROLES[r].etiqueta}</span>`;
const etiqueta = (e) => `<span class="font-display font-extrabold text-galaxy-400">[${escapeHTML(e)}]</span>`;
const vacio = (t) => `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${escapeHTML(t)}</div>`;

// ── Pintado ──────────────────────────────────────────────────────────────────────────────────────────────────
function votacionHTML(m) {
  const v = m.votacion, yo = m.miembros.find((x) => x.id === S.yo), soyAdulto = !!yo?.adulto;
  if (!v) {
    if (!soyAdulto || m.rol === 'capitan') return '';
    const d = m.destitucion;
    return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Destituir al capitán</h3>
      <p class="text-[11px] text-gray-400 mt-1">Si más del 70 % de los adultos lo pide (${d.pedidos} de ${d.necesarios} necesarios) se abre una votación; el capitán actual puede ser reelegido.</p>
      <button type="button" data-destituir="${d.yoPedi ? 'no' : 'si'}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px] mt-2 ${d.yoPedi ? '' : '!text-rose-300'}">${d.yoPedi ? 'Retirar mi pedido' : 'Pedir destitución'}</button></section>`;
  }
  const filas = v.candidatos.map((c) => `<li class="flex items-center gap-2 py-1.5"><span class="flex-1 min-w-0 truncate text-sm text-white">${escapeHTML(c.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(c.username)}</span></span>
      <span class="text-xs text-gray-300">${c.votos} voto${c.votos === 1 ? '' : 's'}</span>
      ${soyAdulto ? `<button type="button" data-votar="${escapeHTML(c.id)}" aria-pressed="${v.miVoto === c.id}" class="adv-chip !min-h-8">${v.miVoto === c.id ? '<i class="fa-solid fa-check"></i> Tu voto' : 'Votar'}</button>` : ''}</li>`).join('');
  return `<section class="glass-panel rounded-2xl p-4 border border-amber-400/30"><h3 class="font-display font-bold text-amber-300 text-sm uppercase tracking-wider"><i class="fa-solid fa-gavel"></i> ${escapeHTML(textoMotivo(v.motivo))}</h3>
    <p class="text-[11px] text-gray-400 mt-1">Cierra en ${escapeHTML(restante(v.cierraAt))}, o antes si alguien reúne ${v.necesarios} votos. Votan solo adultos; puedes cambiar tu voto. ${soyAdulto ? '' : 'Eres menor de edad: puedes mirar, pero no votar.'}</p>
    <ul class="divide-y divide-galaxy-border/40 mt-2">${filas || '<li class="text-xs text-gray-500 py-2">Aún no hay candidatos elegibles.</li>'}</ul></section>`;
}
function miembroHTML(x, m) {
  const p = puede(m.rol), esYo = x.id === S.yo;
  const acc = [];
  if (!esYo && x.rol === 'miembro') {
    if (p.nombrar && x.adulto) acc.push(`<button type="button" data-sub="${escapeHTML(x.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px]">Subcapitán</button>`);
    if (p.ceder && x.adulto && !m.votacion) acc.push(`<button type="button" data-ceder="${escapeHTML(x.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px]">Ceder cargo</button>`);
    if (p.expulsar) acc.push(`<button type="button" data-expulsar="${escapeHTML(x.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px] !text-rose-300">Expulsar</button>`);
  } else if (!esYo && x.rol === 'subcapitan' && p.expulsar && m.rol === 'capitan') acc.push(`<button type="button" data-expulsar="${escapeHTML(x.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px] !text-rose-300">Expulsar</button>`);
  if (can('gestionarClanes') && !esYo) acc.push(`<button type="button" data-mod-expulsar="${escapeHTML(x.id)}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px] !text-amber-300" title="Moderación">Sacar (staff)</button>`);
  return `<li class="flex flex-wrap items-center gap-2 py-2"><span class="shrink-0">${avatarHTML(x.avatar, x.nombre, 32)}</span>
    <a href="${perfilHref(x.username)}" class="flex-1 min-w-0 truncate text-sm text-white hover:underline">${escapeHTML(x.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(x.username)}</span></a>
    ${chipRol(x.rol)}${x.adulto ? '' : '<span class="text-[10px] text-gray-500 border border-galaxy-border rounded px-1.5 py-0.5">Menor</span>'}${acc.join('')}</li>`;
}
function miClanHTML(m) {
  const p = puede(m.rol), lleno = m.miembros.length >= m.maximo;
  const solic = p.responder && m.solicitudes.length ? `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Solicitudes e invitaciones</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${m.solicitudes.map((s) => `<li class="flex flex-wrap items-center gap-2 py-2"><span class="flex-1 min-w-0 truncate text-sm text-white">${escapeHTML(s.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(s.username)}</span> <span class="text-[10px] text-gray-400">· ${s.tipo === 'invitacion' ? 'invitación enviada' : 'quiere unirse'}</span></span>
      ${s.tipo === 'solicitud' ? `<button type="button" data-resp="${s.id}" data-ok="1" class="btn btn-primary !min-h-8 !px-3 !text-[11px]">Aceptar</button><button type="button" data-resp="${s.id}" data-ok="0" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]">Rechazar</button>` : ''}</li>`).join('')}</ul></section>` : '';
  const invitar = p.invitar && !lleno ? `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Invitar jugadores</h3>
      <form id="cl-buscar" class="flex gap-2 mt-2"><input id="cl-buscar-q" class="field flex-1 min-w-0" maxlength="40" placeholder="Buscar por nombre o usuario" aria-label="Buscar persona"><button class="btn btn-ghost !min-h-9 !px-3 !text-xs" type="submit">Buscar</button></form>
      <ul class="divide-y divide-galaxy-border/40 mt-1">${S.encontrados.map((u) => `<li class="flex items-center gap-2 py-2"><span class="flex-1 min-w-0 truncate text-sm text-white">${escapeHTML(u.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(u.username)}</span></span><button type="button" data-invitar="${escapeHTML(u.id)}" class="btn btn-primary !min-h-8 !px-3 !text-[11px]">Invitar</button></li>`).join('')}</ul></section>` : '';
  const edit = p.editar ? `<form id="cl-editar" class="flex flex-wrap gap-2 mt-3"><input id="cl-desc-e" class="field flex-1 min-w-[10rem]" maxlength="${LIMITES.descripcionMax}" value="${escapeHTML(m.clan.descripcion)}" aria-label="Descripción del clan"><button class="btn btn-ghost !min-h-9 !px-3 !text-xs" type="submit">Guardar descripción</button></form>` : '';
  return `<section class="glass-panel rounded-2xl p-4"><div class="flex flex-wrap items-center gap-2"><h2 class="font-display font-extrabold text-white text-lg">${etiqueta(m.clan.etiqueta)} ${escapeHTML(m.clan.nombre)}</h2>${m.clan.oculto ? '<span class="text-[10px] text-rose-300 border border-rose-400/40 rounded px-1.5 py-0.5">Oculto por moderación</span>' : ''}<span class="text-[11px] text-gray-400 ml-auto">${m.miembros.length}/${m.maximo} miembros · ${m.adultos} adulto${m.adultos === 1 ? '' : 's'}</span></div>
    <p class="text-xs text-gray-300 mt-1 whitespace-pre-line">${escapeHTML(m.clan.descripcion) || '<span class="text-gray-500">Sin descripción.</span>'}</p>${edit}
    <ul class="divide-y divide-galaxy-border/40 mt-3">${m.miembros.map((x) => miembroHTML(x, m)).join('')}</ul>
    <div class="mt-3 flex flex-wrap gap-2"><button type="button" data-salir class="btn btn-ghost !min-h-8 !px-3 !text-[11px] !text-rose-300"><i class="fa-solid fa-right-from-bracket"></i> Salir del clan</button></div></section>${votacionHTML(m)}${solic}${invitar}`;
}
function sinClanHTML(m) {
  const inv = m.invitaciones.length ? `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Invitaciones recibidas</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${m.invitaciones.map((i) => `<li class="flex flex-wrap items-center gap-2 py-2"><span class="flex-1 min-w-0 truncate text-sm text-white">${etiqueta(i.etiqueta)} ${escapeHTML(i.nombre)} <span class="text-[10px] text-gray-400">· ${i.miembros} miembros</span></span><button type="button" data-resp="${i.id}" data-ok="1" class="btn btn-primary !min-h-8 !px-3 !text-[11px]">Aceptar</button><button type="button" data-resp="${i.id}" data-ok="0" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]">Rechazar</button></li>`).join('')}</ul></section>` : '';
  const env = m.enviadas.length ? `<p class="text-[11px] text-gray-400 px-1">Solicitudes enviadas: ${m.enviadas.map((e) => `${etiqueta(e.etiqueta)} ${escapeHTML(e.nombre)}`).join(', ')}</p>` : '';
  return `${inv}<section class="glass-panel rounded-2xl p-4"><h2 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-plus text-galaxy-400 mr-1"></i>Fundar un clan</h2>
    <p class="text-[11px] text-gray-400 mt-1">Solo pueden fundar clanes las personas adultas (con la edad declarada en tu perfil). Si eres menor, pide a un capitán que te invite o solicita unirte desde «Explorar».</p>
    <form id="cl-form" class="grid sm:grid-cols-2 gap-3 mt-3" novalidate>
      <label class="text-[11px] text-gray-400">Nombre (${LIMITES.nombreMin}–${LIMITES.nombreMax})<input id="cl-nombre" class="field mt-1 w-full" maxlength="${LIMITES.nombreMax}" autocomplete="off"></label>
      <label class="text-[11px] text-gray-400">Etiqueta (${LIMITES.etiquetaMin}–${LIMITES.etiquetaMax}, ej. PHX)<input id="cl-etiqueta" class="field mt-1 w-full uppercase" maxlength="${LIMITES.etiquetaMax}" autocomplete="off"></label>
      <label class="sm:col-span-2 text-[11px] text-gray-400">Descripción (opcional)<textarea id="cl-desc" class="field mt-1 w-full" rows="2" maxlength="${LIMITES.descripcionMax}"></textarea></label>
      <p id="cl-form-error" hidden role="alert" class="sm:col-span-2 text-xs text-rose-300"></p>
      <div class="sm:col-span-2 flex justify-end"><button type="submit" class="btn btn-primary !min-h-9 !px-4 !text-xs">Fundar clan</button></div></form></section>${env}`;
}
function explorarHTML() {
  const filas = S.lista.map((c) => `<article class="glass-panel rounded-2xl p-3 flex flex-wrap items-center gap-2 ${c.oculto ? 'opacity-60' : ''}"><div class="flex-1 min-w-0"><p class="text-sm text-white truncate">${etiqueta(c.etiqueta)} ${escapeHTML(c.nombre)}${c.oculto ? ' <span class="text-[10px] text-rose-300">(oculto)</span>' : ''}</p>
      <p class="text-[11px] text-gray-400 truncate">${c.miembros} miembro${c.miembros === 1 ? '' : 's'} · capitán @${escapeHTML(c.capitan || '—')}${c.descripcion ? ' · ' + escapeHTML(c.descripcion) : ''}</p></div>
    ${S.yo && S.mi && !S.mi.enClan && !c.oculto ? `<button type="button" data-solicitar="${c.id}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]">Solicitar unirme</button>` : ''}
    ${can('gestionarClanes') ? `<button type="button" data-mod="${c.id}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px] !text-amber-300">${c.oculto ? 'Mostrar' : 'Ocultar'}</button>` : ''}</article>`).join('');
  return `<form id="cl-explorar" class="flex gap-2"><input id="cl-q" class="field flex-1 min-w-0" maxlength="40" value="${escapeHTML(S.busqueda)}" placeholder="Buscar por nombre o etiqueta" aria-label="Buscar clan"><button class="btn btn-ghost !min-h-9 !px-3 !text-xs" type="submit">Buscar</button></form>${filas || vacio('No hay clanes que mostrar.')}`;
}
function pintar() {
  for (const b of document.querySelectorAll('#cl-tabs [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === S.tab));
  const c = $('cl-contenido');
  if (S.tab === 'explorar') { c.innerHTML = explorarHTML(); return; }
  if (!S.yo) { c.innerHTML = vacio('Inicia sesión para ver o crear tu clan.'); return; }
  c.innerHTML = !S.mi ? '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>' : S.mi.enClan ? miClanHTML(S.mi) : sinClanHTML(S.mi);
}
async function cargar() {
  const mia = ++S.req;
  try {
    const [mi, lista] = await Promise.all([S.yo ? api.miClan() : Promise.resolve(null), api.listarClanes(S.busqueda)]);
    if (mia !== S.req) return;
    S.mi = mi; S.lista = lista; avisoError(''); pintar();
  } catch (e) { if (mia !== S.req) return; console.error('[clanes] página:', e); avisoError(e?.message || 'Algo salió mal. Inténtalo de nuevo.'); pintar(); }
}
/** Ejecuta una acción protegida contra dobles clics; recarga al terminar. */
async function hacer(fn, ok) {
  if (S.busy) return; S.busy = true;
  try { await fn(); if (ok) toast(ok, 'ok'); await cargar(); }
  catch (e) { console.error('[clanes] acción:', e); toast(e?.message || 'No se pudo completar la acción.', 'error'); }
  finally { S.busy = false; }
}
const pedirMotivo = async (t) => { const m = await pedirTexto(t, { titulo: 'Motivo', maximo: LIMITES.motivoMax }); return m ? m.slice(0, LIMITES.motivoMax) : null; };

// ── Eventos (delegación) ─────────────────────────────────────────────────────────────────────────────────────
$('cl-contenido').addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-resp],[data-invitar],[data-salir],[data-expulsar],[data-sub],[data-ceder],[data-votar],[data-destituir],[data-solicitar],[data-mod],[data-mod-expulsar]'); if (!t) return;
  const d = t.dataset;
  if (d.resp) hacer(() => api.responder(Number(d.resp), d.ok === '1'), d.ok === '1' ? 'Listo.' : 'Respondido.');
  else if (d.invitar) hacer(() => api.invitar(d.invitar), 'Invitación enviada.').then(() => { S.encontrados = S.encontrados.filter((u) => u.id !== d.invitar); pintar(); });
  else if (t.hasAttribute('data-salir')) { if (await confirmar('¿Seguro que quieres salir del clan?', { titulo: 'Salir del clan', aceptar: 'Salir', peligro: true })) hacer(() => api.salir(), 'Saliste del clan.'); }
  else if (d.expulsar) { if (await confirmar('¿Expulsar a esta persona del clan?', { titulo: 'Expulsar', aceptar: 'Expulsar', peligro: true })) hacer(() => api.expulsar(d.expulsar), 'Miembro expulsado.'); }
  else if (d.sub) hacer(() => api.nombrarSubcapitan(d.sub), 'Subcapitán nombrado.');
  else if (d.ceder) { if (await confirmar('¿Ceder la capitanía? Pasarás a ser un miembro más.', { titulo: 'Ceder capitanía', aceptar: 'Ceder', peligro: true })) hacer(() => api.cederCapitania(d.ceder), 'Capitanía cedida.'); }
  else if (d.votar) hacer(() => api.votar(d.votar), 'Voto registrado.');
  else if (d.destituir) hacer(() => api.pedirDestitucion(d.destituir === 'si'), d.destituir === 'si' ? 'Pedido registrado.' : 'Pedido retirado.');
  else if (d.solicitar) hacer(() => api.solicitarIngreso(Number(d.solicitar)), 'Solicitud enviada al clan.');
  else if (d.mod) { const c = S.lista.find((x) => x.id === Number(d.mod)); const m = await pedirMotivo(c?.oculto ? 'Motivo para volver a mostrarlo:' : 'Motivo para ocultar este clan:'); if (m && c) hacer(() => api.moderarClan(c.id, !c.oculto, m), 'Hecho (queda en la auditoría).'); }
  else if (d.modExpulsar) { const m = await pedirMotivo('Motivo para sacar a esta persona del clan:'); if (m) hacer(() => api.moderarExpulsar(d.modExpulsar, m), 'Persona sacada del clan (queda en la auditoría).'); }
});
$('cl-contenido').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target;
  if (f.id === 'cl-form') {
    const err = $('cl-form-error'), v = validarClan({ nombre: $('cl-nombre').value, etiqueta: $('cl-etiqueta').value, descripcion: $('cl-desc').value });
    if (!v.ok) { err.textContent = v.error; err.hidden = false; return; }
    err.hidden = true; if (S.busy) return; S.busy = true;
    try { await api.crearClan(v.valores); toast('¡Clan fundado! Eres su capitán.', 'ok'); await cargar(); }
    catch (e) { console.error('[clanes] crear:', e); err.textContent = e?.message || 'No se pudo fundar el clan.'; err.hidden = false; }
    finally { S.busy = false; }
  } else if (f.id === 'cl-editar') hacer(() => api.editarClan($('cl-desc-e').value.trim()), 'Descripción actualizada.');
  else if (f.id === 'cl-explorar') { S.busqueda = $('cl-q').value.trim(); cargar(); }
  else if (f.id === 'cl-buscar') {
    const q = $('cl-buscar-q').value.trim(); if (q.length < 2) { toast('Escribe al menos 2 letras.', 'error'); return; }
    try { const ya = new Set(S.mi?.miembros.map((x) => x.id)); S.encontrados = (await buscarPersonas(q, 8)).filter((u) => !ya.has(u.id)); pintar(); if (!S.encontrados.length) toast('No hay resultados.', 'error'); }
    catch (e) { console.error('[clanes] buscar:', e); toast('No se pudo buscar.', 'error'); }
  }
});
$('cl-tabs').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (!b || b.dataset.tab === S.tab) return; S.tab = b.dataset.tab === 'explorar' ? 'explorar' : 'mio'; pintar(); });
$('cl-reintentar').addEventListener('click', cargar);
// El tiempo restante de la votación se refresca solo (sin pedir nada) y se vuelve a leer cada 60 s por si cerró.
setInterval(() => { if (document.hidden || S.busy || S.tab !== 'mio' || !S.mi?.votacion) return; if (document.activeElement?.closest?.('#cl-contenido form')) return; cargar(); }, 60000);
onSession(({ session }) => {
  const id = session?.user?.id ?? null;
  if (S.listo && id === S.yo) { pintar(); return; }
  S.listo = true; S.yo = id; S.mi = null; cargar();
});
