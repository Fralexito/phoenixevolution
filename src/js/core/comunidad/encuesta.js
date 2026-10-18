// Reglas puras de las ENCUESTAS (sin DOM ni red → probables). Las reglas reales están en la BD (migración 040); aquí se valida el formulario y se prepara lo que se muestra.
export const PREGUNTA_MIN = 3, PREGUNTA_MAX = 280, OPCION_MAX = 40, OPCIONES_MIN = 2, OPCIONES_MAX = 4, DIAS_MIN = 1, DIAS_MAX = 7;

/** Formulario → { ok, pregunta, opciones, dias, error }. Ignora opciones vacías, recorta espacios y rechaza repetidas. */
export function validarEncuesta({ pregunta, opciones, dias } = {}) {
  const fallo = (error) => ({ ok: false, pregunta: '', opciones: [], dias: 0, error });
  const p = String(pregunta ?? '').trim().replace(/\s+/g, ' ');
  if (p.length < PREGUNTA_MIN) return fallo(`Escribe la pregunta (mínimo ${PREGUNTA_MIN} letras).`);
  if (p.length > PREGUNTA_MAX) return fallo(`La pregunta admite máximo ${PREGUNTA_MAX} caracteres.`);
  const ops = (Array.isArray(opciones) ? opciones : []).map((o) => String(o ?? '').trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (ops.length < OPCIONES_MIN || ops.length > OPCIONES_MAX) return fallo(`Pon entre ${OPCIONES_MIN} y ${OPCIONES_MAX} opciones.`);
  if (ops.some((o) => o.length > OPCION_MAX)) return fallo(`Cada opción admite máximo ${OPCION_MAX} caracteres.`);
  if (new Set(ops.map((o) => o.toLowerCase())).size !== ops.length) return fallo('Las opciones no pueden repetirse.');
  const d = Number(dias);
  if (!Number.isInteger(d) || d < DIAS_MIN || d > DIAS_MAX) return fallo(`La encuesta dura entre ${DIAS_MIN} y ${DIAS_MAX} días.`);
  return { ok: true, pregunta: p, opciones: ops, dias: d, error: '' };
}

/** Porcentaje entero por opción (la suma puede ser 99-101 por redondeo; es solo visual). Votos null (ocultos) → null. */
export function porcentajes(opciones, total) {
  const t = Number(total) || 0;
  return (opciones ?? []).map((o) => (o?.votos == null ? null : t > 0 ? Math.round((Number(o.votos) / t) * 100) : 0));
}
/** «Cierra en 2 d 3 h» / «Cerrada». */
export function textoCierre(cierraISO, ahora = Date.now()) {
  const ms = Date.parse(cierraISO) - ahora;
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'Cerrada';
  const min = Math.floor(ms / 60000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  if (d >= 1) return `Cierra en ${d} d${h % 24 ? ` ${h % 24} h` : ''}`;
  if (h >= 1) return `Cierra en ${h} h`;
  return `Cierra en ${Math.max(1, min)} min`;
}
/** Respuesta de `encuestas_de` → Map(id publicación → encuesta saneada). Descarta lo que no tenga forma de encuesta. */
export function normalizarEncuestas(obj) {
  const m = new Map(); if (!obj || typeof obj !== 'object') return m;
  for (const [k, e] of Object.entries(obj)) {
    const id = Number(k); if (!Number.isFinite(id) || !e || !Array.isArray(e.opciones) || e.opciones.length < 2) continue;
    m.set(id, { id: Number(e.id), cierra_at: e.cierra_at, cerrada: !!e.cerrada, soyAutor: !!e.soy_autor, miVoto: e.mi_voto == null ? null : Number(e.mi_voto), total: Number(e.total) || 0,
      visibles: !!e.resultados_visibles, opciones: e.opciones.map((o) => ({ id: Number(o.id), texto: String(o.texto ?? ''), votos: o.votos == null ? null : Number(o.votos) })) });
  }
  return m;
}
