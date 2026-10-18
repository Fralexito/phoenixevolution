// NOTICIAS SOCIALES · interfaz (ronda 350): barra de emojis, encuesta y comentarios dentro del lector de una noticia.
// Bandera: FX.noticiasSocial (data/experimento.js). Base: migración 124 (RPC noticia_*). La lógica pura vive en core/portada/noticiaSocial.js.
// Regla de oro: si la base falla, la noticia se sigue leyendo igual; esta zona muestra un aviso pequeño y nada más.
import { supabase } from '../../core/sistema/supabase.js';
import { getState, isStaff, can } from '../../core/sistema/session.js';
import { toast } from '../../core/sistema/toast.js';
import { confirmar } from '../../core/sistema/dialogo.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { haceCuanto } from '../../core/sistema/notifs.js';
import { EMOJIS, MAX_COMENTARIO, normalizarSocial, totalReacciones, alternarReaccion, porcentajes, validarComentario, limpiarOpciones, mensajeErrorSocial } from '../../core/portada/noticiaSocial.js';

const conSesion = () => !!getState().session;
async function pedirSesion() {
  try { const { openAuthModal } = await import('../auth.js'); openAuthModal('login'); }
  catch (e) { console.warn('[noticias-social] login:', e); toast('Inicia sesión para participar.', 'info'); }
}
async function celebrar(boton, emoji) {
  try { const { rafaga } = await import('../dopamina.js'); rafaga(boton, emoji, { n: 6 }); } catch { /* adorno: si falla, no pasa nada */ }
}

// ─── Pintado (HTML puro a partir del estado) ─────────────────────────────────────────────────────────────────────────
const barraHTML = (s) => `<div class="ns-barra" role="group" aria-label="Reacciones">
  ${EMOJIS.map((e) => `<button type="button" class="ns-emoji" data-reac="${e.id}" aria-pressed="${s.mi_reaccion === e.id}" title="${e.nombre}">
    <span aria-hidden="true">${e.emoji}</span><b>${s.reacciones[e.id] || ''}</b><span class="sr-only">${e.nombre}: ${s.reacciones[e.id]}</span></button>`).join('')}
  <small class="ns-total">${totalReacciones(s) ? `${totalReacciones(s)} reacción${totalReacciones(s) === 1 ? '' : 'es'}` : 'Sé el primero en reaccionar'}</small>
</div>`;

