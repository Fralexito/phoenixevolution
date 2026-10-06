// Página /en-vivo/ («Salas en vivo»): (1) partidos abiertos a espectadores → pedir/entrar/ver enlace; (2) mis partidos → elegir quién puede mirar y responder solicitudes.
// Esquema: pages → features/espectadores/api (RPC) → core/espectadores (lógica pura).
import { onSession, getState } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { supabase } from '../core/supabase.js';
import { data, loadPerfiles } from '../features/duelos/data.js';
import { MODOS, modoDe, accionPara, clampMax } from '../core/espectadores.js';
import * as api from '../features/espectadores/api.js';
import { regionAhora } from '../features/ajustes.js';

const $ = (id) => document.getElementById(id);
const S = { partidos: [], salas: [], enlaces: new Map(), ocupado: false };
const nm = (id) => (id ? data.perfiles.get(id)?.nombre_display || 'Jugador' : null);
const yo = () => getState().session?.user.id ?? null;
const fecha = (iso) => new Date(iso).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...regionAhora() });
const badge = (t, c = '') => `<span class="px-2 py-0.5 rounded border text-[12px] font-display font-bold uppercase tracking-wide ${c || 'text-gray-300 border-galaxy-border'}">${t}</span>`;
const vacio = (t) => `<div class="col-span-full text-center py-8 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${t}</div>`;

const titulo = (p) => `${escapeHTML(nm(p.retador_id) ?? '—')} <span class="text-galaxy-400 mx-1">vs</span> ${escapeHTML(nm(p.rival_id) ?? 'por definir')}`;

/* ---------- Para mirar ---------- */
function tarjetaPartido(p) {
  const a = accionPara(p); const m = modoDe(p.modo); const enlace = S.enlaces.get(p.id);
  const boton = a.tipo === 'ver' ? `<button type="button" data-act="enlace" data-id="${p.id}" class="btn btn-primary !min-h-9 !px-4 !text-[12px]"><i class="fa-solid fa-link"></i> ${a.texto}</button>
      <button type="button" data-act="salir" data-id="${p.id}" class="btn btn-ghost !min-h-9 !px-3 !text-[12px]">Dejar de ver</button>`
    : a.activo ? `<button type="button" data-act="pedir" data-id="${p.id}" class="btn btn-primary !min-h-9 !px-4 !text-[12px]"><i class="fa-solid ${p.modo === 'APROBACION' ? 'fa-hand' : 'fa-door-open'}"></i> ${a.texto}</button>`
    : `<span class="text-[12px] text-gray-400 flex items-center gap-1.5"><i class="fa-solid ${a.tipo === 'pendiente' ? 'fa-hourglass-half' : 'fa-lock'}"></i>${escapeHTML(a.texto)}</span>`;
  const revelado = enlace ? `<div class="rounded-lg border border-galaxy-400/40 bg-galaxy-400/5 p-2.5 text-xs space-y-1">
      ${safeUrl(enlace.link, { allowParsec: true }) ? `<a href="${escapeHTML(safeUrl(enlace.link, { allowParsec: true }))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary !min-h-9 w-full"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir sala</a>`
        : `<p class="text-bad">El enlace del host no es válido. Pídele que lo publique de nuevo.</p>`}
      ${enlace.detalle ? `<p class="text-gray-300">${escapeHTML(enlace.detalle)}</p>` : ''}
      <p class="text-[12px] text-gray-400">Entras al mismo Parsec/Smash Soda: el host te acepta <b>dentro de la app</b> y debes quedarte como espectador.</p></div>` : '';
  return `<article class="glass-panel rounded-2xl p-3.5 space-y-2">
    <div class="flex flex-wrap items-center gap-1.5">${p.estado === 'EN_JUEGO' ? badge('● En juego', 'text-ok border-ok/50 bg-ok/10') : badge('Agendado', 'text-amber-300 border-amber-400/40 bg-amber-400/10')}
      ${badge(escapeHTML(p.plataforma), 'text-galaxy-400 border-galaxy-400/40')}${badge(`${p.tam_a} vs ${p.tam_b}`)}${badge(`<i class="fa-solid ${m.icono} mr-1"></i>${m.corto}`)}</div>
    <p class="font-display font-bold text-white uppercase text-sm leading-tight">${titulo(p)}</p>
    <p class="text-[12px] text-gray-400"><i class="fa-solid fa-eye mr-1"></i>${p.aprobados}/${p.max} espectadores${p.host_id ? ` · Host: ${escapeHTML(nm(p.host_id))}` : ''}${p.estado === 'ACEPTADO' && p.fecha ? ` · ${escapeHTML(fecha(p.fecha))}` : ''}</p>
    <div class="flex flex-wrap items-center gap-2">${boton}</div>${revelado}</article>`;
}
function pintarPartidos() {
  $('cnt-en-vivo').textContent = S.partidos.length ? `(${S.partidos.length})` : '';
  $('lista-en-vivo').innerHTML = S.partidos.length ? S.partidos.map(tarjetaPartido).join('') : vacio('Ahora mismo no hay partidos abiertos a espectadores. Si tú juegas, puedes abrir el tuyo desde «Lanzar reto» o aquí abajo.');
}

