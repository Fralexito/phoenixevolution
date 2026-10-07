// Página /moderacion/: cola de reportes (ayudante, moderador y admin; la BD vuelve a comprobar el rol en cada consulta y en cada acción).
// Esquema: pages/moderacion → features/moderacion/{api (RPC), vista (HTML), acciones (modales)} → core/{moderacion, roles} (lógica pura).
import { onSession, can, rolActual } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import * as api from '../features/moderacion/api.js';
import { listaReportesHTML, historialHTML } from '../features/moderacion/vista.js';
import { abrirOcultar, abrirSancionar, abrirNota } from '../features/moderacion/acciones.js';
import { tipoInfo, NOTA_SANCION_MAX } from '../core/moderacion.js';
import { crearColaMarcadores } from '../features/resultados/staffPanel.js';
import { montarPanelHosts, montarPanelCreadores } from '../features/salas/panelStaff.js';

const $ = (id) => document.getElementById(id);
const PAGINA = 30;
const ESTADOS = [['abierto', 'Abiertos', 'fa-inbox'], ['resuelto', 'Resueltos', 'fa-circle-check'], ['descartado', 'Descartados', 'fa-ban']];
const S = { estado: 'abierto', items: [], hayMas: false, cargando: false, iniciado: false };
const yo = () => ({ rol: rolActual(), puedeModerar: can('resolverReportes'), urlPerfil: (u) => `${href('perfil/')}?u=${encodeURIComponent(u)}` });

function mostrarError(err) {
  console.error('[moderacion] página:', err);
  $('mod-error-txt').textContent = err?.message || 'Algo salió mal. Inténtalo de nuevo.';
  $('mod-error').hidden = false;
}
const ocultarError = () => { $('mod-error').hidden = true; };

function pintarTabs() {
  $('mod-tabs').innerHTML = ESTADOS.map(([id, texto, ico]) => `<button type="button" data-estado="${id}" aria-pressed="${id === S.estado}" class="adv-chip !min-h-9 ${id === S.estado ? '!border-galaxy-400' : ''}"><i class="fa-solid ${ico} mr-1.5"></i>${escapeHTML(texto)}</button>`).join('');
}
function pintarLista() { $('mod-lista').innerHTML = listaReportesHTML(S.items, yo()); $('mod-mas').hidden = !S.hayMas; }

/** `mas = true` añade la siguiente página; si no, empieza de cero con la pestaña actual. */
async function cargar({ mas = false } = {}) {
  if (S.cargando) return;
  S.cargando = true; $('mod-mas').disabled = true;
  try {
    const antes = mas && S.items.length ? S.items.at(-1).id : null;
    const nuevos = await api.listarReportes({ estado: S.estado, antes, limite: PAGINA });
    S.items = mas ? [...S.items, ...nuevos] : nuevos; S.hayMas = nuevos.length === PAGINA;
    ocultarError(); pintarLista();
  } catch (err) { mostrarError(err); }
  finally { S.cargando = false; $('mod-mas').disabled = false; }
}
const recargar = () => cargar();
const reporte = (id) => S.items.find((r) => r.id === Number(id));
const resumenObjeto = (r) => `${tipoInfo(r.tipo).etiqueta} de ${r.acusado.nombre}`;

async function cargarHistorial(caja, r) {
  caja.hidden = false; caja.innerHTML = '<p class="text-[12px] text-gray-500 py-1">Cargando historial…</p>';
  try { caja.innerHTML = `<p class="text-[12px] text-gray-400 mt-1 font-display font-bold uppercase tracking-wider">Historial de sanciones</p>${historialHTML(await api.sancionesDe(r.acusado.id), { ...yo(), rolObjetivo: r.acusado.rol })}`; }
  catch (err) { caja.innerHTML = `<p class="text-[12px] text-rose-300">${escapeHTML(err.message)}</p>`; }
}

const ACCIONES = {
  resolver: (el) => {
    const r = reporte(el.dataset.id); if (!r) return; const estado = el.dataset.estado === 'descartado' ? 'descartado' : 'resuelto';
    abrirNota({ titulo: estado === 'resuelto' ? 'Marcar como resuelto' : 'Descartar reporte', sub: resumenObjeto(r), accion: estado === 'resuelto' ? 'Marcar resuelto' : 'Descartar', obligatoria: false,
      hacer: (nota) => api.resolverReporte(r.id, estado, nota), ok: estado === 'resuelto' ? 'Reporte resuelto.' : 'Reporte descartado.', onListo: recargar });
  },
  ocultar: (el) => {
    const r = reporte(el.dataset.id); if (!r) return;
    abrirOcultar({ tipo: r.tipo, id: r.objetivo, titulo: resumenObjeto(r), ocultar: el.dataset.ocultar === '1', onListo: recargar });
  },
  sancionar: (el) => {
    const r = reporte(el.dataset.id); if (!r || !r.acusado.id) return;
    abrirSancionar({ usuario: { id: r.acusado.id, nombre: r.acusado.nombre, rol: r.acusado.rol }, reporte: r.id, onListo: recargar });
  },
  historial: (el) => {
    const r = reporte(el.dataset.rep); const caja = document.querySelector(`[data-historial="${el.dataset.rep}"]`); if (!r || !caja) return;
    if (!caja.hidden) { caja.hidden = true; return; }
    cargarHistorial(caja, r);
  },
  levantar: (el) => {
    const caja = el.closest('[data-historial]'); const r = caja && reporte(caja.dataset.historial); if (!r) return;
    abrirNota({ titulo: 'Levantar sanción', sub: r.acusado.nombre, accion: 'Levantar', max: NOTA_SANCION_MAX, hacer: (nota) => api.levantarSancion(Number(el.dataset.id), nota),
      ok: 'Sanción levantada.', onListo: async () => { await cargarHistorial(caja, r); await recargar(); } });
  },
};

function conectar() {
  $('mod-app').addEventListener('click', (ev) => {
    const t = ev.target;
    const tab = t.closest('[data-estado]:not([data-act])')?.dataset.estado;
    if (tab && tab !== S.estado) { S.estado = tab; pintarTabs(); cargar(); return; }
    const el = t.closest('[data-act]'); if (!el) return;
    try { ACCIONES[el.dataset.act]?.(el); } catch (err) { console.error('[moderacion] acción:', err); toast('No se pudo completar la acción.', 'error'); }
  });
  $('mod-mas').addEventListener('click', () => cargar({ mas: true }));
  $('mod-reintentar').addEventListener('click', () => { ocultarError(); recargar(); });
}

onSession(({ session }) => {
  const permitido = !!session && can('verReportes');
  $('mod-sinsesion').hidden = !!session;
  $('mod-denegado').hidden = !session || permitido;
  $('mod-app').hidden = !permitido;
  $('mod-solo-lectura').hidden = !permitido || can('resolverReportes');
  if (permitido && !S.iniciado) { S.iniciado = true; pintarTabs(); conectar(); recargar(); crearColaMarcadores($('mod-marcadores'), { puedeResolver: can('resolverReportes') }).cargar();
    if (can('resolverReportes')) { $('mod-hosts').hidden = false; montarPanelHosts($('mod-hosts')); $('mod-creadores').hidden = false; montarPanelCreadores($('mod-creadores')); } }
});
