// Panel «MVP del partido» de /mis-partidos/ (función nueva 4/8). RPC de la migración 147; lógica pura en core/competicion/mvp.js.
// Blindaje: sin sesión o sin migración → el panel no aparece; botones bloqueados mientras se envía (sin doble voto);
// la BD vuelve a validar todo (quién vota, a quién, plazo). Los conteos llegan solo al cerrar.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { vistaMvp, cierreTexto, mvpPerfil } from '../../core/competicion/mvp.js';

const sinFuncion = (e) => e?.code === 'PGRST202' || /could not find the function|schema cache/i.test(e?.message ?? '');

/** Veces que alguien fue MVP. Nunca lanza → número o 0. */
export async function mvpTotalDe(usuarioId) {
  try { const { data, error } = await supabase.rpc('mvp_total_de', { p_usuario: usuarioId }); if (error) { if (!sinFuncion(error)) console.warn('[mvp] total:', error.message); return 0; } return Number(data) || 0; }
  catch (e) { console.warn('[mvp] total:', e); return 0; }
}
export { mvpPerfil };

/** @param {HTMLElement} el  sección con [data-lista] · @param {{ yo: () => string|null }} ctx */
export function crearPanelMvp(el, ctx) {
  let lista = []; let enviando = false;

  function tarjeta(v) {
    const yo = ctx.yo(); const x = vistaMvp(v, yo); if (x.tipo === 'nada') return '';
    const cab = `<div class="flex items-center justify-between gap-2"><p class="text-sm text-white font-display font-bold uppercase">Duelo #${Number(v.reto_id)}</p>
      <span class="text-[12px] text-gray-400">${esc(cierreTexto(v.cierra))}</span></div>`;
    let cuerpo = '';
    if (x.tipo === 'votar' || x.tipo === 'mirar') {
      const botones = x.candidatos.map((c) => c.soyYo ? '' : `<button type="button" data-mvp-votar="${esc(c.id)}" data-reto="${Number(v.reto_id)}" aria-pressed="${c.elegido}"
          class="btn ${c.elegido ? 'btn-primary' : 'btn-ghost'} !min-h-9 !text-xs" ${x.tipo === 'mirar' ? 'disabled' : ''}>${c.elegido ? '<i class="fa-solid fa-star" aria-hidden="true"></i> ' : ''}${esc(c.nombre ?? 'Jugador')}</button>`).join('');
      cuerpo = `<p class="text-[12px] text-gray-400 mt-1">${x.tipo === 'votar' ? (x.yaVote ? 'Ya votaste. Puedes cambiar tu voto hasta que cierre.' : '¿Quién jugó mejor? No puedes votarte a ti mismo.') : 'Solo votan jugadores y espectadores aprobados.'} · ${esc(x.progreso)}</p>
        <div class="flex flex-wrap gap-2 mt-2">${botones}</div>`;
    } else if (x.tipo === 'ganador') {
      cuerpo = `<p class="text-sm mt-1 ${x.soyMvp ? 'text-amber-300' : 'text-gray-200'}"><i class="fa-solid fa-star text-amber-300" aria-hidden="true"></i> MVP: <b>${esc(x.mvp.nombre ?? 'Jugador')}</b>${x.soyMvp ? ' · ¡eres tú!' : ''}</p>`;
    } else {
      cuerpo = `<p class="text-[12px] text-gray-400 mt-1">${x.tipo === 'empate' ? 'Hubo empate en votos: este partido no tiene MVP.' : 'Nadie votó: este partido no tiene MVP.'}</p>`;
    }
    return `<article class="glass-panel rounded-2xl p-3" data-mvp="${Number(v.reto_id)}">${cab}${cuerpo}</article>`;
  }

  function pintar() { const html = lista.map(tarjeta).filter(Boolean).join(''); el.hidden = !html; el.querySelector('[data-lista]').innerHTML = html; }

  async function cargar() {
    if (!ctx.yo()) { lista = []; pintar(); return; }
    try {
      const { data, error } = await supabase.rpc('mvp_pendientes');
      if (error) { if (!sinFuncion(error)) console.warn('[mvp] pendientes:', error.message); lista = []; }
      else lista = Array.isArray(data) ? data.filter(Boolean) : [];
    } catch (e) { console.warn('[mvp] pendientes:', e); lista = []; }
    pintar();
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mvp-votar]'); if (!b || enviando) return;
    enviando = true; el.querySelectorAll('[data-mvp-votar]').forEach((x) => { x.disabled = true; });
    try {
      const { error } = await supabase.rpc('mvp_votar', { p_reto: Number(b.dataset.reto), p_votado: b.dataset.mvpVotar });
      if (error) throw error;
      toast('Voto guardado.', 'ok');
    } catch (err) { toast(err?.message || 'No se pudo guardar el voto.', 'error'); }
    finally { enviando = false; await cargar(); }
  });
  return { cargar };
}
