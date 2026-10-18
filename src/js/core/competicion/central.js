// Lógica pura de la página Central (sin DOM → probable con `npm test`).

/** Cifra para mostrar en las tarjetas del pulso: número entero ≥ 0 → texto; cualquier otra cosa (error, null) → «—». */
export const cifra = (n) => (Number.isFinite(n) && n >= 0 ? String(Math.trunc(n)) : '—');

/** Separa los partidos en próximos (llevan una nota de hora, p. ej. «HOY 22:00», o aún no tienen marcador) y resultados (con marcador). */
export function partirPartidos(partidos) {
  const lista = Array.isArray(partidos) ? partidos : [];
  const jugado = (m) => !m.nota && m.gl !== '-' && m.gv !== '-' && m.gl != null && m.gv != null;
  return { proximos: lista.filter((m) => !jugado(m)), resultados: lista.filter(jugado) };
}

/**
 * Orden de podio: recibe los jugadores ya ordenados de mejor a peor y devuelve [{ jugador, puesto }]
 * con el 2.º a la izquierda, el 1.º en el centro y el 3.º a la derecha. Con menos de 3 jugadores no deja huecos.
 */
export function ordenPodio(ordenados) {
  const l = (Array.isArray(ordenados) ? ordenados : []).slice(0, 3).map((jugador, i) => ({ jugador, puesto: i + 1 }));
  const [a, b, c] = l;
  return [b, a, c].filter(Boolean);
}

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const pendiente = (m) => m && m.gl == null && m.gv == null;

/**
 * Qué mostrar en «Central de Partidos» a partir de las fechas de la edición en curso:
 *  · resultados = hasta las 2 ÚLTIMAS fechas con algún partido jugado (la más reciente primero; solo los jugados). Así una fecha recién empezada no deja la lista casi vacía
 *  · proximos   = la PRIMERA fecha que tenga algún partido sin jugar (solo los pendientes)
 * Una fecha a medias aparece en las dos pestañas, cada una con su parte. Sin fechas → [] y null.
 * @returns {{resultados:{n:number,partidos:object[]}[], proximos:{n:number,partidos:object[]}|null}}
 */
export function jornadasCentral(fechas) {
  const f = Array.isArray(fechas) ? fechas : [];
  const ult = [...f].reverse().filter((x) => x.partidos?.some(jugado)).slice(0, 2);
  const sig = f.find((x) => x.partidos?.some(pendiente));
  return {
    resultados: ult.map((x) => ({ n: x.n, partidos: x.partidos.filter(jugado) })),
    proximos: sig ? { n: sig.n, partidos: sig.partidos.filter(pendiente) } : null,
  };
}

/** Partido destacado: de los pendientes, el que enfrenta a los mejor ubicados de la tabla (menor suma de puestos; a igualdad, el primero listado). */
export function partidoDestacado(pendientes, tabla) {
  const pos = new Map((Array.isArray(tabla) ? tabla : []).map((t, i) => [t.nombre, i + 1]));
  const peso = (m) => (pos.get(m.l) ?? 99) + (pos.get(m.v) ?? 99);
  return (Array.isArray(pendientes) ? pendientes : []).reduce((mejor, m) => (!mejor || peso(m) < peso(mejor) ? m : mejor), null);
}

/** Escudo-monograma de un club; los desconocidos reciben uno neutro con sus 3 primeras letras. */
export function visualClub(club, mapa = {}) {
  const v = mapa[club]; if (v) return v;
  return { sigla: String(club ?? '?').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 3).toUpperCase() || '?', a: '#6b7280', b: '#1f2937' };
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Primer partido de la lista donde juega alguien con alguno de estos nombres (sin importar mayúsculas ni tildes). null si no hay. */
export function partidoDe(partidos, nombres) {
  const ns = new Set((Array.isArray(nombres) ? nombres : []).map(norm).filter(Boolean));
  if (!ns.size) return null;
  return (Array.isArray(partidos) ? partidos : []).find((m) => ns.has(norm(m.l)) || ns.has(norm(m.v))) ?? null;
}

/**
 * Recorte de la tabla para la portada: los `n` primeros y, si la persona está más abajo, su fila al final (marcada).
 * @returns {{fila:object, puesto:number, mio:boolean}[]}
 */
export function recorteTabla(tabla, nombres, n = 5) {
  const t = Array.isArray(tabla) ? tabla : [], ns = new Set((Array.isArray(nombres) ? nombres : []).map(norm).filter(Boolean));
  const mio = (f) => ns.has(norm(f.nombre));
  const out = t.slice(0, n).map((fila, i) => ({ fila, puesto: i + 1, mio: mio(fila) }));
  const i = t.findIndex(mio);
  if (i >= n) out.push({ fila: t[i], puesto: i + 1, mio: true });
  return out;
}

/** Cifra intermedia de una cuenta animada (0 → destino) con suavizado; `p` va de 0 a 1. */
export const pasoCuenta = (destino, p) => Math.round(Math.max(0, Number(destino) || 0) * (1 - (1 - Math.min(1, Math.max(0, p))) ** 3));

// ───────── Historial por fecha (pestaña «Por fecha» de Central) ─────────
const esJugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);

/**
 * Tabla ordenada tal como quedó DESPUÉS de la fecha `n` (solo cuentan partidos con marcador de las fechas ≤ n).
 * `calcular` es calcularTabla (se inyecta para que este módulo siga siendo puro). `jugadores` añade a quien aún no jugó, con ceros.
 */
