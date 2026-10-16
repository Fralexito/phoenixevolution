// «Tu próximo partido»: tarjeta fija (como el cupón de las apps de apuestas). Solo con sesión y si hay un partido agendado.
// Se oculta en Duelos y Mis partidos (ahí ya está todo). Refresca cada 2 min.
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { elegirProximo, cuando } from '../core/proximoPartido.js';

let caja = null, timer = null;
const quitar = () => { caja?.remove(); caja = null; };

async function cargar(yo) {
  const { data, error } = await supabase.from('retos_matchmaking').select('id, estado, retador_id, rival_id, fecha_programada')
    .in('estado', ['ACEPTADO', 'EN_JUEGO']).or(`retador_id.eq.${yo},rival_id.eq.${yo}`).limit(20);
  if (error) { console.warn('[proximo]', error.message); return quitar(); }
  const r = elegirProximo(data, yo); if (!r) return quitar();
  const otro = r.retador_id === yo ? r.rival_id : r.retador_id;
  let nombre = 'tu rival';
  if (otro) { const p = await supabase.from('perfiles').select('nombre_display').eq('id', otro).maybeSingle(); nombre = p.data?.nombre_display || nombre; }
  if (!caja) { caja = document.createElement('a'); caja.className = 'prox-partido'; caja.setAttribute('aria-label', 'Tu próximo partido'); document.body.appendChild(caja); }
  caja.href = href('mis-partidos/');
  caja.dataset.vivo = r.estado === 'EN_JUEGO' ? '1' : '';
  caja.innerHTML = `<i class="ph-bold ph-soccer-ball" aria-hidden="true"></i><span class="pp-txt"><small>Tu próximo partido</small><b>vs ${escapeHTML(nombre)}</b></span><span class="pp-cuando">${escapeHTML(cuando(r))}</span>`;
}

export function initProximoPartido() {
  const pg = document.querySelector('main')?.dataset.activa;
  if (['duelos', 'mispartidos', 'mis-partidos'].includes(pg) || location.pathname.includes('mis-partidos')) return;
  onSession(({ session }) => {
    clearInterval(timer); timer = null;
    if (!session) return quitar();
    const yo = session.user.id; cargar(yo).catch((e) => console.warn('[proximo]', e));
    timer = setInterval(() => { if (!document.hidden) cargar(yo).catch(() => {}); }, 120000);
  });
}
