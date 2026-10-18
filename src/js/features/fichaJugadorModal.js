// FICHA RÁPIDA DE UN JUGADOR (cuadro por encima, al pulsar su carta en «Mi club» y en el mercado): su cara, sus datos y TODO lo que dice el juego
// de él (Player.bin del parche): 25 estadísticas, posiciones A/B/C en un campo, pie malo, forma, lesiones, habilidades y estilos COM.
// Se mueve con las flechas ← → entre los jugadores de la lista que se está viendo. No escribe nada. Lógica: core/pes/fichaJuego.js · datos: src/data/fichasJuego.js.
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { CLUBES_PES } from '../../data/clubesPes.js';
import { emparejarClubesLm, escudoImg } from '../core/pes/clubesPes.js';
import { nivelStat, POS_CAMPO } from '../core/pes/fichasCampos.js';
import { decodificarFicha, esPortero, posicionRegistrada, nivelesPosicion, perfilEjes, puntosRadar, GRUPOS_STATS, CLAVES_PORTERO, nombreDeCampo, NOMBRE_POSICION, TEXTO_NIVEL } from '../core/pes/fichaJuego.js';
import { minifaceUrl, montarFotos } from './fotoFutbolista.js';

let datos = null;
const cargarDatos = () => (datos ??= import('../../data/fichasJuego.js').then((m) => m.FICHAS_JUEGO).catch(() => ({})));
const extras = new Map();   // id → fila ampliada de lm_jugadores (nacionalidad, altura, peso, dorsal)
async function cargarExtras(id) {
  if (extras.has(id)) return extras.get(id);
  const { data } = await supabase.from('lm_jugadores').select('nacionalidad, altura, peso, dorsal, fecha_nac').eq('id', id).maybeSingle();
  extras.set(id, data ?? {}); return data ?? {};
}
const millones = (n) => { const v = Number(n || 0) / 1e6; return v >= 1 ? `€${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : `€ ${Number(n || 0).toLocaleString('es-PE')}`; };
const iniciales = (n) => { const p = String(n ?? '').split(/\s+/).filter(Boolean); return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const NIVEL_A_NUM = { A: '2', B: '1', C: '0' };
const PIE = ['', 'Casi no lo usa', 'Poco', 'Bastante', 'Lo usa con soltura'];
const PRECISION = ['', 'Muy baja', 'Baja', 'Buena', 'Muy buena'];
const LESIONES = ['', 'Débil', 'Normal', 'Fuerte'];

function radarSVG(ejes) {
  const pts = puntosRadar(ejes, 78, 110), n = ejes.length;
  const anillos = [0.25, 0.5, 0.75, 1].map((f) => puntosRadar(ejes.map(() => ({ valor: 40 + 59 * ((f - 0.12) / 0.88) })), 78, 110)).map((a) => a.map((p) => p.join(',')).join(' '));
  const radios = ejes.map((_, i) => { const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n; return `<line class="fj-eje" x1="110" y1="110" x2="${(110 + 78 * Math.cos(a)).toFixed(1)}" y2="${(110 + 78 * Math.sin(a)).toFixed(1)}"/>`; }).join('');
  const etiquetas = ejes.map((e, i) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n, x = 110 + 98 * Math.cos(a), y = 110 + 98 * Math.sin(a);
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}">${esc(e.nombre)} <tspan>${e.valor}</tspan></text>`;
  }).join('');
  return `<svg class="fj-radar" viewBox="-18 8 256 204" role="img" aria-label="Perfil del jugador: ${ejes.map((e) => `${e.nombre} ${e.valor}`).join(', ')}">
    ${anillos.map((a) => `<polygon class="fj-anillo" points="${a}"/>`).join('')}${radios}
    <polygon class="fj-forma" points="${pts.map((p) => p.join(',')).join(' ')}"/>${pts.map((p) => `<circle class="fj-vertice" cx="${p[0]}" cy="${p[1]}" r="3"/>`).join('')}${etiquetas}</svg>`;
}
const barra = (clave, v) => `<div class="fj-stat" data-nivel="${nivelStat(v)}" style="--w:${Math.round(((v - 40) / 59) * 100)}%"><span class="fj-stat-n">${esc(nombreDeCampo(clave))}</span><span class="fj-barra"><i></i></span><b>${v}</b></div>`;
const pips = (n, total, aviso) => `<span class="fj-pips" aria-label="${aviso}">${Array.from({ length: total }, (_, i) => `<i data-on="${i < n}"></i>`).join('')}</span>`;

