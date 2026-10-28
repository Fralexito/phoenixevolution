// Lógica pura del SELECTOR PHOENIX (reemplazo de la lista nativa del sistema; ver js/features/selectorPhoenix.js).
// Sin DOM: recibe las opciones como [{texto, desactivada}] y devuelve índices. Pruebas: tests/listaOpciones.test.mjs

/** Siguiente opción que se puede elegir desde `desde`, avanzando `paso` (+1/-1). Si no hay, devuelve `desde`. */
export function siguienteHabilitada(ops, desde, paso) {
  for (let i = desde + paso; i >= 0 && i < ops.length; i += paso) if (!ops[i]?.desactivada) return i;
  return desde;
}
/** Primera / última opción que se puede elegir (-1 si ninguna). */
export const primeraHabilitada = (ops) => ops.findIndex((o) => !o.desactivada);
export function ultimaHabilitada(ops) { for (let i = ops.length - 1; i >= 0; i--) if (!ops[i].desactivada) return i; return -1; }

const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Búsqueda al teclear (como las listas nativas): la primera opción que empieza con `texto`, buscando después de `desde` y dando la vuelta. -1 si no hay. */
export function buscarPorTexto(ops, texto, desde = -1) {
  const t = plano(texto); if (!t || !ops.length) return -1;
  for (let k = 1; k <= ops.length; k++) { const i = (desde + k + ops.length) % ops.length; if (!ops[i].desactivada && plano(ops[i].texto).startsWith(t)) return i; }
  return -1;
}
