// Modo Mánager (Liga Máster web). Lee tablas lm_* (lectura pública) y escribe SOLO por RPC (migración 079).
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/dom.js';
import { haceCuanto } from '../core/notifs.js';

const $ = (id) => document.getElementById(id);
const LIGA = 'galaxy';
const plata = (n) => `€ ${Number(n || 0).toLocaleString('es-PE')}`;
const ERR = { YA_TIENES_CLUB: 'Ya tienes un club.', CLUB_OCUPADO: 'Ese club ya tiene DT.', CLUB_NO_DISPONIBLE: 'Ese club no está disponible.', VENTANA_CERRADA: 'La ventana de fichajes está cerrada.',
  PRESUPUESTO_INSUFICIENTE: 'No te alcanza el presupuesto.', OFERTA_BAJA: 'La oferta es menor al valor del jugador.', YA_OFERTASTE: 'Ya tienes una oferta pendiente por él.',
  PLANTILLA_LLENA: 'Plantilla llena (máx. 40). Libera o vende a un jugador antes de fichar.', JUGADOR_NO_DISPONIBLE: 'Ese jugador acaba de cambiar de club. Recarga.', NO_ES_CPU: 'Ese club tiene DT: hazle una oferta.', YA_ES_TUYO: 'Ya es tu jugador.', YA_NO_ES_TUYO: 'Ese jugador ya no está en tu club.', SIN_CLUB: 'Primero elige un club.' };
