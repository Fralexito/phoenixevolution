// Tarjeta del staff «Última hora» (Moderación): crea, expira y retira las noticias de la línea de Phoenix Link. Migración 100.
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { NIVELES, DURACIONES, MAX_TEXTO, MAX_VIGENTES, validarNoticia, estadoNoticia, venceEn, contarVigentes, mensajeError } from '../core/ultimaHora.js';

const $ = (s) => document.querySelector(s);
let lista = [];

async function cargar() {
  const cont = $('#uh-lista'); if (!cont) return;
  const { data, error } = await supabase.from('noticias_ultima_hora').select('id, texto, nivel, enlace, creado_en, expira_en, publicada').order('creado_en', { ascending: false }).limit(15);
  if (error) { cont.innerHTML = '<p class="text-xs text-gray-400">No se pudo cargar la lista.</p>'; return; }
  lista = data; pintar();
}
function pintar() {
  const cont = $('#uh-lista'); const vig = contarVigentes(lista);
  $('#uh-cuenta').textContent = `${vig} de ${MAX_VIGENTES} vigentes`;
  if (!lista.length) { cont.innerHTML = '<p class="text-xs text-gray-400">Todavía no hay noticias.</p>'; return; }
  cont.innerHTML = lista.map((n) => {
    const est = estadoNoticia(n); const viva = est === 'vigente';
    return `<div class="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2${viva ? '' : ' opacity-60'}">
      <div class="min-w-0 flex-1"><p class="text-sm text-white break-words"><b class="uppercase text-[12px] tracking-wider text-galaxy-400">${esc(n.nivel)}</b> · ${esc(n.texto)}</p>
      <p class="text-xs text-gray-400 mt-0.5">${viva ? esc(venceEn(n.expira_en)) : est === 'retirada' ? 'retirada' : 'venció'}${n.enlace ? ' · con enlace' : ''}</p></div>
      ${viva ? `<button type="button" class="btn btn-ghost !min-h-9 !px-2.5 !text-[12px]" data-uh-cerrar="expirar" data-id="${n.id}">Expirar</button><button type="button" class="btn btn-ghost !min-h-9 !px-2.5 !text-[12px]" data-uh-cerrar="retirar" data-id="${n.id}">Retirar</button>` : ''}</div>`;
  }).join('');
}
function contador() { const t = $('#uh-texto'); const c = $('#uh-contador'); if (t && c) c.textContent = `${[...t.value].length}/${MAX_TEXTO}`; }

async function publicar(ev) {
  ev.preventDefault();
  const v = validarNoticia({ texto: $('#uh-texto').value, nivel: $('#uh-nivel').value, enlace: $('#uh-enlace').value, horas: $('#uh-horas').value });
  if (!v.ok) { toast(v.motivo, 'error', { key: 'uh' }); return; }
  if (v.nivel === 'urgente' && !await confirmar('Una noticia URGENTE sale con aviso destacado en Phoenix Link. ¿Publicarla?', { titulo: 'Noticia urgente', aceptar: 'Publicar' })) return;
  const btn = $('#uh-publicar'); btn.disabled = true;
  const { error } = await supabase.rpc('uh_crear', { p_texto: v.texto, p_nivel: v.nivel, p_enlace: v.enlace, p_horas: v.horas });
  btn.disabled = false;
  if (error) { toast(mensajeError(error), 'error', { key: 'uh' }); return; }
  $('#uh-texto').value = ''; $('#uh-enlace').value = ''; contador(); toast('Noticia publicada. Link la verá en menos de un minuto.', 'ok'); cargar();
}
async function cerrar(id, accion) {
  const que = accion === 'retirar' ? 'Retirar' : 'Expirar ahora';
  if (!await confirmar(accion === 'retirar' ? '¿Retirar esta noticia? Deja de verse en Phoenix Link.' : '¿Hacer que esta noticia venza ya?', { titulo: que, aceptar: que })) return;
  const { error } = await supabase.rpc('uh_cerrar', { p_id: id, p_accion: accion });
  if (error) { toast(mensajeError(error), 'error', { key: 'uh' }); return; }
  toast('Listo.', 'ok'); cargar();
}

function armar() {
  const card = $('#uh-card'); if (!card || card.dataset.listo) return; card.dataset.listo = '1';
  $('#uh-nivel').innerHTML = NIVELES.map((n) => `<option value="${n.valor}">${esc(n.texto)}</option>`).join('');
  $('#uh-horas').innerHTML = DURACIONES.map((d) => `<option value="${d.horas}"${d.horas === 24 ? ' selected' : ''}>${esc(d.texto)}</option>`).join('');
  $('#uh-form').addEventListener('submit', publicar);
  $('#uh-texto').addEventListener('input', contador);
  $('#uh-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-uh-cerrar]'); if (b) cerrar(Number(b.dataset.id), b.dataset.uhCerrar); });
  contador();
}

onSession((s) => {
  const id = s?.session?.user?.id ?? null; const card = $('#uh-card'); if (!card) return;
  card.hidden = !(id && can('gestionarUltimaHora'));
  if (!card.hidden) { armar(); cargar(); }
});
