// Convierte, AL CONSTRUIR la web, cada «pregúntale a Windows» del CSS en «pregúntale a los ajustes de la web» (ronda 243).
//
// Problema: el CSS usaba @media (prefers-reduced-motion: reduce | no-preference), que lee SOLO lo que dice el sistema operativo.
// Si Windows tiene las animaciones apagadas, ni eligiendo «Animaciones: Siempre activas» en Ajustes se movía nada.
// Solución: el atributo html[data-aj-mov-efectivo] ya combina las dos cosas (lo pone js/features/ajustes.js y, antes de pintar,
// un script corto en Layout.astro). Este plugin reescribe:
//   @media (prefers-reduced-motion: reduce)        { S { … } }  →  :root[data-aj-mov-efectivo='reducido'] S { … }
//   @media (prefers-reduced-motion: no-preference) { S { … } }  →  :root:not([data-aj-mov-efectivo='reducido']) S { … }
// Así «Según el sistema» sigue respetando a Windows, y «Siempre activas» / «Reducidas» mandan sobre él.
// Pruebas: tests/movimientoPostcss.test.mjs

export const ATR = "[data-aj-mov-efectivo='reducido']";
const CONDICION = { reduce: ATR, 'no-preference': `:not(${ATR})` };

/** ¿Este @media es exactamente una pregunta de movimiento? Devuelve 'reduce', 'no-preference' o null. */
export function tipoMedia(params) {
  const m = String(params).trim().match(/^\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/);
  return m ? m[1] : null;
}

/** Antepone la condición a UN selector, respetando los que ya apuntan a <html>. */
export function conCondicion(selector, tipo) {
  const c = CONDICION[tipo];
  const s = selector.trim();
  if (/^(html|:root)(?![\w-])/.test(s)) return s.replace(/^(html|:root)/, `$1${c}`);   // html[x] y → html[cond][x] y
  if (/^\.js(?![\w-])/.test(s) || s.startsWith('::')) return `:root${c}${s}`;          // .js está en <html>; ::view-transition sale de :root
  return `:root${c} ${s}`;
}

function convertir(nodo, tipo) {
  if (nodo.type === 'rule') { nodo.selectors = nodo.selectors.map((s) => conCondicion(s, tipo)); return; }
  if (nodo.type === 'atrule' && /keyframes$/i.test(nodo.name)) return;                // las animaciones en sí no cambian
  if (nodo.nodes) nodo.nodes.forEach((n) => convertir(n, tipo));                        // @supports, @media anidados…
}

/** Plugin de PostCSS (Vite lo ejecuta sobre todo el CSS del sitio). */
export default function movimientoSegunAjustes() {
  return {
    postcssPlugin: 'pes-movimiento-segun-ajustes',
    AtRule: {
      media(at) {
        const tipo = tipoMedia(at.params);
        if (!tipo) return;
        at.nodes.forEach((n) => convertir(n, tipo));
        at.replaceWith(at.nodes);
      },
    },
  };
}
movimientoSegunAjustes.postcss = true;
