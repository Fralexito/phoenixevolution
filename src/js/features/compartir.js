// TARJETAS PARA COMPARTIR (interruptor: FX.compartir en data/experimento.js). Dibuja una imagen 1080×1350 (formato 4:5 de Instagram) en un <canvas>,
// la muestra en una ventana y permite compartirla (menú del celular), descargarla o copiar el enlace. Todo ocurre en el navegador: no se sube nada.
// Los escudos son de la propia web (modo local); si alguno no carga o el navegador lo bloquea, la tarjeta se dibuja igual sin él.
import { openModal, closeModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/dom.js';
import { nombreArchivo } from '../core/compartir.js';

const W = 1080, H = 1350, ID = 'compartir-modal';
const TEMAS = {
  galaxy: { fondoA: '#12002b', fondoB: '#03010f', acento: '#00e5ff', acento2: '#8000ff', borde: '#2a1660' },
  sudario: { fondoA: '#081c4a', fondoB: '#020a1f', acento: '#f5c542', acento2: '#1d4ed8', borde: '#1e3a8a' },
};
const COL = { G: '#34d399', E: '#fbbf24', P: '#fb7185' };

const cargarImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };

function fondo(c, t) {
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, t.fondoA); g.addColorStop(1, t.fondoB); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = c.createRadialGradient(W * 0.85, 120, 20, W * 0.85, 120, 520); r.addColorStop(0, `${t.acento}44`); r.addColorStop(1, 'transparent'); c.fillStyle = r; c.fillRect(0, 0, W, H);
  c.strokeStyle = t.acento; c.globalAlpha = 0.55; c.lineWidth = 4; rr(c, 24, 24, W - 48, H - 48, 36); c.stroke(); c.globalAlpha = 1;
}
function marca(c, t, cabecera) {
  c.fillStyle = t.acento; c.font = '700 34px Rajdhani, sans-serif'; c.textAlign = 'left'; c.fillText('PHOENIX EVOLUTION SERIES', 70, 100);
  c.fillStyle = '#9ca3af'; c.font = '600 28px Rajdhani, sans-serif'; c.fillText(cabecera, 70, 140);
}
function pie(c, t, texto) {
  c.textAlign = 'center'; c.fillStyle = '#e5e7eb'; c.font = '600 34px Rajdhani, sans-serif'; c.fillText(texto, W / 2, H - 120);
  c.fillStyle = t.acento; c.font = '700 28px Rajdhani, sans-serif'; c.fillText('fralexito.github.io/phoenixevolution', W / 2, H - 70);
}
const escudo = (c, img, x, y, s) => { if (img) { try { c.drawImage(img, x, y, s, s); } catch { /* sin escudo */ } } };

async function dibujarFecha(c, d, t) {
  fondo(c, t); marca(c, t, d.cabecera);
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 130px Rajdhani, sans-serif'; c.fillText(d.titulo, 70, 290);
  c.fillStyle = '#cbd5e1'; c.font = '600 34px Rajdhani, sans-serif'; c.fillText(d.sub ?? '', 74, 340);
  const imgs = await Promise.all(d.filas.flatMap((f) => [cargarImg(f.cl), cargarImg(f.cv)]));
  const n = Math.max(1, d.filas.length); const top = 390, ocupa = 780, alto = Math.min(112, (ocupa - (n - 1) * 14) / n);
  d.filas.forEach((f, i) => {
    const y = top + i * (alto + 14);
    c.fillStyle = 'rgba(255,255,255,.06)'; rr(c, 60, y, W - 120, alto, 22); c.fill(); c.strokeStyle = t.borde; c.lineWidth = 2; c.stroke();
    const s = Math.min(64, alto - 20), cy = y + (alto - s) / 2;
    escudo(c, imgs[i * 2], 84, cy, s); escudo(c, imgs[i * 2 + 1], W - 84 - s, cy, s);
    c.fillStyle = '#fff'; c.font = '700 38px Rajdhani, sans-serif'; c.textAlign = 'left'; c.fillText(f.l, 84 + s + 18, y + alto / 2 + 13);
    c.textAlign = 'right'; c.fillText(f.v, W - 84 - s - 18, y + alto / 2 + 13);
    c.textAlign = 'center'; c.fillStyle = t.acento; c.font = '800 54px Rajdhani, sans-serif'; c.fillText(f.jugado ? `${f.gl} - ${f.gv}` : 'VS', W / 2, y + alto / 2 + 18);
  });
  pie(c, t, d.pie);
}

