// Pestaña «Cómo ganar» (Fase B, migración 120): recompensa diaria con racha, primer partido del día, misiones semanales y premios de logros.
// Esquema: pages/tienda → features/economia/ganar → features/economia/api → core/ganarAscuas (puro). La base decide de verdad al reclamar.
import { escapeHTML } from '../../core/sistema/dom.js';
import { vacioHTML } from '../../core/sistema/vacio.js';
import { rafaga } from '../dopamina.js';
import * as api from './api.js';
import { formatoTokens } from '../../core/economia/economia.js';
import { textoRachaDiaria, porcentaje, textoTermina, pendientesPorReclamar, diasHechosCiclo, ascuasRacha, CICLO_RACHA } from '../../core/economia/ganarAscuas.js';

let C = null; // contexto que entrega la página: { S, hacer }
export const iniciar = (ctx) => { C = ctx; };

export async function cargarDatos(sesion, pedir) {
  return { ganar: sesion ? await pedir(api.misAscuasExtra(), null) : null };
}

const NIVEL = { bronce: 'text-amber-600', plata: 'text-gray-300', oro: 'text-yellow-300' };
const barra = (p, m, etiqueta) => `<div class="h-2 flex-1 rounded-full bg-galaxy-800 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="${m}" aria-valuenow="${p}" aria-label="${escapeHTML(etiqueta)}"><div class="h-full bg-gradient-to-r from-galaxy-400 to-cyan-300" style="width:${porcentaje(p, m)}%"></div></div>`;
const boton = (atrib, texto, ok) => `<button type="button" ${atrib} class="btn ${ok ? 'btn-primary' : 'btn-ghost opacity-60'} !min-h-8 !px-3 !text-[12px] shrink-0" ${ok ? '' : 'disabled'}>${texto}</button>`;
const ascuasTxt = (n) => `<span class="text-amber-300 font-display font-bold"><i class="fa-solid fa-fire"></i> +${formatoTokens(n)}</span>`;

function rachaHTML(g) {
  const r = g.racha, hechos = diasHechosCiclo(r);
  const dias = Array.from({ length: CICLO_RACHA }, (_, i) => {
    const d = i + 1, ok = d <= hechos, hoy = !r.reclamadaHoy && d === hechos + 1;
    return `<li class="flex-1 min-w-[2.6rem] rounded-xl border px-1 py-2 text-center ${ok ? 'border-emerald-400/50 bg-emerald-400/10' : hoy ? 'border-amber-300/70 bg-amber-300/10' : 'border-galaxy-border/60'}" ${hoy ? 'aria-current="step"' : ''}>
      <p class="text-[11px] uppercase text-gray-400 font-display">Día ${d}</p><p class="text-xs font-display font-bold ${ok ? 'text-emerald-300' : 'text-amber-300'}">${ok ? '<i class="fa-solid fa-check"></i>' : '+' + ascuasRacha(d)}</p></li>`;
  }).join('');
  return `<section class="glass-panel rounded-2xl p-4"><div class="flex flex-wrap items-center gap-3"><div class="flex-1 min-w-[12rem]"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Recompensa diaria</h3>
      <p class="text-xs text-gray-300 mt-1">${escapeHTML(textoRachaDiaria(r))}</p>${r.mejor > 0 ? `<p class="text-[12px] text-gray-500">Tu mejor racha: ${r.mejor} ${r.mejor === 1 ? 'día' : 'días'}. Si falta un día, la racha vuelve a empezar.</p>` : ''}</div>
    ${boton('data-ganar-racha', r.reclamadaHoy ? '<i class="fa-solid fa-check"></i> Reclamada hoy' : `<i class="fa-solid fa-gift"></i> Reclamar +${r.ascuasSiguiente}`, !r.reclamadaHoy)}</div>
    <ol class="flex gap-1.5 mt-3" aria-label="Días de tu racha">${dias}</ol>
    ${g.primerPartido.ascuas ? `<p class="text-xs mt-3 ${g.primerPartido.ganadoHoy ? 'text-emerald-300' : 'text-gray-300'}"><i class="fa-solid ${g.primerPartido.ganadoHoy ? 'fa-circle-check' : 'fa-futbol'}"></i> Primer partido del día: ${ascuasTxt(g.primerPartido.ascuas)} ${g.primerPartido.ganadoHoy ? '· ya lo recibiste hoy' : '· se suma solo al confirmar tu primer marcador'}</p>` : ''}</section>`;
}
function misionHTML(m) {
  return `<li class="py-3"><div class="flex flex-wrap items-center gap-2"><div class="flex-1 min-w-[10rem]"><p class="text-sm text-white font-display font-bold">${escapeHTML(m.titulo)} ${ascuasTxt(m.ascuas)}</p><p class="text-[12px] text-gray-400">${escapeHTML(m.descripcion)}</p></div>
    ${m.cobrado ? '<span class="text-xs text-emerald-300"><i class="fa-solid fa-circle-check"></i> Reclamada</span>' : boton(`data-ganar-mision="${escapeHTML(m.clave)}"`, 'Reclamar', m.cobrable)}</div>
    <div class="mt-2 flex items-center gap-2">${barra(m.progreso, m.meta, 'Progreso de ' + m.titulo)}<span class="text-[12px] text-gray-400 w-12 text-right">${m.progreso}/${m.meta}</span></div></li>`;
}
function logroHTML(l) {
  return `<li class="py-2.5 flex flex-wrap items-center gap-2"><i class="fa-solid ${l.icono} ${NIVEL[l.nivel]} w-6 text-center" aria-hidden="true"></i>
    <div class="flex-1 min-w-[10rem]"><p class="text-sm text-white">${escapeHTML(l.titulo)} ${ascuasTxt(l.ascuas)}</p><p class="text-[12px] text-gray-400">${escapeHTML(l.descripcion)}${l.obtenido ? '' : ` · ${l.progreso}/${l.meta}`}</p></div>
    ${l.cobrado ? '<span class="text-xs text-emerald-300"><i class="fa-solid fa-circle-check"></i> Reclamado</span>' : l.obtenido ? boton(`data-ganar-logro="${escapeHTML(l.clave)}"`, 'Reclamar', true) : '<span class="text-[12px] text-gray-500"><i class="fa-solid fa-lock"></i> Por conseguir</span>'}</li>`;
}

