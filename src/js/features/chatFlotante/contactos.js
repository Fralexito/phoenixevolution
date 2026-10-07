// Chat flotante · COLUMNA DE CONTACTOS (PC ≥ 1280 px, fija a la derecha) y HOJA DE CHATS (pantallas menores, botón «Chats»).
// Las dos pintan la misma lista: amigos (en línea primero) + grupos. Pulsar un contacto abre su ventanita (o, en /mensajes/,
// navega a esa conversación de la página completa). Solo pinta: los datos vienen de datos.js.
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { avatarHTML } from '../../core/avatar.js';
import { toast } from '../../core/toast.js';
import { norm } from '../../core/search.js';
import { ordenarContactos, insignia } from '../../core/chatFlotante.js';
import { tituloConv, totalNoLeidos } from '../../core/chat.js';
import { S, alCambiar, abrirConUsuario, abrirConv, noLeidosPor, nombre } from './datos.js';

const CLAVE_COMPACTO = 'pes-contactos-compacto';
let filtro = '';

const av = (url, nom, px = 32, enLinea = false, extra = '') => `<span class="cf-av" style="--cf-av:${px}px">${avatarHTML(url, nom, px)}${enLinea ? '<i class="cf-on" aria-hidden="true"></i>' : ''}${extra}</span>`;

/** Abre el chat con un amigo desde cualquier lista. En /mensajes/ lleva a la conversación de la página completa. */
export async function abrirContacto(usuario, enPaginaMensajes) {
  if (enPaginaMensajes) { location.href = href(`mensajes/?con=${encodeURIComponent(usuario)}`); return; }
  try { await abrirConUsuario(usuario); }
  catch (e) { toast(e.message || 'No se pudo abrir el chat.', 'error', { key: 'cf-abrir' }); }
}

function filasHTML() {
  if (!S.yo) return `<p class="cf-aviso">Inicia sesión para chatear con tus amigos.</p>`;
  if (!S.listo) return '<div class="cf-esq"></div><div class="cf-esq"></div><div class="cf-esq"></div>';
  const q = norm(filtro.trim());
  const contactos = ordenarContactos(S.amigos, S.perfiles, S.enLinea, noLeidosPor()).filter((c) => !q || norm(`${c.nombre} ${c.username ?? ''}`).includes(q));
  const grupos = S.convs.filter((c) => c.tipo === 'GRUPO').filter((c) => !q || norm(c.nombre ?? '').includes(q));
  const enLinea = contactos.filter((c) => c.enLinea).length;
  const fila = (c) => `<button type="button" class="cf-fila${c.enLinea ? '' : ' cf-off'}" data-cf-usuario="${escapeHTML(c.id)}" title="${escapeHTML(c.nombre)}${c.enLinea ? ' · en línea' : ''}">
      ${av(c.avatar, c.nombre, 32, c.enLinea)}<span class="cf-nom">${escapeHTML(c.nombre)}</span>${c.noLeidos ? `<b class="cf-badge">${insignia(c.noLeidos)}</b>` : ''}</button>`;
  const filaGrupo = (g) => `<button type="button" class="cf-fila" data-cf-conv="${escapeHTML(g.id)}" title="${escapeHTML(tituloConv(g, nombre))}">
      <span class="cf-av cf-av-grupo" style="--cf-av:32px"><i class="fa-solid fa-user-group"></i></span><span class="cf-nom">${escapeHTML(tituloConv(g, nombre))}</span>${g.no_leidos && !g.silenciado ? `<b class="cf-badge">${insignia(g.no_leidos)}</b>` : ''}</button>`;
  if (!S.amigos.length && !grupos.length) return `<p class="cf-aviso">Aún no tienes amigos. <a href="${escapeHTML(href('amigos/'))}">Búscalos aquí</a>.</p>`;
  return `<p class="cf-sub"><i class="cf-on-mini" aria-hidden="true"></i>En línea · ${enLinea}</p>
    ${contactos.length ? contactos.map(fila).join('') : '<p class="cf-aviso">Nadie coincide.</p>'}
    ${grupos.length ? `<p class="cf-sub">Grupos</p>${grupos.map(filaGrupo).join('')}` : ''}`;
}

/** Click en cualquier lista: abre el contacto o el grupo. */
function alPulsar(e, enPaginaMensajes, despues) {
  const u = e.target.closest('[data-cf-usuario]')?.dataset.cfUsuario;
  const c = e.target.closest('[data-cf-conv]')?.dataset.cfConv;
  if (u) { abrirContacto(u, enPaginaMensajes); despues?.(); }
  else if (c) { if (enPaginaMensajes) location.href = href('mensajes/'); else abrirConv(c).catch((err) => toast(err.message, 'error')); despues?.(); }
}

const leerCompacto = () => { try { return localStorage.getItem(CLAVE_COMPACTO) === '1'; } catch { return false; } };
const guardarCompacto = (v) => { try { localStorage.setItem(CLAVE_COMPACTO, v ? '1' : '0'); } catch { /* no se recuerda */ } };

