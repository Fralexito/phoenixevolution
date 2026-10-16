// Pestaña «Pase» de la tienda: Phoenix Pass (pase de temporada). Pista gratis y pista premium, progreso por XP, compra única con gemas y reclamo de premios.
// Esquema: pages/tienda → features/economia/pase → features/economia/api → core/phoenix-pass (puro). Las reglas reales viven en la base (migración 123).
import { escapeHTML } from '../../core/dom.js';
import { openModal, closeModal } from '../../core/modal.js';
import { vacioHTML } from '../../core/vacio.js';
import { href } from '../../core/config.js';
import * as api from './api.js';
import { vistaPrevia, formatoTokens, RAREZAS } from '../../core/economia.js';
import { estadoPremio, resumenPase, costeNeto, reclamablesYa, textoPremio, textoTiempo, solesAprox } from '../../core/phoenix-pass.js';

let C = null; // contexto que entrega la página: { S, hacer, cargar }
export const iniciar = (ctx) => { C = ctx; };

/** Se pide siempre (también sin sesión: el pase es público). Si la base aún no tiene la migración 123, devuelve null sin molestar al resto de la tienda. */
export async function cargarDatos() {
  const pase = await api.paseEstado().catch((e) => { console.warn('[pase]', e?.message); return null; });
  return { pase };
}

const cab = (t) => `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">${escapeHTML(t)}</h3><button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button></div>`;

function celdaHTML(fila, pista, p) {
  const premio = fila[pista];
  if (!premio) return '<div class="px-2 py-2 text-[12px] text-gray-600 text-center">—</div>';
  const est = estadoPremio(fila, pista, p.yo), raro = premio.item ? RAREZAS[premio.item.rareza] : null;
  const icono = premio.tipo === 'item' ? vistaPrevia(premio.item) : `<i class="fa-solid ${premio.tipo === 'gemas' ? 'fa-gem text-cyan-300' : 'fa-fire text-amber-300'} text-lg"></i>`;
  const accion = { reclamada: '<span class="text-emerald-300 text-[12px] font-display uppercase tracking-wider"><i class="fa-solid fa-check"></i> Reclamado</span>',
    reclamable: `<button type="button" class="btn btn-primary !min-h-8 !px-2 !text-[12px] w-full" data-pase-reclamar="${fila.nivel}" data-pista="${pista}">Reclamar</button>`,
    requiere_premium: '<span class="text-amber-300 text-[12px]"><i class="fa-solid fa-lock"></i> Con el pase</span>',
    bloqueado: '<span class="text-gray-500 text-[12px]"><i class="fa-solid fa-lock"></i> Nivel ' + fila.nivel + '</span>' }[est] ?? '';
  return `<div class="flex flex-col gap-1 px-2 py-2 min-w-0"><div class="flex items-center gap-2 min-w-0"><div class="w-10 h-9 flex items-center justify-center shrink-0">${icono}</div>
    <div class="min-w-0 flex-1"><p class="text-[13px] text-white leading-tight break-words">${escapeHTML(textoPremio(premio))}</p>${raro ? `<p class="text-[12px] ${raro.clase.split(' ')[0]}">${raro.etiqueta}</p>` : ''}</div></div><div>${accion}</div></div>`;
}

function cabeceraHTML(p) {
  const t = p.temporada, y = p.yo, res = resumenPase(p.niveles), regreso = res.premium.gemas, neto = costeNeto(t.precioGemas, regreso);
  const lleno = y ? Math.round(y.progreso * 100) : 0, listos = y ? reclamablesYa(p.niveles, y) : 0;
  const compra = !y ? '<p class="text-xs text-gray-400">Inicia sesión para jugar la temporada y reclamar premios.</p>'
    : y.tengoPremium ? '<p class="text-sm text-emerald-300 font-display uppercase tracking-wider"><i class="fa-solid fa-circle-check"></i> Tienes el pase premium</p>'
    : t.enGracia ? '<p class="text-xs text-gray-400">La temporada terminó: ya no se puede comprar el pase, pero aún puedes reclamar lo que ganaste.</p>'
    : `<button type="button" class="btn btn-primary" data-pase-comprar><i class="fa-solid fa-gem"></i> Comprar el pase · ${formatoTokens(t.precioGemas)} gemas <span class="opacity-80">(≈ S/ ${solesAprox(t.precioGemas).toLocaleString('es-PE')})</span></button>
       <p class="text-[12px] text-gray-400 mt-2">Pago único por esta temporada. <b class="text-white">No se renueva solo.</b> Te devuelve ${formatoTokens(regreso)} gemas si llegas al final: cuesta ${formatoTokens(neto)} de verdad.</p>`;
  return `<section class="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="text-[12px] uppercase tracking-widest text-gray-400 font-display">Phoenix Pass</p><h2 class="font-display font-extrabold text-2xl text-white">${escapeHTML(t.nombre)}</h2></div>
      <p class="text-xs text-amber-300 font-display uppercase tracking-wider"><i class="fa-regular fa-clock"></i> ${escapeHTML(textoTiempo(t))}</p></div>
    ${y ? `<div><div class="flex justify-between text-sm"><b class="text-white font-display">Nivel ${y.nivel} de ${t.niveles}</b><span class="text-gray-400 text-xs">${y.nivel >= t.niveles ? '¡Completaste el pase!' : `${formatoTokens(y.xpEnNivel)} / ${formatoTokens(t.xpPorNivel)} XP para el siguiente`}</span></div>
      <div class="h-2 mt-1 rounded-full bg-galaxy-800 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${lleno}" aria-label="Progreso del nivel"><div class="h-full bg-gradient-to-r from-galaxy-600 to-galaxy-400" style="width:${lleno}%"></div></div>
      ${listos ? `<p class="text-xs text-emerald-300 mt-2"><i class="fa-solid fa-gift"></i> Tienes ${listos} premio${listos === 1 ? '' : 's'} listo${listos === 1 ? '' : 's'} para reclamar.</p>` : ''}</div>` : ''}
    ${compra}
    <p class="text-[12px] text-gray-400">Ganas XP jugando partidos, retos y valoraciones; cada ${formatoTokens(t.xpPorNivel)} XP de la temporada subes un nivel. Solo cuenta la XP de esta temporada. El pase es solo cosmético: no da ventaja en el juego.</p>
  </section>`;
}

