// Lógica pura del «pase» de la portada élite (FX.elite): líder, puesto, próximo partido y número de miembro. Sin DOM ni Supabase.
// Pruebas: tests/pase.test.mjs

const norma = (s) => String(s ?? '').trim().toLowerCase();

/** Líder de la tabla ya ordenada (o null si aún no hay partidos jugados). */
export const liderDe = (tabla) => (Array.isArray(tabla) && tabla.length && tabla[0].pj > 0 ? tabla[0] : null);

/** Puesto (1, 2, …) del primer nombre de `candidatos` que aparezca en la tabla, sin importar mayúsculas. null si no juega. */
export function puestoDe(tabla, candidatos) {
  const set = new Set((candidatos ?? []).map(norma).filter(Boolean));
  const i = (tabla ?? []).findIndex((f) => set.has(norma(f.nombre)));
  return i < 0 ? null : { puesto: i + 1, de: tabla.length, fila: tabla[i] };
}

/** Primer partido sin marcador donde juega `nombre`: { fecha, rival, local }. null si no tiene. */
export function proximoPartido(fechas, nombre) {
  const n = norma(nombre); if (!n) return null;
  for (const f of fechas ?? []) {
    for (const m of f?.partidos ?? []) {
      if (m.gl != null || m.gv != null) continue;
      if (norma(m.l) === n) return { fecha: f.n, rival: m.v, local: true };
      if (norma(m.v) === n) return { fecha: f.n, rival: m.l, local: false };
    }
  }
  return null;
}

/** Nombre real del jugador en la tabla que coincide con alguno de los candidatos (para buscar su próximo partido). */
export function nombreEnLiga(nombres, candidatos) {
  const set = new Set((candidatos ?? []).map(norma).filter(Boolean));
  return (nombres ?? []).find((x) => set.has(norma(x))) ?? null;
}

/** 7 → «N.º 007». Sin número válido → «N.º —». */
export function numeroMiembro(n) {
  return Number.isInteger(n) && n > 0 ? `N.º ${String(n).padStart(3, '0')}` : 'N.º —';
}

/** La entrada tipo «transmisión» sale una vez por día: true si `hoy` (AAAA-MM-DD) es distinto del último día guardado. */
export const tocaIntro = (ultimoDia, hoy) => Boolean(hoy) && ultimoDia !== hoy;
