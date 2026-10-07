// Dibujo de las tarjetas y del lector de Noticias (solo construye texto HTML: sin DOM, sin red → probable con `npm test`).
// Cada plantilla de core/noticiasPlantillas.js tiene aquí su dibujo; los estilos (CSS) están en styles/components.css (.nt-*, .nl-*).
import { escapeHTML as esc, safeImg } from '../../core/dom.js';
import { FX } from '../../../data/experimento.js';
import { ACENTOS, plantillaDe, LECTURAS } from '../../core/noticiasPlantillas.js';

/** @typedef {{cuando:(n:object)=>string, ligaNombre:(id:string)=>string, borrador:(n:object)=>string}} Ctx */
const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const rgbDe = (e) => (ACENTOS[e?.acento] ?? ACENTOS.galaxy).rgb;
const FALLA = (cls) => `this.outerHTML='<div class=\\'nt-img nt-ph ${cls}\\'><i class=\\'fa-solid fa-newspaper\\'></i></div>'`;
const foto = (n, cls = '') => (safeImg(n.imagen)
  ? `<img src="${esc(safeImg(n.imagen))}" alt="" loading="lazy" decoding="async" class="nt-img ${cls}" onerror="${FALLA(cls)}">`   // si el enlace de la imagen falla, queda el degradado (nunca un icono roto)
  : `<div class="nt-img nt-ph ${cls}"><i class="fa-solid fa-newspaper"></i></div>`);
const tag = (n) => esc(n.tag || n.categoria);
const fechaBloque = (n) => { const d = new Date(n.publicadaEn); return Number.isNaN(d.getTime()) ? { dia: '•', mes: 'NEWS' } : { dia: String(d.getDate()).padStart(2, '0'), mes: MES[d.getMonth()] }; };
const pie = (n, c) => `<div class="nt-foot"><span><i class="fa-regular fa-clock"></i> ${esc(c.cuando(n))}</span><span class="nt-go">Leer →</span></div>`;
const cabeza = (n, c) => `<span class="nt-tag">${tag(n)}</span>`;

