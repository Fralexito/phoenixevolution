// Página /bandeja-ia/ (ronda 345): propuestas de la IA esperando ✅/❌ de un moderador o admin.
// La base lo vuelve a comprobar en cada llamada (ia_bandeja e ia_revisar exigen private.es_moderador()).
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { href } from '../core/config.js';
import { mensajeErrorSocial } from '../core/noticiaSocial.js';
import { haceCuanto } from '../core/notifs.js';
import { PRIORIDAD, TIPO, textoSeguro, contar, mensajeError } from '../core/bandejaIA.js';

const $ = (id) => document.getElementById(id);
let iniciado = false; let pendientes = [];

function error(e) { $('bia-error-txt').textContent = mensajeError(e); $('bia-error').hidden = false; console.error('[bandeja-ia]', e); }

async function cargarResumen() {
  const { data, error: e } = await supabase.from('ia_resumenes').select('fecha, texto').order('fecha', { ascending: false }).limit(1).maybeSingle();
  if (e) throw e;
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  $('bia-resumen').innerHTML = data
    ? `<div class="bia-resumen-cab"><span class="bia-ico"><i class="fa-solid fa-robot"></i></span><div><h2>Resumen ${data.fecha === hoy ? 'de hoy' : `del ${esc(data.fecha)}`}</h2><small>Escrito por la IA para ti</small></div></div><div class="bia-texto">${textoSeguro(data.texto)}</div>`
    : '<div class="bia-resumen-cab"><span class="bia-ico"><i class="fa-solid fa-robot"></i></span><div><h2>Todavía no hay resumen</h2><small>La IA escribe uno cada mañana (9:54 a. m., hora de Lima).</small></div></div>';
}

const tarjeta = (p) => {
  const pr = PRIORIDAD[p.prioridad] ?? PRIORIDAD[2]; const t = TIPO[p.tipo] ?? TIPO.aviso;
  const noticia = p.tipo === 'noticia' && p.noticia_titulo ? `
    <details class="bia-noticia"><summary><i class="fa-solid fa-eye"></i> Leer la noticia completa</summary>
      <h3>${esc(p.noticia_titulo)}</h3>${p.noticia_tag ? `<span class="bia-tag">${esc(p.noticia_tag)}</span>` : ''}
      <p class="bia-res">${esc(p.noticia_resumen ?? '')}</p>
      <div class="bia-cuerpo">${textoSeguro(p.noticia_cuerpo ?? '')}</div>
    </details>` : '';
  return `<article class="bia-card" data-pri="${pr.clase}" data-id="${p.id}">
    <div class="bia-card-top"><span class="bia-chip"><i class="fa-solid ${t.icono}"></i>${t.etiqueta}</span><span class="bia-pri"><i class="fa-solid ${pr.icono}"></i>${pr.etiqueta}</span><small>${esc(haceCuanto(p.creado_en))}</small></div>
    <h3 class="bia-titulo">${esc(p.titulo)}</h3>
    ${p.detalle ? `<div class="bia-detalle">${textoSeguro(p.detalle)}</div>` : ''}
    ${noticia}
    <div class="bia-acciones">
      <button type="button" class="btn btn-primary" data-aprobar="${p.id}"><i class="fa-solid fa-check"></i> ${p.tipo === 'noticia' ? 'Aprobar y publicar' : p.tipo === 'encuesta' ? 'Aprobar y abrir' : 'Entendido'}</button>
      <button type="button" class="btn btn-ghost" data-rechazar="${p.id}"><i class="fa-solid fa-xmark"></i> ${p.tipo === 'aviso' ? 'Descartar' : 'Rechazar'}</button>
    </div>
  </article>`;
};

async function cargarLista() {
  const { data, error: e } = await supabase.rpc('ia_bandeja', { p_historial: false });
  if (e) throw e;
  pendientes = data ?? [];
  const c = contar(pendientes);
  $('bia-cuenta').innerHTML = c.total ? `<b>${c.total}</b> pendiente${c.total === 1 ? '' : 's'}${c.urgentes ? ` · <span class="bia-urg">${c.urgentes} urgente${c.urgentes === 1 ? '' : 's'}</span>` : ''}` : '<span class="bia-ok"><i class="fa-solid fa-circle-check"></i> Todo al día</span>';
  $('bia-lista').innerHTML = pendientes.length ? pendientes.map(tarjeta).join('')
    : '<div class="glass-panel rounded-2xl p-6 text-center text-sm text-gray-400"><i class="fa-solid fa-mug-hot text-galaxy-400 text-2xl mb-2 block"></i>No hay nada esperando. Cuando la IA prepare algo, aparecerá aquí.</div>';
}

async function cargarHistorial() {
  const { data, error: e } = await supabase.rpc('ia_bandeja', { p_historial: true });
  if (e) throw e;
  $('bia-historial').innerHTML = (data ?? []).length ? data.map((p) => `<div class="bia-hist" data-estado="${esc(p.estado)}">
      <i class="fa-solid ${p.estado === 'aprobada' ? 'fa-check' : 'fa-xmark'}"></i>
      <span class="bia-hist-t">${esc(p.titulo)}${p.motivo ? `<small>«${esc(p.motivo)}»</small>` : ''}</span>
      <small>${p.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} por ${esc(p.revisor ?? 'staff')} · ${esc(haceCuanto(p.revisado_en))}</small></div>`).join('')
    : '<p class="text-xs text-gray-500">Aún no se ha revisado nada.</p>';
}

