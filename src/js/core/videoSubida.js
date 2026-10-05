// Reglas de los VIDEOS que se suben (puro, sin DOM). [BD] El bucket muro-video (migración 027) exige los mismos límites de tamaño y tipo; la duración solo la valida la web.
export const VIDEO_MAX_MB = 25;       // [BD] file_size_limit del bucket
export const VIDEO_MAX_SEG = 30;
export const VIDEO_TIPOS = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };   // [BD] allowed_mime_types

/** → { ok, ext, error }. `duracion` en segundos (la lee el navegador); si no se pudo leer, se rechaza (podría no ser un video válido). */
export function validarArchivoVideo({ type = '', size = 0, duracion = NaN } = {}) {
  const ext = VIDEO_TIPOS[type];
  if (!ext) return { ok: false, ext: '', error: 'Usa un video MP4, WebM o MOV.' };
  if (!(size > 0)) return { ok: false, ext, error: 'El archivo está vacío.' };
  if (size > VIDEO_MAX_MB * 1024 * 1024) return { ok: false, ext, error: `El video pesa ${(size / 1048576).toFixed(1)} MB: el máximo es ${VIDEO_MAX_MB} MB.` };
  if (!Number.isFinite(duracion) || duracion <= 0) return { ok: false, ext, error: 'No pude leer ese video. Prueba con otro archivo.' };
  if (duracion > VIDEO_MAX_SEG + 0.5) return { ok: false, ext, error: `El video dura ${Math.round(duracion)} s: el máximo es ${VIDEO_MAX_SEG} s.` };
  return { ok: true, ext, error: '' };
}
