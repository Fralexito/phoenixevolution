// Franja de reconocimientos de Jugadores: Jugador de la fecha, Más en forma, Revelación (datos reales de la liga) y
// «Jugador de la semana» (voto de la comunidad: un voto por usuario y semana, guardado en `votos_semana`).
import { supabase } from '../core/supabase.js';
import { getState, onSession } from '../core/session.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { href } from '../core/config.js';
import { reconocimientos, semanaActual } from '../core/destacados.js';

const TARJETAS = [
  { k: 'fecha', titulo: 'Jugador de la fecha', icono: 'fa-medal', color: '#fbbf24' },
  { k: 'forma', titulo: 'Más en forma', icono: 'fa-fire', color: '#fb7185' },
  { k: 'revelacion', titulo: 'Revelación', icono: 'fa-seedling', color: '#34d399' },
];
const avatar = (p) => (safeImg(p.foto_url) ? `<img src="${escapeHTML(safeImg(p.foto_url))}" alt="" loading="lazy" class="w-12 h-12 rounded-full object-cover object-top border border-galaxy-400/50 shrink-0">` : '<span class="w-12 h-12 rounded-full bg-galaxy-600/30 border border-galaxy-400/40 grid place-items-center text-galaxy-400/70 shrink-0"><i class="fa-solid fa-user-astronaut"></i></span>');
const nombreHTML = (p) => `<a href="${href(`jugador/?id=${encodeURIComponent(p.id)}`)}" class="font-display font-bold text-white uppercase tracking-wide hover:text-galaxy-400 truncate">${escapeHTML(p.nombre)}</a>${p.apodo ? `<span class="block text-[11px] text-galaxy-400 font-bold truncate">«${escapeHTML(p.apodo)}»</span>` : ''}`;

function tarjeta(t, r) {
  return `<article class="rounded-xl border bg-black/25 p-4 flex flex-col gap-3" style="border-color:${t.color}55">
    <div class="flex items-center gap-2 text-[11px] font-display font-bold uppercase tracking-widest" style="color:${t.color}"><i class="fa-solid ${t.icono}"></i>${t.titulo}</div>
    ${r ? `<div class="flex items-center gap-3 min-w-0">${avatar(r.p)}<div class="min-w-0">${nombreHTML(r.p)}</div></div><p class="text-xs text-gray-300 leading-relaxed">${escapeHTML(r.detalle)}</p>`
      : '<p class="text-xs text-gray-500">Aparecerá cuando haya resultados suficientes en la liga.</p>'}
  </article>`;
}

/** Conteo de votos de la semana (función pública de la BD) y mi voto (RLS: solo veo los míos). Nunca lanza. */
async function leerVotos(semana, uid) {
  try {
    const [c, m] = await Promise.all([
      supabase.rpc('conteo_votos_semana', { p_semana: semana }),
      uid ? supabase.from('votos_semana').select('id, jugador_id').eq('semana', semana).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (c.error) throw c.error;
    return { conteo: c.data ?? [], mio: m.error ? null : m.data };
  } catch (e) { console.error('[votos] leer:', e); return { conteo: [], mio: null, error: true }; }
}

function panelVoto(jugadores, v, sesion) {
  const por = new Map(jugadores.map((p) => [p.id, p]));
  const top = v.conteo.filter((x) => por.has(x.jugador_id)).slice(0, 3);
  const miVoto = v.mio ? por.get(v.mio.jugador_id) : null;
  return `<article class="rounded-xl border border-galaxy-400/50 bg-galaxy-600/10 p-4 flex flex-col gap-3 sm:col-span-2 xl:col-span-1" style="box-shadow:0 0 22px rgba(128,0,255,.18)">
    <div class="flex items-center gap-2 text-[11px] font-display font-bold uppercase tracking-widest text-galaxy-400"><i class="fa-solid fa-ranking-star"></i>Jugador de la semana · voto de la comunidad</div>
    ${v.error ? '<p class="text-xs text-gray-500">No se pudieron cargar los votos. Intenta más tarde.</p>'
      : top.length ? `<ol class="space-y-1.5">${top.map((x, i) => `<li class="flex items-center gap-2 text-sm"><b class="w-5 text-galaxy-400">${i + 1}</b><span class="flex-1 min-w-0 truncate text-gray-100">${escapeHTML(por.get(x.jugador_id).nombre)}</span><b class="text-white tabular-nums">${x.votos}</b></li>`).join('')}</ol>`
        : '<p class="text-xs text-gray-400">Aún nadie ha votado esta semana. ¡Sé el primero!</p>'}
    ${sesion
      ? `<div class="flex gap-2"><select data-voto-sel aria-label="Elegir jugador" class="field flex-1 min-w-0 !min-h-9"><option value="">${miVoto ? `Tu voto: ${escapeHTML(miVoto.nombre)}` : 'Elige a tu jugador…'}</option>${[...jugadores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((p) => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nombre)}</option>`).join('')}</select>
          <button type="button" data-voto-go class="btn btn-primary !min-h-9 !px-4">${miVoto ? 'Cambiar' : 'Votar'}</button></div>`
      : '<p class="text-xs text-gray-400"><i class="fa-solid fa-lock mr-1"></i>Inicia sesión para votar. Un voto por semana.</p>'}
  </article>`;
}

/** Pinta la franja dentro de `el`. `edicion` = edición de liga más reciente (o null). */
export function montarReconocimientos(el, jugadores, edicion) {
  if (!el) return;
  const r = reconocimientos(jugadores, edicion); const semana = semanaActual();
  let sesion = false; let votos = { conteo: [], mio: null };
  const pintar = () => {
    el.innerHTML = `<div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">${TARJETAS.map((t) => tarjeta(t, r[t.k])).join('')}${panelVoto(jugadores, votos, sesion)}</div>`;
  };
  const cargar = async () => { const uid = getState().session?.user?.id; sesion = !!uid; votos = await leerVotos(semana, uid); pintar(); };
  el.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-voto-go]'); if (!go) return;
    const id = el.querySelector('[data-voto-sel]')?.value; if (!id) { toast('Elige primero a un jugador.', 'info'); return; }
    const uid = getState().session?.user?.id; if (!uid) { toast('Inicia sesión para votar.', 'info'); return; }
    go.disabled = true;
    try {
      if (votos.mio) { const d = await supabase.from('votos_semana').delete().eq('id', votos.mio.id); if (d.error) throw d.error; }
      const { error } = await supabase.from('votos_semana').insert({ semana, jugador_id: id, votante_id: uid });
      if (error) throw error;
      toast('¡Voto registrado!', 'ok'); await cargar();
    } catch (err) {
      console.error('[votos] votar:', err);
      toast(err?.code === '42501' ? 'Solo se puede votar en la semana actual.' : 'No se pudo registrar tu voto. Intenta de nuevo.', 'error'); go.disabled = false;
    }
  });
  pintar(); onSession(() => { cargar(); });
}
