// Aplica los ajustes a TODA la web escribiendo atributos en <html>; el CSS (styles/layout.css) hace el resto.
import { cargarAjustes, guardarAjustes, normalizarAjustes } from '../core/ajustes.js';

const almacen = () => { try { return window.localStorage; } catch { return null; } };

export function aplicarAjustes(a) {
  const r = document.documentElement;
  r.dataset.movimiento = a.movimiento; r.dataset.vivo = a.vivo ? 'si' : 'no';
}
export function leerAjustes() { const s = almacen(); return s ? cargarAjustes(s) : normalizarAjustes(null); }
export function cambiarAjuste(clave, valor) {
  const nuevo = normalizarAjustes({ ...leerAjustes(), [clave]: valor });
  const s = almacen(); const ok = s ? guardarAjustes(s, nuevo) : false;
  aplicarAjustes(nuevo); return { ajustes: nuevo, guardado: ok };
}
export function initAjustes() { aplicarAjustes(leerAjustes()); }
