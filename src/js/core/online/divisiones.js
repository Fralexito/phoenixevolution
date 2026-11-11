// Divisiones online de Phoenix (D12 = la más baja … D1 = la más alta). Lógica pura, con test.
export const DIVISIONES = Array.from({ length: 12 }, (_, i) => `D${12 - i}`); // D12..D1 (de abajo hacia arriba)

/** Número de una división: «D3» → 3. Si no se entiende, 99 (va al final). */
export const numDivision = (d) => { const m = /(\d+)/.exec(String(d ?? '')); return m ? Number(m[1]) : 99; };

/** Agrupa filas del ranking por división, de la D1 (la mejor) a la D12. Cada grupo conserva el orden del servidor. */
export function agruparPorDivision(filas) {
  const mapa = new Map();
  for (const f of filas ?? []) {
    const k = String(f.division ?? '—');
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(f);
  }
  return [...mapa.entries()].sort((a, b) => numDivision(a[0]) - numDivision(b[0])).map(([division, jugadores]) => ({ division, jugadores }));
}

/** Código que escribe el jugador: solo 4–12 letras/números/guion, en mayúsculas. '' si no sirve. */
export function limpiarCodigo(txt) {
  const c = String(txt ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9-]{4,12}$/.test(c) ? c : '';
}