export function tablaTrasFecha(fechas, n, calcular, jugadores = []) {
  const partidos = (Array.isArray(fechas) ? fechas : []).filter((f) => f.n <= n).flatMap((f) => f.partidos ?? []);
  const t = calcular(partidos).tabla; const hay = new Set(t.map((f) => f.nombre));
  const faltan = [...new Set(jugadores)].filter((x) => !hay.has(x)).sort((a, b) => a.localeCompare(b, 'es'));
  return [...t, ...faltan.map((nombre) => ({ nombre, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }))];
}

/**
 * Cómo se movió cada jugador en la fecha `n`: puesto tras la fecha, puesto antes (null si no había tabla previa) y `delta` (+ = subió).
 * @returns {Map<string,{puesto:number, antes:number|null, delta:number}>}
 */
export function movimientosTabla(fechas, n, calcular, jugadores = []) {
  const ahora = tablaTrasFecha(fechas, n, calcular, jugadores);
  const hayPrevia = (fechas ?? []).some((f) => f.n < n && f.partidos?.some(esJugado));
  const antes = hayPrevia ? new Map(tablaTrasFecha(fechas, n - 1, calcular, jugadores).map((f, i) => [f.nombre, i + 1])) : new Map();
  return new Map(ahora.map((f, i) => { const a = antes.get(f.nombre) ?? null; return [f.nombre, { puesto: i + 1, antes: a, delta: a === null ? 0 : a - (i + 1) }]; }));
}

/** Datos sueltos de una fecha: goles, promedio, empates, mayor goleada y victorias de local/visita. */
export function estadisticasFecha(fecha) {
  const js = (fecha?.partidos ?? []).filter(esJugado);
  const goles = js.reduce((a, m) => a + m.gl + m.gv, 0);
  const goleada = js.reduce((mejor, m) => (!mejor || Math.abs(m.gl - m.gv) > Math.abs(mejor.gl - mejor.gv) ? m : mejor), null);
  return {
    jugados: js.length, total: (fecha?.partidos ?? []).length, goles, promedio: js.length ? Math.round((goles / js.length) * 10) / 10 : null,
    empates: js.filter((m) => m.gl === m.gv).length, local: js.filter((m) => m.gl > m.gv).length, visita: js.filter((m) => m.gv > m.gl).length,
    goleada: goleada && goleada.gl !== goleada.gv ? goleada : null,
  };
}

/**
 * Partido destacado AUTOMÁTICO de una fecha. Si ya se jugó: el de más goles (a igualdad, el de mejor ubicados en la tabla previa).
 * Si no: el que enfrenta a los mejor ubicados. `tablaPrevia` = tabla antes de esa fecha.
 */
export function destacadoAutomatico(fecha, tablaPrevia) {
  const ps = fecha?.partidos ?? []; if (!ps.length) return null;
  const pos = new Map((tablaPrevia ?? []).map((t, i) => [t.nombre, i + 1]));
  const peso = (m) => (pos.get(m.l) ?? 99) + (pos.get(m.v) ?? 99);
  const jugados = ps.filter(esJugado);
  if (jugados.length) return jugados.reduce((b, m) => { const g = m.gl + m.gv; const gb = b ? b.gl + b.gv : -1; return !b || g > gb || (g === gb && peso(m) < peso(b)) ? m : b; }, null);
  return partidoDestacado(ps, tablaPrevia);
}

/** Aplica la elección manual (fila de la tabla partido_destacado: {local, visitante, nota}) si ese cruce existe en la fecha; si no, usa el automático. */
export function destacadoFinal(fecha, tablaPrevia, manual) {
  const auto = destacadoAutomatico(fecha, tablaPrevia);
  if (manual) {
    const m = (fecha?.partidos ?? []).find((x) => norm(x.l) === norm(manual.local) && norm(x.v) === norm(manual.visitante));
    if (m) return { partido: m, manual: true, nota: manual.nota ?? '' };
  }
  return auto ? { partido: auto, manual: false, nota: '' } : null;
}

/**
 * Rachas actuales. Para cada jugador mira sus partidos jugados (de más reciente a más antiguo) y cuenta cuántos seguidos lleva
 * ganando (`victorias`), sin perder (`invicto`) o perdiendo (`derrotas`). Solo devuelve rachas de al menos `min` partidos, de mayor a menor.
 * @param {{n:number,partidos:object[]}[]} fechas  @param {string[]} nombres
 */
export function rachas(fechas, nombres, min = 2) {
  const res = { victorias: [], invicto: [], derrotas: [] };
  for (const nombre of nombres ?? []) {
    const rs = [];
    for (const f of fechas ?? []) for (const m of f.partidos ?? []) {
      if (!esJugado(m) || (m.l !== nombre && m.v !== nombre)) continue;
      const a = m.l === nombre ? m.gl : m.gv; const b = m.l === nombre ? m.gv : m.gl; rs.push(a > b ? 'G' : a < b ? 'P' : 'E');
    }
    rs.reverse();
    const cuenta = (ok) => { let k = 0; for (const r of rs) { if (!ok(r)) break; k += 1; } return k; };
    const g = cuenta((r) => r === 'G'), i = cuenta((r) => r !== 'P'), d = cuenta((r) => r === 'P');
    if (g >= min) res.victorias.push({ nombre, n: g });
    if (i >= min && i > g) res.invicto.push({ nombre, n: i });   // si ya cuenta como racha de victorias, no se repite aquí
    if (d >= min) res.derrotas.push({ nombre, n: d });
  }
  for (const k of Object.keys(res)) res[k].sort((x, y) => y.n - x.n || x.nombre.localeCompare(y.nombre, 'es'));
  return res;
}

/** Cuántos resultados nuevos hay desde la última visita (null si es la primera visita o no hay dato guardado). */
export const resultadosNuevos = (jugadosAhora, jugadosAntes) => (Number.isInteger(jugadosAntes) && jugadosAhora > jugadosAntes ? jugadosAhora - jugadosAntes : null);
