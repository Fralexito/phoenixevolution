// Acceso al muro: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 021).
import { supabase } from '../../core/supabase.js';
import { redimensionarJpeg } from '../../core/image.js';
import { rutaImagen, rutaVideo, archivoDeUrl } from '../../core/muro.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[muro] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}

export const perfilPublico = (username) => rpc('perfil_publico', { p_usuario: username });
export const cargarMuro = (id, antes = null, limite = 20, juego = null) => rpc('muro_de', { p_usuario: id, p_antes: antes, p_limite: limite, ...(juego ? { p_juego: juego } : {}) });
// Solo se envían p_imagen / p_video si existen (así sigue funcionando con la firma anterior de la función).
export const publicar = (texto, imagen = null, video = null, reto = null, juego = null) => rpc('muro_publicar', { p_texto: texto, ...(imagen ? { p_imagen: imagen } : {}), ...(video ? { p_video: video } : {}), ...(reto ? { p_reto: reto } : {}), ...(juego ? { p_juego: juego } : {}) });
export const misPartidos = () => rpc('muro_mis_partidos');   // mis duelos que puedo adjuntar (aceptados o finalizados)
export const editar = (id, texto) => rpc('muro_editar', { p_id: id, p_texto: texto });
/** Borra la publicación; el servidor devuelve la lista de archivos propios (foto y/o video subido) y aquí los limpio del Storage. */
export async function borrar(id) { await limpiarArchivos(await rpc('muro_borrar', { p_id: id })); }
export const fijar = (id, fijada) => rpc('muro_fijar', { p_id: id, p_fijar: fijada });
export const guardarEstilo = (e) => rpc('muro_guardar_estilo', e);
export const guardarPrivacidadMuro = (ver, responder) => rpc('muro_guardar_privacidad', { p_ver: ver, p_responder: responder });
export const respuestasDe = (idPublicacion) => rpc('muro_respuestas_de', { p_publicacion: idPublicacion });
export const responder = (idPublicacion, texto) => rpc('muro_responder', { p_publicacion: idPublicacion, p_texto: texto });
export const borrarRespuesta = (id) => rpc('muro_borrar_respuesta', { p_id: id });
export const reaccionar = (idPublicacion, tipo) => rpc('muro_reaccionar', { p_publicacion: idPublicacion, p_tipo: tipo });   // → mi reacción final o null

/** Reduce la foto en el navegador (≤ ancho px, ≤ ~1,2 MB) y la sube a MI carpeta del bucket «muro». → URL pública. */
export async function subirImagen(file, uid, ancho = 1200) {
  const blob = await redimensionarJpeg(file, ancho, 1200 * 1024);
  const ruta = rutaImagen(uid);
  const { error } = await supabase.storage.from('muro').upload(ruta, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) { console.error('[muro] subir foto:', error.message); throw new Error('No se pudo subir la foto. Intenta de nuevo.'); }
  return supabase.storage.from('muro').getPublicUrl(ruta).data.publicUrl;
}
/** Sube un video (ya validado: tipo, tamaño y duración) a MI carpeta del bucket «muro-video». → URL pública. */
export async function subirVideo(file, uid, ext, tipo) {
  const ruta = rutaVideo(uid, ext);
  const { error } = await supabase.storage.from('muro-video').upload(ruta, file, { contentType: tipo || file.type, cacheControl: '31536000' });
  if (error) { console.error('[muro] subir video:', error.message); throw new Error(/limit|exceed|policy|row-level/i.test(error.message) ? 'No se pudo subir el video (límite de 10 videos por persona o archivo demasiado grande). Borra alguno e intenta de nuevo.' : 'No se pudo subir el video. Intenta de nuevo.'); }
  return supabase.storage.from('muro-video').getPublicUrl(ruta).data.publicUrl;
}
/** Borra un archivo propio (foto o video) del Storage (mejor esfuerzo: si falla solo queda un archivo huérfano, no se rompe nada). */
export async function quitarArchivo(url) {
  const a = archivoDeUrl(url); if (!a) return;
  const { error } = await supabase.storage.from(a.bucket).remove([a.ruta]);
  if (error) console.warn('[muro] no se pudo limpiar el archivo:', error.message);
}
export const quitarImagen = quitarArchivo;   // nombre anterior (las fotos y los videos se limpian igual)
/** El servidor devuelve una lista de URLs (o, con funciones antiguas, un texto): se limpian todas. */
async function limpiarArchivos(res) { for (const u of Array.isArray(res) ? res : typeof res === 'string' && res ? [res] : []) await quitarArchivo(u); }

/* ---------- Historias, destacadas y clips (migraciones 025 y 027) ---------- */
export const historiasDe = (id) => rpc('historias_de', { p_usuario: id });   // { visible, historias, destacadas, archivo }
/** → { id, purgadas:[urls] }: las historias de >30 días sin destacar se borraron en el servidor; aquí limpio sus archivos del Storage. */
export async function publicarHistoria(texto, imagen = null, video = null) {
  const r = await rpc('historia_publicar', { p_texto: texto ?? '', ...(imagen ? { p_imagen: imagen } : {}), ...(video ? { p_video: video } : {}) });
  await limpiarArchivos(r?.purgadas);
  return r;
}
export async function borrarHistoria(id) { await limpiarArchivos(await rpc('historia_borrar', { p_id: id })); }
export const crearDestacada = (titulo, ids) => rpc('destacada_crear', { p_titulo: titulo, p_historias: ids });
export const agregarADestacada = (idDestacada, ids) => rpc('destacada_agregar', { p_destacada: idDestacada, p_historias: ids });
export const quitarDeDestacada = (idHistoria) => rpc('destacada_quitar_historia', { p_historia: idHistoria });
export const renombrarDestacada = (id, titulo) => rpc('destacada_renombrar', { p_id: id, p_titulo: titulo });
export const borrarDestacada = (id) => rpc('destacada_borrar', { p_id: id });
export const clipsDe = (id, antes = null, limite = 24) => rpc('clips_de', { p_usuario: id, p_antes: antes, p_limite: limite });
export const publicarClip = (titulo, video, juego = null) => rpc('clip_publicar', { p_titulo: titulo ?? '', p_video: video, ...(juego ? { p_juego: juego } : {}) });
export async function borrarClip(id) { await limpiarArchivos(await rpc('clip_borrar', { p_id: id })); }
/** Feed global «Comunidad» (migración 027): publicaciones de todos los muros visibles para mí, con filtro opcional por juego. */
export const comunidad = (juego = null, antes = null, limite = 20) => rpc('muro_comunidad', { ...(juego ? { p_juego: juego } : {}), p_antes: antes, p_limite: limite });
/** Hosting con varios juegos/parches y visibilidad (migración 026). */
export const guardarHost = (software, catalogo, visible) => rpc('muro_guardar_host', { p_software: software, p_catalogo: catalogo, p_visible: visible });
