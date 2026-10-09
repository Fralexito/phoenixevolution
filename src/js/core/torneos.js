// Lógica de TORNEOS PROPIOS (pura → se prueba con `npm test`). Convierte lo que arma core/formatos.js en filas para la base,
// calcula tablas, cierra grupos, empareja el suizo y sugiere campeón. Guía: docs/TORNEOS-LIBRES.md
// Fila de partido (como viene de la base): { clave, ronda, grupo, orden, a_slot, b_slot, a_nombre, b_nombre, ga, gb, ganador, jugado, eliminatoria }.
import { calcularTabla } from './tabla.js';
import { emparejarSuizo, rondasSuizo, acumularCircuito, BAREMO_CIRCUITO } from './formatos.js';

export const MAX_PARTIDOS_POR_LLAMADA = 2000;
const esNombre = (s) => typeof s === 'string' && s !== '';

/** Convierte lo que devuelve `generar()` en { partidos, meta, estado } listos para `torneo_iniciar`. */
export function construirPlan(res, { mejorDe = 1 } = {}) {
  if (!res?.ok) return { ok: false, motivo: res?.motivo ?? 'Formato no válido.' };
  const partidos = []; let orden = 0;
  const meta = { tipo: res.tipo, formato: res.formato.id, mejorDe };
  const agregar = (m, ronda, extra = {}) => {
    if (m.bye) return;                                              // un descanso no es partido: ya avanza solo en la llave
    orden += 1;
    partidos.push({ clave: extra.prefijo ? `${extra.prefijo}-${m.id}` : m.id, ronda, grupo: extra.grupo ?? null, orden, a: m.a ?? null, b: m.b ?? null, eliminatoria: Boolean(extra.eliminatoria) });
  };
  let estado = {};
  switch (res.tipo) {
    case 'llave':
      res.rondas.forEach((r) => r.partidos.forEach((m) => agregar(m, r.nombre, { eliminatoria: true })));
      break;
    case 'fechas':
      res.rondas.forEach((r) => r.partidos.forEach((m) => agregar(m, r.nombre)));
      break;
    case 'grupos':
      res.grupos.forEach((g) => g.fechas.forEach((f) => f.partidos.forEach((m) => agregar(m, `Grupo ${g.grupo} · ${f.nombre}`, { grupo: g.grupo, prefijo: `G${g.grupo}` }))));
      res.rondas.forEach((r) => r.partidos.forEach((m) => agregar(m, r.nombre, { eliminatoria: true })));
      meta.grupos = res.grupos.map((g) => ({ grupo: g.grupo, jugadores: g.jugadores }));
      break;
    case 'suizo': {
      const r1 = res.rondas[0];
      r1.partidos.forEach((m, i) => agregar({ ...m, id: String(i + 1) }, 'Ronda 1', { prefijo: 'S1' }));
      meta.totalRondas = res.totalRondas;
      estado = { ronda: 1, descansos: r1.descansa ? [r1.descansa] : [] };
      break;
    }
    case 'colina': estado = res.estado; break;
    case 'escalera': estado = { orden: res.orden, retos: [] }; break;
    case 'circuito': estado = { fechas: [] }; break;
    default: break;
  }
  if (partidos.length > MAX_PARTIDOS_POR_LLAMADA) return { ok: false, motivo: `Ese formato daría ${partidos.length} partidos y el máximo es ${MAX_PARTIDOS_POR_LLAMADA}. Prueba con menos jugadores.` };
  return { ok: true, partidos, meta, estado };
}

const comoPartido = (p) => ({ l: p.a_nombre, v: p.b_nombre, gl: p.jugado ? p.ga : null, gv: p.jugado ? p.gb : null });

