// Página /jugadas/ (19-oct-2026, Fralex: «reels o feed, shorts estilo TikTok, YouTube e Instagram, pero con identidad propia»).
// Feed vertical a pantalla completa: un video a la vez; se pasa deslizando (o ↑ ↓ / rueda). Solo el video a la vista se reproduce
// (YouTube se carga SOLO en el que se ve; los demás muestran su miniatura). Identidad Phoenix:
//   · categoría futbolera (Golazo, Atajada, Skill, Remontada, Fail) con su color;
//   · reacciones Phoenix (mantén pulsado o toca la flecha) y doble toque = 🔥 con llamarada;
//   · el «Calorímetro»: cuánto fuego tiene la jugada comparada con las demás del feed;
//   · «Retar» al autor (abre el asistente de Duelos con él elegido).
// Datos: features/muro/api.js (migración 136). Todo lo que viene de usuarios pasa por escapeHTML.
import { escapeHTML } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { avatarHTML } from '../core/sistema/avatar.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar } from '../core/sistema/dialogo.js';
import { onSession } from '../core/sistema/session.js';
import { analizarVideo, etiquetaSegmento, tiempoRelativo } from '../core/comunidad/muro.js';
import * as api from '../features/muro/api.js';
import { REACCIONES_PHX } from '../features/muro/pieSocial.js';
import { abrirTarjetaPerfil } from '../features/social/fase2.js';
import { compartir } from '../features/muro/compartir.js';
import { openAuthModal } from '../features/auth.js';
import { prepararVideo } from '../features/muro/media.js';
import { PESTANAS_JUGADAS, CATEGORIAS_JUGADA, categoriaJugada } from '../../data/jugadas.js';
import { SEGMENTOS } from '../../data/muroEstilo.js';
import { demoActivo } from '../core/sistema/modoDemo.js';
import { montarDeslizarA, marcarDesliza } from '../features/social/gestos.js';

