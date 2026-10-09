// Página «Torneos»: lista de torneos propios + ficha de creación. Datos por features/torneos/api.js (migración 097).
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML as esc } from '../core/dom.js';
import { href } from '../core/config.js';
import { nombreEpico } from '../core/diversion.js';
import { DESCRIPCIONES_BASE } from '../../data/dinamicas.js';
import * as api from '../features/torneos/api.js';
import { FORMATOS_FICHA, formatoFicha, guiaFormatoHTML, selectorDinamicasHTML, leyendaHTML, ESTADO_TXT, TONO } from '../features/torneos/guia.js';

const $ = (id) => document.getElementById(id);
const st = { yo: null, formato: 'eliminacion', filtro: 'abiertos', torneos: [], inscritos: [], nombres: {} };

// ── Ficha ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function pintarChips() {
  $('tn-chips').innerHTML = FORMATOS_FICHA.map((f) => `<button type="button" class="tn-chip" data-formato="${f.id}" data-tono="${f.tono}" aria-pressed="${f.id === st.formato}">
    <i class="fa-solid ${f.icono}" aria-hidden="true"></i><span>${esc(f.nombre)}</span><small>${esc(TONO[f.tono])}</small></button>`).join('');
}
function pintarFormato() {
  const f = formatoFicha(st.formato);
  $('tn-guia-formato').innerHTML = guiaFormatoHTML(st.formato) + `<p class="tn-ayuda"><b>Cuándo usarlo:</b> ${esc(f.cuando)}</p>`;
  const opts = [];
  if (['eliminacion', 'grupos'].includes(st.formato)) opts.push('<label class="tn-check"><input type="checkbox" name="tercer"> Partido por el 3.er puesto</label>');
  if (st.formato === 'grupos') opts.push('<div><label class="tn-campo" for="tn-grupos">Cantidad de grupos (vacío = automático)</label><input id="tn-grupos" name="grupos" type="number" min="2" max="16" class="field"></div>');
  if (st.formato === 'colina') opts.push('<div><label class="tn-campo" for="tn-racha">Victorias seguidas para ganar una corona</label><input id="tn-racha" name="racha" type="number" min="2" max="10" value="3" class="field"></div>');
  if (st.formato === 'escalera') opts.push('<div><label class="tn-campo" for="tn-alcance">Cuántos puestos arriba se puede retar</label><input id="tn-alcance" name="alcance" type="number" min="1" max="20" value="3" class="field"></div>');
  if (['eliminacion', 'doble', 'liguilla', 'idavuelta', 'grupos', 'suizo'].includes(st.formato)) opts.push('<label class="tn-check"><input type="checkbox" name="sinTope"> Permitir más jugadores de lo recomendado <small>(sin límite)</small></label>');
  $('tn-opciones-formato').innerHTML = opts.join('');
}
function leerFicha() {
  const f = $('tn-form'); const d = new FormData(f);
  const num = (k) => (d.get(k) ? Number(d.get(k)) : null);
  const config = {
    dinamicas: d.getAll('din'), tercerPuesto: d.has('tercer'), grupos: num('grupos'), maxRacha: num('racha') ?? 3, alcance: num('alcance') ?? 3,
    sinTope: d.has('sinTope'), sortear: d.has('sorteo'), reportan_jugadores: d.has('reportan'),
    premio: String(d.get('premio') ?? '').trim() || null, reglas_extra: String(d.get('reglas') ?? '').trim() || null, enlace: String(d.get('enlace') ?? '').trim() || null,
  };
  const inicia = d.get('inicia') ? new Date(String(d.get('inicia'))).toISOString() : null;
  return { nombre: String(d.get('nombre') ?? '').trim(), descripcion: String(d.get('descripcion') ?? '').trim() || null, formato: st.formato, config, visibilidad: String(d.get('visibilidad')), cupo: num('cupo'), inicia, juega: d.has('juega') };
}
function abrirFicha(abrir = true) {
  $('tn-ficha').hidden = !abrir;
  if (abrir) { $('tn-sin-sesion').hidden = !!st.yo; $('tn-form').hidden = !st.yo; $('tn-ficha').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('tn-nombre').focus({ preventScroll: true }); }
}
async function crear(e) {
  e.preventDefault();
  const a = leerFicha();
  if (a.nombre.length < 3) { toast('El nombre necesita al menos 3 letras.', 'warn'); return; }
  const btn = $('tn-crear'); btn.disabled = true; $('tn-estado-form').textContent = 'Creando…';
  try {
    const id = await api.crear(a);
    toast('¡Torneo creado!', 'ok');
    location.href = `${href('torneo/')}?id=${encodeURIComponent(id)}`;
  } catch (err) { toast(err.message, 'error'); $('tn-estado-form').textContent = ''; btn.disabled = false; }
}

