// Marcador EN VIVO de la liga (ronda 224). Lee la tabla liga_vivo (la escribe Phoenix Link por la Edge Function
// «liga») y escucha cada cambio por Realtime: sin consultas repetidas y sin coste por visitante.
// Se monta en cada <section data-liga-vivo> (components/MarcadorVivo.astro). Si no hay partidos, la sección no se ve.
// Lógica pura y pruebas: core/ligaVivo.js · tests/ligaVivo.test.mjs.
import { supabase } from '../../core/supabase.js';
import { escapeHTML } from '../../core/dom.js';
import { aplicarCambioVivo, limpiarVivos, normalizarVivo, ordenarVivos, huboGol, textoGol, textoEstado } from '../../core/ligaVivo.js';
import { rafaga, salto } from '../dopamina.js';
import { crearTablero } from './campoVivo.js';

let lista = [];
let iniciado = false;
const secciones = new Set();
const fechas = new Map();   // partido_id → «Fecha 10 · 1° Edición» (se pide una vez)
// Tablero del campo 2D (ronda 236): se despliega al pulsar la tarjeta. Una elección del visitante (true/false) manda sobre lo automático.
const eleccion = new Map();               // sala_id → true (desplegado) | false (plegado) por el visitante
const tableros = new WeakMap();           // sección → Map(sala_id → tablero abierto)

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

function tarjeta(x, abierto) {
  const enJuego = x.fase === 'en_juego' && !x.terminado;
  const previa = x.fase === 'previa' && !x.terminado;   // antes del pitazo: eligiendo equipos, saliendo al campo…
  const reloj = textoEstado(x);
  return `<div class="vivo-item${abierto ? ' vivo-abierto' : ''}" data-item="${escapeHTML(x.sala_id)}"><article class="glass-panel rounded-xl p-4 vivo-card${x.terminado ? ' vivo-fin' : ''}" data-sala="${escapeHTML(x.sala_id)}" role="button" tabindex="0" aria-expanded="${abierto ? 'true' : 'false'}" aria-label="${escapeHTML(`${x.local} contra ${x.visitante}: ${abierto ? 'plegar' : 'ver'} el campo en vivo`)}">
    <div class="flex items-center justify-between gap-2 mb-3">
      ${chipTipo(x)}
      <span class="vivo-reloj">${enJuego || previa ? '<span class="live-dot" aria-hidden="true"></span>' : ''}${escapeHTML(reloj)}</span>
    </div>
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <p class="vivo-nombre text-left">${escapeHTML(x.local)}</p>
      ${previa ? '<p class="vivo-marcador vivo-vs">VS</p>' : `<p class="vivo-marcador" aria-label="${escapeHTML(`${x.local} ${x.goles_local}, ${x.visitante} ${x.goles_visita}`)}"><span data-gl>${x.goles_local}</span><span class="text-gray-500">-</span><span data-gv>${x.goles_visita}</span></p>`}
      <p class="vivo-nombre text-right">${escapeHTML(x.visitante)}</p>
    </div>
    ${x.goles.length ? `<div class="grid grid-cols-2 gap-3 mt-3">${listaGoles(x, 'l') || '<span></span>'}${listaGoles(x, 'v')}</div>` : ''}
    <p class="vivo-mas" aria-hidden="true">${abierto ? 'Plegar campo ▲' : 'Ver campo en vivo ▼'}</p>
  </article><div data-panel></div></div>`;
}

function pintar(previas = new Map()) {
  lista = limpiarVivos(lista);
  const orden = ordenarVivos(lista);
  for (const s of secciones) {
    const cont = s.querySelector('[data-lista]');
    if (!cont) continue;
    s.hidden = orden.length === 0;
    const abiertos = tableros.get(s) ?? new Map();
    tableros.set(s, abiertos);
    // Un partido terminado conserva su tablero si ya estaba abierto (dice «Partido terminado»); nunca se abre solo
    const quiere = (x, i) => (x.terminado ? abiertos.has(x.sala_id) : eleccion.has(x.sala_id) ? eleccion.get(x.sala_id) : (s.dataset.tablero === 'auto' && i === 0));
    const deseados = new Set(orden.filter(quiere).map((x) => x.sala_id));
    for (const [id, t] of abiertos) if (!deseados.has(id)) { t.cerrar(); abiertos.delete(id); }   // se desuscribe al plegar
    cont.innerHTML = orden.map((x, i) => tarjeta(x, deseados.has(x.sala_id))).join('');
    for (const x of orden) {
      if (!deseados.has(x.sala_id)) continue;
      let t = abiertos.get(x.sala_id);
      if (!t) { t = crearTablero(x.sala_id); abiertos.set(x.sala_id, t); }
      t.actualizar({ local: x.local, visitante: x.visitante, terminado: x.terminado });
      cont.querySelector(`[data-item="${CSS.escape(x.sala_id)}"] [data-panel]`)?.appendChild(t.el);
    }
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

/** Pulsar (o Enter/Espacio sobre) la tarjeta despliega o pliega el tablero del campo. Los clics dentro del tablero no cuentan. */
function enlazarClic(s) {
  const alternar = (card) => {
    const id = card?.dataset.sala;
    if (!id) return;
    const abierto = !!tableros.get(s)?.has(id);
    eleccion.set(id, !abierto);
    pintar();
    s.querySelector(`[data-sala="${CSS.escape(id)}"]`)?.focus();
  };
  s.addEventListener('click', (e) => { const c = e.target.closest?.('[data-sala]'); if (c && s.contains(c)) alternar(c); });
  s.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest?.('[data-sala]');
    if (c && e.target === c) { e.preventDefault(); alternar(c); }
  });
}

/** Monta el marcador en vivo en todas las secciones [data-liga-vivo] de la página. */
export function montarMarcadorVivo() {
  try {
    for (const s of document.querySelectorAll('[data-liga-vivo]')) { secciones.add(s); enlazarClic(s); }
    if (secciones.size) iniciar();
  } catch (e) { console.warn('[liga vivo]', e); }
}
