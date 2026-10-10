// Página «Mi club» (resumen). Esquema: pages → features → core. Todo tolerante a fallos: si una consulta falla, esa tarjeta
// muestra un texto neutro y el resto sigue (nunca una pantalla vacía).
import { onSession, getState } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { avatarHTML } from '../core/avatar.js';
import { escudoHTML } from '../core/escudos.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { faltanClub, miLigaClub, tituloClub } from '../core/club.js';
import { openProfileModal } from '../features/profile.js';
import { openAuthModal } from '../features/auth.js';
import { pendientes as marcadoresPendientes, estadisticasDe, eloDe } from '../features/resultados/api.js';
import { data as duelos, loadRetos, isMine, isActive } from '../features/duelos/data.js';
import { montarPrimerosPasos, pasosDe } from '../features/primerosPasos.js';

const $ = (id) => document.getElementById(id);
const href = (p) => `${import.meta.env.BASE_URL}${p}`;
const vacio = (t) => `<p class="cl-vacio">${t}</p>`;

// Botones de cuenta (sin sesión) y «Editar perfil»
document.querySelectorAll('[data-auth]').forEach((b) => b.addEventListener('click', () => openAuthModal(b.dataset.auth === 'register' ? 'register' : 'login')));
document.querySelectorAll('[data-act="profile"]').forEach((b) => b.addEventListener('click', () => openProfileModal()));

function pintarSaludo(p, liga, faltan) {
  $('cl-avatar').innerHTML = avatarHTML(p.avatar_url, p.nombre_display, 72);
  $('cl-hola').textContent = `Hola, ${p.nombre_display || p.username || 'jugador'}`;
  const t = tituloClub({ faltan, proximo: liga?.proximo ?? null });
  $('cl-titulo').innerHTML = `<span>${escapeHTML(t.a)}</span> <em>${escapeHTML(t.b)}</em>`;
  const partes = [];
  if (p.username) partes.push(`@${escapeHTML(p.username)}`);
  if (liga) partes.push(`${liga.puesto}.º de ${liga.total} en ${escapeHTML(liga.edicion.nombre)}`);
  if (p.puede_hostear) partes.push('puedes ser host');
  $('cl-sub').textContent = partes.length ? partes.join(' · ') : 'Este es tu resumen. Todo lo tuyo, en un solo lugar.';
}

function pintarLiga(liga) {
  const box = $('cl-liga');
  if (!liga) { box.innerHTML = `<span class="in-mini">Mi liga</span><b class="cl-grande">No estás en la liga</b>${vacio('Cuando el staff te inscriba, aquí verás tu puesto y tu próximo partido.')}<a href="${href('unirme/')}" class="in-enlace">Cómo unirme →</a>`; return; }
  const f = liga.fila; const px = liga.proximo;
  const prox = px ? `<div class="cl-prox"><span class="cl-esc">${escudoHTML(liga.edicion.clubes?.[px.rival] ?? '', 28)}</span><div class="min-w-0"><small>Próximo · fecha ${px.n} · ${px.local ? 'de local' : 'de visita'}</small><b>vs ${escapeHTML(px.rival)}</b></div></div>` : vacio('No tienes partidos pendientes en esta edición.');
  box.innerHTML = `<span class="in-mini">Mi liga · ${escapeHTML(liga.edicion.nombre)}</span>
    <div class="cl-puesto"><b>${liga.puesto}.º</b><span>de ${liga.total}${f ? ` · ${f.pts} pts · ${f.pj} PJ` : ''}</span></div>${prox}
    <div class="cl-pie"><a href="${href('liga/')}" class="in-enlace">Tabla completa →</a><a href="${href('mis-partidos/')}" class="in-enlace">Mis partidos →</a></div>`;
}

