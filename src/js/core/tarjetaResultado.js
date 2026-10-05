// Tarjeta de resultado para compartir (puro, sin DOM → probable): decide TEXTOS y COLORES; el dibujo vive en features/resultados/tarjeta.js.
import { veredicto } from './resultado.js';

export const TAM = { ancho: 1080, alto: 1080 };
const ACENTO = { victoria: '#00ff88', empate: '#ffb700', derrota: '#ff4d6d', neutro: '#00e5ff' };
const TITULO = { victoria: 'VICTORIA', empate: 'EMPATE', derrota: 'DERROTA', neutro: 'RESULTADO' };
const limpiar = (v) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
/** Recorta con «…» sin partir el texto a la mitad de una palabra corta. */
export const recortar = (v, max) => { const t = limpiar(v); return t.length <= max ? t : t.slice(0, Math.max(1, max - 1)).trimEnd() + '…'; };
/** Nombres de un bando → una línea («Ana, Luis y 2 más»). */
export function lineaBando(nombres, max = 26) {
  const n = (Array.isArray(nombres) ? nombres : []).map(limpiar).filter(Boolean);
  if (!n.length) return '—';
  if (n.length === 1) return recortar(n[0], max);
  if (n.length === 2) return recortar(`${n[0]} y ${n[1]}`, max);
  return recortar(`${n[0]}, ${n[1]} y ${n.length - 2} más`, max);
}
/** → datos listos para dibujar. miLado: 'A' | 'B' | null (si no juega, colores neutros y orden A–B). */
export function datosTarjeta({ bandoA, bandoB, golesA, golesB, miLado = null, plataforma = '', formato = '', fecha = '', sitio = 'Phoenix Evolution Series' } = {}) {
  const ga = Number(golesA), gb = Number(golesB);
  if (!Number.isInteger(ga) || !Number.isInteger(gb) || ga < 0 || gb < 0) return null;
  const v = veredicto(ga, gb, miLado) ?? 'neutro';
  const yoB = miLado === 'B';                                     // mi bando siempre a la izquierda
  const izq = yoB ? { n: bandoB, g: gb } : { n: bandoA, g: ga }, der = yoB ? { n: bandoA, g: ga } : { n: bandoB, g: gb };
  return {
    veredicto: v, titulo: TITULO[v], acento: ACENTO[v],
    izquierda: { nombre: lineaBando(izq.n), goles: izq.g }, derecha: { nombre: lineaBando(der.n), goles: der.g },
    marcador: `${izq.g} - ${der.g}`,
    detalle: [limpiar(formato), limpiar(plataforma), limpiar(fecha)].filter(Boolean).join(' · '), sitio: limpiar(sitio),
    archivo: `resultado-${izq.g}-${der.g}.png`,
  };
}
