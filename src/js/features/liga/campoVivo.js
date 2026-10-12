// Tablero del campo 2D EN VIVO (ronda 236). Se despliega dentro de la tarjeta de «En vivo ahora» (features/liga/vivo.js).
// Se suscribe al canal público de solo lectura «campo:<sala_id>» (Realtime Broadcast; lo manda la Edge Function «liga» ruta
// /v1/liga/campo cuando Phoenix Link tiene encendido «Campo en vivo en la web»). Solo hay suscripción mientras el tablero está
// desplegado. Un único requestAnimationFrame interpola ~1 mensaje/s para que las fichitas se muevan suaves.
// Lógica pura y pruebas: core/campoVivo.js · tests/campoVivo.test.mjs.
import { supabase } from '../../core/supabase.js';
import { escapeHTML } from '../../core/dom.js';
import { LARGO, ANCHO, COLORES, normalizarCampo, etiquetaFase, textoPosesion, resumenTanda, faltaCampo, pasoInterpolado } from '../../core/campoVivo.js';

const MX = 3, MZ = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';
const SIN_DATOS_MS = 15_000;   // con campo ya activo: si deja de llegar, se avisa

function lineas() {
  const hx = LARGO / 2, hz = ANCHO / 2;
  const lado = (s) => {
    const x = (d) => s * (hx - d);   // posición a «d» metros de la línea de fondo de ese lado
    const r = (x0, x1, z0, z1) => `<rect x="${Math.min(x0, x1)}" y="${z0}" width="${Math.abs(x1 - x0)}" height="${z1 - z0}"/>`;
    return `${r(x(0), x(16.5), -20.16, 20.16)}${r(x(0), x(5.5), -9.16, 9.16)}${r(x(0), x(-2), -3.66, 3.66)}
      <circle cx="${x(11)}" cy="0" r="0.35" fill="currentColor" stroke="none"/>
      <path d="M ${x(16.5)} -7.31 A 9.15 9.15 0 0 ${s > 0 ? 0 : 1} ${x(16.5)} 7.31"/>`;
  };
  return `<g fill="none" stroke="currentColor" stroke-width="0.35" style="color:rgba(255,255,255,.55)">
    <rect x="${-hx}" y="${-hz}" width="${LARGO}" height="${ANCHO}"/><line x1="0" y1="${-hz}" x2="0" y2="${hz}"/>
    <circle cx="0" cy="0" r="9.15"/><circle cx="0" cy="0" r="0.35" fill="currentColor" stroke="none"/>${lado(-1)}${lado(1)}</g>`;
}

const HTML = `
  <div class="campo-tab">
    <div class="campo-leyenda"><span><i style="background:${COLORES[0]}"></i><b data-na></b></span><span><i style="background:${COLORES[1]}"></i><b data-nb></b></span><span><i style="background:${COLORES[2]}"></i>Árbitros</span></div>
    <div class="campo-caja">
      <svg viewBox="${-LARGO / 2 - MX} ${-ANCHO / 2 - MZ} ${LARGO + MX * 2} ${ANCHO + MZ * 2}" role="img" aria-label="Campo con los jugadores en vivo">
        <rect x="${-LARGO / 2}" y="${-ANCHO / 2}" width="${LARGO}" height="${ANCHO}" fill="#0d3b24"/>${lineas()}
        <g data-fichas></g>
        <g data-bola opacity="0"><circle r="1.5" fill="rgba(0,0,0,.35)" cx="0.3" cy="0.4"/><circle r="0.95" fill="#fff" stroke="#111" stroke-width="0.25"/></g>
      </svg>
      <div class="campo-etq" data-etq hidden></div>
    </div>
    <div class="campo-pos" data-posbox hidden>
      <div class="campo-pos-barra"><span data-pa style="background:${COLORES[0]}"></span><span data-pb style="background:${COLORES[1]}"></span></div>
      <p class="vivo-goles" style="text-align:center">Posesión: <b data-postxt>calculando…</b></p>
    </div>
    <div class="campo-tanda" data-tanda hidden></div>
    <p class="vivo-goles campo-aviso" data-aviso hidden></p>
    <p class="vivo-goles campo-nota">Equipo A = local y B = visita (colores aproximados: se asignan en el primer saque de centro).</p>
  </div>`;

/**
 * Crea un tablero para una sala. Devuelve { el, actualizar({local, visitante, terminado}), cerrar() }.
 * «el» es un elemento suelto: quien lo crea lo pone donde quiera (y lo puede volver a poner tras repintar).
 */
