// Sala en vivo de un duelo — lógica PURA (sin DOM → `npm test`). Datos de sala_en_vivo (migración 157). Nunca lanza.
/** Porcentajes de la predicción (redondeados para que sumen 100). */
export function porcentajes(p) {
  const a = Math.max(0, Number(p?.a) || 0), b = Math.max(0, Number(p?.b) || 0), e = Math.max(0, Number(p?.e) || 0);
  const t = a + b + e;
  if (!t) return { a: 0, b: 0, e: 0, total: 0 };
  const pa = Math.round((a * 100) / t), pb = Math.round((b * 100) / t);
  return { a: pa, b: pb, e: Math.max(0, 100 - pa - pb), total: t };
}
/** Une los mensajes nuevos con los que ya había, sin repetir y quitando los ocultos; máximo 200 en pantalla. */
export function unirMensajes(previos, nuevos, ocultos = []) {
  const quitar = new Set((ocultos ?? []).map(Number));
  const m = new Map();
  for (const x of [...(previos ?? []), ...(nuevos ?? [])]) if (x && Number.isFinite(Number(x.id)) && !quitar.has(Number(x.id))) m.set(Number(x.id), x);
  return [...m.values()].sort((x, y) => Number(x.id) - Number(y.id)).slice(-200);
}
export const ultimoId = (lista) => (lista?.length ? Math.max(...lista.map((x) => Number(x.id) || 0)) : 0);
export const ETIQUETA_ROL = { jugador: 'Jugador', host: 'Host', espectador: '', staff: 'Staff' };
