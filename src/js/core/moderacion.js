// Reglas de reportes y moderación (puro, sin DOM → probable). ESPEJO de la migración 032.
// IMPORTANTE: la base de datos es la que manda (rangos, permisos, límites). Esto solo valida lo obvio antes de enviar y decide qué botones se muestran.
import { puedeSancionar, normalizarRol } from './roles.js';

/** Motivos de un reporte (mismos ids que el CHECK de la tabla `reportes`). */
export const MOTIVOS = Object.freeze([
  { id: 'spam',         etiqueta: 'Spam o publicidad',               icono: 'fa-rectangle-ad' },
  { id: 'acoso',        etiqueta: 'Acoso o insultos',                icono: 'fa-comment-slash' },
  { id: 'inapropiado',  etiqueta: 'Contenido inapropiado',           icono: 'fa-eye-slash' },
  { id: 'suplantacion', etiqueta: 'Se hace pasar por otra persona',  icono: 'fa-user-secret' },
  { id: 'trampas',      etiqueta: 'Trampas o juego sucio',           icono: 'fa-flag' },
  { id: 'otro',         etiqueta: 'Otro motivo',                     icono: 'fa-circle-question' },
]);

/** Qué se puede reportar. `ocultable` = el staff puede ocultarlo (existe la columna `oculto`). */
export const TIPOS = Object.freeze({
  usuario:     { etiqueta: 'Cuenta',          articulo: 'esta cuenta',        icono: 'fa-user',        ocultable: false },
  publicacion: { etiqueta: 'Publicación',     articulo: 'esta publicación',   icono: 'fa-newspaper',   ocultable: true },
  respuesta:   { etiqueta: 'Respuesta',       articulo: 'esta respuesta',     icono: 'fa-comment',     ocultable: true },
  clip:        { etiqueta: 'Clip',            articulo: 'este clip',          icono: 'fa-film',        ocultable: true },
  historia:    { etiqueta: 'Historia',        articulo: 'esta historia',      icono: 'fa-circle-play', ocultable: true },
  mensaje:     { etiqueta: 'Mensaje privado', articulo: 'este mensaje',       icono: 'fa-envelope',    ocultable: false },
});

export const DETALLE_MAX = 500;      // detalle opcional del reporte
export const NOTA_MIN = 3;           // motivo mínimo en acciones del staff (queda en la auditoría)
export const NOTA_OCULTAR_MAX = 300;
export const NOTA_SANCION_MAX = 500;

export const esMotivo = (id) => MOTIVOS.some((m) => m.id === id);
export const etiquetaMotivo = (id) => MOTIVOS.find((m) => m.id === id)?.etiqueta ?? 'Otro motivo';
export const tipoInfo = (tipo) => TIPOS[tipo] ?? { etiqueta: 'Contenido', articulo: 'este contenido', icono: 'fa-circle-question', ocultable: false };
export const esOcultable = (tipo) => !!TIPOS[tipo]?.ocultable;

const limpiar = (t) => String(t ?? '').replace(/[<>]/g, '').trim();

/** Valida lo que el navegador puede comprobar solo; el servidor repite TODO (existencia, visibilidad, duplicados, ritmo). */
export function validarReporte({ tipo, objetivo, motivo, detalle } = {}) {
  if (!TIPOS[tipo]) return { ok: false, error: 'No se sabe qué se está reportando. Recarga la página.' };
  const obj = String(objetivo ?? '').trim();
  if (!obj) return { ok: false, error: 'No se sabe qué se está reportando. Recarga la página.' };
  if (!esMotivo(motivo)) return { ok: false, error: 'Elige un motivo para el reporte.' };
  const det = limpiar(detalle);
  if (det.length > DETALLE_MAX) return { ok: false, error: `El detalle admite máximo ${DETALLE_MAX} caracteres.` };
  return { ok: true, tipo, objetivo: obj, motivo, detalle: det };
}

/** Motivo escrito por el staff (ocultar, sancionar, levantar, resolver): mínimo 3, máximo según la acción. */
export function validarNota(texto, { max = NOTA_OCULTAR_MAX, obligatoria = true } = {}) {
  const v = limpiar(texto);
  if (!v && !obligatoria) return { ok: true, valor: '' };
  if (v.length < NOTA_MIN) return { ok: false, error: `Escribe un motivo (mínimo ${NOTA_MIN} caracteres): queda en la auditoría.` };
  if (v.length > max) return { ok: false, error: `El motivo admite máximo ${max} caracteres.` };
  return { ok: true, valor: v };
}

/** Tipos de sanción (mismos ids que el CHECK de `sanciones`). */
export const SANCIONES = Object.freeze({
  advertencia: { etiqueta: 'Advertencia',  icono: 'fa-triangle-exclamation', tono: 'warn', descripcion: 'Un aviso formal. No bloquea nada, pero queda en su historial.' },
  suspension:  { etiqueta: 'Suspensión',   icono: 'fa-clock',                tono: 'oculto', descripcion: 'Puede leer, pero no publicar, escribir ni reportar hasta que termine.' },
  baneo:       { etiqueta: 'Baneo',        icono: 'fa-ban',                  tono: 'bad', descripcion: 'No puede escribir ni publicar. Solo un administrador puede levantarlo.' },
});
export const DIAS_SUSPENSION = Object.freeze([1, 3, 7, 15, 30]);

