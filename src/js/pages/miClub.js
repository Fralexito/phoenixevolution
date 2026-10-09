// «Mi club» (vestuario). Lee vestuario_* (RLS: cada uno ve lo suyo, el staff todo) y guarda con el RPC vestuario_guardar_cambios.
// Phoenix Mercado sube el club y recoge los cambios «pendientes»; ver docs/mercado-api.md.
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { POSICIONES, XY, HABILIDADES, PORTERO, BASICOS, leer, bloqueado, validarValor, siguientePosicion, valorActual, cambiosDe, fijar, borradorDesde, agruparPlantilla, euros, colorHab, mensajeError } from '../core/vestuario.js';

const $ = (id) => document.getElementById(id);
const st = { yo: null, clubes: [], club: null, jugadores: [], pendientes: new Map(), rechazados: new Map(), urls: new Map(), sel: null, borrador: {}, guardando: false };
const esMio = () => st.club && st.club.usuario_id === st.yo;
const jugador = () => st.jugadores.find((j) => j.id === st.sel) ?? null;
const pidNum = (j) => j.pid;

async function firmar(rutas) {
  const lim = rutas.filter(Boolean); st.urls = new Map(); if (!lim.length) return;
  const { data } = await supabase.storage.from('vestuario').createSignedUrls(lim, 3600);
  (data ?? []).forEach((x) => { if (x.signedUrl) st.urls.set(x.path, x.signedUrl); });
}
const img = (ruta, clase, alt = '') => ruta && st.urls.get(ruta) ? `<img class="${clase}" src="${esc(st.urls.get(ruta))}" alt="${esc(alt)}" loading="lazy" width="64" height="64">` : `<span class="${clase}" aria-hidden="true"></span>`;

async function cargarClubes() {
  const { data, error } = await supabase.from('vestuario_club').select('id, usuario_id, pes_team_id, nombre, partida, fecha_partida, finanzas, escudo_url, subido_en').order('subido_en', { ascending: false });
  if (error) { toast('No se pudieron cargar los clubes.', 'error'); return; }
  st.clubes = data ?? [];
  $('mc-vacio').hidden = st.clubes.length > 0; $('mc-app').hidden = st.clubes.length === 0;
  if (!st.clubes.length) return;
  const propio = st.clubes.find((c) => c.usuario_id === st.yo);
  await abrirClub((st.club && st.clubes.find((c) => c.id === st.club.id))?.id ?? (propio ?? st.clubes[0]).id);
}

async function abrirClub(id) {
  st.club = st.clubes.find((c) => c.id === id); st.sel = null; st.borrador = {};
  const [{ data: js, error: e1 }, { data: cs, error: e2 }] = await Promise.all([
    supabase.from('vestuario_jugador').select('id, pid, orden, ficha, foto_url').eq('club_id', id).eq('vigente', true).order('orden'),
    supabase.from('vestuario_cambio').select('jugador_id, campo, valor, estado, motivo_rechazo, version').eq('club_id', id).in('estado', ['pendiente', 'rechazado']).order('version'),
  ]);
  if (e1 || e2) { toast('No se pudo cargar el club.', 'error'); return; }
  st.jugadores = js ?? [];
  st.pendientes = new Map(); st.rechazados = new Map();
  (cs ?? []).forEach((c) => { const m = c.estado === 'pendiente' ? st.pendientes : st.rechazados; if (!m.has(c.jugador_id)) m.set(c.jugador_id, []); m.get(c.jugador_id).push(c); });
  await firmar([st.club.escudo_url, ...st.jugadores.map((j) => j.foto_url)]);
  st.sel = st.jugadores[0]?.id ?? null; cargarBorrador();
  pintar();
}
function cargarBorrador() { st.borrador = borradorDesde(st.pendientes.get(st.sel)); }

function pintar() { pintarSelector(); pintarCabecera(); pintarPlantilla(); pintarDetalle(); }

