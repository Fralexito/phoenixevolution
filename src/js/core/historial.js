// Historial de participación de un jugador en ligas anteriores (puro, sin DOM → probable).
const MESES = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** ¿El título cuenta como campeonato? «Campeón…» sí; «Subcampeón…» no. */
export const esCampeon = (titulo) => /^\s*campe[oó]n/i.test(String(titulo ?? ''));
/** Premios (uno por línea) → lista limpia, máx. 8. */
export const partirPremios = (t) => String(t ?? '').split(/\r?\n/).map((l) => l.replace(/^[-•*\s]+/, '').trim()).filter(Boolean).slice(0, 8);
/** Más reciente primero (por `periodo`; sin periodo, al final y por fecha de alta). No modifica la lista original. */
export const ordenarHistorial = (filas) => [...(filas ?? [])].sort((a, b) => String(b.periodo ?? '').localeCompare(String(a.periodo ?? '')) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
/** «2025-03-01» → «mar 2025»; '' si no es fecha. */
export function periodoCorto(iso) { const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? '')); return m && MESES[Number(m[2])] ? `${MESES[Number(m[2])]} ${m[1]}` : ''; }
/** Medalla según título o puesto: 'oro' | 'plata' | 'bronce' | null. El título manda sobre el puesto. */
export function medalla({ titulo, puesto }) {
  if (esCampeon(titulo)) return 'oro';
  if (/^\s*subcampe/i.test(String(titulo ?? ''))) return 'plata';
  if (/tercer/i.test(String(titulo ?? ''))) return 'bronce';
  return puesto === 1 ? 'oro' : puesto === 2 ? 'plata' : puesto === 3 ? 'bronce' : null;
}
/** Totales: ediciones (filas), títulos (campeonatos), podios (medalla de cualquier tipo) y premios individuales. */
export function resumenHistorial(filas) {
  const l = filas ?? [];
  return { ediciones: l.length, titulos: l.filter((f) => medalla(f) === 'oro').length, podios: l.filter((f) => medalla(f)).length, premios: l.reduce((s, f) => s + partirPremios(f.premios).length, 0) };
}
/** Valida el formulario del editor → { ok, errores, fila }. `fila` ya viene limpia y lista para guardar. */
export function validarParticipacion(b) {
  const e = []; const t = (v, max) => String(v ?? '').trim().replace(/[<>]/g, '').slice(0, max);
  const liga = t(b.liga, 60); const edicion = t(b.edicion, 60);
  if (!liga) e.push('Escribe el nombre de la liga.'); if (!edicion) e.push('Escribe la edición (ej. 1° Edición).');
  const puestoTxt = String(b.puesto ?? '').trim(); const puesto = puestoTxt === '' ? null : Number(puestoTxt);
  if (puesto !== null && !(Number.isInteger(puesto) && puesto >= 1 && puesto <= 99)) e.push('El puesto debe ser un número entre 1 y 99 (o déjalo vacío).');
  const periodo = String(b.periodo ?? '').trim(); if (periodo && !/^\d{4}-\d{2}(-\d{2})?$/.test(periodo)) e.push('La fecha no es válida.');
  const temporada = String(b.temporada ?? '').trim(); if (temporada && !/^\d{4}$/.test(temporada)) e.push('La temporada son 4 cifras (ej. 2026) o déjala vacía.');
  const premios = partirPremios(b.premios).join('\n');
  return { ok: e.length === 0, errores: e, fila: { liga, edicion, torneo: t(b.torneo, 60) || null, temporada: /^\d{4}$/.test(temporada) ? temporada : null, periodo: periodo ? (periodo.length === 7 ? `${periodo}-01` : periodo) : null, club: t(b.club, 60).toUpperCase() || null, puesto, titulo: t(b.titulo, 60) || null, premios: premios.slice(0, 300) || null } };
}
