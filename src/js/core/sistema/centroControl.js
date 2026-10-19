// CENTRO DE CONTROL del staff — lógica pura (sin DOM → probable). La pantalla vive en js/pages/control.js.
// Fralex, 19-oct-2026: «secciones de control y organización». Pasa a la web el manual de gestión: cada tarjeta dice cuánto hay pendiente,
// con un color según los plazos del manual (reportes 24 h, resultados y disputas 48 h), y «Hoy toca» sigue la semana tipo del staff.

/** Horas de plazo de cada tipo de pendiente (las del manual de gestión). */
export const PLAZOS = Object.freeze({ resultado: 48, disputa: 48, reporte: 24, privacidad: 72, pago: 24 });

/**
 * Estado de una tarjeta: 'sin-dato' (no se pudo leer), 'ok' (nada pendiente), 'urgente' (algo pasó su plazo) o 'atencion'.
 * @param {{ n: number|null|undefined, vencidos?: number }} x
 */
export function estadoDe(x) {
  if (!x || !Number.isFinite(x.n)) return 'sin-dato';
  if (x.n <= 0) return 'ok';
  return (x.vencidos ?? 0) > 0 ? 'urgente' : 'atencion';
}

/** Cuántas fechas (ISO o Date) tienen más de `horas` respecto de `ahora`. Las fechas vacías o inválidas no cuentan. */
export function vencidos(fechas, horas, ahora = new Date()) {
  const limite = new Date(ahora).getTime() - horas * 3600e3;
  return (fechas ?? []).filter((f) => { const t = new Date(f ?? NaN).getTime(); return Number.isFinite(t) && t < limite; }).length;
}

/**
 * Partidos de la PRÓXIMA fecha de cada edición que todavía no tienen árbitro.
 * @param {{ edicion_id: string, fecha: number, arbitro: string|null, estado: string }[]} partidos  partidos de liga (cualquier estado)
 * @returns {{ edicion_id: string, fecha: number, faltan: number }[]} una fila por edición con huecos en su próxima fecha
 */
export function sinArbitroProximaFecha(partidos) {
  const porEd = new Map();
  for (const p of partidos ?? []) {
    if (p?.estado !== 'pendiente' || !Number.isFinite(Number(p.fecha))) continue;
    const ed = porEd.get(p.edicion_id) ?? []; ed.push(p); porEd.set(p.edicion_id, ed);
  }
  const out = [];
  for (const [edicion_id, lista] of porEd) {
    const fecha = Math.min(...lista.map((p) => Number(p.fecha)));
    const faltan = lista.filter((p) => Number(p.fecha) === fecha && !p.arbitro).length;
    if (faltan) out.push({ edicion_id, fecha, faltan });
  }
  return out.sort((a, b) => String(a.edicion_id).localeCompare(String(b.edicion_id)));
}

/** Resumen de la cabecera a partir de los estados de las tarjetas visibles. */
export function resumen(estados) {
  const cuenta = (e) => (estados ?? []).filter((x) => x === e).length;
  const urgentes = cuenta('urgente'), atencion = cuenta('atencion'), ok = cuenta('ok'), sinDato = cuenta('sin-dato');
  const total = (estados ?? []).length;
  let frase;
  if (!total) frase = 'Tu rol no tiene tareas de control.';
  else if (urgentes) frase = `${urgentes} ${urgentes === 1 ? 'cosa pasó' : 'cosas pasaron'} su plazo. Empieza por ahí.`;
  else if (atencion) frase = `${atencion} ${atencion === 1 ? 'cosa espera' : 'cosas esperan'} a alguien del staff, todo dentro de plazo.`;
  else if (sinDato === total) frase = 'No se pudo leer nada. Revisa la conexión y pulsa «Actualizar».';
  else frase = 'Todo en orden: no hay nada pendiente.';
  return { urgentes, atencion, ok, sinDato, frase, nivel: urgentes ? 'urgente' : atencion ? 'atencion' : 'ok' };
}

// Semana tipo del staff (manual de gestión). 0 = domingo … 6 = sábado. Ajustable aquí si cambia el calendario de la liga.
const SEMANA = Object.freeze({
  1: ['Cerrar la jornada anterior: validar lo que quede pendiente.', 'Publicar el resumen de la jornada (solo con resultados confirmados).'],
  2: ['Asignar un árbitro a cada partido de la próxima jornada.', 'Publicar los arreglos de la web (día fijo, sin partidos).'],
  3: ['Publicar la previa de la jornada.', 'Revisar el ranking y los torneos creados esta semana.'],
  4: ['Moderador de guardia durante los partidos.', 'Vigilar los marcadores en vivo y las disputas.'],
  5: ['Moderador de guardia durante los partidos.', 'Vigilar los marcadores en vivo y las disputas.'],
  6: ['Moderador de guardia durante los partidos.', 'Vigilar los marcadores en vivo y las disputas.'],
  0: ['Moderador de guardia durante los partidos.', 'Por la noche: cerrar el plazo de la jornada.', 'Copia de seguridad de la base de datos.'],
});
export const NOMBRE_DIA = Object.freeze(['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']);

/** Día de la semana en Lima (UTC−5, sin horario de verano) para una fecha. */
export const diaLima = (d = new Date()) => new Date(new Date(d).getTime() - 5 * 3600e3).getUTCDay();
/** Fecha AAAA-MM-DD en Lima (sirve de clave para recordar lo marcado hoy). */
export const fechaLima = (d = new Date()) => new Date(new Date(d).getTime() - 5 * 3600e3).toISOString().slice(0, 10);

/** Tareas del día de la semana tipo, más las que valen todos los días. */
export function tareasDeHoy(dia) {
  const fijas = ['Revisar los reportes nuevos.', 'Mirar los resultados propuestos y las disputas abiertas.'];
  return [...(SEMANA[dia] ?? []), ...fijas];
}
