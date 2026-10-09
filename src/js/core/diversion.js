// Generadores de DIVERSIÓN para torneos propios (puros → con test). Datos en data/dinamicas.js y data/modalidades.js.
// Todo es determinista por semilla: el mismo torneo y el mismo partido muestran siempre la misma regla/castigo (así los dos jugadores ven lo mismo).
import { PIEZAS_NOMBRE, CASTIGOS, TITULOS_BROMA } from '../../data/dinamicas.js';

/** Hash simple y estable de un texto → entero positivo. */
export function hashTexto(texto) {
  let h = 2166136261;
  for (const c of String(texto ?? '')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

const elegir = (lista, semilla) => (Array.isArray(lista) && lista.length ? lista[hashTexto(semilla) % lista.length] : null);

/** Nombre épico/gracioso para un torneo: «Copa del Pollo Veloz». Con la misma semilla da siempre el mismo. */
export function nombreEpico(semilla = Date.now()) {
  return `${elegir(PIEZAS_NOMBRE.prefijo, `p${semilla}`)} ${elegir(PIEZAS_NOMBRE.adjetivo, `a${semilla}`)}`;
}

/** Regla loca de un partido concreto (ruleta por partido). */
export function reglaDelPartido(torneoId, clave, reglas) { return elegir(reglas, `r${torneoId}:${clave}`); }

/** Castigo sano para quien pierda ese partido. */
export function castigoDelPartido(torneoId, clave) { return elegir(CASTIGOS, `c${torneoId}:${clave}`); }

/** Título de broma para premiar a alguien (por ejemplo al último lugar). */
export function tituloDeBroma(semilla) { return elegir(TITULOS_BROMA, `t${semilla}`); }
