// Chat flotante · pestaña GENERAL (19-oct-2026, Fralex: «que sea el chat general y el chat con amigos a la vez… un botoncito para cambiar»).
// El mismo chat global de /chat-general/ (y de Phoenix Link) en pequeño, dentro de la columna de contactos (PC) y de la hoja «Chats» (celular).
// Solo pide mensajes mientras la pestaña está a la vista (cada 6 s, como la página). Datos: features/chatGeneral/api.js · lógica: core/comunidad/chatGeneral.js.
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { toast } from '../../core/sistema/toast.js';
import { estadoEscritura, fusionar, insignia, horaCorta, ESPERA_DEFECTO, MAX_TEXTO } from '../../core/comunidad/chatGeneral.js';
import * as api from '../chatGeneral/api.js';
import { S } from './datos.js';

const SONDEO_MS = 6000;

/** Monta el panel en `caja` (vacía). → { activar(bool), alMostrar() } — activo = la pestaña «General» está elegida. */
export function montarGeneral(caja) {
  caja.innerHTML = `<ol class="cf-gen-lista" aria-live="polite" aria-label="Mensajes del chat general"><li class="cf-aviso">Cargando el chat…</li></ol>
    <button type="button" class="cf-gen-nuevos" hidden><i class="fa-solid fa-arrow-down" aria-hidden="true"></i> Mensajes nuevos</button>
    <form class="cf-gen-form"><input type="text" maxlength="${MAX_TEXTO + 100}" placeholder="Escribe a toda la comunidad…" aria-label="Mensaje para el chat general" autocomplete="off">
      <button type="submit" aria-label="Enviar al chat general" title="Enviar"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></form>
    <a class="cf-gen-todo" href="${esc(href('chat-general/'))}">Abrir el chat general completo <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
  const ol = caja.querySelector('.cf-gen-lista'); const nuevos = caja.querySelector('.cf-gen-nuevos');
  const form = caja.querySelector('form'); const input = form.querySelector('input'); const boton = form.querySelector('button');
  const st = { lista: [], ultimoId: 0, activo: false, timer: null, cargando: false, primera: true, espera: ESPERA_DEFECTO, hasta: 0, yo: null };

  const fila = (m) => { const ins = insignia(m.rol); const mio = m.usuario_id && m.usuario_id === S.yo;
    return `<li class="cf-gen-msg${mio ? ' cf-gen-mio' : ''}"><p class="cf-gen-cab"><b>${esc(m.nombre)}</b>${ins ? `<span class="cf-gen-ins" data-tono="${ins.tono}">${esc(ins.texto)}</span>` : ''}<small>${esc(horaCorta(m.creado_en))}</small></p><p class="cf-gen-tx">${esc(m.texto)}</p></li>`; };
  const pintar = (bajar) => {
    const pegado = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 50;
    ol.innerHTML = st.lista.length ? st.lista.map(fila).join('') : '<li class="cf-aviso">Todavía no hay mensajes. ¡Rompe el hielo!</li>';
    if (bajar || pegado) { ol.scrollTop = ol.scrollHeight; nuevos.hidden = true; } else nuevos.hidden = false;
  };
  const visible = () => st.activo && !document.hidden && caja.offsetParent !== null;
  async function refrescar(bajar = false) {
    if (!S.yo || st.cargando || !visible()) return;
    if (st.yo !== S.yo) { st.yo = S.yo; st.lista = []; st.ultimoId = 0; st.primera = true; }   // cambió la persona: se empieza de cero
    st.cargando = true;
    try {
      const r = await api.listar(st.ultimoId, 50);
      if (Number.isInteger(r?.espera_seg)) st.espera = r.espera_seg;
      const f = fusionar(st.lista, r); const cambio = f.hayNuevos || f.lista.length !== st.lista.length;
      st.lista = f.lista; st.ultimoId = f.ultimoId;
      if (cambio || st.primera) pintar(bajar || st.primera);
      st.primera = false;
    } catch (e) { if (st.primera) ol.innerHTML = `<li class="cf-aviso">${esc(e.message || 'No se pudo cargar el chat.')}</li>`; }
    finally { st.cargando = false; }
  }
  const listo = () => { const e = estadoEscritura(input.value); boton.disabled = !e.puede || Date.now() < st.hasta; };
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const e = estadoEscritura(input.value); if (!e.puede || Date.now() < st.hasta) return;
    boton.disabled = true;
    try {
      await api.enviar(e.limpio); input.value = '';
      if (st.espera > 0) { st.hasta = Date.now() + st.espera * 1000; setTimeout(listo, st.espera * 1000 + 50); }
      await refrescar(true);
    } catch (err) { toast(err.message || 'No se pudo enviar.', 'error', { key: 'cf-gen' }); }
    listo();
  });
  input.addEventListener('input', listo);
  nuevos.addEventListener('click', () => { ol.scrollTop = ol.scrollHeight; nuevos.hidden = true; });
  ol.addEventListener('scroll', () => { if (ol.scrollHeight - ol.scrollTop - ol.clientHeight < 50) nuevos.hidden = true; }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescar(); });
  listo();

  return {
    activar(v) {
      st.activo = !!v; clearInterval(st.timer);
      if (!st.activo) return;
      st.timer = setInterval(refrescar, SONDEO_MS);
      requestAnimationFrame(() => refrescar(true));
    },
    /** La caja acaba de mostrarse (p. ej. se abrió la hoja): si está activa, se pone al día. */
    alMostrar() { if (st.activo) requestAnimationFrame(() => refrescar(true)); },
  };
}