/** HTML que se antepone a la lista de reglas de «Cómo ganar». Vacío si no hay sesión; aviso si la base aún no tiene la Fase B. */
export function ganarExtraHTML() {
  const S = C.S;
  if (!S.yo) return '';
  const g = S.ganar;
  if (!g) return vacioHTML('Las misiones y logros aún no están disponibles.', { icono: 'fa-fire' });
  const n = pendientesPorReclamar(g);
  const aviso = n > 0 ? `<p class="rounded-xl border border-amber-300/50 bg-amber-300/10 text-amber-200 text-xs px-3 py-2" role="status"><i class="fa-solid fa-gift"></i> Tienes ${n} ${n === 1 ? 'recompensa lista' : 'recompensas listas'} para reclamar.</p>` : '';
  const misiones = `<section class="glass-panel rounded-2xl p-4"><div class="flex flex-wrap items-baseline gap-2"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Misiones de la semana</h3><span class="text-[12px] text-gray-500">${escapeHTML(textoTermina(g.misiones.semanaFin))}</span></div>
    ${g.misiones.items.length ? `<ul class="divide-y divide-galaxy-border/40">${g.misiones.items.map(misionHTML).join('')}</ul>` : '<p class="text-xs text-gray-500 mt-1">Sin misiones esta semana.</p>'}
    <p class="text-[12px] text-gray-500">Cada semana hay 3 misiones nuevas. Cuentan los partidos con marcador confirmado.</p></section>`;
  const logros = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Logros con premio</h3>
    ${g.logros.items.length ? `<ul class="divide-y divide-galaxy-border/40 mt-1">${g.logros.items.map(logroHTML).join('')}</ul>` : '<p class="text-xs text-gray-500 mt-1">Aún no hay logros con premio.</p>'}
    <p class="text-[12px] text-gray-500 mt-1">Cada logro se reclama una sola vez. Puedes reclamar hasta ${g.logros.topeDia} ascuas de logros al día (hoy llevas ${g.logros.usadoHoy}).</p></section>`;
  return `<div class="space-y-3 mb-3">${aviso}${rachaHTML(g)}${misiones}${logros}</div>`;
}

/** Clics de la pestaña. Devuelve true si el clic era suyo. */
export function click(ev) {
  const b = ev.target.closest('button'); if (!b) return false;
  const d = b.dataset;
  if ('ganarRacha' in d) C.hacer(() => api.reclamarRachaDiaria(), (r) => { rafaga(b, ['🔥', '✨', '⭐', '🎁'], { n: 14 }); return `¡Racha de ${r?.racha ?? ''} ${r?.racha === 1 ? 'día' : 'días'}! +${r?.ascuas ?? ''} ascuas.`; });
  else if (d.ganarMision) C.hacer(() => api.reclamarMision(d.ganarMision), (n) => { rafaga(b, ['🏅', '✨', '⭐'], { n: 12 }); return `¡Misión cumplida! +${n} ascuas.`; });
  else if (d.ganarLogro) C.hacer(() => api.reclamarLogro(d.ganarLogro), (n) => { rafaga(b, ['🏆', '✨', '⭐'], { n: 12 }); return `¡Logro reclamado! +${n} ascuas.`; });
  else return false;
  return true;
}
