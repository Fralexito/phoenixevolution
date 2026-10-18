// Modo ligero AUTOMÁTICO (ronda 346, pedido de Fralex: «solo si el celular tiene problemas de rendimiento»).
// Cómo decide: (1) señales fuertes (ahorro de datos, ≤ 2 GB de memoria, red 2G) → ligero ya; (2) si no, MIDE los cuadros por segundo
// mientras la persona desliza la página (en reposo todo va a 60 y no dice nada). Si 1 de cada 4 cuadros tarda más de 34 ms → ligero.
// Qué hace «ligero»: cuenta como «Animaciones: reducidas» (apaga 3D, aparición al bajar, efectos) y el CSS quita el fondo borroso de los
// paneles (styles/modoLigero.css). Se guarda 14 días. «Ajustes → Animaciones → Siempre activas» lo anula. No se activa solo si ya elegiste «Reducidas».
import { CLAVE_LIGERO, senalDebil, vaLento, leerDecision, guardarDecision, MIN_CUADROS } from '../core/sistema/rendimiento.js';
import { leerAjustes, aplicarAjustes, ligeroGuardado } from './ajustes.js';
import { toast } from '../core/sistema/toast.js';

const almacen = () => { try { return window.localStorage; } catch { return null; } };

function activar(motivo) {
  const s = almacen(); if (!s) return;
  try { s.setItem(CLAVE_LIGERO, guardarDecision(true)); } catch { return; }
  aplicarAjustes(leerAjustes());
  console.info('[rendimiento] modo ligero automático:', motivo);
  toast('Modo ligero activado: tu dispositivo va justo. Para volver a todos los efectos: Ajustes → Animaciones → «Siempre activas».', 'info', { key: 'modo-ligero', ms: 9000 });
}

export function initModoLigero() {
  try {
    const a = leerAjustes();
    if (a.movimiento !== 'sistema') return;                       // «Siempre activas» o «Reducidas»: la persona ya decidió
    const s = almacen(); const previa = leerDecision(s?.getItem(CLAVE_LIGERO));
    if (previa !== null) return;                                  // ya hay decisión vigente (si es true, ajustes.js ya la aplicó)
    const c = navigator.connection ?? {};
    if (senalDebil({ saveData: c.saveData, memoria: navigator.deviceMemory, tipoRed: c.effectiveType })) { activar('señal débil del dispositivo'); return; }
    // Medición al deslizar: solo cuentan los cuadros de mientras se mueve la página.
    let cuadros = []; let ultimo = 0; let moviendo = 0; let raf = 0; let fin = false;
    const mover = () => { moviendo = performance.now(); if (!raf) raf = requestAnimationFrame(tic); };
    function tic(t) {
      raf = 0; if (fin) return;
      if (ultimo && t - moviendo < 200) cuadros.push(t - ultimo);
      ultimo = t;
      if (t - moviendo < 200) raf = requestAnimationFrame(tic); else ultimo = 0;
      if (cuadros.length >= MIN_CUADROS) { const r = vaLento(cuadros); fin = true; quitar(); if (r) activar('muchos tirones al deslizar'); else { try { s?.setItem(CLAVE_LIGERO, guardarDecision(false)); } catch { /* sin almacenamiento */ } } }
    }
    const quitar = () => { window.removeEventListener('scroll', mover); window.removeEventListener('touchmove', mover); };
    window.addEventListener('scroll', mover, { passive: true }); window.addEventListener('touchmove', mover, { passive: true });
  } catch (e) { console.warn('[rendimiento] no se pudo medir:', e); }
}
export { ligeroGuardado };