/** Mapa plantilla → función que devuelve el contenido interno de la tarjeta. */
const DIBUJOS = {
  clasica: (n, c) => `<div class="nt-media">${foto(n)}${cabeza(n)}</div><div class="nt-body"><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p></div>${pie(n, c)}`,
  horizontal: (n, c) => `<div class="nt-media">${foto(n)}</div><div class="nt-body">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  'horizontal-inv': (n, c) => DIBUJOS.horizontal(n, c),
  portada: (n, c) => `${foto(n, 'nt-fondo')}<div class="nt-vela"></div><div class="nt-cuerpo">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  alta: (n, c) => DIBUJOS.portada(n, c),
  cine: (n, c) => `${foto(n, 'nt-fondo')}<div class="nt-vela"></div><div class="nt-barra"></div><div class="nt-cuerpo">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}</h4><span class="nt-meta">${esc(c.cuando(n))}</span></div>`,
  mosaico: (n, c) => `${foto(n, 'nt-fondo')}<div class="nt-vela"></div><div class="nt-cuerpo">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}</h4></div>`,
  neon: (n, c) => DIBUJOS.portada(n, c),
  polaroid: (n, c) => `<div class="nt-media">${foto(n)}</div><div class="nt-body">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}</h4><span class="nt-meta">${esc(c.cuando(n))}</span></div>`,
  cristal: (n, c) => `${foto(n, 'nt-fondo')}<div class="nt-vidrio"><span class="nt-tag">${tag(n)}</span><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  diagonal: (n, c) => `<div class="nt-media">${foto(n)}</div><div class="nt-body">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  carta: (n, c) => `<div class="nt-marco"><span class="nt-ovr">${tag(n)}</span><div class="nt-media">${foto(n)}</div><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p><span class="nt-meta">${esc(c.cuando(n))} · ${esc(c.ligaNombre(n.liga))}</span></div>`,
  titular: (n, c) => `<div class="nt-body">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4>${pie(n, c)}</div>`,
  cita: (n, c) => `<div class="nt-body"><span class="nt-comilla" aria-hidden="true">“</span><p class="nt-res">${esc(n.resumen)}</p><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4>${pie(n, c)}</div>`,
  periodico: (n, c) => `<div class="nt-body"><div class="nt-cab"><span>${esc(c.ligaNombre(n.liga))}</span><span>${esc(c.cuando(n))}</span></div><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p><span class="nt-go">Seguir leyendo →</span></div>`,
  documento: (n, c) => `<div class="nt-body"><span class="nt-sello"><i class="fa-solid fa-stamp"></i> ${tag(n)}</span><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  alerta: (n, c) => `<div class="nt-franja"><i class="fa-solid fa-triangle-exclamation"></i> ${tag(n)}</div><div class="nt-body"><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  marcador: (n, c) => `<div class="nt-banda"><span class="nt-tag">${tag(n)}</span><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><span class="nt-hora">${esc(c.cuando(n))}</span></div><p class="nt-res">${esc(n.resumen)}</p>`,
  fecha: (n, c) => { const f = fechaBloque(n); return `<div class="nt-cal"><b>${f.dia}</b><span>${f.mes}</span></div><div class="nt-body">${cabeza(n)}<h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p></div>`; },
  cinta: (n, c) => `<div class="nt-media">${foto(n)}</div><div class="nt-body"><span class="nt-tag">${tag(n)}</span><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4></div><span class="nt-go">→</span>`,
  minimal: (n, c) => `<div class="nt-body"><span class="nt-meta">${tag(n)} · ${esc(c.cuando(n))}</span><h4 class="nt-title"><span>${esc(n.titulo)}${c.borrador(n)}</span></h4></div>`,
  etiqueta: (n, c) => `<span class="nt-gigante" aria-hidden="true">${tag(n)}</span><div class="nt-body"><h4 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h4><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  // ---- destacadas ----
  'hero-clasico': (n, c) => `<div class="nt-media">${foto(n)}</div><div class="nt-body"><span class="nt-tag"><i class="fa-solid fa-bullhorn"></i> ${tag(n)}</span><h3 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h3><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  'hero-pantalla': (n, c) => `${foto(n, 'nt-fondo')}<div class="nt-vela"></div><div class="nt-cuerpo"><span class="nt-tag"><i class="fa-solid fa-bullhorn"></i> ${tag(n)}</span><h3 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h3><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
  'hero-split': (n, c) => DIBUJOS['hero-clasico'](n, c),
  'hero-titular': (n, c) => `<div class="nt-body"><span class="nt-tag"><i class="fa-solid fa-bullhorn"></i> ${tag(n)}</span><h3 class="nt-title">${esc(n.titulo)}${c.borrador(n)}</h3><p class="nt-res">${esc(n.resumen)}</p>${pie(n, c)}</div>`,
};
export const PLANTILLAS_DIBUJADAS = Object.keys(DIBUJOS);

/** Tarjeta completa lista para insertar en la página. `e` = estilo ya resuelto (acento, forma, brillo, anim, fuente). */
export function tarjetaHTML(n, plantillaId, e, c) {
  const p = plantillaDe(plantillaId) ?? plantillaDe('clasica'); const dibujo = DIBUJOS[p.id] ?? DIBUJOS.clasica;
  const tono = !FX.noticiasTono ? '' : n.categoria === 'TRIBUNA' ? 'tono-joda' : 'tono-serio';
  const sticker = tono === 'tono-joda' ? '<span class="nt-sticker" aria-hidden="true">😂 JODA</span>' : '';
  return `<button type="button" data-slug="${esc(n.slug)}" data-id="${esc(n.id ?? '')}" class="nt ${tono} nt-${p.id} nc-${p.cols} nf-${e.forma} nb-${e.brillo} na-${e.anim} nu-${e.fuente}" style="--na:${rgbDe(e)}">${sticker}${dibujo(n, c)}</button>`;
}

// ---------------- Lector ----------------
const cuerpoHTML = (n) => n.cuerpo.map((p) => `<p>${esc(p)}</p>`).join('');
const cierre = '<button type="button" data-close aria-label="Cerrar" class="nl-x"><i class="fa-solid fa-xmark"></i></button>';
const meta = (n, c) => `<span class="nl-tag">${tag(n)}</span><span class="nl-cuando">• ${esc(c.cuando(n))} · ${esc(c.ligaNombre(n.liga))}</span>${c.borrador(n)}`;
const LEE = {
  estandar: (n, c) => `${cierre}<header class="nl-cab">${meta(n, c)}<h3 class="nl-title">${esc(n.titulo)}</h3></header><div class="nl-foto">${foto(n)}</div><div class="nl-texto">${cuerpoHTML(n)}</div>`,
  hero: (n, c) => `${cierre}<header class="nl-portada">${foto(n, 'nl-fondo')}<div class="nt-vela"></div><div class="nl-sobre">${meta(n, c)}<h3 class="nl-title">${esc(n.titulo)}</h3></div></header><div class="nl-texto">${cuerpoHTML(n)}</div>`,
  revista: (n, c) => `${cierre}<header class="nl-cab">${meta(n, c)}<h3 class="nl-title">${esc(n.titulo)}</h3><p class="nl-lead">${esc(n.resumen)}</p></header><div class="nl-foto">${foto(n)}</div><div class="nl-texto nl-cols">${cuerpoHTML(n)}</div>`,
  editorial: (n, c) => `${cierre}<header class="nl-cab nl-centro">${meta(n, c)}<h3 class="nl-title">${esc(n.titulo)}</h3><p class="nl-lead">${esc(n.resumen)}</p></header><div class="nl-foto">${foto(n)}</div><div class="nl-texto nl-cap">${cuerpoHTML(n)}</div>`,
  documento: (n, c) => `${cierre}<header class="nl-cab nl-centro"><span class="nl-sello"><i class="fa-solid fa-stamp"></i> Comunicado · ${tag(n)}</span><h3 class="nl-title">${esc(n.titulo)}</h3><span class="nl-cuando">${esc(c.cuando(n))} · ${esc(c.ligaNombre(n.liga))}</span>${c.borrador(n)}</header><div class="nl-texto">${cuerpoHTML(n)}</div><p class="nl-firma">— Dirección de la ${esc(c.ligaNombre(n.liga))}</p>`,
  cine: (n, c) => `${cierre}<div class="nl-foto nl-ancha">${foto(n)}</div><header class="nl-cab nl-centro">${meta(n, c)}<h3 class="nl-title">${esc(n.titulo)}</h3></header><div class="nl-texto nl-centro">${cuerpoHTML(n)}</div>`,
};
export const LECTURAS_DIBUJADAS = Object.keys(LEE);
/** Contenido del lector. `acciones` = HTML de los botones del pie (lo arma la página). */
export function lecturaHTML(n, e, c, acciones = '') {
  const id = LECTURAS.some((l) => l.id === e.lectura) ? e.lectura : 'estandar';
  return `<article class="nl nl-${id} nf-${e.forma} nb-${e.brillo} nu-${e.fuente}" style="--na:${rgbDe(e)}">${LEE[id](n, c)}<footer class="nl-pie">${acciones}</footer></article>`;
}
