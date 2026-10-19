// «AHORA EN PHOENIX» en la portada (19-oct-2026, Fralex: «sigue» → Inicio con lo vivo de hoy).
// Tres franjas que se deslizan de lado, cada una con «Ver todo»: historias del día · salas en juego (marcador y minuto) · lo más reaccionado de Social.
// Datos: historias_recientes (056) y muro_destacado (041) se leen sin cuenta; salas_en_vivo (067/134) solo con sesión (sin ella, esa franja no sale).
// Si no hay nada que mostrar, la sección entera se queda oculta. Las salas se refrescan cada 30 s mientras la pestaña está a la vista.
import { escapeHTML } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { tiempoRelativo } from '../../core/comunidad/muro.js';
import { totalReacciones } from '../../core/comunidad/feedSocial.js';
import { onSession } from '../../core/sistema/session.js';
import * as muro from '../muro/api.js';
import { salasEnVivo } from '../salas/api.js';

const nombreDe = (a) => a?.nombre_display || a?.username || 'Jugador';
const perfilDe = (a) => `${href('perfil/')}?u=${encodeURIComponent(a?.username ?? '')}`;

function franja(id, icono, titulo, verTodo, contenido) {
  return `<div class="ah-franja" data-ah="${id}"><header class="ah-cab"><h3><i class="fa-solid ${icono}" aria-hidden="true"></i>${titulo}</h3><a href="${escapeHTML(verTodo)}">Ver todo <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></header>
    <div class="ah-carril" role="list">${contenido}</div></div>`;
}
const historiasHTML = (items) => items.slice(0, 12).map((c) => { const a = c.autor ?? {}; const n = c.historias?.length ?? 0;
  return `<a role="listitem" class="ah-hist" href="${escapeHTML(href('social/'))}" title="Ver las historias de ${escapeHTML(nombreDe(a))}"><span class="ah-anillo"><span>${avatarHTML(a.avatar_url, nombreDe(a), 56)}</span></span><b>${escapeHTML(nombreDe(a))}</b><small>${n} historia${n === 1 ? '' : 's'}</small></a>`; }).join('');
function salaHTML(s) {
  const m = s.marcador; const rival = s.rival?.nombre;
  const centro = m ? `<span class="ah-marc"><b>${Number(m.goles_local) || 0}</b><i>-</i><b>${Number(m.goles_visita) || 0}</b></span><small class="ah-min">${m.fase === 'final' ? 'Final' : `${Number(m.minuto) || 0}'`}</small>`
    : `<span class="ah-vs">VS</span><small class="ah-min">${s.estado === 'en_partida' ? 'En partido' : rival ? 'Rival listo' : 'Esperando rival'}</small>`;
  return `<a role="listitem" class="ah-sala${s.estado === 'en_partida' ? ' en-juego' : ''}" href="${escapeHTML(href('en-vivo/'))}">
    <span class="ah-eq">${avatarHTML(s.host?.avatar_url, s.host?.nombre, 40)}<b>${escapeHTML(s.host?.nombre ?? 'Anfitrión')}</b></span>
    <span class="ah-centro">${centro}</span>
    <span class="ah-eq">${rival ? `${avatarHTML(s.rival?.avatar_url, rival, 40)}<b>${escapeHTML(rival)}</b>` : '<span class="ah-libre" aria-hidden="true"><i class="fa-solid fa-plus"></i></span><b>Libre</b>'}</span>
    ${m ? `<span class="ah-clubes">${escapeHTML(m.local ?? '')} · ${escapeHTML(m.visitante ?? '')}</span>` : `<span class="ah-clubes">${escapeHTML([s.parche, s.region].filter(Boolean).join(' · '))}</span>`}</a>`;
}
const postHTML = (it) => { const a = it.autor ?? {}; const txt = String(it.texto ?? '').replace(/\s+/g, ' ').trim(); const n = totalReacciones(it); const r = Number(it.respuestas) || 0;
  return `<a role="listitem" class="ah-post" href="${escapeHTML(`${perfilDe(a)}#p-${Number(it.id)}`)}"><span class="ah-post-cab"><span class="ah-post-av">${avatarHTML(a.avatar_url, nombreDe(a), 28)}</span><b>${escapeHTML(nombreDe(a))}</b><small>${escapeHTML(tiempoRelativo(it.created_at))}</small></span>
    <p>${escapeHTML(txt ? (txt.length > 120 ? `${txt.slice(0, 120)}…` : txt) : 'Publicación con foto o video')}</p>
    <span class="ah-post-pie"><span><i class="fa-solid fa-fire" aria-hidden="true"></i>${n}</span><span><i class="fa-regular fa-comment" aria-hidden="true"></i>${r}</span></span></a>`; };

/** Monta la sección en [data-ahora] (index.astro). */
export function montarAhora() {
  const caja = document.querySelector('[data-ahora]'); if (!caja) return;
  const S = { hist: [], salas: [], posts: [], conSesion: false };
  const pintar = () => {
    const partes = [];
    if (S.salas.length) partes.push(franja('salas', 'fa-tower-broadcast', `Salas en juego <span class="ah-n">${S.salas.length}</span>`, href('en-vivo/'), S.salas.slice(0, 8).map(salaHTML).join('')));
    if (S.hist.length) partes.push(franja('hist', 'fa-circle-notch', 'Historias de hoy', href('social/'), historiasHTML(S.hist)));
    if (S.posts.length) partes.push(franja('posts', 'fa-fire', 'Lo más reaccionado en Social', `${href('social/')}?v=destacado`, S.posts.slice(0, 8).map(postHTML).join('')));
    caja.hidden = !partes.length;
    caja.innerHTML = partes.length ? `<div class="ah-titulo"><span class="ah-punto" aria-hidden="true"></span><h2 id="ahora-t">Ahora en Phoenix</h2><p>Lo que pasa en este momento en la comunidad</p></div>${partes.join('')}` : '';
  };
  const cargarSalas = async () => {
    if (!S.conSesion || document.hidden) return;
    try { S.salas = (await salasEnVivo()).sort((a, b) => (b.estado === 'en_partida') - (a.estado === 'en_partida')); } catch { S.salas = []; }
    pintar();
  };
  (async () => {
    const [h, d] = await Promise.allSettled([muro.historiasRecientes(16), muro.destacado(0, 8)]);
    S.hist = h.status === 'fulfilled' && Array.isArray(h.value?.items) ? h.value.items : [];
    S.posts = d.status === 'fulfilled' && Array.isArray(d.value?.items) ? d.value.items.filter((x) => totalReacciones(x) > 0 || x.texto) : [];
    pintar();
  })();
  onSession(({ session }) => { const antes = S.conSesion; S.conSesion = !!session; if (S.conSesion && !antes) cargarSalas(); if (!S.conSesion) { S.salas = []; pintar(); } });
  setInterval(cargarSalas, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cargarSalas(); });
}
