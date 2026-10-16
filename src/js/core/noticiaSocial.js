// NOTICIAS SOCIALES · lógica pura (ronda 350). Sin DOM ni Supabase: se prueba en tests/noticiaSocial.test.mjs.
// La base (migración 124) es la que manda; esto solo ordena lo que llega y calcula lo que se pinta.

/** Los 5 emojis acordados con FRALEX, en el orden en que se muestran. `id` = valor guardado en la base. */
export const EMOJIS = Object.freeze([
  { id: 'fuego', emoji: '🔥', nombre: 'Fuego' },
  { id: 'risa', emoji: '😂', nombre: 'Risa' },
  { id: 'sorpresa', emoji: '😮', nombre: 'Sorpresa' },
  { id: 'aplauso', emoji: '👏', nombre: 'Aplauso' },
  { id: 'calavera', emoji: '💀', nombre: 'Calavera' },
]);
export const MAX_COMENTARIO = 500;
const IDS = new Set(EMOJIS.map((e) => e.id));

/** Estado vacío (noticia sin nada, o cuando la base no respondió). */
export const vacio = () => ({ reacciones: {}, mi_reaccion: null, encuesta: null, comentarios_total: 0, comentarios: [] });

/** Normaliza lo que devuelve `noticia_social`: nunca deja huecos (null/undefined) que rompan el pintado. */
export function normalizarSocial(raw) {
  const s = { ...vacio(), ...(raw && typeof raw === 'object' ? raw : {}) };
  const reac = {};
  for (const e of EMOJIS) reac[e.id] = Math.max(0, Number(s.reacciones?.[e.id]) || 0);
  s.reacciones = reac;
  s.mi_reaccion = IDS.has(s.mi_reaccion) ? s.mi_reaccion : null;
  s.comentarios = Array.isArray(s.comentarios) ? s.comentarios : [];
  s.comentarios_total = Math.max(Number(s.comentarios_total) || 0, s.comentarios.length);
  if (s.encuesta && !Array.isArray(s.encuesta.opciones)) s.encuesta = null;
  return s;
}

/** Total de reacciones (para el resumen «23 reacciones»). */
export const totalReacciones = (s) => Object.values(s?.reacciones ?? {}).reduce((a, n) => a + (Number(n) || 0), 0);

/**
 * Aplica un toque a un emoji ANTES de que responda la base (así se siente instantáneo).
 * Igual que la base: tocar el mismo lo quita; tocar otro lo cambia. Devuelve un estado NUEVO (no toca el original).
 */
export function alternarReaccion(s, tipo) {
  if (!IDS.has(tipo)) return s;
  const reacciones = { ...s.reacciones };
  const previa = s.mi_reaccion;
  if (previa) reacciones[previa] = Math.max(0, (reacciones[previa] ?? 0) - 1);
  if (previa === tipo) return { ...s, reacciones, mi_reaccion: null };
  reacciones[tipo] = (reacciones[tipo] ?? 0) + 1;
  return { ...s, reacciones, mi_reaccion: tipo };
}

/**
 * Porcentajes enteros que SIEMPRE suman 100 (método del mayor resto), para que la barra no muestre 99 % o 101 %.
 * Sin votos → todo 0.
 */
export function porcentajes(votos) {
  const v = (votos ?? []).map((n) => Math.max(0, Number(n) || 0));
  const total = v.reduce((a, n) => a + n, 0);
  if (!total) return v.map(() => 0);
  const exactos = v.map((n) => (n * 100) / total);
  const base = exactos.map(Math.floor);
  let falta = 100 - base.reduce((a, n) => a + n, 0);
  const orden = exactos.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) { if (falta <= 0) break; base[i] += 1; falta -= 1; }
  return base;
}

/** Revisa el texto antes de enviarlo (la base lo vuelve a revisar). Devuelve { ok, texto, error }. */
export function validarComentario(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { ok: false, texto: t, error: 'Escribe algo antes de enviar.' };
  if (t.length > MAX_COMENTARIO) return { ok: false, texto: t, error: `Máximo ${MAX_COMENTARIO} caracteres (llevas ${t.length}).` };
  return { ok: true, texto: t, error: null };
}

/** Limpia las opciones de la encuesta del formulario del staff: sin vacías, máx. 60 letras, entre 2 y 4. */
export function limpiarOpciones(lista) {
  const ops = (lista ?? []).map((o) => String(o ?? '').trim().slice(0, 60)).filter(Boolean).slice(0, 4);
  return { ok: ops.length >= 2, opciones: ops, error: ops.length >= 2 ? null : 'Pon al menos 2 opciones.' };
}

/** Mensaje claro para los errores de la base (los textos en español ya vienen listos de la migración 124). */
export function mensajeErrorSocial(e) {
  const m = String(e?.message ?? e ?? '');
  if (m.includes('NO_AUTORIZADO')) return 'No tienes permiso para hacer eso.';
  if (/Inicia sesión/i.test(m) || e?.code === '28000') return 'Inicia sesión para participar.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión: inténtalo de nuevo.';
  if (/could not find the function|schema cache/i.test(m)) return 'Esta función aún no está activa en la base (falta la migración 124).';
  return m.replace(/^.*?ERROR:\s*/, '') || 'Algo salió mal. Inténtalo de nuevo.';
}