/* ---------- Mis partidos ---------- */
function tarjetaSala(s) {
  const fila = (id, botones) => `<div class="flex items-center gap-2"><span class="text-xs text-white flex-1 truncate">${escapeHTML(nm(id))}</span>${botones}</div>`;
  const b = (act, id, uid, t, c = '') => `<button type="button" data-act="${act}" data-id="${id}" data-uid="${escapeHTML(uid)}" class="btn btn-ghost !min-h-8 !px-2.5 !text-[12px] ${c}">${t}</button>`;
  return `<article class="glass-panel rounded-2xl p-3.5 space-y-2.5" data-sala="${s.id}">
    <div class="flex flex-wrap items-center gap-1.5">${badge(s.estado === 'BUSCANDO' ? 'Buscando' : s.estado === 'EN_JUEGO' ? 'En juego' : 'Agendado')}${badge(escapeHTML(s.plataforma), 'text-galaxy-400 border-galaxy-400/40')}${badge(`${s.tam_a} vs ${s.tam_b}`)}</div>
    <p class="font-display font-bold text-white uppercase text-sm">${titulo(s)}</p>
    <div class="grid grid-cols-[minmax(0,1fr)_5rem] gap-2 items-end">
      <div><label class="label !mb-1" for="modo-${s.id}">¿Quién puede mirar?</label>
        <select id="modo-${s.id}" class="field !py-1.5" data-campo="modo">${MODOS.map((m) => `<option value="${m.id}" ${m.id === s.modo ? 'selected' : ''}>${m.etiqueta}</option>`).join('')}</select></div>
      <div><label class="label !mb-1" for="max-${s.id}">Cupos</label><input id="max-${s.id}" type="number" min="1" max="20" value="${s.max}" class="field !py-1.5" data-campo="max"></div>
    </div>
    <p class="text-[12px] text-gray-400" data-ayuda>${escapeHTML(modoDe(s.modo).ayuda)}</p>
    <button type="button" data-act="guardar" data-id="${s.id}" class="btn btn-primary !min-h-9 w-full !text-[12px]"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
    ${s.pendientes.length ? `<div class="space-y-1.5 pt-1 border-t border-galaxy-border/60"><p class="text-[12px] text-gray-400 uppercase tracking-widest">Solicitudes (${s.pendientes.length})</p>
      ${s.pendientes.map((u) => fila(u, b('aceptar', s.id, u, 'Aceptar', '!text-ok !border-ok/50') + b('rechazar', s.id, u, 'Rechazar'))).join('')}</div>` : ''}
    ${s.aprobados.length ? `<div class="space-y-1.5 pt-1 border-t border-galaxy-border/60"><p class="text-[12px] text-gray-400 uppercase tracking-widest">Mirando (${s.aprobados.length}/${s.max})</p>
      ${s.aprobados.map((u) => fila(u, b('quitar', s.id, u, 'Quitar', '!text-bad !border-bad/50'))).join('')}</div>` : ''}
  </article>`;
}
function pintarSalas() {
  $('bloque-mis').hidden = !S.salas.length; $('cnt-mis-salas').textContent = S.salas.length ? `(${S.salas.length})` : '';
  if (document.activeElement?.closest?.('#lista-mis-salas') && document.activeElement.matches('input, select')) return;   // no pisar lo que se está editando
  $('lista-mis-salas').innerHTML = S.salas.map(tarjetaSala).join('');
}

