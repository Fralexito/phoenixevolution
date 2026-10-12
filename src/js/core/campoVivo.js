// Campo 2D EN VIVO de la liga (ronda 236): lógica pura del tablero que se abre al tocar una tarjeta de «En vivo».
// Los datos los manda Phoenix Link (POST /v1/liga/campo → Realtime Broadcast «campo:<sala_id>»). Sin DOM ni Supabase: tests/campoVivo.test.mjs.

export const LARGO = 105;
export const ANCHO = 68;
/** Segundos sin ningún mensaje tras los cuales se avisa «El campo en vivo no está activado en esta sala». */
export const SIN_CAMPO_MS = 5000;

export const COLORES = { 0: '#00e5ff', 1: '#b07bff', 2: '#f5c451', '-1': '#cfd8ee' };

const FASES = ['vivo', 'repeticion', 'otro', 'pausa'];
const ETIQUETAS = { repeticion: 'REPETICIÓN', otro: 'SIN LECTURA EN VIVO', pausa: 'PAUSA' };

const finito = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** Valida y limpia un mensaje «campo». Devuelve null si no sirve (nunca lanza). */
export function normalizarCampo(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.j) || p.j.length > 30) return null;
  const j = [];
  for (const f of p.j) {
    if (!Array.isArray(f) || !finito(f[0], -80, 80) || !finito(f[1], -60, 60)) return null;
    const eq = Number.isInteger(f[2]) && f[2] >= -1 && f[2] <= 2 ? f[2] : -1;
    j.push([f[0], f[1], eq]);
  }
  const b = Array.isArray(p.b) && finito(p.b[0], -80, 80) && finito(p.b[1], -60, 60) ? [p.b[0], p.b[1], finito(p.b[2], -5, 60) ? p.b[2] : 0] : null;
  const posesion = Array.isArray(p.posesion) && p.posesion.length === 2 && finito(p.posesion[0], 0, 100) && finito(p.posesion[1], 0, 100) ? [p.posesion[0], p.posesion[1]] : null;
  let t = null;
  if (p.t && typeof p.t === 'object') {
    const l = (Array.isArray(p.t.l) ? p.t.l : []).filter((x) => Array.isArray(x) && (x[0] === 0 || x[0] === 1)).map((x) => [x[0], x[1] ? 1 : 0]).slice(0, 30);
    t = { l, e: p.t.e === 1 ? 1 : 0, listo: p.t.listo === true, vuelo: p.t.vuelo === true };
  }
  const colores = Array.isArray(p.c) && p.c.length === 2 && p.c.every((x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x)) ? [p.c[0], p.c[1]] : null;
  const poseedor = Number.isInteger(p.p) && p.p >= 0 && p.p < j.length ? p.p : -1;
  const ts = finito(p.ts, 1.6e12, 4e12) ? p.ts : null;
  return { j, b, posesion, t, colores, poseedor, ts, equipos: p.equipos === true, fase: FASES.includes(p.fase) ? p.fase : 'vivo' };
}

/** Color de cada equipo (0 = A, 1 = B, 2 = árbitros, -1 = sin equipo): el de su camiseta si Link lo mandó, si no el de siempre. */
export function colorEquipo(eq, colores) {
  if ((eq === 0 || eq === 1) && colores) return colores[eq];
  return COLORES[eq] ?? COLORES['-1'];
}

/** Constante de suavizado (s) según el ritmo de llegada: ~medio intervalo, entre 60 ms y 500 ms. */
export function tauSegunIntervalo(intervaloMs) {
  if (!Number.isFinite(intervaloMs) || intervaloMs <= 0) return 0.3;
  return Math.min(0.5, Math.max(0.06, intervaloMs / 2000));
}

/** Etiqueta que se pone sobre el campo según la fase («» si es juego en vivo). */
export function etiquetaFase(fase) {
  return ETIQUETAS[fase] ?? '';
}

/** Texto de la barra de posesión: «56 % · 44 %» o «calculando…». */
export function textoPosesion(pos) {
  if (!pos) return 'calculando…';
  return `${Math.round(pos[0])} % · ${Math.round(pos[1])} %`;
}

/** Resumen de la tanda para cada equipo: goles y lanzamientos [eq, gol] separados. */
export function resumenTanda(t) {
  const r = { 0: [], 1: [] };
  if (!t) return r;
  for (const [eq, gol] of t.l) r[eq].push(!!gol);
  return r;
}

/** ¿Hay que avisar de que no llega el campo? (ni un mensaje en SIN_CAMPO_MS desde que se abrió el tablero) */
export function faltaCampo(abiertoEn, ultimoMensaje, ahora) {
  if (ultimoMensaje) return false;
  return ahora - abiertoEn >= SIN_CAMPO_MS;
}

/** Paso de interpolación: mueve «cur» hacia «obj» (suave); salta directo si la distancia es grande (otro tiempo, repetición). */
export function pasoInterpolado(cur, obj, dt, tau = 0.3, salto = 15) {
  if (!cur || Math.abs(obj[0] - cur[0]) > salto || Math.abs(obj[1] - cur[1]) > salto) return [obj[0], obj[1]];
  const k = 1 - Math.exp(-Math.max(0, dt) / tau);
  return [cur[0] + (obj[0] - cur[0]) * k, cur[1] + (obj[1] - cur[1]) * k];
}
