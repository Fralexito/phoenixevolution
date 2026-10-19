// SOCIAL · FASE 2 (19-oct-2026, Fralex: «Comienza la fase 2»; migraciones 135 y 135b). Piezas de interfaz que usa pages/social.js:
//   · originalHTML: la publicación compartida dentro de la nueva (o «ya no está disponible»).
//   · abrirCompartir: ventana «Compartir» — en tu muro con comentario, o fuera (enlace / menú del celular).
//   · abrirQuienReacciono: ventana con quién reaccionó, por pestañas de emoji.
//   · abrirTarjetaPerfil: tarjeta rápida al tocar una cara o un nombre (país, club, duelos, Seguir, Retar, Ver perfil).
//   · vigilarVistas: cuenta una vista cuando una publicación se ve al menos 1 segundo (en lotes; solo con sesión).
// Todo lo que viene de usuarios pasa por escapeHTML.
import { escapeHTML, safeImg } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { toast } from '../../core/sistema/toast.js';
import { tiempoRelativo, textoAHTML } from '../../core/comunidad/muro.js';
import { banderaSVG } from '../../../data/banderas.js';
import { paisNombre } from '../../../data/paises.js';
import { clubExacto, escudoUrl } from '../../core/pes/clubesPes.js';
import * as api from '../muro/api.js';
import { estadisticasDe } from '../resultados/api.js';
import * as amigosApi from '../amigos/api.js';
import { compartir as compartirFuera } from '../muro/compartir.js';

const nombreDe = (a) => a?.nombre_display || a?.username || 'Jugador';
const perfilUrl = (u) => `${href('perfil/')}?u=${encodeURIComponent(u ?? '')}`;
const dialogo = (clase, html) => { const d = document.createElement('dialog'); d.className = `f2-modal ${clase}`; d.innerHTML = `<div class="f2-caja">${html}</div>`; document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-f2-cerrar]')) d.close(); }); d.addEventListener('close', () => d.remove()); d.showModal(); return d; };

