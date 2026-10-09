// Motor de FORMATOS de torneo (puro, sin DOM → se prueba con `npm test`). Documentación: docs/FORMATOS.md
// Un «slot» (lado de un partido) puede ser: un nombre (texto) · null (descanso/bye) · { ganadorDe: id } · { perdedorDe: id } · { puesto: { grupo, pos } }.
// Todas las funciones son deterministas: el mismo orden de jugadores da siempre los mismos cruces (el sorteo usa una semilla).

export const FORMATOS = Object.freeze([
  { id: 'eliminacion', nombre: 'Eliminatoria simple', icono: 'fa-bolt', tono: 'casual', min: 2, max: 64, frase: 'Pierdes y te vas.', cuando: 'Torneo rápido de un día.' },
  { id: 'doble', nombre: 'Doble eliminatoria', icono: 'fa-heart', tono: 'serio', min: 4, max: 32, exacto: [4, 8, 16, 32, 64], frase: 'Tienes dos vidas.', cuando: 'Torneo serio donde un mal día no debe sacarte.' },
  { id: 'liguilla', nombre: 'Liguilla', icono: 'fa-table-list', tono: 'serio', min: 3, max: 12, frase: 'Juegas contra todos una vez.', cuando: 'Liga corta y justa.' },
  { id: 'idavuelta', nombre: 'Liguilla ida y vuelta', icono: 'fa-repeat', tono: 'serio', min: 3, max: 10, frase: 'Cada rival, dos veces: en casa y fuera.', cuando: 'Liga larga con remontadas.' },
  { id: 'grupos', nombre: 'Grupos + playoffs', icono: 'fa-layer-group', tono: 'serio', min: 6, max: 64, frase: 'Fase de grupos y luego eliminatoria, como el Mundial.', cuando: 'Evento grande.' },
  { id: 'suizo', nombre: 'Sistema suizo', icono: 'fa-scale-balanced', tono: 'casual', min: 4, max: 64, frase: 'Cada ronda juegas con alguien de tu nivel; nadie se va.', cuando: 'Muchos inscritos y poco tiempo.' },
  { id: 'colina', nombre: 'Rey de la colina', icono: 'fa-mountain', tono: 'divertido', min: 3, max: 16, frase: 'El campeón espera y los demás lo retan.', cuando: 'Sala en vivo y transmisión.' },
  { id: 'escalera', nombre: 'Escalera', icono: 'fa-stairs', tono: 'casual', min: 3, max: 64, frase: 'Retas al de arriba; si ganas, cambian de puesto.', cuando: 'Competencia que nunca termina.' },
  { id: 'circuito', nombre: 'Circuito por puntos', icono: 'fa-flag-checkered', tono: 'serio', min: 3, max: 64, frase: 'Varias fechas sueltas suman a un ranking.', cuando: 'Circuito de varias semanas.' },
]);
export const formatoPorId = (id) => FORMATOS.find((f) => f.id === id) ?? null;

