// GRÁFICOS DE LOS PREMIOS (ronda 270, FX.premiosGraficos). Pedido de Fralex: «usa JS para hacer todos los gráficos».
// Cada premio cuenta su historia con un gráfico chico dibujado en SVG con JavaScript (sin librerías):
//   · barras   → goles por partido (El Cañonero) o goles recibidos (La Muralla); en El Cerrojo, las vallas invictas son puntos.
//   · tira     → resultados partido a partido (En Llamas, Imparable, Rey del Empate): ganó = cuadro lleno, empató = borde,
//                perdió = rayita. La racha que da el premio va encendida; lo demás, apagado.
//   · puestos  → en qué puesto de la tabla estuvo al cierre de cada fecha (El que manda, Dominante, Revelación, Matagigantes).
// Un solo color (el acento de la liga) y gris; el dato nunca depende solo del color (forma + texto al pasar el mouse).
// Se dibuja al ancho real de la tarjeta y se vuelve a dibujar si cambia (ResizeObserver). Las barras crecen una vez al
// aparecer en pantalla (respeta «Animaciones reducidas»). Al pasar el mouse o tocar: fecha, rival y resultado.
import { historialJugador, puestosPorFecha } from '../core/premios.js';
import { escapeHTML } from '../core/dom.js';

const TIPO = {
  canonero: 'barras-gf', muralla: 'barras-gc', cerrojo: 'ceros',
  enllamas: 'tira', imparable: 'tira', empates: 'tira',
  lider: 'puestos', dominante: 'puestos', revelacion: 'puestos', matagigantes: 'puestos',
};
const ALTO = { g: 92, w: 58, f: 58, t: 64, c: 34 };
const RACHA = { enllamas: (r) => r === 'G', imparable: (r) => r !== 'P', empates: null };
const NS = 'http://www.w3.org/2000/svg';

export const tieneGrafico = (id) => id in TIPO;

/** Marca de gráfico para poner dentro de la tarjeta; se dibuja luego con dibujarGraficos(). */
export const huecoGrafico = (pr) => (tieneGrafico(pr.id) && !pr.duelo
  ? `<div class="pr-graf" data-graf="${TIPO[pr.id]}" data-premio="${escapeHTML(pr.id)}" data-nombre="${escapeHTML(pr.nombre)}"></div>` : '');

const tip = (h, extra = '') => `Fecha ${h.fecha} · ${h.gf}-${h.gc} vs ${h.rival}${extra}`;
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

function barras(h, W, H, campo) {
  const n = h.length; const max = Math.max(1, ...h.map((x) => x[campo]));
  const top = 14; const base = H - 2; const alto = base - top;
  const paso = W / n; const ancho = Math.max(3, Math.min(16, paso - 3));
  const iMax = h.findIndex((x) => x[campo] === max);
  let s = `<line x1="0" x2="${W}" y1="${base + .5}" y2="${base + .5}" class="pr-g-eje"/>`;
  h.forEach((x, i) => {
    const v = x[campo]; const bh = v ? Math.max(3, (v / max) * alto) : 0; const cx = paso * i + paso / 2; const x0 = cx - ancho / 2;
    const r = Math.min(3, ancho / 2, bh);
    if (bh) s += `<path class="pr-g-barra${i === iMax ? ' pr-g-top' : ''}" style="--k:${i}" d="M${x0},${base} V${base - bh + r} Q${x0},${base - bh} ${x0 + r},${base - bh} H${x0 + ancho - r} Q${x0 + ancho},${base - bh} ${x0 + ancho},${base - bh + r} V${base} Z"/>`;
    else s += `<rect class="pr-g-cero" x="${x0}" y="${base - 1}" width="${ancho}" height="1.5" rx=".75"/>`;
    s += `<rect class="pr-g-hit" x="${paso * i}" y="0" width="${paso}" height="${H}" data-tip="${escapeHTML(tip(x, ` · ${plural(v, campo === 'gf' ? 'gol' : 'gol recibido', campo === 'gf' ? 'goles' : 'goles recibidos')}`))}"/>`;
  });
  const bx = paso * iMax + paso / 2;
  s += `<text class="pr-g-txt" x="${Math.min(Math.max(bx, 8), W - 8)}" y="10" text-anchor="middle">${max}</text>`;
  return s;
}

