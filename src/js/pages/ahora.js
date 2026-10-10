// «Ahora mismo»: cifras en vivo + retos esperando rival + salas para mirar + racha + ranking semanal.
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { montarTarjetasSalas } from '../features/salas/tarjetas.js';
import { montarRacha, montarRankingSemanal } from '../features/enganche.js';

const $ = (id) => document.getElementById(id);
const cifra = (n, t, color) => `<span class="px-2 py-1 rounded-lg border ${color}"><b class="text-white">${n}</b> ${escapeHTML(t)}</span>`;

async function cifras() {
  if (document.hidden) return;
  try {
    const { data } = await supabase.rpc('ticker_comunidad');
    $('ah-cifras').innerHTML = cifra(data?.en_juego ?? 0, 'en juego', 'border-rose-400/40 text-rose-200') + cifra(data?.retos_abiertos ?? 0, 'retos abiertos', 'border-amber-400/40 text-amber-200') + cifra(data?.salas_vivas ?? 0, 'salas', 'border-galaxy-400/40 text-galaxy-200');
  } catch (e) { console.warn('[ahora] cifras:', e.message); }
}
montarTarjetasSalas({ contenedor: $('ah-radar'), tipo: 'radar', alContar: (n) => { $('ah-radar-vacio').hidden = !!n; } });
montarTarjetasSalas({ contenedor: $('ah-vivo'), tipo: 'vivo', alContar: (n) => { $('ah-vivo-vacio').hidden = !!n; } });
montarRankingSemanal($('ah-ranking'));
onSession((st) => { if (st?.session) montarRacha($('ah-racha')); });
cifras(); setInterval(() => { if (!document.hidden) cifras(); }, 30_000); document.addEventListener('visibilitychange', () => { if (!document.hidden) cifras(); }); setInterval(() => { if (!document.hidden) montarRankingSemanal($('ah-ranking')); }, 120_000);
