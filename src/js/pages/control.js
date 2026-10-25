// Página /control/ — CENTRO DE CONTROL del staff (Fralex, 19-oct-2026: «secciones de control y organización»).
// SOLO LEE: cada tarjeta cuenta lo pendiente con las mismas consultas que ya usan Moderación, Bandeja IA y la Tienda, y lleva al sitio donde
// se resuelve. No cambia nada en la base. Lógica pura (colores, plazos, semana tipo): core/sistema/centroControl.js.
import { onSession, can, getState, rolActual } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { avatarHTML } from '../core/sistema/avatar.js';
import { etiquetaRol, ROL_INFO } from '../core/sistema/roles.js';
import { PLAZOS, estadoDe, vencidos, sinArbitroProximaFecha, resumen, tareasDeHoy, diaLima, fechaLima, NOMBRE_DIA } from '../core/sistema/centroControl.js';

const $ = (id) => document.getElementById(id);
const rpc = async (fn, args) => { const { data, error } = await supabase.rpc(fn, args); if (error) throw error; return data; };
const filas = (d) => (Array.isArray(d) ? d : []);
const cuando = (x) => x?.created_at ?? x?.creado_en ?? x?.solicitado_at ?? x?.propuesto_en ?? null;

// Una sola lectura de partidos de liga para las 3 tarjetas de la liga (validar, disputas, árbitros).
let ligaCache = null;
const partidosLiga = () => (ligaCache ??= supabase.from('liga_partidos').select('id, edicion_id, fecha, estado, arbitro, propuesto_en').in('estado', ['pendiente', 'propuesto', 'disputa']).limit(1000)
  .then(({ data, error }) => { if (error) throw error; return data ?? []; }));

