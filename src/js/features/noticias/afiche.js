// DIBUJO DEL AFICHE DEL DÍA: en la página (HTML) y para descargar (PNG hecho con canvas).
// Qué va dentro lo decide core/portada/afiche.js; aquí solo se pinta. Usa las fuentes del sitio (Rajdhani + Inter).
import { escapeHTML as esc } from '../../core/sistema/dom.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const fechaCorta = (d = new Date()) => `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;

/** El afiche tal como se ve en la página. `tambien` = una o dos noticias más, en una línea cada una. */
export function aficheHTML(d, { hoy = new Date(), tambien = [], slug = '' } = {}) {
  const grito = d.lineas.map((l, i) => (i === d.lineas.length - 1 && d.resaltado ? `<mark>${esc(l)}</mark>` : esc(l))).join('<br>');
  const marc = d.marcador ? `<span class="af-marc">${esc(d.marcador.texto)}</span>` : '';
  const tam = tambien.length ? `<div class="af-tambien">${tambien.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : '';
  const largo = Math.max(...d.lineas.map((l) => l.length), 1);   // el titular se agranda para llenar el ancho: ningún hueco
  return `<article class="af" style="--af:${esc(d.acento)};--maxl:${largo}" data-slug="${esc(slug)}">
    <div class="af-cab"><span class="af-marca">Phoenix Diario</span><span class="af-extra">Extra · ${esc(fechaCorta(hoy))}</span></div>
    <div class="af-txt">
      <p class="af-kicker">${esc(d.kicker)}</p>
      <h2 class="af-grito">${grito}</h2>
      ${d.bajada ? `<p class="af-bajada">${esc(d.bajada)}</p>` : ''}
    </div>
    <div class="af-pieza"><span class="af-ini">${esc(d.inicial)}</span>${marc}</div>
    ${tam}
    <div class="af-cinta"><span>${esc(d.firma)}</span><span>phoenixevolution.com</span></div>
  </article>`;
}

// ---------------- PNG para compartir ----------------
const redondo = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function escribir(ctx, texto, x, y, max, alto) {
  const palabras = String(texto).split(/\s+/); let linea = ''; let yy = y;
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(prueba).width > max && linea) { ctx.fillText(linea, x, yy); yy += alto; linea = p; } else linea = prueba;
  }
  if (linea) ctx.fillText(linea, x, yy);
  return yy + alto;
}

/** Dibuja el afiche en un canvas. `alto/ancho` mandan: 3:4 para el grupo, 9:16 para el estado. */
export function dibujarAfiche(canvas, d, { hoy = new Date(), tambien = [], ancho = 820, alto = 1066 } = {}) {
  const c = canvas.getContext('2d'); const m = ancho / 410;   // todo está pensado sobre 410 px de ancho
  canvas.width = ancho; canvas.height = alto;
  const fondo = c.createLinearGradient(0, 0, ancho * .4, alto);
  fondo.addColorStop(0, '#16062e'); fondo.addColorStop(.62, '#07030f'); fondo.addColorStop(1, '#07030f');
  c.fillStyle = fondo; c.fillRect(0, 0, ancho, alto);

  const barra = 38 * m;
  c.fillStyle = '#000'; c.fillRect(0, 0, ancho, barra);
  c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.font = `700 ${19 * m}px Rajdhani, sans-serif`;
  c.fillText('PHOENIX DIARIO', 14 * m, barra / 2);
  const etiqueta = `EXTRA · ${fechaCorta(hoy).toUpperCase()}`;
  c.font = `700 ${10 * m}px Rajdhani, sans-serif`;
  const anchoEt = c.measureText(etiqueta).width + 14 * m;
  c.fillStyle = d.acento; c.fillRect(ancho - anchoEt - 14 * m, barra / 2 - 9 * m, anchoEt, 18 * m);
  c.fillStyle = '#000'; c.fillText(etiqueta, ancho - anchoEt - 7 * m, barra / 2);

  let y = 76 * m; const x = 20 * m; const util = ancho - 40 * m;
  c.textBaseline = 'alphabetic';
  c.fillStyle = d.acento; c.font = `700 ${12 * m}px Rajdhani, sans-serif`;
  c.fillText(String(d.kicker).toUpperCase(), x, y);

  const tam = Math.min(52, 150 / Math.max(...d.lineas.map((l) => l.length), 1) * 4) * m;
  y += 16 * m + tam * .78;   // deja sitio al alto del titular: si no, pisa el antetítulo
  c.font = `700 ${tam}px Rajdhani, sans-serif`;
  d.lineas.forEach((l, i) => {
    const ultima = i === d.lineas.length - 1 && d.resaltado;
    if (ultima) { const w = c.measureText(l).width; c.fillStyle = d.acento; c.fillRect(x - 4 * m, y - tam * .78, w + 10 * m, tam * .96); c.fillStyle = '#07030f'; }
    else c.fillStyle = '#fff';
    c.fillText(l, x, y); y += tam * .92;
  });

  if (d.bajada) { y += 14 * m; c.fillStyle = '#cbd5e1'; c.font = `${14 * m}px Inter, sans-serif`; y = escribir(c, d.bajada, x, y, util, 19 * m); }

  const base = alto - 112 * m;
  c.fillStyle = '#0a051c'; c.beginPath(); c.arc(x + 43 * m, base - 43 * m, 43 * m, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2 * m; c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `700 ${40 * m}px Rajdhani, sans-serif`;
  c.fillText(d.inicial, x + 43 * m, base - 29 * m); c.textAlign = 'left';
  if (d.marcador) {
    c.font = `700 ${36 * m}px Rajdhani, sans-serif`;
    const w = c.measureText(d.marcador.texto).width + 32 * m;
    c.fillStyle = '#000'; c.fillRect(x + 102 * m, base - 72 * m, w, 58 * m);
    c.strokeStyle = d.acento; c.lineWidth = 2 * m; c.strokeRect(x + 102 * m, base - 72 * m, w, 58 * m);
    c.fillStyle = '#fff'; c.fillText(d.marcador.texto, x + 118 * m, base - 30 * m);
  }

  if (tambien.length) {
    let ty = alto - 86 * m;
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1 * m;
    c.beginPath(); c.moveTo(x, ty - 16 * m); c.lineTo(ancho - x, ty - 16 * m); c.stroke();
    c.font = `700 ${13 * m}px Rajdhani, sans-serif`; c.fillStyle = '#fff';
    tambien.slice(0, 2).forEach((t) => { c.fillText(String(t).toUpperCase().slice(0, 46), x, ty); ty += 18 * m; });
  }

  c.fillStyle = '#000'; c.fillRect(0, alto - 30 * m, ancho, 30 * m);
  c.textBaseline = 'middle'; c.font = `700 ${10 * m}px Rajdhani, sans-serif`;
  c.fillStyle = d.acento; c.fillText(String(d.firma).toUpperCase(), 14 * m, alto - 15 * m);
  c.fillStyle = '#94a3b8'; c.textAlign = 'right'; c.fillText('PHOENIXEVOLUTION.COM', ancho - 14 * m, alto - 15 * m); c.textAlign = 'left';
  return canvas;
}

const esperarFuentes = () => (document.fonts?.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve());
/** Devuelve el afiche como archivo PNG (para descargar o compartir). */
export async function aficheArchivo(d, opciones = {}) {
  await esperarFuentes();
  const canvas = dibujarAfiche(document.createElement('canvas'), d, opciones);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('no se pudo crear la imagen');
  return new File([blob], `portada-${d.slug || 'phoenix'}.png`, { type: 'image/png' });
}
