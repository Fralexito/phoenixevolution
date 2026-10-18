// Radar «estilo FIFA» de la ficha de un jugador (ronda 341). Se enciende con FX.radarFifa.
// Todo responde a la persona: al tocar/pasar sobre un eje (en el dibujo o en la lista) se resalta y se ve de qué stats sale.
import { escapeHTML as esc, statColor } from '../core/sistema/dom.js';
import { STAT_INFO } from '../../data/stats.js';
import { ejesFifa, mediaEjes, extremos, geometria, aPuntos } from '../core/jugadores/radarFifa.js';

const NIVEL = { elite: 'Élite', alto: 'Alto', medio: 'Medio', bajo: 'Por mejorar' };

export function radarFifaHTML(p) {
  const ejes = ejesFifa(p, STAT_INFO); const g = geometria(ejes); const { fuerte, flojo } = extremos(ejes);
  const anillos = g.anillos.map((a) => `<polygon points="${aPuntos(a)}" class="rf-anillo"/>`).join('');
  const rayos = g.borde.map((b, i) => `<line x1="150" y1="150" x2="${b[0]}" y2="${b[1]}" class="rf-rayo"/>`).join('');
  const vertices = ejes.map((e, i) => {
    const [vx, vy] = g.jugador[i]; const [lx, ly] = g.etiquetas[i]; const c = statColor(e.valor);
    return `<g class="rf-eje" data-eje="${e.id}" tabindex="0" role="button" aria-label="${esc(e.nombre)} ${e.valor}">
      <circle cx="${vx}" cy="${vy}" r="5" fill="${c}" class="rf-punto"/><circle cx="${vx}" cy="${vy}" r="16" fill="transparent"/>
      <text x="${lx}" y="${ly - 8}" class="rf-nom" text-anchor="middle">${esc(e.nombre.toUpperCase())}</text>
      <text x="${lx}" y="${ly + 12}" class="rf-num" text-anchor="middle" fill="${c}">${e.valor}</text></g>`;
  }).join('');
  const filas = ejes.map((e) => `<li><button type="button" class="rf-fila" data-eje="${e.id}" aria-pressed="false">
      <span class="rf-fila-n">${esc(e.nombre)}</span><span class="rf-barra"><i style="width:${e.valor}%;background:${statColor(e.valor)}"></i></span><b style="color:${statColor(e.valor)}">${e.valor}</b></button></li>`).join('');
  return `<section class="rf" data-rf aria-label="Radar de juego de ${esc(p.nombre || 'jugador')}">
    <div class="rf-cab"><h2 class="pj-sub">Perfil de juego</h2><span class="rf-media" title="Promedio de los 6 ejes">Media de ejes <b>${mediaEjes(ejes)}</b></span></div>
    <div class="rf-cuerpo">
      <svg viewBox="-20 -6 340 316" class="rf-svg" role="group" aria-label="Radar con 6 ejes">
        <defs><linearGradient id="rf-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff" stop-opacity=".55"/><stop offset="1" stop-color="#8000ff" stop-opacity=".55"/></linearGradient></defs>
        <polygon points="${aPuntos(g.borde)}" class="rf-borde"/>${anillos}${rayos}
        <polygon points="${aPuntos(g.jugador)}" class="rf-poly" fill="url(#rf-grad)"/>${vertices}
      </svg>
      <div class="rf-lado"><ul class="rf-lista">${filas}</ul>
        <p class="rf-detalle" data-rf-detalle aria-live="polite">${fuerte && flojo ? `Lo mejor: <b>${esc(fuerte.nombre)} ${fuerte.valor}</b> · A mejorar: <b>${esc(flojo.nombre)} ${flojo.valor}</b>. Toca un eje para ver de qué stats sale.` : ''}</p></div>
    </div></section>`;
}

/** Activa el resaltado. `raiz` = contenedor donde está el radar (puede haber varios). */
export function montarRadarFifa(raiz, p) {
  const caja = raiz.querySelector('[data-rf]'); if (!caja) return;
  const ejes = ejesFifa(p, STAT_INFO); const det = caja.querySelector('[data-rf-detalle]'); let activo = '';
  const marcar = (id) => {
    activo = id; caja.dataset.activo = id;
    caja.querySelectorAll('[data-eje]').forEach((el) => { const on = el.dataset.eje === id; el.classList.toggle('on', on); if (el.matches('button')) el.setAttribute('aria-pressed', String(on)); });
    const e = ejes.find((x) => x.id === id); if (!e) return;
    det.innerHTML = `<b>${esc(e.nombre)} ${e.valor}</b> · ${NIVEL[e.nivel]}. Sale de: ${e.partes.map((x) => `${esc(x.nombre)} <b>${x.v}</b>`).join(' · ')}.`;
  };
  const alternar = (id) => marcar(id);   // clic/toque/Enter siempre marcan (con mouse el hover ya lo había marcado: no se puede desmarcar por error)
  caja.addEventListener('click', (e) => { const t = e.target.closest('[data-eje]'); if (t) alternar(t.dataset.eje); });
  caja.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.rf-eje')) { e.preventDefault(); alternar(e.target.dataset.eje); } });
  caja.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const t = e.target.closest('[data-eje]'); if (t) marcar(t.dataset.eje); });
}
