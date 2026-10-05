// SISTEMA DE DIVISIONES (beta): zonas de la tabla, ascensos/descensos y copa interdivisional. Solo lógica pura (sin DOM): se prueba con `npm test`.
// Entrada típica: las tablas ya ordenadas (core/tabla.js) de Primera (nivel 1) y Segunda (nivel 2) división, y una configuración (data/temporada.js).
// Regla de oro: NINGUNA función inventa datos. Si faltan jugadores o la configuración no cuadra, devuelven el motivo en `avisos` en vez de fallar.

const natural = (n, max = 99) => (Number.isInteger(n) && n >= 0 ? Math.min(n, max) : 0);
const potencia2 = (n) => { let p = 1; while (p < n) p *= 2; return p; };

/**
 * Zonas de una tabla: qué filas están en «copa», «sube» (ascenso) o «baja» (descenso).
 * @param {string[]} nombres  jugadores en orden de tabla (1.º primero)
 * @param {1|2} nivel         división
 * @param {{suben:number, copa1:number, copa2:number}} cfg   `suben` = cuántos suben (y, por simetría, bajan); `copaN` = clasificados de la división N a la copa
 * @returns {Map<string, ('copa'|'sube'|'baja')[]>}
 */
export function zonasDivision(nombres, nivel, cfg = {}) {
  const n = nombres.length; const z = new Map(nombres.map((x) => [x, []]));
  const k = Math.min(natural(cfg.suben, 8), nivel === 1 ? Math.floor(n / 2) : n);   // en Primera, nunca más de la mitad de la tabla
  const c = Math.min(natural(nivel === 1 ? cfg.copa1 : cfg.copa2, 16), n);
  nombres.forEach((nombre, i) => {
    if (i < c) z.get(nombre).push('copa');
    if (nivel === 2 && i < k) z.get(nombre).push('sube');
    if (nivel === 1 && k > 0 && i >= n - k) z.get(nombre).push('baja');
  });
  return z;
}

/**
 * Zonas de una liga INDEPENDIENTE (p. ej. Sudario): sube/baja/copa se calculan solo con su propia tabla, sin mezclarse con otra liga.
 * @param {string[]} nombres tabla ordenada de 1.º a último
 * @param {{suben?:number, bajan?:number, copa?:number}} cfg
 */
export function zonasLiga(nombres, cfg = {}) {
  const n = nombres.length; const z = new Map(nombres.map((x) => [x, []]));
  const k = Math.min(natural(cfg.suben, 8), Math.floor(n / 2)); const b = Math.min(natural(cfg.bajan, 8), Math.floor(n / 2)); const c = Math.min(natural(cfg.copa, 16), n);
  nombres.forEach((nombre, i) => {
    if (i < c) z.get(nombre).push('copa');
    if (i < k) z.get(nombre).push('sube');
    if (b > 0 && i >= n - b) z.get(nombre).push('baja');
  });
  return z;
}

/**
 * Ascensos y descensos al cerrar la temporada. Suben y bajan SIEMPRE el mismo número, para que cada división conserve su tamaño.
 * @returns {{k:number, suben:string[], bajan:string[], div1:string[], div2:string[], avisos:string[]}}
 */
export function resolverAscensos(div1, div2, suben = 2) {
  const avisos = []; const pedido = natural(suben, 8);
  const k = Math.min(pedido, Math.floor(div1.length / 2), div2.length);
  if (pedido > k) avisos.push(`Se pidieron ${pedido} ascensos, pero con ${div1.length} en Primera y ${div2.length} en Segunda solo pueden intercambiarse ${k}.`);
  const sube = div2.slice(0, k); const baja = k ? div1.slice(div1.length - k) : [];
  const div1Nueva = [...div1.slice(0, div1.length - k), ...sube]; const div2Nueva = [...baja, ...div2.slice(k)];
  return { k, suben: sube, bajan: baja, div1: div1Nueva, div2: div2Nueva, avisos };
}

/**
 * Clasificados a la copa, con cabeza de serie: se ordenan por puesto en su tabla y, a igual puesto, Primera antes que Segunda
 * (1.º de Primera, 1.º de Segunda, 2.º de Primera, 2.º de Segunda…).
 * @returns {{nombre:string, nivel:1|2, pos:number, seed:number}[]}
 */
export function clasificadosCopa(div1, div2, c1 = 4, c2 = 4) {
  const a = div1.slice(0, natural(c1, 16)).map((nombre, i) => ({ nombre, nivel: 1, pos: i + 1 }));
  const b = div2.slice(0, natural(c2, 16)).map((nombre, i) => ({ nombre, nivel: 2, pos: i + 1 }));
  return [...a, ...b].sort((x, y) => x.pos - y.pos || x.nivel - y.nivel).map((t, i) => ({ ...t, seed: i + 1 }));
}

