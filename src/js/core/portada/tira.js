// TIRA DE PARTIDOS (rediseño, inspirada en la barra de partidos de la Champions / Premier League). Lógica pura, sin DOM.
// Devuelve los últimos resultados (en orden de fecha) y luego los próximos partidos, para una franja que se desliza de lado.
// Pruebas: tests/tira.test.mjs
const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);

/**
 * @param {Array<{n:number, partidos:Array<{l:string,v:string,gl:number|null,gv:number|null}>}>} fechas
 * @param {Record<string,string>} clubes  DT → club (para el escudo)
 * @param {{jugados?:number, pendientes?:number}} [o]
 * @returns {Array<{fecha:number, l:string, v:string, clubL:string, clubV:string, gl:number|null, gv:number|null, estado:'final'|'pendiente'}>}
 */
export function tiraPartidos(fechas, clubes = {}, { jugados = 6, pendientes = 6 } = {}) {
  const fs = (Array.isArray(fechas) ? fechas : []).filter((f) => Array.isArray(f?.partidos) && Number.isFinite(f?.n)).sort((a, b) => a.n - b.n);
  const fila = (f, m) => ({ fecha: f.n, l: String(m.l ?? ''), v: String(m.v ?? ''), clubL: clubes[m.l] ?? '', clubV: clubes[m.v] ?? '',
    gl: jugado(m) ? m.gl : null, gv: jugado(m) ? m.gv : null, estado: jugado(m) ? 'final' : 'pendiente' });
  const fin = []; for (const f of [...fs].reverse()) { for (const m of [...f.partidos].reverse()) if (jugado(m)) fin.push(fila(f, m)); if (fin.length >= jugados) break; }
  const pen = []; for (const f of fs) { for (const m of f.partidos) if (!jugado(m) && m?.l && m?.v) pen.push(fila(f, m)); if (pen.length >= pendientes) break; }
  return [...fin.slice(0, jugados).reverse(), ...pen.slice(0, pendientes)];
}

/** Iniciales cortas para la tira («Maurisgame» → «MAU»). */
export const sigla = (nombre) => String(nombre ?? '').normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || '—';
