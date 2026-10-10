// Lógica pura del CHAT GENERAL (sin red ni DOM: se prueba con npm test). Datos: migración 099. Contrato: docs/contrato-v1.md §27.
export const MAX_TEXTO = 300;
export const VENTANA = 200;   // cuántos mensajes se guardan en pantalla (los más viejos se sueltan)

/** Igual que el servidor: espacios y saltos juntos en uno. */
export const limpiarTexto = (t) => String(t ?? '').replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim();

/** Estado del cuadro de escribir: cuántos caracteres quedan y si se puede enviar. */
export function estadoEscritura(t) {
  const limpio = limpiarTexto(t); const n = [...limpio].length;
  return { restan: MAX_TEXTO - n, puede: n > 0 && n <= MAX_TEXTO, limpio };
}

const INSIGNIAS = { admin: { texto: 'Admin', tono: 'admin' }, moderador: { texto: 'Mod', tono: 'mod' }, ayudante: { texto: 'Ayudante', tono: 'ayu' }, arbitro: { texto: 'Árbitro', tono: 'ayu' }, comisario: { texto: 'Árbitro', tono: 'ayu' } };
/** Insignia para mostrar junto al nombre, o null si es un jugador normal. */
export const insignia = (rol) => INSIGNIAS[String(rol ?? '').toLowerCase()] ?? null;

/**
 * Junta lo ya mostrado con la respuesta del servidor { mensajes, borrados }: añade los nuevos (sin repetir), quita los borrados y
 * recorta a VENTANA. Devuelve { lista, ultimoId } (ultimoId = el mayor id visto, para pedir «desde» la próxima vez).
 */
export function fusionar(actual, respuesta, ventana = VENTANA) {
  const quitar = new Set((respuesta?.borrados ?? []).map(Number));
  const vistos = new Set(actual.map((m) => m.id));
  const nuevos = (respuesta?.mensajes ?? []).filter((m) => !vistos.has(m.id));
  const lista = [...actual, ...nuevos].filter((m) => !quitar.has(m.id)).sort((a, b) => a.id - b.id).slice(-ventana);
  const ultimoId = Math.max(0, ...[...actual, ...nuevos].map((m) => m.id));
  return { lista, ultimoId, hayNuevos: nuevos.length > 0 };
}

/** «21:05» en hora de Lima (o la zona dada). */
export function horaCorta(iso, tz = 'America/Lima') {
  const d = new Date(iso ?? ''); if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d);
}

const FRASES = {
  CUENTA_SANCIONADA: null, // el servidor manda el texto exacto de la sanción
  LIMITE_EXCEDIDO: 'Vas muy rápido: espera un momento antes de escribir otra vez.',
  MENSAJE_INVALIDO: null,
  NO_AUTORIZADO: 'Inicia sesión para escribir en el chat.',
  MENSAJE_NO_ENCONTRADO: 'Ese mensaje ya no existe.',
  SIN_PERMISO: 'Tu cuenta todavía no puede usar el chat (revisa tu fecha de nacimiento en Configuración).',
};
/** Error de la base «CODIGO: texto» → frase amable. */
export function mensajeError(e) {
  const t = String(e?.message ?? e ?? '');
  const codigo = (t.match(/^[A-Z_]{6,}/) ?? t.match(/[A-Z_]{6,}/) ?? [])[0];
  const extra = t.includes(':') ? t.split(':').slice(1).join(':').trim() : '';
  if (codigo && FRASES[codigo]) return FRASES[codigo];
  if (codigo && (codigo in FRASES) && extra) return extra;
  return t || 'Algo salió mal. Inténtalo otra vez.';
}
