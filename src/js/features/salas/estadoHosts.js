// «Estado de los hosts» (función nueva 3/8): qué PCs con Phoenix Link están encendidas, su ping típico y si tienen sala.
// RPC hosts_estado (migración 146) · lógica pura en core/comunidad/estadoHosts.js. Se pinta en «Salas en vivo».
// Blindaje: sin sesión → no pide nada; si la función no existe (base sin 146) la sección se oculta sin error;
// otros fallos → mensaje y botón Reintentar; refresco cada 60 s solo con la pestaña visible y sin pedidos encimados.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc, safeUrl } from '../../core/sistema/dom.js';
import { estadoDe, nivelPing, haceCuanto, prepararHosts, resumenTexto } from '../../core/comunidad/estadoHosts.js';

const COLOR_PING = { bien: 'text-ok', regular: 'text-amber-300', malo: 'text-bad', sin: 'text-gray-400' };
const noExiste = (e) => e?.code === 'PGRST202' || /hosts_estado/.test(e?.message ?? '') && /not find|does not exist/i.test(e?.message ?? '');

function fila(h) {
  const e = estadoDe(h.estado); const p = nivelPing(h.ping_ms);
  const av = safeUrl(h.host.avatar_url);
  const detalle = h.estado === 'desconectado' ? `Visto ${esc(haceCuanto(h.visto))}` : [h.region, h.juego].filter(Boolean).map(esc).join(' · ') || 'Phoenix Link activo';
  return `<li class="glass-panel rounded-xl p-3 flex items-center gap-3">
    ${av ? `<img src="${esc(av)}" alt="" width="40" height="40" loading="lazy" class="w-10 h-10 rounded-full object-cover flex-none">` : '<span class="w-10 h-10 rounded-full bg-galaxy-600/30 grid place-items-center flex-none"><i class="fa-solid fa-desktop text-galaxy-400"></i></span>'}
    <div class="min-w-0 flex-1">
      <p class="font-display font-bold text-white text-sm truncate">${esc(h.host.nombre ?? 'Host')}</p>
      <p class="text-[12px] text-gray-400 truncate">${detalle}</p>
    </div>
    <div class="text-right flex-none space-y-1">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[12px] font-display font-bold uppercase ${e.clase}"><i class="fa-solid ${e.icono}" aria-hidden="true"></i>${e.texto}</span>
      <p class="text-[12px] ${COLOR_PING[p.nivel]}" title="Ping típico de sus jugadores en los últimos 7 días">${esc(p.texto)}</p>
    </div></li>`;
}

/** Monta la sección. Devuelve { recargar }. */
export function montarEstadoHosts({ seccion, lista, resumen }) {
  let ocupado = false; let apagado = false;
  async function recargar() {
    if (ocupado || apagado || !seccion) return;
    ocupado = true;
    try {
      const { data, error } = await supabase.rpc('hosts_estado');
      if (error) {
        if (noExiste(error)) { apagado = true; seccion.hidden = true; return; }
        throw error;
      }
      const r = prepararHosts(data);
      seccion.hidden = false;
      resumen.textContent = resumenTexto(r);
      lista.innerHTML = r.total ? r.lista.map(fila).join('')
        : '<li class="text-center py-6 text-gray-400 text-xs">Cuando un host instale Phoenix Link, aparecerá aquí.</li>';
    } catch (e) {
      console.error('[estadoHosts]', e);
      seccion.hidden = false;
      lista.innerHTML = '<li class="text-center py-6 text-xs text-gray-300">No se pudo cargar el estado de los hosts. <button type="button" class="btn btn-ghost !min-h-9 ml-2" data-hosts-reintentar>Reintentar</button></li>';
      lista.querySelector('[data-hosts-reintentar]')?.addEventListener('click', () => recargar());
    } finally { ocupado = false; }
  }
  return { recargar };
}