// ── Utilidades ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const potencia2 = (n) => { let p = 1; while (p < n) p *= 2; return p; };
const clave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Quita espacios, vacíos y repetidos (sin distinguir mayúsculas). Conserva el orden = orden de siembra (el primero es el mejor). */
export function limpiarJugadores(lista, max = 64) {
  const vistos = new Set(); const out = [];
  for (const x of Array.isArray(lista) ? lista : []) {
    const t = String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const k = t.toLowerCase();
    if (!t || vistos.has(k)) continue;
    vistos.add(k); out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Sorteo reproducible (Fisher-Yates con semilla). Misma semilla → mismo orden. */
export function mezclar(lista, semilla = 1) {
  let s = (Number(semilla) || 1) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Orden clásico de siembra para una llave de `tam` (potencia de 2): 1 vs último, y los mejores se cruzan lo más tarde posible. */
export function ordenSemillas(tam) {
  let o = [1, 2];
  while (o.length < tam) { const n = o.length * 2; o = o.flatMap((s) => [s, n + 1 - s]); }
  return o.slice(0, tam);
}

/** Texto legible de un slot. */
export function etiquetaSlot(s) {
  if (s === null || s === undefined) return 'Descansa';
  if (typeof s === 'string') return s;
  if (s.ganadorDe) return `Ganador ${s.ganadorDe}`;
  if (s.perdedorDe) return `Perdedor ${s.perdedorDe}`;
  if (s.puesto) return `${s.puesto.pos}.º del Grupo ${s.puesto.grupo}`;
  return '—';
}

const nombreRonda = (cuantos) => (cuantos === 1 ? 'Final' : cuantos === 2 ? 'Semifinales' : cuantos === 4 ? 'Cuartos de final' : cuantos === 8 ? 'Octavos de final' : `Ronda de ${cuantos * 2}`);
const avanza = (m) => (m.bye ? (m.a ?? m.b) : { ganadorDe: m.id });

/** Construye una llave a partir de la primera ronda (parejas) y encadena las siguientes. `parejas.length` debe ser potencia de 2. */
function llave(prefijo, parejas, nombrar = nombreRonda) {
  const rondas = [];
  let actual = parejas.map(([a, b], i) => ({ id: `${prefijo}1-${i + 1}`, a, b, bye: (a === null) !== (b === null) }));
  let r = 1;
  for (;;) {
    rondas.push({ nombre: nombrar(actual.length), partidos: actual });
    if (actual.length === 1) break;
    r += 1;
    const sig = [];
    for (let i = 0; i < actual.length; i += 2) sig.push({ id: `${prefijo}${r}-${i / 2 + 1}`, a: avanza(actual[i]), b: avanza(actual[i + 1]), bye: false });
    actual = sig;
  }
  return rondas;
}

function parejasPorSemilla(jugadores) {
  const tam = potencia2(jugadores.length);
  const orden = ordenSemillas(tam);
  const slot = (s) => (s <= jugadores.length ? jugadores[s - 1] : null);
  const parejas = [];
  for (let i = 0; i < tam; i += 2) parejas.push([slot(orden[i]), slot(orden[i + 1])]);
  return parejas;
}

// ── Formatos ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Eliminatoria simple. Si no es potencia de 2, los mejores sembrados descansan (bye) en la primera ronda. */
export function eliminacionSimple(jugadores, { tercerPuesto = false } = {}) {
  const rondas = llave('E', parejasPorSemilla(jugadores));
  const semis = rondas.length >= 2 ? rondas[rondas.length - 2] : null;
  if (tercerPuesto && semis && semis.partidos.length === 2 && semis.partidos.every((m) => !m.bye)) {
    rondas[rondas.length - 1].partidos.push({ id: 'E-3P', a: { perdedorDe: semis.partidos[0].id }, b: { perdedorDe: semis.partidos[1].id }, bye: false, tercerPuesto: true });
  }
  return rondas;
}

/** Doble eliminatoria (4, 8, 16 o 32 jugadores): llave de ganadores, llave de repechaje y Gran Final. */
export function dobleEliminacion(jugadores) {
  const k = Math.log2(jugadores.length);
  const g = llave('W', parejasPorSemilla(jugadores), (c) => `Ganadores · ${nombreRonda(c)}`);
  const rep = []; let prev = null;
  for (let l = 1; l <= 2 * (k - 1); l += 1) {
    let ps = [];
    if (l === 1) {
      const w1 = g[0].partidos;
      for (let i = 0; i < w1.length; i += 2) ps.push({ id: `L1-${i / 2 + 1}`, a: { perdedorDe: w1[i].id }, b: { perdedorDe: w1[i + 1].id }, bye: false });
    } else if (l % 2 === 0) {
      const wr = g[l / 2].partidos;
      ps = prev.map((m, i) => ({ id: `L${l}-${i + 1}`, a: { ganadorDe: m.id }, b: { perdedorDe: wr[i].id }, bye: false }));
    } else {
      for (let i = 0; i < prev.length; i += 2) ps.push({ id: `L${l}-${i / 2 + 1}`, a: { ganadorDe: prev[i].id }, b: { ganadorDe: prev[i + 1].id }, bye: false });
    }
    rep.push({ nombre: `Repechaje ${l}`, partidos: ps }); prev = ps;
  }
  const finalG = g[g.length - 1].partidos[0];
  const final = { nombre: 'Gran Final', partidos: [{ id: 'GF-1', a: { ganadorDe: finalG.id }, b: { ganadorDe: prev[0].id }, bye: false }] };
  return [...g, ...rep, final];
}

/** Liguilla (todos contra todos) por el método del círculo. Con número impar, uno descansa cada fecha. */
export function liguilla(jugadores, { idaVuelta = false } = {}) {
  const lista = [...jugadores]; if (lista.length % 2) lista.push(null);
  const n = lista.length; const fechas = [];
  for (let r = 0; r < n - 1; r += 1) {
    const partidos = []; let descansa = null;
    for (let i = 0; i < n / 2; i += 1) {
      let a = lista[i]; let b = lista[n - 1 - i];
      if (a === null || b === null) { descansa = a ?? b; continue; }
      if ((r + i) % 2 === 1) [a, b] = [b, a];
      partidos.push({ id: `F${r + 1}-${partidos.length + 1}`, a, b, bye: false });
    }
    fechas.push({ nombre: `Fecha ${r + 1}`, partidos, descansa });
    lista.splice(1, 0, lista.pop());
  }
  if (!idaVuelta) return fechas;
  const vuelta = fechas.map((f, r) => ({
    nombre: `Fecha ${n - 1 + r + 1}`, descansa: f.descansa,
    partidos: f.partidos.map((m, i) => ({ id: `F${n - 1 + r + 1}-${i + 1}`, a: m.b, b: m.a, bye: false })),
  }));
  return [...fechas, ...vuelta];
}

/** Reparte en grupos en «serpiente» (el 1.º y el último van a grupos distintos para equilibrar). Devuelve [{ nombre, jugadores }]. */
export function repartirGrupos(jugadores, cantidad) {
  const grupos = Array.from({ length: cantidad }, (_, i) => ({ nombre: String.fromCharCode(65 + i), jugadores: [] }));
  jugadores.forEach((j, i) => {
    const fila = Math.floor(i / cantidad); const col = i % cantidad;
    grupos[fila % 2 === 0 ? col : cantidad - 1 - col].jugadores.push(j);
  });
  return grupos;
}

export const gruposSugeridos = (n) => (n <= 11 ? 2 : n <= 23 ? 4 : 8);

/** Grupos + playoffs: clasifican 2 por grupo; A1 vs B2 y B1 vs A2 (los del mismo grupo no se cruzan hasta la final). */
export function gruposPlayoffs(jugadores, { grupos = gruposSugeridos(jugadores.length), tercerPuesto = false } = {}) {
  const reparto = repartirGrupos(jugadores, grupos);
  const fases = reparto.map((g) => ({ grupo: g.nombre, jugadores: g.jugadores, fechas: liguilla(g.jugadores) }));
  const pos = (grupo, p) => ({ puesto: { grupo, pos: p } });
  let playoffs;
  if (grupos % 2 === 0 && potencia2(grupos) === grupos) {
    const parejas = [];
    for (let i = 0; i < grupos; i += 2) {
      const A = reparto[i].nombre; const B = reparto[i + 1].nombre;
      parejas.push([pos(A, 1), pos(B, 2)], [pos(B, 1), pos(A, 2)]);
    }
    playoffs = llave('P', parejas);
  } else {
    playoffs = llave('P', parejasPorSemilla(reparto.flatMap((g) => [pos(g.nombre, 1), pos(g.nombre, 2)])));
  }
  const semis = playoffs.length >= 2 ? playoffs[playoffs.length - 2] : null;
  if (tercerPuesto && semis && semis.partidos.length === 2) {
    playoffs[playoffs.length - 1].partidos.push({ id: 'P-3P', a: { perdedorDe: semis.partidos[0].id }, b: { perdedorDe: semis.partidos[1].id }, bye: false, tercerPuesto: true });
  }
  return { grupos: fases, playoffs };
}

// ── Suizo ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const rondasSuizo = (n) => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));

/**
 * Siguiente ronda suiza. `puntos` = { nombre: puntos }, `jugados` = lista de [a, b] ya disputados, `conBye` = nombres que ya descansaron.
 * Empareja por puntos parecidos y evita repetir rival; si es imposible evitarlo, permite la repetición como último recurso.
 */
export function emparejarSuizo({ jugadores, puntos = {}, jugados = [], conBye = [] }) {
  const orden = [...jugadores].sort((x, y) => (puntos[y] ?? 0) - (puntos[x] ?? 0) || x.localeCompare(y, 'es'));
  const ya = new Set(jugados.map(([a, b]) => clave(a, b)));
  let bye = null; let lista = orden;
  if (orden.length % 2) {
    const sinBye = [...orden].reverse().find((j) => !conBye.includes(j)) ?? orden[orden.length - 1];
    bye = sinBye; lista = orden.filter((j) => j !== sinBye);
  }
  let llamadas = 0;
  const buscar = (l, permitirRepetir) => {
    if (!l.length) return [];
    llamadas += 1; if (llamadas > 20000) return null;
    const [primero, ...resto] = l;
    for (let j = 0; j < resto.length; j += 1) {
      const rival = resto[j];
      if (!permitirRepetir && ya.has(clave(primero, rival))) continue;
      const sub = buscar(resto.filter((_, k) => k !== j), permitirRepetir);
      if (sub) return [[primero, rival], ...sub];
    }
    return null;
  };
  let parejas = buscar(lista, false); let repetidos = false;
  if (!parejas) { llamadas = 0; parejas = buscar(lista, true) ?? []; repetidos = true; }
  return { partidos: parejas.map(([a, b], i) => ({ id: `S-${i + 1}`, a, b, bye: false })), bye, repetidos };
}

/** Primera ronda suiza: la mitad alta contra la mitad baja (1.º con el que está en la mitad + 1). */
export function primeraRondaSuizo(jugadores) {
  const n = jugadores.length; const mitad = Math.floor(n / 2);
  const partidos = []; for (let i = 0; i < mitad; i += 1) partidos.push({ id: `S-${i + 1}`, a: jugadores[i], b: jugadores[mitad + i], bye: false });
  return { partidos, bye: n % 2 ? jugadores[n - 1] : null };
}

// ── Rey de la colina ───────────────────────────────────────────────────────────────────────────────────────────────────
export function crearColina(jugadores, { maxRacha = 3 } = {}) {
  const [campeon, ...cola] = jugadores;
  return { campeon, cola, racha: 0, maxRacha, coronas: {}, historial: [] };
}

/** Juega el partido campeón vs primer retador. El ganador se queda; el perdedor va al final de la cola. Con `maxRacha` victorias seguidas, el campeón se lleva una corona y cede el trono. */
export function jugarColina(est, ganador) {
  const retador = est.cola[0];
  if (!retador || (ganador !== est.campeon && ganador !== retador)) return est;
  const perdedor = ganador === est.campeon ? retador : est.campeon;
  let cola = [...est.cola.slice(1), perdedor];
  let campeon = ganador; let racha = ganador === est.campeon ? est.racha + 1 : 1;
  const coronas = { ...est.coronas };
  if (racha >= est.maxRacha) {
    coronas[campeon] = (coronas[campeon] ?? 0) + 1;
    cola = [...cola, campeon]; campeon = cola[0]; cola = cola.slice(1); racha = 0;
  }
  return { ...est, campeon, cola, racha, coronas, historial: [...est.historial, { campeon: est.campeon, retador, ganador }] };
}

// ── Escalera ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Reto de escalera: solo puedes retar a quien esté hasta `alcance` puestos por encima. Si el retador gana, intercambian puesto. */
export function retarEscalera(orden, retador, retado, ganador, { alcance = 3 } = {}) {
  const i = orden.indexOf(retador); const j = orden.indexOf(retado);
  if (i < 0 || j < 0) return { ok: false, orden, motivo: 'Uno de los dos no está en la escalera.' };
  if (j >= i) return { ok: false, orden, motivo: 'Solo puedes retar a alguien que esté por encima de ti.' };
  if (i - j > alcance) return { ok: false, orden, motivo: `Solo puedes retar hasta ${alcance} puestos por encima.` };
  if (ganador !== retador && ganador !== retado) return { ok: false, orden, motivo: 'El ganador debe ser uno de los dos.' };
  const nuevo = [...orden];
  if (ganador === retador) { nuevo[i] = retado; nuevo[j] = retador; }
  return { ok: true, orden: nuevo, cambio: ganador === retador };
}

// ── Circuito por puntos ────────────────────────────────────────────────────────────────────────────────────────────────
export const BAREMO_CIRCUITO = Object.freeze([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);

/** `fechas` = [{ puestos: [1.º, 2.º, 3.º…] }]. Suma por baremo; desempata por primeros puestos y luego por nombre. */
export function acumularCircuito(fechas, baremo = BAREMO_CIRCUITO) {
  const filas = new Map();
  const fila = (n) => { if (!filas.has(n)) filas.set(n, { nombre: n, pts: 0, primeros: 0, fechas: 0 }); return filas.get(n); };
  for (const f of Array.isArray(fechas) ? fechas : []) {
    (f?.puestos ?? []).forEach((n, i) => { const x = fila(n); x.pts += baremo[i] ?? 0; x.fechas += 1; if (i === 0) x.primeros += 1; });
  }
  return [...filas.values()].sort((a, b) => b.pts - a.pts || b.primeros - a.primeros || a.nombre.localeCompare(b.nombre, 'es'));
}

// ── Entrada única ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function validarFormato(id, n, { sinTope = false } = {}) {
  const f = formatoPorId(id);
  if (!f) return { ok: false, motivo: 'Ese formato no existe.' };
  if (n < f.min) return { ok: false, motivo: `${f.nombre} necesita al menos ${f.min} jugadores.` };
  if (n > f.max && !sinTope) return { ok: false, motivo: `${f.nombre} admite hasta ${f.max} jugadores.` };
  if (f.exacto && !f.exacto.includes(n)) return { ok: false, motivo: `${f.nombre} se arma con ${f.exacto.join(', ')} jugadores.` };
  return { ok: true };
}

const contar = (rondas) => rondas.reduce((s, r) => s + r.partidos.filter((m) => !m.bye).length, 0);

/**
 * Genera el formato pedido. Devuelve { ok, formato, tipo, rondas | grupos+playoffs, totalPartidos, notas }.
 * `tipo`: 'llave' (eliminatorias), 'fechas' (liguillas), 'grupos', 'suizo', 'colina', 'escalera', 'circuito'.
 */
export function generar(id, jugadoresCrudos, opciones = {}) {
  const jugadores = limpiarJugadores(jugadoresCrudos, opciones.sinTope ? 256 : 64);
  const v = validarFormato(id, jugadores.length, { sinTope: Boolean(opciones.sinTope) });
  if (!v.ok) return v;
  const f = formatoPorId(id);
  const base = { ok: true, formato: f, jugadores };
  switch (id) {
    case 'eliminacion': { const rondas = eliminacionSimple(jugadores, opciones); return { ...base, tipo: 'llave', rondas, totalPartidos: contar(rondas), notas: ['Los mejores sembrados descansan si el número no es potencia de 2.'] }; }
    case 'doble': { const rondas = dobleEliminacion(jugadores); return { ...base, tipo: 'llave', rondas, totalPartidos: contar(rondas), notas: ['Quien pierde en «Ganadores» baja al repechaje; quien pierde dos veces se va.'] }; }
    case 'liguilla': { const rondas = liguilla(jugadores); return { ...base, tipo: 'fechas', rondas, totalPartidos: contar(rondas), notas: ['Victoria 3 puntos, empate 1, derrota 0.'] }; }
    case 'idavuelta': { const rondas = liguilla(jugadores, { idaVuelta: true }); return { ...base, tipo: 'fechas', rondas, totalPartidos: contar(rondas), notas: ['La vuelta invierte quién es local.'] }; }
    case 'grupos': { const g = gruposPlayoffs(jugadores, opciones); return { ...base, tipo: 'grupos', grupos: g.grupos, rondas: g.playoffs, totalPartidos: g.grupos.reduce((s, x) => s + contar(x.fechas), 0) + contar(g.playoffs), notas: ['Clasifican los 2 primeros de cada grupo.'] }; }
    case 'suizo': { const r1 = primeraRondaSuizo(jugadores); const rondas = [{ nombre: 'Ronda 1', partidos: r1.partidos, descansa: r1.bye }]; return { ...base, tipo: 'suizo', rondas, totalRondas: rondasSuizo(jugadores.length), totalPartidos: Math.floor(jugadores.length / 2) * rondasSuizo(jugadores.length), notas: ['Las siguientes rondas se arman con los resultados de la anterior.'] }; }
    case 'colina': return { ...base, tipo: 'colina', estado: crearColina(jugadores, opciones), rondas: [], totalPartidos: 0, notas: ['Sin final: gana quien más coronas acumule en el tiempo acordado.'] };
    case 'escalera': return { ...base, tipo: 'escalera', orden: jugadores, rondas: [], totalPartidos: 0, notas: ['Abierta todo el tiempo: se reta cuando se quiera.'] };
    default: return { ...base, tipo: 'circuito', rondas: [], totalPartidos: 0, baremo: BAREMO_CIRCUITO, notas: ['Cada fecha reparte puntos según el puesto final.'] };
  }
}
