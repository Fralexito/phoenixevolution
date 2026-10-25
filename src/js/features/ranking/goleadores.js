// «Goleadores de los duelos» en /ranking/ (función nueva 5/8). RPC goleadores_comunidad (migración 148).
// Solo cuentan duelos con marcador confirmado cuyos goles de Phoenix Link cuadran con ese marcador (lo decide la BD).
// Blindaje: sin sesión o sin migración → la sección no aparece; fallo → mensaje con Reintentar; cambio de periodo sin pedidos encimados.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { PERIODOS, prepararGoleadores } from '../../core/competicion/goleadoresLink.js';

const sinFuncion = (e) => e?.code === 'PGRST202' || /could not find the function|schema cache/i.test(e?.message ?? '');
const lista = (filas, unidad) => filas.length
  ? `<ol class="space-y-1">${filas.map((f) => `<li class="flex items-center gap-2 text-sm"><span class="w-6 text-right text-[12px] text-gray-400">${f.puesto}.</span><span class="flex-1 min-w-0 truncate text-white">${esc(f.nombre)}</span><b class="text-galaxy-400">${f.n}</b><span class="text-[12px] text-gray-400">${unidad}</span></li>`).join('')}</ol>`
  : '<p class="text-[12px] text-gray-400">Sin datos todavía.</p>';

export function montarGoleadores(seccion) {
  if (!seccion) return { cargar: () => {} };
  let dias = 30; let pedido = 0;
  const cuerpo = seccion.querySelector('[data-cuerpo]');
  seccion.querySelector('[data-periodos]').innerHTML = PERIODOS.map((p) => `<button type="button" class="adv-chip !min-h-9" data-dias="${p.dias ?? ''}" aria-pressed="${p.dias === dias}">${p.texto}</button>`).join('');
  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dias]');
    if (b) { dias = b.dataset.dias ? Number(b.dataset.dias) : null; seccion.querySelectorAll('[data-dias]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); cargar(); }
    if (e.target.closest('[data-gol-reintentar]')) cargar();
  });
  async function cargar() {
    const mio = ++pedido;
    try {
      const { data, error } = await supabase.rpc('goleadores_comunidad', { p_dias: dias, p_limite: 10 });
      if (mio !== pedido) return;
      if (error) { if (sinFuncion(error) || error.code === '42501' || /sesi[oó]n/i.test(error.message ?? '')) { seccion.hidden = true; return; } throw error; }
      const r = prepararGoleadores(data);
      seccion.hidden = false;
      cuerpo.innerHTML = !r.duelos
        ? '<p class="text-[12px] text-gray-400">Aún no hay duelos con goles de Phoenix Link en este periodo. Se llenará solo cuando los hosts jueguen con Link y los dos líderes confirmen el marcador.</p>'
        : `<div class="grid sm:grid-cols-2 gap-4"><div><h3 class="text-[12px] font-display font-bold uppercase text-gray-300 mb-2"><i class="fa-solid fa-futbol mr-1"></i>Goles</h3>${lista(r.goleadores, 'goles')}</div>
           <div><h3 class="text-[12px] font-display font-bold uppercase text-gray-300 mb-2"><i class="fa-solid fa-handshake-angle mr-1"></i>Asistencias</h3>${lista(r.asistentes, 'asist.')}</div></div>
           <p class="text-[12px] text-gray-500 mt-3">De ${r.duelos} duelo${r.duelos === 1 ? '' : 's'} con goles verificados.</p>`;
    } catch (e) {
      if (mio !== pedido) return;
      console.error('[goleadores]', e);
      seccion.hidden = false;
      cuerpo.innerHTML = '<p class="text-[12px] text-gray-300">No se pudo cargar. <button type="button" class="btn btn-ghost !min-h-9 ml-1" data-gol-reintentar>Reintentar</button></p>';
    }
  }
  return { cargar };
}
