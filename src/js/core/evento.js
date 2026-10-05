// Reglas de presentación y validación de los EVENTOS de la comunidad (puro, sin DOM → probable). ESPEJO de la migración 042:
// la base de datos manda (título 3–80, descripción ≤500, fecha futura y a ≤1 año, juego de la lista); aquí solo se evita viajar al servidor con datos obviamente malos.
// Hora: todo el staff y la comunidad usan HORA DE LIMA (UTC-5 fijo, Perú no tiene horario de verano), así el formulario no depende de la zona del navegador.

export const JUEGOS_EVENTO = Object.freeze([['pes', 'PES 2021'], ['sp', 'SP Football Life'], ['fifa', 'FIFA'], ['eafc', 'EA FC'], ['efootball', 'eFootball']]);
export const LIMITES = Object.freeze({ tituloMin: 3, tituloMax: 80, descripcionMax: 500, motivoMax: 200, anticipoRecordatorioMin: 60, ventanaEnCursoH: 3, maxAnioMs: 365 * 24 * 3600 * 1000 });
const OFFSET_LIMA_MS = -5 * 3600 * 1000;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dos = (n) => String(n).padStart(2, '0');

/** Instante → fecha «de reloj» en Lima (usando getUTC* sobre el instante desplazado). */
const reloj = (ms) => new Date(ms + OFFSET_LIMA_MS);
const msDe = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? t : null; };

/** 'YYYY-MM-DD' + 'HH:MM' (hora de Lima) → ISO con -05:00, o null si no existe esa fecha/hora (31 de febrero, 25:00…). */
export function limaAISO(fecha, hora) {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha ?? '')), h = /^(\d{2}):(\d{2})$/.exec(String(hora ?? ''));
  if (!f || !h) return null;
  const [, a, m, d] = f.map(Number), [, hh, mm] = h.map(Number);
  const u = new Date(Date.UTC(a, m - 1, d, hh, mm));
  if (u.getUTCFullYear() !== a || u.getUTCMonth() !== m - 1 || u.getUTCDate() !== d || hh > 23 || mm > 59) return null;
  return `${f[1]}-${f[2]}-${f[3]}T${h[1]}:${h[2]}:00-05:00`;
}
/** ISO → { fecha:'YYYY-MM-DD', hora:'HH:MM' } en Lima (para rellenar el formulario de edición); basura → null. */
export function isoALima(iso) {
  const t = msDe(iso); if (t === null) return null;
  const r = reloj(t);
  return { fecha: `${r.getUTCFullYear()}-${dos(r.getUTCMonth() + 1)}-${dos(r.getUTCDate())}`, hora: `${dos(r.getUTCHours())}:${dos(r.getUTCMinutes())}` };
}
/** «sáb 11 oct · 19:00» (hora de Lima). */
export function formatoLima(iso) {
  const t = msDe(iso); if (t === null) return '';
  const r = reloj(t);
  return `${DIAS[r.getUTCDay()]} ${r.getUTCDate()} ${MESES[r.getUTCMonth()]} · ${dos(r.getUTCHours())}:${dos(r.getUTCMinutes())}`;
}