function pintarSelector() {
  const s = $('mc-selector'); s.hidden = st.clubes.length < 2;
  s.innerHTML = st.clubes.map((c) => `<button type="button" class="mg-chip" data-club="${c.id}" aria-pressed="${c.id === st.club.id}">${esc(c.nombre)}${c.usuario_id === st.yo ? '' : ' · de otro DT'}</button>`).join('');
}
function pintarCabecera() {
  const c = st.club; const f = c.finanzas ?? {};
  const fin = Object.entries(f).filter(([, v]) => v != null && typeof v !== 'object').slice(0, 4).map(([k, v]) => `<span class="text-xs text-gray-400">${esc(k.replace(/_/g, ' '))}: <b class="text-white">${typeof v === 'number' ? euros(v) : esc(v)}</b></span>`).join('');
  $('mc-cabecera').innerHTML = `${img(c.escudo_url, 'mc-escudo', 'Escudo')}<div class="min-w-0 flex-1"><h2 class="font-display font-bold text-white text-xl">${esc(c.nombre)}</h2>
    <p class="text-xs text-gray-400">${esc(c.partida ?? 'Partida')} · ${esc(c.fecha_partida ?? 'sin fecha')}${esMio() ? '' : ' · solo lectura'}</p><div class="flex flex-wrap gap-x-4 gap-y-1 mt-1">${fin}</div></div>
    <button type="button" class="btn btn-ghost" id="mc-refrescar"><i class="fa-solid fa-rotate"></i> Actualizar</button>`;
}
function pintarPlantilla() {
  $('mc-plantilla').innerHTML = agruparPlantilla(st.jugadores).map((g) => `<div class="mc-grupo-t">${g.titulo}</div>` + g.jugadores.map((j) => {
    const f = j.ficha ?? {}; const pend = (st.pendientes.get(j.id)?.length ?? 0) > 0 || (j.id === st.sel && cambiosDe(f, st.borrador).length > 0);
    return `<button type="button" class="mc-fila" data-jug="${j.id}" aria-pressed="${j.id === st.sel}">${img(j.foto_url, 'mc-cara', f.nombre)}<span class="mc-num">${esc(valorActual(f, j.id === st.sel ? st.borrador : borradorDesde(st.pendientes.get(j.id)), 'dorsal') ?? '–')}</span><span class="min-w-0"><b class="block truncate text-sm text-white">${esc(f.nombre ?? 'Jugador ' + j.pid)}</b><small>${esc(f.posicion ?? '')} · ${esc(f.edad ?? '?')} años</small></span>${pend ? '<span class="mc-punto" title="Cambios pendientes"></span>' : ''}</button>`;
  }).join('')).join('');
}

