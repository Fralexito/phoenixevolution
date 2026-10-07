// Chat flotante · VENTANITAS abajo a la derecha (como una red social): abiertas (tarjeta) o minimizadas (burbuja con avatar).
// Cuántas caben lo decide core/chatFlotante.js según el ancho libre; en móvil, una sola a pantalla completa.
// Solo pinta y reacciona; leer, enviar y el tiempo real están en datos.js.
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { avatarHTML } from '../../core/avatar.js';
import { toast } from '../../core/toast.js';
import { confirmar } from '../../core/dialogo.js';
import { agruparMensajes, etiquetaDia, hoyClave, tituloConv, MAX_TEXTO } from '../../core/chat.js';
import { ventanasQueCaben, insignia } from '../../core/chatFlotante.js';
import { regionAhora } from '../ajustes.js';
import { S, alCambiar, convDe, perfil, nombre, enviar, cerrar, minimizar, desplegar, leido, cargarMensajes, descartar, setCaben } from './datos.js';

const tz = () => regionAhora().timeZone || 'America/Lima';
const hora = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', ...regionAhora() });
const borradores = new Map();       // conv → texto sin enviar (sobrevive a repintados)
let dock;

function cabecera(c) {
  const grupo = c?.tipo === 'GRUPO'; const otro = c?.otro_id; const p = otro ? perfil(otro) : null; const t = c ? tituloConv(c, nombre) : 'Chat';
  const enLinea = otro && S.enLinea.has(otro);
  const avatar = grupo ? '<span class="cf-av cf-av-grupo" style="--cf-av:32px"><i class="fa-solid fa-user-group"></i></span>'
    : `<span class="cf-av" style="--cf-av:32px">${avatarHTML(p?.avatar_url, t, 32)}${enLinea ? '<i class="cf-on" aria-hidden="true"></i>' : ''}</span>`;
  const sub = grupo ? `${c.miembros || ''} miembros` : enLinea ? 'En línea' : 'Desconectado';
  const perfilUrl = p?.username ? href(`perfil/?u=${encodeURIComponent(p.username)}`) : null;
  return `<header class="cf-v-cab">${perfilUrl ? `<a href="${escapeHTML(perfilUrl)}" class="cf-v-quien">` : '<span class="cf-v-quien">'}${avatar}
      <span class="min-w-0"><b class="cf-v-nom">${escapeHTML(t)}</b><span class="cf-v-sub${enLinea ? ' cf-verde' : ''}">${escapeHTML(sub)}</span></span>${perfilUrl ? '</a>' : '</span>'}
    <a class="cf-ico" href="${escapeHTML(href(otro ? `mensajes/?con=${encodeURIComponent(otro)}` : 'mensajes/'))}" title="Abrir en Mensajes" aria-label="Abrir en Mensajes"><i class="fa-solid fa-up-right-from-square"></i></a>
    <button type="button" class="cf-ico" data-cf-min title="Minimizar" aria-label="Minimizar"><i class="fa-solid fa-minus"></i></button>
    <button type="button" class="cf-ico" data-cf-x title="Cerrar" aria-label="Cerrar chat"><i class="fa-solid fa-xmark"></i></button></header>`;
}

function cuerpo(conv) {
  const lista = S.mensajes.get(conv);
  if (lista === null) return '<div class="cf-v-vacio">No se pudieron cargar los mensajes. <button type="button" class="cf-link" data-cf-reintentar>Reintentar</button></div>';
  if (!lista) return '<div class="cf-v-vacio"><span class="cf-esq"></span><span class="cf-esq cf-esq-der"></span><span class="cf-esq"></span></div>';
  if (!lista.length) return '<div class="cf-v-vacio">Aún no hay mensajes. ¡Saluda! 👋</div>';
  const grupo = convDe(conv)?.tipo === 'GRUPO'; const hoy = hoyClave(tz());
  return agruparMensajes(lista, S.yo, tz()).map((d) => `<p class="cf-dia">${escapeHTML(etiquetaDia(d.dia, hoy))}</p>
    ${d.items.map((it) => `<div class="cf-grupo${it.mios ? ' cf-mios' : ''}">${grupo && !it.mios ? `<span class="cf-autor">${escapeHTML(nombre(it.autor))}</span>` : ''}
      ${it.mensajes.map((m) => m.eliminado ? '<p class="cf-msg cf-borrado">Mensaje eliminado</p>'
        : `<p class="cf-msg${m.pendiente ? ' cf-pend' : ''}${m.error ? ' cf-err' : ''}" title="${escapeHTML(hora(m.created_at))}">${escapeHTML(m.texto)}${m.pendiente ? '<span class="cf-estado">enviando…</span>' : ''}${m.error ? `<span class="cf-estado">No se envió · <button type="button" class="cf-link" data-cf-reenviar="${escapeHTML(m.id)}">Reintentar</button> · <button type="button" class="cf-link" data-cf-descartar="${escapeHTML(m.id)}">Quitar</button></span>` : ''}</p>`).join('')}</div>`).join('')}`).join('');
}