const raiz = document.querySelector('[data-jg]'); const pista = document.querySelector('[data-jg-pista]');
const S = { yo: null, tab: PESTANAS_JUGADAS[0], items: [], hayMas: false, cargando: false, req: 0, actual: -1, sonido: false, paleta: null };
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.ajMovEfectivo === 'reducido';
const vibrar = (ms) => { try { navigator.vibrate?.(ms); } catch { /* sin vibración */ } };
const nombreDe = (a) => a?.nombre_display || a?.username || 'Jugador';
const perfilUrl = (u) => `${href('perfil/')}?u=${encodeURIComponent(u ?? '')}`;
const num = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} k` : String(n));
document.documentElement.classList.add('jg-abierto');   // la página entera es el feed (sin desplazar el fondo)

/* ---------- Pintar ---------- */
function mediaHTML(it) {
  if (String(it.video_url).startsWith('blob:')) return `<video class="jg-video" src="${escapeHTML(it.video_url)}" muted loop playsinline></video>`;   // modo demo: el video que elegiste, sin subirlo
  const v = analizarVideo(it.video_url);
  if (v.ok && v.proveedor === 'propio') return `<video class="jg-video" src="${escapeHTML(v.url)}" muted loop playsinline preload="metadata"></video>`;
  if (v.ok && v.proveedor === 'youtube') return `<div class="jg-yt" data-yt="${escapeHTML(v.id)}"><img class="jg-poster" src="https://i.ytimg.com/vi/${escapeHTML(v.id)}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"></div>`;
  const ico = 'fa-solid fa-arrow-up-right-from-square';   // sin iconos de marca (la web no carga esa fuente)
  return `<a class="jg-fuera" href="${escapeHTML(v.url || '#')}" target="_blank" rel="noopener noreferrer nofollow"><i class="${ico}" aria-hidden="true"></i><b>Ver en ${escapeHTML({ tiktok: 'TikTok', twitch: 'Twitch', kick: 'Kick' }[v.proveedor] ?? 'su página')}</b><small>Este video se abre en otra pestaña</small></a>`;
}
function slideHTML(it, i, maxCalor) {
  const c = categoriaJugada(it.categoria); const a = it.autor ?? {}; const total = Number(it.total) || 0; const k = maxCalor ? Math.min(1, total / maxCalor) : 0;
  const yo = S.yo && S.yo === a.id; const juego = etiquetaSegmento(it.juego);
  return `<section class="jg-slide" data-i="${i}" data-id="${Number(it.id)}" style="--c:${c?.color ?? '#94a3b8'}" aria-label="${escapeHTML(it.titulo || 'Jugada')} de ${escapeHTML(nombreDe(a))}">
    <div class="jg-media" data-jg-media>${mediaHTML(it)}</div>
    <div class="jg-sombra" aria-hidden="true"></div>
    <div class="jg-info">
      ${c ? `<span class="jg-cat"><span aria-hidden="true">${c.emoji}</span>${escapeHTML(c.corto)}</span>` : ''}
      <a class="jg-autor" href="${escapeHTML(perfilUrl(a.username))}" data-jg-u="${escapeHTML(a.username ?? '')}"><span class="jg-av">${avatarHTML(a.avatar_url, nombreDe(a), 36)}</span><span><b>${escapeHTML(nombreDe(a))}</b><small>@${escapeHTML(a.username ?? '')} · ${escapeHTML(tiempoRelativo(it.created_at))}</small></span></a>
      ${it.titulo ? `<p class="jg-titulo">${escapeHTML(it.titulo)}</p>` : ''}
      <p class="jg-meta">${juego ? `<span><i class="fa-solid fa-gamepad" aria-hidden="true"></i>${escapeHTML(juego)}</span>` : ''}<span><i class="fa-regular fa-eye" aria-hidden="true"></i>${num(Number(it.vistas) || 0)}</span></p>
    </div>
    <aside class="jg-riel" aria-label="Acciones">
      <button type="button" class="jg-b jg-rx${it.mia ? ' is-on' : ''}" data-jg-rx aria-pressed="${!!it.mia}" aria-label="${it.mia ? 'Quitar mi reacción' : 'Reaccionar con fuego (mantén pulsado para elegir)'}"><span class="jg-emoji" aria-hidden="true">${escapeHTML(it.mia || '🔥')}</span><small>${num(total)}</small></button>
      <div class="jg-calor" style="--k:${k.toFixed(3)}" title="Calorímetro: cuánto fuego tiene esta jugada" aria-label="Calorímetro ${Math.round(k * 100)} %"><i aria-hidden="true"></i><span aria-hidden="true">🔥</span></div>
      <button type="button" class="jg-b" data-jg-compartir aria-label="Compartir"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i><small>Compartir</small></button>
      ${yo ? '' : `<a class="jg-b" href="${escapeHTML(`${href('duelos/')}?retar=${encodeURIComponent(a.id ?? '')}`)}" aria-label="Retar a duelo a ${escapeHTML(nombreDe(a))}"><i class="fa-solid fa-bolt" aria-hidden="true"></i><small>Retar</small></a>`}
      ${yo ? '<button type="button" class="jg-b" data-jg-borrar aria-label="Eliminar mi jugada"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><small>Eliminar</small></button>' : ''}
      <button type="button" class="jg-b" data-jg-sonido aria-label="${S.sonido ? 'Silenciar' : 'Activar sonido'}"><i class="fa-solid ${S.sonido ? 'fa-volume-high' : 'fa-volume-xmark'}" aria-hidden="true"></i></button>
    </aside>
    <div class="jg-progreso" aria-hidden="true"><i></i></div>
    <div class="jg-paleta" hidden role="group" aria-label="Elige cómo reaccionar">${REACCIONES_PHX.map(([e, n], j) => `<button type="button" data-jg-tipo="${e}" style="--j:${j}" aria-pressed="${e === it.mia}"><span aria-hidden="true">${e}</span><small>${n}</small></button>`).join('')}</div>
  </section>`;
}
function vacioHTML() {
  return `<section class="jg-slide jg-vacio"><div><span class="jg-vacio-ic" aria-hidden="true">🎬</span><b>${S.tab.categoria ? `Aún no hay ${escapeHTML(S.tab.nombre.toLowerCase())}` : 'Aún no hay jugadas'}</b>
    <p>Sube tu mejor golazo, esa atajada imposible o el fail que todos tienen que ver.</p><button type="button" class="jg-boton" data-jg-subir><i class="fa-solid fa-plus" aria-hidden="true"></i> Subir una jugada</button></div></section>`;
}
const maxCalor = () => Math.max(1, ...S.items.map((x) => Number(x.total) || 0));
function pintarTodo() {
  S.actual = -1;
  pista.innerHTML = S.items.length ? S.items.map((it, i) => slideHTML(it, i, maxCalor())).join('') : (S.cargando ? '<section class="jg-slide jg-carga"><span></span></section>' : vacioHTML());
  pista.scrollTop = 0; observar();
}
function agregar(nuevos, desde) {
  const tmp = document.createElement('div'); tmp.innerHTML = nuevos.map((it, k) => slideHTML(it, desde + k, maxCalor())).join('');
  pista.append(...tmp.children); observar();
}
function repintarSlide(i) {
  const el = pista.querySelector(`.jg-slide[data-i="${i}"]`); const it = S.items[i]; if (!el || !it) return;
  const tmp = document.createElement('div'); tmp.innerHTML = slideHTML(it, i, maxCalor()); const nuevo = tmp.firstElementChild;
  el.querySelector('.jg-riel').replaceWith(nuevo.querySelector('.jg-riel')); el.querySelector('.jg-paleta').replaceWith(nuevo.querySelector('.jg-paleta'));
}

/* ---------- Datos ---------- */
async function cargar({ mas = false } = {}) {
  if (S.cargando || (mas && !S.hayMas)) return;
  S.cargando = true; const req = ++S.req;
  if (!mas) { S.items = []; pintarTodo(); }
  try {
    const ult = S.items[S.items.length - 1];
    const r = await api.jugadasFeed({ categoria: S.tab.categoria, orden: S.tab.orden, antes: mas && S.tab.orden !== 'top' ? ult?.id : null, desplazamiento: mas && S.tab.orden === 'top' ? S.items.length : 0, limite: 10 });
    if (req !== S.req) return;
    const nuevos = Array.isArray(r?.items) ? r.items : []; const desde = S.items.length;
    S.items = [...S.items, ...nuevos]; S.hayMas = !!r?.hay_mas; S.cargando = false;
    if (mas) agregar(nuevos, desde); else pintarTodo();
  } catch (e) { S.cargando = false; console.error('[jugadas]', e); if (!mas) pista.innerHTML = `<section class="jg-slide jg-vacio"><div><b>No se pudieron cargar las jugadas.</b><p>${escapeHTML(String(e?.message ?? ''))}</p></div></section>`; }
}

/* ---------- Reproducir solo la que se ve ---------- */
let tVista = 0;
function activar(i) {
  if (i === S.actual) return; S.actual = i; cerrarPaleta();
  pista.querySelectorAll('.jg-slide[data-id]').forEach((el) => {
    const on = Number(el.dataset.i) === i; el.classList.toggle('is-activa', on);
    const v = el.querySelector('video.jg-video');
    if (v) { if (on) { v.muted = !S.sonido; v.currentTime = 0; v.play().catch(() => {}); } else v.pause(); }
    const yt = el.querySelector('.jg-yt');
    if (yt) {
      const ifr = yt.querySelector('iframe');
      if (on && !ifr) { const id = yt.dataset.yt; if (/^[A-Za-z0-9_-]{11}$/.test(id)) yt.insertAdjacentHTML('beforeend', `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${S.sonido ? 0 : 1}&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0&modestbranding=1" title="Video de YouTube" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`); }
      if (!on && ifr) ifr.remove();
    }
  });
  const it = S.items[i]; const sl = pista.querySelector(`.jg-slide[data-i="${i}"]`);
  const poster = sl?.querySelector('.jg-poster')?.src; raiz.querySelector('.jg-fondo').style.backgroundImage = poster ? `url("${poster}")` : '';
  clearTimeout(tVista); if (it && S.yo) tVista = setTimeout(() => api.jugadaVista(Number(it.id)).catch(() => {}), 2000);
  if (i >= S.items.length - 3) cargar({ mas: true });
}
const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) activar(Number(e.target.dataset.i)); }, { root: pista, threshold: 0.6 });
function observar() { pista.querySelectorAll('.jg-slide[data-id]').forEach((el) => io.observe(el)); }
// Barra de progreso de los videos propios
pista.addEventListener('timeupdate', (e) => { const v = e.target; if (!(v instanceof HTMLVideoElement) || !v.duration) return; v.closest('.jg-slide')?.querySelector('.jg-progreso i')?.style.setProperty('--p', String(v.currentTime / v.duration)); }, true);
const ir = (d) => { const destino = pista.querySelector(`.jg-slide[data-i="${Math.max(0, S.actual + d)}"]`); destino?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' }); };

/* ---------- Reaccionar ---------- */
async function reaccionar(i, tipo, { celebrar = false, x, y } = {}) {
  const it = S.items[i]; if (!it) return;
  if (!S.yo) { toast('Inicia sesión para reaccionar.', 'info'); openAuthModal('login'); return; }
  if (celebrar) llamarada(x, y, tipo);
  let final; try { final = await api.jugadaReaccionar(Number(it.id), tipo); } catch (e) { toast(String(e?.message ?? 'No se pudo reaccionar.'), 'error'); return; }
  const r = { ...(it.reacciones ?? {}) };
  if (it.mia) { r[it.mia] = Math.max(0, (r[it.mia] || 1) - 1); if (!r[it.mia]) delete r[it.mia]; }
  if (final) r[final] = (r[final] || 0) + 1;
  S.items[i] = { ...it, mia: final, reacciones: r, total: Object.values(r).reduce((s, n) => s + n, 0) };
  repintarSlide(i); vibrar(12);
  if (final && !celebrar) { const b = pista.querySelector(`.jg-slide[data-i="${i}"] [data-jg-rx]`); if (b) { const r2 = b.getBoundingClientRect(); llamarada(r2.left + r2.width / 2, r2.top, final, 2.2); } }
}
function llamarada(x, y, emoji = '🔥', tam = 5.5) {
  if (quieto() || x == null) return;
  const f = document.createElement('span'); f.className = 'jg-llama'; f.textContent = emoji; f.setAttribute('aria-hidden', 'true');
  f.style.left = `${x}px`; f.style.top = `${y}px`; f.style.fontSize = `${tam}rem`; document.body.append(f); f.addEventListener('animationend', () => f.remove(), { once: true });
}
function abrirPaleta(i) { cerrarPaleta(); const p = pista.querySelector(`.jg-slide[data-i="${i}"] .jg-paleta`); if (p) { p.hidden = false; S.paleta = i; vibrar(10); } }
function cerrarPaleta() { if (S.paleta == null) return; pista.querySelector(`.jg-slide[data-i="${S.paleta}"] .jg-paleta`)?.setAttribute('hidden', ''); S.paleta = null; }

/* ---------- Eventos ---------- */
let ultimoToque = { t: 0, i: -1 }; let tPulsar = 0; let pulsoLargo = false;
pista.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-jg-rx]'); if (!b) return; pulsoLargo = false; clearTimeout(tPulsar); tPulsar = setTimeout(() => { pulsoLargo = true; abrirPaleta(Number(b.closest('.jg-slide').dataset.i)); }, 450); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => pista.addEventListener(ev, () => clearTimeout(tPulsar), true));
pista.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-jg-rx]')) e.preventDefault(); });
pista.addEventListener('click', (e) => {
  const sl = e.target.closest('.jg-slide'); const i = sl ? Number(sl.dataset.i) : -1;
  const tipo = e.target.closest('[data-jg-tipo]'); if (tipo) { cerrarPaleta(); reaccionar(i, tipo.dataset.jgTipo); return; }
  const rx = e.target.closest('[data-jg-rx]'); if (rx) { if (pulsoLargo) { pulsoLargo = false; return; } const it = S.items[i]; reaccionar(i, it?.mia || '🔥'); return; }
  if (e.target.closest('[data-jg-compartir]')) { const it = S.items[i]; compartir({ url: new URL(`${perfilUrl(it?.autor?.username)}#c-${Number(it?.id)}`, location.href).href, titulo: it?.titulo || 'Jugada en Phoenix Evolution Series' }); return; }
  if (e.target.closest('[data-jg-sonido]')) { S.sonido = !S.sonido; const prev = S.actual; S.actual = -1; pista.querySelectorAll('.jg-yt iframe').forEach((f) => f.remove()); activar(prev); S.items.forEach((_, k) => repintarSlide(k)); return; }
  if (e.target.closest('[data-jg-subir]')) { abrirSubir(); return; }
  if (e.target.closest('[data-jg-borrar]')) { borrarJugada(i); return; }
  const au = e.target.closest('[data-jg-u]'); if (au && !e.ctrlKey && !e.metaKey) { e.preventDefault(); abrirTarjetaPerfil({ username: au.dataset.jgU, ancla: au, yo: S.yo }); return; }
  if (S.paleta != null && !e.target.closest('.jg-paleta')) { cerrarPaleta(); return; }
  // Doble toque (o doble clic) sobre el video = 🔥
  if (e.target.closest('[data-jg-media], .jg-sombra') && sl?.dataset.id) {
    const ahora = performance.now();
    if (ultimoToque.i === i && ahora - ultimoToque.t < 320) { ultimoToque = { t: 0, i: -1 }; const it = S.items[i]; if (!it?.mia) reaccionar(i, '🔥', { celebrar: true, x: e.clientX, y: e.clientY }); else llamarada(e.clientX, e.clientY, it.mia); return; }
    ultimoToque = { t: ahora, i };
    const v = sl.querySelector('video.jg-video'); if (v) setTimeout(() => { if (ultimoToque.i === i && performance.now() - ultimoToque.t >= 300) { if (v.paused) v.play().catch(() => {}); else v.pause(); sl.classList.toggle('is-pausa', v.paused); } }, 330);
  }
});
document.querySelector('.jg-tabs')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-jg-tab]'); if (!b) return;
  S.tab = PESTANAS_JUGADAS.find((p) => p.id === b.dataset.jgTab) ?? PESTANAS_JUGADAS[0];
  document.querySelectorAll('[data-jg-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
  history.replaceState(null, '', S.tab.id === 'para-ti' ? location.pathname : `${location.pathname}?ver=${S.tab.id}`);
  cargar();
});
document.querySelector('[data-jg-subir]')?.addEventListener('click', () => abrirSubir());
document.querySelectorAll('[data-jg-paso]').forEach((b) => b.addEventListener('click', () => ir(Number(b.dataset.jgPaso))));
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, dialog')) return;
  if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); ir(1); }
  else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); ir(-1); }
  else if (e.key === 'm') document.querySelector('.jg-slide.is-activa [data-jg-sonido]')?.click();
  else if (e.key === 'Escape') cerrarPaleta();
});

