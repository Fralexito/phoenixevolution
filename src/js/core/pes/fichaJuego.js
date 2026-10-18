// Datos DEL JUEGO de un jugador (Player.bin del parche) listos para mostrar: decodifica el texto de src/data/fichasJuego.js, nombra las
// habilidades y arma el perfil (ejes del gráfico). Lógica pura, sin DOM ni red. Formato: base-conocimiento/16-PLAYER-BIN-FICHA-COMPLETA.md.
import { CAMPOS, BITS_PLAYER, BITS_HABILIDADES, NIVEL_POSICION, POSICIONES } from './fichasCampos.js';

/** Habilidades especiales (com = estilo de juego COM) por número de bit; las no resueltas del documento 16 no están. «Pase en profundidad» ocupa dos bits (484 y 487). */
export const HABILIDADES = {
  482: ['Sombrero'], 483: ['Pase cruzado'], 484: ['Pase en profundidad'], 485: ['Elástica'], 486: ['Espíritu de lucha'], 487: ['Pase en profundidad'],
  488: ['Pase bombeado bajo'], 489: ['Mago del balón', true], 490: ['Patadón por bajo (PT)'], 491: ['Picardía'], 492: ['Capitanía'], 493: ['Centro con rosca'],
  494: ['Disparo descendente'], 495: ['Cabeceador'], 496: ['Patadón en largo (PT)'], 497: ['Marsellesa'], 499: ['Disparo ascendente'], 500: ['Pisar el balón'],
  501: ['Especialista en penaltis'], 502: ['Parapenaltis'], 503: ['Interceptador'], 504: ['Marcaje'], 505: ['Espuela'], 506: ['Vaselina'], 507: ['Pase al primer toque'],
  510: ['Llegador', true], 511: ['Remate al primer toque'], 518: ['Tiro de larga distancia'], 519: ['Bicicleta'], 520: ['Cañonero', true], 522: ['Pase largo de portero'],
  523: ['Dos toques'], 524: ['Finalización acrobática'], 525: ['Rebote interior'], 526: ['Misil con el balón', true], 527: ['Cañonero'], 528: ['Amago por detrás y giro'],
  529: ['Experto en pases largos', true], 530: ['Despeje acrobático'], 531: ['As del eslalon', true],
};

/** Grupos para mostrar las estadísticas de campo y las del portero. */
export const GRUPOS_STATS = [
  { id: 'ataque', nombre: 'Ataque', claves: ['ataque', 'control', 'regate', 'regate_ajustado', 'pase_raso', 'pase_bombeado', 'finalizacion', 'cabezazo', 'balon_parado', 'efecto', 'potencia_tiro'] },
  { id: 'fisico', nombre: 'Físico', claves: ['velocidad', 'aceleracion', 'equilibrio', 'contacto_fisico', 'salto', 'resistencia', 'agresividad'] },
  { id: 'defensa', nombre: 'Defensa', claves: ['defensa', 'recuperacion'] },
];
export const CLAVES_PORTERO = ['pt_despejar', 'pt_cobertura', 'pt_reflejos', 'pt_actitud', 'pt_atajar'];
/** Seis ejes del gráfico de un jugador de campo: promedio de las estadísticas que lo forman (es un resumen visual, no una «media» del juego). */
export const EJES = [
  { id: 'ritmo', nombre: 'Ritmo', claves: ['velocidad', 'aceleracion'] },
  { id: 'tiro', nombre: 'Tiro', claves: ['finalizacion', 'potencia_tiro', 'efecto'] },
  { id: 'pase', nombre: 'Pase', claves: ['pase_raso', 'pase_bombeado', 'balon_parado'] },
  { id: 'tecnica', nombre: 'Técnica', claves: ['regate', 'control', 'regate_ajustado'] },
  { id: 'defensa', nombre: 'Defensa', claves: ['defensa', 'recuperacion', 'agresividad'] },
  { id: 'fisico', nombre: 'Físico', claves: ['contacto_fisico', 'salto', 'resistencia', 'equilibrio'] },
];

