// Barra lateral izquierda: fijar abierta + lista de amigos con indicador «en el radar». Experimento reversible (FX.barraLateral en data/experimento.js).
// Esquema: este archivo (DOM + red) → core/barraLateral.js (lógica pura). Si algo falla, la barra sigue siendo útil (atajos y ligas son estáticos).
import { onSession } from '../core/session.js';
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { avatarHTML } from '../core/avatar.js';
import { cargarRed } from './amigos/api.js';
import { observarPresence, onPresence } from './presence.js';
import { resumenAmigos, unirPerfiles } from '../core/barraLateral.js';

const KEY = 'pes-barra-fijada';
const MAX = 8;
const $ = (id) => document.getElementById(id);
let amigos = [], enLinea = new Set(), estado = 'inicio';   // inicio | sin_sesion | cargando | listo | vacio | error

function pintarAmigos() {
  const box = $('barra-amigos'), badge = $('barra-en-linea'); if (!box) return;
  if (estado === 'sin_sesion') { box.innerHTML = '<p class="barra-aviso">Inicia sesión para ver a tus amigos.</p>'; badge.hidden = true; return; }
  if (estado === 'cargando') { box.innerHTML = '<div class="esqueleto h-7"></div><div class="esqueleto h-7"></div>'; return; }
  if (estado === 'error') { box.innerHTML = '<p class="barra-aviso">No se pudieron cargar tus amigos.</p>'; badge.hidden = true; return; }
  if (estado === 'vacio') { box.innerHTML = `<p class="barra-aviso">Aún no tienes amigos.</p><a class="barra-mas" href="${escapeHTML(href('amigos/'))}">Buscar jugadores</a>`; badge.hidden = true; return; }
  const r = resumenAmigos(amigos, enLinea, MAX);
  badge.hidden = !r.enLinea; badge.textContent = String(r.enLinea);
  box.innerHTML = r.visibles.map((a) => {
    const on = enLinea.has(a.id); const url = a.username ? href(`perfil/?u=${encodeURIComponent(a.username)}`) : href('amigos/');
    return `<a href="${escapeHTML(url)}" class="barra-amigo" title="${escapeHTML(a.nombre)}${on ? ' · en la Sala de Duelos ahora' : ''}"><span class="barra-av">${avatarHTML(a.avatar, a.nombre, 28)}${on ? '<i class="barra-on" aria-label="En línea"></i>' : ''}</span><span class="barra-txt">${escapeHTML(a.nombre)}</span></a>`;
  }).join('') + `<a class="barra-mas" href="${escapeHTML(href('amigos/'))}" title="Ver todos mis amigos"><i class="fa-solid fa-ellipsis"></i><span class="barra-txt">${r.ocultos ? `Ver ${r.ocultos} más` : 'Ver todos'}</span></a>`;
}

async function cargarAmigos() {
  estado = 'cargando'; pintarAmigos();
  try {
    const ids = (await cargarRed()).amigos;
    if (!ids.length) { amigos = []; estado = 'vacio'; pintarAmigos(); return; }
    const { data, error } = await supabase.from('perfiles').select('id, username, nombre_display, avatar_url').in('id', ids.slice(0, 60));
    if (error) throw error;
    amigos = unirPerfiles(ids, data); estado = amigos.length ? 'listo' : 'vacio'; pintarAmigos();
  } catch (e) { console.warn('[barra] amigos:', e?.message ?? e); estado = 'error'; pintarAmigos(); }
}

/** Indicador de desplazamiento propio (ronda 180): una barrita fina que muestra cuánto falta por ver, sin la barra nativa. Solo aparece si la barra desborda. */
function montarIndicador(rail) {
  try {
    const ind = document.createElement('div'); ind.className = 'barra-ind'; ind.setAttribute('aria-hidden', 'true');
    const th = document.createElement('span'); th.className = 'barra-ind-th'; ind.appendChild(th); rail.prepend(ind);
    let raf = 0; let tmo = 0;
    const medir = () => {
      raf = 0; const ch = rail.clientHeight; const sh = rail.scrollHeight; const sobra = sh - ch;
      if (sobra <= 2 || ch < 60) { ind.dataset.on = '0'; return; }
      ind.dataset.on = '1'; const arriba = 14; const abajo = 22; const pista = ch - arriba - abajo; const alto = Math.max(28, (pista * ch) / sh);
      th.style.height = `${alto}px`; th.style.transform = `translateY(${arriba + (rail.scrollTop / sobra) * (pista - alto)}px)`;
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    rail.addEventListener('scroll', () => { pedir(); ind.dataset.act = '1'; clearTimeout(tmo); tmo = setTimeout(() => { delete ind.dataset.act; }, 900); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(pedir).observe(rail);
    new MutationObserver(pedir).observe(rail, { childList: true, subtree: true });
    window.addEventListener('resize', pedir); pedir();
  } catch (e) { console.warn('[barra] indicador de scroll:', e); }
}

export function initBarraLateral() {
  const rail = $('barra-lat'); if (!rail) return;
  rail.hidden = false; montarIndicador(rail);
  const fijar = $('barra-fijar');
  const aplicarFija = (v) => { document.documentElement.toggleAttribute('data-barra-fijada', v); fijar?.setAttribute('aria-pressed', String(v)); };
  try { aplicarFija(localStorage.getItem(KEY) === '1'); } catch { /* sin almacenamiento: queda plegada */ }
  fijar?.addEventListener('click', () => { const v = !document.documentElement.hasAttribute('data-barra-fijada'); aplicarFija(v); try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* no pasa nada */ } });
  let radar = false;
  onSession(({ session }) => {
    $('barra-cuenta').hidden = !session;
    if (!session) { amigos = []; enLinea = new Set(); estado = 'sin_sesion'; pintarAmigos(); return; }
    cargarAmigos();
    if (!radar) { radar = true; try { observarPresence(); onPresence((l) => { enLinea = new Set(l.map((p) => p.id)); if (estado === 'listo') pintarAmigos(); }); } catch (e) { console.warn('[barra] radar:', e?.message ?? e); } }
  });
}