const msg = (e) => { const k = Object.keys(ERR).find((x) => String(e?.message).includes(x)); return k ? ERR[k] : (e?.message || 'Error'); };
let yo = null; let club = null; let cfg = null; let clubes = new Map();
const escudo = (c, cls = 'w-10 h-10') => safeUrl(c?.escudo_url) ? `<img src="${esc(safeUrl(c.escudo_url))}" alt="" class="${cls} object-contain">` : `<span class="${cls} rounded-full bg-galaxy-800 grid place-items-center text-galaxy-400"><i class="fa-solid fa-shield-halved"></i></span>`;
const LINEA = { PT: 'por', DEC: 'def', LD: 'def', LI: 'def', MCD: 'med', MC: 'med', MO: 'med', MD: 'med', MI: 'med', ED: 'del', EI: 'del', SD: 'del', DC: 'del' };
const LINEAS = [['por', 'Porteros'], ['def', 'Defensas'], ['med', 'Mediocampo'], ['del', 'Delanteros'], ['otros', 'Otros']];
const linea = (pos) => LINEA[String(pos ?? '').toUpperCase()] ?? 'otros';
const millones = (n) => { const v = Number(n || 0) / 1e6; return v >= 1 ? `€${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : plata(n); };
/** Tarjeta de jugador estilo carta: media grande, posición coloreada, nombre, edad y valor. */
const carta = (j, pie = '', extra = '') => `<article class="mg-carta" data-linea="${linea(j.posicion)}">
  <div class="mg-carta-top"><span class="mg-media">${j.media ?? '—'}</span><span class="mg-pos">${esc(j.posicion ?? '—')}</span></div>
  <p class="mg-nombre" title="${esc(j.nombre)}">${esc(j.nombre)}</p>
  <p class="mg-meta">${j.edad ? `${j.edad} años · ` : ''}<b>${millones(j.valor)}</b></p>${extra}
  ${pie ? `<div class="mg-carta-pie">${pie}</div>` : ''}</article>`;
const vacio = (icono, titulo, txt) => `<div class="mg-vacio"><i class="fa-solid ${icono}"></i><b>${titulo}</b><span>${txt}</span></div>`;
const nomClub = (id) => (id == null ? 'Agente libre' : esc(clubes.get(id)?.nombre ?? 'Club'));

async function cargarBase() {
  const [{ data: c }, { data: cl }] = await Promise.all([
    supabase.from('lm_config').select('*').eq('liga', LIGA).maybeSingle(),
    supabase.from('lm_clubes').select('id, nombre, escudo_url, aprobado, dueno, presupuesto').eq('liga', LIGA).order('nombre'),
  ]);
  cfg = c; clubes = new Map((cl ?? []).map((x) => [x.id, x])); club = (cl ?? []).find((x) => x.dueno === yo) ?? null;
}

let resumen = { n: 0, valor: 0, mediaXI: null };
function pintarCabecera() {
  const ventana = cfg?.ventana_abierta ? '<span class="mg-ventana abierta"><i class="fa-solid fa-door-open"></i> Ventana abierta</span>'
    : '<span class="mg-ventana"><i class="fa-solid fa-lock"></i> Ventana cerrada</span>';
  if (!club) { $('mg-club').innerHTML = `<div class="mt-1">${ventana}</div>`; return; }
  const stat = (lbl, val, ic) => `<div class="mg-stat"><i class="fa-solid ${ic}"></i><span><small>${lbl}</small><b>${val}</b></span></div>`;
  $('mg-club').innerHTML = `<div class="mg-club">
      <div class="mg-escudo">${escudo(club, 'w-16 h-16 sm:w-20 sm:h-20')}</div>
      <div class="min-w-0"><p class="mg-club-tit">${esc(club.nombre)}</p><p class="text-xs text-gray-400 flex items-center gap-2"><i class="fa-solid fa-user-tie text-galaxy-400"></i> Eres el DT · ${ventana}</p></div>
    </div>
    <div class="mg-stats">
      ${stat('Presupuesto', millones(club.presupuesto), 'fa-wallet')}
      ${stat('Valor plantilla', millones(resumen.valor), 'fa-chart-line')}
      ${stat('Media XI', resumen.mediaXI ?? '—', 'fa-star')}
      ${stat('Plantilla', `${resumen.n}/${cfg?.max_plantilla ?? 40}`, 'fa-people-group')}
    </div>`;
}

function pintarElegir() {
  const libres = [...clubes.values()].filter((c) => c.aprobado && !c.dueno);
  $('mg-clubes-libres').innerHTML = !libres.length ? vacio('fa-shield-halved', 'Aún no hay clubes disponibles', 'El staff los habilita al importar el option file oficial.')
    : libres.map((c) => `<button type="button" data-elegir="${c.id}" class="mg-club-op">${escudo(c, 'w-14 h-14')}<b>${esc(c.nombre)}</b><small>${millones(cfg?.presupuesto_inicial)} de presupuesto</small><span class="mg-club-op-cta">Dirigir este club <i class="fa-solid fa-arrow-right"></i></span></button>`).join('');
}

const fila = (j, acciones) => `<tr class="border-t border-galaxy-border/60"><td class="py-2 pr-2 text-galaxy-400 font-bold">${esc(j.posicion ?? '—')}</td><td class="pr-2 text-white">${esc(j.nombre)}</td>
  <td class="pr-2 text-center">${j.media ?? '—'}</td><td class="pr-2 text-center hidden sm:table-cell">${j.edad ?? '—'}</td><td class="pr-2 hidden md:table-cell text-gray-400">${acciones.club ?? ''}</td>
  <td class="pr-2 text-right">${plata(j.valor)}</td><td class="text-right">${acciones.btn}</td></tr>`;
const tabla = (filas, conClub = false) => `<div class="overflow-x-auto"><table class="w-full text-xs"><thead class="text-[11px] text-gray-500 uppercase tracking-wider"><tr><th class="text-left">Pos</th><th class="text-left">Jugador</th><th>Media</th><th class="hidden sm:table-cell">Edad</th><th class="hidden md:table-cell text-left">${conClub ? 'Club' : ''}</th><th class="text-right">Valor</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;

async function pintarPlantilla() {
  const { data, error } = await supabase.from('lm_jugadores').select('id, nombre, posicion, media, edad, valor').eq('club_id', club.id).order('media', { ascending: false });
  if (error) { $('mg-plantilla').innerHTML = vacio('fa-triangle-exclamation', 'No se pudo cargar la plantilla', 'Recarga la página.'); return; }
  const xi = data.slice(0, 11);
  resumen = { n: data.length, valor: data.reduce((s, j) => s + Number(j.valor || 0), 0), mediaXI: xi.length ? Math.round(xi.reduce((s, j) => s + (j.media || 0), 0) / xi.length) : null };
  pintarCabecera();
  if (!data.length) { $('mg-plantilla').innerHTML = vacio('fa-people-group', 'Tu plantilla está vacía', 'Ficha jugadores en el Mercado.'); return; }
  const off = cfg.ventana_abierta ? '' : 'disabled';
  const btn = (j) => `<div class="mg-acciones"><button type="button" class="mg-mini" data-vender="${j.id}" data-nombre="${esc(j.nombre)}" data-valor="${j.valor}" ${off} title="Vender a un club CPU por su valor"><i class="fa-solid fa-hand-holding-dollar"></i></button><button type="button" class="mg-mini" data-liberar="${j.id}" ${off} title="Liberar (queda agente libre)"><i class="fa-solid fa-user-minus"></i></button></div>`;
  $('mg-plantilla').innerHTML = LINEAS.map(([id, t]) => { const g = data.filter((j) => linea(j.posicion) === id); return g.length ? `<div class="mg-linea" data-linea="${id}">
      <h3 class="mg-linea-tit"><span></span>${t} <small>${g.length}</small></h3><div class="mg-grid">${g.map((j) => carta(j, btn(j))).join('')}</div></div>` : ''; }).join('');
}

let tBuscar = null;
async function pintarMercado() {
  const q = $('mg-buscar').value.trim(); const pos = $('mg-pos').value; const libres = $('mg-libres').checked;
  let s = supabase.from('lm_jugadores').select('id, nombre, posicion, media, edad, valor, club_id').eq('liga', LIGA).order('media', { ascending: false }).limit(60);
  if (q) s = s.ilike('nombre', `%${q.replace(/[%_]/g, '')}%`);
  if (pos) s = s.eq('posicion', pos);
  if (libres) s = s.is('club_id', null); else if (club) s = s.neq('club_id', club.id);
  const { data, error } = await s;
  if (error) { $('mg-mercado').textContent = 'No se pudo buscar.'; return; }
  const lista = data.filter((j) => j.club_id !== club?.id);
  $('mg-mercado').innerHTML = !lista.length ? vacio('fa-magnifying-glass', 'Sin resultados', 'Prueba con otro nombre o posición.')
    : `<div class="mg-grid">${lista.map((j) => { const vend = clubes.get(j.club_id); const directo = !vend || !vend.dueno;
      const origen = `<p class="mg-club-chip">${vend ? `${escudo(vend, 'w-4 h-4')} ${esc(vend.nombre)}${vend.dueno ? ' <i class="fa-solid fa-user-tie text-galaxy-400" title="Club de otro DT"></i>' : ''}` : '<i class="fa-solid fa-unlock text-emerald-300"></i> Agente libre'}</p>`;
      return carta(j, `<button type="button" class="btn ${directo ? 'btn-primary' : ''} !min-h-8 !text-[11px] w-full" data-ofertar="${j.id}" data-valor="${j.valor}" data-directo="${directo ? 1 : 0}" data-nombre="${esc(j.nombre)}" ${cfg.ventana_abierta ? '' : 'disabled'}>${directo ? '<i class="fa-solid fa-signature"></i> Fichar' : '<i class="fa-solid fa-hand-holding-dollar"></i> Ofertar'}</button>`, origen); }).join('')}</div>`;
}

async function pintarOficina() {
  const { data, error } = await supabase.from('lm_ofertas').select('id, jugador_id, club_comprador, club_vendedor, monto, estado, mensaje, created_at').or(`club_comprador.eq.${club.id},club_vendedor.eq.${club.id}`).order('created_at', { ascending: false }).limit(40);
  if (error) { $('mg-recibidas').textContent = 'No se pudo cargar.'; return; }
  const ids = [...new Set(data.map((o) => o.jugador_id))];
  const { data: js } = ids.length ? await supabase.from('lm_jugadores').select('id, nombre').in('id', ids) : { data: [] };
  const nj = (id) => esc((js ?? []).find((x) => x.id === id)?.nombre ?? 'Jugador');
  const item = (o, btns) => `<div class="mg-oferta" data-estado="${esc(o.estado)}"><div class="flex items-start gap-3">
      <span class="mg-oferta-ic"><i class="fa-solid ${o.club_vendedor === club.id ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></span>
      <div class="flex-1 min-w-0"><p class="text-white font-bold truncate">${nj(o.jugador_id)}</p>
        <p class="text-[11px] text-gray-400">${o.club_vendedor === club.id ? 'Oferta de ' + nomClub(o.club_comprador) : 'Para ' + nomClub(o.club_vendedor)} · ${esc(haceCuanto(o.created_at) ?? '')}</p>
        ${o.mensaje ? `<p class="text-[11px] text-gray-300 italic mt-1">«${esc(o.mensaje)}»</p>` : ''}</div>
      <div class="text-right"><p class="mg-monto">${millones(o.monto)}</p><span class="mg-estado">${esc(o.estado)}</span></div></div>
      ${btns ? `<div class="flex gap-2 mt-2 justify-end">${btns}</div>` : ''}</div>`;
  const rec = data.filter((o) => o.club_vendedor === club.id); const env = data.filter((o) => o.club_comprador === club.id);
  $('mg-recibidas').innerHTML = rec.length ? rec.map((o) => item(o, o.estado === 'pendiente' ? `<button type="button" class="btn btn-primary !min-h-7 !text-[11px]" data-responder="${o.id}" data-si="1">Aceptar</button><button type="button" class="btn !min-h-7 !text-[11px]" data-responder="${o.id}" data-si="0">Rechazar</button>` : '')).join('') : vacio('fa-inbox', 'Sin ofertas recibidas', 'Cuando otro DT quiera a tus jugadores, aparecerá aquí.');
  $('mg-enviadas').innerHTML = env.length ? env.map((o) => item(o, o.estado === 'pendiente' ? `<button type="button" class="btn !min-h-7 !text-[11px]" data-cancelar="${o.id}">Cancelar</button>` : '')).join('') : vacio('fa-paper-plane', 'Sin ofertas enviadas', 'Busca jugadores de otros DT en el Mercado.');
}

async function pintarMovimientos() {
  const { data, error } = await supabase.from('lm_movimientos').select('id, jugador_id, de_club, a_club, monto, tipo, aplicado_en, created_at').eq('liga', LIGA).order('created_at', { ascending: false }).limit(40);
  if (error) { $('mg-movs').textContent = 'No se pudo cargar.'; return; }
  const ids = [...new Set(data.map((m) => m.jugador_id))];
  const { data: js } = ids.length ? await supabase.from('lm_jugadores').select('id, nombre').in('id', ids) : { data: [] };
  const nj = (id) => esc((js ?? []).find((x) => x.id === id)?.nombre ?? 'Jugador');
  const TIPO = { compra: ['fa-right-left', 'Traspaso'], libre: ['fa-signature', 'Fichaje libre'], liberado: ['fa-user-minus', 'Liberado'], staff: ['fa-shield-halved', 'Staff'] };
  $('mg-movs').innerHTML = !data.length ? vacio('fa-right-left', 'Aún no hubo fichajes', 'El primer movimiento de la ventana aparecerá aquí.')
    : `<ol class="mg-timeline">${data.map((m) => { const [ic, t] = TIPO[m.tipo] ?? TIPO.staff; return `<li>
        <span class="mg-tl-ic"><i class="fa-solid ${ic}"></i></span>
        <div class="flex-1 min-w-0"><p><b class="text-white">${nj(m.jugador_id)}</b> <span class="text-[11px] text-gray-500 uppercase tracking-wider ml-1">${t}</span></p>
          <p class="text-xs text-gray-400">${nomClub(m.de_club)} <i class="fa-solid fa-arrow-right text-[10px] mx-1 text-galaxy-400"></i> <span class="text-gray-200">${nomClub(m.a_club)}</span></p></div>
        <div class="text-right shrink-0">${m.monto ? `<p class="mg-monto">${millones(m.monto)}</p>` : ''}<p class="text-[11px] text-gray-500">${m.aplicado_en ? '<i class="fa-solid fa-gamepad text-emerald-400" title="Ya está en el juego"></i>' : '<i class="fa-regular fa-clock" title="Llega al juego al cerrar la ventana"></i>'} ${esc(haceCuanto(m.created_at) ?? '')}</p></div></li>`; }).join('')}</ol>`;
}

// ── Staff: centro de control (autoguardado) ──
let tGuardar = null; let filtroClub = '';
const avisoGuardado = (estado) => { const el = $('mg-guardado'); if (!el) return;
  el.dataset.estado = estado; el.innerHTML = estado === 'guardando' ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando…' : estado === 'ok' ? '<i class="fa-solid fa-check"></i> Guardado' : '<i class="fa-solid fa-triangle-exclamation"></i> No se guardó';
  if (estado === 'ok') setTimeout(() => { if (el.dataset.estado === 'ok') el.innerHTML = ''; }, 1800); };
async function guardarCfg() {
  avisoGuardado('guardando');
  try { await rpc('lm_staff_config', { p_liga: LIGA, p_ventana: cfg.ventana_abierta, p_presupuesto: cfg.presupuesto_inicial, p_max: cfg.max_plantilla }); avisoGuardado('ok'); pintarCabecera(); }
  catch (e) { avisoGuardado('error'); toast(msg(e), 'error'); }
}
const guardarPronto = () => { clearTimeout(tGuardar); tGuardar = setTimeout(guardarCfg, 500); };
function pintarControles() {
  $('mg-c-ventana').checked = !!cfg?.ventana_abierta;
  $('mg-c-ventana-txt').textContent = cfg?.ventana_abierta ? 'Abierta: los DT pueden fichar y vender' : 'Cerrada: nadie puede fichar';
  $('mg-c-ventana').closest('.mg-ctrl').classList.toggle('activo', !!cfg?.ventana_abierta);
  $('mg-exigir').checked = !!cfg?.exigir_codigo_manager;
  $('mg-c-presu').value = cfg?.presupuesto_inicial ?? 50e6; $('mg-c-presu-v').textContent = millones(cfg?.presupuesto_inicial);
  document.querySelectorAll('[data-presu]').forEach((b) => b.classList.toggle('activo', Number(b.dataset.presu) === Number(cfg?.presupuesto_inicial)));
  $('mg-c-max').textContent = cfg?.max_plantilla ?? 40;
}
function pintarClubesStaff() {
  const lista = [...clubes.values()]; const q = filtroClub.toLowerCase();
  const ap = lista.filter((c) => c.aprobado).length; const dts = lista.filter((c) => c.dueno).length;
  $('mg-c-resumen').innerHTML = `<b class="text-white">${ap}</b>/${lista.length} aprobados · <b class="text-galaxy-400">${dts}</b> con DT`;
  const vis = lista.filter((c) => !q || c.nombre.toLowerCase().includes(q));
  $('mg-staff-clubes').innerHTML = !lista.length ? vacio('fa-file-import', 'Sin clubes todavía', 'Importa el catálogo para verlos aquí.')
    : !vis.length ? '<p class="text-xs text-gray-500 col-span-full">Ningún club coincide.</p>'
    : vis.map((c) => `<label class="mg-club-t ${c.aprobado ? 'activo' : ''}">${escudo(c, 'w-8 h-8')}<span class="flex-1 min-w-0"><b>${esc(c.nombre)}</b><small>${c.dueno ? '<i class="fa-solid fa-user-tie"></i> Tiene DT · ' + millones(c.presupuesto) : c.aprobado ? '<i class="fa-solid fa-microchip"></i> CPU · sin DT' : 'No participa'}</small></span>
        <input type="checkbox" class="mg-switch" data-aprobar-club="${c.id}" ${c.aprobado ? 'checked' : ''}></label>`).join('');
}
function pintarStaff() { pintarControles(); pintarClubesStaff(); }

// Vista previa del catálogo antes de importar
let catalogoPendiente = null;
async function prepararCatalogo(file) {
  try {
    const datos = JSON.parse(await file.text());
    if (!Array.isArray(datos.equipos) || !Array.isArray(datos.jugadores)) throw new Error('Falta «equipos» o «jugadores».');
    catalogoPendiente = datos;
    const sinId = datos.jugadores.filter((j) => j.pes_id == null || !j.nombre).length;
    const muestra = datos.jugadores.slice(0, 6).map((j) => `<span class="mg-chip">${esc(j.nombre ?? '?')} <small class="text-gray-500">${esc(j.posicion ?? '')}</small></span>`).join('');
    $('mg-prev').hidden = false;
    $('mg-prev').innerHTML = `<div class="flex flex-wrap items-center gap-3"><i class="fa-solid fa-file-circle-check text-emerald-300 text-xl"></i>
      <span class="flex-1"><b class="text-white">${esc(file.name)}</b><br><span class="text-xs text-gray-400">${datos.equipos.length} equipos · ${datos.jugadores.length} jugadores${sinId ? ` · <span class="text-amber-300">${sinId} sin pes_id o nombre (se ignorarán o fallarán)</span>` : ''}</span></span>
      <button type="button" class="btn btn-primary !min-h-9 !text-xs" id="mg-importar"><i class="fa-solid fa-upload"></i> Importar</button><button type="button" class="btn btn-ghost !min-h-9 !text-xs" id="mg-cancelar-imp">Cancelar</button></div>
      <div class="flex flex-wrap gap-1.5 mt-3">${muestra}${datos.jugadores.length > 6 ? `<span class="text-xs text-gray-500 self-center">y ${datos.jugadores.length - 6} más…</span>` : ''}</div>`;
  } catch (e) { catalogoPendiente = null; $('mg-prev').hidden = true; toast(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : e.message, 'error'); }
}

// ── Tabs ──
function mostrarTab(id) {
  document.querySelectorAll('[data-tab]').forEach((a) => { if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== id; });
  ({ plantilla: pintarPlantilla, mercado: pintarMercado, oficina: pintarOficina, movimientos: pintarMovimientos })[id]?.();
}
const tabActual = () => (['plantilla', 'mercado', 'oficina', 'movimientos'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'plantilla');
window.addEventListener('hashchange', () => club && mostrarTab(tabActual()));

async function refrescar() {
  try { await cargarBase(); } catch (e) { console.error('[manager]', e); toast('No se pudo cargar el Modo Mánager.', 'error'); return; }
  $('mg-sin-sesion').hidden = !!yo; $('mg-elegir').hidden = !yo || !!club; $('mg-panel').hidden = !club;
  pintarCabecera(); if (yo && !club) pintarElegir();
  if (club) { if (tabActual() !== 'plantilla') pintarPlantilla(); mostrarTab(tabActual()); }   // la plantilla alimenta las cifras de la cabecera
  $('mg-staff').hidden = !(yo && can('resolverReportes')); if (!$('mg-staff').hidden) pintarStaff();
}

const rpc = async (fn, args) => { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; };
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-elegir],[data-vender],[data-liberar],[data-ofertar],[data-responder],[data-cancelar],#mg-dejar'); if (!b || b.disabled) return;
  b.disabled = true;
  try {
    if (b.dataset.elegir) { const c = clubes.get(Number(b.dataset.elegir)); if (!(await confirmar(`¿Ser el DT de ${c?.nombre}? Recibirás ${plata(cfg?.presupuesto_inicial)} de presupuesto.`))) return; await rpc('lm_activar', { p_club: c.id }); toast('¡Bienvenido a tu club, mánager!', 'ok'); await refrescar(); }
    else if (b.id === 'mg-dejar') { if (!(await confirmar('¿Dejar tu club? Vuelve a la IA y tus ofertas pendientes se cancelan.', { peligro: true }))) return; await rpc('lm_abandonar'); toast('Dejaste tu club.', 'ok'); await refrescar(); }
    else if (b.dataset.vender) {
      const cpus = [...clubes.values()].filter((c) => c.aprobado && !c.dueno);
      if (!cpus.length) { toast('No hay clubes CPU aprobados.', 'warn'); return; }
      const lista = cpus.map((c, i) => `${i + 1}. ${c.nombre}`).join('\n');
      const t = prompt(`¿A qué club CPU vendes a ${b.dataset.nombre} por ${millones(b.dataset.valor)}? Escribe el número:\n\n${lista}`); if (t === null) return;
      const c = cpus[Number(t) - 1]; if (!c) { toast('Número no válido.', 'warn'); return; }
      const r = await rpc('lm_vender_cpu', { p_jugador: Number(b.dataset.vender), p_club_cpu: c.id }); toast(`Vendido a ${r.club} por ${millones(r.monto)}.`, 'ok'); await refrescar();
    }
    else if (b.dataset.liberar) { if (!(await confirmar('¿Liberar a este jugador? Quedará como agente libre, sin cobro.', { peligro: true }))) return; await rpc('lm_liberar', { p_jugador: Number(b.dataset.liberar) }); toast('Jugador liberado.', 'ok'); await refrescar(); }
    else if (b.dataset.ofertar) {
      const directo = b.dataset.directo === '1'; const valor = Number(b.dataset.valor);
      let monto = valor;
      if (directo) { if (!(await confirmar(`¿Fichar a ${b.dataset.nombre} por ${plata(valor)}?`))) return; }
      else { const t = prompt(`¿Cuánto ofreces por ${b.dataset.nombre}? (valor ${plata(valor)})`, String(valor)); if (t === null) return; monto = Math.round(Number(String(t).replace(/[^\d]/g, ''))); if (!monto && monto !== 0) return; }
      const r = await rpc('lm_ofertar', { p_jugador: Number(b.dataset.ofertar), p_monto: monto });
      toast(r?.estado === 'cerrada' ? `¡Fichaje cerrado por ${plata(r.monto)}!` : 'Oferta enviada. Te avisaremos cuando respondan.', 'ok'); await refrescar();
    }
    else if (b.dataset.responder) { await rpc('lm_responder', { p_oferta: Number(b.dataset.responder), p_aceptar: b.dataset.si === '1' }); toast(b.dataset.si === '1' ? 'Traspaso cerrado.' : 'Oferta rechazada.', 'ok'); await refrescar(); }
    else if (b.dataset.cancelar) { await rpc('lm_cancelar_oferta', { p_oferta: Number(b.dataset.cancelar) }); toast('Oferta cancelada.', 'ok'); pintarOficina(); }
  } catch (e) { console.error('[manager]', e); toast(msg(e), 'error'); }
  finally { b.disabled = false; }
});
document.addEventListener('change', async (ev) => {
  const c = ev.target.closest('[data-aprobar-club]');
  if (c) { try { await rpc('lm_staff_club', { p_id: Number(c.dataset.aprobarClub), p_aprobado: c.checked }); clubes.get(Number(c.dataset.aprobarClub)).aprobado = c.checked; pintarClubesStaff(); avisoGuardado('ok'); } catch (e) { c.checked = !c.checked; avisoGuardado('error'); toast(msg(e), 'error'); } }
  if (ev.target.id === 'mg-exigir') {
    avisoGuardado('guardando');
    try { await rpc('lm_staff_exigir_codigo', { p_liga: LIGA, p_exigir: ev.target.checked }); cfg.exigir_codigo_manager = ev.target.checked; avisoGuardado('ok'); }
    catch (e) { ev.target.checked = !ev.target.checked; avisoGuardado('error'); toast(msg(e), 'error'); }
  }
  if (ev.target.id === 'mg-c-ventana') { cfg.ventana_abierta = ev.target.checked; pintarControles(); guardarCfg(); }
  if (ev.target.id === 'mg-json') { const f = ev.target.files?.[0]; if (f) prepararCatalogo(f); ev.target.value = ''; }
  if (['mg-pos', 'mg-libres'].includes(ev.target.id)) pintarMercado();
});
$('mg-buscar').addEventListener('input', () => { clearTimeout(tBuscar); tBuscar = setTimeout(pintarMercado, 300); });
// Staff: controles con autoguardado
$('mg-c-presu')?.addEventListener('input', (e) => { cfg.presupuesto_inicial = Number(e.target.value); pintarControles(); guardarPronto(); });
$('mg-c-buscar')?.addEventListener('input', (e) => { filtroClub = e.target.value; pintarClubesStaff(); });
const drop = $('mg-drop');
if (drop) {
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('encima')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) prepararCatalogo(f); });
}
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-presu],[data-max],[data-todos],#mg-importar,#mg-cancelar-imp'); if (!t) return;
  if (t.dataset.presu) { cfg.presupuesto_inicial = Number(t.dataset.presu); pintarControles(); guardarPronto(); }
  else if (t.dataset.max) { cfg.max_plantilla = Math.min(60, Math.max(11, (cfg.max_plantilla ?? 40) + Number(t.dataset.max))); pintarControles(); guardarPronto(); }
  else if (t.dataset.todos) {
    const si = t.dataset.todos === '1'; const lista = [...clubes.values()].filter((c) => c.aprobado !== si && (!c.dueno || si));
    if (!lista.length) return; if (!(await confirmar(`¿${si ? 'Aprobar' : 'Quitar'} ${lista.length} club(es)?${si ? '' : ' Los clubes con DT se mantienen.'}`))) return;
    avisoGuardado('guardando');
    try { for (const c of lista) { await rpc('lm_staff_club', { p_id: c.id, p_aprobado: si }); c.aprobado = si; } avisoGuardado('ok'); pintarClubesStaff(); }
    catch (e) { avisoGuardado('error'); toast(msg(e), 'error'); pintarClubesStaff(); }
  }
  else if (t.id === 'mg-cancelar-imp') { catalogoPendiente = null; $('mg-prev').hidden = true; }
  else if (t.id === 'mg-importar' && catalogoPendiente) {
    t.disabled = true; t.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Importando…';
    try { const r = await rpc('lm_importar', { p_liga: LIGA, p_datos: catalogoPendiente }); toast(`Importados: ${r.equipos} equipos y ${r.jugadores} jugadores.`, 'ok'); catalogoPendiente = null; $('mg-prev').hidden = true; await refrescar(); }
    catch (e) { toast(msg(e), 'error'); t.disabled = false; t.textContent = 'Reintentar'; }
  }
});

onSession((st) => { yo = st?.session?.user?.id ?? null; refrescar(); });