async function dibujarJugador(c, d, t) {
  fondo(c, t); marca(c, t, d.cabecera);
  const img = await cargarImg(d.escudo);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(W / 2, 420, 170, 0, Math.PI * 2); c.fill(); c.strokeStyle = t.acento; c.lineWidth = 5; c.stroke();
  if (img) escudo(c, img, W / 2 - 110, 310, 220);
  c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '800 120px Rajdhani, sans-serif'; c.fillText(d.titulo, W / 2, 680);
  c.fillStyle = '#cbd5e1'; c.font = '600 34px Rajdhani, sans-serif'; c.fillText(d.sub ?? '', W / 2, 730);
  c.fillStyle = t.acento; c.font = '800 190px Rajdhani, sans-serif'; c.fillText(`${d.puesto}º`, W / 2, 920); c.fillStyle = '#9ca3af'; c.font = '600 34px Rajdhani, sans-serif'; c.fillText(`de ${d.total} jugadores · ${d.pts} puntos`, W / 2, 970);
  const cajas = [['G', d.g, COL.G], ['E', d.e, COL.E], ['P', d.p, COL.P], ['GOLES', `${d.gf}:${d.gc}`, '#fff']]; const w = 220, gap = 28, x0 = (W - (cajas.length * w + (cajas.length - 1) * gap)) / 2;
  cajas.forEach(([l, v, col], i) => { const x = x0 + i * (w + gap); c.fillStyle = 'rgba(255,255,255,.07)'; rr(c, x, 1010, w, 120, 20); c.fill(); c.fillStyle = col; c.font = '800 56px Rajdhani, sans-serif'; c.fillText(String(v), x + w / 2, 1076); c.fillStyle = '#9ca3af'; c.font = '600 24px Rajdhani, sans-serif'; c.fillText(l, x + w / 2, 1112); });
  const fx = (W - (d.forma.length * 74 - 14)) / 2; d.forma.forEach((r, i) => { c.fillStyle = COL[r]; rr(c, fx + i * 74, 1160, 60, 60, 14); c.fill(); c.fillStyle = '#021'; c.font = '800 34px Rajdhani, sans-serif'; c.fillText(r, fx + i * 74 + 30, 1202); });
  pie(c, t, d.forma.length ? 'Mis últimos partidos' : '');
}

/** Abre la ventana con la tarjeta ya dibujada. `d` sale de core/compartir.js; `tema` = 'galaxy' | 'sudario'. */
export async function abrirTarjeta(d, tema = 'galaxy') {
  if (!d) return;
  const t = TEMAS[tema] ?? TEMAS.galaxy;
  const m = openModal(`<div class="p-4 sm:p-5 space-y-3"><div class="flex items-center justify-between"><h3 class="font-display font-bold text-lg text-white uppercase">Compartir</h3><button type="button" data-close class="btn btn-ghost !px-3" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="grid place-items-center"><canvas id="cmp-canvas" width="${W}" height="${H}" class="w-full max-w-[420px] rounded-xl border border-galaxy-border" style="aspect-ratio:${W}/${H}"></canvas></div>
    <p id="cmp-estado" class="text-xs text-gray-400 text-center" role="status">Preparando la tarjeta…</p>
    <div class="flex flex-wrap gap-2 justify-center"><button type="button" id="cmp-compartir" class="btn btn-primary" disabled><i class="fa-solid fa-share-nodes"></i> Compartir</button><button type="button" id="cmp-bajar" class="btn btn-ghost" disabled><i class="fa-solid fa-download"></i> Descargar</button><button type="button" id="cmp-texto" class="btn btn-ghost"><i class="fa-solid fa-copy"></i> Copiar texto</button></div></div>`, { id: ID });
  const q = (x) => m.querySelector(x); const c = q('#cmp-canvas').getContext('2d');
  try {
    try { await Promise.all([document.fonts.load('800 60px Rajdhani'), document.fonts.load('700 30px Rajdhani'), document.fonts.load('600 30px Rajdhani')]); } catch { /* fuente del sistema */ }
    await (d.kind === 'fecha' ? dibujarFecha(c, d, t) : dibujarJugador(c, d, t));
    const blob = await new Promise((ok) => { try { q('#cmp-canvas').toBlob(ok, 'image/png'); } catch { ok(null); } });
    if (!blob) throw new Error('El navegador no permitió exportar la imagen.');
    const archivo = new File([blob], nombreArchivo(`${d.cabecera}-${d.titulo}`), { type: 'image/png' });
    q('#cmp-estado').textContent = 'Lista. Compártela o descárgala.';
    q('#cmp-bajar').disabled = false; q('#cmp-bajar').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = archivo.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
    const puedeCompartir = !!navigator.canShare?.({ files: [archivo] });
    q('#cmp-compartir').disabled = !puedeCompartir; if (!puedeCompartir) q('#cmp-compartir').title = 'Tu navegador no comparte imágenes directo: usa Descargar.';
    q('#cmp-compartir').onclick = async () => { try { await navigator.share({ files: [archivo], text: d.texto }); } catch (e) { if (e?.name !== 'AbortError') toast('No se pudo abrir el menú de compartir.', 'error'); } };
  } catch (e) {
    console.error('[compartir] no se pudo preparar la tarjeta:', e); q('#cmp-estado').innerHTML = `<span class="text-rose-400">${escapeHTML(e.message || 'No se pudo preparar la imagen.')}</span> Puedes copiar el texto.`;
  }
  q('#cmp-texto').onclick = async () => { try { await navigator.clipboard.writeText(d.texto); toast('Texto copiado.', 'ok'); } catch { toast('No se pudo copiar.', 'error'); } };
}