/** Tabla de posiciones de un torneo (o de un grupo). Los descansos del suizo suman una victoria. */
export function tablaTorneo(partidos, { grupo = null, descansos = [] } = {}) {
  const lista = (partidos ?? []).filter((p) => (grupo === null ? !p.eliminatoria : p.grupo === grupo)).filter((p) => p.a_nombre && p.b_nombre);
  const { tabla } = calcularTabla(lista.map(comoPartido));
  const mapa = new Map(tabla.map((f) => [f.nombre, { ...f }]));
  for (const n of descansos) {
    const f = mapa.get(n) ?? { nombre: n, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    f.pts += 3; f.g += 1; f.pj += 1; mapa.set(n, f);
  }
  return [...mapa.values()].sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.nombre.localeCompare(y.nombre, 'es'));
}

export function progreso(partidos) {
  const lista = partidos ?? [];
  const jugados = lista.filter((p) => p.jugado).length;
  return { jugados, total: lista.length, pct: lista.length ? Math.round((jugados / lista.length) * 100) : 0 };
}

/** ¿Todos los partidos de ese grupo ya se jugaron? */
export function grupoCompleto(partidos, grupo) {
  const g = (partidos ?? []).filter((p) => p.grupo === grupo);
  return g.length > 0 && g.every((p) => p.jugado);
}

/** Cruces de playoffs que ya se pueden llenar porque su grupo terminó. Devuelve [{ clave, a, b }] solo con cambios. */
export function crucesDePuestos(partidos) {
  const tablas = new Map(); const cambios = [];
  const puesto = (slot) => {
    const { grupo, pos } = slot.puesto;
    if (!grupoCompleto(partidos, grupo)) return null;
    if (!tablas.has(grupo)) tablas.set(grupo, tablaTorneo(partidos, { grupo }));
    return tablas.get(grupo)[pos - 1]?.nombre ?? null;
  };
  for (const p of partidos ?? []) {
    if (p.jugado) continue;
    const a = p.a_slot?.puesto ? puesto(p.a_slot) : p.a_nombre;
    const b = p.b_slot?.puesto ? puesto(p.b_slot) : p.b_nombre;
    if ((p.a_slot?.puesto || p.b_slot?.puesto) && (a !== p.a_nombre || b !== p.b_nombre)) cambios.push({ clave: p.clave, a: a ?? null, b: b ?? null });
  }
  return cambios;
}

/** Ronda actual del suizo y si ya terminó. */
export function estadoSuizo(partidos) {
  const nums = (partidos ?? []).map((p) => Number((p.clave.match(/^S(\d+)-/) ?? [])[1])).filter(Boolean);
  const ronda = nums.length ? Math.max(...nums) : 0;
  const deRonda = (partidos ?? []).filter((p) => p.clave.startsWith(`S${ronda}-`));
  return { ronda, completa: deRonda.length > 0 && deRonda.every((p) => p.jugado) };
}

/** Siguiente ronda del suizo con los resultados reales. `jugadores` = nombres inscritos. */
export function siguienteRondaSuizo(partidos, jugadores, estado = {}, totalRondas = rondasSuizo(jugadores.length)) {
  const { ronda, completa } = estadoSuizo(partidos);
  if (!ronda) return { ok: false, motivo: 'Todavía no hay ronda 1.' };
  if (!completa) return { ok: false, motivo: 'Faltan resultados de la ronda actual.' };
  if (ronda >= totalRondas) return { ok: false, motivo: 'Ya se jugaron todas las rondas.', terminado: true };
  const descansos = estado.descansos ?? [];
  const tabla = tablaTorneo(partidos, { descansos });
  const puntos = Object.fromEntries(tabla.map((f) => [f.nombre, f.pts]));
  const jugados = (partidos ?? []).filter((p) => p.a_nombre && p.b_nombre).map((p) => [p.a_nombre, p.b_nombre]);
  const r = emparejarSuizo({ jugadores, puntos, jugados, conBye: descansos });
  const n = ronda + 1; const base = Math.max(0, ...(partidos ?? []).map((p) => p.orden));
  return {
    ok: true, ronda: n, bye: r.bye, repetidos: r.repetidos,
    partidos: r.partidos.map((m, i) => ({ clave: `S${n}-${i + 1}`, ronda: `Ronda ${n}`, orden: base + i + 1, a: m.a, b: m.b, eliminatoria: false })),
    estado: { ...estado, ronda: n, descansos: r.bye ? [...descansos, r.bye] : descansos },
  };
}

