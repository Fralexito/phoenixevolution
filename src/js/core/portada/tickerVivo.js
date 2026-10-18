// Ticker de transmisión · lógica PURA (se prueba en Node): convierte los datos de ticker_comunidad() en piezas de texto.
/** → [{ tipo: 'vivo'|'resultado', texto }] — primero los contadores en vivo (solo si hay algo), luego los resultados. */
export function piezasTicker(d) {
  const o = d && typeof d === 'object' ? d : {};
  const n = (x) => Math.max(0, Math.trunc(Number(x) || 0));
  const out = [];
  if (n(o.en_juego)) out.push({ tipo: 'vivo', texto: `${n(o.en_juego)} ${n(o.en_juego) === 1 ? 'partido en juego' : 'partidos en juego'}` });
  if (n(o.salas_vivas)) out.push({ tipo: 'vivo', texto: `${n(o.salas_vivas)} ${n(o.salas_vivas) === 1 ? 'sala abierta' : 'salas abiertas'} en Smash Soda` });
  if (n(o.retos_abiertos)) out.push({ tipo: 'vivo', texto: `${n(o.retos_abiertos)} ${n(o.retos_abiertos) === 1 ? 'reto esperando rival' : 'retos esperando rival'}` });
  for (const r of Array.isArray(o.resultados) ? o.resultados : []) {
    if (!r?.a || !r?.b || !Number.isFinite(Number(r.ga)) || !Number.isFinite(Number(r.gb))) continue;
    out.push({ tipo: 'resultado', texto: `${r.a} ${n(r.ga)} – ${n(r.gb)} ${r.b}` });
  }
  return out;
}

/** Plataforma por el dominio del enlace (para mostrarla en el ticker). */
export function plataformaDe(url) {
  const h = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  if (/tiktok\.com$/.test(h)) return 'TikTok';
  if (/twitch\.tv$/.test(h)) return 'Twitch';
  if (/(youtube\.com|youtu\.be)$/.test(h)) return 'YouTube';
  if (/kick\.com$/.test(h)) return 'Kick';
  if (/facebook\.com|fb\.gg$/.test(h)) return 'Facebook';
  return h ? 'su canal' : null;
}
/** Creadores en vivo → piezas con enlace: «🔴 Kaiser está en vivo en TikTok». Solo enlaces https. */
export const piezasCreadores = (lista) => (Array.isArray(lista) ? lista : [])
  .filter((c) => c?.nombre && /^https:\/\//.test(c?.url ?? ''))
  .map((c) => ({ tipo: 'creador', texto: `🔴 ${c.nombre} está en vivo en ${plataformaDe(c.url)}${c.titulo ? ` · ${c.titulo}` : ''}`, url: c.url }));