function encuestaHTML(enc, staff) {
  if (!enc) return '';
  const ver = enc.votos != null;   // la base solo manda los votos a quien ya votó (o al staff)
  const pct = ver ? porcentajes(enc.votos) : [];
  const etiqueta = enc.activa ? '<span class="ns-chip">Encuesta</span>' : '<span class="ns-chip ns-chip-off">Cerrada · solo la ve el staff</span>';
  return `<section class="ns-encuesta" aria-label="Encuesta">
    <div class="ns-enc-cab">${etiqueta}<small>${enc.total} voto${enc.total === 1 ? '' : 's'}</small></div>
    <h4>${esc(enc.pregunta)}</h4>
    <div class="ns-opciones">${enc.opciones.map((o, i) => ver
      ? `<div class="ns-res${enc.mi_voto === i ? ' ns-mio' : ''}" style="--p:${pct[i]}%"><span>${esc(o)}${enc.mi_voto === i ? ' <i class="fa-solid fa-check"></i>' : ''}</span><b>${pct[i]}%</b></div>`
      : `<button type="button" class="ns-op" data-votar="${i}" ${enc.activa ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
    ${!ver && enc.activa ? '<small class="ns-ayuda">Vota para ver los resultados.</small>' : ''}
    ${staff ? '<button type="button" class="ns-link" data-enc-editar>Editar encuesta</button>' : ''}
  </section>`;
}

const comentarioHTML = (c, mod) => `<li class="ns-com" data-com="${c.id}">
  <span class="ns-av">${c.avatar_url ? `<img src="${esc(c.avatar_url)}" alt="" loading="lazy">` : esc((c.nombre ?? '?').slice(0, 1).toUpperCase())}</span>
  <div class="ns-com-cuerpo">
    <div class="ns-com-cab"><b>${c.username ? `<a href="${esc(href(`perfil/?u=${encodeURIComponent(c.username)}`))}">${esc(c.nombre ?? c.username)}</a>` : 'Cuenta borrada'}</b><small>${esc(haceCuanto(c.created_at))}</small>
      ${c.mio || mod ? `<button type="button" class="ns-link ns-borrar" data-borrar-com="${c.id}">Eliminar</button>` : ''}</div>
    <p>${esc(c.texto)}</p>
  </div></li>`;

function comentariosHTML(s, abierto) {
  const mod = can('bandejaIA');
  const form = conSesion()
    ? `<form class="ns-form" data-com-form><textarea name="t" rows="2" maxlength="${MAX_COMENTARIO}" placeholder="Escribe un comentario…" aria-label="Comentario"></textarea>
        <div class="ns-form-pie"><small data-cuenta>0/${MAX_COMENTARIO}</small><button type="submit" class="btn btn-primary !min-h-9 !px-4">Comentar</button></div></form>`
    : '<button type="button" class="btn btn-ghost w-full" data-login>Inicia sesión para comentar</button>';
  return `<details class="ns-coms" data-coms ${abierto ? 'open' : ''}>
    <summary><i class="fa-solid fa-comments"></i> Comentarios <span class="ns-n">${s.comentarios_total}</span></summary>
    ${form}
    ${s.comentarios.length ? `<ul class="ns-lista">${s.comentarios.map((c) => comentarioHTML(c, mod)).join('')}</ul>` : '<p class="ns-ayuda">Aún no hay comentarios.</p>'}
  </details>`;
}

function editorEncuestaHTML(enc) {
  const ops = [...(enc?.opciones ?? []), '', '', '', ''].slice(0, 4);
  return `<form class="ns-editor" data-enc-form>
    <h4>${enc ? 'Editar encuesta' : 'Nueva encuesta'}</h4>
    <input name="p" maxlength="140" placeholder="Pregunta (ej. ¿Quién gana la fecha 12?)" value="${esc(enc?.pregunta ?? '')}" aria-label="Pregunta">
    ${ops.map((o, i) => `<input name="o${i}" maxlength="60" placeholder="Opción ${i + 1}${i < 2 ? '' : ' (opcional)'}" value="${esc(o)}" aria-label="Opción ${i + 1}">`).join('')}
    <label class="ns-check"><input type="checkbox" name="a" ${enc ? (enc.activa ? 'checked' : '') : 'checked'}> Abierta (todos la ven y votan)</label>
    <small class="ns-ayuda">Si ya tiene votos, solo puedes abrirla o cerrarla.</small>
    <div class="ns-form-pie">${enc ? '<button type="button" class="ns-link ns-borrar" data-enc-borrar>Quitar encuesta</button>' : '<span></span>'}
      <span class="flex gap-2"><button type="button" class="btn btn-ghost !min-h-9" data-enc-cancelar>Cancelar</button><button type="submit" class="btn btn-primary !min-h-9">Guardar</button></span></div>
  </form>`;
}

// ─── Montaje ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Monta la zona social debajo del texto de una noticia.
 * @param {HTMLElement} caja  contenedor vacío dentro del lector
 * @param {{ id: string }} noticia  noticia REAL (de Supabase); las de demostración no llaman a esto
 */
export function montarSocial(caja, noticia) {
  let s = normalizarSocial(null); let editando = false; let ocupado = false;

  const pintar = () => {
    const abierto = caja.querySelector('[data-coms]')?.open ?? false;
    const staff = isStaff();
    caja.innerHTML = barraHTML(s)
      + (editando ? editorEncuestaHTML(s.encuesta) : encuestaHTML(s.encuesta, staff))
      + (!s.encuesta && staff && !editando ? '<button type="button" class="ns-link" data-enc-editar>+ Añadir encuesta</button>' : '')
      + comentariosHTML(s, abierto);
  };

  async function cargar() {
    try {
      const { data, error } = await supabase.rpc('noticia_social', { p_noticia: noticia.id });
      if (error) throw error;
      s = normalizarSocial(data); pintar();
    } catch (e) {
      console.error('[noticias-social] cargar:', e);
      caja.innerHTML = `<p class="ns-aviso"><i class="fa-solid fa-circle-info"></i> ${esc(mensajeErrorSocial(e))}</p>`;
    }
  }

  async function reaccionar(tipo, boton) {
    if (!conSesion()) { pedirSesion(); return; }
    if (ocupado) return; ocupado = true;
    const antes = s; s = alternarReaccion(s, tipo); pintar();   // optimista: se ve al instante
    if (s.mi_reaccion === tipo) celebrar(caja.querySelector(`[data-reac="${tipo}"]`) ?? boton, EMOJIS.find((e) => e.id === tipo)?.emoji);
    try {
      const { error } = await supabase.rpc('noticia_reaccionar', { p_noticia: noticia.id, p_tipo: tipo });
      if (error) throw error;
    } catch (e) { console.error('[noticias-social] reaccionar:', e); s = antes; pintar(); toast(mensajeErrorSocial(e), 'error'); }
    finally { ocupado = false; }
  }

  async function votar(i, boton) {
    if (!conSesion()) { pedirSesion(); return; }
    boton.disabled = true;
    try {
      const { error } = await supabase.rpc('noticia_votar', { p_encuesta: s.encuesta.id, p_opcion: i });
      if (error) throw error;
      await cargar(); toast('¡Voto registrado!', 'ok');
    } catch (e) { console.error('[noticias-social] votar:', e); boton.disabled = false; toast(mensajeErrorSocial(e), 'error'); }
  }

  async function comentar(form) {
    const v = validarComentario(form.t.value);
    if (!v.ok) { toast(v.error, 'warn'); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      const { error } = await supabase.rpc('noticia_comentar', { p_noticia: noticia.id, p_texto: v.texto });
      if (error) throw error;
      form.t.value = ''; await cargar();
      caja.querySelector('[data-coms]')?.setAttribute('open', '');
    } catch (e) { console.error('[noticias-social] comentar:', e); toast(mensajeErrorSocial(e), 'error'); }
    finally { btn.disabled = false; }
  }

  async function borrarComentario(id) {
    if (!(await confirmar('El comentario dejará de verse para todos.', { titulo: 'Eliminar comentario', aceptar: 'Eliminar', peligro: true }))) return;
    try {
      const { error } = await supabase.rpc('noticia_borrar_comentario', { p_id: Number(id) });
      if (error) throw error;
      toast('Comentario eliminado.', 'info'); await cargar();
    } catch (e) { console.error('[noticias-social] borrar:', e); toast(mensajeErrorSocial(e), 'error'); }
  }

  async function guardarEncuesta(form) {
    const ops = limpiarOpciones([0, 1, 2, 3].map((i) => form[`o${i}`].value));
    if (!ops.ok) { toast(ops.error, 'warn'); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      const { error } = await supabase.rpc('noticia_encuesta_guardar', { p_noticia: noticia.id, p_pregunta: form.p.value, p_opciones: ops.opciones, p_activa: form.a.checked });
      if (error) throw error;
      editando = false; toast('Encuesta guardada.', 'ok'); await cargar();
    } catch (e) { console.error('[noticias-social] encuesta:', e); btn.disabled = false; toast(mensajeErrorSocial(e), 'error'); }
  }

  async function quitarEncuesta() {
    if (!(await confirmar('Se borrará la encuesta y todos sus votos.', { titulo: 'Quitar encuesta', aceptar: 'Quitar', peligro: true }))) return;
    try {
      const { error } = await supabase.rpc('noticia_encuesta_borrar', { p_noticia: noticia.id });
      if (error) throw error;
      editando = false; toast('Encuesta quitada.', 'info'); await cargar();
    } catch (e) { console.error('[noticias-social] quitar encuesta:', e); toast(mensajeErrorSocial(e), 'error'); }
  }

  caja.addEventListener('click', (ev) => {
    const t = ev.target;
    const r = t.closest('[data-reac]'); if (r) { reaccionar(r.dataset.reac, r); return; }
    const v = t.closest('[data-votar]'); if (v) { votar(Number(v.dataset.votar), v); return; }
    const b = t.closest('[data-borrar-com]'); if (b) { borrarComentario(b.dataset.borrarCom); return; }
    if (t.closest('[data-login]')) { pedirSesion(); return; }
    if (t.closest('[data-enc-editar]')) { editando = true; pintar(); return; }
    if (t.closest('[data-enc-cancelar]')) { editando = false; pintar(); return; }
    if (t.closest('[data-enc-borrar]')) quitarEncuesta();
  });
  caja.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ev.target.matches('[data-com-form]')) comentar(ev.target);
    else if (ev.target.matches('[data-enc-form]')) guardarEncuesta(ev.target);
  });
  caja.addEventListener('input', (ev) => {
    if (ev.target.name !== 't') return;
    const c = caja.querySelector('[data-cuenta]'); if (c) c.textContent = `${ev.target.value.length}/${MAX_COMENTARIO}`;
  });

  caja.innerHTML = '<p class="ns-ayuda">Cargando reacciones…</p>';
  cargar();
}