// Comentarios de las noticias (ronda 350): se publican directo; aquí el staff los revisa y puede eliminarlos.
async function cargarComentarios() {
  const { data, error: e } = await supabase.rpc('noticias_comentarios_recientes', { p_limite: 50 });
  if (e) throw e;
  const lista = data ?? [];
  const vivos = lista.filter((c) => !c.oculto).length;
  $('bia-coms-n').textContent = vivos ? `${vivos} visible${vivos === 1 ? '' : 's'}` : 'Sin comentarios';
  $('bia-coms').innerHTML = lista.length ? lista.map((c) => `<div class="bia-com" data-oculto="${!!c.oculto}">
      <div class="bia-com-txt"><small><b>${esc(c.autor ?? 'Cuenta borrada')}</b> · ${esc(haceCuanto(c.created_at))} · en <a href="${esc(href(`noticias/?n=${encodeURIComponent(c.noticia_slug)}`))}">${esc(c.noticia_titulo)}</a></small><p>${esc(c.texto)}</p></div>
      ${c.oculto ? '<small class="text-gray-500">Eliminado</small>' : `<button type="button" class="btn btn-ghost !min-h-8 !px-3 !text-[12px] !text-rose-400" data-borrar-com="${c.id}">Eliminar</button>`}
    </div>`).join('')
    : '<p class="text-xs text-gray-500">Todavía nadie ha comentado una noticia.</p>';
}

async function borrarComentario(id, boton) {
  if (!(await confirmar('El comentario dejará de verse para todos.', { titulo: 'Eliminar comentario', aceptar: 'Eliminar', peligro: true }))) return;
  boton.disabled = true;
  const { error: e } = await supabase.rpc('noticia_borrar_comentario', { p_id: Number(id) });
  if (e) { boton.disabled = false; toast(mensajeError(e), 'error'); return; }
  toast('Comentario eliminado.', 'info'); cargarComentarios().catch((e2) => toast(mensajeErrorSocial(e2), 'error'));
}

async function todo() {
  $('bia-error').hidden = true;
  try { await Promise.all([cargarResumen(), cargarLista()]); } catch (e) { error(e); }
  // Aparte: si la migración 124 aún no está en la base, solo esta caja avisa; el resto de la bandeja sigue funcionando.
  cargarComentarios().catch((e) => { console.error('[bandeja-ia] comentarios:', e); $('bia-coms-n').textContent = 'No disponible'; $('bia-coms').innerHTML = `<p class="text-xs text-gray-500">${esc(mensajeErrorSocial(e))}</p>`; });
}

async function revisar(id, aprobar, boton) {
  const p = pendientes.find((x) => String(x.id) === String(id)); if (!p) return;
  let motivo = null;
  if (aprobar) {
    if (p.tipo === 'noticia' && !(await confirmar(`Se publicará «${p.noticia_titulo ?? p.titulo}» para todos. ¿Seguro?`, { titulo: 'Aprobar', aceptar: 'Publicar' }))) return;
  } else {
    motivo = await pedirTexto('¿Por qué? (opcional: ayuda a que la IA mejore)', { titulo: p.tipo === 'noticia' ? 'Rechazar' : 'Descartar', obligatorio: false, maximo: 300, aceptar: p.tipo === 'noticia' ? 'Rechazar' : 'Descartar' });
    if (motivo === null) return;
  }
  boton.disabled = true;
  const { error: e } = await supabase.rpc('ia_revisar', { p_id: Number(id), p_aprobar: aprobar, p_motivo: motivo || null });
  if (e) { boton.disabled = false; toast(mensajeError(e), 'error'); return; }
  toast(aprobar ? (p.tipo === 'noticia' ? '¡Noticia publicada!' : p.tipo === 'encuesta' ? '¡Encuesta abierta!' : 'Anotado') : (p.tipo === 'noticia' ? 'Rechazada: sigue como borrador' : 'Descartado'), aprobar ? 'ok' : 'info');
  const card = boton.closest('.bia-card'); card?.classList.add('bia-sale');
  setTimeout(() => { cargarLista().catch(error); if ($('bia-hist-caja')?.open) cargarHistorial().catch(error); }, 220);
}

document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-aprobar]'); if (a) { revisar(a.dataset.aprobar, true, a); return; }
  const r = ev.target.closest('[data-rechazar]'); if (r) { revisar(r.dataset.rechazar, false, r); return; }
  const c = ev.target.closest('[data-borrar-com]'); if (c) borrarComentario(c.dataset.borrarCom, c);
});
$('bia-reintentar')?.addEventListener('click', todo);
$('bia-hist-caja')?.addEventListener('toggle', (e) => { if (e.currentTarget.open) cargarHistorial().catch(error); });

onSession(({ session }) => {
  const permitido = !!session && can('bandejaIA');
  $('bia-sinsesion').hidden = !!session;
  $('bia-denegado').hidden = !session || permitido;
  $('bia-app').hidden = !permitido;
  if (permitido && !iniciado) { iniciado = true; todo(); }
});
