// Tarjetas de salas Phoenix Link (migración 067): «Retos en el radar» (Entrar = rival, mando 2) y «Salas en vivo» (Ver = espectador).
// Se recarga sola: al cambiar cualquier sala (Realtime, con espera de 1 s para agrupar) y cada 25 s mientras la pestaña está visible.
// Si la migración 067 no está aplicada, el bloque se queda oculto sin romper la página.
// 19-oct-2026 (Fralex: «Hazlo… dinámico, estético, visual, muy animado»): tarjeta viva — anfitrión VS rival en grande (el puesto libre
// te llama con un latido), mandos dibujados, señal en barras, brillo en el botón; las salas nuevas entran animadas y la que cambia de
// estado destella. Al tocar Entrar/Ver se abre «Entrando a la sala» (features/salas/entrar.js), paso a paso.
// Migración 134: marcador real en el centro (liga_vivo, de Sider) con ¡GOL! al cambiar, cronómetro de «jugando hace…» y quién está conectado.
import { supabase } from '../../core/sistema/supabase.js';
import { onSession } from '../../core/sistema/session.js';
import { escapeHTML, safeUrl } from '../../core/sistema/dom.js';
import { pildoraSemaforo, estadoTarjeta, barrasSenal, mandosDe } from '../../core/competicion/salas.js';
import { haceCuanto } from '../../core/sistema/notifs.js';
import { NOMBRE_APP } from '../../../data/site.js';
import { radarSalas, salasEnVivo, aceptarSala, verSala } from './api.js';
import { entrarASala } from './entrar.js';

const SONDEO_MS = 25_000;
const juegoTxt = (s) => [s.juego, s.parche ? `(${s.parche})` : ''].filter(Boolean).join(' ') || 'Juego por definir';
const MODO = { amistoso: 'Amistoso', torneo_privado: 'Torneo', oficial: 'Oficial' };
const fuenteTxt = { par: 'tu ping real con este host', host: 'promedio histórico del host', diagnostico: 'autodiagnóstico del host', sin_datos: 'sin mediciones aún' };

function avatar(p, extra = '') {
  const url = safeUrl(p?.avatar_url); const ini = escapeHTML(String(p?.nombre ?? '?').trim().charAt(0).toUpperCase() || '?');
  return `<span class="sv-av ${extra}">${url ? `<img src="${escapeHTML(url)}" alt="" loading="lazy">` : `<b>${ini}</b>`}</span>`;
}
function senal(sem) {
  const n = barrasSenal(sem); const p = pildoraSemaforo(sem);
  return `<span class="sv-senal" data-barras="${n}" title="${escapeHTML(p.titulo)}"><span class="sv-barras" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>${escapeHTML(p.texto === 'Ping ?' ? 'Sin ping' : p.texto)}</b></span>`;
}
const tonoPing = (ms) => (ms == null ? '' : ms < 60 ? 'ok' : ms < 120 ? 'medio' : 'mal');
/** Centro de la tarjeta: marcador real (Sider → liga_vivo), cronómetro si se juega sin marcador, o «VS». */
function centro(s) {
  const m = s.marcador;
  if (m && Number.isFinite(Number(m.goles_local))) {
    const gl = Number(m.goles_local) || 0; const gv = Number(m.goles_visita) || 0;
    return `<div class="sv-marcador" data-goles="${gl}-${gv}" aria-label="Marcador ${gl} a ${gv}${m.minuto != null ? `, minuto ${Number(m.minuto)}` : ''}">
      <span class="sv-goles"><b>${gl}</b><i>-</i><b>${gv}</b></span>${m.minuto != null ? `<em class="sv-min"><i class="sv-punto" aria-hidden="true"></i>${Number(m.minuto)}'</em>` : ''}</div>`;
  }
  if (s.estado === 'en_partida' && s.en_partida_desde) return `<div class="sv-crono"><span class="sv-vs-t" aria-hidden="true">VS</span><em data-desde="${escapeHTML(s.en_partida_desde)}" title="Tiempo jugando">0:00</em></div>`;
  return '<span class="sv-vs-t" aria-hidden="true">VS</span>';
}
/** «4 en la sala» con las caras de quienes tienen cuenta en la web (lo informa Phoenix Link en cada latido). */
function conectados(c) {
  const total = Number(c?.total) || 0; if (!total) return '';
  const caras = (Array.isArray(c.jugadores) ? c.jugadores : []).slice(0, 4);
  const resto = total - caras.length;
  return `<div class="sv-conectados" title="Conectados ahora a la sala (Phoenix Link)"><span class="sv-pila">${caras.map((j) => `<span class="sv-pila-av" data-ping="${tonoPing(j.ping_ms)}" title="${escapeHTML(j.nombre ?? '')}${j.ping_ms != null ? ` · ${Math.round(j.ping_ms)} ms` : ''}">${avatar(j)}</span>`).join('')}${resto > 0 ? `<span class="sv-pila-mas">+${resto}</span>` : ''}</span>
    <span class="sv-conectados-t"><b>${total}</b> en la sala ahora</span></div>`;
}
const chip = (ic, t) => `<span class="sv-chip"><i class="fa-solid ${ic}" aria-hidden="true"></i>${t}</span>`;

