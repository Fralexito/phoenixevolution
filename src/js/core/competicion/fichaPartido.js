// Ficha del partido (ronda 386 · Phoenix Link 0.3.51 + módulo phoenix_sonda.lua de Sider). Lógica pura, sin DOM: tests/fichaPartido.test.mjs.
// La ficha llega con los valores TAL CUAL los da Sider (números de código). Aquí se traducen a texto para la web.
// Códigos de Sider (ctx de PES 2021): clima 0 despejado · 1 lluvia · 2 nieve; hora 0 día · 1 noche; estación 0 verano · 1 invierno.
// El estadio es un número (id interno del juego): si Link manda «estadio_nombre» se usa ese; si no, «Estadio n.º X».
// Un código que no conocemos se muestra como «código X» (nunca se inventa un nombre).

export const CLIMA = { 0: 'Despejado', 1: 'Lluvia', 2: 'Nieve' };
export const HORA = { 0: 'De día', 1: 'De noche' };
export const ESTACION = { 0: 'Verano', 1: 'Invierno' };
export const CAMPOS_REGLA = ['duracion', 'dificultad', 'cambios', 'prorroga', 'penales'];
const NOMBRE_CAMPO = { duracion: 'Duración', dificultad: 'Dificultad', cambios: 'Cambios', prorroga: 'Prórroga', penales: 'Penales' };

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deCodigo = (tabla, x) => (esNum(x) ? (tabla[x] ?? `código ${x}`) : null);
const siNo = (x) => (typeof x === 'boolean' ? x : esNum(x) ? x !== 0 : null);

/** Ficha → lista de datos para pintar [{clave, icono, texto}]. Vacía si no hay ficha. */
export function datosFicha(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return [];
  const out = [];
  const nombre = typeof f.estadio_nombre === 'string' ? f.estadio_nombre.trim().slice(0, 60) : '';
  if (nombre || esNum(f.estadio)) out.push({ clave: 'estadio', icono: 'fa-landmark', texto: nombre || `Estadio n.º ${f.estadio}` });
  const clima = deCodigo(CLIMA, f.clima);
  if (clima) out.push({ clave: 'clima', icono: f.clima === 1 ? 'fa-cloud-rain' : f.clima === 2 ? 'fa-snowflake' : 'fa-sun', texto: clima });
  const hora = deCodigo(HORA, f.hora);
  if (hora) out.push({ clave: 'hora', icono: f.hora === 1 ? 'fa-moon' : 'fa-clock', texto: hora });
  const est = deCodigo(ESTACION, f.estacion);
  if (est) out.push({ clave: 'estacion', icono: 'fa-leaf', texto: est });
  if (esNum(f.duracion) && f.duracion > 0) out.push({ clave: 'duracion', icono: 'fa-stopwatch', texto: `${f.duracion} min` });
  return out;
}

/** Texto corto en una línea: «Estadio n.º 12 · Lluvia · De noche · 10 min». '' si no hay ficha. */
export function lineaFicha(f) {
  return datosFicha(f).map((d) => d.texto).join(' · ');
}

const valorRegla = (campo, v) => {
  if (campo === 'prorroga' || campo === 'penales') { const b = siNo(v); return b == null ? '—' : b ? 'sí' : 'no'; }
  if (!esNum(v)) return '—';
  return campo === 'duracion' ? `${v} min` : String(v);
};

/** detalle.revisar ([{campo, regla, partido}]) → frases para el staff. */
export function frasesRevisar(lista) {
  return (Array.isArray(lista) ? lista : []).filter((x) => x && CAMPOS_REGLA.includes(x.campo)).map((x) =>
    `${NOMBRE_CAMPO[x.campo]}: se jugó con ${valorRegla(x.campo, x.partido)}; la edición pide ${valorRegla(x.campo, x.regla)}.`);
}

/** Minuto con añadido: si el reloj pasó el final del periodo → «45+2′». Fin: 1.º 45 · 2.º 90 · prórrogas 105 y 120. */
export function minutoConAnadido(minuto, periodo, anadido = 0) {
  const fin = { 1: 45, 2: 90, 3: 105, 4: 120 }[periodo];
  if (fin && anadido > 0 && minuto > fin) return `${fin}+${Math.min(minuto - fin, 30)}′`;
  return `${minuto}′`;
}

/** «Penales 4-3» si hubo tanda (al menos un número > 0); '' si no. */
export function textoPenales(a, b) {
  return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && (a > 0 || b > 0) ? `Penales ${a}-${b}` : '';
}

/**
 * Formulario de reglas del staff → objeto para la base o error. Vacío = sin control.
 * Entradas (texto): duracion '1–60', dificultad '0–10', cambios '0–12', prorroga/penales 'si' | 'no' | '' (cualquiera).
 */
export function leerReglas({ duracion = '', dificultad = '', cambios = '', prorroga = '', penales = '' } = {}) {
  const r = {};
  const numero = (txt, campo, min, max) => {
    const t = String(txt ?? '').trim();
    if (!t) return null;
    if (!/^\d{1,2}$/.test(t) || Number(t) < min || Number(t) > max) return `${NOMBRE_CAMPO[campo]}: un número de ${min} a ${max}.`;
    r[campo] = Number(t);
    return null;
  };
  const err = numero(duracion, 'duracion', 1, 60) || numero(dificultad, 'dificultad', 0, 10) || numero(cambios, 'cambios', 0, 12);
  if (err) return { ok: false, error: err };
  for (const [campo, v] of [['prorroga', prorroga], ['penales', penales]]) {
    if (v === 'si') r[campo] = true; else if (v === 'no') r[campo] = false;
  }
  return { ok: true, reglas: r };
}

/** Reglas guardadas → valores del formulario (lo inverso de leerReglas). */
export function reglasAFormulario(r) {
  const x = r && typeof r === 'object' ? r : {};
  const sn = (v) => (v === true ? 'si' : v === false ? 'no' : '');
  return {
    duracion: esNum(x.duracion) ? String(x.duracion) : '', dificultad: esNum(x.dificultad) ? String(x.dificultad) : '',
    cambios: esNum(x.cambios) ? String(x.cambios) : '', prorroga: sn(x.prorroga), penales: sn(x.penales),
  };
}
