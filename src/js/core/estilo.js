// Análisis de juego de una ficha (puro, sin DOM → probable). Todo se DERIVA de la posición y las 14 stats: es una aproximación, no un seguimiento real.
import { stat } from './dom.js';

export const EJES = [
  { id: 'ataque',     nombre: 'Ataque',     keys: ['atq', 'fin', 'pot'] },
  { id: 'creacion',   nombre: 'Creación',   keys: ['cre', 'pas', 'efe'] },
  { id: 'tecnica',    nombre: 'Técnica',    keys: ['reg', 'cor'] },
  { id: 'defensa',    nombre: 'Defensa',    keys: ['def', 'pos', 'ant'] },
  { id: 'presion',    nombre: 'Presión',    keys: ['pre', 'rit'] },
  { id: 'mentalidad', nombre: 'Mentalidad', keys: ['men'] },
];
/** Valor 1-99 de cada eje (promedio de sus stats; una stat vacía cuenta como 75). */
export const ejesEstilo = (p) => EJES.map((e) => ({ id: e.id, nombre: e.nombre, valor: Math.round(e.keys.reduce((s, k) => s + stat(p?.[k]), 0) / e.keys.length) }));

const ETIQUETA = { ataque: 'Finalizador', creacion: 'Cerebro creativo', tecnica: 'Regateador', defensa: 'Muro defensivo', presion: 'Presionador', mentalidad: 'Mente fría' };
/** Hasta 3 etiquetas de estilo: los 2 ejes más altos, o «Completo» si el perfil es parejo (diferencia ≤ 6 entre el mayor y el menor). */
export function arquetipos(p) {
  const ej = [...ejesEstilo(p)].sort((a, b) => b.valor - a.valor);
  const parejo = ej[0].valor - ej[ej.length - 1].valor <= 6;
  return [...(parejo ? ['Completo'] : []), ...ej.slice(0, 2).map((e) => ETIQUETA[e.id])];
}
/** Las `n` mejores y las `n` peores stats (clave y valor), de mayor a menor / de menor a mayor. */
export function fortalezasDebilidades(p, claves, n = 3) {
  const l = claves.map((k) => ({ k, v: stat(p?.[k]) }));
  return { fuertes: [...l].sort((a, b) => b.v - a.v).slice(0, n), flojas: [...l].sort((a, b) => a.v - b.v).slice(0, n) };
}
/** Frase corta sobre cómo juega, según Ataque vs Defensa. */
export function estiloTexto(p) {
  const e = Object.fromEntries(ejesEstilo(p).map((x) => [x.id, x.valor])); const d = e.ataque - e.defensa;
  return d >= 10 ? 'Ofensivo: vive cerca del área rival y arriesga arriba.' : d <= -10 ? 'Conservador: prioriza ordenar y cerrar espacios atrás.' : 'Equilibrado: reparte su esfuerzo entre atacar y defender.';
}

// ---- Mapa de calor aproximado ----
// Cancha horizontal: x 0 = arco propio → 100 = arco rival; y 0 = banda superior → 100 = inferior. Cada zona: [x, y, rx, ry, peso].
const BASE = {
  PO: [[7, 50, 8, 16, 1]],
  DFC: [[22, 50, 14, 18, 1], [28, 36, 10, 12, .5], [28, 64, 10, 12, .5]],
  LD: [[30, 84, 16, 11, 1], [46, 86, 12, 9, .5]], LI: [[30, 16, 16, 11, 1], [46, 14, 12, 9, .5]],
  MCD: [[38, 50, 15, 18, 1], [30, 50, 10, 14, .4]],
  MC: [[50, 50, 17, 20, 1], [45, 38, 10, 12, .4], [45, 62, 10, 12, .4]],
  MCO: [[62, 50, 14, 17, 1], [56, 38, 10, 11, .5], [70, 50, 10, 12, .5]],
  EI: [[72, 16, 16, 11, 1], [86, 28, 10, 12, .6], [58, 20, 10, 9, .4]], ED: [[72, 84, 16, 11, 1], [86, 72, 10, 12, .6], [58, 80, 10, 9, .4]],
  SD: [[76, 50, 13, 17, 1], [64, 44, 11, 12, .5]],
  DC: [[85, 50, 11, 16, 1], [78, 38, 9, 11, .5], [78, 62, 9, 11, .5]],
};
const lim = (v, a, b) => Math.min(b, Math.max(a, v));
/**
 * Zonas de calor aproximadas. Parte de la posición y las ajusta con las stats:
 *  · Ataque − Defensa desplaza las zonas hacia el arco rival (o el propio), hasta ±8 puntos de cancha.
 *  · Presión sube un poco más la zona; Pase+Creación añaden una zona de circulación en el centro del campo.
 * @returns {{zonas:{x:number,y:number,rx:number,ry:number,peso:number}[], tercios:{defensa:number,medio:number,ataque:number}}} `tercios` en % enteros que suman 100.
 */
export function mapaCalor(p) {
  const e = Object.fromEntries(ejesEstilo(p).map((x) => [x.id, x.valor]));
  const base = BASE[p?.posicion] ?? BASE.MC;
  const dx = lim((e.ataque - e.defensa) * 0.35 + (e.presion - 75) * 0.1, -8, 8);
  const zonas = base.map(([x, y, rx, ry, w]) => ({ x: lim(x + (p?.posicion === 'PO' ? dx / 3 : dx), 4, 96), y, rx, ry, peso: w }));
  const circ = (e.creacion - 60) / 40;                                   // 0 = poca creación · 1 = mucha
  if (circ > 0.2 && p?.posicion !== 'PO') zonas.push({ x: lim(52 + dx / 2, 30, 80), y: 50, rx: 18, ry: 20, peso: +(0.6 * circ).toFixed(2) });
  // Reparto por tercios: se mide cuánta «masa» de calor cae en cada tercio (campana a lo largo de la cancha, no solo el centro de cada zona).
  const t = { defensa: 0, medio: 0, ataque: 0 };
  for (let x = 1; x < 100; x += 2) {
    const dens = zonas.reduce((s2, z) => s2 + z.peso * Math.exp(-(((x - z.x) / z.rx) ** 2)), 0);
    t[x < 34 ? 'defensa' : x < 67 ? 'medio' : 'ataque'] += dens;
  }
  const total = t.defensa + t.medio + t.ataque || 1;
  let d = Math.round((t.defensa / total) * 100); let m = Math.round((t.medio / total) * 100);
  const a = Math.max(0, 100 - d - m); if (d + m + a !== 100) m = 100 - d - a;
  return { zonas, tercios: { defensa: d, medio: m, ataque: a } };
}
