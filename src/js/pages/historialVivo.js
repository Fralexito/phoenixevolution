// Página «Historial de hoy»: pinta lo que el pulso en vivo guardó en el navegador SOLO del día actual.
// Se refresca sola: cuando otra pestaña guarda un aviso (evento `storage`) y cada 30 s (para vaciarse al cambiar de día).
import { formatEvento, horaExacta, diaClave } from '../core/live.js';
import { leerHistorialHoy, KEY_HIST } from '../features/liveFeed.js';
import { leerAjustes, regionAhora } from '../features/ajustes.js';

const lista = document.getElementById('hv-lista');
const cuenta = document.getElementById('hv-count');
const fecha = document.getElementById('hv-fecha');
const aviso = document.getElementById('hv-off');

function pintar() {
  if (!lista) { console.warn('[historial] falta #hv-lista'); return; }
  const reg = regionAhora();
  const hist = leerHistorialHoy();
  lista.innerHTML = hist.length
    ? hist.map((ev) => { const f = formatEvento(ev); return `<li class="live-row live-${f.tone}"><i class="fa-solid ${f.icon} live-ico"></i><span class="live-txt">${f.html}</span><time class="live-time" datetime="${new Date(ev.ts).toISOString()}">${horaExacta(ev.ts, reg)}</time>${ev.demo ? '<em class="live-demo">demo</em>' : ''}</li>`; }).join('')
    : '<li class="live-empty">Aún no hay actividad hoy. Los avisos aparecerán aquí en cuanto ocurran.</li>';
  cuenta.textContent = String(hist.length);
  try { fecha.textContent = `· ${new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', ...(reg.timeZone ? { timeZone: reg.timeZone } : {}) }).format(new Date())}`; } catch { fecha.textContent = `· ${diaClave(Date.now())}`; }
  aviso.hidden = leerAjustes().vivoHistorial;
}

window.addEventListener('storage', (e) => { if (e.key === KEY_HIST || e.key === null) pintar(); });
setInterval(pintar, 30_000);
pintar();
