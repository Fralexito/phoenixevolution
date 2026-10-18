// Pantalla de edición de «Estadísticas» e «Información» del jugador (migración 126): pestañas por grupo, barras que se arrastran,
// puntos de forma, un campo de fútbol para las posiciones y un resumen en vivo («antes → después»). Solo DOM; los datos y reglas
// están en core/fichasCampos.js y la conexión con la base en features/cambios/fichas.js. El valor de cada campo vive en un elemento
// con data-clave (input numérico u oculto): fichas.js los lee al mandar el cambio, igual que antes. Vacío = «no cambiar».
import { escapeHTML as esc } from '../../core/dom.js';
import { GRUPOS, NIVEL_POSICION, POSICIONES, POS_CAMPO, mostrarValor, nivelStat, siguienteNivelPos, deltaTexto } from '../../core/fichasCampos.js';
import { segmentado, caraJugador } from './compositor.js';
import { incluyeBase, incluyeLm } from '../../core/cambiosOficiales.js';

const hay = (vig, c) => Object.prototype.hasOwnProperty.call(vig, c.clave);
const ahoraDe = (vig, c) => (hay(vig, c) ? vig[c.clave] : null);
const letraPos = (c) => c.clave.slice(4).toUpperCase();

function filaRango(c, vig) {
  const ahora = ahoraDe(vig, c);
  const ini = ahora ?? Math.round((c.minimo + c.maximo) / 2);
  return `<div class="ft-fila" data-fila data-min="${c.minimo}" data-max="${c.maximo}" data-ini="${ini}" data-ahora="${ahora ?? ''}" data-stat="${c.maximo === 99 ? 1 : 0}">
    <label class="ft-etq" for="ft-${c.clave}">${esc(c.texto)}</label>
    <span class="ft-ahora">${ahora === null ? 'base' : `ahora ${ahora}`}</span>
    <input type="range" class="ft-rango" min="${c.minimo}" max="${c.maximo}" step="1" value="${ini}" tabindex="-1" aria-label="${esc(c.texto)}">
    <input id="ft-${c.clave}" class="ft-num" data-clave="${c.clave}" type="number" inputmode="numeric" min="${c.minimo}" max="${c.maximo}" step="1" placeholder="${ahora ?? '—'}">
    <span class="ft-delta" aria-live="polite"></span>
    <button type="button" class="ft-quitar" aria-label="Dejar ${esc(c.texto)} sin cambio" hidden>×</button>
  </div>`;
}

function filaPips(c, vig) {
  const ahora = ahoraDe(vig, c);
  const pips = []; for (let v = c.minimo; v <= c.maximo; v++) pips.push(`<button type="button" class="ft-pip${ahora === v ? ' ft-pip-ahora' : ''}" role="radio" aria-checked="false" data-v="${v}">${v}</button>`);
  return `<div class="ft-fila ft-fila-pips" data-fila-pips>
    <span class="ft-etq">${esc(c.texto)}</span>
    <span class="ft-ahora">${ahora === null ? 'base' : `ahora ${ahora}`}</span>
    <div class="ft-pips" role="radiogroup" aria-label="${esc(c.texto)}">${pips.join('')}</div>
    <input type="hidden" data-clave="${c.clave}" value="">
  </div>`;
}

function campoJuego(cs, vig) {
  const puntos = cs.map((c) => {
    const [x, y] = POS_CAMPO[c.clave] ?? [50, 50]; const a = ahoraDe(vig, c);
    return `<button type="button" class="ft-punto" data-pos="${c.clave}" data-ahora="${a ?? ''}" style="left:${x}%;top:${y}%" aria-label="${esc(c.texto)}"><b>${letraPos(c)}</b><i></i></button>
      <input type="hidden" data-clave="${c.clave}" value="">`;
  }).join('');
  return `<div class="ft-juego"><svg class="ft-cancha" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="2" width="96" height="126" rx="2"/><line x1="2" y1="65" x2="98" y2="65"/><circle cx="50" cy="65" r="11"/>
      <rect x="22" y="2" width="56" height="20"/><rect x="36" y="2" width="28" height="8"/><rect x="22" y="108" width="56" height="20"/><rect x="36" y="120" width="28" height="8"/></svg>${puntos}</div>
    <p class="cfx-pista ft-leyenda"><span class="ft-ley" data-n="2">A</span> la juega bien · <span class="ft-ley" data-n="1">B</span> se defiende · <span class="ft-ley" data-n="0">C</span> no la juega. Pulsa un puesto para cambiar su nivel; vuelve a pulsar hasta dejarlo sin cambio.</p>`;
}

