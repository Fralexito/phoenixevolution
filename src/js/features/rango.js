// Piezas visuales de los RANGOS por ELO (la lógica pura vive en core/pulso.js). Solo devuelven HTML; todo texto sale de constantes propias.
import { escapeHTML } from '../core/dom.js';

/** Insignia pequeña del rango: icono + nombre, teñida con el color del metal (variable CSS --rc). '' si no hay rango. */
export const rangoChip = (r) => (r ? `<span class="rango-chip" style="--rc:${escapeHTML(r.color)}" title="Rango ${escapeHTML(r.nombre)}"><i class="fa-solid ${escapeHTML(r.icon)}" aria-hidden="true"></i>${escapeHTML(r.nombre)}</span>` : '');

/** Bloque de perfil: insignia + barra de avance hacia el siguiente rango. `p` = progresoRango(...). '' si no hay rango. */
export function rangoBloque(p, elo) {
  if (!p) return '';
  const meta = p.siguiente ? `${p.faltan} pts para ${escapeHTML(p.siguiente.nombre)}` : 'Rango máximo';
  return `<div class="rango-bloque" style="--rc:${escapeHTML(p.rango.color)}">${rangoChip(p.rango)}<span class="rango-elo">ELO <b>${Math.round(elo)}</b></span>
    <span class="rango-barra" role="img" aria-label="${meta}"><i style="width:${p.pct}%"></i></span><span class="rango-meta">${meta}</span></div>`;
}