function ceros(h, W, H) {
  const n = h.length; const max = Math.max(1, ...h.map((x) => x.gc));
  const base = H - 6; const alto = base - 6; const paso = W / n; const ancho = Math.max(3, Math.min(14, paso - 3));
  let s = `<line x1="0" x2="${W}" y1="${base + .5}" y2="${base + .5}" class="pr-g-eje"/>`;
  h.forEach((x, i) => {
    const cx = paso * i + paso / 2;
    if (x.gc === 0) s += `<circle class="pr-g-punto" style="--k:${i}" cx="${cx}" cy="${base}" r="${Math.min(5, Math.max(3.5, ancho / 2))}"/>`;
    else { const bh = Math.max(3, (x.gc / max) * alto); s += `<rect class="pr-g-barra pr-g-gris" style="--k:${i}" x="${cx - ancho / 2}" y="${base - bh}" width="${ancho}" height="${bh}" rx="${Math.min(2, ancho / 2)}"/>`; }
    s += `<rect class="pr-g-hit" x="${paso * i}" y="0" width="${paso}" height="${H}" data-tip="${escapeHTML(tip(x, x.gc === 0 ? ' · valla invicta' : ` · ${plural(x.gc, 'gol recibido', 'goles recibidos')}`))}"/>`;
  });
  return s;
}

function tira(h, W, H, id) {
  const n = h.length; const ok = RACHA[id];
  // La racha del premio: los últimos partidos que cumplen la condición (para el Rey del Empate se encienden todos los empates).
  let desde = n; if (ok) { while (desde > 0 && ok(h[desde - 1].res)) desde -= 1; }
  const paso = W / n; const lado = Math.max(5, Math.min(16, paso - 3, H - 14)); const y = (H - lado) / 2 + 3;
  let s = '';
  h.forEach((x, i) => {
    const on = ok ? i >= desde : x.res === 'E'; const cx = paso * i + paso / 2; const x0 = cx - lado / 2;
    const cls = `pr-g-res ${on ? 'pr-g-on' : 'pr-g-off'}`;
    if (x.res === 'G') s += `<rect class="${cls} pr-g-lleno" style="--k:${i}" x="${x0}" y="${y}" width="${lado}" height="${lado}" rx="2.5"/>`;
    else if (x.res === 'E') s += `<rect class="${cls} pr-g-borde" style="--k:${i}" x="${x0 + .75}" y="${y + .75}" width="${lado - 1.5}" height="${lado - 1.5}" rx="2"/>`;
    else s += `<rect class="${cls} pr-g-raya" style="--k:${i}" x="${x0}" y="${y + lado / 2 - 1}" width="${lado}" height="2" rx="1"/>`;
    s += `<rect class="pr-g-hit" x="${paso * i}" y="0" width="${paso}" height="${H}" data-tip="${escapeHTML(tip(x, x.res === 'G' ? ' · ganó' : x.res === 'E' ? ' · empató' : ' · perdió'))}"/>`;
  });
  if (ok && desde < n) {
    const x1 = paso * desde + 1; const x2 = paso * n - 1;
    s += `<line class="pr-g-llave" x1="${x1}" x2="${x2}" y1="${y - 5}" y2="${y - 5}"/>`;
  }
  return s;
}

