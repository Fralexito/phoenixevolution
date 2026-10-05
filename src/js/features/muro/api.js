// Acceso al muro: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 021).
import { supabase } from '../../core/supabase.js';
import { redimensionarJpeg } from '../../core/image.js';
import { rutaImagen, rutaDeUrl } from '../../core/muro.js';

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) { console.error(`[muro] ${nombre}:`, error.message); throw new Error(error.message || 'No se pudo completar la acción.'); }
  return data;
}

export const perfilPublico = (username) => rpc('perfil_publico', { p_usuario: username });
export const cargarMuro = (id, antes = null, limite = 20) => rpc('muro_de', { p_usuario: id, p_antes: antes, p_limite: limite });
// Solo se envían p_imagen / p_video si existen (así sigue funcionando con la firma anterior de la función).
export const publicar = (texto, imagen = null, video = null, reto = null) => rpc('muro_publicar', { p_texto: texto, ...(imagen ? { p_imagen: imagen } : {}), ...(video ? { p_video: video } : {}), ...(reto ? { p_reto: reto } : {}) });
export const misPartidos = () => rpc('muro_mis_partidos');   // mis duelos que puedo adjuntar (aceptados o finalizados)
export const editar = (id, texto) => rpc('muro_editar', { p_id: id, p_texto: texto });
/** Borra la publicación; si tenía foto y era mía, el servidor devuelve su URL y aquí limpio el archivo del Storage. */
export async function borrar(id) { const url = await rpc('muro_borrar', { p_id: id }); if (typeof url === 'string' && url) await quitarImagen(url); }
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
/** Borra un archivo del bucket (mejor esfuerzo: si falla solo queda un archivo huérfano, no se rompe nada). */
export async function quitarImagen(url) {
  const ruta = rutaDeUrl(url); if (!ruta) return;
  const { error } = await supabase.storage.from('muro').remove([ruta]);
  if (error) console.warn('[muro] no se pudo limpiar el archivo:', error.message);
}