function chipsPosicion(c, vig) {
  const a = ahoraDe(vig, c);
  return `<div class="ft-fila ft-fila-chips"><span class="ft-etq">${esc(c.texto)}</span><span class="ft-ahora">${a === null ? 'base' : `ahora ${POSICIONES[a] ?? a}`}</span>
    <div class="ft-chips" role="radiogroup" aria-label="${esc(c.texto)}">${POSICIONES.map((p, i) => `<button type="button" class="ft-chip${a === i ? ' ft-chip-ahora' : ''}" role="radio" aria-checked="false" data-v="${i}">${p}</button>`).join('')}</div>
    <input type="hidden" data-clave="${c.clave}" value=""></div>`;
}

function panel(g, cs, vig) {
  let cuerpo;
  if (g === 'posicion') cuerpo = campoJuego(cs, vig);
  else cuerpo = cs.map((c) => (c.clave === 'posicion_registrada' ? chipsPosicion(c, vig)
    : c.grupo === 'pie_malo' || c.grupo === 'estado' ? filaPips(c, vig) : filaRango(c, vig))).join('');
  return `<section class="ft-panel" data-panel="${g}" hidden>${cuerpo}</section>`;
}

/** Dibuja pestañas + paneles dentro de `caja`. `campos` = campos del tipo (ya ordenados), `vig` = {clave: valor|null} vigentes del destino. */
export function pintarFicha(caja, campos, vig, grupoActivo = null) {
  const grupos = new Map();
  for (const c of campos) { if (!grupos.has(c.grupo)) grupos.set(c.grupo, []); grupos.get(c.grupo).push(c); }
  const activo = grupos.has(grupoActivo) ? grupoActivo : [...grupos.keys()][0];
  caja.innerHTML = `<div class="cfx-seg ft-tabs" data-fx-tabs role="tablist"></div><div class="ft-paneles">${[...grupos].map(([g, cs]) => panel(g, cs, vig)).join('')}</div>`;
  caja.dataset.grupo = activo; caja._grupos = [...grupos.keys()];
  refrescar(caja);
}

/** Actualiza todo lo que depende de los valores: barras, deltas, puntos, contadores y la pestaña activa. */
export function refrescar(caja) {
  for (const fila of caja.querySelectorAll('[data-fila]')) {
    const num = fila.querySelector('.ft-num'), rg = fila.querySelector('.ft-rango');
    const min = Number(fila.dataset.min), max = Number(fila.dataset.max), ahora = fila.dataset.ahora === '' ? null : Number(fila.dataset.ahora);
    const tocado = num.value !== '', v = tocado ? Number(num.value) : Number(fila.dataset.ini);
    rg.value = String(v);
    fila.style.setProperty('--pn', String(Math.max(0, Math.min(1, (v - min) / (max - min)))));
    fila.style.setProperty('--vn', ahora === null ? '-1' : String(Math.max(0, Math.min(1, (ahora - min) / (max - min)))));
    fila.dataset.tocado = tocado ? '1' : '0';
    if (fila.dataset.stat === '1') fila.dataset.nivel = nivelStat(tocado ? v : (ahora ?? 0));
    const d = tocado ? deltaTexto(ahora, v) : '';
    const el = fila.querySelector('.ft-delta'); el.textContent = d; el.dataset.signo = d.startsWith('+') ? 'mas' : d ? 'menos' : '';
    fila.querySelector('.ft-quitar').hidden = !tocado;
  }
  for (const fila of caja.querySelectorAll('[data-fila-pips], .ft-fila-chips')) {
    const valor = fila.querySelector('[data-clave]').value;
    for (const b of fila.querySelectorAll('[data-v]')) b.setAttribute('aria-checked', String(valor !== '' && b.dataset.v === valor));
    fila.dataset.tocado = valor === '' ? '0' : '1';
  }
  for (const b of caja.querySelectorAll('.ft-punto')) {
    const val = b.nextElementSibling.value, a = b.dataset.ahora;
    const nivel = val !== '' ? val : a; b.dataset.nivel = nivel; b.dataset.cambio = val !== '' ? '1' : '0';
    b.querySelector('i').textContent = nivel === '' ? '' : NIVEL_POSICION[Number(nivel)];
    b.title = `${b.getAttribute('aria-label')}: ${a === '' ? 'base' : `ahora ${NIVEL_POSICION[Number(a)]}`}${val !== '' ? ` → ${NIVEL_POSICION[Number(val)]}` : ''}`;
  }
  const tabs = caja.querySelector('[data-fx-tabs]'), grupos = caja._grupos ?? [];
  segmentado(tabs, grupos.map((g) => ({ id: g, nombre: GRUPOS[g] ?? g })), caja.dataset.grupo, 'data-grupo');
  for (const g of grupos) {
    const n = [...caja.querySelectorAll(`[data-panel="${g}"] [data-clave]`)].filter((e) => e.value !== '').length;
    const b = tabs.querySelector(`[data-grupo="${g}"]`);
    let badge = b.querySelector('.ft-contador'); if (!badge) { badge = document.createElement('em'); badge.className = 'ft-contador'; b.append(badge); }
    badge.textContent = String(n); badge.hidden = n === 0;
    caja.querySelector(`[data-panel="${g}"]`).hidden = g !== caja.dataset.grupo;
  }
}

