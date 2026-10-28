// Lógica pura del CALENDARIO PHOENIX (reemplazo del calendario nativo; ver js/features/calendarioPhoenix.js).
// Sin DOM. Formatos de los <input> de HTML: date 'AAAA-MM-DD' · month 'AAAA-MM' · time 'HH:MM' · datetime-local 'AAAA-MM-DDTHH:MM'.
// Pruebas: tests/cuadriculaFechas.test.mjs
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];   // la semana empieza el lunes (como en Perú)
export const dos = (n) => String(n).padStart(2, '0');
export const aISO = (y, m, d) => `${String(y).padStart(4, '0')}-${dos(m)}-${dos(d)}`;   // m: 1-12

/** 'AAAA-MM-DD' (o el inicio de 'AAAA-MM-DDTHH:MM') → {y, m, d} · null si no es una fecha real. */
export function deISO(s) {
  const r = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(s ?? '')); if (!r) return null;
  const y = +r[1], m = +r[2], d = r[3] ? +r[3] : 1;
  if (m < 1 || m > 12 || d < 1 || d > diasEnMes(y, m)) return null;
  return { y, m, d };
}
export const diasEnMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Lunes=0 … Domingo=6 del día 1 del mes. */
const primerDia = (y, m) => (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

/** Las 6 semanas (42 casillas) que se ven de un mes, con los días del mes anterior y siguiente marcados como «fuera». */
export function cuadricula(y, m) {
  const ini = primerDia(y, m); const out = [];
  const [ya, ma] = m === 1 ? [y - 1, 12] : [y, m - 1]; const [ys, ms] = m === 12 ? [y + 1, 1] : [y, m + 1];
  const dAnt = diasEnMes(ya, ma);
  for (let i = ini - 1; i >= 0; i--) out.push({ y: ya, m: ma, d: dAnt - i, fuera: true });
  for (let d = 1; d <= diasEnMes(y, m); d++) out.push({ y, m, d, fuera: false });
  for (let d = 1; out.length < 42; d++) out.push({ y: ys, m: ms, d, fuera: true });
  return out;
}
/** Mueve un mes (paso +1/-1). */
export const moverMes = (y, m, paso) => { const t = y * 12 + (m - 1) + paso; return { y: Math.floor(t / 12), m: (t % 12 + 12) % 12 + 1 }; };
/** ¿El valor queda fuera de min/max? (mismo formato: la comparación de textos sirve). Vacíos = sin límite. */
export const fueraDeRango = (v, min, max) => (!!min && v < String(min).slice(0, v.length)) || (!!max && v > String(max).slice(0, v.length));
/** 'HH:MM' → {h, mi} · null si no vale. */
export function deHora(s) { const r = /^(\d{2}):(\d{2})/.exec(String(s ?? '')); if (!r) return null; const h = +r[1], mi = +r[2]; return h < 24 && mi < 60 ? { h, mi } : null; }
/** Minutos a ofrecer según el «step» del input (en segundos; por defecto 60 = cada minuto). Mínimo cada 1 minuto. */
export function minutos(step) { const p = Math.max(1, Math.round((Number(step) || 60) / 60)); const out = []; for (let i = 0; i < 60; i += p) out.push(i); return out; }
/** Texto bonito para leer una fecha: «27 oct 2026». */
export const fechaCorta = ({ y, m, d }) => `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()} ${y}`;
