// Lógica PURA de /social/ (sin DOM ni red → se prueba con `npm test`): círculos de historias, mis reacciones y contadores.
import { normalizarHistorias, hayNuevas } from './historias.js';
import { resumenReacciones } from './muro.js';

/** Reacción de un toque (el «me gusta» de la web). Está en la paleta de reacciones del muro. */
export const REACCION_RAPIDA = '🔥';

/**
 * Círculos de la fila de historias a partir de `historias_recientes` (migración 056).
 * Cada círculo: { autor, historias (normalizadas y no vacías), nuevas (¿hay alguna sin ver?), mia }.
 * Orden: la mía primero → las que tienen historias sin ver → las ya vistas; dentro de cada grupo, la más reciente primero.
 * @param {object[]} items  @param {{yo?: string|null, vistas?: Record<number, 1>}} opciones
 */
export function circulosHistorias(items, { yo = null, vistas = {} } = {}) {
  const lista = (Array.isArray(items) ? items : []).map((it) => {
    const historias = normalizarHistorias(it?.historias);
    const autor = it?.autor && it.autor.id ? it.autor : null;
    if (!autor || !historias.length) return null;
    return { autor, historias, nuevas: hayNuevas(historias, vistas), mia: !!yo && autor.id === yo, ultima: Number(it.ultima) || historias[historias.length - 1].id };
  }).filter(Boolean);
  const rango = (c) => (c.mia ? 0 : c.nuevas ? 1 : 2);
  return lista.sort((a, b) => rango(a) - rango(b) || b.ultima - a.ultima);
}

/** Respuesta de `mis_reacciones` ({ "123": "🔥" }) → Map(id → emoji). Descarta claves o valores raros. */
export function mapaMisReacciones(obj) {
  const m = new Map();
  if (!obj || typeof obj !== 'object') return m;
  for (const [k, v] of Object.entries(obj)) { const id = Number(k); if (Number.isInteger(id) && id > 0 && typeof v === 'string' && v) m.set(id, v); }
  return m;
}

/** Marca en cada publicación mi reacción (`mia`, null si no reaccioné). No muta la lista original. */
export const conMisReacciones = (items, mapa) => (items ?? []).map((it) => ({ ...it, mia: mapa?.get(Number(it.id)) ?? null }));

/** Total de reacciones de una publicación (suma de todos los emojis válidos). */
export const totalReacciones = (it) => resumenReacciones(it?.reacciones).reduce((s, x) => s + x.n, 0);

/** Texto del contador de respuestas: «Comentar», «1 respuesta», «5 respuestas». */
export const textoRespuestas = (n) => { const k = Math.max(0, Math.trunc(Number(n) || 0)); return k === 0 ? 'Responder' : k === 1 ? '1 respuesta' : `${k} respuestas`; };
