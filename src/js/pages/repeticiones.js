// Página /repeticiones/: «Mejor gol de la semana» (migración 155). Los videos se abren en su sitio (sin incrustar: más liviano y seguro).
import { onSession, getState } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { sitioDe } from '../core/competicion/repeticiones.js';
import { cartaJuegoHTML, pruebaJuego } from '../core/sistema/cartaJuego.js';

const $ = (id) => document.getElementById(id);
let ocupado = false;

function tarjeta(g, miVoto, conSesion, i) {
  const s = sitioDe(g.url); const elegido = Number(g.id) === Number(miVoto);
  return `<li class="glass-panel rounded-2xl p-3 flex items-center gap-3 ${elegido ? 'border border-amber-400/60' : ''}">
    <span class="w-8 text-center font-display font-bold ${i === 0 && g.votos > 0 ? 'text-amber-300' : 'text-gray-500'}">${i + 1}</span>
    <div class="flex-1 min-w-0"><a class="block truncate text-white font-bold hover:underline" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid ${s.icono} text-galaxy-400 mr-1" aria-hidden="true"></i>${esc(g.titulo || 'Gol')}${g.minuto != null ? ` · ${Number(g.minuto)}'` : ''}</a>
      <p class="text-[12px] text-gray-400">${esc(g.autor ?? '')} · ${esc(s.nombre)} · ${Number(g.votos) || 0} voto${g.votos === 1 ? '' : 's'}</p></div>
    ${!conSesion ? '' : g.mio ? '<span class="text-[12px] text-gray-500">Tu gol</span>'
      : `<button type="button" data-mg-votar="${Number(g.id)}" aria-pressed="${elegido}" class="btn ${elegido ? 'btn-primary' : 'btn-ghost'} !min-h-9 !text-xs"><i class="fa-solid fa-star"></i> ${elegido ? 'Tu voto' : 'Votar'}</button>`}</li>`;
}

async function cargar() {
  const c = $('mg-contenido');
  try {
    const { data, error } = await supabase.rpc('mejor_gol_semana');
    if (error) { c.innerHTML = `<p class="text-center py-10 text-gray-300 text-sm">${error.code === 'PGRST202' ? 'El mejor gol de la semana llega muy pronto.' : 'No se pudo cargar.'}</p>`; return; }
    const goles = Array.isArray(data?.goles) ? data.goles : [];
    const conSesion = Boolean(getState().session);
    const ant = data?.ganador_anterior;
    // PRUEBA «carta de juego» (ronda 391): el ganador de la semana pasada como carta (lleva al video)
    const cartaAnt = ant && pruebaJuego() ? `<div class="pj-carta-caja">${cartaJuegoHTML({ etiqueta: 'Mejor gol de la semana', nombre: ant.autor ?? 'Jugador', sub: ant.titulo || 'Gol', cifra: Number(ant.votos), cifraEt: 'Votos', puesto: '🏆', href: ant.url, externo: true })}</div>` : '';
    c.innerHTML = `${cartaAnt}${ant && !cartaAnt ? `<section class="glass-panel rounded-2xl p-4"><p class="text-[12px] text-amber-300 uppercase font-display font-bold">🏆 Ganador de la semana pasada</p>
        <a class="block text-white font-bold mt-1 hover:underline" href="${esc(ant.url)}" target="_blank" rel="noopener noreferrer">${esc(ant.titulo || 'Gol')}</a>
        <p class="text-[12px] text-gray-400">${esc(ant.autor ?? '')} · ${Number(ant.votos)} votos</p></section>` : ''}
      <section class="space-y-2"><h2 class="text-base font-display font-bold text-white uppercase tracking-wider border-b border-galaxy-border pb-2">Candidatos de esta semana</h2>
        ${goles.length ? `<ol class="grid gap-2">${goles.map((g, i) => tarjeta(g, data.mi_voto, conSesion, i)).join('')}</ol>`
          : '<p class="text-center py-6 text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">Aún no hay goles esta semana. Sube el tuyo desde Mis partidos → Repeticiones.</p>'}
        ${conSesion ? '' : '<p class="text-[12px] text-gray-400">Entra con tu cuenta para votar.</p>'}</section>`;
  } catch (e) { console.error('[mejor gol]', e); c.innerHTML = '<p class="text-center py-10 text-gray-300 text-sm">No se pudo cargar.</p>'; }
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-mg-votar]'); if (!b || ocupado) return;
  ocupado = true; b.disabled = true;
  try { const { error } = await supabase.rpc('mejor_gol_votar', { p_rep: Number(b.dataset.mgVotar) }); if (error) throw error; toast('Voto guardado.', 'ok'); }
  catch (err) { toast(err?.message || 'No se pudo votar.', 'error'); }
  finally { ocupado = false; cargar(); }
});
onSession(() => cargar());
