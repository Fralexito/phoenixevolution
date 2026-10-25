// Pedidos para hacer OFICIAL una liga o torneo casual (migraciones 144 y 145) — lógica PURA (sin DOM ni red → `npm test`).
// Desde la 145 vale para cualquier formato que Phoenix Link sabe llenar: las ligas (liguilla/idavuelta) pasan a «Liga oficial»;
// el resto queda oficial DENTRO de Torneos y sus resultados los manda Link y los confirma el staff.
// Quién decide de verdad es la base (torneo_solicitar_oficial / staff_solicitud_oficial_resolver); esto solo elige qué mostrar.
//   · Casual  = /torneos/: cualquiera la crea y el creador anota los resultados a mano.
//   · Oficial = /liga-amigos/ («Liga oficial»): Phoenix Link sube los resultados solo.
// Guía: docs/liga-y-torneos/LIGA-Y-TORNEOS.md (parte «Pedir que una liga sea oficial»).

import { FORMATOS_AUTO, esLiga } from './resultadosLink.js';

/** Formatos que pueden ser oficiales (los que Phoenix Link sabe llenar). Espejo de private.tl_formato_auto (145). */
export const FORMATOS_OFICIAL = FORMATOS_AUTO;
/** Horas de espera tras un rechazo antes de volver a pedir. Espejo de torneo_solicitar_oficial (144). */
export const ESPERA_TRAS_RECHAZO_H = 24;
/** Largo máximo de la nota del pedido y del motivo del rechazo. Espejo de la 144. */
export const MAX_TEXTO = 300;
/** Largo mínimo del motivo de rechazo. Espejo de staff_solicitud_oficial_resolver (144). */
export const MIN_MOTIVO = 5;

/**
 * ¿El torneo, por sí mismo, puede llegar a ser oficial? (formato automático, en inscripción, visible y aún no oficial).
 * `autoOrigen` = permiso automático actual ('oficial' | 'premium' | null): si ya es oficial, no.
 */
export function ligaApta(t, autoOrigen = null) {
  return Boolean(t) && !t.oculto && !t.meta?.oficial && autoOrigen !== 'oficial' && FORMATOS_OFICIAL.includes(t.formato) && t.estado === 'inscripcion';
}
/** Mismo criterio con un nombre que no confunde (desde la 145 no son solo ligas). */
export const torneoApto = ligaApta;

/** Horas que faltan para poder volver a pedir tras un rechazo (0 = ya se puede). */
export function horasParaVolver(solicitud, ahora = new Date()) {
  if (solicitud?.estado !== 'rechazada' || !solicitud.resuelto_en) return 0;
  const listo = new Date(solicitud.resuelto_en).getTime() + ESPERA_TRAS_RECHAZO_H * 3600e3;
  const falta = (listo - new Date(ahora).getTime()) / 3600e3;
  return Number.isFinite(falta) && falta > 0 ? Math.ceil(falta) : 0;
}

/**
 * Qué ve el CREADOR de la liga en su página.
 * @param {{ t: object, yo: string|null, solicitud: object|null, ahora?: Date }} x
 * @returns {{ modo: 'nada'|'pedir'|'pendiente'|'rechazada'|'esperar', texto: string }}
 */
export function vistaCreador({ t, yo, solicitud, ahora = new Date(), autoOrigen = null }) {
  if (!t || !yo || t.creador !== yo || !ligaApta(t, autoOrigen)) return { modo: 'nada', texto: '' };
  if (solicitud?.estado === 'pendiente') return { modo: 'pendiente', texto: 'Pediste que sea oficial. El staff lo revisará pronto y te llegará un aviso.' };
  const espera = horasParaVolver(solicitud, ahora);
  if (solicitud?.estado === 'rechazada') {
    const motivo = solicitud.motivo ? ` Motivo: ${solicitud.motivo}` : '';
    if (espera > 0) return { modo: 'esperar', texto: `El staff no la aceptó todavía.${motivo} Podrás volver a pedirlo en ${espera} ${espera === 1 ? 'hora' : 'horas'}.` };
    return { modo: 'rechazada', texto: `La última vez el staff no la aceptó.${motivo} Ya puedes volver a pedirlo.` };
  }
  return { modo: 'pedir', texto: esLiga(t.formato)
    ? 'Si la haces oficial, Phoenix Link sube los resultados solo y aparece en Liga oficial. El staff tiene que aceptarlo.'
    : 'Si lo haces oficial, Phoenix Link manda los resultados y el staff los confirma. El staff tiene que aceptarlo.' };
}

/** ¿El staff debe ver la caja «Aceptar / Rechazar» en la página de la liga? */
export const staffVePedido = (solicitud, esStaff) => Boolean(esStaff) && solicitud?.estado === 'pendiente';

/** Valida el motivo de un rechazo. Devuelve el texto limpio o lanza un Error con el mensaje para la persona. */
export function validarMotivo(motivo) {
  const m = String(motivo ?? '').trim();
  if (m.length < MIN_MOTIVO) throw new Error(`Escribe el motivo (mínimo ${MIN_MOTIVO} letras): lo leerá quien lo pidió.`);
  if (m.length > MAX_TEXTO) throw new Error(`El motivo puede tener hasta ${MAX_TEXTO} letras.`);
  return m;
}

/** Limpia la nota opcional del pedido (vacía → null). */
export function limpiarNota(nota) {
  const n = String(nota ?? '').trim();
  if (!n) return null;
  if (n.length > MAX_TEXTO) throw new Error(`La nota puede tener hasta ${MAX_TEXTO} letras.`);
  return n;
}

/** Nombre corto del formato para la lista del staff. */
const NOMBRES = { idavuelta: 'Ida y vuelta', liguilla: 'Todos contra todos', eliminacion: 'Eliminación directa', doble: 'Doble eliminación', grupos: 'Grupos', suizo: 'Suizo' };
export const nombreFormato = (f) => NOMBRES[f] ?? String(f ?? '');
