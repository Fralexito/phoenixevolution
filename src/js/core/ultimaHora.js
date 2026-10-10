// Lógica pura de «Última hora» (sin red ni DOM: se prueba con npm test). Datos: migración 100. Contrato: docs/contrato-v1.md §28.
export const MAX_TEXTO = 200;
export const MAX_VIGENTES = 5;
export const NIVELES = Object.freeze([
  { valor: 'info', texto: 'Información' },
  { valor: 'importante', texto: 'Importante' },
  { valor: 'urgente', texto: 'Urgente' },
]);
export const DURACIONES = Object.freeze([
  { horas: 1, texto: '1 hora' }, { horas: 6, texto: '6 horas' }, { horas: 24, texto: '24 horas (lo normal)' },
  { horas: 48, texto: '2 días' }, { horas: 72, texto: '3 días' }, { horas: 168, texto: '7 días (el máximo)' },
]);

/** Igual que el servidor: una sola línea (espacios y saltos juntos en uno). */
export const limpiarLinea = (t) => String(t ?? '').replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim();

/** Revisa el formulario antes de enviarlo. → { ok:true, texto, nivel, enlace, horas } | { ok:false, motivo } */
export function validarNoticia({ texto, nivel = 'info', enlace = '', horas = 24 } = {}) {
  const t = limpiarLinea(texto);
  if (!t) return { ok: false, motivo: 'Escribe el texto de la noticia.' };
  if ([...t].length > MAX_TEXTO) return { ok: false, motivo: `El texto admite hasta ${MAX_TEXTO} caracteres.` };
  if (!NIVELES.some((n) => n.valor === nivel)) return { ok: false, motivo: 'Elige un nivel.' };
  const e = String(enlace ?? '').trim();
  if (e && (!/^https:\/\/\S+$/.test(e) || e.length > 500)) return { ok: false, motivo: 'El enlace debe empezar por https:// y no llevar espacios.' };
  const h = Number(horas);
  if (!Number.isInteger(h) || h < 1 || h > 168) return { ok: false, motivo: 'La duración va de 1 hora a 7 días.' };
  return { ok: true, texto: t, nivel, enlace: e || null, horas: h };
}

/** Estado de una fila: vigente | expirada | retirada. */
export function estadoNoticia(n, ahora = Date.now()) {
  if (!n.publicada) return 'retirada';
  return Date.parse(n.expira_en) > ahora ? 'vigente' : 'expirada';
}

/** «vence en 3 h», «vence en 12 min», «venció». */
export function venceEn(expira, ahora = Date.now()) {
  const ms = Date.parse(expira) - ahora; if (!Number.isFinite(ms) || ms <= 0) return 'venció';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `vence en ${min} min`;
  const h = Math.round(min / 60); return h < 48 ? `vence en ${h} h` : `vence en ${Math.round(h / 24)} días`;
}

/** Cuántas vigentes hay (para avisar del tope de 5 antes de enviar). */
export const contarVigentes = (lista, ahora = Date.now()) => lista.filter((n) => estadoNoticia(n, ahora) === 'vigente').length;

const FRASES = {
  LIMITE_VIGENTES: 'Ya hay 5 noticias vigentes: expira o retira una antes de publicar otra.',
  NO_AUTORIZADO: 'Solo moderadores y administradores pueden gestionar la última hora.',
  NO_ENCONTRADA: 'Esa noticia ya no existe.',
};
/** Texto amable para un error del servidor (el servidor manda «CODIGO: mensaje»). */
export function mensajeError(e) {
  const m = String(e?.message ?? e ?? ''); const cod = /^([A-Z_]+)\b/.exec(m)?.[1];
  if (cod && FRASES[cod]) return FRASES[cod];
  const resto = /^[A-Z_]+:\s*(.+)$/.exec(m)?.[1];
  return resto ?? 'No se pudo completar. Inténtalo de nuevo.';
}
