// Página /online/: «Vincular mi PES» + «Divisiones online». Esquema: pages/online → features/online/api → core/online (puro).
import { onSession } from '../core/sistema/session.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { vincularPES, rankingOnline } from '../features/online/api.js';
import { agruparPorDivision, limpiarCodigo } from '../core/online/divisiones.js';

const $ = (id) => document.getElementById(id);

function pintarRanking(filas) {
  const grupos = agruparPorDivision(filas);
  $('on-divs').innerHTML = grupos.map((g, i) => `<details class="glass-panel rounded-2xl on-div" ${i === 0 ? 'open' : ''}>
    <summary class="px-4 py-3 cursor-pointer flex items-center gap-2"><b class="font-display text-white tracking-wider">${escapeHTML(g.division)}</b>
      <span class="text-[12px] text-gray-400">${g.jugadores.length} jugador${g.jugadores.length === 1 ? '' : 'es'}</span></summary>
    <div class="overflow-x-auto px-2 pb-3"><table class="w-full text-xs text-left"><thead><tr class="text-[12px] uppercase tracking-widest text-gray-400">
      <th class="px-2 py-1">#</th><th class="px-2 py-1">Jugador</th><th class="px-2 py-1">Rating</th><th class="px-2 py-1">SP</th><th class="px-2 py-1">G</th><th class="px-2 py-1">E</th><th class="px-2 py-1">P</th></tr></thead>
      <tbody>${g.jugadores.map((j) => `<tr class="border-t border-galaxy-border/40"><td class="px-2 py-1.5 text-galaxy-400 font-bold">${Number(j.puesto)}</td>
        <td class="px-2 py-1.5 text-white">${escapeHTML(j.nombre_jugador)}</td><td class="px-2 py-1.5">${Number(j.rating)}</td><td class="px-2 py-1.5">${Number(j.sp)}</td>
        <td class="px-2 py-1.5">${Number(j.victorias)}</td><td class="px-2 py-1.5">${Number(j.empates)}</td><td class="px-2 py-1.5">${Number(j.derrotas)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')
    || '<div class="glass-panel rounded-2xl p-8 text-center text-gray-400 text-xs">Todavía nadie jugó online. Cuando haya partidos, las divisiones aparecen aquí.</div>';
}

let cargando = false;
async function cargar() {
  if (cargando) return; cargando = true; $('on-error').hidden = true;
  try { pintarRanking(await rankingOnline()); }
  catch (e) { $('on-error-txt').textContent = e.message; $('on-error').hidden = false; }
  finally { cargando = false; }
}

$('on-reintentar').addEventListener('click', cargar);
$('on-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const cod = limpiarCodigo($('on-codigo').value);
  if (!cod) { toast('El código tiene 6 números (sale en los avisos del PES como «Tu código Phoenix»).', 'error'); return; }
  const b = $('on-vincular'); b.disabled = true;
  try {
    const club = await vincularPES(cod);
    $('on-ok').hidden = false; $('on-ok-txt').textContent = `¡Listo! Tu cuenta quedó unida a «${club}».`;
    $('on-codigo').value = ''; toast('PES vinculado.', 'ok'); cargar();
  } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
});
onSession(({ session }) => {
  const id = !!session?.user?.id;
  $('on-sinsesion').hidden = id; $('on-form-caja').hidden = !id;
});
cargar();
