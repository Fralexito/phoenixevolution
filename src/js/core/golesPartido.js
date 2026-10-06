// Goles de un partido (minuto, goleador, asistente) — lógica PURA (sin DOM → probable). La lectura/escritura vive en features/detallePartido.js.
// Un gol: { lado: 'l'|'v' (a quién suma en el marcador), goleador, minuto, asistente?, tipo: 'gol'|'penal'|'en_contra' }.

export const TIPOS_GOL = { gol: 'Gol', penal: 'Penal', en_contra: 'En contra' };
const limpio = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const malo = (s) => /[<>]/.test(s);

/**
 * Valida y normaliza un gol escrito en el formulario.
 * @returns {{ok:boolean, errores:string[], gol:object|null}}
 */
export function validarGol(g) {
  const errores = [];
  const lado = g?.lado === 'l' || g?.lado === 'v' ? g.lado : null;
  const tipo = Object.hasOwn(TIPOS_GOL, g?.tipo) ? g.tipo : 'gol';
  const goleador = limpio(g?.goleador), asistente = limpio(g?.asistente);
  const minuto = typeof g?.minuto === 'number' ? g.minuto : /^\d{1,3}$/.test(String(g?.minuto ?? '').trim()) ? Number(String(g.minuto).trim()) : NaN;
  if (!lado) errores.push('Elige a quién se le anota el gol.');
  if (!goleador) errores.push('Escribe quién metió el gol.'); else if (goleador.length > 60) errores.push('El nombre del goleador es muy largo (máx. 60).'); else if (malo(goleador)) errores.push('El nombre del goleador tiene caracteres no permitidos.');
  if (!Number.isInteger(minuto) || minuto < 0 || minuto > 130) errores.push('El minuto debe ser un número entre 0 y 130.');
  if (asistente) {
    if (asistente.length > 60) errores.push('El nombre del asistente es muy largo (máx. 60).');
    else if (malo(asistente)) errores.push('El nombre del asistente tiene caracteres no permitidos.');
    else if (tipo !== 'gol') errores.push('Un penal o un autogol no lleva asistencia.');
    else if (asistente.toLowerCase() === goleador.toLowerCase()) errores.push('El asistente no puede ser el mismo que el goleador.');
  }
  if (errores.length) return { ok: false, errores, gol: null };
  return { ok: true, errores: [], gol: { lado, goleador, minuto, asistente: asistente || null, tipo } };
}

/** Goles en orden de partido (minuto ascendente; a igualdad, el orden en que se cargaron). No modifica la lista original. */
export const ordenarGoles = (goles) => (Array.isArray(goles) ? goles : []).map((g, i) => ({ g, i })).sort((a, b) => a.g.minuto - b.g.minuto || a.i - b.i).map((x) => x.g);

/** Marcador que suman los goles cargados. */
export const marcadorDeGoles = (goles) => (Array.isArray(goles) ? goles : []).reduce((a, g) => { if (g.lado === 'l') a.l += 1; else if (g.lado === 'v') a.v += 1; return a; }, { l: 0, v: 0 });

/**
 * Compara los goles cargados con el marcador oficial del partido.
 *  · 'sin_marcador' (el partido aún no se juega) · 'sin_detalle' (hay marcador pero ningún gol cargado) · 'completo' (coinciden) · 'faltan' (hay menos goles que en el marcador) · 'sobran' (hay más)
 * Si en un lado faltan y en el otro sobran, manda 'sobran' (es lo más grave: hay algo mal cargado).
 */
export function revisarMarcador(goles, partido) {
  const ok = Number.isInteger(partido?.gl) && Number.isInteger(partido?.gv);
  const m = marcadorDeGoles(goles);
  if (!ok) return { estado: 'sin_marcador', ...m, dl: 0, dv: 0 };
  const dl = partido.gl - m.l, dv = partido.gv - m.v;
  const estado = !(goles ?? []).length ? 'sin_detalle' : dl === 0 && dv === 0 ? 'completo' : dl < 0 || dv < 0 ? 'sobran' : 'faltan';
  return { estado, ...m, dl, dv };
}

const top = (filas, clave, n) => {
  const c = new Map(); for (const f of filas) { const k = limpio(f[clave]); if (k) c.set(k, (c.get(k) ?? 0) + 1); }
  return [...c].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es')).slice(0, n);
};
/** Máximos goleadores (los autogoles no cuentan). @returns {{nombre:string,total:number}[]} */
export const topGoleadores = (goles, n = 5) => top((goles ?? []).filter((g) => g.tipo !== 'en_contra'), 'goleador', n);
/** Máximos asistentes. */
export const topAsistentes = (goles, n = 5) => top((goles ?? []).filter((g) => g.asistente), 'asistente', n);
