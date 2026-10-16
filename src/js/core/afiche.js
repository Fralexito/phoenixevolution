// EL AFICHE DEL DÍA (lógica pura → probable con `npm test`).
// Es la portada tipo diario deportivo que se dibuja sola con los datos de la noticia principal:
// titular gritado, una palabra resaltada, el marcador en grande y un color por día.
// Aquí NO se dibuja nada: solo se decide QUÉ va en el afiche. El dibujo (HTML y PNG) vive en features/noticias/afiche.js.
import { hash } from './noticiasPlantillas.js';
import { departamento, departamentoDe } from './departamentos.js';
import { claveDia } from './diario.js';

/** Un color por día, siempre sobre el negro de la web. Seis combinaciones que rotan. */
export const COLORES_DIA = ['#ffd400', '#00e5ff', '#e23b2e', '#00c06a', '#8b5cf6', '#f97316'];

/** «Camilo 4-1 Jack» → { gl: 4, gv: 1 }. Sin marcador → null. */
export function marcadorDe(texto) {
  const m = String(texto ?? '').match(/(?<![\d.,])(\d{1,2})\s*[-–]\s*(\d{1,2})(?![\d.,])/);
  if (!m) return null;
  const gl = Number(m[1]); const gv = Number(m[2]);
  return gl > 30 || gv > 30 ? null : { gl, gv, texto: `${gl}-${gv}` };
}

/** Qué clase de afiche toca, según lo que cuenta la noticia. */
export function tipoAfiche(n, dep = departamentoDe(n)) {
  const t = `${n?.tag ?? ''} ${n?.titulo ?? ''} ${n?.resumen ?? ''}`;
  if (dep === 'tribuna') return 'joda';
  if (dep === 'tribunal') return 'tribunal';
  if (dep === 'direccion') return 'comunicado';
  if (dep === 'mercado') return 'fichaje';
  if (dep === 'mesa') return 'ranking';
  if (dep === 'analista') return 'datos';
  if (dep === 'previa') return 'previa';
  if (/\b(racha|seguid|al hilo|invicto)\b/i.test(t)) return 'racha';
  if (/\b(r[eé]cord|hist[oó]ric|nunca|nadie)\b/i.test(t)) return 'record';
  const m = marcadorDe(t);
  if (m && Math.abs(m.gl - m.gv) >= 3) return 'goleada';
  if (m) return 'partido';
  if (/\b(no se jug|sin partidos|tranquil)\b/i.test(t)) return 'tranquilo';
  return 'normal';
}

const LIMPIA = /^\s*(\[[^\]]*\]|¡bombazo!|¡bomba!)\s*/i;
const COLGADAS = /\s+(y|o|de|del|al|a|en|con|que|por|para|un|una|el|la|los|las|su|se|lo|no|es|tras|sin|sobre)$/i;
/**
 * Corta el titular largo en un grito corto de diario. Por orden:
 * la exclamación de adelante («¡NADIE PUEDE CON ÉL!»), lo que hay antes o después de los dos puntos,
 * y si aun así es largo, corta en una palabra entera y se come las palabras colgadas del final.
 */
export function grito(titulo, max = 38) {
  let t = String(titulo ?? '').replace(LIMPIA, '').trim();
  const grita = t.match(/^¡[^!]{6,}!/);                       // «¡Otro frenazo! …» → se queda con el grito
  if (grita && grita[0].length <= max) t = grita[0];
  else {
    const corte = t.search(/[:·]/);
    if (corte > 0) {                                           // «El Archivo: …» → el rótulo corto sobra; «Aviso del Tribunal: …» manda
      const antes = t.slice(0, corte).trim(); const despues = t.slice(corte + 1).trim();
      t = antes.length <= 13 && despues ? despues : antes;
    }
  }
  if (t.length > max) {
    const hasta = t.lastIndexOf(' ', max);
    t = t.slice(0, hasta > 12 ? hasta : max);
  }
  t = t.replace(/[,;.:·]+$/, '').trim();
  let antes; do { antes = t; t = t.replace(COLGADAS, '').replace(/[,;.]$/, '').trim(); } while (t !== antes);
  return t.toUpperCase();
}

/** Parte el grito en 2 o 3 líneas parejas, sin cortar palabras. */
export function lineas(texto, maxLinea = 14) {
  const palabras = String(texto ?? '').split(/\s+/).filter(Boolean);
  const out = []; let linea = '';
  for (const p of palabras) {
    if (!linea) { linea = p; continue; }
    if (`${linea} ${p}`.length <= maxLinea) linea = `${linea} ${p}`;
    else { out.push(linea); linea = p; }
  }
  if (linea) out.push(linea);
  return out.length ? out.slice(0, 4) : [''];
}

/** Todo lo que necesita el dibujo del afiche. No toca el DOM. */
export function datosAfiche(n, { hoy = new Date(), dep = null } = {}) {
  const d = dep ?? departamentoDe(n);
  const info = departamento(d);
  const tipo = tipoAfiche(n, d);
  const fijo = { tribunal: '#e23b2e', joda: '#f97316', comunicado: '#e5e7eb' };
  const acento = fijo[tipo] ?? COLORES_DIA[hash(claveDia(hoy)) % COLORES_DIA.length];
  const texto = grito(n?.titulo);
  // un grito corto se parte en dos para que siempre haya una palabra resaltada: así se ve como un afiche y no como una frase suelta
  const ls = lineas(texto, texto.length <= 20 ? Math.max(5, Math.ceil(texto.length / 2)) : 14);
  const resaltado = ls.length > 1 ? ls[ls.length - 1] : '';
  const marcador = marcadorDe(`${n?.titulo ?? ''} ${n?.resumen ?? ''}`);
  const bajada = String(n?.resumen ?? '').trim().slice(0, 120);
  const inicial = (String(n?.titulo ?? '').match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b/) ?? [, '?'])[1].charAt(0).toUpperCase();
  return { tipo, acento, departamento: d, kicker: (n?.tag || info.cubre).replace(/^ejemplo\s*·\s*/i, ''), firma: info.firma, lineas: ls, resaltado, marcador, bajada, inicial, slug: n?.slug ?? '' };
}