function seccionStats(v) {
  const campo = GRUPOS_STATS.map((g) => `<section class="fj-grupo"><h4>${esc(g.nombre)}</h4>${g.claves.map((k) => barra(k, v[k])).join('')}</section>`).join('');
  const portero = `<section class="fj-grupo"><h4>Portero</h4>${CLAVES_PORTERO.map((k) => barra(k, v[k])).join('')}</section>`;
  return esPortero(v) ? portero + campo : campo + (CLAVES_PORTERO.some((k) => v[k] > 40) ? portero : '');
}
const NIVEL_LETRA = { 2: 'A', 1: 'B', 0: 'C' };
/** Detalle de UN puesto (al pasar el cursor, enfocar o pulsar): nombre completo, nivel y qué significa. */
const detallePosHTML = (pos, nivel, registrada) => `<div class="fj-det-cab"><span class="fj-det-pos" data-nivel="${NIVEL_A_NUM[nivel]}">${esc(pos)}</span>
  <div><b>${esc(NOMBRE_POSICION[pos] ?? pos)}</b><small>${registrada ? 'Su posición registrada' : `Nivel ${nivel}`}</small></div><span class="fj-det-nivel" data-nivel="${NIVEL_A_NUM[nivel]}">${nivel}</span></div><p>${esc(TEXTO_NIVEL[nivel] ?? '')}</p>`;
