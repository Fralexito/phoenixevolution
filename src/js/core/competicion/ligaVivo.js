// Liga automática (ronda 224): lógica pura del marcador EN VIVO (tabla liga_vivo, por Realtime) y de la
// validación de resultados (liga_partidos). Sin DOM ni Supabase: todo con test en tests/ligaVivo.test.mjs.
// Origen de los datos: Phoenix Link → Edge Function «liga» (docs/liga-y-torneos/LIGA-Y-TORNEOS.md («LIGA-AUTOMATICA»)).

/** Segundos que una tarjeta se queda con «FINAL» después de que Link borra el partido en vivo. */
export const FINAL_MS = 30_000;

export const FASES_VIVO = {
  previa: 'Previa',
  en_juego: 'En juego',
  descanso: 'Descanso',
  pausado: 'Pausa',
  final: 'Final',
};

/** En qué parte del juego están (Phoenix Referee v1.2+, liga_vivo.pantalla, migración 103). */
export const PANTALLAS = {
  menu: 'En el menú',
  equipos: 'Eligiendo equipos',
  ajustes: 'Ajustes del partido',
  cargando: 'Cargando el partido',
  saliendo: 'Saliendo al campo',
  en_juego: 'En juego',
  descanso: 'Descanso',
  pausa: 'En pausa',
  final: 'Final',
};

import { minutoConAnadido } from './fichaPartido.js';

const PERIODOS = { 1: '1.er tiempo', 2: '2.º tiempo', 3: 'Prórroga 1', 4: 'Prórroga 2', 5: 'Penales' };

/** Texto del estado para la tarjeta: «Eligiendo equipos», «Saliendo al campo», «34′ · 2.º tiempo», «67′ · En pausa», «Final». */
export function textoEstado(x) {
  if (!x) return '';
  if (x.terminado || x.fase === 'final') return 'Final';
  if (x.fase === 'previa') return PANTALLAS[x.pantalla] ?? 'Previa';
  if (x.fase === 'descanso') return 'Descanso';
  const m = minutoConAnadido(x.minuto, x.periodo, x.anadido ?? 0);   // «45+2′» con Link 0.3.51
  if (x.fase === 'pausado') return `${m} · En pausa`;
  return `${m} · ${PERIODOS[x.periodo] ?? 'En juego'}`;
}

export const ESTADOS_LIGA = {
  pendiente: { texto: 'Por jugar', tono: 'neutro' },
  propuesto: { texto: 'Pendiente de validar', tono: 'aviso' },
  confirmado: { texto: 'Confirmado', tono: 'ok' },
  disputa: { texto: 'En disputa', tono: 'error' },
  anulado: { texto: 'Anulado', tono: 'neutro' },
};

const entero = (x, min, max, porDefecto = 0) => {
  const n = Number(x);
  return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : porDefecto;
};

/** Goles que llegan de la base (jsonb) → lista limpia [{m, l:'l'|'v', j, pp}] (máx. 60). */
export function golesVivo(goles) {
  return (Array.isArray(goles) ? goles : []).slice(0, 60)
    .filter((g) => g && typeof g === 'object' && Number.isInteger(Number(g.m)))
    .map((g) => ({
      m: entero(g.m, 0, 200),
      l: g.l === 'v' ? 'v' : 'l',
      j: typeof g.j === 'string' ? g.j.trim().slice(0, 40) : '',
      pp: g.pp === true,
    }));
}

/** «34′ MESSI», «80′ ARAUJO (p.p.)» o «12′» si el juego no dijo quién (Sider anterior a 7.3.4). */
export function textoGol(g) {
  if (!g) return '';
  const quien = g.j ? ` ${g.j}${g.pp ? ' (p.p.)' : ''}` : '';
  return `${g.m}′${quien}`;
}

/** Fila de liga_vivo → objeto para pintar (valores siempre válidos). */
export function normalizarVivo(f) {
  if (!f || typeof f !== 'object' || !f.sala_id) return null;
  return {
    sala_id: String(f.sala_id),
    partido_id: f.partido_id == null ? null : Number(f.partido_id),
    local: String(f.local ?? '').trim() || 'Local',
    visitante: String(f.visitante ?? '').trim() || 'Visita',
    goles_local: entero(f.goles_local, 0, 99),
    goles_visita: entero(f.goles_visita, 0, 99),
    minuto: entero(f.minuto, 0, 200),
    periodo: entero(f.periodo, 0, 5),
    fase: Object.hasOwn(FASES_VIVO, f.fase) ? f.fase : 'en_juego',
    goles: golesVivo(f.goles),
    actualizado: f.actualizado ?? null,
    pantalla: Object.hasOwn(PANTALLAS, f.pantalla) ? f.pantalla : null,
    // Link 0.3.51 (migración 160): añadido, tanda de penales y ficha del partido. Un Link viejo no los manda.
    anadido: entero(f.anadido, 0, 30),
    pk_local: Number.isInteger(f.pk_local) ? entero(f.pk_local, 0, 99) : null,
    pk_visita: Number.isInteger(f.pk_visita) ? entero(f.pk_visita, 0, 99) : null,
    ficha: f.ficha && typeof f.ficha === 'object' && !Array.isArray(f.ficha) ? f.ficha : null,
    terminado: f.terminado === true,
    quitarEn: Number.isFinite(f.quitarEn) ? f.quitarEn : null,
  };
}