const cambiado = (campo) => campo in st.borrador;
function campoNum(f, campo, etiqueta, min, max) {
  const dis = !esMio() || bloqueado(f, campo);
  return `<label class="mc-campo ${cambiado(campo) ? 'mc-cambiado' : ''}">${esc(etiqueta)}${bloqueado(f, campo) ? ' 🔒' : ''}<input type="number" inputmode="numeric" data-campo="${campo}" min="${min}" max="${max}" value="${esc(valorActual(f, st.borrador, campo) ?? '')}" ${dis ? 'disabled' : ''}></label>`;
}
function pintarDetalle() {
  const j = jugador(); const box = $('mc-detalle');
  if (!j) { box.innerHTML = '<p class="glass-panel rounded-2xl p-6 text-sm text-gray-300">Elige un jugador de la plantilla.</p>'; return; }
  const f = j.ficha ?? {}; const nCambios = cambiosDe(f, st.borrador).length; const rech = st.rechazados.get(j.id) ?? [];
  const posActual = valorActual(f, st.borrador, 'posicion');
  box.innerHTML = `<div class="glass-panel rounded-2xl p-4">
    <div class="flex items-center gap-3">${img(j.foto_url, 'mc-cara', f.nombre)}<div class="min-w-0"><h2 class="font-display font-bold text-white text-xl truncate">${esc(f.nombre ?? 'Jugador ' + j.pid)}</h2><p class="text-xs text-gray-400">${esc(f.nacionalidad ?? '')}</p></div></div>
    ${rech.length ? `<p class="mc-aviso mt-2"><i class="fa-solid fa-triangle-exclamation"></i> El juego rechazó: ${rech.map((r) => `${esc(r.campo)} (${esc(r.motivo_rechazo ?? 'sin motivo')})`).join(', ')}</p>` : ''}
    <div class="mc-bloque"><h3>Datos básicos</h3><div class="mc-basicos">
      ${BASICOS.map(([c, t, a, b]) => campoNum(f, c, t, a, b)).join('')}
      <label class="mc-campo ${cambiado('posicion') ? 'mc-cambiado' : ''}">Posición<select data-campo="posicion" ${!esMio() || bloqueado(f, 'posicion') ? 'disabled' : ''}>${POSICIONES.map((p) => `<option ${p === posActual ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    </div></div>
    <div class="mc-bloque"><h3>Habilidades</h3><div class="mc-habs">${HABILIDADES.filter(([c]) => leer(f, 'habilidades.' + c) != null).map(([c, t]) => fila(f, 'habilidades.' + c, t)).join('')}</div></div>
    <div class="mc-bloque"><h3>Posiciones jugables</h3>
      <div class="mc-cancha">${POSICIONES.map((p) => { const v = valorActual(f, st.borrador, 'posiciones.' + p) ?? 0; const [x, y] = XY[p]; const campo = 'posiciones.' + p;
        return `<button type="button" class="mc-pos ${cambiado(campo) ? 'mc-cambiado' : ''}" data-pos="${p}" data-v="${v}" style="left:${x}%;top:${y}%" aria-label="${p}: ${['no juega', 'juega bien', 'juega muy bien'][v]}" ${!esMio() || bloqueado(f, campo) ? 'disabled' : ''}>${p}</button>`; }).join('')}</div>
      <p class="mc-leyenda">Toca para cambiar: gris = no juega · azul = bien · verde = muy bien</p></div>
    ${f.portero ? `<div class="mc-bloque"><h3>Portero</h3><div class="mc-habs">${PORTERO.filter(([c]) => leer(f, 'portero.' + c) != null).map(([c, t]) => fila(f, 'portero.' + c, t)).join('')}</div></div>` : ''}
    ${f.liga_master ? `<div class="mc-bloque"><h3>Liga Máster</h3><div class="mc-basicos">${campoNum(f, 'liga_master.valor', 'Valor (€)', 0, 400000000)}${campoNum(f, 'liga_master.sueldo', 'Sueldo (€)', 0, 400000000)}
      ${leer(f, 'liga_master.fin_contrato') != null ? `<label class="mc-campo">Fin de contrato 🔒<input value="${esc(leer(f, 'liga_master.fin_contrato'))}" disabled></label>` : ''}</div></div>` : ''}
    ${esMio() ? `<div class="mc-barra-acciones"><span class="text-xs text-gray-300">${nCambios ? `<b class="text-amber-300">${nCambios}</b> cambio(s) sin guardar` : (st.pendientes.get(j.id)?.length ? `${st.pendientes.get(j.id).length} pendiente(s) de aplicar en tu juego` : 'Sin cambios')}</span>
      <span class="flex gap-2"><button type="button" class="btn btn-ghost" id="mc-volver" ${nCambios || st.pendientes.get(j.id)?.length ? '' : 'disabled'}>Volver a los datos del juego</button><button type="button" class="btn btn-primary" id="mc-guardar" ${nCambios && !st.guardando ? '' : 'disabled'}>Guardar cambios</button></span></div>` : ''}
  </div>`;
}
function fila(f, campo, titulo) {
  const v = valorActual(f, st.borrador, campo) ?? 0; const dis = !esMio() || bloqueado(f, campo);
  return `<div class="mc-hab ${cambiado(campo) ? 'mc-cambiado' : ''}"><span>${esc(titulo)}${bloqueado(f, campo) ? ' 🔒' : ''}</span><input type="number" inputmode="numeric" data-campo="${campo}" min="40" max="99" value="${esc(v)}" ${dis ? 'disabled' : ''} aria-label="${esc(titulo)}"><span class="mc-barra"><i style="width:${Math.max(0, Math.min(100, ((v - 40) / 59) * 100))}%;background:${colorHab(v)}"></i></span></div>`;
}

function poner(campo, crudo, el) {
  const j = jugador(); if (!j) return;
  const r = validarValor(campo, crudo);
  if (!r.ok) { toast(r.error, 'warn'); pintarDetalle(); return; }
  st.borrador = fijar(j.ficha, st.borrador, campo, r.valor);
  pintarDetalle(); pintarPlantilla();
  if (el?.dataset?.campo) document.querySelector(`[data-campo="${el.dataset.campo}"]`)?.focus();
}

async function guardar(vacio = false) {
  const j = jugador(); if (!j || st.guardando) return;
  const lista = vacio ? [] : cambiosDe(j.ficha, st.borrador);
  st.guardando = true; pintarDetalle();
  try {
    const { data, error } = await supabase.rpc('vestuario_guardar_cambios', { p_jugador: j.id, p_cambios: lista });
    if (error) throw error;
    toast(vacio ? 'Volviste a los datos del juego.' : `Guardado. ${data?.pendientes ?? lista.length} cambio(s) esperan a tu juego.`, 'ok');
    const { data: cs } = await supabase.from('vestuario_cambio').select('jugador_id, campo, valor, estado, motivo_rechazo, version').eq('jugador_id', j.id).eq('estado', 'pendiente');
    st.pendientes.set(j.id, cs ?? []); st.rechazados.delete(j.id); cargarBorrador();
  } catch (e) { console.error('[mi club]', e); toast(mensajeError(e), 'error'); }
  finally { st.guardando = false; pintarDetalle(); pintarPlantilla(); }
}

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-club], [data-jug], [data-pos], #mc-guardar, #mc-volver, #mc-refrescar'); if (!t || !$('mc-app')) return;
  if (t.dataset.club) { await abrirClub(Number(t.dataset.club)); return; }
  if (t.id === 'mc-refrescar') { await cargarClubes(); toast('Datos actualizados.', 'ok'); return; }
  if (t.dataset.jug) {
    const id = Number(t.dataset.jug); if (id === st.sel) return;
    if (esMio() && cambiosDe(jugador()?.ficha ?? {}, st.borrador).length && !(await confirmar('Tienes cambios sin guardar en este jugador. ¿Descartarlos?', { aceptar: 'Descartar', peligro: true }))) return;
    st.sel = id; cargarBorrador(); pintarPlantilla(); pintarDetalle(); return;
  }
  if (!esMio()) return;
  if (t.dataset.pos) { const c = 'posiciones.' + t.dataset.pos; poner(c, siguientePosicion(valorActual(jugador().ficha, st.borrador, c) ?? 0)); return; }
  if (t.id === 'mc-guardar') await guardar();
  if (t.id === 'mc-volver') { if (await confirmar('Se borran tus cambios y los pendientes de este jugador, y vuelve a los datos del juego.', { aceptar: 'Volver', peligro: true })) await guardar(true); }
});
document.addEventListener('change', (ev) => { const el = ev.target.closest('[data-campo]'); if (el && esMio()) poner(el.dataset.campo, el.value, el); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && st.yo && !st.guardando && !cambiosDe(jugador()?.ficha ?? {}, st.borrador).length) cargarClubes(); });

onSession((s) => {
  const id = s?.session?.user?.id ?? null; $('mc-sin-sesion').hidden = !!id;
  if (id === st.yo) return; st.yo = id;
  if (!id) { $('mc-app').hidden = true; $('mc-vacio').hidden = true; return; }
  cargarClubes();
});
