// VISTAS PREVIAS de /ajustes/: cada sección muestra, junto a sus controles, un ejemplo REAL de lo que cambia.
// Truco de diseño: los ajustes se aplican a toda la página (atributos data-aj-* en <html>), así que los ejemplos usan las MISMAS clases CSS
// que la web de verdad (.pc-sheen, .tmp-fila, .live-msg…) y reaccionan solos; el JS solo repinta lo que depende de datos (hora, avisos, almacenamiento).
import { playerCardHTML } from './playerCard.js';
import { leerAjustes } from './ajustes.js';
import { opcionesRegion, factorTicker, exportarAjustes } from '../core/ajustes.js';
import { escapeHTML } from '../core/dom.js';

const $ = (id) => document.getElementById(id);
const DEMO = { nombre: 'Jugador Demo', apodo: 'Fénix', club: 'CLUB DEMO', posicion: 'DC', ovr: 88, atq: 90, fin: 92, pot: 85, efe: 80, reg: 86, cor: 70, cre: 75, def: 40, pre: 88, pos: 82, ant: 79, pas: 77, rit: 84, men: 81 };

const APARIENCIA = `<div class="space-y-3 rounded-lg border border-galaxy-border p-3 bg-galaxy-card">
  <div class="font-display font-extrabold text-2xl text-white uppercase tracking-wider text-shadow-glow">Galaxy League</div>
  <div class="flex flex-wrap gap-2 items-center"><span class="btn btn-primary !min-h-9 !text-xs pointer-events-none">Botón principal</span><span class="chip pointer-events-none">Chip</span><span class="text-galaxy-400 text-sm">Texto de acento</span></div>
  <div class="h-1.5 rounded-full bg-gradient-to-r from-galaxy-400 via-galaxy-500 to-galaxy-600"></div></div>`;
const LIGA = `<table class="liga-tabla w-full text-xs"><thead><tr><th>#</th><th class="!text-left">Jugador</th><th>Pts</th></tr></thead><tbody>
  <tr class="tmp-fila tmp-copa"><td>1</td><td class="!text-left">Jugador A</td><td>21</td></tr><tr class="tmp-fila tmp-sube"><td>2</td><td class="!text-left">Jugador B</td><td>18</td></tr>
  <tr><td>3</td><td class="!text-left">Jugador C</td><td>12</td></tr><tr class="tmp-fila tmp-baja"><td>4</td><td class="!text-left">Jugador D</td><td>6</td></tr></tbody></table>
  <p class="aj-nota"><span class="tmp-dot" style="background:#00e5ff"></span>copa <span class="tmp-dot" style="background:#34d399"></span>ascenso <span class="tmp-dot" style="background:#fb7185"></span>descenso</p>`;
const ACCESIBILIDAD = `<div class="rounded-lg border border-galaxy-border p-3 bg-galaxy-card space-y-2"><main class="!block !w-auto">
  <p class="text-sm text-gray-400">Así se lee un texto secundario. <a href="#accesibilidad" class="text-galaxy-400">Y este es un enlace</a> dentro de una frase.</p></main>
  <div class="flex items-center gap-3"><button type="button" class="btn btn-ghost !min-h-9 !text-xs">Pulsa Tab hasta aquí</button><i class="fa-solid fa-satellite-dish text-galaxy-400 text-xl animate-float" title="Animación"></i></div></div>`;