/** Tarjetas: quién las ve (permiso), qué cuentan y dónde se resuelven. `cargar` devuelve { n, vencidos?, detalle? }. */
const TARJETAS = [
  { id: 'liga-validar', grupo: 'Liga', titulo: 'Resultados por validar', icono: 'fa-scale-balanced', ver: 'editarLiga', destino: 'moderacion/#mod-liga', plazo: `Validar en ${PLAZOS.resultado} h`,
    cargar: async () => { const ps = (await partidosLiga()).filter((p) => p.estado === 'propuesto'); return { n: ps.length, vencidos: vencidos(ps.map((p) => p.propuesto_en), PLAZOS.resultado) }; } },
  { id: 'liga-disputa', grupo: 'Liga', titulo: 'Partidos en disputa', icono: 'fa-gavel', ver: 'editarLiga', destino: 'moderacion/#mod-liga', plazo: `Resolver en ${PLAZOS.disputa} h`,
    cargar: async () => { const ps = (await partidosLiga()).filter((p) => p.estado === 'disputa'); return { n: ps.length, vencidos: vencidos(ps.map((p) => p.propuesto_en), PLAZOS.disputa) }; } },
  { id: 'liga-arbitros', grupo: 'Liga', titulo: 'Sin árbitro en la próxima fecha', icono: 'fa-user-tie', ver: 'editarLiga', destino: 'moderacion/#mod-liga', plazo: 'Asignar antes de la jornada',
    cargar: async () => { const h = sinArbitroProximaFecha(await partidosLiga()); return { n: h.reduce((s, x) => s + x.faltan, 0), detalle: h.map((x) => `Fecha ${x.fecha}: ${x.faltan}`).join(' · ') }; } },
  { id: 'duelos', grupo: 'Competición', titulo: 'Marcadores de duelos en disputa', icono: 'fa-handshake', ver: 'resolverReportes', destino: 'moderacion/#mod-marcadores', plazo: `Resolver en ${PLAZOS.disputa} h`,
    cargar: async () => { const d = filas(await rpc('resultados_disputados')); return { n: d.length, vencidos: vencidos(d.map(cuando), PLAZOS.disputa) }; } },
  { id: 'torneos', grupo: 'Competición', titulo: 'Torneos propios nuevos (24 h)', icono: 'fa-trophy', ver: 'gestionarTorneos', destino: 'moderacion/#tls-card', plazo: 'Mirar nombre, reglas y enlaces',
    cargar: async () => { const desde = new Date(Date.now() - 24 * 3600e3).toISOString(); const { count, error } = await supabase.from('torneos_libres').select('id', { count: 'exact', head: true }).gte('creado_en', desde); if (error) throw error; return { n: count ?? 0 }; } },
  { id: 'oficial-pedidos', grupo: 'Competición', titulo: 'Ligas que piden ser oficiales', icono: 'fa-shield-halved', ver: 'gestionarTorneos', destino: 'moderacion/#tls-oficial', plazo: `Responder en ${PLAZOS.oficial} h`,
    cargar: async () => { const d = filas(await rpc('staff_solicitudes_oficial', { p_estado: 'pendiente', p_limite: 100 })); return { n: d.length, vencidos: vencidos(d.map((x) => x.creado_en), PLAZOS.oficial) }; } },
  { id: 'reportes', grupo: 'Comunidad', titulo: 'Reportes abiertos', icono: 'fa-flag', ver: 'verReportes', destino: 'moderacion/', plazo: `Atender en ${PLAZOS.reporte} h`,
    cargar: async () => { const d = filas(await rpc('reportes_listar', { p_estado: 'abierto', p_antes: null, p_limite: 100 })); return { n: d.length, vencidos: vencidos(d.map(cuando), PLAZOS.reporte), detalle: d.length >= 100 ? 'Más de 100' : '' }; } },
  { id: 'privacidad', grupo: 'Comunidad', titulo: 'Solicitudes de privacidad', icono: 'fa-user-shield', ver: 'resolverReportes', destino: 'moderacion/#mod-privacidad', plazo: `Responder en ${PLAZOS.privacidad} h`,
    cargar: async () => { const d = filas(await rpc('staff_solicitudes_privacidad', { p_estado: 'pendiente' })); return { n: d.length, vencidos: vencidos(d.map(cuando), PLAZOS.privacidad) }; } },
  { id: 'creadores', grupo: 'Comunidad', titulo: 'Creadores por verificar', icono: 'fa-video', ver: 'resolverReportes', destino: 'moderacion/#mod-creadores', plazo: 'Revisar cada semana',
    cargar: async () => { const { count, error } = await supabase.from('creadores').select('usuario', { count: 'exact', head: true }).eq('verificado', false); if (error) throw error; return { n: count ?? 0 }; } },
  { id: 'bandeja', grupo: 'Contenido', titulo: 'Bandeja IA por revisar', icono: 'fa-inbox', ver: 'bandejaIA', destino: 'bandeja-ia/', plazo: 'Revisar cada día',
    cargar: async () => ({ n: filas(await rpc('ia_bandeja', { p_historial: false })).length }) },
  { id: 'pagos', grupo: 'Dinero (solo admin)', titulo: 'Pagos por revisar', icono: 'fa-money-bill-transfer', ver: 'administrarTienda', destino: 'tienda/', plazo: `Revisar en ${PLAZOS.pago} h`,
    cargar: async () => { const d = filas(await rpc('admin_pagos_manuales', { p_estado: 'en_revision' })); return { n: d.length, vencidos: vencidos(d.map(cuando), PLAZOS.pago) }; } },
  { id: 'alertas', grupo: 'Dinero (solo admin)', titulo: 'Alertas del dinero', icono: 'fa-triangle-exclamation', ver: 'administrarTienda', destino: 'tienda/', plazo: 'Una alerta crítica apaga los pagos',
    cargar: async () => { const d = filas(await rpc('admin_alertas', { p_resueltas: false })); return { n: d.length, vencidos: d.filter((a) => /crit/i.test(String(a.severidad ?? a.nivel ?? ''))).length }; } },
];

const TEXTO_ESTADO = { ok: 'Al día', atencion: 'Pendiente', urgente: 'Fuera de plazo', 'sin-dato': 'Sin datos', cargando: 'Leyendo…' };
const visibles = () => TARJETAS.filter((t) => can(t.ver));

