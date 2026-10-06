// Página /eventos/: lista de próximos y pasados, «Me interesa» + recordatorio, y gestión para moderación/admin.
// Esquema: pages/eventos → features/eventos/api → core/evento (puro). Las reglas viven en la BD (migración 042).
import { onSession, can } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { listarEventos, marcarInteres, crearEvento, editarEvento, cancelarEvento } from '../features/eventos/api.js';
import { JUEGOS_EVENTO, ESTADOS, LIMITES, estadoEvento, cuentaRegresiva, formatoLima, isoALima, nombreJuego, validarFormulario, textoVacio } from '../core/evento.js';

const $ = (id) => document.getElementById(id);
// S.pend = ids con una acción en curso (evita dobles clics); S.req = «versión» de la última carga (descarta respuestas viejas al cambiar de pestaña).
const S = { tab: 'proximos', eventos: [], yo: null, listo: false, pend: new Set(), req: 0, editando: null, cancelando: null, guardando: false };

const avisoError = (msg) => { $('ev-error-txt').textContent = msg; $('ev-error').hidden = !msg; };

function tarjeta(e, ahora) {
  const est = estadoEvento(e, ahora), info = ESTADOS[est], activo = est !== 'pasado' && est !== 'cancelado';
  const pend = S.pend.has(e.id), gestiona = can('gestionarEventos') && activo;
  const juego = e.juego ? `<span class="text-[10px] uppercase tracking-wider text-gray-300 border border-galaxy-border rounded px-1.5 py-0.5">${escapeHTML(nombreJuego(e.juego))}</span>` : '';
  const accionesUsuario = !activo ? '' : !S.yo
    ? '<p class="text-[11px] text-gray-500 mt-2">Inicia sesión para marcar «Me interesa».</p>'
    : est === 'en_curso' ? ''
    : `<div class="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" data-interes="${e.id}" aria-pressed="${e.mi_interes}" ${pend ? 'disabled' : ''} class="adv-chip !min-h-9"><i class="fa-solid ${e.mi_interes ? 'fa-star' : 'fa-star-half-stroke'}"></i> ${e.mi_interes ? 'Me interesa' : 'Marcar «Me interesa»'}</button>
        ${e.mi_interes ? `<label class="text-[11px] text-gray-300 inline-flex items-center gap-1.5"><input type="checkbox" data-recordar="${e.id}" ${e.mi_recordar ? 'checked' : ''} ${pend ? 'disabled' : ''}> Avísame 1 hora antes</label>` : ''}
      </div>`;
  const acciones = gestiona ? `<div class="mt-2 flex flex-wrap gap-2">
      <button type="button" data-editar="${e.id}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]"><i class="fa-solid fa-pen"></i> Editar</button>
      <button type="button" data-cancelar="${e.id}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px] !text-rose-300"><i class="fa-solid fa-ban"></i> Cancelar evento</button></div>
    ${S.cancelando === e.id ? `<form data-cancelar-form="${e.id}" class="mt-2 flex flex-wrap items-center gap-2"><input name="motivo" class="field flex-1 min-w-[10rem]" maxlength="${LIMITES.motivoMax}" placeholder="Motivo (opcional)" aria-label="Motivo de la cancelación"><button type="submit" class="btn btn-primary !min-h-8 !px-3 !text-[11px]" ${pend ? 'disabled' : ''}>Confirmar cancelación</button><button type="button" data-cancelar-no class="btn btn-ghost !min-h-8 !px-3 !text-[11px]">Volver</button></form>` : ''}` : '';
  return `<article class="glass-panel rounded-2xl p-4 ${est === 'cancelado' ? 'opacity-70' : ''}" data-evento="${e.id}">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-[10px] font-display font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 ${info.clase}">${escapeHTML(info.etiqueta)}</span>${juego}
      <span class="text-[11px] text-gray-400 ml-auto"><i class="fa-solid fa-star text-amber-300/80"></i> ${e.interesados} interesado${e.interesados === 1 ? '' : 's'}</span>
    </div>
    <h3 class="font-display font-bold text-white text-base mt-1.5 ${est === 'cancelado' ? 'line-through' : ''}">${escapeHTML(e.titulo)}</h3>
    <p class="text-xs text-galaxy-400 font-bold"><i class="fa-regular fa-clock"></i> ${escapeHTML(formatoLima(e.inicia_at))} (Lima)${activo ? ` · <span class="text-gray-300 font-normal">${escapeHTML(cuentaRegresiva(e.inicia_at, ahora))}</span>` : ''}</p>
    ${e.descripcion ? `<p class="text-xs text-gray-300 mt-1.5 whitespace-pre-line">${escapeHTML(e.descripcion)}</p>` : ''}
    ${est === 'cancelado' && e.motivo ? `<p class="text-[11px] text-rose-300 mt-1.5">Motivo: ${escapeHTML(e.motivo)}</p>` : ''}
    ${accionesUsuario}${acciones}</article>`;
}
function pintar() {
  const ahora = Date.now();
  $('ev-lista').innerHTML = S.eventos.length ? S.eventos.map((e) => tarjeta(e, ahora)).join('')
    : `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${escapeHTML(textoVacio(S.tab === 'pasados'))}</div>`;
  for (const b of document.querySelectorAll('#ev-tabs [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === S.tab));
  $('ev-gestion').hidden = !can('gestionarEventos');
}
async function cargar() {
  const mia = ++S.req, tab = S.tab;
  try {
    const lista = await listarEventos(tab === 'pasados');
    if (mia !== S.req) return;                           // llegó tarde: la persona ya cambió de pestaña
    S.eventos = lista; avisoError(''); pintar();
  } catch (e) {
    if (mia !== S.req) return;
    console.error('[eventos] página:', e); S.eventos = []; pintar(); avisoError(e?.message || 'Algo salió mal. Inténtalo de nuevo.');
  }
}

// ── Formulario del staff (crear / editar) ────────────────────────────────────────────────────────────────────────
$('ev-juego').insertAdjacentHTML('beforeend', JUEGOS_EVENTO.map(([id, n]) => `<option value="${id}">${escapeHTML(n)}</option>`).join(''));
function formVacio() {
  S.editando = null; $('ev-form').reset();
  $('ev-form-titulo').innerHTML = '<i class="fa-solid fa-plus text-galaxy-400 mr-1"></i>Nuevo evento'; $('ev-guardar').textContent = 'Publicar evento';
  $('ev-form-cancelar').hidden = true; $('ev-form-error').hidden = true;
}
function formEditar(e) {
  const l = isoALima(e.inicia_at); if (!l) return;
  S.editando = e.id; $('ev-titulo').value = e.titulo; $('ev-fecha').value = l.fecha; $('ev-hora').value = l.hora; $('ev-juego').value = e.juego ?? ''; $('ev-descripcion').value = e.descripcion;
  $('ev-form-titulo').innerHTML = '<i class="fa-solid fa-pen text-galaxy-400 mr-1"></i>Editar evento'; $('ev-guardar').textContent = 'Guardar cambios';
  $('ev-form-cancelar').hidden = false; $('ev-form-error').hidden = true; $('ev-gestion').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('ev-form-cancelar').addEventListener('click', formVacio);
$('ev-form').addEventListener('submit', async (ev) => {
  ev.preventDefault(); if (S.guardando) return;
  const err = $('ev-form-error'), campos = { titulo: $('ev-titulo').value, fecha: $('ev-fecha').value, hora: $('ev-hora').value, juego: $('ev-juego').value, descripcion: $('ev-descripcion').value };
  // Al editar un evento que ya empezó, dejar la misma hora es válido (solo se cambia el texto); el servidor decide el resto.
  const orig = S.editando ? S.eventos.find((x) => x.id === S.editando) : null, l = orig ? isoALima(orig.inicia_at) : null;
  const v = validarFormulario({ ...campos, permitirPasada: !!l && l.fecha === campos.fecha && l.hora === campos.hora });
  if (!v.ok) { err.textContent = v.error; err.hidden = false; return; }
  err.hidden = true; S.guardando = true; $('ev-guardar').disabled = true;
  try {
    if (S.editando) { await editarEvento(S.editando, v.valores); toast('Evento actualizado.', 'ok'); } else { await crearEvento(v.valores); toast('Evento publicado.', 'ok'); }
    formVacio(); S.tab = 'proximos'; await cargar();
  } catch (e) { console.error('[eventos] guardar:', e); err.textContent = e?.message || 'No se pudo guardar el evento.'; err.hidden = false; }
  finally { S.guardando = false; $('ev-guardar').disabled = false; }
});

// ── Acciones de la lista (delegación de eventos) ─────────────────────────────────────────────────────────────────
const aplicarInteres = async (id, interesa, recordar) => {
  if (S.pend.has(id)) return; S.pend.add(id); pintar();
  try {
    const r = await marcarInteres(id, interesa, recordar);
    const e = S.eventos.find((x) => x.id === id);
    if (e) { e.interesados = Math.max(0, Number(r?.interesados) || 0); e.mi_interes = r?.mi_interes === true; e.mi_recordar = r?.mi_recordar === true; }
    if (interesa && recordar === true && r?.mi_recordar) toast('Te avisaremos 1 hora antes.', 'ok', { key: 'ev-aviso' });
  } catch (e) { console.error('[eventos] interés:', e); toast(e?.message || 'No se pudo guardar tu marca.', 'error'); }
  finally { S.pend.delete(id); pintar(); }
};
$('ev-lista').addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-interes],[data-editar],[data-cancelar],[data-cancelar-no]'); if (!t) return;
  if (t.dataset.interes) { const e = S.eventos.find((x) => x.id === Number(t.dataset.interes)); if (e) aplicarInteres(e.id, !e.mi_interes, true); }
  else if (t.dataset.editar) { const e = S.eventos.find((x) => x.id === Number(t.dataset.editar)); if (e) formEditar(e); }
  else if (t.dataset.cancelar) { S.cancelando = Number(t.dataset.cancelar); pintar(); }
  else if (t.hasAttribute('data-cancelar-no')) { S.cancelando = null; pintar(); }
});
$('ev-lista').addEventListener('change', (ev) => {
  const c = ev.target.closest('[data-recordar]'); if (!c) return;
  aplicarInteres(Number(c.dataset.recordar), true, c.checked);
});
$('ev-lista').addEventListener('submit', async (ev) => {
  const f = ev.target.closest('[data-cancelar-form]'); if (!f) return; ev.preventDefault();
  const id = Number(f.dataset.cancelarForm); if (S.pend.has(id)) return; S.pend.add(id); pintar();
  try { await cancelarEvento(id, f.elements.motivo.value.trim() || null); S.cancelando = null; toast('Evento cancelado. Se avisó a los interesados.', 'ok'); await cargar(); }
  catch (e) { console.error('[eventos] cancelar:', e); toast(e?.message || 'No se pudo cancelar el evento.', 'error'); }
  finally { S.pend.delete(id); pintar(); }
});
$('ev-tabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-tab]'); if (!b || b.dataset.tab === S.tab) return;
  S.tab = b.dataset.tab === 'pasados' ? 'pasados' : 'proximos'; S.eventos = []; S.cancelando = null; $('ev-lista').innerHTML = '<p class="text-gray-400 text-sm py-12 text-center">Cargando…</p>'; cargar();
});
$('ev-reintentar').addEventListener('click', cargar);

// La cuenta regresiva se refresca sola cada 30 s (sin pedir nada al servidor).
setInterval(() => { if (!document.hidden && !S.pend.size && S.cancelando === null && S.tab === 'proximos' && S.eventos.length) pintar(); }, 30000);
onSession(({ session }) => {
  const id = session?.user?.id ?? null;
  // Misma persona (p. ej. cargó su rol o cambió el interruptor de opciones de staff): solo se repinta, sin volver a pedir los datos.
  if (S.listo && id === S.yo) { pintar(); return; }
  S.listo = true; S.yo = id; cargar();
});
