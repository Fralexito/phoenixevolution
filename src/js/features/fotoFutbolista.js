// FOTOS REALES de los futbolistas de la Liga Máster (ronda 284). Pedido de Fralex: «falta su foto real».
// Se piden a Wikipedia en el navegador (API pública con CORS, origin=*). PageImages solo devuelve imágenes LIBRES (Wikimedia Commons),
// así que se pueden mostrar citando la fuente. Sin migración: nada se guarda en la base.
// Ligero: máx. 3 consultas a la vez, solo para las cartas que entran en pantalla, y cada resultado se recuerda 14 días en este navegador
// (si el navegador no deja guardar, simplemente se vuelve a pedir). Si no hay foto, queda el diseño de siempre.
import { MINIFACES, MINIFACES_FOTO } from '../../data/minifaces.js';
const CLAVE = 'pes-fotos-lm-v5'; const DIAS = 14 * 864e5; const MAX = 3;
const DIAS_SIN = 864e5;   // sin foto: se reintenta al día siguiente
const API = 'https://en.wikipedia.org/w/api.php';
let cache = {}; try { cache = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch { cache = {}; }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(cache)); } catch { /* sin almacenamiento: no pasa nada */ } };
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Último problema al hablar con Wikipedia (para mostrarlo en la ficha). */
export let ultimoError = '';
const enCurso = new Map(); const cola = []; let activos = 0;

async function buscar(q, nombre) {
  const u = `${API}?action=query&format=json&origin=*&generator=search&gsrlimit=4&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail&pithumbsize=330`;
  const r = await fetch(u); if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const pags = Object.values((await r.json())?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const palabras = norm(nombre).split(/[\s-]+/).filter((w) => w.length > 2);
  if (!pags.length) console.warn('[fotos] sin resultados en Wikipedia para', q);
  const ok = pags.find((p) => p.thumbnail?.source && palabras.some((w) => norm(p.title).includes(w)));
  return ok ? { url: ok.thumbnail.source, titulo: ok.title } : null;
}
// Plan B: la ficha resumida del artículo (REST, también con CORS). Prueba en inglés y en español.
async function resumen(nombre) {
  for (const w of ['en', 'es']) {
    try {
      const r = await fetch(`https://${w}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nombre.replace(/ /g, '_'))}`);
      if (!r.ok) continue;
      const d = await r.json();
      if (d?.type !== 'disambiguation' && d?.thumbnail?.source) return { url: d.thumbnail.source, titulo: d.title };
    } catch { /* sigue con el otro idioma */ }
  }
  return null;
}
function siguiente() {
  while (activos < MAX && cola.length) {
    const { clave, nombre, club, listo } = cola.shift(); activos += 1;
    (async () => {
      let res = null;
      try { res = (await buscar(`${nombre} ${club ?? ''} footballer`, nombre)) ?? (await buscar(`${nombre} footballer`, nombre)) ?? (await resumen(nombre)); }
      catch (e) { ultimoError = String(e?.message ?? e); console.warn('[fotos] Wikipedia no respondió:', ultimoError); res = (await resumen(nombre).catch(() => null)) ?? undefined; }                                      // error de red: no se recuerda, se reintenta otro día
      if (res !== undefined) { cache[clave] = { ...(res ?? {}), t: Date.now() }; guardar(); }
      listo(res ?? null);
    })().finally(() => { activos -= 1; siguiente(); });
  }
}
/** Foto libre de Wikipedia para «nombre» (del «club»). Devuelve { url, titulo } o null. */
export function fotoFutbolista(nombre, club) {
  const clave = norm(`${nombre}|${club ?? ''}`);
  const c = cache[clave]; if (c && Date.now() - c.t < (c.url ? DIAS : DIAS_SIN)) return Promise.resolve(c.url ? { url: c.url, titulo: c.titulo } : null);
  if (enCurso.has(clave)) return enCurso.get(clave);
  const p = new Promise((listo) => { cola.push({ clave, nombre, club, listo }); siguiente(); });
  enCurso.set(clave, p); p.finally(() => enCurso.delete(clave));
  return p;
}
// Wikimedia limita las miniaturas a tamaños estándar (120, 250, 330, 500, 960…): un tamaño raro puede no cargar. Se fuerza uno estándar.
export const tamano = (u, px = 330) => String(u).replace(/\/(\d+)px-([^/]+)$/, `/${px}px-$2`);
// Wikipedia sirve las fotos desde upload.wikimedia.org o (desde 2026) thumb.wikimedia.org: se aceptan las dos (ronda 284g).
export const esWikimedia = (u) => /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(String(u ?? ''));
const seguro = (u) => (esWikimedia(u) ? u : null);
// MINIFACES DEL JUEGO (ronda 338, pedido de Fralex): la carita que tiene cada jugador en el parche Conmegol, mejorada con
// Real-ESRGAN (tools/minifaces/). Se guardan en public/minifaces/<pes_id>.webp. Si el jugador la tiene, MANDA sobre Wikipedia.
/** URL de la miniface del juego para ese pes_id, o null si no hay. */
const BASE_MINI = `${import.meta.env?.BASE_URL ?? '/'}minifaces/`;   // igual que core/sistema/escudos.js: funciona en el navegador y en los tests
export const minifaceUrl = (pesId) => (pesId != null && pesId !== '' && MINIFACES.has(Number(pesId)) ? `${BASE_MINI}${Number(pesId)}.webp` : null);
/** Pone las fotos en los elementos [data-foto] dentro de root cuando aparecen en pantalla. */
export function montarFotos(root) {
  if (!root) return;
  const poner = async (el) => {
    const mini = minifaceUrl(el.dataset.pes);
    if (mini) {   // carita del juego: fondo transparente, se ve sobre el círculo de color de la línea
      const img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = mini;
      img.onload = () => { el.replaceChildren(img); el.classList.add('con-foto', 'con-miniface'); const fo = MINIFACES_FOTO[Number(el.dataset.pes)]; el.title = fo ? `Foto: ${fo.autor} · ${fo.licencia} (Wikimedia Commons)` : 'Su cara en el juego (parche Conmegol)'; };
      return;
    }
    const f = await fotoFutbolista(el.dataset.foto, el.dataset.club); const u = f && seguro(f.url); if (!u) return;
    // Sin loading=lazy: la imagen aún no está en la página y el navegador nunca la cargaría (ronda 287). Ya solo se pide cuando la carta se ve.
    const img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = u;
    img.onload = () => { el.replaceChildren(img); el.classList.add('con-foto'); el.title = `Foto: Wikipedia / Wikimedia Commons (${f.titulo})`; };
    img.onerror = () => console.warn('[fotos] no cargó la imagen de', el.dataset.foto, u);
  };
  const els = [...root.querySelectorAll('[data-foto]:not([data-foto-listo])')];
  els.forEach((el) => el.setAttribute('data-foto-listo', ''));
  if (!('IntersectionObserver' in window)) { els.forEach(poner); return; }
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); poner(e.target); } }), { rootMargin: '200px' });
  els.forEach((el) => io.observe(el));
}

