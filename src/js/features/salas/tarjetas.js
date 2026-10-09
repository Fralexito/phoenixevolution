// Tarjetas de salas Smash Soda (migración 067): «Retos en el radar» (aceptar = rival, mando 2) y «Salas en vivo» (Ver = espectador).
// Se recarga sola: al cambiar cualquier sala (Realtime, con espera de 1 s para agrupar) y cada 25 s mientras la pestaña está visible.
// Si la migración 067 no está aplicada, el bloque se queda oculto sin romper la página.
import { supabase } from '../../core/supabase.js';
import { onSession } from '../../core/session.js';
import { toast } from '../../core/toast.js';
import { escapeHTML, safeUrl, parsecDirecto, abrirParsec } from '../../core/dom.js';
import { pildoraSemaforo, textoErrorUnirse } from '../../core/salas.js';
import { haceCuanto } from '../../core/notifs.js';
import { NOMBRE_APP } from '../../../data/site.js';
import { radarSalas, salasEnVivo, aceptarSala, verSala } from './api.js';

const SONDEO_MS = 25_000;
const juegoTxt = (s) => [s.juego, s.parche ? `(${s.parche})` : ''].filter(Boolean).join(' ') || 'Juego por definir';

function pildora(sem) {
  const p = pildoraSemaforo(sem);
  return `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${p.clase}" title="${escapeHTML(p.titulo)}"><i class="fa-solid fa-signal"></i> ${escapeHTML(p.texto)}</span>`;
}
function avatar(h) {
  const url = safeUrl(h?.avatar_url);
  return url ? `<img src="${escapeHTML(url)}" alt="" class="w-9 h-9 rounded-full object-cover shrink-0" loading="lazy">`
             : '<span class="w-9 h-9 rounded-full bg-galaxy-800 grid place-items-center shrink-0"><i class="fa-solid fa-user text-gray-500"></i></span>';
}

const MODO = { amistoso: 'Amistoso', torneo_privado: 'Torneo', oficial: 'Oficial' };
const chip = (html, cls = 'text-gray-300 border-galaxy-border bg-black/20') => `<span class="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md border ${cls}">${html}</span>`;
const fuenteTxt = { par: 'tu ping real con este host', host: 'promedio histórico del host', diagnostico: 'autodiagnóstico del host', sin_datos: 'sin mediciones aún' };

