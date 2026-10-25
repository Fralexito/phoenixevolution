// Resultados AUTOMÁTICOS de Phoenix Link en torneos (migración 145) — lógica PURA (sin DOM ni red → `npm test`).
// La base decide de verdad (torneo_resultado_link_resolver, sistema_torneo_resultado_link); esto solo elige qué mostrar.
//   · Permiso automático del torneo: 'premium' (pagó con gemas, confirma el organizador) u 'oficial' (aprobado por el staff,
//     confirma el staff). Sin permiso, los resultados se anotan a mano como siempre.
// Guía: docs/liga-y-torneos/LIGA-Y-TORNEOS.md (parte 6) · contrato para Link: docs/web-pes-link/CONTRATO-TORNEOS-LINK.md.

/** Formatos cuyos partidos puede llenar Phoenix Link. Espejo de private.tl_formato_auto (145). */
export const FORMATOS_AUTO = Object.freeze(['eliminacion', 'doble', 'liguilla', 'idavuelta', 'grupos', 'suizo']);
/** Ligas: al hacerse oficiales pasan a «Liga oficial» (143) en vez de quedarse en Torneos. */
export const FORMATOS_LIGA = Object.freeze(['liguilla', 'idavuelta']);

export const formatoAuto = (f) => FORMATOS_AUTO.includes(f);
export const esLiga = (f) => FORMATOS_LIGA.includes(f);

/** Texto corto del permiso para la cabecera del torneo (o '' si no tiene). */
export function etiquetaPermiso(origen) {
  if (origen === 'oficial') return 'Oficial · resultados por Phoenix Link';
  if (origen === 'premium') return 'Resultados automáticos con Phoenix Link';
  return '';
}

/** ¿Quién confirma los resultados que manda Link? 'staff' (oficial), 'organizador' (premium) o null (sin permiso). */
export const quienConfirma = (origen) => (origen === 'oficial' ? 'staff' : origen === 'premium' ? 'organizador' : null);

/** ¿Esta persona puede confirmar o rechazar las propuestas de Link de este torneo? */
export function puedeConfirmar({ origen, esOrganizador, esStaff, esModerador }) {
  const q = quienConfirma(origen);
  if (q === 'staff') return Boolean(esStaff);
  if (q === 'organizador') return Boolean(esOrganizador || esModerador);
  return false;
}

/**
 * Cómo pintar una propuesta de Link junto a su partido.
 * @param {{ ga:number, gb:number, ganador:'a'|'b'|null, estado:'propuesto'|'disputa', pk_a?:number|null, pk_b?:number|null }} prop
 * @param {{ a_nombre:string, b_nombre:string, eliminatoria:boolean }} partido
 * @returns {{ marcador:string, texto:string, disputa:boolean, faltaGanador:boolean }}
 */
export function vistaPropuesta(prop, partido) {
  const pen = Number.isInteger(prop?.pk_a) && Number.isInteger(prop?.pk_b) ? ` (pen. ${prop.pk_a}–${prop.pk_b})` : '';
  const marcador = `${prop.ga} – ${prop.gb}${pen}`;
  const disputa = prop.estado === 'disputa';
  const faltaGanador = Boolean(partido?.eliminatoria) && prop.ga === prop.gb && !prop.ganador;
  const pasa = prop.ganador === 'a' ? partido?.a_nombre : prop.ganador === 'b' ? partido?.b_nombre : null;
  const texto = disputa
    ? `Phoenix Link mandó dos marcadores distintos; el último fue ${marcador}. Revisa antes de confirmar.`
    : `Phoenix Link mandó ${marcador}${pasa && prop.ga === prop.gb ? `: pasa ${pasa}` : ''}.`;
  return { marcador, texto, disputa, faltaGanador };
}

/** Índice clave → propuesta, para ponerla al lado de su partido. */
export const porClave = (props) => new Map((props ?? []).map((p) => [p.clave, p]));
