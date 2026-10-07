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
