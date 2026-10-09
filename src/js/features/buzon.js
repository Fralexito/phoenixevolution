// Tarjeta «Mandar aviso a mi juego» + aviso global del staff. Escribe por RPC (migración 096); lee juego_avisos por RLS.
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { validarTexto, etiquetaEstado, mensajeError, ICONO_TIPO, MAX_TEXTO } from '../core/buzon.js';
import { misDispositivos } from './salas/api.js';

const $ = (s) => document.querySelector(s);
let yo = null; let timer = null;

async function cargarPCs() {
  const sel = $('#bz-pc'); if (!sel) return;
  try {
    const pcs = (await misDispositivos()).filter((d) => !d.revocado);
    sel.innerHTML = '<option value="">Todas mis PCs</option>' + pcs.map((d) => `<option value="${esc(d.id)}">${esc(d.nombre)}</option>`).join('');
  } catch { sel.innerHTML = '<option value="">Todas mis PCs</option>'; }
}

async function cargarLista() {
  const cont = $('#bz-lista'); if (!cont || !yo) return;
  const { data, error } = await supabase.from('juego_avisos').select('id, texto, tipo, creado_en, expira_en, entregado_en, global')
    .eq('usuario_id', yo).order('creado_en', { ascending: false }).limit(10);
  if (error) { cont.innerHTML = '<p class="text-xs text-gray-400">No se pudo cargar tu lista.</p>'; return; }
  if (!data.length) { cont.innerHTML = '<p class="text-xs text-gray-400">Aún no has mandado avisos.</p>'; return; }
  cont.innerHTML = data.map((a) => {
    const e = etiquetaEstado(a);
    return `<div class="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
      <i class="fa-solid ${ICONO_TIPO[a.tipo] ?? 'fa-bell'} text-galaxy-400 mt-1" aria-hidden="true"></i>
      <div class="min-w-0 flex-1"><p class="text-sm text-white whitespace-pre-line break-words">${esc(a.texto)}</p>
      <p class="text-xs text-gray-400 mt-0.5">${e.icono} ${esc(e.texto)}</p></div>
      <button type="button" class="btn btn-ghost" data-bz-borrar="${a.id}" aria-label="Borrar aviso"><i class="fa-solid fa-trash"></i></button></div>`;
  }).join('');
}

function contador() { const t = $('#bz-texto'); const c = $('#bz-contador'); if (t && c) c.textContent = `${t.value.length}/${MAX_TEXTO}`; }

async function enviar() {
  const v = validarTexto($('#bz-texto').value);
  if (!v.ok) { toast(v.motivo, 'error'); return; }
  const btn = $('#bz-enviar'); btn.disabled = true;
  const { error } = await supabase.rpc('enviar_aviso_juego', { p_texto: v.texto, p_dispositivo: $('#bz-pc').value || null });
  btn.disabled = false;
  if (error) { toast(mensajeError(error), 'error'); return; }
  $('#bz-texto').value = ''; contador(); toast('Aviso enviado. Saldrá en tu juego cuando esté abierto.', 'ok'); cargarLista();
}

async function enviarGlobal() {
  const v = validarTexto($('#bzs-texto').value);
  if (!v.ok) { toast(v.motivo, 'error'); return; }
  if (!await confirmar('Este aviso saldrá en el juego de TODOS los que tengan Phoenix Link abierto. ¿Enviarlo?', { titulo: 'Aviso global', aceptar: 'Enviar a todos' })) return;
  const { error } = await supabase.rpc('staff_enviar_aviso_juego', { p_texto: v.texto, p_tipo: 'sistema', p_global: true });
  if (error) { toast(mensajeError(error), 'error'); return; }
  $('#bzs-texto').value = ''; toast('Aviso global enviado.', 'ok');
}

document.addEventListener('click', async (ev) => {
  if (ev.target.closest('#bz-enviar')) enviar();
  else if (ev.target.closest('#bzs-enviar')) enviarGlobal();
  else { const b = ev.target.closest('[data-bz-borrar]'); if (b) { const { error } = await supabase.from('juego_avisos').delete().eq('id', Number(b.dataset.bzBorrar)); if (error) toast('No se pudo borrar.', 'error'); cargarLista(); } }
});
document.addEventListener('input', (ev) => { if (ev.target.id === 'bz-texto') contador(); });

onSession((s) => {
  const id = s?.session?.user?.id ?? null;
  const staff = $('#bzs-card'); if (staff) staff.hidden = !can('avisarJuego');
  if (id === yo) return; yo = id; clearInterval(timer);
  const card = $('#bz-card'); if (card) card.hidden = !id;
  if (!id) return;
  cargarPCs(); cargarLista(); contador();
  timer = setInterval(() => { if (!document.hidden) cargarLista(); }, 10000);
});
