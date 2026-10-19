// Modo Mánager (Liga Máster web). Lee tablas lm_* (lectura pública) y escribe SOLO por RPC (migración 079).
import { supabase } from '../core/sistema/supabase.js';
import { onSession, can } from '../core/sistema/session.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar, elegir, pedirTexto } from '../core/sistema/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { haceCuanto } from '../core/sistema/notifs.js';
import { href } from '../core/sistema/config.js';
import { montarFotos } from '../features/fotoFutbolista.js';
import { abrirFichaJugador } from '../features/fichaJugadorModal.js';
import { avatarHTML } from '../core/sistema/avatar.js';
import { FX } from '../../data/experimento.js';
import { CLUBES_PES } from '../../data/clubesPes.js';
import { emparejarClubesLm, escudoUrl } from '../core/pes/clubesPes.js';

const $ = (id) => document.getElementById(id);
const LIGA = 'galaxy';
const plata = (n) => `€ ${Number(n || 0).toLocaleString('es-PE')}`;
const ERR = { YA_TIENES_CLUB: 'Ya tienes un club.', CLUB_OCUPADO: 'Ese club ya tiene DT.', CLUB_NO_DISPONIBLE: 'Ese club no está disponible.', VENTANA_CERRADA: 'La ventana de fichajes está cerrada.',
  PRESUPUESTO_INSUFICIENTE: 'No te alcanza el presupuesto.', OFERTA_BAJA: 'La oferta es menor al valor del jugador.', YA_OFERTASTE: 'Ya tienes una oferta pendiente por él.',
  PLANTILLA_LLENA: 'Plantilla llena (máx. 40). Libera o vende a un jugador antes de fichar.', JUGADOR_NO_DISPONIBLE: 'Ese jugador acaba de cambiar de club. Recarga.', NO_ES_CPU: 'Ese club tiene DT: hazle una oferta.', YA_ES_TUYO: 'Ya es tu jugador.', YA_NO_ES_TUYO: 'Ese jugador ya no está en tu club.', YA_REVERTIDO: 'Ese movimiento ya fue revertido.', JUGADOR_YA_CAMBIO: 'El jugador ya cambió de club después; no se puede revertir.', SIN_CLUB: 'Primero elige un club.' };
