// Página /auditoria/: qué hace cada persona del staff (solo moderador y admin; la BD lo vuelve a comprobar en cada consulta).
// Esquema: pages/auditoria → features/auditoria/{api (RPC), vista (HTML)} → core/{auditoria, roles} (lógica pura).
import { onSession, can, getState } from '../core/session.js';
import { toast } from '../core/toast.js';
import { openModal, closeModal } from '../core/modal.js';
import { desdeRango, normalizarResumen } from '../core/auditoria.js';
import * as api from '../features/auditoria/api.js';
import { ayudaHTML, resumenHTML, filtrosHTML, lineaHTML, equipoHTML, resultadosHTML, modalRolHTML } from '../features/auditoria/vista.js';

const $ = (id) => document.getElementById(id);
const PAGINA = 30;
const S = { dias: 7, f: { accion: '', tabla: '', actor: '', rango: 'todo' }, resumen: normalizarResumen(null), entradas: [], hayMas: false, cargando: false, equipo: [], resultados: null, iniciado: false };
const esAdmin = () => can('verAuditoriaCompleta');
const yo = () => getState().session?.user?.id ?? null;

function mostrarError(err) {
  console.error('[auditoria] página:', err);
  $('aud-error-txt').textContent = err?.message || 'Algo salió mal. Inténtalo de nuevo.';
  $('aud-error').hidden = false;
}
const ocultarError = () => { $('aud-error').hidden = true; };

function pintarResumen() { $('aud-resumen').innerHTML = resumenHTML(S.resumen, { dias: S.dias, esAdmin: esAdmin() }); }
function pintarFiltros() { $('aud-filtros').innerHTML = filtrosHTML(S.f, S.resumen.personas, esAdmin()); }
function pintarLinea() { $('aud-linea').innerHTML = lineaHTML(S.entradas); $('aud-mas').hidden = !S.hayMas; }
function pintarEquipo() { $('aud-equipo').innerHTML = equipoHTML(S.equipo, yo(), S.resultados); }

async function cargarResumen() {
  try { S.resumen = await api.resumen(S.dias); pintarResumen(); pintarFiltros(); }
  catch (err) { mostrarError(err); }
}

/** `mas = true` añade la siguiente página (desde la última entrada que ya se ve); si no, empieza de cero con los filtros actuales. */
async function cargarLinea({ mas = false } = {}) {
  if (S.cargando) return;
  S.cargando = true; $('aud-mas').disabled = true;
  try {
    const antes = mas && S.entradas.length ? S.entradas.at(-1).id : null;
    const nuevas = await api.listar({ actor: S.f.actor || null, tabla: S.f.tabla || null, accion: S.f.accion || null, desde: desdeRango(S.f.rango), antes, limite: PAGINA });
    S.entradas = mas ? [...S.entradas, ...nuevas] : nuevas;
    S.hayMas = nuevas.length === PAGINA;
    ocultarError(); pintarLinea();
  } catch (err) { mostrarError(err); }
  finally { S.cargando = false; $('aud-mas').disabled = false; }
}

async function cargarEquipo() {
  if (!esAdmin()) return;
  try { S.equipo = await api.listarEquipo(); pintarEquipo(); }
  catch (err) { console.error('[auditoria] equipo:', err); $('aud-equipo').innerHTML = '<p class="text-xs text-rose-300">No se pudo leer el equipo.</p>'; }
}

const recargarTodo = () => Promise.all([cargarResumen(), cargarLinea(), cargarEquipo()]);

function abrirRol(id) {
  const cuenta = [...S.equipo, ...(S.resultados ?? [])].find((c) => c.id === id); if (!cuenta) return;
  const m = openModal(modalRolHTML(cuenta), { id: 'rol-modal' });
  m.querySelector('#rol-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const rol = m.querySelector('input[name="rol"]:checked')?.value ?? ''; const motivo = m.querySelector('#rol-motivo').value.trim();
    const errores = [];
    if (!rol) errores.push('Elige un rol.'); else if (rol === cuenta.rol) errores.push('Esa cuenta ya tiene ese rol.');
    if (!motivo) errores.push('Escribe un motivo: queda guardado en la auditoría.');
    const lista = m.querySelector('#rol-err'); lista.replaceChildren(...errores.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
    if (errores.length) return;
    const btn = m.querySelector('#rol-guardar'); btn.disabled = true;
    try {
      await api.asignarRol(cuenta.id, rol, motivo);
      toast(`Rol actualizado: ${cuenta.nombre}.`, 'ok'); closeModal('rol-modal'); S.resultados = null; await recargarTodo();
    } catch (err) { lista.replaceChildren(Object.assign(document.createElement('li'), { textContent: err.message || 'No se pudo cambiar el rol.' })); }
    finally { btn.disabled = false; }
  });
}

let temporizador = null;
function conectar() {
  const app = $('aud-app');
  app.addEventListener('click', (ev) => {
    const t = ev.target;
    const dias = t.closest('[data-dias]')?.dataset.dias;
    if (dias) { S.dias = Number(dias); cargarResumen(); return; }
    const accion = t.closest('[data-accion]'); if (accion) { S.f.accion = accion.dataset.accion; pintarFiltros(); cargarLinea(); return; }
    const actor = t.closest('[data-actor]')?.dataset.actor;
    if (actor) { S.f.actor = actor; pintarFiltros(); cargarLinea(); $('aud-filtros').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const cuenta = t.closest('[data-rol-cuenta]')?.dataset.rolCuenta; if (cuenta) { abrirRol(cuenta); return; }
    if (t.closest('#aud-mas')) cargarLinea({ mas: true });
  });
  app.addEventListener('change', (ev) => {
    const id = ev.target.id;
    if (id === 'aud-seccion') S.f.tabla = ev.target.value;
    else if (id === 'aud-persona') S.f.actor = ev.target.value;
    else if (id === 'aud-rango') S.f.rango = ev.target.value;
    else return;
    cargarLinea();
  });
  app.addEventListener('input', (ev) => {
    if (ev.target.id !== 'eq-buscar') return;
    clearTimeout(temporizador);
    const texto = ev.target.value;
    temporizador = setTimeout(async () => {
      try { S.resultados = texto.trim().length >= 2 ? await api.buscarCuentas(texto) : null; }
      catch (err) { console.error('[auditoria] buscar:', err); S.resultados = []; }
      $('eq-res').innerHTML = resultadosHTML(S.resultados, yo());
    }, 300);
  });
  $('aud-reintentar').addEventListener('click', () => { ocultarError(); recargarTodo(); });
}

function iniciar() {
  $('aud-ayuda').innerHTML = ayudaHTML();
  pintarResumen(); pintarFiltros(); pintarLinea();
  conectar();
  recargarTodo();
}

onSession(({ session }) => {
  const permitido = !!session && can('verAuditoria');
  $('aud-sinsesion').hidden = !!session;
  $('aud-denegado').hidden = !session || permitido;
  $('aud-app').hidden = !permitido;
  $('aud-equipo-caja').hidden = !permitido || !esAdmin();
  if (permitido && !S.iniciado) { S.iniciado = true; iniciar(); }
});