export function validarSancion({ tipo, dias, motivo } = {}) {
  if (!SANCIONES[tipo]) return { ok: false, error: 'Elige el tipo de sanción.' };
  let d = null;
  if (tipo === 'suspension') {
    d = Number(dias);
    if (!Number.isInteger(d) || d < 1 || d > 30) return { ok: false, error: 'Una suspensión dura entre 1 y 30 días.' };
  }
  const n = validarNota(motivo, { max: NOTA_SANCION_MAX });
  if (!n.ok) return n;
  return { ok: true, tipo, dias: d, motivo: n.valor };
}

/** ¿Este rol puede sancionar (o moderar contenido de) alguien con ese otro rol? (rango estrictamente mayor; la BD lo repite). */
export const puedeActuar = (rolActor, rolObjetivo) => puedeSancionar(rolActor, rolObjetivo);
/** Solo un admin levanta un baneo; el resto, con rango mayor. */
export const puedeLevantar = (rolActor, rolObjetivo, tipo) => puedeSancionar(rolActor, rolObjetivo) && (tipo !== 'baneo' || normalizarRol(rolActor) === 'admin');

/** «2 días», «5 h», «12 min», «menos de 1 min». '' si ya pasó. */
export function quedaTiempo(hasta, ahora = Date.now()) {
  const fin = new Date(hasta).getTime(); if (Number.isNaN(fin)) return '';
  const ms = fin - ahora; if (ms <= 0) return '';
  const min = Math.ceil(ms / 60000);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.ceil(min / 60); if (h < 24) return `${h} h`;
  const d = Math.ceil(h / 24); return `${d} día${d === 1 ? '' : 's'}`;
}

const fechaLima = (ms) => new Date(ms).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

/** La sanción vigente de MI cuenta (respuesta de `mi_sancion`) → texto para el aviso. null si no hay o ya venció. */
export function describirMiSancion(s, ahora = Date.now()) {
  if (!s || (s.tipo !== 'suspension' && s.tipo !== 'baneo')) return null;
  const motivo = limpiar(s.motivo).slice(0, 500);
  if (s.tipo === 'baneo') return { tipo: 'baneo', titulo: 'Tu cuenta está baneada', texto: 'Puedes seguir leyendo la web, pero no puedes publicar, escribir ni reportar.', motivo, quedan: '' };
  const fin = new Date(s.hasta).getTime();
  if (Number.isNaN(fin) || fin <= ahora) return null;
  return { tipo: 'suspension', titulo: 'Tu cuenta está suspendida', texto: `Puedes leer, pero no publicar ni escribir hasta el ${fechaLima(fin)} (hora de Lima).`, motivo, quedan: quedaTiempo(s.hasta, ahora) };
}

const txt = (v, max = 600) => String(v ?? '').slice(0, max);
const persona = (p) => ({ id: p?.id ?? null, username: txt(p?.username, 40), nombre: txt(p?.nombre_display || p?.username || 'Cuenta eliminada', 60), avatar: p?.avatar_url ?? '', rol: normalizarRol(p?.rol) });

/** Fila de `reportes_listar` → objeto seguro y cómodo para pintar. */
export function normalizarReporte(r) {
  if (!r || r.id == null) return null;
  const c = r.contenido ?? {};
  return {
    id: Number(r.id), tipo: TIPOS[r.tipo] ? r.tipo : 'usuario', objetivo: txt(r.objetivo_id, 64),
    motivo: esMotivo(r.motivo) ? r.motivo : 'otro', detalle: txt(r.detalle, DETALLE_MAX),
    contenido: { texto: txt(c.texto, 1000), titulo: txt(c.titulo, 100), imagen: c.imagen_url ?? '', video: c.video_url ?? '', usuario: txt(c.username, 40), nombre: txt(c.nombre_display, 60) },
    estado: ['abierto', 'resuelto', 'descartado'].includes(r.estado) ? r.estado : 'abierto', resolucion: txt(r.resolucion, 500),
    creado: r.created_at ?? null, resueltoEn: r.resuelto_at ?? null,
    reportante: persona(r.reportante), acusado: persona(r.acusado),
    resueltoPor: r.resuelto_por ? txt(r.resuelto_por.nombre_display || r.resuelto_por.username, 60) : '',
    mismos: Math.max(1, Number(r.mismos) || 1),
    sancion: r.sancion_vigente && (r.sancion_vigente.tipo === 'suspension' || r.sancion_vigente.tipo === 'baneo') ? { tipo: r.sancion_vigente.tipo, hasta: r.sancion_vigente.hasta ?? null } : null,
    oculto: r.oculto === true ? true : r.oculto === false ? false : null,
  };
}

/** Fila de `sanciones_de` → objeto seguro. */
export function normalizarSancion(s) {
  if (!s || s.id == null) return null;
  return {
    id: Number(s.id), tipo: SANCIONES[s.tipo] ? s.tipo : 'advertencia', motivo: txt(s.motivo, 500), hasta: s.hasta ?? null, creado: s.created_at ?? null,
    por: txt(s.creada_por, 60), vigente: s.vigente === true, levantadaEn: s.levantada_at ?? null, levantadaMotivo: txt(s.levantada_motivo, 500),
  };
}
