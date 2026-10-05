// Reputación (migración 044): lógica PURA — etiquetas válidas, validación de la valoración y presentación del nivel.
// La BD vuelve a comprobar todo; aquí solo se adelantan mensajes claros y se protege la pantalla de datos raros.
export const ETIQUETAS = {
  positivas: [['puntual', 'Puntual'], ['buena_conexion', 'Buena conexión'], ['deportivo', 'Deportivo']],
  negativas: [['lag', 'Lag'], ['abandono', 'Abandonó'], ['insultos', 'Insultos']],
};
const TODAS = new Map([...ETIQUETAS.positivas, ...ETIQUETAS.negativas]);
export const nombreEtiqueta = (id) => TODAS.get(id) ?? id;
export const NIVELES = {
  nuevo:     { etiqueta: 'Nuevo',     icono: 'fa-seedling',  clase: 'text-gray-300 border-galaxy-border' },
  novato:    { etiqueta: 'Novato',    icono: 'fa-user',      clase: 'text-gray-200 border-galaxy-border' },
  confiable: { etiqueta: 'Confiable', icono: 'fa-handshake', clase: 'text-emerald-300 border-emerald-400/40' },
  veterano:  { etiqueta: 'Veterano',  icono: 'fa-medal',     clase: 'text-cyan-300 border-cyan-400/40' },
  leyenda:   { etiqueta: 'Leyenda',   icono: 'fa-crown',     clase: 'text-amber-300 border-amber-400/40' },
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const txt = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

/** Mismas reglas que la BD. → { ok, error?, valores? } */
export function validarValoracion({ estrellas, etiquetas } = {}) {
  const e = Number(estrellas), et = [...new Set(Array.isArray(etiquetas) ? etiquetas : [])];
  if (!Number.isInteger(e) || e < 1 || e > 5) return { ok: false, error: 'Elige de 1 a 5 estrellas.' };
  if (et.some((t) => !TODAS.has(t))) return { ok: false, error: 'Hay una etiqueta no válida.' };
  if (et.length > 4) return { ok: false, error: 'Máximo 4 etiquetas.' };
  const neg = et.some((t) => ETIQUETAS.negativas.some(([id]) => id === t)), pos = et.some((t) => ETIQUETAS.positivas.some(([id]) => id === t));
  if (e <= 2 && !neg) return { ok: false, error: 'Con 1 o 2 estrellas elige al menos una etiqueta que explique qué pasó.' };
  if (e <= 2 && pos) return { ok: false, error: 'Con 1 o 2 estrellas no se pueden usar etiquetas positivas.' };
  if (e >= 4 && neg) return { ok: false, error: 'Con 4 o 5 estrellas no se pueden usar etiquetas negativas.' };
  return { ok: true, valores: { estrellas: e, etiquetas: et } };
}
/** Etiquetas que se ofrecen según las estrellas elegidas (evita combinaciones que la BD rechazaría). */
export const etiquetasPara = (estrellas) => { const e = Number(estrellas); return !e ? [] : e <= 2 ? ETIQUETAS.negativas : e >= 4 ? ETIQUETAS.positivas : []; };   // con 3 estrellas no hay etiquetas: es neutral

export function normalizarReputacion(d) {
  if (!d || d.visible !== true) return null;
  const nivel = NIVELES[d.nivel] ? d.nivel : 'nuevo', cuenta = (o) => Object.entries(o && typeof o === 'object' ? o : {}).filter(([k]) => TODAS.has(k)).map(([k, v]) => ({ id: k, nombre: nombreEtiqueta(k), n: num(v) })).sort((a, b) => b.n - a.n);
  return { nivel, ...NIVELES[nivel], valoraciones: num(d.valoraciones), puntaje: d.puntaje == null ? null : num(d.puntaje), positivas: cuenta(d.positivas), negativas: cuenta(d.negativas) };
}
export function normalizarPendientes(l) {
  return (Array.isArray(l) ? l : []).filter((p) => p && p.reto_id && p.usuario_id).map((p) => ({ reto: num(p.reto_id), usuario: String(p.usuario_id), username: txt(p.username, 40), nombre: txt(p.nombre || p.username, 60), avatar: p.avatar_url ?? '' }));
}
/** «★ 4.5 · Confiable» o «Nuevo» (sin número hasta tener 3 valoraciones). */
export const textoSello = (r) => (!r ? '' : r.puntaje == null ? r.etiqueta : `${r.puntaje.toFixed(1)} ★ · ${r.etiqueta}`);