// ── Lista ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const FILTROS = [['abiertos', 'Abiertos'], ['curso', 'En curso'], ['fin', 'Terminados'], ['mios', 'Míos']];
function pintarTabs() {
  $('tn-tabs').innerHTML = FILTROS.filter(([id]) => id !== 'mios' || st.yo).map(([id, t]) => `<button type="button" class="tn-tab" data-filtro="${id}" aria-pressed="${st.filtro === id}">${t}</button>`).join('');
}
function filtrar() {
  const mis = new Set(st.inscritos.filter((i) => i.usuario === st.yo).map((i) => i.torneo_id));
  return st.torneos.filter((t) => {
    if (st.filtro === 'mios') return t.creador === st.yo || mis.has(t.id);
    if (t.visibilidad !== 'publico' && t.creador !== st.yo && !mis.has(t.id)) return false;
    if (st.filtro === 'abiertos') return t.estado === 'inscripcion';
    if (st.filtro === 'curso') return t.estado === 'en_curso';
    return t.estado === 'terminado';
  });
}
function tarjeta(t) {
  const f = formatoFicha(t.formato); const e = ESTADO_TXT[t.estado];
  const n = st.inscritos.filter((i) => i.torneo_id === t.id).length;
  const yoDentro = st.inscritos.some((i) => i.torneo_id === t.id && i.usuario === st.yo);
  return `<a class="glass-panel tn-card" href="${href('torneo/')}?id=${t.id}" data-estado="${esc(t.estado)}">
    <span class="tn-card-ico" data-tono="${esc(f?.tono ?? 'casual')}"><i class="fa-solid ${esc(f?.icono ?? 'fa-trophy')}" aria-hidden="true"></i></span>
    <span class="tn-card-cuerpo"><b>${esc(t.nombre)}</b>
      <small>${esc(f?.nombre ?? t.formato)} · por ${esc(st.nombres[t.creador] ?? 'Organizador')}</small>
      <span class="tn-card-meta"><span class="tn-pill"><i class="fa-solid ${esc(e?.icono ?? 'fa-circle')}" aria-hidden="true"></i> ${esc(e?.nombre ?? t.estado)}</span>
        <span class="tn-pill"><i class="fa-solid fa-users" aria-hidden="true"></i> ${n}${t.cupo ? `/${t.cupo}` : ''}</span>
        ${yoDentro ? '<span class="tn-pill tn-yo">Estás dentro</span>' : ''}${t.campeon ? `<span class="tn-pill tn-camp"><i class="fa-solid fa-crown" aria-hidden="true"></i> ${esc(t.campeon)}</span>` : ''}</span></span>
    <i class="fa-solid fa-chevron-right tn-card-flecha" aria-hidden="true"></i></a>`;
}
function pintarLista() {
  pintarTabs();
  const l = filtrar();
  $('tn-lista').innerHTML = l.length ? l.map(tarjeta).join('')
    : `<p class="tn-vacio">${st.filtro === 'abiertos' ? 'No hay torneos abiertos ahora. ¡Crea el primero!' : 'Aquí no hay nada todavía.'}</p>`;
}
async function cargar() {
  try {
    st.torneos = await api.listarTorneos();
    st.inscritos = await api.inscritosDe(st.torneos.map((t) => t.id));
    st.nombres = await api.nombresDe(st.torneos.map((t) => t.creador));
    pintarLista();
  } catch (err) { $('tn-lista').innerHTML = `<p class="tn-vacio">${esc(err.message)}</p>`; }
}

// ── Inicio ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
$('tn-leyenda').innerHTML = leyendaHTML();
pintarChips(); pintarFormato(); $('tn-dinamicas').innerHTML = selectorDinamicasHTML(); pintarTabs();
$('tn-nuevo').addEventListener('click', () => abrirFicha(true));
$('tn-cerrar-ficha').addEventListener('click', () => abrirFicha(false));
$('tn-form').addEventListener('submit', crear);
$('tn-azar').addEventListener('click', () => {
  const s = Math.floor(Math.random() * 1e6);
  $('tn-nombre').value = nombreEpico(s);
  if (!$('tn-desc').value) $('tn-desc').value = DESCRIPCIONES_BASE[s % DESCRIPCIONES_BASE.length];
});
$('tn-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-formato]'); if (!b) return; st.formato = b.dataset.formato; pintarChips(); pintarFormato(); });
$('tn-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-filtro]'); if (!b) return; st.filtro = b.dataset.filtro; pintarLista(); });
onSession((s) => { st.yo = s.session?.user?.id ?? null; $('tn-sin-sesion').hidden = !!st.yo; $('tn-form').hidden = !st.yo; if (st.torneos.length) pintarLista(); });
cargar();
