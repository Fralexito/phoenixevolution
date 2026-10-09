// Piezas de ayuda reutilizables: «¿cómo funciona?» de cada formato, dinámicas con su guía y leyendas. Solo devuelven HTML (texto escapado).
import { FORMATOS } from '../../core/formatos.js';
import { escapeHTML as esc } from '../../core/dom.js';
import { GUIAS_FORMATOS, DINAMICAS, GRUPOS_DINAMICAS, dinamicaPorId, LEYENDA_ESTADOS, LEYENDA_VISIBILIDAD } from '../../../data/dinamicas.js';

export const FORMATO_LIBRE = Object.freeze({ id: 'libre', nombre: 'Libre (tú decides)', icono: 'fa-pen-ruler', tono: 'divertido', min: 2, max: 256, frase: 'Tú añades los partidos que quieras.', cuando: 'Ligas inventadas, retos entre amigos, lo que se te ocurra.' });
export const FORMATOS_FICHA = Object.freeze([...FORMATOS, FORMATO_LIBRE]);
export const formatoFicha = (id) => FORMATOS_FICHA.find((f) => f.id === id) ?? null;
export const TONO = { serio: 'Serio', casual: 'Casual', divertido: 'Divertido' };

/** «¿Cómo funciona?» de un formato: pasos numerados, ejemplo y el «ojo» que más confunde. */
export function guiaFormatoHTML(id) {
  const g = GUIAS_FORMATOS[id]; const f = formatoFicha(id);
  if (!g || !f) return '';
  return `<div class="tn-guia"><p class="tn-guia-t"><i class="fa-solid ${esc(f.icono)}" aria-hidden="true"></i> ${esc(f.nombre)}: ${esc(f.frase)}</p>
    <ol>${g.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    <p class="tn-guia-ej"><b>Ejemplo:</b> ${esc(g.ejemplo)}</p>
    <p class="tn-guia-ojo"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ${esc(g.ojo)}</p></div>`;
}

/** Dinámicas activas de un torneo, cada una con su guía desplegable. */
export function dinamicasActivasHTML(ids) {
  const lista = (ids ?? []).map(dinamicaPorId).filter(Boolean);
  if (!lista.length) return '<p class="tn-vacio">Este torneo se juega con las reglas normales.</p>';
  return `<ul class="tn-dins">${lista.map((d) => `<li data-tono="${esc(d.tono)}"><details><summary><i class="fa-solid ${esc(d.icono)}" aria-hidden="true"></i><b>${esc(d.nombre)}</b><span>${esc(d.texto)}</span></summary><p>${esc(d.guia)}</p></details></li>`).join('')}</ul>`;
}

/** Selector de dinámicas para la ficha (checkbox + guía), agrupadas por tipo. */
export function selectorDinamicasHTML() {
  return GRUPOS_DINAMICAS.map((g) => {
    const items = DINAMICAS.filter((d) => d.grupo === g.id);
    return `<details class="tn-grupo-din"><summary><i class="fa-solid ${esc(g.icono)}" aria-hidden="true"></i><b>${esc(g.nombre)}</b><small>${esc(g.texto)} · ${items.length}</small></summary>
      <ul class="tn-dins tn-dins-sel">${items.map((d) => `<li data-tono="${esc(d.tono)}"><label><input type="checkbox" name="din" value="${esc(d.id)}"><span class="tn-din-n"><i class="fa-solid ${esc(d.icono)}" aria-hidden="true"></i>${esc(d.nombre)}</span><span class="tn-din-x">${esc(d.texto)}</span></label>
        <details class="tn-din-guia"><summary>¿Cómo funciona?</summary><p>${esc(d.guia)}</p></details></li>`).join('')}</ul></details>`;
  }).join('');
}

export function leyendaHTML() {
  return `<div class="tn-leyenda"><div><h3>Estados</h3><ul>${LEYENDA_ESTADOS.map((e) => `<li><i class="fa-solid ${esc(e.icono)}" aria-hidden="true"></i><b>${esc(e.nombre)}</b> ${esc(e.texto)}</li>`).join('')}</ul></div>
    <div><h3>Visibilidad</h3><ul>${LEYENDA_VISIBILIDAD.map((e) => `<li><b>${esc(e.nombre)}</b> ${esc(e.texto)}</li>`).join('')}</ul></div></div>`;
}

export const ESTADO_TXT = Object.fromEntries(LEYENDA_ESTADOS.map((e) => [e.id, e]));