function ventanaHTML(v, nueva) {
  const c = convDe(v.conv);
  return `<section class="cf-ventana${nueva ? ' cf-nueva' : ''}" data-cf-ventana="${escapeHTML(v.conv)}" aria-label="Chat con ${escapeHTML(c ? tituloConv(c, nombre) : 'jugador')}">
    ${cabecera(c)}
    <div class="cf-v-msgs" aria-live="polite">${cuerpo(v.conv)}</div>
    <form class="cf-v-form"><textarea rows="1" maxlength="${MAX_TEXTO}" placeholder="Escribe un mensaje…" aria-label="Mensaje">${escapeHTML(borradores.get(v.conv) ?? '')}</textarea>
      <button type="submit" class="cf-enviar" aria-label="Enviar"><i class="fa-solid fa-paper-plane"></i></button></form></section>`;
}

function burbujaHTML(v) {
  const c = convDe(v.conv); const t = c ? tituloConv(c, nombre) : 'Chat'; const p = c?.otro_id ? perfil(c.otro_id) : null;
  const n = c && !c.silenciado ? c.no_leidos : 0;
  return `<div class="cf-burbuja-wrap" data-cf-burbuja="${escapeHTML(v.conv)}">
    <button type="button" class="cf-burbuja" data-cf-abrir title="${escapeHTML(t)}" aria-label="Abrir chat con ${escapeHTML(t)}${n ? `, ${n} sin leer` : ''}">
      ${c?.tipo === 'GRUPO' ? '<span class="cf-av cf-av-grupo" style="--cf-av:48px"><i class="fa-solid fa-user-group"></i></span>' : `<span class="cf-av" style="--cf-av:48px">${avatarHTML(p?.avatar_url, t, 48)}${c?.otro_id && S.enLinea.has(c.otro_id) ? '<i class="cf-on" aria-hidden="true"></i>' : ''}</span>`}
      ${n ? `<b class="cf-badge">${insignia(n)}</b>` : ''}</button>
    <button type="button" class="cf-burbuja-x" data-cf-x aria-label="Cerrar chat con ${escapeHTML(t)}"><i class="fa-solid fa-xmark"></i></button></div>`;
}

/** Repinta sin perder lo que el usuario está escribiendo ni dónde tenía el cursor. */
function pintar() {
  if (!dock) return;
  if (!S.yo) { dock.innerHTML = ''; return; }
  const activo = document.activeElement?.closest?.('[data-cf-ventana]')?.dataset.cfVentana;
  const sel = activo ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  const abiertas = S.ventanas.filter((v) => !v.min); const mins = S.ventanas.filter((v) => v.min);
  // Scroll: si estabas al fondo, sigues al fondo; si estabas leyendo arriba, no te mueve.
  const pegado = new Map([...dock.querySelectorAll('[data-cf-ventana] .cf-v-msgs')].map((el) => [el.closest('[data-cf-ventana]').dataset.cfVentana, el.scrollHeight - el.scrollTop - el.clientHeight < 40 ? null : el.scrollTop]));
  // Solo las ventanas que aparecen por primera vez entran animadas (repintar no debe volver a animar).
  const antes = new Set([...dock.querySelectorAll('[data-cf-ventana]')].map((el) => el.dataset.cfVentana));
  // row-reverse: lo primero queda a la derecha → burbujas al borde, luego la ventana más reciente.
  dock.innerHTML = `<div class="cf-burbujas">${mins.map(burbujaHTML).join('')}</div>${[...abiertas].reverse().map((v) => ventanaHTML(v, !antes.has(v.conv))).join('')}`;
  dock.dataset.abiertas = String(abiertas.length);
  for (const el of dock.querySelectorAll('[data-cf-ventana] .cf-v-msgs')) {
    const id = el.closest('[data-cf-ventana]').dataset.cfVentana; const top = pegado.get(id);
    el.scrollTop = top == null ? el.scrollHeight : top;
  }
  if (activo) {
    const ta = dock.querySelector(`[data-cf-ventana="${CSS.escape(activo)}"] textarea`);
    if (ta) { ta.focus({ preventScroll: true }); if (sel) ta.setSelectionRange(sel[0], sel[1]); }
  }
  dock.querySelectorAll('textarea').forEach(autoAlto);
  medirReserva();
}

