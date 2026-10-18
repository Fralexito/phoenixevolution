// Radar «estilo FIFA» (ronda 341). Lógica pura, sin DOM → con test. Reusa los 6 ejes de core/jugadores/estilo.js.
import { EJES } from './estilo.js';
import { stat } from '../sistema/dom.js';
import { axisPoint } from './compare.js';

/** Nivel de un valor: elite ≥90, alto ≥80, medio ≥70, bajo. */
export const nivel = (v) => (v >= 90 ? 'elite' : v >= 80 ? 'alto' : v >= 70 ? 'medio' : 'bajo');

/** Los 6 ejes de una ficha con su valor 1-99, su nivel y las stats que lo forman. */
export function ejesFifa(p, info = {}) {
  return EJES.map((e) => {
    const partes = e.keys.map((k) => ({ k, nombre: info[k]?.nombre ?? k, v: stat(p?.[k]) }));
    const valor = Math.round(partes.reduce((s, x) => s + x.v, 0) / partes.length);
    return { id: e.id, nombre: e.nombre, valor, nivel: nivel(valor), partes };
  });
}

/** Media de los 6 ejes (resumen rápido). */
export const mediaEjes = (ejes) => (ejes.length ? Math.round(ejes.reduce((s, e) => s + e.valor, 0) / ejes.length) : 0);

/** Eje más fuerte y más flojo (en empate gana el primero). */
export function extremos(ejes) {
  if (!ejes.length) return { fuerte: null, flojo: null };
  return { fuerte: ejes.reduce((m, e) => (e.valor > m.valor ? e : m)), flojo: ejes.reduce((m, e) => (e.valor < m.valor ? e : m)) };
}

/** Geometría del hexágono: vértices del polígono del jugador, del borde (100 %) y de cada anillo. El centro vale 0 y el borde 99. */
export function geometria(ejes, { cx = 150, cy = 150, r = 100 } = {}) {
  const n = ejes.length;
  const punto = (i, t) => axisPoint(i, n, cx, cy, r * t).map((x) => Math.round(x * 10) / 10);
  const jugador = ejes.map((e, i) => punto(i, Math.max(0, Math.min(99, e.valor)) / 99));
  const borde = ejes.map((_, i) => punto(i, 1));
  const anillos = [0.25, 0.5, 0.75].map((t) => ejes.map((_, i) => punto(i, t)));
  const etiquetas = ejes.map((_, i) => punto(i, 1.22));
  return { jugador, borde, anillos, etiquetas };
}
export const aPuntos = (pts) => pts.map((p) => p.join(',')).join(' ');
