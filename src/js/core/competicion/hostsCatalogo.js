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

/** Total de una solicitud: precios del host {ph, pp, gh, gp} (céntimos / gemas), modo 'horas'|'partidos', cantidad y pago 'externo'|'gemas'. null si no hay precio. */
export function calcularTotal(precios, modo, cant, pago) {
  const n = Number(cant); if (!Number.isFinite(n) || n < 1) return null;
  const v = pago === 'gemas' ? (modo === 'horas' ? precios.gh : precios.gp) : (modo === 'horas' ? precios.ph : precios.pp);
  if (v == null || v === '' || Number.isNaN(Number(v))) return null;
  return { valor: Number(v) * n, unidad: pago === 'gemas' ? 'gemas' : 'centimos' };
}
/** Ids de alquileres ACEPTADOS del host que chocan en horario (menos de 2 horas entre uno y otro). */
export function marcarChoques(lista, margenMs = 2 * 3600000) {
  const acept = (lista ?? []).filter((a) => a.soy_host && a.estado === 'ACEPTADO').map((a) => ({ id: a.id, t: new Date(a.fecha).getTime() })).filter((a) => !Number.isNaN(a.t));
  const out = new Set();
  for (const a of acept) for (const b of acept) if (a.id !== b.id && Math.abs(a.t - b.t) < margenMs) out.add(a.id);
  return out;
}
