// Staff · Capa 1 (traspasos reales por ventana). Módulo aparte de manager.js: no comparte estado.
// Lee y escribe lm_ventanas_reales / lm_traspasos_reales directo: la RLS (migración 084) solo deja escribir al staff.
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { TIPOS, ESTADOS_VENTANA, validarTraspaso, describirMovimiento } from '../core/traspasosReales.js';

const $ = (id) => document.getElementById(id);
const ERR = { duplicate: 'Ese jugador ya tiene un movimiento en esta ventana.', 'row-level security': 'Solo el staff puede hacer esto.', 'does not exist': 'Falta la migración 084 en la base.' };
const msg = (e) => { const k = Object.keys(ERR).find((x) => String(e?.message).includes(x)); return k ? ERR[k] : (e?.message || 'Error'); };
const st = { yo: null, ventanas: [], ventana: null, filas: [], equipos: new Map(), iniciado: false };
const nombreEquipo = (id) => st.equipos.get(id) ?? null;
const ventanaActual = () => st.ventanas.find((v) => v.id === st.ventana) ?? null;

async function cargarEquipos() {
  const { data } = await supabase.from('lm_clubes').select('pes_team_id, nombre').not('pes_team_id', 'is', null);
  st.equipos = new Map((data ?? []).map((c) => [c.pes_team_id, c.nombre]));
}

async function cargarVentanas() {
  const { data, error } = await supabase.from('lm_ventanas_reales').select('id, nombre, estado, notas').order('id', { ascending: false });
  if (error) { $('tr-lista').innerHTML = `<p class="text-xs text-gray-500">${esc(msg(error))}</p>`; return false; }
  st.ventanas = data ?? [];
  if (!st.ventanas.some((v) => v.id === st.ventana)) st.ventana = st.ventanas[0]?.id ?? null;
  return true;
}

async function cargarFilas() {
  if (st.ventana == null) { st.filas = []; return; }
  const { data, error } = await supabase.from('lm_traspasos_reales').select('id, pes_id, jugador, de_pes_team_id, a_pes_team_id, tipo, nota').eq('ventana_id', st.ventana).order('id', { ascending: false });
  if (error) { toast(msg(error), 'error'); st.filas = []; return; }
  st.filas = data ?? [];
}

function pintar() {
  const v = ventanaActual();
  $('tr-ventana').innerHTML = st.ventanas.length ? st.ventanas.map((x) => `<option value="${x.id}" ${x.id === st.ventana ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('') : '<option value="">Sin ventanas</option>';
  $('tr-estado').innerHTML = v ? ESTADOS_VENTANA.map(([e, t]) => `<button type="button" class="mg-chip" data-tr-estado="${e}" aria-pressed="${v.estado === e}">${t}</button>`).join('') : '';
  $('tr-form').hidden = !v;
  $('tr-resumen').textContent = v ? `${st.filas.length} movimiento(s) en «${v.nombre}»` : 'Crea una ventana para empezar (por ejemplo «Verano 2026»).';
  $('tr-lista').innerHTML = !v ? '' : !st.filas.length ? '<p class="text-xs text-gray-500">Todavía no hay movimientos en esta ventana.</p>'
    : st.filas.map((f) => `<div class="mg-ctrl"><span class="flex-1 min-w-0"><b>${esc(f.jugador)}</b> <small class="text-gray-500">ID ${f.pes_id}</small><small>${esc(describirMovimiento(f, nombreEquipo))}${f.nota ? ` · ${esc(f.nota)}` : ''}</small></span>
        <button type="button" class="mg-chip" data-tr-borrar="${f.id}" aria-label="Quitar a ${esc(f.jugador)}"><i class="fa-solid fa-trash"></i></button></div>`).join('');
}

async function refrescar() {
  if (await cargarVentanas()) { await Promise.all([cargarFilas(), cargarEquipos()]); pintar(); }
}

document.addEventListener('change', async (ev) => {
  if (ev.target.id === 'tr-ventana') { st.ventana = Number(ev.target.value) || null; await cargarFilas(); pintar(); }
});

document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('#tr-nueva, [data-tr-estado], [data-tr-borrar]');
  if (!b || b.disabled || !st.iniciado) return;
  b.disabled = true;
  try {
    if (b.id === 'tr-nueva') {
      const nombre = await pedirTexto('Nombre de la nueva ventana de traspasos reales', { titulo: 'Nueva ventana', placeholder: 'Verano 2026', maximo: 60, aceptar: 'Crear' });
      if (nombre === null) return;
      const limpio = nombre.trim();
      if (limpio.length < 2) { toast('Escribe al menos 2 letras.', 'warn'); return; }
      const { data, error } = await supabase.from('lm_ventanas_reales').insert({ nombre: limpio, creado_por: st.yo }).select('id').single();
      if (error) throw error;
      st.ventana = data.id; toast('Ventana creada.', 'ok'); await refrescar();
    } else if (b.dataset.trEstado) {
      const v = ventanaActual(); if (!v || v.estado === b.dataset.trEstado) return;
      if (b.dataset.trEstado === 'aplicada' && !(await confirmar('¿Marcar la ventana como aplicada? Úsalo cuando sus movimientos ya se llevaron al juego.'))) return;
      const { error } = await supabase.from('lm_ventanas_reales').update({ estado: b.dataset.trEstado }).eq('id', v.id);
      if (error) throw error;
      v.estado = b.dataset.trEstado; pintar();
    } else if (b.dataset.trBorrar) {
      if (!(await confirmar('¿Quitar este movimiento de la ventana?', { peligro: true, aceptar: 'Quitar' }))) return;
      const { error } = await supabase.from('lm_traspasos_reales').delete().eq('id', Number(b.dataset.trBorrar));
      if (error) throw error;
      await cargarFilas(); pintar(); toast('Movimiento quitado.', 'ok');
    }
  } catch (e) { console.error('[traspasos reales]', e); toast(msg(e), 'error'); }
  finally { b.disabled = false; }
});

$('tr-form')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const v = ventanaActual(); if (!v) return;
  const f = new FormData(ev.target);
  const r = validarTraspaso({ pes_id: f.get('pes_id'), jugador: f.get('jugador'), tipo: f.get('tipo'), de: f.get('de'), a: f.get('a'), nota: f.get('nota') });
  if (!r.ok) { toast(r.error, 'warn'); return; }
  const boton = ev.target.querySelector('button[type=submit]'); boton.disabled = true;
  try {
    const { error } = await supabase.from('lm_traspasos_reales').insert({ ...r.datos, ventana_id: v.id, creado_por: st.yo });
    if (error) throw error;
    ev.target.reset(); await cargarFilas(); pintar(); toast('Movimiento guardado.', 'ok');
  } catch (e) { console.error('[traspasos reales]', e); toast(msg(e), 'error'); }
  finally { boton.disabled = false; }
});

if ($('tr-tipo')) $('tr-tipo').innerHTML = TIPOS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('');

onSession((s) => {
  st.yo = s?.session?.user?.id ?? null;
  if (st.iniciado || !st.yo || !can('resolverReportes') || !$('tr')) return;
  st.iniciado = true; refrescar();
});
