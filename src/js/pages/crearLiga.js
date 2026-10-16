// Página «Crear mi liga» (ronda 276). Solo staff por ahora. Crea un torneo propio (RPC torneo_crear, igual que /torneos/) y lleva a su ficha.
import { onSession, rolReal } from '../core/session.js';
import { puede } from '../core/roles.js';
import { toast } from '../core/toast.js';
import { escapeHTML as esc } from '../core/dom.js';
import { href } from '../core/config.js';
import { nombreEpico } from '../core/diversion.js';
import * as api from '../features/torneos/api.js';
import { selectorDinamicasHTML } from '../features/torneos/guia.js';
import { PLANTILLAS, plantillaPorId, limitesDe, ajustarJugadores, resumenPartidos, construirTorneo } from '../core/crearLiga.js';

const $ = (id) => document.getElementById(id);
const form = $('cl-form');
const st = { tipo: 'liga', jugadores: plantillaPorId('liga').defecto, creando: false };

const op = () => {
  const d = new FormData(form);
  return {
    idaVuelta: d.has('idaVuelta'), tercerPuesto: d.has('tercer'), grupos: d.get('grupos') ? Number(d.get('grupos')) : null, visibilidad: String(d.get('visibilidad') ?? 'publico'),
    juega: d.has('juega'), descripcion: d.get('descripcion'), premio: d.get('premio'), reglas: d.get('reglas'), enlace: d.get('enlace'), inicia: d.get('inicia') || null,
    dinamicas: d.getAll('din'), sorteo: d.has('sorteo'), reportan: d.has('reportan'), sinTope: d.has('sinTope'),
  };
};

function pintarTipos() {
  $('cl-tipos').innerHTML = PLANTILLAS.map((p) => `<button type="button" class="cl-tipo" data-tipo="${p.id}" aria-pressed="${p.id === st.tipo}">
    <i class="fa-solid ${esc(p.icono)}" aria-hidden="true"></i><b>${esc(p.nombre)}</b><span>${esc(p.frase)}</span><small>${esc(p.detalle)}</small></button>`).join('');
}
/** Muestra solo las opciones que sirven para el tipo elegido (data-solo="liga copa …"). */
function filtrarOpciones() {
  form.querySelectorAll('[data-solo]').forEach((el) => { el.hidden = !el.dataset.solo.split(' ').includes(st.tipo); });
}
function pintarResumen() {
  const o = op(); const { min, max } = limitesDe(st.tipo, o); const r = resumenPartidos(st.tipo, st.jugadores, o);
  const sin = o.sinTope;
  $('cl-jugadores').value = st.jugadores; $('cl-jugadores').min = String(min); $('cl-jugadores').max = String(sin ? 256 : max);
  $('cl-menos').disabled = st.jugadores <= min; $('cl-mas').disabled = !sin && st.jugadores >= max;
  $('cl-resumen').innerHTML = r
    ? `Con <b>${st.jugadores}</b> jugadores se juegan <b>${r.partidos}</b> partidos${r.tipo === 'suizo' ? ` en ${r.rondas === 1 ? 'rondas' : `unas ${Math.max(1, Math.ceil(Math.log2(st.jugadores)))} rondas`}` : ''}.`
    : `Elige entre ${min} y ${max} jugadores.`;
}
function refrescar() { filtrarOpciones(); st.jugadores = ajustarJugadores(st.tipo, st.jugadores, op()); pintarResumen(); }
const mostrarError = (m) => { const p = $('cl-err'); p.textContent = m ?? ''; p.hidden = !m; };

async function crear(e) {
  e.preventDefault(); if (st.creando) return;
  mostrarError('');
  const r = construirTorneo({ plantilla: st.tipo, nombre: $('cl-nombre').value, jugadores: st.jugadores, opciones: op() });
  if (!r.ok) { mostrarError(r.motivo); if (/nombre/i.test(r.motivo)) $('cl-nombre').focus(); return; }
  st.creando = true; $('cl-crear').disabled = true; $('cl-estado').textContent = 'Creando tu liga…';
  try {
    const id = await api.crear(r.args);
    toast('¡Liga creada!', 'ok');
    location.href = `${href('torneo/')}?id=${encodeURIComponent(id)}`;
  } catch (err) { mostrarError(err.message); $('cl-estado').textContent = ''; $('cl-crear').disabled = false; st.creando = false; }
}

$('cl-dinamicas').innerHTML = selectorDinamicasHTML();
pintarTipos(); refrescar();
$('cl-tipos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tipo]'); if (!b) return;
  st.tipo = b.dataset.tipo; st.jugadores = plantillaPorId(st.tipo).defecto; pintarTipos(); refrescar();
});
$('cl-menos').addEventListener('click', () => { st.jugadores = ajustarJugadores(st.tipo, st.jugadores - 1, op()); pintarResumen(); });
$('cl-mas').addEventListener('click', () => { st.jugadores = op().sinTope ? Math.min(256, st.jugadores + 1) : ajustarJugadores(st.tipo, st.jugadores + 1, op()); pintarResumen(); });
$('cl-jugadores').addEventListener('change', (e) => { const v = Number(e.target.value); st.jugadores = op().sinTope ? Math.min(256, Math.max(2, Math.round(v) || 2)) : ajustarJugadores(st.tipo, v, op()); pintarResumen(); });
// Lo que cambia los límites (ida y vuelta, más jugadores, grupos, 3.er puesto) recalcula el resumen.
form.addEventListener('change', (e) => { if (['idaVuelta', 'sinTope', 'grupos', 'tercer'].includes(e.target.name)) refrescar(); });
$('cl-azar').addEventListener('click', () => { $('cl-nombre').value = nombreEpico(Math.floor(Math.random() * 1e6)); mostrarError(''); });
form.addEventListener('submit', crear);

onSession((s) => {
  const hayUsuario = !!s.session?.user?.id;
  const staff = hayUsuario && puede(rolReal(), 'editarLiga');   // moderador o admin: lo mismo que exige el servidor (migración 107)
  $('cl-sin-sesion').hidden = hayUsuario; $('cl-no-staff').hidden = !hayUsuario || staff; form.hidden = !staff;
});