/** Columna fija (PC). Se crea siempre; el CSS la muestra solo en ≥ 1280 px y con sesión. */
export function montarColumna({ enPaginaMensajes }) {
  const col = document.createElement('aside');
  col.id = 'cf-columna'; col.className = 'cf-columna'; col.setAttribute('aria-label', 'Contactos y chats');
  col.innerHTML = `<header class="cf-col-cab"><h2 class="cf-col-tit">Contactos</h2>
      <a class="cf-ico" href="${escapeHTML(href('mensajes/'))}" title="Todos los mensajes" aria-label="Ir a Mensajes"><i class="fa-solid fa-comments"></i></a>
      <button type="button" class="cf-ico" data-cf-plegar aria-pressed="false" title="Plegar / desplegar" aria-label="Plegar o desplegar contactos"><i class="fa-solid fa-angles-right"></i></button></header>
    <label class="cf-buscar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" maxlength="40" placeholder="Buscar amigo" aria-label="Buscar amigo"></label>
    <div class="cf-lista" role="list"></div>`;
  document.body.appendChild(col);
  const lista = col.querySelector('.cf-lista');
  const aplicarCompacto = (v) => { document.documentElement.toggleAttribute('data-cf-compacto', v); col.querySelector('[data-cf-plegar]').setAttribute('aria-pressed', String(v)); };
  aplicarCompacto(leerCompacto());
  col.addEventListener('click', (e) => {
    if (e.target.closest('[data-cf-plegar]')) { const v = !document.documentElement.hasAttribute('data-cf-compacto'); aplicarCompacto(v); guardarCompacto(v); window.dispatchEvent(new Event('resize')); return; }
    alPulsar(e, enPaginaMensajes);
  });
  col.querySelector('input').addEventListener('input', (e) => { filtro = e.target.value; lista.innerHTML = filasHTML(); });
  const pintar = () => { lista.innerHTML = filasHTML(); };
  alCambiar((m) => { if (!m.startsWith('mensajes') && !m.startsWith('nuevo')) pintar(); });
  pintar();
  return pintar;
}

/** Botón «Chats» junto a «En vivo» (pantallas < 1280 px) + hoja con la lista. */
export function montarHoja({ enPaginaMensajes }) {
  const fila = document.getElementById('live-row');
  const boton = document.createElement('button');
  boton.type = 'button'; boton.id = 'cf-chats-btn'; boton.className = 'live-toggle cf-chats-btn';
  boton.setAttribute('aria-expanded', 'false'); boton.setAttribute('aria-controls', 'cf-hoja');
  boton.innerHTML = '<i class="fa-solid fa-comment-dots"></i><span class="live-toggle-txt">Chats</span><b class="cf-badge" hidden></b>';
  if (fila) fila.prepend(boton); else document.body.appendChild(boton);

  const hoja = document.createElement('div');
  hoja.id = 'cf-hoja'; hoja.className = 'cf-hoja'; hoja.hidden = true; hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-label', 'Chats');
  hoja.innerHTML = `<header class="cf-col-cab"><h2 class="cf-col-tit">Chats</h2>
      <a class="cf-ico" href="${escapeHTML(href('mensajes/'))}" title="Todos los mensajes" aria-label="Ir a Mensajes"><i class="fa-solid fa-comments"></i></a>
      <button type="button" class="cf-ico" data-cf-cerrar-hoja aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></header>
    <label class="cf-buscar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" maxlength="40" placeholder="Buscar amigo" aria-label="Buscar amigo"></label>
    <div class="cf-lista"></div>`;
  document.body.appendChild(hoja);
  const lista = hoja.querySelector('.cf-lista');
  const abrirHoja = (v) => { hoja.hidden = !v; boton.setAttribute('aria-expanded', String(v)); if (v) { lista.innerHTML = filasHTML(); hoja.querySelector('input').focus({ preventScroll: true }); } };
  boton.addEventListener('click', () => abrirHoja(hoja.hidden));
  hoja.addEventListener('click', (e) => { if (e.target.closest('[data-cf-cerrar-hoja]')) { abrirHoja(false); boton.focus(); return; } alPulsar(e, enPaginaMensajes, () => abrirHoja(false)); });
  hoja.addEventListener('keydown', (e) => { if (e.key === 'Escape') { abrirHoja(false); boton.focus(); } });
  hoja.querySelector('input').addEventListener('input', (e) => { filtro = e.target.value; lista.innerHTML = filasHTML(); });
  document.addEventListener('pointerdown', (e) => { if (!hoja.hidden && !hoja.contains(e.target) && !boton.contains(e.target)) abrirHoja(false); });

  const insig = boton.querySelector('.cf-badge');
  const pintar = () => {
    boton.hidden = !S.yo;
    const n = totalNoLeidos(S.convs); insig.hidden = !n; insig.textContent = insignia(n);
    boton.setAttribute('aria-label', n ? `Chats, ${n} sin leer` : 'Chats');
    if (!hoja.hidden) lista.innerHTML = filasHTML();
  };
  alCambiar((m) => { if (!m.startsWith('mensajes') && !m.startsWith('nuevo')) pintar(); });
  pintar();
}
