// Catálogo de hosts (puro, con test): filtrar, ordenar y calificar el ping.
/** Calidad del ping medio: bueno ≤ 60 ms, medio ≤ 120 ms, malo > 120 ms; sin dato = «Sin datos». */
export function calidadPing(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return { nivel: 'nd', texto: 'Sin ping' };
  const n = Math.round(Number(ms));
  return { nivel: n <= 60 ? 'bueno' : n <= 120 ? 'medio' : 'malo', texto: `${n} ms` };
}
const minusc = (t) => String(t ?? '').toLowerCase();
const menorPrecio = (h) => { const v = [h.precio_partido_centimos, h.precio_hora_centimos].filter((x) => x != null); return v.length ? Math.min(...v) : Infinity; };
/** f = { q, juego, gemas, orden: 'ping' | 'precio' | 'alquileres' } */
export function filtrarHosts(hosts, f = {}) {
  const q = minusc(f.q).trim();
  const l = (hosts ?? []).filter((h) => (!q || minusc(h.nombre).includes(q) || minusc(h.username).includes(q))
    && (!f.juego || (Array.isArray(h.juegos) && h.juegos.some((j) => j.juego === f.juego)))
    && (!f.gemas || h.acepta_gemas));
  const ping = (h) => (h.ping_ms == null ? Infinity : Number(h.ping_ms));
  const por = f.orden === 'precio' ? (a, b) => menorPrecio(a) - menorPrecio(b)
    : f.orden === 'alquileres' ? (a, b) => (b.completados ?? 0) - (a.completados ?? 0) : (a, b) => ping(a) - ping(b);
  return [...l].sort((a, b) => (por(a, b) || 0) || minusc(a.nombre).localeCompare(minusc(b.nombre)));
}
