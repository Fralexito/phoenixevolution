// AJUSTES DEL USUARIO (puro, sin DOM): catálogo, validación, carga y guardado con un "almacén" inyectado (localStorage en el navegador, un objeto falso en los tests).
// Regla: un valor desconocido o corrupto NUNCA rompe la web: se descarta y se usa el valor por defecto.
export const CLAVE_AJUSTES = 'pes-ajustes-v1';

/** Catálogo: cada ajuste tiene su valor por defecto y la lista de valores permitidos. */
export const CATALOGO = {
  movimiento: { defecto: 'normal', permitidos: ['normal', 'reducido'] },   // «reducido» apaga animaciones
  vivo: { defecto: true, permitidos: [true, false] },                       // panel «En vivo» visible o no
};

export const AJUSTES_DEFECTO = Object.fromEntries(Object.entries(CATALOGO).map(([k, v]) => [k, v.defecto]));

/** Deja solo claves conocidas con valores permitidos; todo lo demás vuelve al defecto. */
export function normalizarAjustes(crudo) {
  const origen = crudo && typeof crudo === 'object' ? crudo : {};
  const salida = {};
  for (const [clave, def] of Object.entries(CATALOGO)) salida[clave] = def.permitidos.includes(origen[clave]) ? origen[clave] : def.defecto;
  return salida;
}

export function cargarAjustes(almacen) {
  try { const t = almacen?.getItem(CLAVE_AJUSTES); return normalizarAjustes(t ? JSON.parse(t) : null); }
  catch (e) { console.warn('[ajustes] lectura fallida, se usan los valores por defecto:', e); return { ...AJUSTES_DEFECTO }; }
}

/** @returns {boolean} true si se pudo guardar */
export function guardarAjustes(almacen, ajustes) {
  try { almacen.setItem(CLAVE_AJUSTES, JSON.stringify(normalizarAjustes(ajustes))); return true; }
  catch (e) { console.warn('[ajustes] no se pudo guardar:', e); return false; }
}
