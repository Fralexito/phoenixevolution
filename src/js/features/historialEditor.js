// Editor del historial de participación (solo admin; la BD lo refuerza con RLS). Lista las filas del jugador y permite añadir, editar y borrar.
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { ordenarHistorial, periodoCorto, validarParticipacion } from '../core/historial.js';

const ID = 'historial-editor';
const TITULOS = ['Campeón', 'Subcampeón', 'Tercer lugar'];

export function abrirEditorHistorial(jugador, filas, onChange = () => {}) {
  let lista = ordenarHistorial(filas); let editando = null;   // editando = fila en edición, o null para una nueva
  const m = openModal(`<div class="p-5 sm:p-6 space-y-4">
    <div class="flex justify-between items-start border-b border-galaxy-border pb-3">
      <div><span class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-widest">Historial</span>
        <h3 class="font-display font-bold text-xl text-white uppercase">Participaciones de ${escapeHTML(jugador.nombre)}</h3></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <ul id="he-lista" class="space-y-1.5"></ul>
    <form id="he-form" class="rounded-xl border border-galaxy-border/60 bg-black/25 p-4 space-y-3" novalidate>
      <h4 id="he-titulo" class="text-xs font-display font-bold uppercase tracking-widest text-gray-300"></h4>
      <div class="grid sm:grid-cols-2 gap-3">
        <div><label class="label" for="he-liga">Liga</label><input id="he-liga" class="field" maxlength="60" placeholder="Galaxy League"></div>
        <div><label class="label" for="he-ed">Edición</label><input id="he-ed" class="field" maxlength="60" placeholder="Apertura 2025"></div>
        <div><label class="label" for="he-tor">Torneo</label><input id="he-tor" class="field" maxlength="60" placeholder="Apertura, Clausura, Copa…"></div>
        <div><label class="label" for="he-temp">Temporada <span class="text-gray-500 normal-case">(año)</span></label><input id="he-temp" inputmode="numeric" class="field" maxlength="4" placeholder="2025"></div>
        <div><label class="label" for="he-per">Mes de inicio <span class="text-gray-500 normal-case">(para ordenar)</span></label><input id="he-per" type="month" class="field"></div>
        <div><label class="label" for="he-club">Club</label><input id="he-club" class="field uppercase" maxlength="60" placeholder="FC Barcelona"></div>
        <div><label class="label" for="he-puesto">Puesto final</label><input id="he-puesto" inputmode="numeric" class="field" maxlength="2" placeholder="Ej: 3"></div>
        <div><label class="label" for="he-tit">Título</label><input id="he-tit" class="field" maxlength="60" list="he-titulos" placeholder="Campeón, Subcampeón…"><datalist id="he-titulos">${TITULOS.map((t) => `<option value="${t}">`).join('')}</datalist></div>
      </div>
      <div><label class="label" for="he-prem">Premios individuales <span class="text-gray-500 normal-case">(uno por línea)</span></label><textarea id="he-prem" class="field" rows="3" maxlength="300" placeholder="Máximo goleador&#10;MVP de la final"></textarea></div>
      <ul id="he-err" class="text-xs text-rose-400 space-y-0.5" role="alert"></ul>
      <div class="flex gap-2 justify-end"><button type="button" id="he-cancelar" class="btn btn-ghost" hidden>Cancelar edición</button><button type="submit" id="he-guardar" class="btn btn-primary">Añadir al historial</button></div>
    </form>
  </div>`, { id: ID, wide: true });
  const $ = (s) => m.querySelector(s);
  const pintarLista = () => {
    $('#he-lista').innerHTML = lista.length ? lista.map((f) => `<li class="flex items-center gap-3 rounded-lg border border-galaxy-border/40 bg-black/25 px-3 py-2 text-sm" data-id="${escapeHTML(f.id)}">
      <span class="flex-1 min-w-0 truncate text-gray-100"><b class="text-white">${escapeHTML(f.liga)}</b> · ${escapeHTML(f.edicion)}${f.titulo ? ` · <span class="text-amber-300">${escapeHTML(f.titulo)}</span>` : ''}${f.periodo ? ` <span class="text-gray-500">(${escapeHTML(periodoCorto(f.periodo))})</span>` : ''}</span>
      <button type="button" data-editar class="adv-chip !min-h-8">Editar</button><button type="button" data-borrar class="adv-chip !min-h-8 !text-rose-300">Borrar</button></li>`).join('')
      : '<li class="text-sm text-gray-500">Aún no hay participaciones registradas.</li>';
  };
  const llenar = (f) => {
    $('#he-liga').value = f?.liga ?? 'Galaxy League'; $('#he-ed').value = f?.edicion ?? ''; $('#he-per').value = f?.periodo ? f.periodo.slice(0, 7) : ''; $('#he-tor').value = f?.torneo ?? ''; $('#he-temp').value = f?.temporada ?? ''; $('#he-club').value = f?.club ?? jugador.club ?? '';
    $('#he-puesto').value = f?.puesto ?? ''; $('#he-tit').value = f?.titulo ?? ''; $('#he-prem').value = f?.premios ?? '';
    $('#he-titulo').textContent = f ? 'Editar participación' : 'Nueva participación'; $('#he-guardar').textContent = f ? 'Guardar cambios' : 'Añadir al historial'; $('#he-cancelar').hidden = !f; $('#he-err').innerHTML = '';
  };
  const recargar = async () => {
    const { data, error } = await supabase.from('participaciones').select('*').eq('jugador_id', jugador.id);
    if (error) { console.error('[historial] recargar:', error); return; }
    lista = ordenarHistorial(data); pintarLista(); onChange();
  };
  pintarLista(); llenar(null);
  $('#he-cancelar').addEventListener('click', () => { editando = null; llenar(null); });
  $('#he-lista').addEventListener('click', async (e) => {
    const li = e.target.closest('li[data-id]'); if (!li) return; const f = lista.find((x) => x.id === li.dataset.id); if (!f) return;
    if (e.target.closest('[data-editar]')) { editando = f; llenar(f); $('#he-form').scrollIntoView({ block: 'nearest' }); return; }
    const del = e.target.closest('[data-borrar]'); if (!del) return;
    if (del.dataset.seguro !== '1') { del.dataset.seguro = '1'; del.textContent = '¿Seguro?'; return; }
    const { error } = await supabase.from('participaciones').delete().eq('id', f.id);
    if (error) { console.error('[historial] borrar:', error); toast('No se pudo borrar.', 'error'); return; }
    toast('Participación eliminada.', 'ok'); if (editando?.id === f.id) { editando = null; llenar(null); } await recargar();
  });
  $('#he-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = validarParticipacion({ liga: $('#he-liga').value, edicion: $('#he-ed').value, torneo: $('#he-tor').value, temporada: $('#he-temp').value, periodo: $('#he-per').value, club: $('#he-club').value, puesto: $('#he-puesto').value, titulo: $('#he-tit').value, premios: $('#he-prem').value });
    $('#he-err').innerHTML = v.errores.map((x) => `<li>${escapeHTML(x)}</li>`).join(''); if (!v.ok) return;
    const btn = $('#he-guardar'); btn.disabled = true;
    try {
      const q = editando ? supabase.from('participaciones').update(v.fila).eq('id', editando.id) : supabase.from('participaciones').insert({ ...v.fila, jugador_id: jugador.id });
      const { error } = await q; if (error) throw error;
      toast(editando ? 'Participación actualizada.' : 'Participación añadida.', 'ok'); editando = null; llenar(null); await recargar();
    } catch (err) {
      console.error('[historial] guardar:', err);
      $('#he-err').innerHTML = `<li>${escapeHTML(/row-level security|policy/i.test(err.message) ? 'No tienes permiso (solo administradores).' : (err.message || 'No se pudo guardar.'))}</li>`;
    } finally { btn.disabled = false; }
  });
}
export { closeModal };