/** Escucha los clics y el teclado de la pantalla (una sola vez por `caja`). */
export function enlazarFicha(caja) {
  if (caja._enlazada) return; caja._enlazada = true;
  caja.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('.ft-rango')) { el.closest('[data-fila]').querySelector('.ft-num').value = el.value; refrescar(caja); }
    else if (el.matches('.ft-num')) refrescar(caja);
  });
  caja.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.grupo) { caja.dataset.grupo = t.dataset.grupo; refrescar(caja); return; }
    if (t.matches('.ft-quitar')) { t.closest('[data-fila]').querySelector('.ft-num').value = ''; refrescar(caja); return; }
    if (t.matches('.ft-pip, .ft-chip')) { const inp = t.closest('.ft-fila').querySelector('[data-clave]'); inp.value = inp.value === t.dataset.v ? '' : t.dataset.v; refrescar(caja); return; }
    if (t.matches('.ft-punto')) { const inp = t.nextElementSibling; inp.value = siguienteNivelPos(inp.value); refrescar(caja); }
  });
  // La barra solo entra en el orden del teclado cuando ya se tocó (el cuadro numérico siempre sirve): así Tab no pasa por 40 controles dobles.
  caja.addEventListener('pointerdown', (e) => { if (e.target.matches('.ft-rango')) e.target.tabIndex = 0; });
}

/** Valores escritos ahora {clave: texto} (para no perderlos si se vuelve a dibujar). */
export const valoresEscritos = (caja) => Object.fromEntries([...caja.querySelectorAll('[data-clave]')].filter((e) => e.value !== '').map((e) => [e.dataset.clave, e.value]));
export function restaurarValores(caja, valores) {
  for (const [k, v] of Object.entries(valores)) { const el = caja.querySelector(`[data-clave="${k}"]`); if (el) el.value = v; }
  refrescar(caja);
}

/** Vista previa («Así llegará») de un cambio de estadísticas/información: jugador, cada cambio con su antes → después y a dónde va. */
export function vistaFicha(caja, { jugador, pes, club, destino, campo, catalogo, vig }) {
  if (!caja.querySelector('.ft-vista')) {
    caja.innerHTML = `<div class="ft-vista">
      <div class="cfx-tk-cabeza"><span class="cfx-tk-cara" data-f="cara"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
        <div><p class="cfx-tk-jug" data-f="jug"></p><p class="cfx-tk-sub" data-f="sub"></p></div></div>
      <ul class="ft-cambios" data-f="lista"></ul>
      <ul class="cfx-tk-dest"><li data-f="base">Base normal</li><li data-f="lm">Liga Máster</li></ul>
      <p class="cfx-tk-nota" data-f="nota"></p></div>`;
  }
  const q = (k) => caja.querySelector(`[data-f="${k}"]`);
  q('jug').dataset.vacio = String(!jugador); q('jug').textContent = jugador || 'Jugador sin elegir';
  q('sub').textContent = pes ? `id PES ${pes}` : jugador ? 'Sin id de PES: cada PC lo busca por el nombre' : 'Búscalo arriba para ver sus valores actuales';
  caraJugador(q('cara'), jugador || '', pes || '', club || '');
  q('base').dataset.on = String(incluyeBase(destino)); q('lm').dataset.on = String(incluyeLm(destino));
  const porClave = new Map(catalogo.map((c) => [c.clave, c]));
  const filas = [...campo.querySelectorAll('[data-clave]')].filter((e) => e.value !== '').map((e) => {
    const c = porClave.get(e.dataset.clave); const n = Number(e.value);
    const a = vig && Object.prototype.hasOwnProperty.call(vig, e.dataset.clave) ? vig[e.dataset.clave] : null;
    const d = c?.maximo === 99 || c?.grupo === 'basico' ? deltaTexto(a, n) : '';
    return `<li><span>${esc(c?.texto ?? e.dataset.clave)}</span><b>${a === null ? '' : `${esc(mostrarValor(e.dataset.clave, a))} → `}${esc(mostrarValor(e.dataset.clave, n))}</b>${d ? `<em data-signo="${d.startsWith('+') ? 'mas' : 'menos'}">${d}</em>` : ''}</li>`;
  });
  q('lista').innerHTML = filas.join('');
  q('nota').textContent = filas.length ? `${filas.length} ${filas.length === 1 ? 'cambio' : 'cambios'} listos para mandar.` : 'Aún no cambiaste ningún valor.';
}
