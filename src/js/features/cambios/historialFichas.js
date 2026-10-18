// Historial de estadísticas e información (migración 126): quién, cuándo, antes → después, resultado en cada PC y «Deshacer».
// Uso: montarHistorialFichas(contenedor) desde pages/cambiosOficiales.js (o cualquier página de staff).
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { confirmar } from '../../core/sistema/dialogo.js';
import { textoCambio, resumenPcs } from '../../core/pes/fichasCampos.js';

const DESTINO = { base: 'Base normal', lm: 'Liga Máster', ambos: 'Las dos' };
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '');

function fila(c) {
  const res = Object.entries(resumenPcs(c.pcs)).map(([r, n]) => `${n} ${r.replace('_', ' ')}`).join(' · ') || 'ningún PC informó aún';
  const anulado = c.estado === 'anulado';
  const pcs = (c.pcs ?? []).map((p) => `<li>${escapeHTML(p.usuario)} · ${escapeHTML(p.pc)} · ${escapeHTML(p.destino)}: <b>${escapeHTML(p.resultado)}</b>
      ${p.motivo ? `— ${escapeHTML(p.motivo)}` : ''} <small>${fecha(p.cuando)}</small></li>`).join('');
  return `<li class="glass-panel fx-hist${anulado ? ' opacity-60' : ''}">
    <div><b>#${c.seq} · ${escapeHTML(c.datos?.jugador ?? '')}</b> <small>${c.tipo === 'stats' ? 'Estadísticas' : 'Información'} · ${DESTINO[c.destino] ?? c.destino}</small></div>
    <div>${escapeHTML(textoCambio(c.datos))}</div>
    <div class="text-xs">${escapeHTML(c.autor_nombre)} · ${fecha(c.creado)}${c.datos?.deshace ? ' · (deshace otro cambio)' : ''}${anulado ? ` · DESHECHO: ${escapeHTML(c.motivo_anulacion ?? '')}` : ''}</div>
    <details><summary class="text-xs">PCs: ${escapeHTML(res)}${c.estado_lm !== 'no_aplica' ? ` · Liga Máster: ${escapeHTML(c.estado_lm)}` : ''}</summary><ul>${pcs}</ul></details>
    ${anulado ? '' : `<button type="button" class="btn-primary text-xs" data-deshacer="${c.id}">Deshacer</button>`}
  </li>`;
}

export async function montarHistorialFichas(contenedor) {
  contenedor.innerHTML = `<input type="search" placeholder="Filtrar por jugador" data-fx-filtro class="text-xs"><ul data-fx-lista class="fx-lista"></ul>`;
  const lista = contenedor.querySelector('[data-fx-lista]');
  async function cargar() {
    const filtro = contenedor.querySelector('[data-fx-filtro]').value.trim();
    const { data, error } = await supabase.rpc('pes_fichas_historial', { p_limite: 50, p_jugador: filtro || null });
    if (error) { lista.innerHTML = `<li class="text-xs">No se pudo cargar el historial (${escapeHTML(error.message)}).</li>`; return; }
    lista.innerHTML = (data ?? []).map(fila).join('') || '<li class="text-xs">Aún no hay cambios de estadísticas ni de información.</li>';
  }
  let t = null;
  contenedor.querySelector('[data-fx-filtro]').addEventListener('input', () => { clearTimeout(t); t = setTimeout(cargar, 300); });
  lista.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-deshacer]'); if (!b) return;
    if (!(await confirmar('Se crea un cambio nuevo que devuelve los valores de antes en todos los PCs. ¿Deshacer?', { titulo: 'Deshacer cambio', aceptar: 'Deshacer', peligro: true }))) return;
    b.disabled = true;
    const { error } = await supabase.rpc('pes_fichas_deshacer', { p_id: b.dataset.deshacer });
    if (error) { toast(error.message.includes('NADA_QUE_DESHACER') ? 'Un cambio posterior ya cambió esos valores: no hay nada que deshacer.' : `No se pudo deshacer: ${error.message}`, 'error'); b.disabled = false; return; }
    toast('Cambio deshecho: los PCs lo reciben solos.', 'ok');
    cargar();
  });
  await cargar();
  return { recargar: cargar };
}
