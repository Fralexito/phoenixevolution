// Página «Historial de hoy»: pinta lo que el pulso en vivo guardó en el navegador SOLO del día actual, con búsqueda y filtros.
// Esquema: este archivo (DOM) → core/liveFiltro (búsqueda y filtros, puro) + core/live (texto de cada aviso, puro).
// Se refresca sola: cuando otra pestaña guarda un aviso (evento `storage`) y cada 30 s (para vaciarse al cambiar de día).
import { formatEvento, horaExacta, diaClave } from '../core/live.js';
import { filtrarEventos, facetas, hayFiltros, CRITERIOS_VACIOS, TIPOS } from '../core/liveFiltro.js';
import { leerHistorialHoy, KEY_HIST } from '../features/liveFeed.js';
import { leerAjustes, regionAhora } from '../features/ajustes.js';
import { href } from '../core/config.js';
import { escapeHTML } from '../core/dom.js';

const $ = (id) => document.getElementById(id);
const lista = $('hv-lista');
const PERFIL = href('perfil/');
const CTL = { tipo: 'hv-tipo', jugador: 'hv-jugador', juego: 'hv-juego', formato: 'hv-formato', desde: 'hv-desde', hasta: 'hv-hasta', origen: 'hv-origen', orden: 'hv-orden' };
const C = { ...CRITERIOS_VACIOS };   // criterios actuales (la fuente de verdad; los controles solo los reflejan)

/** Rellena un <select> con las opciones disponibles hoy, conservando la elegida (si ya no existe, vuelve a «Todos»). */
function llenarSelect(id, opciones, actual) {
  const sel = $(id); if (!sel) return;
  sel.innerHTML = `<option value="">Todos</option>${opciones.map((o) => `<option value="${escapeHTML(o.valor)}">${escapeHTML(o.valor)} (${o.n})</option>`).join('')}`;
  sel.value = opciones.some((o) => o.valor === actual) ? actual : '';
}

function pintar() {
  if (!lista) { console.warn('[historial] falta #hv-lista'); return; }
  const reg = regionAhora();
  const todos = leerHistorialHoy();
  const fa = facetas(todos);
  C.jugador = fa.jugadores.some((x) => x.valor === C.jugador) ? C.jugador : '';
  C.juego = fa.juegos.some((x) => x.valor === C.juego) ? C.juego : '';
  C.formato = fa.formatos.some((x) => x.valor === C.formato) ? C.formato : '';
  llenarSelect('hv-jugador', fa.jugadores, C.jugador); llenarSelect('hv-juego', fa.juegos, C.juego); llenarSelect('hv-formato', fa.formatos, C.formato);

  let hist = [];
  try { hist = filtrarEventos(todos, C, { timeZone: reg.timeZone }); } catch (e) { console.error('[historial] filtro:', e); hist = todos; }
  lista.innerHTML = hist.length
    ? hist.map((ev) => { const f = formatEvento(ev, { perfil: PERFIL }); return `<li class="live-row live-${f.tone}"><i class="fa-solid ${f.icon} live-ico"></i><span class="live-txt">${f.html}</span><time class="live-time" datetime="${new Date(ev.ts).toISOString()}">${horaExacta(ev.ts, reg)}</time>${ev.demo ? '<em class="live-demo">demo</em>' : ''}</li>`; }).join('')
    : `<li class="live-empty">${todos.length ? 'Ningún aviso coincide con tu búsqueda. Prueba quitar algún filtro.' : 'Aún no hay actividad hoy. Los avisos aparecerán aquí en cuanto ocurran.'}</li>`;
  $('hv-count').textContent = String(hist.length); $('hv-total').textContent = String(todos.length);
  const activos = [C.tipo !== 'todos', C.jugador, C.juego, C.formato, C.desde, C.hasta, C.origen !== 'todos'].filter(Boolean).length;
  $('hv-nfiltros').textContent = activos ? `· ${activos} activo${activos === 1 ? '' : 's'}` : '';
  $('hv-limpiar').hidden = !hayFiltros(C);
  try { $('hv-fecha').textContent = `· ${new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', ...(reg.timeZone ? { timeZone: reg.timeZone } : {}) }).format(new Date())}`; } catch { $('hv-fecha').textContent = `· ${diaClave(Date.now())}`; }
  $('hv-off').hidden = leerAjustes().vivoHistorial;
}

/* Eventos: cada control actualiza C y repinta. */
$('hv-q')?.addEventListener('input', (e) => { C.texto = e.target.value; pintar(); });
for (const [clave, id] of Object.entries(CTL)) $(id)?.addEventListener('input', (e) => { C[clave] = e.target.value; pintar(); });
$('hv-limpiar')?.addEventListener('click', () => {
  Object.assign(C, CRITERIOS_VACIOS); $('hv-q').value = '';
  for (const [clave, id] of Object.entries(CTL)) { const el = $(id); if (el) el.value = C[clave]; }
  pintar();
});
if (window.matchMedia('(min-width: 640px)').matches) $('hv-filtros')?.setAttribute('open', '');   // en PC los filtros se ven; en móvil, plegados
window.addEventListener('storage', (e) => { if (e.key === KEY_HIST || e.key === null) pintar(); });
setInterval(pintar, 30_000);
pintar();
