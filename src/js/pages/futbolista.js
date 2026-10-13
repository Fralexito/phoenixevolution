// Ficha de un futbolista de la Liga Máster (ronda 283). Lee lm_jugadores, lm_clubes y lm_movimientos; fichar/ofertar con los mismos RPC de manager.js.
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';
import { haceCuanto } from '../core/notifs.js';

const $ = (id) => document.getElementById(id);
const POS = { PT: 'Portero', DEC: 'Defensa central', LD: 'Lateral derecho', LI: 'Lateral izquierdo', MCD: 'Mediocentro defensivo', MC: 'Mediocentro', MO: 'Mediapunta',
  MD: 'Interior derecho', MI: 'Interior izquierdo', ED: 'Extremo derecho', EI: 'Extremo izquierdo', SD: 'Segundo delantero', DC: 'Delantero centro' };
const LINEA = { PT: 'por', DEC: 'def', LD: 'def', LI: 'def', MCD: 'med', MC: 'med', MO: 'med', MD: 'med', MI: 'med', ED: 'del', EI: 'del', SD: 'del', DC: 'del' };
const millones = (n) => { const v = Number(n || 0); return v >= 1e6 ? `€${(v / 1e6).toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : `€${Math.round(v / 1e3).toLocaleString('es-PE')} mil`; };
const plata = (n) => `€ ${Number(n || 0).toLocaleString('es-PE')}`;
const escudo = (c, px = 40) => safeUrl(c?.escudo_url) ? `<img src="${esc(safeUrl(c.escudo_url))}" alt="" width="${px}" height="${px}" class="object-contain" style="width:${px}px;height:${px}px">` : '<i class="fa-solid fa-shield-halved text-galaxy-400"></i>';
const ERR = { VENTANA_CERRADA: 'La ventana de fichajes está cerrada.', PRESUPUESTO_INSUFICIENTE: 'No te alcanza el presupuesto.', OFERTA_BAJA: 'La oferta es menor al valor del jugador.',
  YA_OFERTASTE: 'Ya tienes una oferta pendiente por él.', PLANTILLA_LLENA: 'Tu plantilla está llena.', SIN_CLUB: 'Primero elige tu club en Mi club.', YA_ES_TUYO: 'Ya es tu jugador.' };
const msg = (e) => { const k = Object.keys(ERR).find((x) => String(e?.message).includes(x)); return k ? ERR[k] : (e?.message || 'Error'); };

let j = null; let club = null; let cfg = null; let yo = null; let miClub = null; let clubes = new Map();

async function cargar() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!id) { $('fb-root').innerHTML = '<p class="pj-vacio">Futbolista no especificado. Entra desde la plantilla o el mercado de Mi club.</p>'; return; }
  const [{ data: jj }, { data: cl }, { data: c }] = await Promise.all([
    supabase.from('lm_jugadores').select('*').eq('id', id).maybeSingle(),
    supabase.from('lm_clubes').select('id, nombre, escudo_url, dueno').eq('liga', 'galaxy'),
    supabase.from('lm_config').select('ventana_abierta').eq('liga', 'galaxy').maybeSingle(),
  ]);
  if (!jj) { $('fb-root').innerHTML = '<p class="pj-vacio">No encontramos a ese futbolista.</p>'; return; }
  j = jj; cfg = c; clubes = new Map((cl ?? []).map((x) => [x.id, x])); club = clubes.get(j.club_id) ?? null;
  miClub = [...clubes.values()].find((x) => x.dueno && x.dueno === yo) ?? null;
  document.title = `${j.nombre} · Liga Máster · Phoenix Evolution`;
  const [{ data: movs }, { data: comp }] = await Promise.all([
    supabase.from('lm_movimientos').select('*').eq('jugador_id', j.id).order('created_at', { ascending: false }).limit(20),
    j.club_id ? supabase.from('lm_jugadores').select('id, nombre, posicion, media').eq('club_id', j.club_id).neq('id', j.id).order('media', { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
  ]);
  pintar(movs ?? [], comp ?? []);
}

function pintar(movs, comp) {
  const celda = (dt, dd, cls = '') => (dd == null || dd === '' ? '' : `<div class="${cls}"><dt>${dt}</dt><dd>${dd}</dd></div>`);
  const esMio = miClub && j.club_id === miClub.id;
  const directo = !club || !club.dueno;
  const boton = !yo ? '<button type="button" class="btn btn-primary" data-pr-auth="login"><i class="fa-solid fa-right-to-bracket"></i> Entra para fichar</button>'
    : esMio ? '<span class="fb-tuyo"><i class="fa-solid fa-circle-check"></i> Es de tu club</span>'
    : !miClub ? `<a class="btn btn-ghost" href="${href('manager/')}"><i class="fa-solid fa-user-tie"></i> Elige tu club para ficharlo</a>`
    : `<button type="button" id="fb-fichar" class="btn btn-primary" ${cfg?.ventana_abierta ? '' : 'disabled'}>${directo ? '<i class="fa-solid fa-signature"></i> Fichar' : '<i class="fa-solid fa-hand-holding-dollar"></i> Hacer oferta'} · ${millones(j.valor)}</button>${cfg?.ventana_abierta ? '' : '<small class="fb-nota">La ventana de fichajes está cerrada.</small>'}`;
  const TIPO = { compra: 'Traspaso', libre: 'Fichaje libre', liberado: 'Liberado', staff: 'Staff', juego: 'Desde el juego' };
  const nom = (id) => (id == null ? 'Agente libre' : esc(clubes.get(id)?.nombre ?? 'Club'));
  $('fb-root').innerHTML = `<div class="fb-grid">
    <section class="fb-carta" data-linea="${LINEA[j.posicion] ?? 'otros'}">
      <div class="fb-carta-top"><b class="fb-media">${esc(j.media ?? '—')}</b><span class="fb-pos">${esc(j.posicion ?? '—')}</span></div>
      <div class="fb-escudo">${escudo(club, 88)}</div>
      <p class="fb-carta-nombre">${esc(j.nombre)}</p>
      <p class="fb-carta-club">${club ? esc(club.nombre) : 'Agente libre'}</p>
      <div class="fb-valor"><small>Valor de mercado</small><b>${millones(j.valor)}</b></div>
    </section>
    <div class="space-y-6 min-w-0">
      <header class="pj-cab">
        <p class="pj-kicker">${club ? `${escudo(club, 20)}<span>${esc(club.nombre)}</span><i aria-hidden="true">·</i>` : '<span>Agente libre</span><i aria-hidden="true">·</i>'}<span>${esc(POS[j.posicion] ?? j.posicion ?? '')}</span></p>
        <h1 class="pj-nombre">${esc(j.nombre)}</h1>
        ${club?.dueno ? '<p class="fb-dt"><i class="fa-solid fa-user-tie"></i> Club con DT en la Liga Máster</p>' : ''}
        <dl class="pj-ficha">${celda('Media', esc(j.media ?? '—'), 'pj-media')}${celda('Posición', esc(j.posicion ?? ''))}${celda('Edad', j.edad ? `${esc(j.edad)}<small>años</small>` : '')}${celda('Altura', j.altura ? `${esc(j.altura)}<small>cm</small>` : '')}${celda('Dorsal', j.dorsal ? `#${esc(j.dorsal)}` : '')}${celda('País', j.nacionalidad ? esc(j.nacionalidad) : '')}</dl>
      </header>
      <div class="fb-accion">${boton}</div>
      <section class="pj-camp">
        <h2 class="pj-sub">Historial en la Liga Máster</h2>
        ${movs.length ? `<ol class="pj-lista">${movs.map((m) => `<li class="pj-res"><span class="pj-res-f"><i class="fa-solid fa-right-left"></i></span><span class="flex-1 min-w-0 text-sm text-gray-200">${nom(m.de_club)} <i class="fa-solid fa-arrow-right text-[11px] text-galaxy-400 mx-1"></i> <b class="text-white">${nom(m.a_club)}</b>${m.revertido_en ? ' <small class="text-amber-300">(revertido)</small>' : ''}</span><span class="pj-res-m"><b>${m.monto ? millones(m.monto) : '—'}</b><small>${esc(TIPO[m.tipo] ?? m.tipo)} · ${esc(haceCuanto(m.created_at) ?? '')}</small></span></li>`).join('')}</ol>`
          : '<p class="text-sm text-gray-400">Todavía no tuvo traspasos en la Liga Máster.</p>'}
      </section>
      ${comp.length ? `<section class="pj-camp"><h2 class="pj-sub">Compañeros en ${esc(club?.nombre ?? '')}</h2><div class="fb-comp">${comp.map((x) => `<a href="${href(`futbolista/?id=${x.id}`)}" class="fb-chip" data-linea="${LINEA[x.posicion] ?? 'otros'}"><b>${esc(x.media ?? '')}</b>${esc(x.nombre)}<small>${esc(x.posicion ?? '')}</small></a>`).join('')}</div></section>` : ''}
      ${j.pes_id ? '' : '<p class="fb-nota"><i class="fa-solid fa-circle-info"></i> Ficha temporal: los datos vienen de la temporada real 2026-27. Cuando llegue el catálogo del parche desde Phoenix Sync, se reemplaza por la ficha del juego.</p>'}
    </div>
  </div>`;
  $('fb-fichar')?.addEventListener('click', fichar);
}

async function fichar(ev) {
  const b = ev.currentTarget; const directo = !club || !club.dueno; let monto = Number(j.valor);
  if (directo) { if (!(await confirmar(`¿Fichar a ${j.nombre} por ${plata(monto)}?`))) return; }
  else { const t = await pedirTexto(`¿Cuánto ofreces por ${j.nombre}? (valor ${plata(monto)})`, { titulo: 'Hacer oferta', valor: String(monto), maximo: 15, aceptar: 'Ofertar' }); if (t === null) return; monto = Math.round(Number(String(t).replace(/[^\d]/g, ''))); if (!monto) return; }
  b.disabled = true;
  try {
    const { data: r, error } = await supabase.rpc('lm_ofertar', { p_jugador: j.id, p_monto: monto }); if (error) throw error;
    toast(r?.estado === 'cerrada' ? `¡Fichaje cerrado por ${plata(r.monto)}!` : 'Oferta enviada. Te avisaremos cuando respondan.', 'ok'); await cargar();
  } catch (e) { toast(msg(e), 'error'); b.disabled = false; }
}

onSession((s) => { const id = s?.session?.user?.id ?? null; if (id === yo && j) return; yo = id; cargar(); });
