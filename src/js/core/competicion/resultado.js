// Reglas de presentación del MARCADOR de un duelo (puro, sin DOM → probable). Las reglas reales viven en la BD (migración 036).
// Convención: goles_a = lado del retador (A), goles_b = lado del rival (B).
export const GOLES_MAX = 30;

/** Texto de los inputs → { ok, a, b, error }. Solo enteros 0‑30 (como la BD). */
export function validarMarcador(a, b) {
  const num = (v) => (typeof v === 'number' ? v : (/^\d{1,2}$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : NaN));
  const x = num(a), y = num(b);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > GOLES_MAX || y > GOLES_MAX) return { ok: false, a: null, b: null, error: `Escribe los goles de cada lado (números del 0 al ${GOLES_MAX}).` };
  return { ok: true, a: x, b: y, error: '' };
}
/** Marcador visto desde MI lado: «3 - 1» con mis goles primero. lado null → orden A - B. */
export const marcadorDesdeMiLado = (ga, gb, lado) => (lado === 'B' ? `${gb} - ${ga}` : `${ga} - ${gb}`);
/** 'victoria' | 'empate' | 'derrota' | null según mi lado. */
export function veredicto(ga, gb, lado) {
  if (!Number.isInteger(ga) || !Number.isInteger(gb) || (lado !== 'A' && lado !== 'B')) return null;
  const pro = lado === 'A' ? ga : gb, contra = lado === 'A' ? gb : ga;
  return pro > contra ? 'victoria' : pro < contra ? 'derrota' : 'empate';
}
/** Qué debe ver quien mira un duelo según el estado que devuelve `resultado_de_reto`. */
export function accionDeResultado(r) {
  if (!r || r.finalizado === false) return 'ninguna';
  if (r.estado === 'CONFIRMADO') return 'confirmado';
  if (r.puedo_responder) return 'responder';
  if (r.puedo_proponer) return 'proponer';
  if (r.agotado) return 'moderacion';
  if (r.estado === 'PROPUESTO') return 'esperando';
  return 'ninguna';
}
/** Respuesta de `estadisticas_de` → números seguros o null si no es visible. */
export function normalizarEstadisticas(e) {
  if (!e || e.visible !== true) return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);
  const jugados = n(e.jugados);
  return { jugados, victorias: n(e.victorias), empates: n(e.empates), derrotas: n(e.derrotas), gf: n(e.gf), gc: n(e.gc), efectividad: jugados ? Math.min(100, n(e.efectividad)) : null };
}
/** Un elemento de `mis_resultados_pendientes` → qué mostrar y qué puedo hacer. `yo` = mi id. */
export function vistaPendiente(p, yo) {
  const agotado = p?.estado === 'DISPUTADO' && Number(p.intentos) >= 3;
  if (!p) return { tipo: 'ninguna' };
  if (agotado) return { tipo: 'moderacion' };
  if (p.estado === 'SIN_MARCADOR') return { tipo: 'proponer' };
  if (p.estado === 'PROPUESTO') return { tipo: p.propuesto_por === yo ? 'esperando' : 'responder' };
  if (p.estado === 'DISPUTADO') return { tipo: p.propuesto_por === yo ? 'esperando_contra' : 'proponer', contra: true };
  return { tipo: 'ninguna' };
}