function tarjetaHTML(t, r) {
  const estado = r ? estadoDe(r) : 'cargando';
  const n = r && Number.isFinite(r.n) ? r.n : '—';
  const extra = r?.vencidos ? `<span class="cc-vencidos">${r.vencidos} fuera de plazo</span>` : r?.detalle ? `<span class="cc-detalle">${esc(r.detalle)}</span>` : '';
  return `<a class="cc-tarjeta" data-estado="${estado}" href="${href(t.destino)}">
    <span class="cc-ic"><i class="fa-solid ${t.icono}" aria-hidden="true"></i></span>
    <span class="cc-n">${n}</span>
    <span class="cc-titulo">${esc(t.titulo)}</span>
    <span class="cc-pie"><b class="cc-estado">${TEXTO_ESTADO[estado]}</b>${extra || `<span class="cc-plazo">${esc(t.plazo)}</span>`}</span>
    <span class="cc-ir">Ir a resolver <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>`;
}

const resultados = new Map();
function pintarTarjetas() {
  const ts = visibles();
  const grupos = [...new Set(ts.map((t) => t.grupo))];
  $('cc-tarjetas').innerHTML = grupos.map((g) => `<section class="cc-grupo" aria-label="${esc(g)}"><h2 class="cc-h">${esc(g)}</h2>
    <div class="cc-rejilla">${ts.filter((t) => t.grupo === g).map((t) => tarjetaHTML(t, resultados.get(t.id))).join('')}</div></section>`).join('')
    || '<p class="cc-vacio">Tu rol no tiene tareas de control.</p>';
  const estados = ts.filter((t) => resultados.has(t.id)).map((t) => estadoDe(resultados.get(t.id)));
  const listo = estados.length === ts.length;
  const r = resumen(estados);
  const cab = $('cc-resumen');
  cab.dataset.nivel = listo ? r.nivel : 'cargando';
  cab.querySelector('[data-frase]').textContent = listo ? r.frase : 'Revisando lo pendiente…';
  cab.querySelector('[data-cifras]').innerHTML = listo ? [['urgente', r.urgentes, 'fuera de plazo'], ['atencion', r.atencion, 'pendientes'], ['ok', r.ok, 'al día']]
    .map(([k, v, txt]) => `<span class="cc-cifra" data-k="${k}"><b>${v}</b> ${txt}</span>`).join('') : '';
}