/** Una sola tarjeta para radar y «En vivo»: chips compactos arriba y los detalles en un desplegable. */
function tarjeta(s, tipo) {
  const enPartido = s.estado === 'en_partida';
  const estado = enPartido ? chip('<i class="fa-solid fa-circle text-[7px] text-rose-400 animate-pulse"></i> En partido', 'text-rose-200 border-rose-400/40 bg-rose-500/10')
    : s.rival ? chip('<i class="fa-solid fa-user-check"></i> Rival listo', 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10')
    : chip('<i class="fa-solid fa-hourglass-half"></i> Esperando rival', 'text-amber-200 border-amber-400/40 bg-amber-500/10');
  const espect = s.acepta_espectadores && s.limite_espectadores > 0 ? chip(`<i class="fa-solid fa-eye"></i> ${Number(s.espectadores) || 0}/${s.limite_espectadores}`) : '';
  const lleno = espect && s.espectadores >= s.limite_espectadores;
  const accion = tipo === 'radar'
    ? (s.mia ? '<span class="text-[11px] text-gray-400 uppercase font-bold">Tu sala</span>'
             : `<button type="button" class="btn btn-primary !min-h-9 !text-xs" data-aceptar="${escapeHTML(s.sala_id)}"><i class="fa-solid fa-handshake"></i> Aceptar</button>`)
    : `<button type="button" class="btn ${s.soy_espectador ? '' : 'btn-primary'} !min-h-9 !text-xs" data-ver="${escapeHTML(s.sala_id)}" ${lleno && !s.soy_espectador ? 'disabled' : ''}>
        <i class="fa-solid ${s.soy_espectador ? 'fa-arrow-up-right-from-square' : 'fa-eye'}"></i> ${s.soy_espectador ? 'Abrir' : lleno ? 'Lleno' : 'Ver'}</button>`;
  const sem = s.semaforo ?? {}; const dg = sem.diagnostico;
  const titulo = tipo === 'vivo' ? `${escapeHTML(s.host?.nombre ?? 'Host')} <span class="text-galaxy-400 mx-1">vs</span> ${escapeHTML(s.rival?.nombre ?? (s.reto_id ? 'reto' : '—'))}`
    : `${escapeHTML(s.host?.nombre ?? 'Host')} ${s.host?.amigo ? '<i class="fa-solid fa-user-group text-galaxy-400 text-[11px]" title="Amigo"></i>' : ''}`;
  return `<article class="bg-galaxy-panel rounded-xl border ${tipo === 'radar' ? 'border-galaxy-400/30' : 'border-galaxy-border'} p-3">
    <div class="flex items-center gap-3">
      ${avatar(s.host)}
      <div class="min-w-0 flex-1">
        <p class="text-sm text-white font-bold truncate">${titulo}
          <span class="ml-1 text-[10px] uppercase tracking-wider text-galaxy-400 bg-galaxy-600/20 px-1.5 py-0.5 rounded">${NOMBRE_APP}</span></p>
        <div class="mt-1 flex flex-wrap gap-1">
          ${estado}${pildora(sem)}
          ${s.parche || s.juego ? chip(`<i class="fa-solid fa-futbol"></i> ${escapeHTML(s.parche || s.juego)}`) : ''}
          ${s.region ? chip(`<i class="fa-solid fa-location-dot"></i> ${escapeHTML(s.region)}`) : ''}
          ${espect}
        </div>
      </div>
      ${accion}
    </div>
    <details class="mt-2 group">
      <summary class="text-[11px] text-gray-400 cursor-pointer select-none list-none flex items-center gap-1"><i class="fa-solid fa-chevron-down text-[9px] transition-transform group-open:rotate-180"></i> Detalles</summary>
      <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        <dt class="text-gray-500">Juego</dt><dd class="text-gray-200">${escapeHTML(juegoTxt(s))}</dd>
        <dt class="text-gray-500">Modo</dt><dd class="text-gray-200">${escapeHTML(MODO[s.modo] ?? s.modo ?? '—')}</dd>
        <dt class="text-gray-500">Plazas libres</dt><dd class="text-gray-200">${Number(s.plazas_libres) || 0}/${Number(s.plazas_total) || 0}</dd>
        <dt class="text-gray-500">Espectadores</dt><dd class="text-gray-200">${s.acepta_espectadores && s.limite_espectadores > 0 ? `${Number(s.espectadores) || 0}/${s.limite_espectadores}` : 'No admite'}</dd>
        <dt class="text-gray-500">Abierta</dt><dd class="text-gray-200">${escapeHTML(haceCuanto(s.abierta_en) ?? 'hace más de una semana')}</dd>
        <dt class="text-gray-500">Ping estimado</dt><dd class="text-gray-200">${sem.ping_ms != null ? `${Math.round(sem.ping_ms)} ms` : '—'} <span class="text-gray-500">(${escapeHTML(fuenteTxt[sem.fuente] ?? '—')})</span></dd>
        ${dg ? `<dt class="text-gray-500">Red del host</dt><dd class="text-gray-200">${dg.latencia_ms != null ? `${Math.round(dg.latencia_ms)} ms` : '—'}${dg.jitter_ms != null ? ` · jitter ${Math.round(dg.jitter_ms)}` : ''}${dg.subida_kbps ? ` · subida ${(dg.subida_kbps / 1000).toFixed(1)} Mbps` : ''}</dd>` : ''}
      </dl>
    </details>
  </article>`;
}
const tarjetaRadar = (s) => tarjeta(s, 'radar');
const tarjetaVivo = (s) => tarjeta(s, 'vivo');

/** Abre el enlace de Parsec/Smash Soda que entregó el servidor. */
function abrirEnlace(r, rol) {
  const url = safeUrl(r?.enlace, { allowParsec: true });
  if (!url) { toast(rol === 'rival' ? 'Eres el rival. El host aún no compartió el enlace: te llegará en la app.' : 'Quedaste como espectador. El host aún no compartió el enlace.', 'info'); return; }
  const directo = parsecDirecto(url);
  if (directo) abrirParsec(directo, url); else window.open(url, '_blank', 'noopener');
}

/**
 * @param {{ contenedor: HTMLElement, tipo: 'radar'|'vivo', alContar?: (n: number) => void }} op
 * @returns {() => void} desmontar
 */
export function montarTarjetasSalas({ contenedor, tipo, alContar = () => {} }) {
  if (!contenedor) return () => {};
  let conSesion = false; let vivo = true; let espera = null; let canal = null;
  const cargar = async () => {
    if (!vivo || !conSesion || document.hidden) return;
    try {
      const lista = tipo === 'radar' ? await radarSalas() : await salasEnVivo();
      contenedor.innerHTML = lista.map(tipo === 'radar' ? tarjetaRadar : tarjetaVivo).join('');
      contenedor.hidden = !lista.length;
      alContar(lista.length);
    } catch (e) {
      console.warn(`[salas:${tipo}]`, e.message);
      contenedor.hidden = true; alContar(0);
    }
  };
  const pronto = () => { clearTimeout(espera); espera = setTimeout(cargar, 1000); };

  contenedor.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-aceptar], [data-ver]');
    if (!b || b.disabled) return;
    const id = b.dataset.aceptar ?? b.dataset.ver; const rival = 'aceptar' in b.dataset;
    b.disabled = true;
    try {
      const r = rival ? await aceptarSala(id) : await verSala(id);
      if (rival) toast('¡Reto aceptado! Eres el jugador 2 de esta sala.', 'ok');
      abrirEnlace(r, r?.rol);
    } catch (e) { toast(textoErrorUnirse(e.message), 'error'); }
    finally { b.disabled = false; cargar(); }
  });

  const intervalo = setInterval(cargar, SONDEO_MS);
  const alVer = () => { if (!document.hidden) cargar(); };
  document.addEventListener('visibilitychange', alVer);
  try {
    canal = supabase.channel(`salas-tarjetas-${tipo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, pronto).subscribe();
  } catch (e) { console.warn('[salas] realtime:', e); }
  onSession((st) => { conSesion = !!st?.session; if (conSesion) cargar(); else { contenedor.hidden = true; alContar(0); } });

  return () => {
    vivo = false; clearInterval(intervalo); clearTimeout(espera);
    document.removeEventListener('visibilitychange', alVer);
    if (canal) supabase.removeChannel(canal);
  };
}
