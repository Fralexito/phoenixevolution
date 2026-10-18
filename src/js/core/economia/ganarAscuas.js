// Cómo ganar ascuas (Fase B, migración 120): recompensa diaria con racha, primer partido del día, misiones semanales y premios de logros. Lógica PURA (sin red ni DOM).
// Las reglas viven en la base de datos; aquí solo se normaliza lo que devuelve `mis_ascuas_extra` y se calculan textos. Los números de abajo SOLO sirven para mostrar
// (la base decide de verdad al reclamar): deben coincidir con public.reclamar_racha_diaria(). No confundir con core/competicion/enganche.js (racha de «jugaste un reto hoy», sin premio).
const entero = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);
const texto = (v, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clave = (v) => (typeof v === 'string' && /^[a-z0-9_]{2,40}$/.test(v) ? v : '');

export const RACHA_ASCUAS_DIA = 5;
export const CICLO_RACHA = 7;
export const TOPE_LOGROS_DIA = 200;

/** Día dentro del ciclo de 7 (1..7) para una racha de `n` días seguidos. */
export const cicloRacha = (n) => ((Math.max(1, entero(n, 1)) - 1) % CICLO_RACHA) + 1;
/** Ascuas extra del día `n` de racha: el día 3 del ciclo +10, el día 7 +40. */
export const bonoRacha = (n) => ({ 3: 10, 7: 40 })[cicloRacha(n)] ?? 0;
export const ascuasRacha = (n) => RACHA_ASCUAS_DIA + bonoRacha(n);

/** Cuántos días del ciclo de 7 ya están cumplidos (0–7) para pintar la fila de días. Si el ciclo se completó y aún no reclamas hoy, empieza otro (0). */
export function diasHechosCiclo(r) {
  const n = Math.max(0, entero(r?.actual));
  if (n === 0) return 0;
  if (!r?.reclamadaHoy && n % CICLO_RACHA === 0) return 0;
  return cicloRacha(n);
}

const NIVELES = ['bronce', 'plata', 'oro'];
function normalizarMeta(r) {
  const meta = Math.max(1, entero(r?.meta, 1)), progreso = Math.min(Math.max(0, entero(r?.progreso)), meta);
  return { clave: clave(r?.clave), titulo: texto(r?.titulo, 60), descripcion: texto(r?.descripcion), meta, progreso, ascuas: Math.max(0, entero(r?.ascuas)), cobrado: r?.cobrado === true, cobrable: r?.cobrable === true && r?.cobrado !== true };
}
export const normalizarMision = normalizarMeta;
export function normalizarLogro(r) {
  const base = normalizarMeta(r), icono = typeof r?.icono === 'string' && /^fa-[a-z0-9-]{2,30}$/.test(r.icono) ? r.icono : 'fa-trophy';
  return { ...base, icono, nivel: NIVELES.includes(r?.nivel) ? r.nivel : 'bronce', obtenido: r?.obtenido === true };
}

/** Convierte la respuesta de `mis_ascuas_extra` en un objeto seguro. Tolera null y basura. */
export function normalizarGanar(d) {
  const o = d && typeof d === 'object' ? d : {};
  const r = o.racha ?? {}, p = o.primer_partido ?? {}, m = o.misiones ?? {}, l = o.logros ?? {};
  const siguiente = Math.max(1, entero(r.siguiente, 1));
  return {
    racha: { actual: Math.max(0, entero(r.actual)), mejor: Math.max(0, entero(r.mejor)), reclamadaHoy: r.reclamada_hoy === true, siguiente, ciclo: cicloRacha(siguiente), ascuasSiguiente: ascuasRacha(siguiente) },
    primerPartido: { ascuas: Math.max(0, entero(p.ascuas)), ganadoHoy: p.ganado_hoy === true },
    misiones: { semanaFin: typeof m.semana_fin === 'string' ? m.semana_fin : null, items: (Array.isArray(m.items) ? m.items : []).map(normalizarMision).filter((x) => x.clave) },
    logros: { topeDia: Math.max(0, entero(l.tope_dia, TOPE_LOGROS_DIA)), usadoHoy: Math.max(0, entero(l.usado_hoy)), items: (Array.isArray(l.items) ? l.items : []).map(normalizarLogro).filter((x) => x.clave) },
  };
}

/** Cuántas recompensas están listas para reclamar (recompensa de hoy + misiones + logros). */
export function pendientesPorReclamar(g) {
  if (!g) return 0;
  return (g.racha.reclamadaHoy ? 0 : 1) + g.misiones.items.filter((x) => x.cobrable).length + g.logros.items.filter((x) => x.cobrable).length;
}
/** Porcentaje 0–100 de avance (para barras). */
export const porcentaje = (progreso, meta) => (meta > 0 ? Math.min(100, Math.round((Math.max(0, progreso) / meta) * 100)) : 0);
/** «Termina hoy», «Termina mañana», «Termina en 3 días». */
export function textoTermina(iso, ahora = Date.now()) {
  const t = Date.parse(iso ?? ''); if (Number.isNaN(t)) return '';
  const horas = Math.ceil((t - ahora) / 3600e3);
  if (horas <= 0) return 'Terminó';
  if (horas <= 24) return 'Termina hoy';
  const dias = Math.ceil(horas / 24);
  return dias <= 2 ? 'Termina mañana' : `Termina en ${dias} días`;
}
/** Texto de la recompensa diaria. */
export function textoRachaDiaria(r) {
  const dias = `${r.actual} ${r.actual === 1 ? 'día' : 'días'}`;
  if (r.reclamadaHoy) return `¡Racha de ${dias}! Mañana: +${r.ascuasSiguiente} ascuas.`;
  return r.actual > 0 ? `Racha de ${dias}. Reclama hoy +${r.ascuasSiguiente} ascuas.` : `Empieza tu racha: reclama hoy +${r.ascuasSiguiente} ascuas.`;
}