const texto = Object.fromEntries(CAMPOS.map((c) => [c.clave, c.texto]));
export const nombreDeCampo = (clave) => texto[clave] ?? clave;

/** Texto hexadecimal de fichasJuego.js → { valores: {clave: lo que muestra el juego}, habilidades: [{nombre, com}] } (null si el texto no es válido). */
export function decodificarFicha(t) {
  if (typeof t !== 'string' || t.length !== CAMPOS.length * 2 + 13 || !/^[0-9a-f]+$/.test(t)) return null;
  const valores = {};
  CAMPOS.forEach((c, i) => { valores[c.clave] = parseInt(t.slice(i * 2, i * 2 + 2), 16) + BITS_PLAYER[c.clave][2]; });
  const mascara = BigInt(`0x${t.slice(CAMPOS.length * 2)}`);
  const vistas = new Set(); const habilidades = [];
  for (let i = 0; i < BITS_HABILIDADES.cuantos; i++) {
    const h = HABILIDADES[BITS_HABILIDADES.desde + i];
    if (!h || !((mascara >> BigInt(i)) & 1n)) continue;
    const marca = h[0] + (h[1] ? '*' : '');
    if (vistas.has(marca)) continue;
    vistas.add(marca); habilidades.push({ nombre: h[0], com: Boolean(h[1]) });
  }
  return { valores, habilidades };
}

/** ¿Es portero según el juego? (posición registrada PT). */
export const esPortero = (valores) => valores?.posicion_registrada === 0;
export const posicionRegistrada = (valores) => POSICIONES[valores?.posicion_registrada] ?? '';
/** Niveles de las 13 posiciones: [{pos: 'DC', clave: 'pos_dc', nivel: 'A'|'B'|'C'}]. */
export const nivelesPosicion = (valores) => POSICIONES.map((p) => ({ pos: p, clave: `pos_${p.toLowerCase()}`, nivel: NIVEL_POSICION[valores?.[`pos_${p.toLowerCase()}`]] ?? 'C' }));
/** Ejes del gráfico: [{id, nombre, valor}] — de campo (6 ejes) o de portero (sus 5 estadísticas). */
export function perfilEjes(valores) {
  if (esPortero(valores)) return CLAVES_PORTERO.map((k) => ({ id: k, nombre: nombreDeCampo(k).replace(' (portero)', ''), valor: valores[k] }));
  return EJES.map((e) => ({ id: e.id, nombre: e.nombre, valor: Math.round(e.claves.reduce((s, k) => s + valores[k], 0) / e.claves.length) }));
}
/** Vértices del polígono del gráfico (eje 0 arriba, en sentido horario). Valores de 40 a 99 → de 12 % a 100 % del radio. */
export function puntosRadar(ejes, radio = 100, centro = 110) {
  const n = ejes.length;
  return ejes.map((e, i) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const r = radio * (0.12 + 0.88 * Math.max(0, Math.min(1, (e.valor - 40) / 59)));
    return [Number((centro + r * Math.cos(a)).toFixed(1)), Number((centro + r * Math.sin(a)).toFixed(1))];
  });
}

/** Nombre completo de cada posición (para el detalle del campo). */
export const NOMBRE_POSICION = {
  PT: 'Portero', DFC: 'Defensa central', LI: 'Lateral izquierdo', LD: 'Lateral derecho', MCD: 'Mediocentro defensivo', MC: 'Mediocentro', MI: 'Mediocampista izquierdo',
  MD: 'Mediocampista derecho', MO: 'Mediapunta', EI: 'Extremo izquierdo', ED: 'Extremo derecho', SD: 'Segundo delantero', DC: 'Delantero centro',
};
/** Qué significa cada nivel de una posición. */
export const TEXTO_NIVEL = { A: 'La juega bien: es una posición natural para él.', B: 'Se defiende: la cubre con soltura si hace falta.', C: 'No la juega: rinde peor si lo pones ahí.' };