/** Una sola tarjeta para radar y «En vivo». */
function tarjeta(s, tipo) {
  const est = estadoTarjeta(s); const sem = s.semaforo ?? {}; const dg = sem.diagnostico;
  const espect = s.acepta_espectadores && s.limite_espectadores > 0;
  const lleno = espect && s.espectadores >= s.limite_espectadores;
  const mandos = mandosDe(s);
  let accion;
  if (tipo === 'radar') {
    accion = s.mia ? '<span class="sv-tuya"><i class="fa-solid fa-house" aria-hidden="true"></i> Tu sala</span>'
      : `<button type="button" class="sv-cta" data-aceptar="${escapeHTML(s.sala_id)}"><i class="fa-solid fa-circle-play" aria-hidden="true"></i><span>Entrar como rival</span></button>`;
  } else {
    accion = `<button type="button" class="sv-cta ${s.soy_espectador ? 'sv-cta-sec' : ''}" data-ver="${escapeHTML(s.sala_id)}" ${lleno && !s.soy_espectador ? 'disabled' : ''}>
      <i class="fa-solid ${s.soy_espectador ? 'fa-arrow-up-right-from-square' : 'fa-tv'}" aria-hidden="true"></i><span>${s.soy_espectador ? 'Volver a abrir' : lleno ? 'Sala llena' : 'Ver el partido'}</span></button>`;
  }
  const rival = !s.rival
    ? `<div class="sv-lado sv-lado-libre">${tipo === 'radar' && !s.mia ? '<span class="sv-av sv-av-libre"><i class="fa-solid fa-circle-plus" aria-hidden="true"></i></span><b>¿Tú?</b><small>Puesto libre</small>' : `<span class="sv-av sv-av-libre"><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i></span><b>${s.reto_id ? 'Reto' : 'Por definir'}</b><small>Rival</small>`}</div>`
    : `<div class="sv-lado">${avatar(s.rival)}<b>${escapeHTML(s.rival?.nombre ?? 'Rival')}</b><small>Rival</small></div>`;
  return `<article class="sv-card" data-sala="${escapeHTML(s.sala_id)}" data-estado="${est.id}" data-tipo="${tipo}">
    <header class="sv-top"><span class="sv-estado"><i class="sv-punto" aria-hidden="true"></i>${escapeHTML(est.texto)}</span><span class="sv-app">${NOMBRE_APP}</span>${senal(sem)}</header>
    <div class="sv-vs">
      <div class="sv-lado">${avatar(s.host, 'sv-av-host')}<b>${escapeHTML(s.host?.nombre ?? 'Host')}${s.host?.amigo ? ' <i class="fa-solid fa-user-group sv-amigo" title="Amigo" aria-label="Amigo"></i>' : ''}</b><small>Anfitrión</small></div>
      ${centro(s)}
      ${rival}
    </div>
    ${s.marcador?.local || s.marcador?.visitante ? `<p class="sv-equipos">${escapeHTML(s.marcador.local ?? '')} <span>vs</span> ${escapeHTML(s.marcador.visitante ?? '')}</p>` : ''}
    ${conectados(s.conectados)}
    <div class="sv-info">
      ${mandos.length ? `<span class="sv-mandos" title="${mandos.filter((m) => m.lleno).length} de ${mandos.length} mandos ocupados">${mandos.map((m) => `<i class="fa-solid fa-gamepad ${m.lleno ? 'lleno' : ''}" aria-hidden="true"></i>`).join('')}</span>` : ''}
      ${s.parche || s.juego ? chip('fa-futbol', escapeHTML(s.parche || s.juego)) : ''}
      ${s.region ? chip('fa-location-dot', escapeHTML(s.region)) : ''}
      ${espect ? chip('fa-tv', `${Number(s.espectadores) || 0}/${s.limite_espectadores}`) : ''}
    </div>
    <div class="sv-accion">${accion}</div>
    <details class="sv-detalles">
      <summary>Detalles de la sala</summary>
      <dl>
        <dt>Juego</dt><dd>${escapeHTML(juegoTxt(s))}</dd>
        <dt>Modo</dt><dd>${escapeHTML(MODO[s.modo] ?? s.modo ?? '—')}</dd>
        <dt>Plazas libres</dt><dd>${Number(s.plazas_libres) || 0}/${Number(s.plazas_total) || 0}</dd>
        <dt>Espectadores</dt><dd>${espect ? `${Number(s.espectadores) || 0}/${s.limite_espectadores}` : 'No admite'}</dd>
        <dt>Abierta</dt><dd>${escapeHTML(haceCuanto(s.abierta_en) ?? 'hace más de una semana')}</dd>
        <dt>Ping estimado</dt><dd>${sem.ping_ms != null ? `${Math.round(sem.ping_ms)} ms` : '—'} <span>(${escapeHTML(fuenteTxt[sem.fuente] ?? '—')})</span></dd>
        ${dg ? `<dt>Red del host</dt><dd>${dg.latencia_ms != null ? `${Math.round(dg.latencia_ms)} ms` : '—'}${dg.jitter_ms != null ? ` · jitter ${Math.round(dg.jitter_ms)}` : ''}${dg.subida_kbps ? ` · subida ${(dg.subida_kbps / 1000).toFixed(1)} Mbps` : ''}</dd>` : ''}
      </dl>
    </details>
  </article>`;
}

