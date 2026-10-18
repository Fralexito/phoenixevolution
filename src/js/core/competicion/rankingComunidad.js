// Ranking de la comunidad (migración 045): lógica PURA — meses de temporada (hora de Lima), normalización de filas y retos semanales.
// Las reglas reales (puntos, desempates, quién se ve) viven en la BD; aquí solo se presentan.
import { rangoElo } from './pulso.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const LIMA_MS = 5 * 3600 * 1000;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const txt = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

/** Últimos `n` meses (el actual primero) según la hora de Lima. → [{ valor:'2026-10-01', etiqueta:'Octubre 2026' }] */
export function mesesDisponibles(ahora = Date.now(), n = 6) {
  const d = new Date(ahora - LIMA_MS); let a = d.getUTCFullYear(), m = d.getUTCMonth();
  const out = [];
  for (let i = 0; i < n; i++) { out.push({ valor: `${a}-${String(m + 1).padStart(2, '0')}-01`, etiqueta: `${MESES[m]} ${a}` }); m -= 1; if (m < 0) { m = 11; a -= 1; } }
  return out;
}
/** Mes pedido válido (uno de la lista) o el actual. */
export const mesValido = (v, ahora = Date.now()) => { const l = mesesDisponibles(ahora); return l.some((x) => x.valor === v) ? v : l[0].valor; };

const persona = (r) => ({ pos: num(r.pos), id: String(r.usuario_id ?? ''), username: txt(r.username, 40), nombre: txt(r.nombre || r.username, 60), avatar: r.avatar_url ?? '' });
export const normalizarCompetitivo = (l) => (Array.isArray(l) ? l : []).filter((r) => r && r.usuario_id).map((r) => ({ ...persona(r), jugados: num(r.jugados), victorias: num(r.victorias), empates: num(r.empates), derrotas: num(r.derrotas), gf: num(r.gf), gc: num(r.gc), puntos: num(r.puntos) }));
export const normalizarRetosRank = (l) => (Array.isArray(l) ? l : []).filter((r) => r && r.usuario_id).map((r) => ({ ...persona(r), retos: num(r.retos), puntos: num(r.puntos) }));
/** mis_retos_semanales → retos con porcentaje y estado listo para pintar. */
export function normalizarMisRetos(d) {
  const o = d && typeof d === 'object' ? d : {};
  const retos = (Array.isArray(o.retos) ? o.retos : []).filter((r) => r && r.clave).map((r) => {
    const meta = Math.max(1, num(r.meta)), progreso = Math.min(meta, Math.max(0, num(r.progreso)));
    return { clave: String(r.clave), titulo: txt(r.titulo, 60), descripcion: txt(r.descripcion, 160), meta, progreso, puntos: num(r.puntos), pct: Math.round((progreso / meta) * 100), cobrado: !!r.cobrado, cobrable: !!r.cobrable };
  });
  return { retos, puntosTemporada: num(o.puntos_temporada), semanaFin: o.semana_fin ?? null };
}
export const diferencia = (r) => { const d = r.gf - r.gc; return d > 0 ? `+${d}` : String(d); };
/** «Termina en 3 d 4 h» / «termina hoy» para la semana de retos. */
export function textoFinSemana(fin, ahora = Date.now()) {
  const t = Date.parse(fin); if (!Number.isFinite(t)) return '';
  const h = Math.floor((t - ahora) / 3600000); if (h <= 0) return 'Termina ahora';
  const d = Math.floor(h / 24); return d ? `Termina en ${d} d ${h % 24} h` : `Termina en ${h} h`;
}

/** ranking_elo (migración 055) → filas con su rango por ELO. Solo cuentan amistosos 1v1 confirmados; nunca la liga oficial. */
export const normalizarElo = (l) => (Array.isArray(l) ? l : []).filter((r) => r && r.usuario_id).map((r) => ({ ...persona(r), elo: Math.round(num(r.elo)), jugados: Math.max(0, Math.trunc(num(r.jugados))), delta: Math.trunc(num(r.delta)), rango: rangoElo(num(r.elo), num(r.jugados)) }));
/** elo_de (migración 055) → { elo, jugados, delta } o null si no es visible o aún no hay amistosos confirmados. */
export function normalizarEloDe(d) {
  if (!d || d.visible !== true || d.elo == null || !Number.isFinite(Number(d.elo))) return null;
  return { elo: Math.round(Number(d.elo)), jugados: Math.max(0, Math.trunc(num(d.jugados))), delta: Math.trunc(num(d.delta)) };
}
