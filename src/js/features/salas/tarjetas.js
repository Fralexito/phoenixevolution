// Tarjetas de salas Smash Soda (migración 067): «Retos en el radar» (aceptar = rival, mando 2) y «Salas en vivo» (Ver = espectador).
// Se recarga sola: al cambiar cualquier sala (Realtime, con espera de 1 s para agrupar) y cada 25 s mientras la pestaña está visible.
// Si la migración 067 no está aplicada, el bloque se queda oculto sin romper la página.
import { supabase } from '../../core/supabase.js';
import { onSession } from '../../core/session.js';
import { toast } from '../../core/toast.js';
import { escapeHTML, safeUrl } from '../../core/dom.js';
import { pildoraSemaforo, textoErrorUnirse } from '../../core/salas.js';
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

function tarjetaRadar(s) {
  const boton = s.mia
    ? '<span class="text-[11px] text-gray-400 uppercase font-bold">Tu sala · esperando rival</span>'
    : `<button type="button" class="btn btn-primary !min-h-9 !text-xs" data-aceptar="${escapeHTML(s.sala_id)}"><i class="fa-solid fa-handshake"></i> Aceptar</button>`;
  return `<article class="bg-galaxy-panel rounded-xl border border-galaxy-400/30 p-3 flex items-center gap-3">
    ${avatar(s.host)}
    <div class="min-w-0 flex-1">
      <p class="text-sm text-white font-bold truncate">${escapeHTML(s.host?.nombre ?? 'Host')} ${s.host?.amigo ? '<i class="fa-solid fa-user-group text-galaxy-400 text-[11px]" title="Amigo"></i>' : ''}
        <span class="ml-1 text-[10px] uppercase tracking-wider text-galaxy-400 bg-galaxy-600/20 px-1.5 py-0.5 rounded">Smash Soda</span></p>
      <p class="text-[12px] text-gray-300 truncate">${escapeHTML(juegoTxt(s))}${s.region ? ` · ${escapeHTML(s.region)}` : ''}</p>
      <div class="mt-1">${pildora(s.semaforo)}</div>
    </div>
    ${boton}
  </article>`;
}

function tarjetaVivo(s) {
  const lleno = s.espectadores >= s.limite_espectadores;
  const rival = s.rival?.nombre ?? (s.reto_id ? 'reto' : 'esperando rival');
  const boton = s.soy_espectador
    ? `<button type="button" class="btn !min-h-9 !text-xs" data-ver="${escapeHTML(s.sala_id)}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir</button>`
    : `<button type="button" class="btn btn-primary !min-h-9 !text-xs" data-ver="${escapeHTML(s.sala_id)}" ${lleno ? 'disabled' : ''}><i class="fa-solid fa-eye"></i> ${lleno ? 'Lleno' : 'Ver'}</button>`;
  return `<article class="bg-galaxy-panel rounded-xl border border-galaxy-border p-3 flex items-center gap-3">
    ${avatar(s.host)}
    <div class="min-w-0 flex-1">
      <p class="text-sm text-white font-bold truncate">${escapeHTML(s.host?.nombre ?? 'Host')} <span class="text-galaxy-400 mx-1">vs</span> ${escapeHTML(rival)}</p>
      <p class="text-[12px] text-gray-300 truncate">${escapeHTML(juegoTxt(s))}${s.region ? ` · ${escapeHTML(s.region)}` : ''}</p>
      <div class="mt-1 flex flex-wrap items-center gap-2">
        ${s.estado === 'en_partida' ? '<span class="text-[11px] font-bold text-rose-300"><i class="fa-solid fa-circle text-[8px] animate-pulse"></i> EN PARTIDO</span>' : '<span class="text-[11px] text-gray-400">Calentando</span>'}
        <span class="text-[11px] text-gray-400"><i class="fa-solid fa-eye"></i> ${Number(s.espectadores) || 0}/${Number(s.limite_espectadores) || 0}</span>
        ${pildora(s.semaforo)}
      </div>
    </div>
    ${boton}
  </article>`;
}

/** Abre el enlace de Parsec/Smash Soda que entregó el servidor. */
function abrirEnlace(r, rol) {
  const url = safeUrl(r?.enlace, { allowParsec: true });
  if (!url) { toast(rol === 'rival' ? 'Eres el rival. El host aún no compartió el enlace: te llegará en la app.' : 'Quedaste como espectador. El host aún no compartió el enlace.', 'info'); return; }
  window.open(url, '_blank', 'noopener');
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