/**
 * @param {{ contenedor: HTMLElement, tipo: 'radar'|'vivo', alContar?: (n: number) => void }} op
 * @returns {() => void} desmontar
 */
export function montarTarjetasSalas({ contenedor, tipo, alContar = () => {} }) {
  if (!contenedor) return () => {};
  let conSesion = false; let vivo = true; let espera = null; let canal = null;
  let lista = []; const vistos = new Map();   // sala_id → estado ya dibujado (para animar solo lo nuevo o lo que cambió)
  const goles = new Map();   // sala_id → marcador ya visto (para celebrar el gol)
  const cargar = async () => {
    if (!vivo || !conSesion || document.hidden) return;
    try {
      lista = tipo === 'radar' ? await radarSalas() : await salasEnVivo();
      contenedor.innerHTML = lista.map((s) => tarjeta(s, tipo)).join('');
      contenedor.querySelectorAll('.sv-card').forEach((el, i) => {
        const id = el.dataset.sala; const antes = vistos.get(id);
        if (antes === undefined) { el.classList.add('sv-nueva'); el.style.setProperty('--i', String(Math.min(i, 6))); }
        else if (antes !== el.dataset.estado) el.classList.add('sv-cambio');
        vistos.set(id, el.dataset.estado);
        const g = el.querySelector('.sv-marcador')?.dataset.goles; if (g && goles.has(id) && goles.get(id) !== g) el.classList.add('sv-gol'); if (g) goles.set(id, g);
      });
      contenedor.hidden = !lista.length;
      alContar(lista.length);
    } catch (e) {
      console.warn(`[salas:${tipo}]`, e.message);
      contenedor.hidden = true; alContar(0);
    }
  };
  const pronto = () => { clearTimeout(espera); espera = setTimeout(cargar, 1000); };

  contenedor.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-aceptar], [data-ver]');
    if (!b || b.disabled) return;
    const id = b.dataset.aceptar ?? b.dataset.ver; const rival = 'aceptar' in b.dataset;
    const sala = lista.find((s) => String(s.sala_id) === String(id)) ?? {};
    entrarASala({ sala, rol: rival ? 'rival' : 'espectador', pedir: () => (rival ? aceptarSala(id) : verSala(id)), alTerminar: cargar });
  });
  // Brillo que sigue al puntero en la tarjeta (solo con mouse; el CSS lo apaga con «menos movimiento»).
  contenedor.addEventListener('pointermove', (ev) => {
    const c = ev.target.closest('.sv-card'); if (!c || ev.pointerType !== 'mouse') return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${((ev.clientX - r.left) / r.width) * 100}%`); c.style.setProperty('--my', `${((ev.clientY - r.top) / r.height) * 100}%`);
  });

  const intervalo = setInterval(cargar, SONDEO_MS);
  // Cronómetro de «jugando hace…»: se mueve cada segundo solo si hay alguno a la vista.
  const reloj = setInterval(() => {
    if (document.hidden) return;
    contenedor.querySelectorAll('[data-desde]').forEach((el) => {
      const s = Math.max(0, Math.floor((Date.now() - Date.parse(el.dataset.desde)) / 1000)); if (!Number.isFinite(s)) return;
      const h = Math.floor(s / 3600); const mm = Math.floor((s % 3600) / 60); const ss = String(s % 60).padStart(2, '0');
      el.textContent = h ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
    });
  }, 1000);
  const alVer = () => { if (!document.hidden) cargar(); };
  document.addEventListener('visibilitychange', alVer);
  try {
    canal = supabase.channel(`salas-tarjetas-${tipo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, pronto).subscribe();
  } catch (e) { console.warn('[salas] realtime:', e); }
  onSession((st) => { conSesion = !!st?.session; if (conSesion) cargar(); else { contenedor.hidden = true; alContar(0); } });

  return () => {
    vivo = false; clearInterval(intervalo); clearInterval(reloj); clearTimeout(espera);
    document.removeEventListener('visibilitychange', alVer);
    if (canal) supabase.removeChannel(canal);
  };
}