/** Resumen de todas sus posiciones (lo que se ve cuando no hay ninguna señalada). Se arma con los puntos del campo: [{pos, nivel: 'A'|'B'|'C', registrada}]. */
function resumenPosHTML(puntos) {
  const reg = puntos.find((p) => p.registrada);
  const fila = (n, t) => { const l = puntos.filter((p) => p.nivel === n).map((p) => p.pos); return l.length ? `<li><span class="fj-ley-dot" data-n="${NIVEL_A_NUM[n]}">${n}</span><b>${t}</b><em>${l.join(' · ')}</em></li>` : ''; };
  return `<div class="fj-det-cab"><div><b>Sus posiciones</b><small>Registrada: ${reg ? `${esc(NOMBRE_POSICION[reg.pos])} (${esc(reg.pos)})` : '—'}</small></div></div>
    <ul class="fj-resumen">${fila('A', 'La juega bien')}${fila('B', 'Se defiende')}</ul><p class="fj-pista">Pasa el cursor o pulsa un puesto del campo para ver su detalle. Los botones A, B y C resaltan sus puestos.</p>`;
}
function seccionPosiciones(v) {
  const niv = nivelesPosicion(v), reg = posicionRegistrada(v);
  const puntos = niv.map((p, i) => { const [x, y] = POS_CAMPO[p.clave]; return `<button type="button" class="ft-punto fj-punto" data-pos="${p.pos}" data-nivel="${NIVEL_A_NUM[p.nivel]}"${p.pos === reg ? ' data-registrada="1"' : ''} style="left:${x}%;top:${y}%;--i:${i}" aria-label="${esc(NOMBRE_POSICION[p.pos])} (${p.pos}): nivel ${p.nivel}"><b>${p.pos}</b><i>${p.nivel}</i></button>`; }).join('');
  return `<div class="fj-dos"><div><div class="ft-juego fj-juego" data-filtro=""><svg class="ft-cancha" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="2" width="96" height="126" rx="2"/><line x1="2" y1="65" x2="98" y2="65"/><circle cx="50" cy="65" r="11"/><rect x="22" y="2" width="56" height="20"/><rect x="36" y="2" width="28" height="8"/><rect x="22" y="108" width="56" height="20"/><rect x="36" y="120" width="28" height="8"/></svg>${puntos}</div>
      <div class="fj-ley" role="group" aria-label="Resaltar posiciones por nivel"><button type="button" class="fj-filtro" data-filtro="2" aria-pressed="false"><span data-n="2">A</span> la juega bien</button><button type="button" class="fj-filtro" data-filtro="1" aria-pressed="false"><span data-n="1">B</span> se defiende</button><button type="button" class="fj-filtro" data-filtro="0" aria-pressed="false"><span data-n="0">C</span> no la juega</button></div></div>
    <div class="fj-der"><div class="fj-pos-detalle" data-pos-detalle aria-live="polite">${resumenPosHTML(niv.map((p) => ({ pos: p.pos, nivel: p.nivel, registrada: p.pos === reg })))}</div>
    <div class="fj-estado"><h4>Estado y pie malo</h4>
      <div class="fj-fila"><span>Posición registrada</span><b>${esc(posicionRegistrada(v) || '—')}</b></div>
      <div class="fj-fila"><span>Forma</span>${pips(v.forma, 8, `Forma ${v.forma} de 8`)}<b>${v.forma}</b></div>
      <div class="fj-fila"><span>Resistencia a lesiones</span>${pips(v.resistencia_lesiones, 3, `Lesiones ${LESIONES[v.resistencia_lesiones]}`)}<b>${esc(LESIONES[v.resistencia_lesiones] ?? '')}</b></div>
      <div class="fj-fila"><span>Uso del pie malo</span>${pips(v.pie_malo_uso, 4, `Uso del pie malo ${v.pie_malo_uso} de 4`)}<b>${esc(PIE[v.pie_malo_uso] ?? '')}</b></div>
      <div class="fj-fila"><span>Precisión del pie malo</span>${pips(v.pie_malo_precision, 4, `Precisión ${v.pie_malo_precision} de 4`)}<b>${esc(PRECISION[v.pie_malo_precision] ?? '')}</b></div></div></div></div>`;
}
function seccionHabilidades(f) {
  const hab = f.habilidades.filter((h) => !h.com), com = f.habilidades.filter((h) => h.com);
  return `<section class="fj-grupo"><h4>Habilidades especiales <small>${hab.length}</small></h4>${hab.length ? `<ul class="fj-chips">${hab.map((h) => `<li>${esc(h.nombre)}</li>`).join('')}</ul>` : '<p class="fj-nada">No tiene habilidades especiales.</p>'}</section>
    <section class="fj-grupo"><h4>Estilos de juego COM <small>${com.length}</small></h4>${com.length ? `<ul class="fj-chips fj-com">${com.map((h) => `<li>${esc(h.nombre)}</li>`).join('')}</ul>` : '<p class="fj-nada">Sin estilo COM propio.</p>'}</section>`;
}
function seccionDatos(j, v, x, club) {
  const filas = [['Edad', `${v?.edad ?? j.edad ?? '—'} años`], ['Altura', `${v?.altura ?? x.altura ?? '—'} cm`], ['Peso', v?.peso ? `${v.peso} kg` : (x.peso ? `${x.peso} kg` : '—')],
    ['Nacionalidad', x.nacionalidad ?? '—'], ['Dorsal', x.dorsal ?? '—'], ['Valor', millones(j.valor)], ['Club', club?.nombre ?? 'Sin club'],
    ['Posición registrada', v ? `${NOMBRE_POSICION[posicionRegistrada(v)] ?? '—'} (${posicionRegistrada(v) || '—'})` : (j.posicion ?? '—')], ['Id en PES', j.pes_id ?? 'Sin id']];
  const naturales = v ? nivelesPosicion(v).filter((p) => p.nivel === 'A').map((p) => p.pos) : [];
  return `<dl class="fj-datos">${filas.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(String(val))}</dd></div>`).join('')}</dl>
    ${naturales.length ? `<section class="fj-grupo"><h4>Juega bien de <small>${naturales.length}</small></h4><ul class="fj-chips">${naturales.map((p) => `<li title="${esc(NOMBRE_POSICION[p])}">${esc(NOMBRE_POSICION[p])} <b>${p}</b></li>`).join('')}</ul></section>` : ''}`;
}
const contenido = (tab, j, f, v, x, club) => (tab === 'stats' ? seccionStats(v) : tab === 'pos' ? seccionPosiciones(v) : tab === 'hab' ? seccionHabilidades(f) : seccionDatos(j, v, x, club));

/** Abre la ficha. lista = filas de lm_jugadores ya mostradas ({id, nombre, posicion, media, edad, valor, pes_id, club_id}); indice = la elegida; clubDe(fila) = {nombre, escudo_url}. */
export function abrirFichaJugador({ lista, indice = 0, clubDe = () => null }) {
  if (!lista?.length) return;
  const previo = document.activeElement;
  const st = { i: Math.max(0, Math.min(indice, lista.length - 1)), tab: 'datos' };
  const raiz = document.createElement('div');
  raiz.className = 'fj'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Ficha del jugador');
  raiz.innerHTML = `<div class="fj-fondo" data-cerrar></div><div class="fj-caja" data-caja>
    <div class="fj-nav"><button type="button" class="fj-flecha" data-paso="-1" aria-label="Jugador anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
      <span class="fj-pos" data-contador></span>
      <button type="button" class="fj-flecha" data-paso="1" aria-label="Jugador siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
      <button type="button" class="fj-x" data-cerrar aria-label="Cerrar la ficha"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
    <div class="fj-cuerpo" data-cuerpo></div></div>`;
  document.body.append(raiz);
  document.documentElement.style.overflow = 'hidden';
  const $ = (s) => raiz.querySelector(s);
  let secuencia = 0;

  const cerrar = () => { document.removeEventListener('keydown', teclas, true); raiz.classList.add('fj-saliendo'); document.documentElement.style.overflow = ''; setTimeout(() => raiz.remove(), 220); previo?.focus?.(); };

  async function pintar() {
    const mia = ++secuencia, j = lista[st.i], club = clubDe(j);
    $('[data-contador]').textContent = `${st.i + 1} de ${lista.length}`;
    const [fichas, x] = await Promise.all([cargarDatos(), cargarExtras(j.id)]);
    if (mia !== secuencia) return;   // si se cambió de jugador mientras cargaba, esta respuesta ya no sirve
    const f = decodificarFicha(fichas[j.pes_id]), v = f?.valores ?? null;
    const lmClub = club?.nombre ? [...emparejarClubesLm([{ id: 0, nombre: club.nombre }]).keys()][0] : null;
    const clubPes = CLUBES_PES.find((c) => c.id === lmClub);
    const escudo = clubPes ? escudoImg(clubPes, 30) : safeUrl(club?.escudo_url) ? `<img src="${esc(safeUrl(club.escudo_url))}" alt="" width="30" height="30" class="cfx-esc" style="width:30px;height:30px">` : '';
    const mini = minifaceUrl(j.pes_id), pos = j.posicion ?? posicionRegistrada(v);
    const tabs = [['datos', 'Datos'], ['stats', 'Estadísticas'], ['pos', 'Posiciones y estado'], ['hab', 'Habilidades']];
    $('[data-cuerpo]').innerHTML = `
      <aside class="fj-lado">
        <span class="fj-cara" ${mini ? '' : `data-foto="${esc(j.nombre)}" data-club="${esc(club?.nombre ?? '')}"`} data-pes="${esc(j.pes_id ?? '')}">${mini ? `<img src="${mini}" alt="${esc(j.nombre)}">` : `<em>${esc(iniciales(j.nombre))}</em>`}</span>
        <h3 class="fj-nombre">${esc(j.nombre)}</h3>
        <p class="fj-sub">${escudo}<span>${esc(club?.nombre ?? 'Sin club')}</span></p>
        <div class="fj-cifras"><div><b>${j.media ?? '—'}</b><small>Media</small></div><div><b>${esc(pos || '—')}</b><small>Posición</small></div><div><b>${v?.edad ?? j.edad ?? '—'}</b><small>Edad</small></div><div><b>${esc(millones(j.valor))}</b><small>Valor</small></div></div>
        ${v ? `<div class="fj-perfil">${radarSVG(perfilEjes(v))}<p class="fj-aviso">Perfil: promedio de sus estadísticas del juego (no es la media).</p></div>` : ''}
        <a class="fj-completa" href="${href(`futbolista/?id=${j.id}`)}">Ver su ficha completa <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      </aside>
      <section class="fj-principal">
        <div class="fj-tabs" role="tablist">${tabs.map(([id, t]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === st.tab}">${t}</button>`).join('')}</div>
        <div class="fj-panel fj-entra" data-panel>${v ? contenido(st.tab, j, f, v, x, club) : st.tab === 'datos' ? seccionDatos(j, null, x, club) : '<p class="fj-nada">Este jugador no está en la base del juego (o aún no se cargó su ficha). Solo hay los datos de la Liga Máster.</p>'}</div>
      </section>`;
    requestAnimationFrame(() => raiz.classList.add('fj-listo'));
    montarFotos($('[data-cuerpo]'));
  }

  function paso(d) { st.i = (st.i + d + lista.length) % lista.length; raiz.classList.remove('fj-listo'); pintar(); }
  function pestana(id) {
    st.tab = id;
    for (const b of raiz.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === id));
    const j = lista[st.i];
    Promise.all([cargarDatos(), cargarExtras(j.id)]).then(([fichas, x]) => {
      const f = decodificarFicha(fichas[j.pes_id]), p = $('[data-panel]'); if (!p) return;
      p.classList.remove('fj-entra'); void p.offsetWidth;   // reinicia la animación de entrada
      p.innerHTML = f ? contenido(id, j, f, f.valores, x, clubDe(j)) : (id === 'datos' ? seccionDatos(j, null, x, clubDe(j)) : '<p class="fj-nada">Sin ficha del juego para este jugador.</p>');
      p.classList.add('fj-entra');
    });
  }
  // Campo de posiciones: al pasar el cursor, enfocar o pulsar un puesto se ve su detalle; pulsar lo deja fijo; A/B/C resaltan sus puestos.
  const dots = () => [...raiz.querySelectorAll('.fj-punto')];
  const fijo = () => raiz.querySelector('.fj-punto[data-sel]');
  function mostrarPos(dot) {
    const p = raiz.querySelector('[data-pos-detalle]'); if (!p) return;
    p.innerHTML = dot ? detallePosHTML(dot.dataset.pos, NIVEL_LETRA[dot.dataset.nivel], dot.dataset.registrada === '1')
      : resumenPosHTML(dots().map((d) => ({ pos: d.dataset.pos, nivel: NIVEL_LETRA[d.dataset.nivel], registrada: d.dataset.registrada === '1' })));
  }
  const sobreDot = (e) => e.target?.closest?.('.fj-punto');
  raiz.addEventListener('mouseover', (e) => { const d = sobreDot(e); if (d) mostrarPos(d); });
  raiz.addEventListener('focusin', (e) => { const d = sobreDot(e); if (d) mostrarPos(d); });
  for (const ev of ['mouseout', 'focusout']) raiz.addEventListener(ev, (e) => { if (sobreDot(e) && !e.relatedTarget?.closest?.('.fj-punto')) mostrarPos(fijo()); });
  raiz.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-cerrar]'); if (!t) return;
    if (t.matches('[data-cerrar]')) return cerrar();
    if (t.matches('.fj-punto')) { const ya = t.hasAttribute('data-sel'); dots().forEach((d) => d.removeAttribute('data-sel')); if (!ya) t.setAttribute('data-sel', ''); return mostrarPos(ya ? null : t); }
    if (t.matches('.fj-filtro')) {
      const j = raiz.querySelector('.fj-juego'), activo = j.dataset.filtro === t.dataset.filtro;
      j.dataset.filtro = activo ? '' : t.dataset.filtro;
      raiz.querySelectorAll('.fj-filtro').forEach((b) => b.setAttribute('aria-pressed', String(!activo && b === t)));
      return;
    }
    if (t.dataset.paso) return paso(Number(t.dataset.paso));
    if (t.dataset.tab) pestana(t.dataset.tab);
  });
  function teclas(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return; }
    if (e.key === 'ArrowRight' && !e.target?.matches?.('input, textarea')) { e.preventDefault(); paso(1); return; }
    if (e.key === 'ArrowLeft' && !e.target?.matches?.('input, textarea')) { e.preventDefault(); paso(-1); return; }
    if (e.key !== 'Tab') return;
    const fs = [...raiz.querySelectorAll('button:not([disabled]), a[href]')].filter((x) => x.offsetParent !== null); if (!fs.length) return;
    const a = fs[0], z = fs[fs.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  document.addEventListener('keydown', teclas, true);
  requestAnimationFrame(() => { raiz.classList.add('fj-visible'); raiz.querySelector('.fj-x')?.focus({ preventScroll: true }); });
  pintar();
}
