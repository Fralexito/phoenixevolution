// Lógica PURA del muro de jugadores (sin DOM ni red → se prueba en tests/pure.test.mjs).
import { escapeHTML, safeUrl } from './dom.js';
import { BANNERS, BANNER_DEFECTO, ACENTOS, ACENTO_DEFECTO, MURO_MAX, LEMA_MAX, RESP_MAX, REACCIONES } from '../../data/muroEstilo.js';

/** Valida el texto de una publicación. → { ok, texto, error }. La BD vuelve a validar: esto solo da el aviso rápido. */
export function validarTexto(t) {
  const texto = String(t ?? '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!texto) return { ok: false, texto, error: 'Escribe algo para publicar.' };
  if (texto.length > MURO_MAX) return { ok: false, texto, error: `Máximo ${MURO_MAX} caracteres (llevas ${texto.length}).` };
  return { ok: true, texto, error: '' };
}

/** Texto del usuario → HTML seguro: se escapa TODO primero; después los https:// pasan a enlaces y los saltos de línea a <br>. */
export function textoAHTML(t) {
  return escapeHTML(t).replace(/https:\/\/[^\s<]+/gi, (u) => {
    const limpio = u.replace(/(&quot;|&#39;|[.,;:!?)\]])+$/g, '');   // la puntuación final no es parte del enlace
    const resto = u.slice(limpio.length);
    const url = safeUrl(limpio.replace(/&amp;/g, '&'));
    return url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer nofollow" class="text-galaxy-400 underline break-all">${limpio}</a>${resto}` : u;
  }).replace(/\n/g, '<br>');
}

/** «hace 5 min», «hace 3 h», «ayer», o la fecha. `now` inyectable para probar. */
export function tiempoRelativo(ts, now = Date.now()) {
  const t = new Date(ts).getTime(); if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'ahora';
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  if (s < 7 * 86400) return `hace ${Math.round(s / 86400)} días`;
  return new Date(t).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: now - t > 300 * 86400000 ? 'numeric' : undefined });
}

/** Estilo guardado (puede venir vacío o con basura) → valores seguros para pintar. */
export function estiloDe(p) {
  const id = /^preset:([a-z0-9-]{1,30})$/.exec(String(p?.muro_banner ?? ''))?.[1];
  const banner = BANNERS.find((b) => b.id === id) ?? BANNERS.find((b) => b.id === BANNER_DEFECTO);
  const acento = /^#[0-9a-fA-F]{6}$/.test(String(p?.muro_acento ?? '')) ? p.muro_acento : ACENTO_DEFECTO;
  const lema = String(p?.muro_lema ?? '').replace(/[<>]/g, '').trim().slice(0, LEMA_MAX);
  const foto = /^https:\/\//i.test(String(p?.muro_banner ?? '')) ? String(p.muro_banner) : '';   // banner subido por la persona (bucket «muro»)
  return { banner, acento, lema, foto };
}

/** Valores del editor → argumentos de la RPC `muro_guardar_estilo`. */
export function estiloParaGuardar({ bannerId, foto, acento, lema }) {
  return {
    p_banner: /^https:\/\//i.test(String(foto ?? '')) ? String(foto) : (BANNERS.some((b) => b.id === bannerId) ? `preset:${bannerId}` : null),   // la foto, si hay, manda sobre el preset
    p_acento: ACENTOS.includes(acento) ? acento : null,
    p_lema: String(lema ?? '').replace(/[<>]/g, '').trim().slice(0, LEMA_MAX),
  };
}

/** `?u=fralex` → 'fralex' (solo a-z, 0-9 y _; como exige la BD). Vacío si no hay. */
export const usuarioDeURL = (search) => String(new URLSearchParams(search).get('u') ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

/** Valida una respuesta (máx. RESP_MAX). Misma forma que validarTexto. */
export function validarRespuesta(t) {
  const texto = String(t ?? '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!texto) return { ok: false, texto, error: 'Escribe tu respuesta.' };
  if (texto.length > RESP_MAX) return { ok: false, texto, error: `Máximo ${RESP_MAX} caracteres (llevas ${texto.length}).` };
  return { ok: true, texto, error: '' };
}

/** {fuego: 3, gg: 1, basura: 9} → [{tipo, emoji, etiqueta, n}] solo de reacciones conocidas con n > 0, en el orden del catálogo. */
export function resumenReacciones(r) {
  return REACCIONES.map(([tipo, emoji, etiqueta]) => ({ tipo, emoji, etiqueta, n: Math.max(0, Math.trunc(Number(r?.[tipo]) || 0)) })).filter((x) => x.n > 0);
}

/** Aplica LOCALMENTE el resultado de reaccionar (para pintar al instante, sin releer): `final` = mi reacción tras la RPC (null = la quité). No muta. */
export function aplicarReaccion(item, final) {
  const reacciones = { ...(item.reacciones ?? {}) };
  if (item.mia) reacciones[item.mia] = Math.max(0, (reacciones[item.mia] ?? 1) - 1);
  if (final) reacciones[final] = (reacciones[final] ?? 0) + 1;
  for (const k of Object.keys(reacciones)) if (!reacciones[k]) delete reacciones[k];
  return { ...item, reacciones, mia: final ?? null };
}

/** Enlace de video → { ok, proveedor, id, url, error }. Mismos proveedores que la BD (private.video_valido): YouTube, TikTok, Kick y Twitch (solo https). `id` solo en YouTube. */
const PROVEEDORES = [
  ['youtube', /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i],
  ['tiktok', /^https:\/\/(?:www\.|m\.|vm\.)?tiktok\.com\/\S+/i],
  ['kick', /^https:\/\/(?:www\.)?kick\.com\/\S+/i],
  ['twitch', /^https:\/\/(?:www\.|clips\.)?twitch\.tv\/\S+/i],
];
export const PROVEEDOR_ETIQUETA = { youtube: 'YouTube', tiktok: 'TikTok', kick: 'Kick', twitch: 'Twitch' };
export function analizarVideo(texto) {
  const url = String(texto ?? '').trim();
  if (!url) return { ok: false, proveedor: '', id: '', url: '', error: '' };
  if (url.length > 300 || /[<>"'\s]/.test(url)) return { ok: false, proveedor: '', id: '', url, error: 'El enlace no es válido.' };
  for (const [proveedor, re] of PROVEEDORES) { const m = re.exec(url); if (m) return { ok: true, proveedor, id: m[1] ?? '', url, error: '' }; }
  return { ok: false, proveedor: '', id: '', url, error: 'Solo se aceptan enlaces https de YouTube, TikTok, Kick o Twitch.' };
}

/** Ruta del archivo dentro del bucket «muro»: `<uid>/<marca de tiempo>-<aleatorio>.jpg` (la BD exige que empiece por tu uid). */
export const rutaImagen = (uid, ts = Date.now(), azar = Math.random().toString(36).slice(2, 8)) => `${uid}/${ts}-${String(azar).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'x'}.jpg`;
/** URL pública del bucket «muro» → ruta del archivo (para borrarlo del Storage). '' si no es de ese bucket. */
export const rutaDeUrl = (url) => /\/storage\/v1\/object\/public\/muro\/([^?#]+)/.exec(String(url ?? ''))?.[1] ?? '';
