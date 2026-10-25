// Ventana «Repeticiones» de un duelo (migración 155): ver los enlaces y, si jugaste o fuiste host, subir el partido completo o un gol.
// Blindaje: el enlace se valida aquí y otra vez en la BD (solo https de sitios de video conocidos); enlaces con rel=noopener noreferrer;
// sin migración → aviso; botones bloqueados al enviar.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { openModal, closeModal } from '../../core/sistema/modal.js';
import { validarUrlVideo, sitioDe } from '../../core/competicion/repeticiones.js';

function fila(x) {
  const s = sitioDe(x.url);
  return `<li class="flex items-center gap-2 rounded-lg border border-galaxy-border px-3 py-2 text-sm">
    <i class="fa-solid ${x.tipo === 'gol' ? 'fa-futbol text-amber-300' : `${s.icono} text-galaxy-400`}" aria-hidden="true"></i>
    <a class="flex-1 min-w-0 truncate text-white hover:underline" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.titulo || (x.tipo === 'gol' ? 'Gol' : 'Partido completo'))}${x.minuto != null ? ` · ${Number(x.minuto)}'` : ''}</a>
    <span class="text-[12px] text-gray-400">${esc(s.nombre)} · ${esc(x.autor ?? '')}</span>
    ${x.mio ? `<button type="button" data-rep-quitar="${Number(x.id)}" class="text-gray-400 hover:text-bad px-1" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>` : ''}</li>`;
}

/** Abre la ventana de repeticiones del duelo. */
export async function abrirRepeticiones(retoId, titulo = 'Repeticiones del duelo') {
  let ocupado = false;
  const id = Number(retoId);
  async function pintar() {
    const caja = document.getElementById('rep-cuerpo'); if (!caja) return;
    try {
      const { data, error } = await supabase.rpc('repeticiones_de', { p_reto: id });
      if (error) { caja.innerHTML = `<p class="text-sm text-gray-300">${error.code === 'PGRST202' ? 'Las repeticiones llegan muy pronto.' : 'No se pudieron cargar.'}</p>`; return; }
      if (!data?.visible) { caja.innerHTML = '<p class="text-sm text-gray-300">No puedes ver este duelo.</p>'; return; }
      const items = Array.isArray(data.items) ? data.items : [];
      caja.innerHTML = `${items.length ? `<ul class="grid gap-2">${items.map(fila).join('')}</ul>` : '<p class="text-sm text-gray-400">Aún no hay repeticiones.</p>'}
        ${data.puedo_subir ? `<form id="rep-form" class="grid grid-cols-2 gap-2 pt-2 border-t border-galaxy-border">
          <label class="col-span-2 text-[12px] text-gray-400">Enlace del video<input name="url" maxlength="300" inputmode="url" placeholder="https://youtu.be/…" class="field mt-1 w-full" required></label>
          <label class="text-[12px] text-gray-400">Qué es<select name="tipo" class="field mt-1 w-full"><option value="completo">Partido completo</option><option value="gol">Un gol</option></select></label>
          <label class="text-[12px] text-gray-400">Minuto (si es gol)<input name="minuto" inputmode="numeric" maxlength="3" class="field mt-1 w-full"></label>
          <label class="col-span-2 text-[12px] text-gray-400">Título (opcional)<input name="titulo" maxlength="80" class="field mt-1 w-full"></label>
          <p class="col-span-2 text-[12px] text-gray-500">YouTube, Twitch, Kick, Streamable, Medal, Google Drive, Facebook o TikTok. Los goles compiten por «Mejor gol de la semana».</p>
          <button class="btn btn-primary !min-h-9 !text-xs col-span-2">Agregar</button></form>` : ''}`;
    } catch (e) { console.error('[repeticiones]', e); caja.innerHTML = '<p class="text-sm text-gray-300">No se pudieron cargar.</p>'; }
  }
  openModal(`<div class="p-5 sm:p-6 space-y-3"><h2 class="text-lg font-display font-bold text-white"><i class="fa-solid fa-film text-galaxy-400 mr-2"></i>${esc(titulo)}</h2>
    <div id="rep-cuerpo" class="space-y-2"><p class="text-sm text-gray-400">Cargando…</p></div>
    <div class="flex justify-end"><button type="button" class="btn btn-ghost" data-close>Cerrar</button></div></div>`, { id: 'modal-repeticiones' });
  const raiz = document.getElementById('modal-repeticiones');
  raiz?.addEventListener('submit', async (e) => {
    const f = e.target.closest('#rep-form'); if (!f) return; e.preventDefault(); if (ocupado) return;
    const fd = new FormData(f); const v = validarUrlVideo(fd.get('url'));
    if (!v.ok) { toast(v.error, 'error'); return; }
    const tipo = fd.get('tipo') === 'gol' ? 'gol' : 'completo';
    const mt = String(fd.get('minuto') ?? '').trim(); const minuto = tipo === 'gol' && mt ? Number(mt) : null;
    if (minuto != null && !(Number.isInteger(minuto) && minuto >= 0 && minuto <= 130)) { toast('El minuto va de 0 a 130.', 'error'); return; }
    const titulo = String(fd.get('titulo') ?? '').trim();
    if (titulo.length > 80 || /[<>]/.test(titulo)) { toast('El título: máximo 80 caracteres, sin < ni >.', 'error'); return; }
    ocupado = true; f.querySelector('button')?.setAttribute('disabled', '');
    try {
      const { error } = await supabase.rpc('repeticion_agregar', { p_reto: id, p_url: v.url, p_tipo: tipo, p_titulo: titulo || null, p_minuto: minuto });
      if (error) throw error; toast('Repetición agregada.', 'ok');
    } catch (err) { toast(err?.message || 'No se pudo agregar.', 'error'); }
    finally { ocupado = false; pintar(); }
  });
  raiz?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rep-quitar]'); if (!b || ocupado) return;
    ocupado = true;
    try { const { error } = await supabase.rpc('repeticion_ocultar', { p_id: Number(b.dataset.repQuitar) }); if (error) throw error; toast('Repetición quitada.', 'ok'); }
    catch (err) { toast(err?.message || 'No se pudo quitar.', 'error'); }
    finally { ocupado = false; pintar(); }
  });
  pintar();
  return { cerrar: closeModal };
}
