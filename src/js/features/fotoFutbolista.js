// FOTOS REALES de los futbolistas de la Liga Máster (ronda 284). Pedido de Fralex: «falta su foto real».
// Se piden a Wikipedia en el navegador (API pública con CORS, origin=*). PageImages solo devuelve imágenes LIBRES (Wikimedia Commons),
// así que se pueden mostrar citando la fuente. Sin migración: nada se guarda en la base.
// Ligero: máx. 3 consultas a la vez, solo para las cartas que entran en pantalla, y cada resultado se recuerda 14 días en este navegador
// (si el navegador no deja guardar, simplemente se vuelve a pedir). Si no hay foto, queda el diseño de siempre.
const CLAVE = 'pes-fotos-lm-v4'; const DIAS = 14 * 864e5; const MAX = 3;
const DIAS_SIN = 864e5;   // sin foto: se reintenta al día siguiente
const API = 'https://en.wikipedia.org/w/api.php';
// Diagnóstico temporal (ronda 284e): escribe en la consola qué encontró Wikipedia para las primeras búsquedas.
let DEPURAR = true; setTimeout(() => { DEPURAR = false; }, 20000);
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
  if (DEPURAR) console.info('[fotos]', q, '→', pags.map((p) => `${p.title}${p.thumbnail ? ' (con foto)' : ' (sin foto)'}`).join(' | ') || 'nada', ok ? `✓ ${ok.title}` : '✗');
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
      if (DEPURAR) console.info('[fotos] resultado', nombre, res ?? 'sin foto');
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
const seguro = (u) => (/^https:\/\/upload\.wikimedia\.org\//.test(u) ? tamano(u) : null);
/** Pone las fotos en los elementos [data-foto] dentro de root cuando aparecen en pantalla. */
export function montarFotos(root) {
  if (!root) return;
  const poner = async (el) => {
    const f = await fotoFutbolista(el.dataset.foto, el.dataset.club); const u = f && seguro(f.url); if (!u) return;
    const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.src = u;
    img.onload = () => { el.replaceChildren(img); el.classList.add('con-foto'); el.title = `Foto: Wikipedia / Wikimedia Commons (${f.titulo})`; };
    img.onerror = () => console.warn('[fotos] no cargó la imagen de', el.dataset.foto, u);
  };
  const els = [...root.querySelectorAll('[data-foto]:not([data-foto-listo])')];
  els.forEach((el) => el.setAttribute('data-foto-listo', ''));
  if (!('IntersectionObserver' in window)) { els.forEach(poner); return; }
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); poner(e.target); } }), { rootMargin: '200px' });
  els.forEach((el) => io.observe(el));
}
