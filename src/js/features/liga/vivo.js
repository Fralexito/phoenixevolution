// Marcador EN VIVO de la liga (ronda 224). Lee la tabla liga_vivo (la escribe Phoenix Link por la Edge Function
// «liga») y escucha cada cambio por Realtime: sin consultas repetidas y sin coste por visitante.
// Se monta en cada <section data-liga-vivo> (components/MarcadorVivo.astro). Si no hay partidos, la sección no se ve.
// Lógica pura y pruebas: core/ligaVivo.js · tests/ligaVivo.test.mjs.
import { supabase } from '../../core/supabase.js';
import { escapeHTML } from '../../core/dom.js';
import { aplicarCambioVivo, limpiarVivos, normalizarVivo, ordenarVivos, huboGol, textoGol, FASES_VIVO } from '../../core/ligaVivo.js';
import { rafaga, salto } from '../dopamina.js';

const PERIODOS = { 1: '1.er tiempo', 2: '2.º tiempo', 3: 'Prórroga 1', 4: 'Prórroga 2', 5: 'Penales' };

let lista = [];
let iniciado = false;
const secciones = new Set();
const fechas = new Map();   // partido_id → «Fecha 10 · 1° Edición» (se pide una vez)

function chipTipo(x) {
  if (!x.partido_id) return '<span class="vivo-chip">Amistoso</span>';
  const f = fechas.get(x.partido_id);
  return `<span class="vivo-chip vivo-chip-oficial"><i class="fa-solid fa-trophy" aria-hidden="true"></i> Oficial${f ? ` · ${escapeHTML(f)}` : ''}</span>`;
}

function listaGoles(x, lado) {
  const gs = x.goles.filter((g) => g.l === lado);
  if (!gs.length) return '';
  return `<ul class="vivo-goles ${lado === 'v' ? 'text-right' : ''}">${gs.map((g) => `<li>⚽ ${escapeHTML(textoGol(g))}</li>`).join('')}</ul>`;
}

function tarjeta(x) {
  const fase = FASES_VIVO[x.fase] ?? 'En juego';
  const enJuego = x.fase === 'en_juego' && !x.terminado;
  const reloj = x.terminado || x.fase === 'final' ? 'Final'
    : x.fase === 'previa' ? 'Previa'
    : `${x.minuto}′ · ${x.fase === 'en_juego' ? (PERIODOS[x.periodo] ?? fase) : fase}`;
  return `<article class="glass-panel rounded-xl p-4 vivo-card${x.terminado ? ' vivo-fin' : ''}" data-sala="${escapeHTML(x.sala_id)}">
    <div class="flex items-center justify-between gap-2 mb-3">
      ${chipTipo(x)}
      <span class="vivo-reloj">${enJuego ? '<span class="live-dot" aria-hidden="true"></span>' : ''}${escapeHTML(reloj)}</span>
    </div>
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <p class="vivo-nombre text-left">${escapeHTML(x.local)}</p>
      <p class="vivo-marcador" aria-label="${escapeHTML(`${x.local} ${x.goles_local}, ${x.visitante} ${x.goles_visita}`)}"><span data-gl>${x.goles_local}</span><span class="text-gray-500">-</span><span data-gv>${x.goles_visita}</span></p>
      <p class="vivo-nombre text-right">${escapeHTML(x.visitante)}</p>
    </div>
    ${x.goles.length ? `<div class="grid grid-cols-2 gap-3 mt-3">${listaGoles(x, 'l') || '<span></span>'}${listaGoles(x, 'v')}</div>` : ''}
  </article>`;
}

function pintar(previas = new Map()) {
  lista = limpiarVivos(lista);
  const orden = ordenarVivos(lista);
  for (const s of secciones) {
    const cont = s.querySelector('[data-lista]');
    if (!cont) continue;
    s.hidden = orden.length === 0;
    cont.innerHTML = orden.map(tarjeta).join('');
    const cuenta = s.querySelector('[data-cuenta]');
    if (cuenta) cuenta.textContent = orden.length ? String(orden.length) : '';
    // Efecto de gol (solo si cambió el marcador y la capa «dopamina» está encendida)
    for (const x of orden) {
      if (!huboGol(previas.get(x.sala_id), x)) continue;
      const card = cont.querySelector(`[data-sala="${CSS.escape(x.sala_id)}"]`);
      const marcador = card?.querySelector('.vivo-marcador');
      if (marcador) { salto(marcador); rafaga(marcador, ['⚽', '🔥', '✨'], { n: 10 }); }
    }
  }
}

async function cargarFechas(ids) {
  const faltan = [...new Set(ids)].filter((id) => id && !fechas.has(id));
  if (!faltan.length) return false;
  for (const id of faltan) fechas.set(id, '');   // no pedir dos veces
  const { data, error } = await supabase.from('liga_partidos').select('id, fecha, liga_ediciones(nombre)').in('id', faltan);
  if (error) { console.warn('[liga vivo] fechas:', error.message); return false; }
  for (const p of data ?? []) fechas.set(p.id, `Fecha ${p.fecha}${p.liga_ediciones?.nombre ? ` · ${p.liga_ediciones.nombre}` : ''}`);
  return true;
}

function alCambiar(cambio) {
  const previas = new Map(lista.map((x) => [x.sala_id, x]));
  lista = aplicarCambioVivo(lista, cambio);
  pintar(previas);
  const nuevo = cambio?.new?.partido_id;
  if (nuevo) cargarFechas([Number(nuevo)]).then((hay) => { if (hay) pintar(); }).catch(() => {});
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  supabase.from('liga_vivo').select('*').order('actualizado', { ascending: false }).limit(30)
    .then(async ({ data, error }) => {
      if (error) { console.warn('[liga vivo] carga:', error.message); return; }
      // Lo que llegó por Realtime antes de la carga manda (es más nuevo)
      const yaVivos = new Set(lista.map((x) => x.sala_id));
      lista = [...lista, ...(data ?? []).map(normalizarVivo).filter((x) => x && !yaVivos.has(x.sala_id))];
      pintar();
      if (await cargarFechas(lista.map((x) => x.partido_id))) pintar();
    })
    .catch((e) => console.warn('[liga vivo] carga:', e));
  try {
    supabase.channel('liga-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liga_vivo' }, alCambiar)
      .subscribe();
  } catch (e) { console.warn('[liga vivo] realtime:', e); }
  // Las tarjetas «Final» se van solas a los 30 s
  setInterval(() => { if (lista.some((x) => x.terminado)) pintar(); }, 5000);
}

/** Monta el marcador en vivo en todas las secciones [data-liga-vivo] de la página. */
export function montarMarcadorVivo() {
  try {
    for (const s of document.querySelectorAll('[data-liga-vivo]')) secciones.add(s);
    if (secciones.size) iniciar();
  } catch (e) { console.warn('[liga vivo]', e); }
}