function puestos(p, W, H, premio) {
  const n = p.length; const de = Math.max(2, ...p.map((x) => x.de));
  const top = 8; const bot = H - 8; const izq = 6; const der = W - 26;
  const X = (i) => (n === 1 ? (izq + der) / 2 : izq + (i / (n - 1)) * (der - izq));
  const Y = (pos) => top + ((pos - 1) / (de - 1)) * (bot - top);
  const d = p.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x.pos).toFixed(1)}`).join(' ');
  const u = p.at(-1); const lejos = Y(u.pos) - top > 14;      // la etiqueta «1.º» solo si no choca con la del final
  let s = `<line x1="${izq}" x2="${der}" y1="${top}" y2="${top}" class="pr-g-guia"/>${lejos || u.pos === 1 ? `<text class="pr-g-txt pr-g-mut" x="${W - 2}" y="${top + 4}" text-anchor="end">1.º</text>` : ''}`;
  s += `<path class="pr-g-linea" d="${d}" pathLength="1"/>`;
  s += `<circle class="pr-g-fin" cx="${X(n - 1)}" cy="${Y(u.pos)}" r="4"/>`;
  if (u.pos !== 1) s += `<text class="pr-g-txt" x="${W - 2}" y="${lejos ? Math.min(bot + 4, Y(u.pos) + 4) : top + 4}" text-anchor="end">${u.pos}.º</text>`;
  const paso = n > 1 ? (der - izq) / (n - 1) : der - izq;
  p.forEach((x, i) => { s += `<rect class="pr-g-hit" x="${X(i) - paso / 2}" y="0" width="${paso}" height="${H}" data-tip="${escapeHTML(`Fecha ${x.fecha} · ${x.pos}.º de ${x.de}`)}"/>`; });
  return s;
}

function dibujar(el, ed) {
  const W = Math.round(el.clientWidth); if (W < 40) return;
  const t = el.closest('[data-t]')?.dataset.t ?? 'w'; const H = ALTO[t] ?? 58;
  const { graf, premio, nombre } = el.dataset;
  let cuerpo = ''; let resumen = '';
  if (graf === 'puestos') {
    const p = puestosPorFecha(ed, nombre); if (p.length < 2) { el.hidden = true; return; }
    cuerpo = puestos(p, W, H, premio); resumen = `Puesto en la tabla fecha a fecha: ${p.map((x) => `${x.pos}.º`).join(', ')}`;
  } else {
    const h = historialJugador(ed, nombre); if (h.length < 2) { el.hidden = true; return; }
    if (graf === 'barras-gf') { cuerpo = barras(h, W, H, 'gf'); resumen = `Goles por partido: ${h.map((x) => x.gf).join(', ')}`; }
    else if (graf === 'barras-gc') { cuerpo = barras(h, W, H, 'gc'); resumen = `Goles recibidos por partido: ${h.map((x) => x.gc).join(', ')}`; }
    else if (graf === 'ceros') { cuerpo = ceros(h, W, H); resumen = `Vallas invictas: ${h.filter((x) => !x.gc).length} de ${h.length} partidos`; }
    else { cuerpo = tira(h, W, H, premio); resumen = `Resultados: ${h.map((x) => x.res).join(' ')}`; }
  }
  el.hidden = false;
  el.innerHTML = `<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(resumen)}">${cuerpo}</svg>`;
}

let globo = null;
function asegurarGlobo() {
  if (globo) return globo;
  globo = document.createElement('div'); globo.className = 'pr-globo'; globo.hidden = true; globo.setAttribute('role', 'status');
  document.body.append(globo); return globo;
}
function mostrar(hit, x, y) {
  const g = asegurarGlobo(); g.textContent = hit.dataset.tip; g.hidden = false;
  const r = g.getBoundingClientRect(); const px = Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8);
  g.style.transform = `translate(${px}px, ${Math.max(8, y - r.height - 12)}px)`;
  hit.closest('svg')?.querySelectorAll('.pr-g-hit[data-activo]').forEach((h) => h.removeAttribute('data-activo'));
  hit.setAttribute('data-activo', '');
}
function ocultar(root) { if (globo) globo.hidden = true; root.querySelectorAll('.pr-g-hit[data-activo]').forEach((h) => h.removeAttribute('data-activo')); }

/** Dibuja todos los gráficos dentro de `root` con los datos de la edición `ed`. Se puede llamar cada vez que se repinta. */
export function dibujarGraficos(root, ed) {
  if (!root) return;
  const els = [...root.querySelectorAll('.pr-graf')];
  els.forEach((el) => dibujar(el, ed));
  if (!root._prRO && 'ResizeObserver' in window) {
    let raf = 0; const anchos = new WeakMap();
    root._prRO = new ResizeObserver((ent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ent.forEach((e) => { const el = e.target; const w = Math.round(el.clientWidth); if (anchos.get(el) !== w) { anchos.set(el, w); dibujar(el, root._prEd); } }));
    });
  }
  root._prEd = ed;
  els.forEach((el) => root._prRO?.observe(el));
  // Aparecen una vez, cuando la tarjeta entra en pantalla
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-visto', ''); io.unobserve(e.target); } }), { threshold: .35 }) : null;
  els.forEach((el) => (io ? io.observe(el) : el.setAttribute('data-visto', '')));
  if (!root._prTip) {
    root._prTip = true;
    root.addEventListener('pointermove', (e) => { const h = e.target.closest?.('.pr-g-hit'); if (h) mostrar(h, e.clientX, e.clientY); else ocultar(root); });
    root.addEventListener('pointerleave', () => ocultar(root));
    root.addEventListener('pointerdown', (e) => { const h = e.target.closest?.('.pr-g-hit'); if (h) mostrar(h, e.clientX, e.clientY); });
    addEventListener('scroll', () => ocultar(root), { passive: true });
  }
}