// ── Circuito ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export function agregarFechaCircuito(estado, nombre, puestos) {
  const limpio = [...new Set((puestos ?? []).map((x) => String(x).trim()).filter(Boolean))];
  if (limpio.length < 2) return { ok: false, motivo: 'Una fecha necesita al menos 2 puestos.' };
  return { ok: true, estado: { ...estado, fechas: [...(estado.fechas ?? []), { nombre: String(nombre || `Fecha ${(estado.fechas?.length ?? 0) + 1}`).slice(0, 40), puestos: limpio }] } };
}
export const tablaCircuito = (estado) => acumularCircuito(estado?.fechas ?? [], BAREMO_CIRCUITO);

// ── Campeón sugerido ──────────────────────────────────────────────────────────────────────────────────────────────────
const esFinal = (p) => /^(Final|Gran Final)$/.test(p.ronda) && !/3P$/.test(p.clave);

/** Quién va ganando / quién sería campeón según el formato. Devuelve { nombre, definitivo } o null. */
export function campeonSugerido(torneo, partidos, estadoJuego = torneo?.estado_juego ?? {}) {
  const f = torneo?.formato; const lista = partidos ?? [];
  if (['eliminacion', 'doble', 'grupos'].includes(f)) {
    const fin = lista.find(esFinal);
    if (fin?.jugado) return { nombre: fin.ganador === 'a' ? fin.a_nombre : fin.b_nombre, definitivo: true };
    return null;
  }
  if (['liguilla', 'idavuelta', 'suizo', 'libre'].includes(f)) {
    const tabla = tablaTorneo(lista, { descansos: estadoJuego?.descansos ?? [] });
    if (!tabla.length) return null;
    const terminado = lista.length > 0 && lista.every((p) => p.jugado) && (f !== 'suizo' || estadoSuizo(lista).ronda >= (torneo?.meta?.totalRondas ?? 1));
    return { nombre: tabla[0].nombre, definitivo: terminado && f !== 'libre' };
  }
  if (f === 'colina') {
    const top = Object.entries(estadoJuego?.coronas ?? {}).sort((a, b) => b[1] - a[1])[0];
    return top ? { nombre: top[0], definitivo: false } : null;
  }
  if (f === 'escalera') return estadoJuego?.orden?.[0] ? { nombre: estadoJuego.orden[0], definitivo: false } : null;
  if (f === 'circuito') { const t = tablaCircuito(estadoJuego); return t[0] ? { nombre: t[0].nombre, definitivo: false } : null; }
  return null;
}

/** Agrupa los partidos por ronda conservando el orden. */
export function porRonda(partidos) {
  const m = new Map();
  for (const p of [...(partidos ?? [])].sort((x, y) => x.orden - y.orden)) m.set(p.ronda, [...(m.get(p.ronda) ?? []), p]);
  return [...m.entries()].map(([nombre, lista]) => ({ nombre, partidos: lista }));
}

/** Etiqueta de un lado: el nombre si ya se conoce, o de dónde saldrá. */
export function etiquetaLado(nombre, slot) {
  if (esNombre(nombre)) return nombre;
  if (slot?.ganadorDe) return `Ganador ${slot.ganadorDe}`;
  if (slot?.perdedorDe) return `Perdedor ${slot.perdedorDe}`;
  if (slot?.puesto) return `${slot.puesto.pos}.º del Grupo ${slot.puesto.grupo}`;
  return 'Por definir';
}

/** Quita del texto de resultado (ej. «3-1», «2 – 2», «3:0») → { ga, gb } o null. */
export function leerMarcador(texto) {
  const m = String(texto ?? '').trim().match(/^(\d{1,3})\s*[-–:x]\s*(\d{1,3})$/i);
  return m ? { ga: Number(m[1]), gb: Number(m[2]) } : null;
}