/* ---------- Eliminar tu jugada ---------- */
async function borrarJugada(i) {
  const it = S.items[i]; if (!it || !S.yo || it.autor?.id !== S.yo) return;
  if (!(await confirmar('¿Eliminar esta jugada? Se borra el video para todos y no se puede deshacer.', { titulo: 'Eliminar jugada', aceptar: 'Eliminar', peligro: true }))) return;
  try { await api.borrarClip(Number(it.id)); } catch (e) { toast(String(e?.message ?? 'No se pudo eliminar.'), 'error'); return; }
  S.items.splice(i, 1); pintarTodo(); toast('Jugada eliminada.', 'ok');
}

/* ---------- Subir una jugada ---------- */
function abrirSubir() {
  if (!S.yo) { toast('Inicia sesión para subir una jugada.', 'info'); openAuthModal('login'); return; }
  const d = document.createElement('dialog'); d.className = 'jg-dlg';
  d.innerHTML = `<form class="jg-dlg-caja" method="dialog">
    <header><h2>Subir una jugada</h2><button type="button" class="jg-x" data-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
    <p class="jg-paso">1 · ¿Qué tipo de jugada es?</p>
    <div class="jg-cats" role="radiogroup" aria-label="Tipo de jugada">${CATEGORIAS_JUGADA.map((c, i) => `<button type="button" role="radio" data-cat="${c.id}" aria-checked="${i === 0}" style="--c:${c.color}"><span aria-hidden="true">${c.emoji}</span>${escapeHTML(c.corto)}</button>`).join('')}</div>
    <p class="jg-paso">2 · El video <small>Un archivo tuyo (máx. 15 s) o un enlace de YouTube, TikTok, Kick o Twitch</small></p>
    <label class="jg-archivo"><input type="file" accept="video/mp4,video/webm,video/quicktime" data-file hidden><i class="fa-solid fa-film" aria-hidden="true"></i><span data-file-tx>Elegir un video de tu celular o PC</span></label>
    <input class="jg-campo" data-enlace type="url" inputmode="url" maxlength="300" placeholder="…o pega un enlace (https://youtube.com/shorts/…)">
    <p class="jg-paso">3 · Título y juego</p>
    <input class="jg-campo" data-titulo maxlength="80" placeholder="Ej.: Chilena en el minuto 90">
    <div class="jg-juegos" role="radiogroup" aria-label="Juego">${SEGMENTOS.map(([id, n], i) => `<button type="button" role="radio" data-juego="${id}" aria-checked="${i === 0}">${escapeHTML(n)}</button>`).join('')}</div>
    <button type="button" class="jg-boton jg-publicar" data-publicar><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Publicar jugada</button>
  </form>`;
  document.body.append(d); d.showModal();
  const radio = (sel, b) => d.querySelectorAll(sel).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  let archivo = null;
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-cerrar]')) { d.close(); return; }
    const c = e.target.closest('[data-cat]'); if (c) radio('[data-cat]', c);
    const j = e.target.closest('[data-juego]'); if (j) radio('[data-juego]', j);
  });
  d.addEventListener('close', () => d.remove());
  d.querySelector('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = await prepararVideo(f); if (!r.ok) { toast(r.error, 'error'); e.target.value = ''; return; }
    archivo = { file: f, ext: r.ext, tipo: r.tipo }; d.querySelector('[data-file-tx]').textContent = `✓ ${f.name}`; d.querySelector('[data-enlace]').value = '';
  });
  d.querySelector('[data-publicar]').addEventListener('click', async (e) => {
    const b = e.currentTarget; const enlace = d.querySelector('[data-enlace]').value.trim();
    if (!archivo && !enlace) { toast('Elige un video o pega un enlace.', 'error'); return; }
    if (!archivo) { const v = analizarVideo(enlace); if (!v.ok) { toast(v.error || 'Enlace no válido.', 'error'); return; } }
    b.disabled = true; b.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Publicando…';
    try {
      const url = !archivo ? enlace : demoActivo() ? URL.createObjectURL(archivo.file) : await api.subirVideo(archivo.file, S.yo, archivo.ext, archivo.tipo);   // en demo no se sube nada
      await api.jugadaPublicar(d.querySelector('[data-titulo]').value.trim(), url, d.querySelector('[data-juego][aria-checked="true"]')?.dataset.juego ?? null, d.querySelector('[data-cat][aria-checked="true"]')?.dataset.cat ?? null);
      d.close(); toast('¡Jugada publicada!', 'ok'); S.tab = PESTANAS_JUGADAS[0]; document.querySelectorAll('[data-jg-tab]').forEach((x, k) => x.setAttribute('aria-pressed', String(k === 0))); cargar();
    } catch (err) { toast(String(err?.message ?? 'No se pudo publicar.'), 'error'); b.disabled = false; b.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Publicar jugada'; }
  });
}

/* ---------- Volver a Social: deslizar a la derecha o la flecha ← (sale hacia la derecha, como Reels → Inicio) ---------- */
montarDeslizarA(raiz, { lado: 'der', url: href('social/'), etiqueta: 'Social', icono: 'fa-earth-americas' });
document.querySelector('.jg-volver')?.addEventListener('click', () => marcarDesliza('der'));

/* ---------- Arranque ---------- */
{ const ver = new URLSearchParams(location.search).get('ver'); const t = PESTANAS_JUGADAS.find((p) => p.id === ver); if (t) { S.tab = t; document.querySelectorAll('[data-jg-tab]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.jgTab === t.id))); } }
let arrancado = false;
onSession(({ session }) => { const id = session?.user?.id ?? null; const cambio = id !== S.yo; S.yo = id; if (!arrancado || cambio) { arrancado = true; cargar(); } });