/* ---------- La publicación compartida, dentro de la nueva ---------- */
export function originalHTML(o) {
  if (!o) return '';
  if (o.no_disponible) return '<div class="f2-orig f2-orig-no"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i> La publicación original ya no está disponible.</div>';
  const a = o.autor ?? {}; const img = safeImg(o.imagen_url); const txt = String(o.texto ?? '');
  return `<a class="f2-orig" href="${escapeHTML(`${perfilUrl(a.username)}#p-${Number(o.id)}`)}">
    <span class="f2-orig-cab"><span class="f2-orig-av">${avatarHTML(a.avatar_url, nombreDe(a), 24)}</span><b>${escapeHTML(nombreDe(a))}</b><small>${escapeHTML(tiempoRelativo(o.created_at))}</small></span>
    ${txt ? `<span class="f2-orig-tx">${escapeHTML(txt.length > 280 ? `${txt.slice(0, 280)}…` : txt)}</span>` : ''}
    ${img ? `<img src="${escapeHTML(img)}" alt="" loading="lazy" class="f2-orig-img">` : ''}${o.video_url && !img ? '<span class="f2-orig-vid"><i class="fa-solid fa-circle-play" aria-hidden="true"></i> Video</span>' : ''}</a>`;
}

/* ---------- Ventana «Compartir» ---------- */
/** @param {{ it: object, url: string, conSesion: boolean, alCompartir: () => void }} op */
export function abrirCompartir({ it, url, conSesion, alCompartir }) {
  const a = it.autor ?? {}; const txt = String(it.texto ?? '').replace(/\s+/g, ' ').trim();
  const d = dialogo('f2-compartir', `<header class="f2-cab"><h2>Compartir</h2><button type="button" class="f2-x" data-f2-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    ${conSesion ? `<section class="f2-bloque"><p class="f2-t"><i class="fa-solid fa-retweet" aria-hidden="true"></i> En tu muro <small>Sale en Social y en tu perfil, con la publicación de ${escapeHTML(nombreDe(a))} dentro</small></p>
      <textarea class="f2-comentario" maxlength="1000" rows="3" placeholder="Añade un comentario (opcional)…" aria-label="Comentario"></textarea>
      <div class="f2-mini"><span class="f2-mini-av">${avatarHTML(a.avatar_url, nombreDe(a), 22)}</span><b>${escapeHTML(nombreDe(a))}</b><span>${escapeHTML(txt ? (txt.length > 90 ? `${txt.slice(0, 90)}…` : txt) : 'Foto o video')}</span></div>
      <button type="button" class="f2-boton f2-pri" data-f2-muro><i class="fa-solid fa-retweet" aria-hidden="true"></i> Compartir en mi muro</button></section>` : ''}
    <section class="f2-bloque"><p class="f2-t"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Fuera de Phoenix <small>WhatsApp, Telegram, Discord… o copia el enlace</small></p>
      <button type="button" class="f2-boton" data-f2-fuera><i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i> Enviar o copiar el enlace</button></section>`);
  d.querySelector('[data-f2-fuera]').addEventListener('click', () => { d.close(); compartirFuera({ url, titulo: 'Publicación en Phoenix Evolution Series' }); });
  const b = d.querySelector('[data-f2-muro]');
  b?.addEventListener('click', async () => {
    b.disabled = true; b.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Compartiendo…';
    try { await api.compartirEnMuro(Number(it.id), d.querySelector('.f2-comentario').value.trim()); d.close(); toast('¡Compartido en tu muro!', 'ok'); alCompartir?.(); }
    catch (e) { toast(String(e?.message ?? 'No se pudo compartir.'), 'error'); b.disabled = false; b.innerHTML = '<i class="fa-solid fa-retweet" aria-hidden="true"></i> Compartir en mi muro'; }
  });
  d.querySelector('.f2-comentario')?.focus();
}

/* ---------- Quién reaccionó ---------- */
export async function abrirQuienReacciono(idPublicacion) {
  const d = dialogo('f2-quien', `<header class="f2-cab"><h2>Reacciones</h2><button type="button" class="f2-x" data-f2-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    <div class="f2-tabs" role="tablist"></div><ul class="f2-lista"><li class="f2-nada">Cargando…</li></ul>`);
  let lista = [];
  try { lista = (await api.reaccionesDe(idPublicacion)) ?? []; } catch { lista = []; }
  if (!d.isConnected) return;
  const tipos = [...new Set(lista.map((x) => x.tipo))];
  const cuenta = (t) => lista.filter((x) => !t || x.tipo === t).length;
  const pintar = (t) => {
    d.querySelectorAll('[data-f2-tipo]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f2Tipo === (t ?? ''))));
    const filas = lista.filter((x) => !t || x.tipo === t);
    d.querySelector('.f2-lista').innerHTML = filas.length ? filas.map((x) => { const u = x.usuario ?? {};
      return `<li><a href="${escapeHTML(perfilUrl(u.username))}"><span class="f2-av">${avatarHTML(u.avatar_url, nombreDe(u), 36)}<i aria-hidden="true">${escapeHTML(x.tipo)}</i></span><span class="f2-nom"><b>${escapeHTML(nombreDe(u))}</b><small>@${escapeHTML(u.username ?? '')} · ${escapeHTML(tiempoRelativo(x.cuando))}</small></span></a></li>`; }).join('')
      : '<li class="f2-nada">Aún nadie ha reaccionado.</li>';
  };
  d.querySelector('.f2-tabs').innerHTML = [`<button type="button" role="tab" data-f2-tipo="">Todas <b>${cuenta()}</b></button>`, ...tipos.map((t) => `<button type="button" role="tab" data-f2-tipo="${escapeHTML(t)}">${escapeHTML(t)} <b>${cuenta(t)}</b></button>`)].join('');
  d.querySelector('.f2-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-f2-tipo]'); if (b) pintar(b.dataset.f2Tipo || null); });
  pintar(null);
}

/* ---------- Tarjeta rápida de perfil ---------- */
let tarjetaAbierta = null;
export async function abrirTarjetaPerfil({ username, ancla, yo }) {
  tarjetaAbierta?.remove(); if (!username) return;
  const t = document.createElement('div'); t.className = 'f2-tarjeta'; t.setAttribute('role', 'dialog'); t.setAttribute('aria-label', 'Perfil rápido');
  t.innerHTML = '<div class="f2-tj-carga"><span></span><span></span></div>'; document.body.append(t); tarjetaAbierta = t;
  const colocar = () => { const r = ancla.getBoundingClientRect(); const w = Math.min(300, innerWidth - 24);
    t.style.width = `${w}px`; t.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left))}px`;
    const alto = t.offsetHeight || 240; const abajo = r.bottom + 8 + alto < innerHeight; t.style.top = `${abajo ? r.bottom + 8 : Math.max(12, r.top - 8 - alto)}px`; t.dataset.lado = abajo ? 'abajo' : 'arriba'; };
  colocar();
  const esc = (e) => { if (e.key === 'Escape') cerrar(); };
  function cerrar(e) {
    if (e && (t.contains(e.target) || ancla.contains(e.target))) return;
    t.remove(); if (tarjetaAbierta === t) tarjetaAbierta = null;
    document.removeEventListener('pointerdown', cerrar, true); document.removeEventListener('keydown', esc);
  }
  setTimeout(() => { document.addEventListener('pointerdown', cerrar, true); document.addEventListener('keydown', esc); }, 0);
  let p = null; let est = null;
  try { p = await api.perfilPublico(username); } catch { p = null; }
  if (!t.isConnected) return;
  if (!p) { t.innerHTML = '<p class="f2-nada">No encontré a ese jugador.</p>'; colocar(); return; }
  try { est = await estadisticasDe(p.id); } catch { est = null; }
  if (!t.isConnected) return;
  const club = p.club_favorito ? clubExacto(p.club_favorito) : null; const esYo = yo && yo === p.id;
  t.innerHTML = `<div class="f2-tj-cab"><span class="f2-tj-av">${avatarHTML(p.avatar_url, nombreDe(p), 56)}</span><div class="f2-tj-id"><b>${escapeHTML(nombreDe(p))}</b><small>@${escapeHTML(p.username ?? '')}</small></div></div>
    ${p.muro_lema ? `<p class="f2-tj-lema">«${escapeHTML(p.muro_lema)}»</p>` : ''}
    <div class="f2-tj-datos">${p.pais_codigo ? `<span>${banderaSVG(p.pais_codigo, 'f2-flag')}${escapeHTML(paisNombre(p.pais_codigo) || p.pais_codigo)}</span>` : ''}${p.club_favorito ? `<span>${club ? `<img src="${escapeHTML(escudoUrl(club))}" alt="" width="16" height="16">` : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'}${escapeHTML(p.club_favorito)}</span>` : ''}${p.puede_hostear ? '<span><i class="fa-solid fa-server" aria-hidden="true"></i>Host</span>' : ''}</div>
    ${est?.jugados ? `<div class="f2-tj-cifras"><div><b>${est.jugados}</b><small>Duelos</small></div><div><b>${est.victorias}</b><small>Victorias</small></div><div><b>${est.efectividad ?? 0}%</b><small>Efectividad</small></div></div>` : ''}
    <div class="f2-tj-acc">${!esYo && yo ? `<button type="button" class="f2-boton f2-pri" data-f2-seguir="${escapeHTML(p.id)}"><i class="fa-solid fa-user-plus" aria-hidden="true"></i> Seguir</button><a class="f2-boton" href="${escapeHTML(`${href('duelos/')}?retar=${encodeURIComponent(p.id)}`)}"><i class="fa-solid fa-bolt" aria-hidden="true"></i> Retar</a>` : ''}
      <a class="f2-boton" href="${escapeHTML(perfilUrl(p.username))}"><i class="fa-solid fa-user" aria-hidden="true"></i> Ver perfil</a></div>`;
  colocar();
  t.querySelector('[data-f2-seguir]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try { await amigosApi.seguir(b.dataset.f2Seguir); b.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Siguiendo'; b.classList.remove('f2-pri'); }
    catch (err) { toast(String(err?.message ?? 'No se pudo seguir.'), 'error'); b.disabled = false; }
  });
}

/* ---------- Vistas (1 s a la vista = vista; se envían en lotes cada 3 s) ---------- */
export function vigilarVistas(feed, { conSesion }) {
  if (!('IntersectionObserver' in window)) return () => {};
  const enviadas = new Set(); const pendientes = new Set(); const timers = new Map(); let lote = 0;
  const enviar = () => { lote = 0; if (!conSesion() || !pendientes.size) { pendientes.clear(); return; } const ids = [...pendientes]; pendientes.clear(); api.registrarVistas(ids).catch(() => { /* una vista perdida no importa */ }); };
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      const id = Number(e.target.dataset.pub); if (!id || enviadas.has(id)) continue;
      if (e.isIntersecting) { if (!timers.has(id)) timers.set(id, setTimeout(() => { timers.delete(id); enviadas.add(id); pendientes.add(id); if (!lote) lote = setTimeout(enviar, 3000); }, 1000)); }
      else { clearTimeout(timers.get(id)); timers.delete(id); }
    }
  }, { threshold: 0.5 });
  const observar = () => feed.querySelectorAll('.sx-post[data-pub]').forEach((p) => io.observe(p));
  new MutationObserver(observar).observe(feed, { childList: true });
  observar();
  window.addEventListener('pagehide', enviar);
  return observar;
}
