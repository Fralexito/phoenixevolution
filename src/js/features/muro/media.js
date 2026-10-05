// Ayudantes de video en el navegador (DOM): leer la duración y validar contra las reglas de core/videoSubida.js.
import { validarArchivoVideo, VIDEO_TIPOS } from '../../core/videoSubida.js';

/** Duración en segundos (NaN si el navegador no puede leer el archivo o tarda más de 8 s). */
export function leerDuracion(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video'); const url = URL.createObjectURL(file); let hecho = false;
    const fin = (d) => { if (hecho) return; hecho = true; URL.revokeObjectURL(url); v.removeAttribute('src'); v.load?.(); resolve(d); };
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => fin(v.duration); v.onerror = () => fin(NaN);
    setTimeout(() => fin(NaN), 8000);
    v.src = url;
  });
}
const MIME_POR_EXT = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
/** Tipo del archivo: el que dice el navegador o, si viene vacío (pasa con algunos .mov), el que sugiere la extensión. */
export const tipoDeVideo = (file) => (VIDEO_TIPOS[file?.type] ? file.type : MIME_POR_EXT[String(file?.name ?? '').split('.').pop().toLowerCase()] ?? file?.type ?? '');
/** → { ok, ext, tipo, error }. */
export async function prepararVideo(file) {
  const tipo = tipoDeVideo(file); const r = validarArchivoVideo({ type: tipo, size: file?.size ?? 0, duracion: VIDEO_TIPOS[tipo] ? await leerDuracion(file) : NaN });
  return { ...r, tipo };
}