const msg = (e) => { const k = Object.keys(ERR).find((x) => String(e?.message).includes(x)); return k ? ERR[k] : (e?.message || 'Error'); };
let yo = null; let club = null; let cfg = null; let clubes = new Map(); let dts = new Map();   // dts: perfil de cada DT dueño de un club
const escudo = (c, cls = 'w-10 h-10') => safeUrl(c?.escudo_url) ? `<img src="${esc(safeUrl(c.escudo_url))}" alt="" class="${cls} object-contain">` : `<span class="${cls} rounded-full bg-galaxy-800 grid place-items-center text-galaxy-400"><i class="fa-solid fa-shield-halved"></i></span>`;
const LINEA = { PT: 'por', DEC: 'def', LD: 'def', LI: 'def', MCD: 'med', MC: 'med', MO: 'med', MD: 'med', MI: 'med', ED: 'del', EI: 'del', SD: 'del', DC: 'del' };
const LINEAS = [['por', 'Porteros'], ['def', 'Defensas'], ['med', 'Mediocampo'], ['del', 'Delanteros'], ['otros', 'Otros']];
const linea = (pos) => LINEA[String(pos ?? '').toUpperCase()] ?? 'otros';
const millones = (n) => { const v = Number(n || 0) / 1e6; return v >= 1 ? `€${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : plata(n); };
/** Tarjeta de jugador estilo carta: media grande, posición coloreada, nombre, edad y valor. */
const filas = new Map();   // id del jugador → fila de lm_jugadores tal como se pintó (la usa la ficha rápida al pulsar la carta)
const carta = (j, pie = '', extra = '') => { filas.set(j.id, j); return `<article class="mg-carta" data-ficha data-jid="${j.id}" data-linea="${linea(j.posicion)}"${clubes.get(j.club_id)?.dueno ? ` data-dueno-carta="${esc(clubes.get(j.club_id).dueno)}"` : ''}>
  <button type="button" class="mg-ver" aria-label="Ver la ficha rápida de ${esc(j.nombre)}" title="Ver su ficha rápida"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
  <div class="mg-carta-top"><span class="mg-media">${j.media ?? '—'}</span><span class="mg-pos">${esc(j.posicion ?? '—')}</span></div>
  <span class="mg-foto" data-foto="${esc(j.nombre)}" data-pes="${j.pes_id ?? ''}" data-club="${esc(clubes.get(j.club_id)?.nombre ?? '')}" aria-hidden="true"><i class="fa-solid fa-user"></i></span>
  <a class="mg-nombre" title="Ver la ficha de ${esc(j.nombre)}" href="${href(`futbolista/?id=${j.id}`)}">${esc(j.nombre)}</a>
  <p class="mg-meta">${j.edad ? `${j.edad} años · ` : ''}<b>${millones(j.valor)}</b></p>${extra}
  ${pie ? `<div class="mg-carta-pie">${pie}</div>` : ''}</article>`; };
// Pulsar una carta (menos sus botones y enlaces) abre la ficha rápida con todo lo del juego; las flechas pasan al jugador anterior o siguiente de esa lista.
// Las fichas de la vista Cancha (botones .mcx-ficha) también la abren.
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-ficha][data-jid]'); if (!c) return;
  const otro = e.target.closest('a, button'); if (otro && otro !== c && !otro.classList.contains('mg-ver')) return;
  const lista = [...c.closest('#mg-plantilla, #mg-mercado, body').querySelectorAll('[data-ficha][data-jid]')].map((x) => filas.get(Number(x.dataset.jid))).filter(Boolean);
  const indice = lista.findIndex((j) => j.id === Number(c.dataset.jid));
  if (indice >= 0) abrirFichaJugador({ lista, indice, clubDe: (j) => (j.club_id === undefined ? club : clubes.get(j.club_id)) ?? null });
});
const vacio = (icono, titulo, txt) => `<div class="mg-vacio"><i class="fa-solid ${icono}"></i><b>${titulo}</b><span>${txt}</span></div>`;
const nomClub = (id) => (id == null ? 'Agente libre' : esc(clubes.get(id)?.nombre ?? 'Club'));

async function cargarBase() {
  const [{ data: c }, { data: cl }] = await Promise.all([
    supabase.from('lm_config').select('*').eq('liga', LIGA).maybeSingle(),
    supabase.from('lm_clubes').select('id, nombre, escudo_url, aprobado, dueno, presupuesto').eq('liga', LIGA).order('nombre'),
  ]);
  cfg = c; clubes = new Map((cl ?? []).map((x) => [x.id, x])); club = yo ? (cl ?? []).find((x) => x.dueno === yo) ?? null : null;   // sin sesión no hay club (antes «dueno === null» encontraba un club de la IA como si fuera tuyo)
  const ids = [...new Set((cl ?? []).map((x) => x.dueno).filter(Boolean))];
  if (ids.length) { const { data: pf } = await supabase.from('perfiles').select('id, username, nombre_display, avatar_url').in('id', ids); dts = new Map((pf ?? []).map((p) => [p.id, p])); }
}
/** DT dueño del club, sutil: su foto pequeña y su nombre (ronda 291, pedido de Fralex). */
const dtHTML = (c) => { const p = c?.dueno && dts.get(c.dueno); if (!p) return c?.dueno ? '<p class="mg-dt"><i class="fa-solid fa-user-tie"></i><span>DT de la liga</span></p>' : '';
  const nom = p.nombre_display || p.username || 'DT'; const url = p.username ? href(`perfil/?u=${encodeURIComponent(p.username)}`) : null;
  const dentro = `<span class="mg-dt-av">${avatarHTML(p.avatar_url, nom, 18)}</span><span>${esc(nom)}</span>`;
  return `<p class="mg-dt" title="Este jugador es del club de ${esc(nom)}">${url ? `<a href="${esc(url)}">${dentro}</a>` : dentro}</p>`; };

let resumen = { n: 0, valor: 0, mediaXI: null };
function pintarCabecera() {
  const ventana = cfg?.ventana_abierta ? '<span class="mg-ventana abierta"><i class="fa-solid fa-door-open"></i> Ventana abierta</span>'
    : '<span class="mg-ventana"><i class="fa-solid fa-lock"></i> Ventana cerrada</span>';
  const chip = $('lmg-ventana');
  if (chip) { chip.dataset.abierta = cfg?.ventana_abierta ? '1' : '0'; chip.querySelector('b').textContent = cfg?.ventana_abierta ? 'Ventana de fichajes abierta' : 'Ventana cerrada'; }
  if (!club) { $('mg-club').innerHTML = chip ? '' : `<div class="mt-1">${ventana}</div>`; return; }
  const stat = (lbl, val, ic) => `<div class="mg-stat"><i class="fa-solid ${ic}"></i><span><small>${lbl}</small><b>${val}</b></span></div>`;
  const local = escudoLocal(club);   // 19-oct-2026: el escudo del catálogo (alta calidad y mismo origen: el estadio toma su color)
  $('mg-club').innerHTML = `<div class="mg-club mcx-club">
      <div class="mg-escudo mcx-escudo">${local ? `<img src="${esc(local)}" alt="" class="w-16 h-16 sm:w-20 sm:h-20 object-contain" data-mcx-escudo>` : escudo(club, 'w-16 h-16 sm:w-20 sm:h-20')}</div>
      <div class="min-w-0"><p class="mg-club-tit">${esc(club.nombre)}</p><p class="text-xs text-gray-400 flex items-center gap-2"><i class="fa-solid fa-user-tie text-galaxy-400"></i> Eres el DT${chip ? '' : ` · ${ventana}`}</p></div>
    </div>
    <div class="mg-stats">
      ${stat('Presupuesto', millones(club.presupuesto), 'fa-wallet')}
      ${stat('Valor plantilla', millones(resumen.valor), 'fa-chart-line')}
      ${stat('Media XI', resumen.mediaXI ?? '—', 'fa-star')}
      ${stat('Plantilla', `${resumen.n}/${cfg?.max_plantilla ?? 40}`, 'fa-people-group')}
    </div>`;
  if (tabActual() === 'resumen') pintarResumen();
}
const escudoLocal = (c) => { const [idCat] = [...emparejarClubesLm([{ id: c.id, nombre: c.nombre }], CLUBES_PES).keys()]; const cat = CLUBES_PES.find((x) => x.id === idCat); return cat ? escudoUrl(cat) : null; };

function pintarElegir() {
  const libres = [...clubes.values()].filter((c) => c.aprobado && !c.dueno);
  $('mg-clubes-libres').innerHTML = !libres.length ? vacio('fa-shield-halved', 'Aún no hay clubes disponibles', 'El staff los habilita al importar el option file oficial.')
    : libres.map((c) => `<button type="button" data-elegir="${c.id}" class="mg-club-op">${FX.ligaMasterGalaxia ? '<span class="lmg-anillo" aria-hidden="true"></span>' : ''}${escudo(c, 'w-14 h-14')}<b>${esc(c.nombre)}</b><small>${millones(cfg?.presupuesto_inicial)} de presupuesto</small>${FX.ligaMasterGalaxia ? `<span class="lmg-plantel" data-plantel="${c.id}"></span>` : ''}<span class="mg-club-op-cta">Dirigir este club <i class="fa-solid fa-arrow-right"></i></span></button>`).join('');
  if (FX.ligaMasterGalaxia && libres.length) pintarPlanteles(libres.map((c) => c.id));
}
// Ronda 279: cuántos jugadores tiene cada club libre y su mejor media (ayuda a elegir).
async function pintarPlanteles(ids) {
  const { data } = await supabase.from('lm_jugadores').select('club_id, media').in('club_id', ids);
  const por = new Map(); (data ?? []).forEach((j) => { const x = por.get(j.club_id) ?? { n: 0, top: 0 }; x.n += 1; x.top = Math.max(x.top, j.media ?? 0); por.set(j.club_id, x); });
  document.querySelectorAll('[data-plantel]').forEach((el) => { const x = por.get(Number(el.dataset.plantel)); el.innerHTML = x ? `<i class="fa-solid fa-people-group"></i>${x.n} ${x.n === 1 ? 'jugador' : 'jugadores'} · <b>${x.top}</b> mejor media` : '<i class="fa-solid fa-people-group"></i>Plantilla por armar'; });
}

const fila = (j, acciones) => `<tr class="border-t border-galaxy-border/60"><td class="py-2 pr-2 text-galaxy-400 font-bold">${esc(j.posicion ?? '—')}</td><td class="pr-2 text-white">${esc(j.nombre)}</td>
  <td class="pr-2 text-center">${j.media ?? '—'}</td><td class="pr-2 text-center hidden sm:table-cell">${j.edad ?? '—'}</td><td class="pr-2 hidden md:table-cell text-gray-400">${acciones.club ?? ''}</td>
  <td class="pr-2 text-right">${plata(j.valor)}</td><td class="text-right">${acciones.btn}</td></tr>`;
const tabla = (filas, conClub = false) => `<div class="overflow-x-auto"><table class="w-full text-xs"><thead class="text-[12px] text-gray-500 uppercase tracking-wider"><tr><th class="text-left">Pos</th><th class="text-left">Jugador</th><th>Media</th><th class="hidden sm:table-cell">Edad</th><th class="hidden md:table-cell text-left">${conClub ? 'Club' : ''}</th><th class="text-right">Valor</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;

let plantillaDatos = null;   // la última plantilla leída: cambiar de vista o de línea no vuelve a pedirla
async function pintarPlantilla() {
  const { data, error } = await supabase.from('lm_jugadores').select('id, nombre, posicion, media, edad, valor, pes_id').eq('club_id', club.id).order('media', { ascending: false });
  if (error) { $('mg-plantilla').innerHTML = vacio('fa-triangle-exclamation', 'No se pudo cargar la plantilla', 'Recarga la página.'); return; }
  const xi = data.slice(0, 11);
  resumen = { n: data.length, valor: data.reduce((s, j) => s + Number(j.valor || 0), 0), mediaXI: xi.length ? Math.round(xi.reduce((s, j) => s + (j.media || 0), 0) / xi.length) : null };
  plantillaDatos = data;
  pintarCabecera();
  await dibujarPlantilla();
}
const apellido = (n) => { const p = String(n ?? '').trim().split(/\s+/); return p.length > 1 ? p.slice(1).join(' ') : p[0] ?? ''; };
// Tu equipo por líneas (19-oct-2026): cuántos hay y su media, con una barra; tocar una línea filtra (mismo data-linea de siempre).
const CORTO = { '': 'Todos', por: 'POR', def: 'DEF', med: 'MED', del: 'DEL' };   // en el celular caben las 5 sin deslizar
function pintarFuerza(data) {
  const caja = document.querySelector('[data-mcx-fuerza]'); if (!caja) return;
  const prom = (g) => (g.length ? Math.round(g.reduce((s, j) => s + (j.media || 0), 0) / g.length) : 0);
  const barra = (m) => Math.max(6, Math.min(100, Math.round(((m - 50) / 45) * 100)));
  const boton = (id, t, g, m) => `<button type="button" data-linea="${id}" ${id ? `data-linea-color="${id}"` : ''} aria-pressed="${herr.linea === id}"><span class="mcx-fz-t"><span class="mcx-fz-largo">${t}</span><span class="mcx-fz-corto" aria-hidden="true">${CORTO[id]}</span></span><span class="mcx-fz-n"><b>${g}</b>${m ? `<small>media ${m}</small>` : ''}</span><span class="mcx-fz-barra" style="--p:${barra(m)}%"><i></i></span></button>`;
  caja.innerHTML = boton('', 'Todos', data.length, resumen.mediaXI ?? 0) + LINEAS.filter(([id]) => id !== 'otros').map(([id, t]) => { const g = data.filter((j) => linea(j.posicion) === id); return boton(id, t, g.length, prom(g)); }).join('');
}
// La cancha: todo el equipo en una pantalla, por líneas (delanteros arriba, portero abajo). Los 11 de mejor media llevan aro dorado.
function htmlCancha(data) {
  const xi = new Set(data.slice(0, 11).map((j) => j.id));
  const ficha = (j) => { filas.set(j.id, j); return `<button type="button" class="mcx-ficha${xi.has(j.id) ? ' es-xi' : ''}" data-ficha data-jid="${j.id}" data-linea="${linea(j.posicion)}" title="${esc(j.nombre)} · ${esc(j.posicion ?? '')} · ${j.media ?? '—'}">
      <span class="mcx-ficha-cara" data-foto="${esc(j.nombre)}" data-pes="${j.pes_id ?? ''}" data-club="${esc(club?.nombre ?? '')}" aria-hidden="true"><i class="fa-solid fa-user"></i></span>
      <b class="mcx-ficha-media">${j.media ?? '—'}</b><span class="mcx-ficha-pos">${esc(j.posicion ?? '')}</span><span class="mcx-ficha-nom">${esc(apellido(j.nombre))}</span></button>`; };
  const bandas = [['del', 'Delanteros'], ['med', 'Mediocampo'], ['def', 'Defensas'], ['por', 'Porteros'], ['otros', 'Sin posición']];
  return `<div class="mcx-cancha"${herr.linea ? ` data-foco="${herr.linea}"` : ''}><span class="mcx-cancha-lineas" aria-hidden="true"></span>${bandas.map(([id, t]) => { const g = ordenar(data.filter((j) => linea(j.posicion) === id)); return g.length ? `<div class="mcx-banda" data-linea="${id}"><p class="mcx-banda-t">${t} <small>${g.length}</small></p><div class="mcx-fichas">${g.map(ficha).join('')}</div></div>` : ''; }).join('')}</div>
    <p class="mcx-cancha-ayuda"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Toca a un jugador para ver su ficha. Con aro dorado: tus 11 de mejor media. Para vender o liberar, usa la vista Cartas.</p>`;
}
async function dibujarPlantilla() {
  const data = plantillaDatos; if (!data) return;
  pintarFuerza(data);
  if (!data.length) {
    // Ronda 282: si la liga entera no tiene jugadores todavía, el problema no es tu club: falta el catálogo del parche.
    const { count } = await supabase.from('lm_jugadores').select('id', { count: 'exact', head: true }).eq('liga', LIGA);
    $('mg-plantilla').innerHTML = count ? vacio('fa-people-group', 'Tu plantilla está vacía', 'Ficha jugadores en el Mercado.')
      : vacio('fa-satellite-dish', 'Los jugadores aún no llegan del juego', 'Phoenix Sync tiene que subir el catálogo del parche (los futbolistas reales de cada club). En cuanto llegue, tu plantilla aparece aquí sola.');
    return;
  }
  const off = cfg.ventana_abierta ? '' : 'disabled';
  // Ronda 292: las acciones van ABAJO de la carta (antes tapaban la posición), con su palabra.
  const btn = (j) => `<div class="mg-acciones"><button type="button" class="mg-mini" data-vender="${j.id}" data-nombre="${esc(j.nombre)}" data-valor="${j.valor}" ${off} title="Vender a un club CPU por su valor"><i class="fa-solid fa-hand-holding-dollar"></i><span>Vender</span></button><button type="button" class="mg-mini" data-liberar="${j.id}" ${off} title="Liberar (queda agente libre)"><i class="fa-solid fa-user-minus"></i><span>Liberar</span></button></div>`;
  if ($('mg-panel')?.dataset.vista === 'cancha') { $('mg-plantilla').innerHTML = htmlCancha(data); montarFotos($('mg-plantilla')); return; }
  const vistos = ordenar(data.filter((j) => !herr.linea || linea(j.posicion) === herr.linea));
  if (!vistos.length) { $('mg-plantilla').innerHTML = vacio('fa-filter', 'No tienes jugadores en esa línea', 'Elige «Todos» para ver toda tu plantilla.'); return; }
  $('mg-plantilla').innerHTML = LINEAS.map(([id, t]) => { const g = vistos.filter((j) => linea(j.posicion) === id); return g.length ? `<div class="mg-linea" data-linea="${id}">
      <h3 class="mg-linea-tit"><span></span>${t} <small>${g.length}</small></h3><div class="mg-grid">${g.map((j) => carta(j, btn(j))).join('')}</div></div>` : ''; }).join('');
  montarFotos($('mg-plantilla'));
}

// Dos formas de ver las cartas (ronda 290, pedido de Fralex): «Grandes» (foto grande al centro) o «Compactas» (fila: foto pequeña,
// nombre y media; caben más). Se recuerda en este navegador.
// 19-oct-2026: tercera vista, «Cancha» (solo en Plantilla; en el mercado se ven como Cartas). Sin preferencia guardada, el celular empieza
// en Cancha (todo el equipo en una pantalla) y la PC en Cartas.
const CLAVE_VISTA = 'pes-mg-vista';
function ponerVista(v) {
  const vista = v === 'cancha' ? 'cancha' : 'grande';   // la vista «Lista» se quitó (19-oct-2026): quien la tenía guardada ve Cartas
  $('mg-panel')?.setAttribute('data-vista', vista);
  document.querySelectorAll('.mg-vista [data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === vista)));
  return vista;
}
{ let v = null; try { v = localStorage.getItem(CLAVE_VISTA); } catch { /* sin almacenamiento */ } ponerVista(v || (matchMedia('(max-width: 640px)').matches ? 'cancha' : 'grande')); }
document.addEventListener('click', (e) => {
  const b = e.target.closest('.mg-vista [data-vista]'); if (!b) return;
  const vista = ponerVista(b.dataset.vista); try { localStorage.setItem(CLAVE_VISTA, vista); } catch { /* no se recuerda */ }
  if (tabActual() === 'plantilla') dibujarPlantilla();
});

// Herramientas de las cartas (ronda 292, pedido de Fralex): ver solo una línea, ordenar a gusto y agrandar/alejar.
const CLAVE_HERR = 'pes-mg-herr';
const herr = { linea: '', orden: 'media', tam: 2 };
try { const g = JSON.parse(localStorage.getItem(CLAVE_HERR) || '{}'); if (['media', 'valor', 'edad', 'nombre'].includes(g.orden)) herr.orden = g.orden; } catch { /* sin almacenamiento */ }
const ORDEN = { media: (a, b) => (b.media ?? 0) - (a.media ?? 0), valor: (a, b) => Number(b.valor || 0) - Number(a.valor || 0), edad: (a, b) => (a.edad ?? 99) - (b.edad ?? 99), nombre: (a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es') };
const ordenar = (lista) => [...lista].sort((a, b) => ORDEN[herr.orden](a, b) || ORDEN.media(a, b));
const POS_DE = (l) => Object.keys(LINEA).filter((k) => LINEA[k] === l);
function pintarHerr() {
  $('mg-panel')?.setAttribute('data-tam', String(herr.tam));
  document.querySelectorAll('.mg-lineas [data-linea]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.linea === herr.linea)));
  document.querySelectorAll('[data-orden-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ordenBtn === herr.orden)));   // el orden va en botones (sin menú desplegable)
  document.querySelectorAll('.mg-tam [data-tam]').forEach((b) => { b.disabled = (b.dataset.tam === '-1' && herr.tam <= 1) || (b.dataset.tam === '1' && herr.tam >= 4); });
  try { localStorage.setItem(CLAVE_HERR, JSON.stringify({ orden: herr.orden, tam: herr.tam })); } catch { /* no se recuerda */ }
}
const repintarCartas = () => { pintarHerr(); if (tabActual() === 'mercado') { mercadoVer = 12; pintarMercado(); } else if (plantillaDatos) dibujarPlantilla(); else pintarPlantilla(); };
document.addEventListener('click', (e) => {
  const l = e.target.closest('.mg-lineas [data-linea]'); if (l) { herr.linea = l.dataset.linea; repintarCartas(); return; }
  const o = e.target.closest('[data-orden-btn]'); if (o) { herr.orden = o.dataset.ordenBtn; repintarCartas(); return; }
  const t = e.target.closest('.mg-tam [data-tam]'); if (t && !t.disabled) { herr.tam = Math.max(1, Math.min(4, herr.tam + Number(t.dataset.tam))); pintarHerr(); }   // solo cambia el tamaño: no hace falta volver a pedir datos
});
pintarHerr();

let tBuscar = null; let mercadoVer = 12;   // el mercado se muestra de 12 en 12 («Ver más»), no en un muro de 60
async function pintarMercado() {
  const q = $('mg-buscar').value.trim(); const libres = $('mg-libres')?.getAttribute('aria-pressed') === 'true';
  const col = { media: ['media', false], valor: ['valor', false], edad: ['edad', true], nombre: ['nombre', true] }[herr.orden];
  let s = supabase.from('lm_jugadores').select('id, nombre, posicion, media, edad, valor, club_id, pes_id').eq('liga', LIGA).order(col[0], { ascending: col[1], nullsFirst: false }).limit(60);
  if (herr.linea) s = s.in('posicion', POS_DE(herr.linea));
  if (q) s = s.ilike('nombre', `%${q.replace(/[%_]/g, '')}%`);
  if (libres) s = s.is('club_id', null); else if (club) s = s.neq('club_id', club.id);
  const { data, error } = await s;
  if (error) { $('mg-mercado').textContent = 'No se pudo buscar.'; return; }
  const todos = ordenar(data.filter((j) => j.club_id !== club?.id)); const lista = todos.slice(0, mercadoVer);
  const n = $('mcx-mercado-n'); if (n) n.textContent = todos.length ? `${lista.length} de ${todos.length}${todos.length >= 60 ? '+' : ''} jugadores` : '';
  const mas = $('mg-mas'); if (mas) mas.hidden = todos.length <= mercadoVer;
  $('mg-mercado').innerHTML = !lista.length ? vacio('fa-magnifying-glass', 'Sin resultados', 'Prueba con otro nombre o posición.')
    : `<div class="mg-grid">${lista.map((j) => { const vend = clubes.get(j.club_id); const directo = !vend || !vend.dueno;
      const origen = `<p class="mg-club-chip">${vend ? `${escudo(vend, 'w-4 h-4')} <span>${esc(vend.nombre)}</span>` : '<i class="fa-solid fa-unlock text-emerald-300"></i> <span>Agente libre</span>'}</p>${dtHTML(vend)}`;
      return carta(j, `<button type="button" class="btn ${directo ? 'btn-primary' : ''} !min-h-8 !text-[12px] w-full" data-ofertar="${j.id}" data-valor="${j.valor}" data-directo="${directo ? 1 : 0}" data-nombre="${esc(j.nombre)}" ${cfg.ventana_abierta ? '' : 'disabled'}>${directo ? '<i class="fa-solid fa-signature"></i> Fichar' : '<i class="fa-solid fa-hand-holding-dollar"></i> Ofertar'}</button>`, origen); }).join('')}</div>`;
  montarFotos($('mg-mercado'));
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
        <p class="text-[12px] text-gray-400">${o.club_vendedor === club.id ? 'Oferta de ' + nomClub(o.club_comprador) : 'Para ' + nomClub(o.club_vendedor)} · ${esc(haceCuanto(o.created_at) ?? '')}</p>
        ${o.mensaje ? `<p class="text-[12px] text-gray-300 italic mt-1">«${esc(o.mensaje)}»</p>` : ''}</div>
      <div class="text-right"><p class="mg-monto">${millones(o.monto)}</p><span class="mg-estado">${esc(o.estado)}</span></div></div>
      ${btns ? `<div class="flex gap-2 mt-2 justify-end">${btns}</div>` : ''}</div>`;
  const rec = data.filter((o) => o.club_vendedor === club.id); const env = data.filter((o) => o.club_comprador === club.id);
  $('mg-recibidas').innerHTML = rec.length ? rec.map((o) => item(o, o.estado === 'pendiente' ? `<button type="button" class="btn btn-primary !min-h-7 !text-[12px]" data-responder="${o.id}" data-si="1">Aceptar</button><button type="button" class="btn !min-h-7 !text-[12px]" data-responder="${o.id}" data-si="0">Rechazar</button>` : '')).join('') : vacio('fa-inbox', 'Sin ofertas recibidas', 'Cuando otro DT quiera a tus jugadores, aparecerá aquí.');
  $('mg-enviadas').innerHTML = env.length ? env.map((o) => item(o, o.estado === 'pendiente' ? `<button type="button" class="btn !min-h-7 !text-[12px]" data-cancelar="${o.id}">Cancelar</button>` : '')).join('') : vacio('fa-paper-plane', 'Sin ofertas enviadas', 'Busca jugadores de otros DT en el Mercado.');
}

async function pintarMovimientos() {
  const { data, error } = await supabase.from('lm_movimientos').select('*').eq('liga', LIGA).order('created_at', { ascending: false }).limit(40);
  if (error) { $('mg-movs').textContent = 'No se pudo cargar.'; return; }
  const ids = [...new Set(data.map((m) => m.jugador_id))];
  const { data: js } = ids.length ? await supabase.from('lm_jugadores').select('id, nombre').in('id', ids) : { data: [] };
  const nj = (id) => esc((js ?? []).find((x) => x.id === id)?.nombre ?? 'Jugador');
  const TIPO = { compra: ['fa-right-left', 'Traspaso'], libre: ['fa-signature', 'Fichaje libre'], liberado: ['fa-user-minus', 'Liberado'], staff: ['fa-shield-halved', 'Staff'], juego: ['fa-gamepad', 'Desde el juego'] };
  const staff = can('resolverReportes');
  $('mg-movs').innerHTML = !data.length ? vacio('fa-right-left', 'Aún no hubo fichajes', 'El primer movimiento de la ventana aparecerá aquí.')
    : `<ol class="mg-timeline">${data.map((m) => { const [ic, t] = TIPO[m.tipo] ?? TIPO.staff; return `<li>
        <span class="mg-tl-ic"><i class="fa-solid ${ic}"></i></span>
        <div class="flex-1 min-w-0"><p><b class="text-white">${nj(m.jugador_id)}</b> <span class="text-[12px] text-gray-500 uppercase tracking-wider ml-1">${t}</span></p>
          <p class="text-xs text-gray-400">${nomClub(m.de_club)} <i class="fa-solid fa-arrow-right text-[12px] mx-1 text-galaxy-400"></i> <span class="text-gray-200">${nomClub(m.a_club)}</span></p></div>
        <div class="text-right shrink-0">${m.revertido_en ? '<p class="text-[12px] text-amber-300"><i class="fa-solid fa-rotate-left"></i> Revertido</p>' : staff && m.tipo !== 'staff' ? `<button type="button" class="mg-mini !static !opacity-100" data-revertir="${m.id}" title="Revertir este movimiento (staff)"><i class="fa-solid fa-rotate-left"></i></button>` : ''}${m.monto ? `<p class="mg-monto">${millones(m.monto)}</p>` : ''}<p class="text-[12px] text-gray-500">${m.aplicado_en ? '<i class="fa-solid fa-gamepad text-emerald-400" title="Ya está en el juego"></i>' : '<i class="fa-regular fa-clock" title="Llega al juego al cerrar la ventana"></i>'} ${esc(haceCuanto(m.created_at) ?? '')}</p></div></li>`; }).join('')}</ol>`;
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
  pintarEstadoLiga();
}
function pintarClubesStaff() {
  const lista = [...clubes.values()]; const q = filtroClub.toLowerCase();
  const ap = lista.filter((c) => c.aprobado).length; const dts = lista.filter((c) => c.dueno).length;
  $('mg-c-resumen').innerHTML = `<b class="text-white">${ap}</b> de ${lista.length} encendidos · <b class="text-galaxy-400">${dts}</b> con DT`;
  const vis = lista.filter((c) => !q || c.nombre.toLowerCase().includes(q));
  $('mg-staff-clubes').innerHTML = !lista.length ? vacio('fa-file-import', 'Sin clubes todavía', 'Importa el catálogo para verlos aquí.')
    : !vis.length ? '<p class="text-xs text-gray-500 col-span-full">Ningún club coincide.</p>'
    : vis.map((c) => `<label class="mg-club-t ${c.aprobado ? 'activo' : ''}">${escudo(c, 'w-8 h-8')}<span class="flex-1 min-w-0"><b>${esc(c.nombre)}</b><small>${c.dueno ? '<i class="fa-solid fa-user-tie"></i> Tiene DT · ' + millones(c.presupuesto) : c.aprobado ? '<i class="fa-solid fa-microchip"></i> Juega · lo maneja la IA' : 'Apagado · no juega'}</small></span>
        <input type="checkbox" class="mg-switch" data-aprobar-club="${c.id}" ${c.aprobado ? 'checked' : ''}></label>`).join('');
  pintarEstadoLiga();
}
// Cómo está la liga, de un vistazo (arriba de «Administrar la liga»).
function pintarEstadoLiga() {
  const el = $('mcx-admin-estado'); if (!el) return;
  const lista = [...clubes.values()]; const ap = lista.filter((c) => c.aprobado).length; const conDt = lista.filter((c) => c.dueno).length;
  const chip = (cls, ic, txt) => `<span class="mcx-admin-chip ${cls}"><i class="fa-solid ${ic}" aria-hidden="true"></i>${txt}</span>`;
  el.innerHTML = chip(cfg?.ventana_abierta ? 'ok' : '', cfg?.ventana_abierta ? 'fa-door-open' : 'fa-lock', cfg?.ventana_abierta ? 'Ventana abierta' : 'Ventana cerrada')
    + chip(ap ? '' : 'alerta', 'fa-shield-halved', `${ap} de ${lista.length} clubes juegan`) + chip('', 'fa-user-tie', `${conDt} con DT`) + chip('', 'fa-wallet', `Empiezan con ${millones(cfg?.presupuesto_inicial)}`);
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


// ── Resumen del club (19-oct-2026, «El Estadio»): de un vistazo, lo que importa de tu club; cada tarjeta lleva a su sección. ──
let resumenReq = 0;
async function pintarResumen() {
  const caja = $('mcx-resumen'); if (!caja || !club) return;
  const req = ++resumenReq;
  const [ofs, movs] = await Promise.all([
    supabase.from('lm_ofertas').select('id, club_comprador, club_vendedor, monto, estado').or(`club_comprador.eq.${club.id},club_vendedor.eq.${club.id}`).eq('estado', 'pendiente').limit(50),
    supabase.from('lm_movimientos').select('jugador_id, de_club, a_club, monto, tipo, created_at, revertido_en').eq('liga', LIGA).is('revertido_en', null).order('created_at', { ascending: false }).limit(4),
  ]);
  if (req !== resumenReq) return;
  const pend = ofs.data ?? []; const recibidas = pend.filter((o) => o.club_vendedor === club.id).length; const enviadas = pend.filter((o) => o.club_comprador === club.id).length;
  window.dispatchEvent(new CustomEvent('mcx:ofertas', { detail: { recibidas } }));
  const ms = movs.data ?? []; const ids = [...new Set(ms.map((m) => m.jugador_id))];
  const { data: js } = ids.length ? await supabase.from('lm_jugadores').select('id, nombre').in('id', ids) : { data: [] };
  if (req !== resumenReq) return;
  const nj = (id) => esc((js ?? []).find((x) => x.id === id)?.nombre ?? 'Jugador');
  const max = cfg?.max_plantilla ?? 40; const lleno = Math.min(100, Math.round((resumen.n / max) * 100));
  const abierta = !!cfg?.ventana_abierta;
  const sync = document.getElementById('mc-estado')?.dataset.estado ?? 'out';
  const syncTxt = { on: ['Juego conectado', 'Phoenix Sync aplica tus cambios en tu partida.'], off: ['Juego sin conectar', 'Abre Phoenix Sync en tu PC para llevar tus cambios al PES.'] }[sync] ?? ['Conecta tu PES', 'Con Phoenix Sync, lo que hagas aquí llega a tu partida.'];
  caja.innerHTML = `
    <article class="mcx-b mcx-b-presu"><p class="mcx-b-t"><i class="fa-solid fa-wallet" aria-hidden="true"></i> Presupuesto</p><p class="mcx-b-grande"><span data-mcx-contar>€0</span></p><p class="mcx-b-sub">Valor de tu plantilla: <b>${millones(resumen.valor)}</b></p></article>
    <article class="mcx-b mcx-b-ventana" data-abierta="${abierta}"><p class="mcx-b-t"><i class="fa-solid ${abierta ? 'fa-door-open' : 'fa-lock'}" aria-hidden="true"></i> Ventana de fichajes</p><p class="mcx-b-grande mcx-b-estado">${abierta ? 'Abierta' : 'Cerrada'}</p><p class="mcx-b-sub">${abierta ? 'Ficha a agentes libres y a clubes de la IA, o haz ofertas a otros DT.' : 'Puedes mirar plantillas y preparar a quién fichar.'}</p><button type="button" class="mcx-b-boton" data-mcx-sala><i class="fa-solid fa-handshake" aria-hidden="true"></i> Abrir la sala de fichajes</button></article>
    <a class="mcx-b mcx-b-plantilla" href="#plantilla"><p class="mcx-b-t"><i class="fa-solid fa-people-group" aria-hidden="true"></i> Plantilla</p><p class="mcx-b-grande"><span data-mcx-num="${resumen.n}">${resumen.n}</span><small>/${max}</small></p><span class="mcx-barra" style="--p:${lleno}%"><i></i></span><p class="mcx-b-sub">Media del XI <b>${resumen.mediaXI ?? '—'}</b></p><span class="mcx-b-ir">Ver plantilla</span></a>
    <a class="mcx-b mcx-b-ofertas" href="#oficina"><p class="mcx-b-t"><i class="fa-solid fa-inbox" aria-hidden="true"></i> Tus ofertas</p><p class="mcx-b-grande"><span data-mcx-num="${recibidas}">${recibidas}</span><small> recibida${recibidas === 1 ? '' : 's'}</small></p><p class="mcx-b-sub">${enviadas} oferta${enviadas === 1 ? '' : 's'} tuya${enviadas === 1 ? '' : 's'} esperando respuesta</p><span class="mcx-b-ir">${recibidas ? 'Responder' : 'Ver mis ofertas'}</span></a>
    <a class="mcx-b mcx-b-juego" data-sync="${esc(sync)}" href="${FX.clubUnificado ? '#vestuario' : href('mercado/')}"><p class="mcx-b-t"><i class="fa-solid fa-plug" aria-hidden="true"></i> Tu PES</p><p class="mcx-b-grande mcx-b-estado"><i class="mcx-punto" aria-hidden="true"></i>${syncTxt[0]}</p><p class="mcx-b-sub">${syncTxt[1]}</p><span class="mcx-b-ir">${FX.clubUnificado ? 'Mi partida de PES' : 'Conectar juego'}</span></a>
    <article class="mcx-b mcx-b-movs"><p class="mcx-b-t"><i class="fa-solid fa-right-left" aria-hidden="true"></i> Últimos movimientos de la liga</p>
      ${ms.length ? `<ol class="mcx-movs">${ms.map((m) => `<li class="${m.a_club === club.id || m.de_club === club.id ? 'es-mio' : ''}"><b>${nj(m.jugador_id)}</b><span>${nomClub(m.de_club)} → ${nomClub(m.a_club)}</span>${m.monto ? `<em>${millones(m.monto)}</em>` : ''}</li>`).join('')}</ol>` : '<p class="mcx-b-sub">Aún no hubo fichajes en esta ventana.</p>'}
      <a class="mcx-b-ir" href="#movimientos">Ver el diario completo</a></article>`;
  const n = caja.querySelector('[data-mcx-contar]'); if (n) contarHastaDinero(n, Number(club.presupuesto || 0));
  caja.querySelectorAll('[data-mcx-num]').forEach((el) => contarHasta(el, Number(el.dataset.mcxNum), String));
}
// El presupuesto sube contando (como un marcador). Respeta «menos movimiento».
function contarHastaDinero(el, total) { contarHasta(el, total, millones); }
function contarHasta(el, total, fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !total) { el.textContent = fmt(total); return; }
  const t0 = performance.now(); const dur = 900;
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(total * (1 - (1 - k) ** 3))); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-mcx-sala]')) $('mg-abrir-sala')?.click(); });

// ── Tabs ──
function mostrarTab(id) {
  document.querySelectorAll('[data-tab]').forEach((a) => { if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== id; });
  ({ resumen: pintarResumen, plantilla: () => (plantillaDatos ? dibujarPlantilla() : pintarPlantilla()), mercado: () => { pintarMercado(); pintarOficina(); }, movimientos: pintarMovimientos })[id]?.();
  if (location.hash === '#oficina') requestAnimationFrame(() => $('mcx-ofertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
const tabActual = () => { const h = location.hash.slice(1); if (h === 'oficina') return 'mercado'; return ['resumen', 'plantilla', 'mercado', 'movimientos', 'admin'].includes(h) ? h : 'resumen'; };   // «admin»: solo staff (Administrar la liga, fuera de #mg-panel)   // «oficina» ahora vive dentro de Fichajes
window.addEventListener('hashchange', () => club && mostrarTab(tabActual()));

async function refrescar() {
  try { await cargarBase(); } catch (e) { console.error('[manager]', e); toast('No se pudo cargar la Liga Máster.', 'error'); return; }
  $('mg-sin-sesion').hidden = !!yo; $('mg-elegir').hidden = !yo || !!club; $('mg-panel').hidden = !club;
  pintarCabecera(); if (yo && !club) pintarElegir();
  if (club) { plantillaDatos = null; if (tabActual() !== 'plantilla') pintarPlantilla(); mostrarTab(tabActual()); }   // tras fichar o vender, la plantilla se vuelve a leer   // la plantilla alimenta las cifras de la cabecera
  $('mg-staff').hidden = !(yo && can('resolverReportes')); if (!$('mg-staff').hidden) pintarStaff();
  window.dispatchEvent(new CustomEvent('mg:refrescado', { detail: { miClub: club, cfg, staff: !$('mg-staff').hidden } }));   // la sala de fichajes (si está abierta) se pone al día
}

const rpc = async (fn, args) => { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; };
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-elegir],[data-vender],[data-liberar],[data-ofertar],[data-responder],[data-cancelar],[data-revertir],#mg-dejar'); if (!b || b.disabled) return;
  b.disabled = true;
  try {
    if (b.dataset.elegir) { const c = clubes.get(Number(b.dataset.elegir)); if (!(await confirmar(`¿Ser el DT de ${c?.nombre}? Recibirás ${plata(cfg?.presupuesto_inicial)} de presupuesto.`))) return; await rpc('lm_activar', { p_club: c.id }); toast('¡Bienvenido a tu club, mánager!', 'ok'); await refrescar(); }
    else if (b.id === 'mg-dejar') { if (!(await confirmar('¿Dejar tu club? Vuelve a la IA y tus ofertas pendientes se cancelan.', { peligro: true }))) return; await rpc('lm_abandonar'); toast('Dejaste tu club.', 'ok'); await refrescar(); }
    else if (b.dataset.vender) {
      const cpus = [...clubes.values()].filter((c) => c.aprobado && !c.dueno);
      if (!cpus.length) { toast('No hay clubes CPU aprobados.', 'warn'); return; }
      const id = await elegir(`¿A qué club CPU vendes a ${b.dataset.nombre} por ${millones(b.dataset.valor)}?`, cpus.map((c) => ({ valor: c.id, texto: c.nombre })), { titulo: 'Vender a la CPU' });
      if (id == null) return;
      const r = await rpc('lm_vender_cpu', { p_jugador: Number(b.dataset.vender), p_club_cpu: id }); toast(`Vendido a ${r.club} por ${millones(r.monto)}.`, 'ok'); await refrescar();
    }
    else if (b.dataset.liberar) { if (!(await confirmar('¿Liberar a este jugador? Quedará como agente libre, sin cobro.', { peligro: true }))) return; await rpc('lm_liberar', { p_jugador: Number(b.dataset.liberar) }); toast('Jugador liberado.', 'ok'); await refrescar(); }
    else if (b.dataset.ofertar) {
      const directo = b.dataset.directo === '1'; const valor = Number(b.dataset.valor);
      let monto = valor;
      if (directo) { if (!(await confirmar(`¿Fichar a ${b.dataset.nombre} por ${plata(valor)}?`))) return; }
      else { const t = await pedirTexto(`¿Cuánto ofreces por ${b.dataset.nombre}? (valor ${plata(valor)})`, { titulo: 'Hacer oferta', valor: String(valor), maximo: 15, aceptar: 'Ofertar' }); if (t === null) return; monto = Math.round(Number(String(t).replace(/[^\d]/g, ''))); if (!monto && monto !== 0) return; }
      const r = await rpc('lm_ofertar', { p_jugador: Number(b.dataset.ofertar), p_monto: monto });
      toast(r?.estado === 'cerrada' ? `¡Fichaje cerrado por ${plata(r.monto)}!` : 'Oferta enviada. Te avisaremos cuando respondan.', 'ok'); await refrescar();
    }
    else if (b.dataset.responder) { await rpc('lm_responder', { p_oferta: Number(b.dataset.responder), p_aceptar: b.dataset.si === '1' }); toast(b.dataset.si === '1' ? 'Traspaso cerrado.' : 'Oferta rechazada.', 'ok'); await refrescar(); }
    else if (b.dataset.revertir) { if (!(await confirmar('¿Revertir este movimiento? El jugador vuelve a su club anterior y el dinero se devuelve.', { peligro: true }))) return; await rpc('lm_staff_revertir', { p_mov: Number(b.dataset.revertir) }); toast('Movimiento revertido.', 'ok'); await refrescar(); pintarMovimientos(); }
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
});
$('mg-buscar').addEventListener('input', () => { mercadoVer = 12; clearTimeout(tBuscar); tBuscar = setTimeout(pintarMercado, 300); });
$('mg-libres')?.addEventListener('click', (e) => { const b = e.currentTarget; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); mercadoVer = 12; pintarMercado(); });
$('mg-mas')?.addEventListener('click', () => { mercadoVer += 12; pintarMercado(); });
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

// Sala de fichajes (modo mercado): solo muestra; «Fichar» / «Ofertar» los atiende el manejador de arriba (data-ofertar).
$('mg-abrir-sala')?.addEventListener('click', () => import('../features/mercado/salaMercado.js').then((m) => m.abrirSalaMercado({ clubes, dts, miClub: club, cfg })).catch((e) => { console.error('[manager] sala:', e); toast('No se pudo abrir la sala.', 'error'); }));
onSession((st) => { yo = st?.session?.user?.id ?? null; refrescar(); });
