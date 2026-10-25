// Página /rivalidad/?a=ID&b=ID — ficha cara a cara (migración 153; lógica pura en core/competicion/rivalidad.js).
// Blindaje: ids inválidos → mensaje claro; perfil privado → lo dice la BD; sin la función → aviso; error → Reintentar.
import { onSession } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { resumenRivalidad, letraDe, idsDeUrl } from '../core/competicion/rivalidad.js';

const $ = (id) => document.getElementById(id);
const IDS = idsDeUrl(location.search);
const fecha = (iso) => { try { return new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const COLOR = { G: 'bg-ok/20 text-ok border-ok/50', E: 'bg-white/5 text-gray-300 border-galaxy-border', P: 'bg-bad/20 text-bad border-bad/50' };

function lado(j, cls) {
  const av = safeUrl(j?.avatar_url);
  return `<a href="${esc(href(j?.username ? `perfil/?u=${encodeURIComponent(j.username)}` : 'perfil/'))}" class="flex flex-col items-center gap-1 min-w-0 flex-1 ${cls}">
    ${av ? `<img src="${esc(av)}" alt="" width="64" height="64" class="w-16 h-16 rounded-full object-cover border-2 border-galaxy-border">` : '<span class="w-16 h-16 rounded-full bg-galaxy-600/30 grid place-items-center"><i class="fa-solid fa-user text-galaxy-400 text-xl"></i></span>'}
    <b class="font-display text-white uppercase text-sm truncate max-w-full">${esc(j?.nombre ?? 'Jugador')}</b></a>`;
}

async function cargar() {
  const c = $('rv-contenido');
  if (!IDS) { c.innerHTML = '<p class="text-center py-10 text-gray-300 text-sm">Falta elegir a los dos jugadores. Entra desde el perfil de alguien → «Rivalidad», o desde Mis partidos → tus rivales.</p>'; return; }
  try {
    const { data, error } = await supabase.rpc('rivalidad', { p_a: IDS.a, p_b: IDS.b });
    if (error) {
      if (error.code === 'PGRST202') { c.innerHTML = '<p class="text-center py-10 text-gray-300 text-sm">La ficha de rivalidad llega muy pronto.</p>'; return; }
      throw error;
    }
    const r = resumenRivalidad(data);
    if (!r.visible) { c.innerHTML = `<p class="text-center py-10 text-gray-300 text-sm">${esc(r.motivo)}</p>`; return; }
    $('rv-titulo').innerHTML = `<i class="fa-solid fa-scale-balanced text-galaxy-400 mr-2"></i>${esc(r.na)} vs ${esc(r.nb)}`;
    document.title = `${r.na} vs ${r.nb} · Rivalidad`;
    const ult = Array.isArray(data.ultimos) ? data.ultimos : [];
    const mayor = (m, quien, deB) => m ? `<p class="text-[12px] text-gray-400">Mayor goleada de ${esc(quien)}: <b class="text-white">${deB ? `${Number(m.gb)}–${Number(m.ga)}` : `${Number(m.ga)}–${Number(m.gb)}`}</b> (${esc(fecha(m.fecha))})</p>` : '';   // cada uno, con sus goles primero
    c.innerHTML = `<section class="glass-panel rounded-2xl p-4 space-y-4">
        <div class="flex items-center gap-3">${lado(data.a, '')}
          <div class="text-center shrink-0"><p class="font-display font-extrabold text-3xl text-white tabular-nums">${r.a} <span class="text-gray-500">-</span> ${r.b}</p>
            <p class="text-[12px] text-gray-400">${r.e} empate${r.e === 1 ? '' : 's'} · ${r.jugados} jugado${r.jugados === 1 ? '' : 's'}</p></div>
          ${lado(data.b, '')}</div>
        ${r.jugados ? `<div class="flex h-3 rounded-full overflow-hidden bg-white/10" role="img" aria-label="${r.a} victorias de ${esc(r.na)}, ${r.e} empates, ${r.b} victorias de ${esc(r.nb)}">
            <i class="block bg-ok" style="width:${r.pa}%"></i><i class="block bg-gray-500" style="width:${r.pe}%"></i><i class="block bg-bad" style="width:${r.pb}%"></i></div>` : ''}
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="rounded-xl border border-galaxy-border p-2"><p class="text-[12px] text-gray-400">Goles</p><p class="font-display text-white text-lg">${r.golesA} – ${r.golesB}</p></div>
          <div class="rounded-xl border border-galaxy-border p-2"><p class="text-[12px] text-gray-400">${esc(r.domina)}</p><p class="font-display text-amber-300 text-sm">${esc(r.racha || '—')}</p></div>
        </div>
        ${mayor(data.mayor_a, r.na, false)}${mayor(data.mayor_b, r.nb, true)}
        ${data.primero ? `<p class="text-[12px] text-gray-500">Primer duelo: ${esc(fecha(data.primero))} · último: ${esc(fecha(data.ultimo))}</p>` : ''}
      </section>
      <section class="space-y-2"><h2 class="text-base font-display font-bold text-white uppercase tracking-wider border-b border-galaxy-border pb-2">Últimos partidos</h2>
        ${ult.length ? `<ol class="grid gap-2">${ult.map((p) => { const l = letraDe(p); return `<li class="glass-panel rounded-xl px-3 py-2 flex items-center gap-3 text-sm">
            <span class="w-8 h-8 rounded-lg border grid place-items-center font-display font-bold ${COLOR[l]}">${l}</span>
            <span class="flex-1 text-white tabular-nums">${esc(r.na)} <b>${Number(p.ga)} – ${Number(p.gb)}</b> ${esc(r.nb)}${p.equipos ? ' <span class="text-[12px] text-gray-400">(en equipo)</span>' : ''}</span>
            <span class="text-[12px] text-gray-400">${esc(fecha(p.fecha))}</span></li>`; }).join('')}</ol>`
          : '<p class="text-center py-6 text-gray-400 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">Todavía no hay duelos confirmados entre los dos. <a class="underline" href="' + esc(href('duelos/')) + '">Lanza un reto</a>.</p>'}
      </section>`;
  } catch (e) {
    console.error('[rivalidad]', e);
    c.innerHTML = '<p class="text-center py-10 text-gray-300 text-sm">No se pudo cargar. <button type="button" id="rv-reintentar" class="btn btn-ghost !min-h-9 ml-2">Reintentar</button></p>';
    $('rv-reintentar')?.addEventListener('click', cargar);
  }
}
onSession(() => cargar());