function nivelesHTML(p) {
  const filas = p.niveles.map((f) => `<li class="grid grid-cols-[2.5rem_1fr_1fr] items-center border-t border-galaxy-border/40 ${p.yo && p.yo.nivel >= f.nivel ? 'bg-galaxy-800/30' : ''}">
    <span class="text-center font-display font-bold text-sm ${p.yo && p.yo.nivel >= f.nivel ? 'text-galaxy-400' : 'text-gray-500'}">${f.nivel}</span>${celdaHTML(f, 'gratis', p)}${celdaHTML(f, 'premium', p)}</li>`).join('');
  return `<section class="glass-panel rounded-2xl overflow-hidden"><ul aria-label="Premios por nivel">
    <li class="grid grid-cols-[2.5rem_1fr_1fr] text-[12px] uppercase tracking-widest font-display text-gray-400 py-2"><span class="text-center">Nv</span><span class="px-2">Pista gratis</span><span class="px-2 text-amber-300"><i class="fa-solid fa-crown"></i> Pista premium</span></li>${filas}</ul></section>`;
}

function organizadoresHTML() {
  return `<section class="glass-panel rounded-2xl p-4 space-y-2"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-trophy text-amber-300"></i> Para organizadores: torneo premium</h3>
    <p class="text-xs text-gray-300">Si organizas un torneo, en su página aparece el botón <b>«Hacer premium»</b> (se paga con gemas, una vez por torneo). Marca el torneo como premium y desbloquea las herramientas de presentación: overlay de transmisión, llaves, estadísticas y página propia. No da ventajas de juego.</p>
    <a class="btn btn-ghost !min-h-9 !px-3 !text-xs" href="${href('torneos/')}"><i class="fa-solid fa-trophy"></i> Ir a Torneos</a></section>`;
}

export function paseHTML() {
  const p = C.S.pase;
  if (!p) return vacioHTML('El pase todavía no está activado en esta base de datos.', { icono: 'fa-ticket' });
  if (!p.activo) return vacioHTML(p.proxima ? `La próxima temporada («${p.proxima.nombre}») empieza pronto.` : 'Ahora no hay una temporada abierta.', { icono: 'fa-ticket' }) + organizadoresHTML();
  return `<div class="space-y-3">${cabeceraHTML(p)}${nivelesHTML(p)}${organizadoresHTML()}</div>`;
}

/** Cuántos premios hay para reclamar (para el aviso de la pestaña). */
export const pendientes = () => (C?.S.pase?.activo && C.S.pase.yo ? reclamablesYa(C.S.pase.niveles, C.S.pase.yo) : 0);

function modalComprar() {
  const p = C.S.pase, t = p.temporada, gemas = C.S.eco?.gemas ?? 0, despues = gemas - t.precioGemas;
  const m = openModal(`<div class="p-5 sm:p-6 space-y-4">${cab('Comprar el Phoenix Pass')}
    <p class="text-sm text-gray-300"><b class="text-white">${escapeHTML(t.nombre)}</b>: abre la pista premium (objetos exclusivos, ascuas y gemas de regreso).</p>
    <dl class="text-sm space-y-1"><div class="flex justify-between"><dt class="text-gray-400">Precio</dt><dd class="font-display font-bold text-white"><i class="fa-solid fa-gem text-cyan-300"></i> ${formatoTokens(t.precioGemas)} gemas</dd></div>
      <div class="flex justify-between"><dt class="text-gray-400">Te quedarán</dt><dd class="font-display font-bold ${despues < 0 ? 'text-rose-300' : 'text-white'}">${formatoTokens(despues)} gemas</dd></div></dl>
    <p class="text-[12px] text-gray-400">Pago único. No se renueva solo. Es solo cosmético.</p>
    ${despues < 0 ? '<p class="text-xs text-rose-300">No te alcanzan las gemas. Puedes conseguirlas en la pestaña «Comprar gemas».</p>' : ''}
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="button" id="tm-pase-ok" class="btn btn-primary"${despues < 0 ? ' disabled' : ''}>Comprar</button></div></div>`, { id: 'tienda-modal' });
  m.querySelector('#tm-pase-ok')?.addEventListener('click', () => { closeModal('tienda-modal'); C.hacer(() => api.paseComprar(), '¡Pase premium activado! Ya puedes reclamar la pista premium.'); });
}

/** Devuelve true si el clic era del pase. */
export function click(ev) {
  const b = ev.target.closest('button'); if (!b) return false;
  if (b.dataset.paseComprar !== undefined) { modalComprar(); return true; }
  if (b.dataset.paseReclamar) {
    const nivel = Number(b.dataset.paseReclamar), pista = b.dataset.pista === 'premium' ? 'premium' : 'gratis';
    C.hacer(() => api.paseReclamar(nivel, pista), (r) => (r?.tipo === 'item' ? `¡Objeto añadido a tu inventario: ${r.objeto}!` : r?.compensado ? 'Ya tenías ese objeto: te dimos 100 ascuas.' : `¡Premio reclamado: ${textoPremio({ tipo: r?.tipo, cantidad: Number(r?.cantidad) || 0 })}!`));
    return true;
  }
  return false;
}
