// CATÁLOGO DE PLANTILLAS de noticias + motor de variación (sin DOM → probable con `npm test`).
// Una plantilla = una forma de dibujar la tarjeta (o el lector). El ESTILO la personaliza: acento (color), forma, brillo, animación y tipografía.
// Plantilla «auto» = el sitio elige por ti y ROTA para que dos noticias seguidas nunca se vean iguales (asignarDiseno).
// Para sumar una plantilla: agrégala en TARJETAS (aquí) y su dibujo en features/noticias/tarjetas.js (la prueba te avisa si falta uno).

/** @typedef {{id:string,nombre:string,nota:string,tamano:'normal'|'hero',cols:1|2|3,imagen:boolean,afin?:string[]}} Plantilla */
/** @type {Plantilla[]} */
export const TARJETAS = [
  // ---- Tarjetas normales ----
  { id: 'clasica', nombre: 'Clásica', nota: 'Imagen arriba, texto abajo.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'horizontal', nombre: 'Horizontal', nota: 'Imagen a la izquierda, texto a la derecha.', tamano: 'normal', cols: 2, imagen: true },
  { id: 'horizontal-inv', nombre: 'Horizontal invertida', nota: 'Texto a la izquierda, imagen a la derecha.', tamano: 'normal', cols: 2, imagen: true },
  { id: 'portada', nombre: 'Portada', nota: 'Imagen de fondo completa con el título encima.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'alta', nombre: 'Historia', nota: 'Tarjeta alta, como una historia.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'cine', nombre: 'Cine', nota: 'Imagen panorámica con bandas negras.', tamano: 'normal', cols: 2, imagen: true },
  { id: 'mosaico', nombre: 'Mosaico', nota: 'Cuadrada, título sobre la imagen.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'polaroid', nombre: 'Polaroid', nota: 'Foto con marco y leve inclinación.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'cristal', nombre: 'Cristal', nota: 'Panel de cristal sobre la imagen difuminada.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'diagonal', nombre: 'Diagonal', nota: 'Imagen y texto separados por un corte en diagonal.', tamano: 'normal', cols: 2, imagen: true },
  { id: 'neon', nombre: 'Neón', nota: 'Marco luminoso que late.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'carta', nombre: 'Carta', nota: 'Estilo carta de jugador, con borde dorado.', tamano: 'normal', cols: 1, imagen: true },
  { id: 'titular', nombre: 'Titular', nota: 'Solo texto, titular enorme. Sin imagen.', tamano: 'normal', cols: 1, imagen: false, afin: ['OFICIAL', 'TRIBUNAL'] },
  { id: 'cita', nombre: 'Cita', nota: 'El resumen como una cita destacada.', tamano: 'normal', cols: 1, imagen: false },
  { id: 'periodico', nombre: 'Periódico', nota: 'Estilo prensa: titular serif y filetes.', tamano: 'normal', cols: 1, imagen: false, afin: ['OFICIAL', 'JORNADA'] },
  { id: 'documento', nombre: 'Comunicado', nota: 'Documento oficial con sello.', tamano: 'normal', cols: 1, imagen: false, afin: ['OFICIAL', 'TRIBUNAL'] },
  { id: 'alerta', nombre: 'Alerta', nota: 'Franja de aviso para temas urgentes.', tamano: 'normal', cols: 1, imagen: false, afin: ['TRIBUNAL'] },
  { id: 'marcador', nombre: 'Marcador', nota: 'Banda de marcador para jornadas y resultados.', tamano: 'normal', cols: 2, imagen: false, afin: ['JORNADA'] },
  { id: 'fecha', nombre: 'Calendario', nota: 'La fecha como bloque de calendario.', tamano: 'normal', cols: 1, imagen: false },
  { id: 'cinta', nombre: 'Cinta', nota: 'Fila compacta: miniatura y título.', tamano: 'normal', cols: 2, imagen: true },
  { id: 'minimal', nombre: 'Minimal', nota: 'Solo título con subrayado animado.', tamano: 'normal', cols: 1, imagen: false },
  { id: 'etiqueta', nombre: 'Etiqueta gigante', nota: 'La etiqueta como letras enormes de fondo.', tamano: 'normal', cols: 1, imagen: false },
  // ---- Destacadas (la noticia grande de arriba) ----
  { id: 'hero-clasico', nombre: 'Destacada clásica', nota: 'Imagen a un lado, texto al otro.', tamano: 'hero', cols: 3, imagen: true },
  { id: 'hero-pantalla', nombre: 'Destacada a pantalla', nota: 'Imagen enorme con el título encima.', tamano: 'hero', cols: 3, imagen: true },
  { id: 'hero-split', nombre: 'Destacada dividida', nota: 'Dos mitades con corte diagonal.', tamano: 'hero', cols: 3, imagen: true },
  { id: 'hero-titular', nombre: 'Destacada titular', nota: 'Titular gigante sin imagen.', tamano: 'hero', cols: 3, imagen: false },
];
/** Diseños del lector (la ventana al abrir una noticia). */
export const LECTURAS = [
  { id: 'estandar', nombre: 'Estándar', nota: 'Cabecera, imagen y texto.' },
  { id: 'hero', nombre: 'Portada', nota: 'La imagen ocupa la cabecera con el título encima.' },
  { id: 'revista', nombre: 'Revista', nota: 'Texto a dos columnas.' },
  { id: 'editorial', nombre: 'Editorial', nota: 'Letra capital y tipografía de prensa.' },
  { id: 'documento', nombre: 'Documento', nota: 'Comunicado formal con sello.' },
  { id: 'cine', nombre: 'Cine', nota: 'Imagen panorámica y texto centrado.' },
];

export const ACENTOS = {
  galaxy: { nombre: 'Cian', rgb: '0 229 255' }, violeta: { nombre: 'Violeta', rgb: '168 85 247' }, oro: { nombre: 'Oro', rgb: '251 191 36' },
  rojo: { nombre: 'Rojo', rgb: '244 63 94' }, esmeralda: { nombre: 'Esmeralda', rgb: '16 185 129' }, rosa: { nombre: 'Rosa', rgb: '236 72 153' },
  naranja: { nombre: 'Naranja', rgb: '249 115 22' }, azul: { nombre: 'Azul', rgb: '59 130 246' },
};
export const OPCIONES = {
  acento: Object.keys(ACENTOS),
  forma: ['recto', 'redondo', 'corte'],
  brillo: ['suave', 'neon', 'ninguno'],
  anim: ['sube', 'zoom', 'inclina', 'ninguna'],
  fuente: ['display', 'serif', 'mono'],
  lectura: LECTURAS.map((l) => l.id),
};
export const ETIQUETAS_OPCION = {
  acento: 'Color', forma: 'Forma', brillo: 'Brillo', anim: 'Al pasar el cursor', fuente: 'Letra', lectura: 'Al abrirla',
  recto: 'Recta', redondo: 'Redondeada', corte: 'Esquina cortada', suave: 'Suave', neon: 'Neón', ninguno: 'Sin brillo',
  sube: 'Se eleva', zoom: 'Zoom a la imagen', inclina: 'Se inclina', ninguna: 'Quieta', display: 'Deportiva', serif: 'Prensa', mono: 'Técnica',
};
const ACENTO_POR_CAT = { OFICIAL: 'galaxy', JORNADA: 'esmeralda', TRIBUNAL: 'rojo' };

export const plantillaDe = (id) => TARJETAS.find((t) => t.id === id) ?? null;
export const esPlantilla = (id) => id === 'auto' || !!plantillaDe(id);
export const NORMALES = TARJETAS.filter((t) => t.tamano === 'normal');
export const HEROES = TARJETAS.filter((t) => t.tamano === 'hero');

/** Limpia un estilo cualquiera: solo conserva claves y valores permitidos (viene de la base, no se confía). */
export function limpiarEstilo(e) {
  const o = {}; if (!e || typeof e !== 'object' || Array.isArray(e)) return o;
  for (const k of Object.keys(OPCIONES)) if (OPCIONES[k].includes(e[k])) o[k] = e[k];
  return o;
}
/** Hash estable de texto → entero ≥ 0 (misma noticia ⇒ mismo diseño automático, siempre). */
export function hash(s) { let h = 2166136261; for (const c of String(s ?? '')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
/** Generador pseudoaleatorio con semilla (mulberry32). */
export function azar(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const elegir = (r, l) => l[Math.floor(r() * l.length)];

/** Estilo aleatorio válido (para el botón «Sorprenderme»). Misma semilla ⇒ mismo resultado. */
export function estiloAleatorio(semilla, categoria = 'OFICIAL') {
  const r = azar(semilla);
  return { acento: r() < 0.35 ? ACENTO_POR_CAT[categoria] ?? 'galaxy' : elegir(r, OPCIONES.acento), forma: elegir(r, OPCIONES.forma), brillo: elegir(r, OPCIONES.brillo), anim: elegir(r, OPCIONES.anim), fuente: elegir(r, OPCIONES.fuente), lectura: elegir(r, OPCIONES.lectura) };
}

/**
 * Decide el diseño final de cada noticia de la lista (en el orden mostrado). Respeta lo que el admin eligió; lo «auto» se reparte con reglas:
 *  · afinidad: una noticia de TRIBUNAL tiende a Alerta/Comunicado; una JORNADA a Marcador…, pero con variedad;
 *  · nunca repite plantilla entre las 3 anteriores ni el mismo acento+forma en dos seguidas.
 * @param {{slug:string,categoria:string,plantilla?:string,estilo?:object,imagen?:string}[]} lista
 * @returns {{plantilla:string, estilo:Required<ReturnType<typeof limpiarEstilo>>}[]} un diseño por noticia, en el mismo orden.
 */
export function asignarDiseno(lista, { heroIdx = -1 } = {}) {
  const recientes = []; let prev = null; const out = [];
  lista.forEach((n, i) => {
    const hero = i === heroIdx; const pool = hero ? HEROES : NORMALES; const fijo = esPlantilla(n.plantilla) && n.plantilla !== 'auto' ? plantillaDe(n.plantilla) : null;
    const r = azar(hash(n.slug) ^ (hero ? 0x9e3779b9 : 0));
    let p = fijo && (fijo.tamano === 'hero') === hero ? fijo : null;
    if (!p) {
      const sinImg = !n.imagen; let cand = pool.filter((t) => !recientes.slice(-3).includes(t.id) && (hero || !t.imagen || !sinImg || true));
      if (sinImg) cand = cand.filter((t) => !t.imagen || t.id === 'clasica' || t.id === 'portada' || t.id === 'mosaico');   // sin foto: el hueco de imagen mostrará el degradado, no se cae
      if (!cand.length) cand = pool;
      const afines = cand.filter((t) => t.afin?.includes(n.categoria)); const base = afines.length && r() < 0.6 ? afines : cand;
      p = elegir(r, base);
    }
    const e0 = limpiarEstilo(n.estilo); const re = azar(hash(`${n.slug}:estilo`));
    const estilo = { acento: e0.acento ?? (re() < 0.55 ? ACENTO_POR_CAT[n.categoria] ?? 'galaxy' : elegir(re, OPCIONES.acento)), forma: e0.forma ?? elegir(re, OPCIONES.forma), brillo: e0.brillo ?? elegir(re, OPCIONES.brillo), anim: e0.anim ?? elegir(re, OPCIONES.anim), fuente: e0.fuente ?? (p.id === 'periodico' || p.id === 'editorial' ? 'serif' : elegir(re, ['display', 'display', 'serif', 'mono'])), lectura: e0.lectura ?? elegir(re, OPCIONES.lectura) };
    if (prev && !e0.acento && prev.acento === estilo.acento && prev.forma === estilo.forma) estilo.acento = OPCIONES.acento[(OPCIONES.acento.indexOf(estilo.acento) + 1) % OPCIONES.acento.length];
    prev = estilo; if (!hero) recientes.push(p.id); out.push({ plantilla: p.id, estilo });
  });
  return out;
}