/**
 * Integra un cambio de Realtime de liga_vivo. Un DELETE no quita la tarjeta al momento: la deja como
 * «Final» durante FINAL_MS (Link la borra justo al terminar el partido). Las ya caducadas se limpian.
 */
export function aplicarCambioVivo(lista, { eventType, new: nueva, old: vieja } = {}, ahoraMs = Date.now()) {
  const base = limpiarVivos(lista, ahoraMs);
  const id = nueva?.sala_id ?? vieja?.sala_id;
  if (!id) return base;
  const previa = base.find((x) => x.sala_id === id);
  const sin = base.filter((x) => x.sala_id !== id);
  if (eventType === 'DELETE') {
    if (!previa) return sin;
    return [...sin, { ...previa, fase: 'final', terminado: true, quitarEn: ahoraMs + FINAL_MS }];
  }
  const n = normalizarVivo({ ...previa, ...nueva, terminado: false, quitarEn: null });
  return n ? [...sin, n] : sin;
}

/** Quita las tarjetas «Final» que ya cumplieron su tiempo. */
export function limpiarVivos(lista, ahoraMs = Date.now()) {
  return (lista ?? []).filter((x) => x && !(x.terminado && x.quitarEn != null && x.quitarEn <= ahoraMs));
}

/** Orden para mostrar: oficiales primero, luego los que siguen en juego, luego lo más reciente. */
export function ordenarVivos(lista) {
  const peso = (x) => (x.partido_id ? 0 : 2) + (x.terminado ? 1 : 0);
  return [...(lista ?? [])].sort((a, b) => peso(a) - peso(b)
    || String(b.actualizado ?? '').localeCompare(String(a.actualizado ?? '')));
}

/** ¿Cambió el marcador entre dos versiones de la misma sala? (para el efecto de gol) */
export function huboGol(previa, nueva) {
  if (!previa || !nueva) return false;
  return nueva.goles_local + nueva.goles_visita > previa.goles_local + previa.goles_visita;
}

/** Marcador que escribe el staff al corregir: dos enteros 0–99 o un mensaje de error. */
export function validarMarcador(gl, gv) {
  const a = String(gl ?? '').trim(); const b = String(gv ?? '').trim();
  if (!/^\d{1,2}$/.test(a) || !/^\d{1,2}$/.test(b)) return { ok: false, error: 'Escribe los dos marcadores (números de 0 a 99).' };
  return { ok: true, gl: Number(a), gv: Number(b) };
}

/** Partidos que el staff debe mirar: disputas primero, luego propuestos; los más nuevos arriba. */
export function colaValidacion(partidos) {
  const peso = { disputa: 0, propuesto: 1 };
  return (partidos ?? []).filter((p) => p && Object.hasOwn(peso, p.estado))
    .sort((a, b) => peso[a.estado] - peso[b.estado]
      || String(b.propuesto_en ?? '').localeCompare(String(a.propuesto_en ?? ''))
      || (b.id ?? 0) - (a.id ?? 0));
}

/** ¿Puede este DT reclamar? Solo en partidos propuestos o confirmados que no tengan ya un reclamo. */
export function puedeReclamar(p) {
  return !!p && (p.estado === 'propuesto' || p.estado === 'confirmado') && !p.detalle?.reclamo;
}

/** Resumen del Phoenix Doctor guardado en el resultado (solo informativo: no aprueba ni rechaza). */
export function resumenDoctor(detalle) {
  const d = detalle?.doctor;
  if (!d || typeof d !== 'object') return null;
  const avisos = Array.isArray(d.avisos) ? d.avisos.filter((x) => typeof x === 'string').slice(0, 10) : [];
  return {
    parche: typeof d.parche === 'string' ? d.parche : '',
    huella: typeof d.huella === 'string' ? d.huella.slice(0, 16) : '',
    avisos,
  };
}

/**
 * Junta los resultados CONFIRMADOS de la base (liga_partidos) con las fechas de la web (data/ligaResultados.js):
 * un partido confirmado en la base manda (lo validó el staff o el árbitro). Devuelve las fechas nuevas (sin tocar
 * las originales) y cuántos partidos cambiaron. Los que no existen en la web se ignoran (no se inventan cruces).
 */
export function fusionarConfirmados(fechas, partidosBD) {
  const clave = (n, l, v) => `${n}|${l}|${v}`;
  const bd = new Map();
  for (const p of partidosBD ?? []) {
    if (p?.estado !== 'confirmado' || !Number.isInteger(p.goles_local) || !Number.isInteger(p.goles_visita)) continue;
    bd.set(clave(p.fecha, p.local, p.visitante), p);
  }
  let cambios = 0;
  const nuevas = (fechas ?? []).map((f) => ({
    ...f,
    partidos: (f.partidos ?? []).map((m) => {
      const p = bd.get(clave(f.n, m.l, m.v));
      if (!p || (m.gl === p.goles_local && m.gv === p.goles_visita)) return m;
      cambios++;
      const { estado: _antes, ...resto } = m;   // un aplazado que ya se jugó deja de estarlo
      return { ...resto, gl: p.goles_local, gv: p.goles_visita };
    }),
  }));
  return { fechas: nuevas, cambios };
}