// ── Carrusel de la ficha (ronda 285). Pedido de Fralex: «la primera sí o sí de pecho para arriba, después otras, pero que sea reconocible».
// La 1.ª es la foto principal del artículo (la del recuadro de Wikipedia, casi siempre un retrato). Las demás son las fotos del mismo
// artículo cuyo NOMBRE DE ARCHIVO lleva el nombre del jugador (así es él, no un estadio ni un escudo). Solo JPG, sin logos ni banderas.
const MAX_EXTRA = 4;   // + la principal = hasta 5 fotos en el carrusel
const PROHIBIDAS = /(logo|crest|badge|flag|bandera|escudo|signature|firma|kit|icon|map|mapa|stadium|estadio|trophy|trofeo|\.svg|\.png|\.gif)/i;
/** Nombre de archivo de una URL de Wikimedia, sin el «330px-» de la miniatura (para no repetir la foto principal). */
export const archivoDe = (u) => { try { return norm(decodeURIComponent(String(u).split('?')[0].split('/').pop() || '').replace(/^\d+px-/, '')).replace(/^(file|archivo):/, '').replace(/ /g, '_'); } catch { return ''; } };
/** ¿El archivo «File:…» parece una foto del jugador? estricto = deben estar TODAS las palabras de su nombre (para la búsqueda general). */
export function esFotoDe(archivo, nombre, estricto = false) {
  const a = norm(archivo); if (!/\.jpe?g$/i.test(a) || PROHIBIDAS.test(a)) return false;
  const palabras = norm(nombre).split(/[\s-]+/).filter((w) => w.length > 2);
  return estricto ? palabras.length > 0 && palabras.every((w) => a.includes(w)) : palabras.some((w) => a.includes(w));
}
// Varias fuentes LIBRES (ronda 289, pedido de Fralex «usa fotos de varias fuentes, unas 5»): todas con licencia que permite mostrarlas.
//   1) fotos del artículo en Wikipedia en inglés  2) en Wikipedia en español  3) búsqueda en Wikimedia Commons (la biblioteca de fotos libres).
const IMG = 'prop=imageinfo&iiprop=url|mime|size&iiurlwidth=500';
async function paginas(u) { try { const r = await fetch(u); if (!r.ok) return []; return Object.values((await r.json())?.query?.pages ?? {}); } catch { return []; } }
/** Une, limpia y ordena las fotos de las fuentes. Exportada para el test. */
export function juntarFotos(grupos, nombre, principal, max = MAX_EXTRA) {
  const vistos = new Set([archivoDe(principal)]); const fotos = [];
  for (const { pags, estricto } of grupos) {
    for (const p of pags) {
      const ii = p.imageinfo?.[0]; if (ii?.mime !== 'image/jpeg' || !esFotoDe(p.title, nombre, estricto)) continue;
      const url = ii.thumburl || ii.url; const a = archivoDe(p.title);
      if (!esWikimedia(url) || vistos.has(a)) continue;
      vistos.add(a); fotos.push({ url });
      if (fotos.length >= max) return fotos;
    }
  }
  return fotos;
}
/** Hasta 4 fotos más del jugador (además de la principal). Devuelve [{ url }] (puede ser vacío). */
export async function fotosExtra(titulo, nombre, principal) {
  const clave = `x2|${norm(titulo)}`;
  const c = cache[clave]; if (c && Date.now() - c.t < DIAS) return c.fotos ?? [];
  const t = encodeURIComponent(titulo); const q = encodeURIComponent(`"${nombre}"`);
  const [en, es, commons] = await Promise.all([
    paginas(`${API}?action=query&format=json&origin=*&titles=${t}&generator=images&gimlimit=40&${IMG}`),
    paginas(`https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(nombre)}&redirects=1&generator=images&gimlimit=40&${IMG}`),
    paginas(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch=${q}&${IMG}`),
  ]);
  const fotos = juntarFotos([{ pags: en }, { pags: es }, { pags: commons, estricto: true }], nombre, principal);
  cache[clave] = { fotos, t: Date.now() }; guardar();
  return fotos;
}
