// Réplica ampliada de una carta de jugador: capa fija que viaja de la carta original al centro de la pantalla, con el aura de su posición y, con mouse,
// inclinación 3D. La comparten «Jugadores» (core: pages/database.js) y el podio de «Destacados» (pages/central.js).
// Si la carta original es muy angosta, la réplica se construye más ancha (core/replica.js) para que se vean TODAS las estadísticas.
import { anchoBase, escalaInicial, rectBase, destino, regreso } from '../core/replica.js';

/**
 * @param {{esMovil:()=>boolean, sinMovimiento:()=>boolean, inclinacion?:()=>boolean, alClicCapa?:()=>void}} o
 * @returns {{abrir:(origen:Element, op?:{aura?:string, etiqueta?:string})=>boolean, cerrar:(inmediato?:boolean)=>void, reposicionar:()=>void, activa:()=>boolean, contiene:(el:Element)=>boolean}}
 */
export function crearReplica({ esMovil, sinMovimiento, inclinacion = () => false, alClicCapa = () => {} }) {
  let rp = null;                                     // { capa, fondo, origen, base, k0, s, dx, dy }
  const barra = () => document.querySelector('body > .sticky')?.getBoundingClientRect().bottom ?? 0;
  const geometria = (base) => destino({ base, vw: window.innerWidth, vh: window.innerHeight, barra: barra(), movil: esMovil() });
  const transformaDe = (d) => `translate(${d.dx}px, ${d.dy}px) scale(${d.s})`;

  function cerrar(inmediato = false) {
    const actual = rp; if (!actual) return; rp = null;
    actual.fondo.remove();                           // la pantalla vuelve a ser tocable al instante (la carta termina de volver sola)
    const quitar = () => actual.capa.remove();
    if (inmediato || sinMovimiento() || !actual.capa.animate || !actual.origen.isConnected) { quitar(); return; }
    try {
      const v = regreso(actual.base, actual.origen.getBoundingClientRect(), actual.k0);
      actual.capa.classList.add('pcw-replica-sale');
      const an = actual.capa.animate([{ transform: transformaDe(actual) }, { transform: `translate(${v.dx}px, ${v.dy}px) scale(${v.k})`, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' });
      an.onfinish = quitar; an.oncancel = quitar;
    } catch (err) { console.warn('[replica] no se pudo animar el cierre:', err); quitar(); }
  }

  function abrir(origen, { aura = '#00e5ff', etiqueta = 'Jugador destacado' } = {}) {
    try {
      cerrar(true);
      const r = origen.getBoundingClientRect(); if (!r.width || !r.height) return false;
      const bw = anchoBase(r.width, esMovil()), amplia = bw > r.width + 0.5;
      // Fondo transparente a pantalla completa: un toque FUERA de la carta solo la minimiza; no llega a lo que haya debajo (enlaces, botones, otras cartas).
      const fondo = document.createElement('div'); fondo.className = 'pcw-replica-fondo'; fondo.setAttribute('aria-hidden', 'true');
      fondo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); alClicCapa(); });
      const capa = document.createElement('div'); capa.className = 'pcw-replica'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', etiqueta);
      capa.style.setProperty('--aura', aura);
      Object.assign(capa.style, { left: '0px', top: '0px', width: `${bw}px`, height: amplia ? 'auto' : `${r.height}px`, visibility: 'hidden' });
      const copia = origen.cloneNode(true); copia.classList.remove('pcw', 'pcw-origen', 'cmp-sel', 'podio-in'); copia.classList.add('pcw-replica-in');
      copia.querySelectorAll('[data-cmp], [data-menu], .card-menu, .rank-badge').forEach((x) => x.remove());   // la réplica solo muestra la carta y el acceso al perfil
      copia.removeAttribute('data-pcw'); capa.append(copia); document.body.append(fondo, capa);
      const bh = amplia ? capa.getBoundingClientRect().height : r.height;           // alto natural de la carta ya con ancho «normal»
      const base = rectBase(r, bw, bh);
      const d = geometria(base); if (!d || !bh) { capa.remove(); fondo.remove(); return false; }
      Object.assign(capa.style, { left: `${base.left}px`, top: `${base.top}px`, height: `${bh}px`, visibility: 'visible' });
      const k0 = escalaInicial(r.width, bw);
      rp = { capa, fondo, origen, base, k0, ...d };
      capa.style.transform = transformaDe(d);
      if (!sinMovimiento() && capa.animate) {          // nace con el tamaño de la carta original, viaja, pasa un poco de largo y se asienta
        const t = (k) => `translate(${d.dx}px, ${d.dy}px) scale(${(d.s * k).toFixed(3)})`;
        capa.animate([{ transform: `translate(0, 0) scale(${k0})`, offset: 0 }, { transform: t(1.07), offset: 0.55 }, { transform: t(0.985), offset: 0.78 }, { transform: t(1), offset: 1 }],
          { duration: 900, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      }
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !sinMovimiento() && inclinacion()) {   // inclinación 3D siguiendo el mouse
        capa.addEventListener('pointermove', (e) => { const b = capa.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width - 0.5; const y = (e.clientY - b.top) / b.height - 0.5; copia.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`); copia.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`); });
        capa.addEventListener('pointerleave', () => { copia.style.setProperty('--ry', '0deg'); copia.style.setProperty('--rx', '0deg'); });
      }
      capa.addEventListener('click', (e) => { if (!e.target.closest('a, button')) alClicCapa(); });
      return true;
    } catch (err) { console.error('[replica] no se pudo abrir la réplica de la carta:', err); document.querySelectorAll('.pcw-replica-fondo').forEach((x) => x.remove()); cerrar(true); return false; }
  }
  const reposicionar = () => { if (!rp) return; const d = geometria(rp.base); if (d) { Object.assign(rp, d); rp.capa.style.transform = transformaDe(d); } };
  return { abrir, cerrar, reposicionar, activa: () => rp !== null, contiene: (el) => !!rp && rp.capa.contains(el) };
}
