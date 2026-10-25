// Página /prode/ (función nueva 6/8). RPC de la migración 149 · lógica pura en core/competicion/prode.js.
// Blindaje: sin sesión → aviso para entrar; sin migración → aviso «llega pronto» (no hay error); botones bloqueados al enviar;
// la BD vuelve a validar todo (cierre, conflicto de interés, tope). Refresco cada 60 s con la pestaña visible.
import { onSession, getState } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { validarPronostico, textoResultado, progresoSemana } from '../core/competicion/prode.js';

const $ = (id) => document.getElementById(id);
const sinFuncion = (e) => e?.code === 'PGRST202' || /could not find the function|schema cache/i.test(e?.message ?? '');
const fecha = (iso) => { if (!iso) return 'Sin hora fija'; try { return new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
let cargando = false;

function aviso(t) { const a = $('pr-aviso'); a.hidden = !t; a.innerHTML = t || ''; ['pr-semana', 'pr-abiertos-s', 'pr-mios-s', 'pr-ranking-s'].forEach((id) => { if (t) $(id).hidden = true; }); }

function tarjetaAbierto(p) {
  const mio = p.mio;
  const nombres = `${esc(p.a?.nombre ?? '—')} <span class="text-galaxy-400 mx-1">vs</span> ${esc(p.b?.nombre ?? '—')}`;
  const form = p.puedo ? `<form data-prode="${Number(p.reto_id)}" class="flex items-end gap-2 mt-2">
      <label class="text-[12px] text-gray-400">${esc(p.a?.nombre ?? 'A')}<input name="a" inputmode="numeric" maxlength="2" value="${mio ? mio.a : ''}" class="block w-14 rounded-lg bg-black/30 border border-galaxy-border px-2 py-1.5 text-sm text-white text-center" required></label>
      <span class="pb-2 text-gray-400">–</span>
      <label class="text-[12px] text-gray-400">${esc(p.b?.nombre ?? 'B')}<input name="b" inputmode="numeric" maxlength="2" value="${mio ? mio.b : ''}" class="block w-14 rounded-lg bg-black/30 border border-galaxy-border px-2 py-1.5 text-sm text-white text-center" required></label>
      <button class="btn ${mio ? 'btn-ghost' : 'btn-primary'} !min-h-9 !text-xs">${mio ? 'Cambiar' : 'Guardar'}</button></form>`
    : '<p class="text-[12px] text-gray-400 mt-2"><i class="fa-solid fa-lock mr-1"></i>Juegas o eres host en este duelo: no puedes pronosticarlo.</p>';
  return `<article class="glass-panel rounded-2xl p-3">
    <div class="flex flex-wrap items-center gap-2"><p class="font-display font-bold text-white uppercase text-sm flex-1 min-w-0">${nombres}</p>
      <span class="text-[12px] text-gray-400">${esc(fecha(p.fecha))}${p.tam_a > 1 || p.tam_b > 1 ? ` · ${Number(p.tam_a)}v${Number(p.tam_b)}` : ''} · ${Number(p.pronosticos) || 0} pronóstico${p.pronosticos === 1 ? '' : 's'}</span></div>
    ${mio ? `<p class="text-[12px] text-ok mt-1"><i class="fa-solid fa-check mr-1"></i>Tu pronóstico: ${Number(mio.a)} – ${Number(mio.b)}</p>` : ''}${form}</article>`;
}
function tarjetaMio(m) {
  const res = m.res_a != null ? `${Number(m.res_a)} – ${Number(m.res_b)}` : '—';
  const color = m.puntos === 10 ? 'text-amber-300' : m.puntos === 3 ? 'text-ok' : 'text-gray-400';
  return `<article class="glass-panel rounded-xl p-3 flex flex-wrap items-center gap-2 text-sm">
    <span class="flex-1 min-w-0 text-white">${esc(m.nombre_a ?? '—')} vs ${esc(m.nombre_b ?? '—')}</span>
    <span class="text-[12px] text-gray-400">Tú: <b class="text-white">${Number(m.a)} – ${Number(m.b)}</b> · Final: <b class="text-white">${res}</b></span>
    <span class="text-[12px] ${color} w-full sm:w-auto">${esc(textoResultado(m))}</span></article>`;
}

async function cargar() {
  if (cargando) return; cargando = true;
  try {
    if (!getState().session) { aviso('<i class="fa-solid fa-right-to-bracket mr-1"></i>Entra con tu cuenta para jugar al prode.'); return; }
    const [t, rk] = await Promise.all([supabase.rpc('prode_tablero'), supabase.rpc('prode_ranking_semana')]);
    if (t.error) { if (sinFuncion(t.error)) { aviso('<i class="fa-solid fa-hourglass-half mr-1"></i>El prode llega muy pronto: falta activarlo en la base de datos.'); return; } throw t.error; }
    const d = t.data ?? {};
    if (d.activo === false) { aviso('<i class="fa-solid fa-pause mr-1"></i>El prode está en pausa por el staff. Vuelve más tarde.'); return; }
    aviso('');
    const s = progresoSemana(d.ganado_semana, d.tope ?? 100);
    $('pr-semana').hidden = false;
    $('pr-semana-txt').textContent = `${s.ganado} / ${s.tope} ascuas · ${Number(d.puntos_semana) || 0} puntos${s.lleno ? ' · tope lleno' : ''}`;
    $('pr-barra').setAttribute('aria-valuenow', String(s.ganado)); $('pr-barra').firstElementChild.style.width = `${s.pct}%`;
    const ab = Array.isArray(d.abiertos) ? d.abiertos : [];
    $('pr-abiertos-s').hidden = false;
    $('pr-abiertos').innerHTML = ab.length ? ab.map(tarjetaAbierto).join('') : '<p class="text-center py-6 text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">No hay duelos agendados por ahora. Cuando alguien agende uno, aparecerá aquí.</p>';
    const mios = Array.isArray(d.mios) ? d.mios : [];
    $('pr-mios-s').hidden = !mios.length; $('pr-mios').innerHTML = mios.map(tarjetaMio).join('');
    const r = !rk.error && Array.isArray(rk.data) ? rk.data : [];
    $('pr-ranking-s').hidden = !r.length;
    $('pr-ranking').innerHTML = r.map((x, i) => `<li class="flex items-center gap-2 text-sm"><span class="w-6 text-right text-[12px] text-gray-400">${i + 1}.</span><span class="flex-1 min-w-0 truncate text-white">${esc(x.nombre ?? 'Jugador')}</span><b class="text-galaxy-400">${Number(x.puntos)}</b><span class="text-[12px] text-gray-400">pts · ${Number(x.exactos)} exacto${x.exactos === 1 ? '' : 's'}</span></li>`).join('');
  } catch (e) {
    console.error('[prode]', e);
    aviso('No se pudo cargar el prode. <button type="button" id="pr-reintentar" class="btn btn-ghost !min-h-9 ml-2">Reintentar</button>');
  } finally { cargando = false; }
}

document.addEventListener('click', (e) => { if (e.target.closest('#pr-reintentar')) cargar(); });
$('pr-abiertos').addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-prode]'); if (!f) return; e.preventDefault();
  const fd = new FormData(f); const v = validarPronostico(fd.get('a'), fd.get('b'));
  if (!v.ok) { toast(v.error, 'error'); return; }
  const b = f.querySelector('button'); if (b.disabled) return; b.disabled = true;
  try {
    const { error } = await supabase.rpc('prode_pronosticar', { p_reto: Number(f.dataset.prode), p_goles_a: v.a, p_goles_b: v.b });
    if (error) throw error;
    toast('Pronóstico guardado.', 'ok'); await cargar();
  } catch (err) { toast(err?.message || 'No se pudo guardar.', 'error'); b.disabled = false; }
});
onSession(() => cargar());
setInterval(() => { if (!document.hidden) cargar(); }, 60000);