async function pintarPendientes(uid) {
  const box = $('cl-pend');
  const [m, r] = await Promise.allSettled([marcadoresPendientes(), loadRetos()]);
  const porConfirmar = m.status === 'fulfilled' ? m.value.length : 0;
  const activos = r.status === 'fulfilled' ? duelos.retos.filter((x) => isActive(x) && isMine(x, uid)).length : 0;
  const abiertos = r.status === 'fulfilled' ? duelos.retos.filter((x) => x.estado === 'BUSCANDO' && !isMine(x, uid)).length : 0;
  const fila = (n, txt, h, tono = '') => `<a href="${h}" class="cl-pend-fila ${n ? tono : ''}"><b>${n}</b><span>${txt}</span><i class="fa-solid fa-chevron-right"></i></a>`;
  box.innerHTML = `<span class="in-mini">Pendientes</span>
    ${fila(porConfirmar, porConfirmar === 1 ? 'marcador por confirmar' : 'marcadores por confirmar', href('mis-partidos/'), 'alerta')}
    ${fila(activos, activos === 1 ? 'reto tuyo en curso' : 'retos tuyos en curso', href('mis-partidos/'), 'ok')}
    ${fila(abiertos, abiertos === 1 ? 'reto abierto esperando rival' : 'retos abiertos esperando rival', href('duelos/'), 'info')}
    ${porConfirmar + activos + abiertos === 0 ? vacio('Nada pendiente. Buen momento para lanzar un reto.') : ''}`;
}

async function pintarNumeros(uid) {
  const box = $('cl-nums');
  const [e, l] = await Promise.all([estadisticasDe(uid), eloDe(uid)]);
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const j = n(e?.jugados), g = n(e?.ganados), em = n(e?.empates), p = n(e?.perdidos);
  const efect = j ? Math.round((g / j) * 100) : 0;
  box.innerHTML = `<span class="in-mini">Mis números · retos</span>
    <div class="cl-nums"><div><b>${j}</b><small>jugados</small></div><div><b class="text-emerald-400">${g}</b><small>ganados</small></div><div><b>${em}</b><small>empates</small></div><div><b class="text-rose-400">${p}</b><small>perdidos</small></div></div>
    <div class="cl-pie"><span class="in-nota">${j ? `Efectividad ${efect}%` : 'Aún sin partidos de reto'}${l?.elo ? ` · ELO ${l.elo}` : ''}</span><a href="${href('perfil/')}" class="in-enlace">Mi perfil →</a></div>`;
}

function extrasPuertas(p, liga, pcs) {
  const set = (id, txt) => { const el = document.querySelector(`[data-puerta="${id}"] [data-extra]`); if (el && txt) { el.textContent = txt; el.hidden = false; } };
  const carta = document.querySelector('[data-puerta="carta"]');
  if (p.ficha_id && carta) carta.setAttribute('href', `${href('jugador/')}?id=${encodeURIComponent(p.ficha_id)}`);
  set('carta', p.ficha_id ? 'Tu carta está lista' : 'Aún no tienes carta: pídela al staff');
  set('pc', pcs === null ? '' : pcs ? `${pcs} PC vinculada${pcs === 1 ? '' : 's'}` : 'Sin PC vinculada');
  set('manager', liga ? `Juegas en ${liga.edicion.nombre}` : '');
}

onSession(async ({ session, profile }) => {
  if (!session || !profile) return;
  const uid = session.user.id;
  let liga = null; try { liga = miLigaClub(EDICIONES.galaxy, profile.nombre_display); } catch (e) { console.warn('[club] liga:', e); }
  const { pasos, pcs } = await pasosDe(uid, profile);
  const faltan = faltanClub(pasos);
  pintarSaludo(profile, liga, faltan);
  montarPrimerosPasos($('cl-pasos'), pasos, { href, onProfile: openProfileModal });
  pintarLiga(liga);
  extrasPuertas(profile, liga, pcs);
  pintarPendientes(uid).catch((e) => { console.warn('[club] pendientes:', e); $('cl-pend').innerHTML = `<span class="in-mini">Pendientes</span>${vacio('No se pudieron leer tus pendientes.')}`; });
  pintarNumeros(uid).catch((e) => { console.warn('[club] números:', e); $('cl-nums').innerHTML = `<span class="in-mini">Mis números</span>${vacio('No se pudieron leer tus números.')}`; });
});
