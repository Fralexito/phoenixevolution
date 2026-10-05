// Lógica PURA de historias, destacadas y clips (sin DOM ni red): validaciones, tiempos y «ya vista». Se prueba en tests/pure.test.mjs.
// Los límites HISTORIA_MAX / DESTACADA_TITULO_MAX / CLIP_TITULO_MAX [BD] también viven en la migración 025.
import { analizarVideo } from './muro.js';

export const HISTORIA_MAX = 200;          // [BD] muro_historias.texto
export const DESTACADA_TITULO_MAX = 24;   // [BD] muro_destacadas.titulo
export const CLIP_TITULO_MAX = 80;        // [BD] muro_clips.titulo
export const MAX_DESTACADAS = 8;          // [BD] destacada_crear
export const HISTORIA_MS = 6000;          // duración en pantalla de una historia de foto o de texto

const limpiar = (t) => String(t ?? '').replace(/[<>]/g, '').trim();

/** Valida lo que el usuario quiere publicar como historia. Devuelve { ok, texto, video, error }. Nunca lanza. */
export function validarHistoria({ texto = '', hayFoto = false, video = '' } = {}) {
  const t = limpiar(texto); const v = String(video ?? '').trim();
  if (t.length > HISTORIA_MAX) return { ok: false, texto: t, video: '', error: `Máximo ${HISTORIA_MAX} caracteres en una historia.` };
  let url = '';
  if (v) { const a = analizarVideo(v); if (!a.ok) return { ok: false, texto: t, video: '', error: a.error || 'El enlace no es válido.' }; url = a.url; }
  if (!t && !hayFoto && !url) return { ok: false, texto: t, video: '', error: 'Sube una foto, pega un enlace de video o escribe algo.' };
  return { ok: true, texto: t, video: url, error: '' };
}

/** Título de destacada: sin < >, 1–24 caracteres. */
export function validarTituloDestacada(t) {
  const x = limpiar(t);
  if (!x) return { ok: false, titulo: '', error: 'Ponle un título a la destacada.' };
  if (x.length > DESTACADA_TITULO_MAX) return { ok: false, titulo: x, error: `Máximo ${DESTACADA_TITULO_MAX} caracteres.` };
  return { ok: true, titulo: x, error: '' };
}

/** Validación de un clip nuevo: enlace obligatorio, título opcional (≤ 80). */
export function validarClip({ titulo = '', video = '' } = {}) {
  const t = limpiar(titulo); if (t.length > CLIP_TITULO_MAX) return { ok: false, titulo: t, video: '', error: `El título admite máximo ${CLIP_TITULO_MAX} caracteres.` };
  const a = analizarVideo(video); if (!a.ok) return { ok: false, titulo: t, video: '', error: a.error || 'Pega un enlace de YouTube, TikTok, Kick o Twitch.' };
  return { ok: true, titulo: t, video: a.url, error: '' };
}

/** «Caduca en 5 h» / «Caduca en 40 min» / «Caducada». */
export function caducaEn(expiraAt, now = Date.now()) {
  const f = new Date(expiraAt).getTime(); if (!Number.isFinite(f)) return '';
  const min = Math.floor((f - now) / 60000); if (min <= 0) return 'Caducada';
  return min < 60 ? `Caduca en ${min} min` : `Caduca en ${Math.floor(min / 60)} h`;
}

/** Historia normalizada para pintar (descarta lo que no tenga forma válida). */
export function normalizarHistoria(h) {
  const id = Number(h?.id); if (!Number.isFinite(id)) return null;
  const v = h.video_url ? analizarVideo(h.video_url) : null;
  return { id, texto: String(h.texto ?? '').slice(0, HISTORIA_MAX), imagen: /^https:\/\//.test(String(h.imagen_url ?? '')) ? String(h.imagen_url) : '',
    video: v?.ok ? v : null, creada: h.created_at ?? null, expira: h.expira_at ?? null, destacada: h.destacada_id ?? null };
}
export const normalizarHistorias = (lista) => (Array.isArray(lista) ? lista : []).map(normalizarHistoria).filter(Boolean);

/* ---- «Ya vista»: se guarda SOLO en este navegador (localStorage), no en la BD. Forma: { [idHistoria]: 1 }. ---- */
export const hayNuevas = (historias, vistas) => historias.some((h) => !vistas?.[h.id]);
/** Devuelve un objeto nuevo con las historias marcadas como vistas y poda a las últimas `max` para que no crezca sin fin. */
export function marcarVistas(vistas, ids, max = 300) {
  const o = { ...(vistas ?? {}) }; ids.forEach((i) => { o[i] = 1; });
  const claves = Object.keys(o).map(Number).sort((a, b) => a - b);
  claves.slice(0, Math.max(0, claves.length - max)).forEach((k) => delete o[k]);
  return o;
}
/** Índice por el que empezar a ver: la primera historia no vista (o la 0 si ya las viste todas). */
export const indiceInicial = (historias, vistas) => { const i = historias.findIndex((h) => !vistas?.[h.id]); return i < 0 ? 0 : i; };

/** Miniatura y etiqueta de un clip. Solo YouTube tiene miniatura pública sin pedir nada raro; el resto usa un icono. */
const ICONOS = { youtube: 'fa-brands fa-youtube', tiktok: 'fa-brands fa-tiktok', twitch: 'fa-brands fa-twitch', kick: 'fa-solid fa-play', propio: 'fa-solid fa-film' };
export function infoClip(c) {
  const v = analizarVideo(c?.video_url); if (!v.ok) return null;
  return { id: Number(c.id), titulo: String(c.titulo ?? '').slice(0, CLIP_TITULO_MAX), proveedor: v.proveedor, propio: v.proveedor === 'propio', juego: String(c.juego ?? ''), ytId: v.proveedor === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(v.id) ? v.id : '',
    url: v.url, icono: ICONOS[v.proveedor] ?? 'fa-solid fa-play', creado: c.created_at ?? null };
}