export function crearTablero(salaId) {
  const el = document.createElement('div');
  el.innerHTML = HTML;
  const q = (s) => el.querySelector(s);
  const gFichas = q('[data-fichas]'), gBola = q('[data-bola]');
  const estado = { obj: null, cur: [], curB: null, ultimo: 0, abiertoEn: Date.now(), terminado: false, na: '', nb: '' };
  const circulos = [];

  function circulo(i) {
    if (!circulos[i]) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', '1.35'); c.setAttribute('stroke', 'rgba(0,0,0,.55)'); c.setAttribute('stroke-width', '0.25');
      gFichas.appendChild(c); circulos[i] = c;
    }
    return circulos[i];
  }

  function aviso(texto) {
    const a = q('[data-aviso]');
    a.hidden = !texto;
    if (texto) a.textContent = texto;
  }

  function alMensaje(payload) {
    const n = normalizarCampo(payload);
    if (!n) return;
    estado.obj = n; estado.ultimo = Date.now();
    aviso(estado.terminado ? 'Partido terminado.' : '');
    const etq = etiquetaFase(n.fase), e = q('[data-etq]');
    e.hidden = !etq; e.textContent = etq;
    q('[data-posbox]').hidden = false;
    q('[data-postxt]').textContent = textoPosesion(n.posesion);
    q('[data-pa]').style.width = `${n.posesion ? n.posesion[0] : 50}%`;
    q('[data-pb]').style.width = `${n.posesion ? n.posesion[1] : 50}%`;
    pintarTanda(n.t);
  }

  function pintarTanda(t) {
    const cont = q('[data-tanda]');
    if (!t || !t.l.length) { cont.hidden = true; cont.innerHTML = ''; return; }
    const r = resumenTanda(t);
    const fila = (eq, nombre) => `<div class="campo-tanda-fila"><i style="background:${COLORES[eq]}"></i><b>${escapeHTML(nombre)}</b><span class="campo-tanda-gol">${r[eq].filter(Boolean).length}</span>
      ${r[eq].map((g) => `<span class="campo-bola ${g ? 'campo-bola-gol' : 'campo-bola-fallo'}" aria-label="${g ? 'gol' : 'fallo'}">${g ? '✓' : '✗'}</span>`).join('')}</div>`;
    cont.hidden = false;
    cont.innerHTML = `<p class="vivo-goles"><b>Tanda de penales</b>${t.listo ? ` · patea ${t.e ? 'B' : 'A'}` : ''}</p>${fila(0, estado.na || 'Equipo A')}${fila(1, estado.nb || 'Equipo B')}`;
  }

  // Un solo requestAnimationFrame mientras el tablero esté puesto en la página y visible
  let raf = 0, t0 = performance.now();
  function paso(ahora) {
    raf = requestAnimationFrame(paso);
    if (document.hidden || !el.isConnected) { t0 = ahora; return; }
    const dt = (ahora - t0) / 1000; t0 = ahora;
    const o = estado.obj;
    if (!o) return;
    for (let i = 0; i < o.j.length; i++) {
      const c = circulo(i);
      estado.cur[i] = pasoInterpolado(estado.cur[i], o.j[i], dt);
      c.setAttribute('cx', estado.cur[i][0].toFixed(2)); c.setAttribute('cy', estado.cur[i][1].toFixed(2));
      c.setAttribute('fill', COLORES[o.j[i][2]] ?? COLORES['-1']);
      c.setAttribute('r', o.j[i][2] === 2 ? '0.9' : '1.35');
    }
    while (circulos.length > o.j.length) { circulos.pop().remove(); estado.cur.pop(); }
    if (!o.b) gBola.setAttribute('opacity', '0');
    else {
      estado.curB = pasoInterpolado(estado.curB, o.b, dt, 0.2, 20);
      gBola.setAttribute('opacity', '1');
      gBola.setAttribute('transform', `translate(${estado.curB[0].toFixed(2)} ${estado.curB[1].toFixed(2)}) scale(${o.b[2] > 2 ? 1.5 : 1})`);
    }
  }
  raf = requestAnimationFrame(paso);

  // Avisos de ausencia (cada segundo; no dependen del requestAnimationFrame)
  const reloj = setInterval(() => {
    const ahora = Date.now();
    if (estado.terminado) aviso('Partido terminado.');
    else if (faltaCampo(estado.abiertoEn, estado.ultimo, ahora)) aviso('El campo en vivo no está activado en esta sala.');
    else if (estado.ultimo && ahora - estado.ultimo > SIN_DATOS_MS) aviso('Sin datos del campo desde hace unos segundos…');
  }, 1000);

  let canal = null;
  try {
    canal = supabase.channel(`campo:${salaId}`).on('broadcast', { event: 'campo' }, (m) => alMensaje(m?.payload)).subscribe();
  } catch (e) { console.warn('[campo vivo] realtime:', e); }

  return {
    el,
    actualizar({ local, visitante, terminado }) {
      estado.na = local || ''; estado.nb = visitante || ''; estado.terminado = !!terminado;
      q('[data-na]').textContent = local || 'Equipo A';
      q('[data-nb]').textContent = visitante || 'Equipo B';
    },
    cerrar() {
      cancelAnimationFrame(raf); clearInterval(reloj);
      try { if (canal) supabase.removeChannel(canal); } catch { /* ya cerrado */ }
      canal = null; el.remove();
    },
  };
}