/** Orden de cabezas de serie en un cuadro de `n` plazas (potencia de 2): 1 vs n, 2 vs n-1… y los mejores en mitades opuestas. */
export function ordenCuadro(n) {
  let o = [1, 2]; if (n < 2) return [1];
  while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap((s) => [s, m - s]); }
  return o;
}
const nombreRonda = (equipos) => ({ 2: 'Final', 4: 'Semifinales', 8: 'Cuartos de final', 16: 'Octavos de final' })[equipos] ?? `Ronda de ${equipos}`;
const esGol = (x) => Number.isInteger(x) && x >= 0;
/** Ganador de un cruce a partir del marcador (y penales si empatan). null = aún sin definir. */
export function ganadorDe(p) {
  if (!p?.a || !p?.b) return null;
  if (esGol(p.ga) && esGol(p.gb)) { if (p.ga !== p.gb) return p.ga > p.gb ? p.a : p.b; if (esGol(p.pa) && esGol(p.pb) && p.pa !== p.pb) return p.pa > p.pb ? p.a : p.b; }
  return null;
}

/**
 * Cuadro de eliminación directa. Con un número de clasificados que no es potencia de 2, los mejores cabezas de serie pasan libres la primera ronda.
 * @param {{nombre:string, seed:number}[]} clasificados
 * @param {Record<string,{ga?:number,gb?:number,pa?:number,pb?:number}>} resultados  por id de cruce («R1-P1»…)
 * @returns {{rondas:{nombre:string, partidos:{id:string,a:object|null,b:object|null,ga?:number,gb?:number,pa?:number,pb?:number,libre:boolean,ganador:object|null}[]}[], campeon:object|null, avisos:string[]}}
 */
export function construirCopa(clasificados, resultados = {}) {
  const lista = [...clasificados].sort((x, y) => x.seed - y.seed);
  if (lista.length < 2) return { rondas: [], campeon: null, avisos: [lista.length ? 'Se necesitan al menos 2 clasificados para armar la copa.' : 'No hay clasificados a la copa.'] };
  const tam = potencia2(lista.length); const porSeed = new Map(lista.map((t) => [t.seed, t]));
  let actuales = ordenCuadro(tam).map((s) => porSeed.get(s) ?? null);              // plazas de la ronda 1 (null = plaza libre)
  const rondas = [];
  for (let r = 1; actuales.length > 1; r += 1) {
    const partidos = []; const siguientes = [];
    for (let i = 0; i < actuales.length; i += 2) {
      const a = actuales[i]; const b = actuales[i + 1]; const id = `R${r}-P${i / 2 + 1}`; const libre = !!(a && !b) || !!(!a && b);
      const res = resultados[id] ?? {}; const p = { id, a, b, ...res, libre };
      const ganador = libre ? (a ?? b) : ganadorDe(p);
      partidos.push({ ...p, ganador }); siguientes.push(ganador);
    }
    rondas.push({ nombre: nombreRonda(actuales.length), partidos }); actuales = siguientes;
  }
  return { rondas, campeon: actuales[0] ?? null, avisos: [] };
}

/** Validación de la configuración: valores sueltos o absurdos se corrigen y se explican. */
export function normalizarConfig(cfg = {}, n1 = 0, n2 = 0) {
  const avisos = []; const suben = Math.min(natural(cfg.suben ?? 2, 8), Math.floor(n1 / 2), n2);
  if (natural(cfg.suben ?? 2, 8) > suben) avisos.push('Los ascensos se limitaron al tamaño de las divisiones.');
  const copa1 = Math.min(natural(cfg.copa1 ?? 4, 16), n1); const copa2 = Math.min(natural(cfg.copa2 ?? 4, 16), n2);
  if (copa1 + copa2 < 2) avisos.push('La copa necesita al menos 2 clasificados entre ambas divisiones.');
  return { cfg: { suben, copa1, copa2 }, avisos };
}

/**
 * Valida el resultado de un cruce de la copa tal como llega del formulario (textos).
 * Reglas: goles de ambos o de ninguno (vacío = sin jugar); penales solo si hay empate, y de ambos; todo entero 0–99.
 * @returns {{ok:boolean, errores:string[], fila:{ga:number|null,gb:number|null,pa:number|null,pb:number|null}}}
 */
export function validarResultadoCopa(b = {}) {
  const e = []; const num = (v, n) => { const t = String(v ?? '').trim(); if (t === '') return null; const x = Number(t); if (!(Number.isInteger(x) && x >= 0 && x <= 99)) { e.push(`${n}: escribe un entero entre 0 y 99 (o déjalo vacío).`); return null; } return x; };
  const ga = num(b.ga, 'Goles del primero'); const gb = num(b.gb, 'Goles del segundo'); const pa = num(b.pa, 'Penales del primero'); const pb = num(b.pb, 'Penales del segundo');
  if ((ga === null) !== (gb === null) && !e.length) e.push('Escribe los goles de los dos, o deja ambos vacíos.');
  if ((pa === null) !== (pb === null) && !e.length) e.push('Escribe los penales de los dos, o deja ambos vacíos.');
  if (!e.length && pa !== null) { if (ga === null || ga !== gb) e.push('Los penales solo se anotan si el partido terminó empatado.'); else if (pa === pb) e.push('Los penales no pueden terminar empatados.'); }
  return { ok: e.length === 0, errores: e, fila: { ga, gb, pa, pb } };
}
/** Filas de la tabla copa_resultados → mapa por cruce, sin los campos vacíos (formato que espera construirCopa). */
export function resultadosDesdeFilas(filas) {
  const m = {}; for (const f of filas ?? []) { if (!f?.cruce) continue; const r = {}; for (const k of ['ga', 'gb', 'pa', 'pb']) if (Number.isInteger(f[k])) r[k] = f[k]; if (Object.keys(r).length) m[f.cruce] = r; }
  return m;
}
