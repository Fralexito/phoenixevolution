// Vista previa de los sonidos de chat de la tienda (Fase C). SOLO suena cuando la persona pulsa «Escuchar» (nunca solo): el navegador lo exige y es lo correcto.
// Sintetiza la partitura de core/sonidosChat.js con WebAudio (sin archivos). Contrato: docs/CONTRATO-SONIDOS-CHAT.md.
import { esSonidoChat, partituraDe } from '../core/sonidosChat.js';

let ctx = null, sonando = null;

function contexto() {
  const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
  if (!ctx || ctx.state === 'closed') ctx = new Ctx();
  return ctx;
}

/** Ruido blanco corto (1 s) reutilizable para el tipo «ruido». */
function bufferRuido(c) {
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Toca un sonido del catálogo. Devuelve true si empezó a sonar. Falla en silencio (sin audio disponible o clave desconocida). */
export function reproducirSonido(clave) {
  try {
    if (!esSonidoChat(clave)) return false;
    const c = contexto(); if (!c) return false;
    if (c.state === 'suspended') c.resume();
    if (sonando) { try { sonando.forEach((n) => n.stop()); } catch { /* ya terminó */ } }
    const t0 = c.currentTime + 0.02, nodos = [];
    for (const n of partituraDe(clave)) {
      const ini = t0 + n.t / 1000, fin = ini + n.dur / 1000, g = c.createGain();
      g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, n.vol), ini + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, fin);
      let fuente;
      if (n.tipo === 'ruido') {
        fuente = c.createBufferSource(); fuente.buffer = bufferRuido(c); fuente.loop = true;
        const filtro = c.createBiquadFilter(); filtro.type = 'bandpass'; filtro.frequency.value = n.f; filtro.Q.value = 0.8; fuente.connect(filtro); filtro.connect(g);
      } else {
        fuente = c.createOscillator(); fuente.type = n.tipo; fuente.frequency.setValueAtTime(n.f, ini);
        if (n.f2 !== n.f) fuente.frequency.exponentialRampToValueAtTime(n.f2, fin);
        fuente.connect(g);
      }
      g.connect(c.destination); fuente.start(ini); fuente.stop(fin + 0.02); nodos.push(fuente);
    }
    sonando = nodos; return true;
  } catch (e) { console.warn('[sonidosChat] no se pudo reproducir:', e); return false; }
}

/** Un solo escuchador para todos los botones [data-sonido="clave"] de la página (también los que se dibujen después). */
export function initSonidosChat() {
  if (typeof document === 'undefined' || document.documentElement.dataset.sonidosChat) return;
  document.documentElement.dataset.sonidosChat = '1';
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-sonido]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); reproducirSonido(b.dataset.sonido);
  }, true);
}
