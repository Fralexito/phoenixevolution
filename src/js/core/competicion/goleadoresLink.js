// Goleadores automáticos — lógica PURA (sin DOM → `npm test`). Datos de goleadores_comunidad (migración 148).
// También valida la lista de goles que manda Phoenix Link (la misma regla que la BD, para la Edge Function y las pruebas).

export const PERIODOS = [{ dias: 30, texto: 'Últimos 30 días' }, { dias: null, texto: 'Siempre' }];
export const MAX_GOLES = 40;

/** Normaliza la respuesta → { goleadores, asistentes, duelos } con filas válidas y posición (empates comparten puesto). */
export function prepararGoleadores(r) {
  const fila = (campo) => (x) => x && typeof x.nombre === 'string' && Number.isFinite(Number(x[campo])) && Number(x[campo]) > 0;
  const puestos = (lista, campo) => {
    let previo = null; let puesto = 0;
    return lista.map((x, i) => { const n = Number(x[campo]); if (n !== previo) { puesto = i + 1; previo = n; } return { nombre: x.nombre, n, puesto }; });
  };
  const g = (Array.isArray(r?.goleadores) ? r.goleadores : []).filter(fila('goles'));
  const a = (Array.isArray(r?.asistentes) ? r.asistentes : []).filter(fila('asistencias'));
  return { goleadores: puestos(g, 'goles'), asistentes: puestos(a, 'asistencias'), duelos: Number(r?.duelos) || 0 };
}

export const nombreFutbolista = (t) => (typeof t === 'string' ? t.replace(/\s+/g, ' ').trim() : '');

/** Valida los goles de Link. → { ok: true, goles } o { ok: false, error, indice }. */
export function validarGolesLink(goles) {
  if (!Array.isArray(goles)) return { ok: false, error: 'goles debe ser una lista', indice: null };
  if (goles.length > MAX_GOLES) return { ok: false, error: `demasiados goles (máx. ${MAX_GOLES})`, indice: null };
  const out = [];
  for (let i = 0; i < goles.length; i++) {
    const g = goles[i];
    if (!g || typeof g !== 'object' || !['A', 'B'].includes(g.lado)) return { ok: false, error: 'lado', indice: i };
    const goleador = nombreFutbolista(g.goleador);
    if (!goleador || goleador.length > 60 || /[<>]/.test(goleador)) return { ok: false, error: 'goleador', indice: i };
    if (!Number.isInteger(g.minuto) || g.minuto < 0 || g.minuto > 130) return { ok: false, error: 'minuto', indice: i };
    const tipo = g.tipo ?? 'gol';
    if (!['gol', 'penal', 'en_contra'].includes(tipo)) return { ok: false, error: 'tipo', indice: i };
    const asistente = nombreFutbolista(g.asistente) || null;
    if (asistente && (tipo !== 'gol' || asistente.length > 60 || /[<>]/.test(asistente))) return { ok: false, error: 'asistente', indice: i };
    out.push({ lado: g.lado, goleador, minuto: g.minuto, tipo, asistente });
  }
  return { ok: true, goles: out };
}