const autoAlto = (ta) => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`; };

/** Cuánto espacio horizontal ocupa el dock: lo usa el CSS para correr el botón «En vivo» y que no se tapen. */
function medirReserva() { document.documentElement.style.setProperty('--cf-dock-w', `${Math.ceil(dock.getBoundingClientRect().width)}px`); }

/** Ancho libre para ventanas = pantalla − columna de contactos − barra izquierda − márgenes. */
function recalcularCaben() {
  const ancho = (id) => { const el = document.getElementById(id); return el && !el.hidden && getComputedStyle(el).display !== 'none' ? el.getBoundingClientRect().width : 0; };   // fixed: offsetParent siempre es null
  const reservado = ancho('cf-columna') + ancho('barra-lat');
  setCaben(window.innerWidth < 640 ? 1 : ventanasQueCaben(window.innerWidth - reservado - 96));
}

async function alEnviar(form) {
  const v = form.closest('[data-cf-ventana]').dataset.cfVentana; const ta = form.querySelector('textarea'); const texto = ta.value;
  if (!texto.trim()) return;
  ta.value = ''; borradores.delete(v); autoAlto(ta);
  try { await enviar(v, texto); }
  catch (e) { toast(e.message || 'No se pudo enviar.', 'error', { key: 'cf-enviar' }); }
}

export function montarVentanas() {
  dock = document.createElement('div');
  dock.id = 'cf-dock'; dock.className = 'cf-dock'; dock.setAttribute('aria-label', 'Chats abiertos');
  document.body.appendChild(dock);

  dock.addEventListener('submit', (e) => { e.preventDefault(); alEnviar(e.target); });
  dock.addEventListener('keydown', (e) => {
    if (e.target.matches('textarea') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form.requestSubmit(); }
    if (e.key === 'Escape') { const v = e.target.closest('[data-cf-ventana]')?.dataset.cfVentana; if (v) minimizar(v); }
  });
  dock.addEventListener('input', (e) => {
    if (!e.target.matches('textarea')) return;
    borradores.set(e.target.closest('[data-cf-ventana]').dataset.cfVentana, e.target.value); autoAlto(e.target);
  });
  dock.addEventListener('focusin', (e) => { const v = e.target.closest('[data-cf-ventana]')?.dataset.cfVentana; if (v) leido(v); });
  dock.addEventListener('click', async (e) => {
    const caja = e.target.closest('[data-cf-ventana], [data-cf-burbuja]'); if (!caja) return;
    const conv = caja.dataset.cfVentana || caja.dataset.cfBurbuja;
    if (e.target.closest('[data-cf-x]')) {
      if ((borradores.get(conv) ?? '').trim() && !(await confirmar('Tienes un mensaje sin enviar. ¿Cerrar el chat igual?', { titulo: 'Cerrar chat', aceptar: 'Cerrar', peligro: true }))) return;
      borradores.delete(conv); cerrar(conv); return;
    }
    if (e.target.closest('[data-cf-min]')) { minimizar(conv); return; }
    if (e.target.closest('[data-cf-abrir]')) { desplegar(conv).catch((err) => toast(err.message, 'error')); return; }
    if (e.target.closest('[data-cf-reintentar]')) { S.mensajes.delete(conv); cargarMensajes(conv); return; }
    const reenviar = e.target.closest('[data-cf-reenviar]')?.dataset.cfReenviar;
    if (reenviar) { const m = (S.mensajes.get(conv) ?? []).find((x) => x.id === reenviar); descartar(conv, reenviar); if (m) enviar(conv, m.texto).catch((err) => toast(err.message, 'error')); return; }
    const quitar = e.target.closest('[data-cf-descartar]')?.dataset.cfDescartar;
    if (quitar) descartar(conv, quitar);
  });

  alCambiar((m) => { if (m !== 'enLinea' || S.ventanas.length) pintar(); });
  // Aviso suave de mensaje nuevo en una ventana minimizada (una vez por conversación, sin sonido extra).
  alCambiar((m) => { if (m.startsWith('nuevo:')) dock.querySelector(`[data-cf-burbuja="${CSS.escape(m.slice(6))}"] .cf-burbuja`)?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }); });
  window.addEventListener('resize', () => { recalcularCaben(); medirReserva(); });
  recalcularCaben(); pintar();
  // Silenciar o salir de un grupo no está aquí a propósito: se hace en Mensajes (enlace en la cabecera). Así la ventanita queda simple.
}