/* ---------- Carga y acciones ---------- */
async function cargar() {
  try { await loadPerfiles(); } catch (e) { console.warn('[en-vivo] perfiles:', e); }
  try { S.partidos = await api.partidosEnVivo(); pintarPartidos(); }
  catch (e) { $('lista-en-vivo').innerHTML = vacio('No se pudo cargar la lista. Recarga la página.'); }
  if (yo()) { try { S.salas = await api.misSalas(); pintarSalas(); } catch (e) { console.warn('[en-vivo] mis salas:', e.message); } }
  else { S.salas = []; pintarSalas(); }
}
async function ejecutar(fn) {
  if (S.ocupado) return; S.ocupado = true;
  try { await fn(); } catch (e) { toast(e.message || 'No se pudo completar la acción.', 'error'); }
  finally { S.ocupado = false; await cargar(); }
}
const exigirSesion = () => { if (yo()) return true; toast('Inicia sesión para continuar.', 'error', { key: 'sesion' }); return false; };

$('lista-en-vivo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || !exigirSesion()) return; const id = Number(b.dataset.id);
  ({
    pedir: () => ejecutar(async () => { const r = await api.pedirVer(id); toast(r === 'APROBADO' ? 'Listo: ya puedes ver el enlace.' : 'Solicitud enviada. Te avisaremos.', 'ok'); }),
    enlace: () => ejecutar(async () => { S.enlaces.set(id, await api.enlace(id)); }),
    salir: () => ejecutar(async () => { await api.salir(id); S.enlaces.delete(id); }),
  })[b.dataset.act]?.();
});
$('lista-mis-salas').addEventListener('change', (e) => {
  if (e.target.dataset.campo === 'modo') e.target.closest('[data-sala]').querySelector('[data-ayuda]').textContent = modoDe(e.target.value).ayuda;
});
$('lista-mis-salas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return; const id = Number(b.dataset.id); const uid = b.dataset.uid;
  ({
    guardar: () => { const c = b.closest('[data-sala]'); const modo = c.querySelector('[data-campo="modo"]').value; const max = clampMax(c.querySelector('[data-campo="max"]').value);
      ejecutar(async () => { await api.configurar(id, modo, max); toast('Guardado.', 'ok', { key: 'cfg' }); }); },
    aceptar: () => ejecutar(() => api.responder(id, uid, true)), rechazar: () => ejecutar(() => api.responder(id, uid, false)),
    quitar: async () => { if (await confirmar('¿Quitar a este espectador?', { titulo: 'Quitar espectador', aceptar: 'Quitar', peligro: true })) ejecutar(() => api.quitar(id, uid)); },
  })[b.dataset.act]?.();
});

onSession(() => cargar());
let t; const soon = () => { clearTimeout(t); t = setTimeout(cargar, 300); };
supabase.channel('en-vivo').on('postgres_changes', { event: '*', schema: 'public', table: 'reto_espectadores' }, soon)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'retos_matchmaking' }, soon).subscribe();
setInterval(() => { if (!document.hidden) cargar(); }, 60000);