let cargando = false;
async function actualizar() {
  if (cargando) return; cargando = true; ligaCache = null;
  $('cc-actualizar').disabled = true;
  await Promise.all(visibles().map(async (t) => {
    try { resultados.set(t.id, await t.cargar()); } catch (e) { console.warn(`[control] ${t.id}:`, e?.message ?? e); resultados.set(t.id, { n: null }); }
    pintarTarjetas();
  }));
  $('cc-hora').textContent = `Actualizado a las ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
  $('cc-actualizar').disabled = false; cargando = false;
}

// ---- Organización: «Hoy toca» (semana tipo; lo marcado se recuerda solo en este navegador y solo hoy) ----
function pintarHoy() {
  const dia = diaLima(); const clave = `pes-control-hoy-${fechaLima()}`;
  let hechas = {}; try { hechas = JSON.parse(localStorage.getItem(clave) || '{}') || {}; } catch { hechas = {}; }
  $('cc-hoy-dia').textContent = NOMBRE_DIA[dia];
  $('cc-hoy').innerHTML = tareasDeHoy(dia).map((t, i) => `<li><label class="cc-tarea"><input type="checkbox" data-tarea="${i}" ${hechas[i] ? 'checked' : ''}><span>${esc(t)}</span></label></li>`).join('');
  $('cc-hoy').onchange = (e) => {
    const c = e.target.closest('[data-tarea]'); if (!c) return;
    hechas[c.dataset.tarea] = c.checked;
    try { localStorage.setItem(clave, JSON.stringify(hechas)); } catch { /* sin almacenamiento: se marca igual en pantalla */ }
  };
}

// ---- Organización: el equipo por rol (quién es quién) ----
async function pintarEquipo() {
  const caja = $('cc-equipo');
  try {
    const { data, error } = await supabase.from('perfiles').select('id, username, nombre_display, avatar_url, rol').in('rol', ['admin', 'moderador', 'arbitro', 'ayudante']).limit(200);
    if (error) throw error;
    const yo = getState().session?.user?.id;
    const orden = ['admin', 'moderador', 'arbitro', 'ayudante'];
    caja.innerHTML = orden.map((rol) => {
      const gente = (data ?? []).filter((p) => p.rol === rol);
      const persona = (p) => { const nom = p.nombre_display || p.username || 'Sin nombre'; return `<a class="cc-persona" href="${href(`perfil/?u=${encodeURIComponent(p.username ?? '')}`)}">${avatarHTML(p.avatar_url, nom, 28)}<span>${esc(nom)}${p.id === yo ? ' <em>(tú)</em>' : ''}</span></a>`; };
      return `<div class="cc-rol" data-rol="${rol}"><h3><i class="fa-solid ${ROL_INFO[rol].icono}" aria-hidden="true"></i> ${esc(etiquetaRol(rol))} <b>${gente.length}</b></h3>
        <p>${esc(ROL_INFO[rol].descripcion)}</p>${gente.length ? `<div class="cc-gente">${gente.map(persona).join('')}</div>` : '<p class="cc-falta">Nadie con este rol todavía.</p>'}</div>`;
    }).join('') + (can('darRoles') ? `<p class="cc-nota">Los roles se dan y se quitan en <a href="${href('auditoria/')}">Auditoría → Equipo y roles</a>.</p>` : '');
  } catch (e) { caja.innerHTML = '<p class="cc-falta">No se pudo leer el equipo.</p>'; console.warn('[control] equipo:', e?.message ?? e); }
}

// ---- Accesos rápidos a las herramientas que tu rol puede usar ----
const ACCESOS = [
  ['moderacion/', 'fa-shield-halved', 'Moderación', 'verReportes'], ['mis-partidos/', 'fa-futbol', 'Partidos que arbitras', null],
  ['noticias/', 'fa-newspaper', 'Noticias', 'editarLiga'], ['bandeja-ia/', 'fa-inbox', 'Bandeja IA', 'bandejaIA'],
  ['eventos/', 'fa-calendar-day', 'Eventos', 'gestionarEventos'], ['clanes/', 'fa-shield-halved', 'Clanes', 'gestionarClanes'],
  ['manager/', 'fa-briefcase', 'Modo Mánager', 'editarLiga'], ['cambios-oficiales/', 'fa-arrows-rotate', 'Cambios oficiales', 'verAuditoriaCompleta'],
  ['auditoria/', 'fa-clipboard-list', 'Auditoría', 'verAuditoria'], ['panel/', 'fa-sliders', 'Panel del sitio', 'verAuditoriaCompleta'],
  ['tienda/', 'fa-store', 'Tienda → Administrar', 'administrarTienda'], ['link-versiones/', 'fa-download', 'Versiones de Link', 'verAuditoriaCompleta'],
];
const pintarAccesos = () => { $('cc-accesos').innerHTML = ACCESOS.filter(([, , , p]) => !p || can(p)).map(([ruta, ic, txt]) => `<a class="cc-acceso" href="${href(ruta)}"><i class="fa-solid ${ic}" aria-hidden="true"></i>${esc(txt)}</a>`).join(''); };

let reloj = null; let montado = false;
onSession(({ session }) => {
  const permitido = Boolean(session) && can('verReportes');
  $('cc-sinsesion').hidden = Boolean(session);
  $('cc-denegado').hidden = !session || permitido;
  $('cc-app').hidden = !permitido;
  if (!permitido) { clearInterval(reloj); montado = false; return; }
  $('cc-rol').textContent = etiquetaRol(rolActual());
  if (montado) return; montado = true;
  pintarTarjetas(); pintarHoy(); pintarEquipo(); pintarAccesos(); actualizar();
  // Cada 2 minutos, solo si la pestaña está a la vista (no gasta consultas en segundo plano).
  reloj = setInterval(() => { if (document.visibilityState === 'visible') actualizar(); }, 120000);
});
$('cc-actualizar')?.addEventListener('click', actualizar);
document.addEventListener('visibilitychange', () => { if (montado && document.visibilityState === 'visible') actualizar(); });