/** Estado visual de un evento en el instante `ahora` (ms). */
export function estadoEvento(e, ahora = Date.now()) {
  if (e?.cancelado) return 'cancelado';
  const t = msDe(e?.inicia_at); if (t === null) return 'pasado';
  if (t <= ahora) return ahora < t + LIMITES.ventanaEnCursoH * 3600 * 1000 ? 'en_curso' : 'pasado';
  if (t - ahora <= LIMITES.anticipoRecordatorioMin * 60 * 1000) return 'pronto';
  const hoy = reloj(ahora), ev = reloj(t);
  return hoy.getUTCFullYear() === ev.getUTCFullYear() && hoy.getUTCMonth() === ev.getUTCMonth() && hoy.getUTCDate() === ev.getUTCDate() ? 'hoy' : 'proximo';
}
export const ESTADOS = Object.freeze({
  proximo:   { etiqueta: 'Próximo',    clase: 'text-galaxy-400 border-galaxy-400/40 bg-galaxy-600/10' },
  hoy:       { etiqueta: 'Hoy',        clase: 'text-amber-300 border-amber-300/50 bg-amber-300/10' },
  pronto:    { etiqueta: 'Empieza pronto', clase: 'text-amber-300 border-amber-300/50 bg-amber-300/10' },
  en_curso:  { etiqueta: 'En curso',   clase: 'text-ok border-ok/40 bg-ok/10' },
  pasado:    { etiqueta: 'Terminó',    clase: 'text-gray-400 border-galaxy-border bg-black/20' },
  cancelado: { etiqueta: 'Cancelado',  clase: 'text-rose-300 border-rose-400/40 bg-rose-500/10' },
});
/** «en 2 d 3 h», «en 45 min», «en menos de 1 min», «ya empezó». */
export function cuentaRegresiva(iso, ahora = Date.now()) {
  const t = msDe(iso); if (t === null) return '';
  const d = t - ahora; if (d <= 0) return 'ya empezó';
  const min = Math.floor(d / 60000); if (min < 1) return 'en menos de 1 min';
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60); if (h < 24) return `en ${h} h${min % 60 ? ` ${min % 60} min` : ''}`;
  const dias = Math.floor(h / 24); return `en ${dias} d${h % 24 ? ` ${h % 24} h` : ''}`;
}

/** Respuesta de `eventos_lista` → lista limpia. Tolera null y basura; el juego desconocido pasa a null; los contadores nunca son negativos. */
export function normalizarEventos(raw) {
  const ok = new Set(JUEGOS_EVENTO.map((j) => j[0]));
  return (Array.isArray(raw) ? raw : []).filter((e) => e && Number.isFinite(Number(e.id)) && typeof e.titulo === 'string' && msDe(e.inicia_at) !== null).map((e) => ({
    id: Number(e.id), titulo: e.titulo, descripcion: typeof e.descripcion === 'string' ? e.descripcion : '', juego: ok.has(e.juego) ? e.juego : null,
    inicia_at: e.inicia_at, cancelado: e.cancelado === true, motivo: typeof e.motivo === 'string' ? e.motivo : '',
    interesados: Math.max(0, Math.trunc(Number(e.interesados)) || 0), mi_interes: e.mi_interes === true, mi_recordar: e.mi_interes === true && e.mi_recordar === true,
  }));
}
export const nombreJuego = (id) => (JUEGOS_EVENTO.find((j) => j[0] === id) ?? [null, ''])[1];

/** Valida el formulario del staff. → { ok:true, valores:{titulo, iso, juego, descripcion} } | { ok:false, error }. Nunca lanza. */
export function validarFormulario(f, ahora = Date.now()) {
  const titulo = String(f?.titulo ?? '').replace(/[<>]/g, '').trim(), descripcion = String(f?.descripcion ?? '').replace(/[<>]/g, '').trim();
  const juego = String(f?.juego ?? '').trim() || null;
  if (titulo.length < LIMITES.tituloMin || titulo.length > LIMITES.tituloMax) return { ok: false, error: `El título debe tener entre ${LIMITES.tituloMin} y ${LIMITES.tituloMax} caracteres.` };
  if (descripcion.length > LIMITES.descripcionMax) return { ok: false, error: `La descripción admite máximo ${LIMITES.descripcionMax} caracteres.` };
  if (juego !== null && !JUEGOS_EVENTO.some((j) => j[0] === juego)) return { ok: false, error: 'Elige un juego de la lista.' };
  const iso = limaAISO(f?.fecha, f?.hora);
  if (!iso) return { ok: false, error: 'Indica una fecha y una hora válidas.' };
  const t = msDe(iso);
  if (t <= ahora && !f?.permitirPasada) return { ok: false, error: 'La fecha del evento debe ser futura.' };
  if (t > ahora + LIMITES.maxAnioMs) return { ok: false, error: 'La fecha del evento no puede pasar de 1 año.' };
  return { ok: true, valores: { titulo, iso, juego, descripcion } };
}
export const textoVacio = (pasados) => (pasados ? 'Todavía no hay eventos pasados.' : 'No hay eventos programados por ahora. ¡Vuelve pronto!');