const reloj = () => {
  const a = leerAjustes(); const o = opcionesRegion(a); const ahora = new Date(); const manana = new Date(ahora.getTime() + 86400000 + 3600000);
  const f = (d, x) => escapeHTML(d.toLocaleString('es', x));
  return `<div class="rounded-lg border border-galaxy-border p-3 bg-galaxy-card space-y-1.5">
    <div class="text-[12px] text-gray-400">Hora en los avisos «En vivo»</div><div class="font-display font-extrabold text-2xl text-white">${f(ahora, { hour: '2-digit', minute: '2-digit', second: '2-digit', ...o })}</div>
    <div class="text-[12px] text-gray-400 pt-1">Un duelo programado</div><div class="text-sm text-galaxy-400"><i class="fa-regular fa-clock mr-1"></i>${f(manana, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...o })}</div>
    <div class="aj-nota">Zona: ${escapeHTML(o.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)}</div></div>`;
};
const privacidad = () => {
  const n = (() => { try { return JSON.parse(localStorage.getItem('pes-live-hist') ?? '[]').length; } catch { return 0; } })();
  const z = (() => { try { return ['pes-zoom-pc', 'pes-zoom-movil'].filter((k) => localStorage.getItem(k) !== null).length; } catch { return 0; } })();
  return `<div class="rounded-lg border border-galaxy-border p-3 bg-galaxy-card text-sm space-y-1.5">
    <div class="text-[12px] text-gray-400">Guardado ahora en este navegador</div>
    <div><i class="fa-solid fa-clock-rotate-left text-galaxy-400 w-5"></i>${n} aviso(s) en el historial de «En vivo»</div>
    <div><i class="fa-solid fa-magnifying-glass-plus text-galaxy-400 w-5"></i>${z} zoom(s) de Jugadores recordado(s)</div></div>`;
};
const datos = () => `<pre class="text-[12px] leading-snug text-gray-300 rounded-lg border border-galaxy-border p-3 bg-galaxy-card overflow-auto max-h-48">${escapeHTML(exportarAjustes(leerAjustes()))}</pre><p class="aj-nota">Esto es exactamente lo que lleva el archivo exportado.</p>`;

let timerAviso = 0;
function notificaciones() {
  const a = leerAjustes(); const dur = Number(a.vivoDuracion);
  const msgs = [a.vivoRetos && '<div class="live-msg live-ok live-in"><i class="fa-solid fa-bolt live-ico"></i><span class="live-txt"><b>Jugador A</b> aceptó el reto de <b>Jugador B</b></span></div>',
    a.vivoRadar && '<div class="live-msg live-cyan live-in"><i class="fa-solid fa-tower-broadcast live-ico"></i><span class="live-txt"><b>Jugador C</b> activó el radar</span></div>'].filter(Boolean);
  const caja = $('vp-notificaciones'); if (!caja) return;
  const durTk = (a.tickerVel ? 14 / factorTicker(a.tickerVel) : 14).toFixed(1);
  caja.innerHTML = `<div class="space-y-1.5" id="aj-avisos">${a.vivo ? (msgs.join('') || '<div class="aj-nota">Todos los tipos de aviso están apagados.</div>') : '<div class="aj-nota">El panel «En vivo» está oculto: no verás avisos.</div>'}</div>
    <div class="aj-nota" id="aj-avisos-nota"></div>
    <div class="aj-tk" style="--aj-dur:${durTk}s"><span>◆ Última hora: así pasan las noticias a esta velocidad ◆ Otra noticia</span></div>`;
  clearTimeout(timerAviso);
  if (a.vivo && msgs.length) {
    const nota = $('aj-avisos-nota'); nota.textContent = `Cada aviso se desvanece a los ${dur} s (demo: se repite).`;
    timerAviso = setTimeout(() => { const c = $('aj-avisos'); if (c) c.style.opacity = '0'; setTimeout(notificaciones, 1800); }, Math.min(dur, 12) * 1000);   // la demo no espera más de 12 s
  }
}
function cartas() {
  const caja = $('vp-cartas'); if (!caja) return;
  caja.innerHTML = `<div class="relative w-[210px] mx-auto">${playerCardHTML(DEMO, 0, { sizeClass: 'w-full' })}<span class="div-badge div-1"><b>L1</b><span>Galaxy League</span></span></div><p class="aj-nota text-center">Pasa el mouse por la carta para ver el brillo.</p>`;
}

/** Pinta TODAS las vistas. Se llama al cargar y cada vez que cambia un ajuste. */
export function pintarVistas() {
  const set = (id, html) => { const e = $(id); if (e) e.innerHTML = html; };
  set('vp-apariencia', APARIENCIA); set('vp-liga', LIGA); set('vp-accesibilidad', ACCESIBILIDAD);
  set('vp-idioma', reloj()); set('vp-privacidad', privacidad()); set('vp-datos', datos());
  cartas(); notificaciones();
}
export const iniciarVistas = () => { pintarVistas(); window.addEventListener('ajustes:cambio', pintarVistas); setInterval(() => { if (!document.hidden && $('vp-idioma')) $('vp-idioma').innerHTML = reloj(); }, 1000); };
