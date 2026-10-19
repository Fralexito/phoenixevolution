// VISOR DE FOTOS de Social con dos estilos (19-oct-2026, Fralex: «que la forma de ver fotos sea como la de Instagram pero también de Facebook,
// que haya un botón intercambiable entre los 2»). El botón de arriba cambia de estilo y se recuerda en este navegador.
//   · Instagram (inmersivo): fondo negro y la foto protagonista; autor arriba; abajo puntitos, 🔥 y 💬 con su número y el texto (se despliega).
//     Doble toque = 🔥. Deslizar de lado pasa de foto; deslizar hacia abajo cierra.
//   · Facebook (con detalles): la foto a la izquierda en un «teatro» gris oscuro; a la derecha el autor, el texto, las reacciones, las
//     respuestas y una caja para responder ahí mismo. En celular: la foto arriba y los detalles debajo.
// Solo DOM: los datos y las acciones los pasa pages/social.js (op.datos, op.respuestas, op.responder, op.reaccionar, op.yo, op.alCambiar).
import { escapeHTML } from '../../core/sistema/dom.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { href } from '../../core/sistema/config.js';
import { tiempoRelativo, textoAHTML, resumenReacciones } from '../../core/comunidad/muro.js';
import { stickerHTML } from './stickers.js';

const CLAVE = 'pes-visor-fotos';
const leerModo = () => { try { return localStorage.getItem(CLAVE) === 'fb' ? 'fb' : 'ig'; } catch { return 'ig'; } };
const guardarModo = (m) => { try { localStorage.setItem(CLAVE, m); } catch { /* sin almacenamiento: solo dura esta visita */ } };
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const perfil = (u) => `${href('perfil/')}?u=${encodeURIComponent(u ?? '')}`;
const total = (it) => Object.values(it?.reacciones ?? {}).reduce((s, n) => s + (Number(n) || 0), 0);

export function montarVisorFotos(feed, op = {}) {
  const dlg = document.createElement('dialog'); dlg.className = 'gxv'; dlg.setAttribute('aria-label', 'Ver foto');
  document.body.append(dlg);
  const S = { fotos: [], i: 0, id: null, modo: leerModo(), resp: null, textoLargo: false };

  const autorHTML = (it, clase) => { const a = it?.autor ?? {}; return `<a class="${clase}" href="${escapeHTML(perfil(a.username))}"><span class="gxv-av">${avatarHTML(a.avatar_url, a.nombre_display, 36)}</span><span class="gxv-quien"><b>${escapeHTML(a.nombre_display || a.username || 'Jugador')}</b><small>${escapeHTML(tiempoRelativo(it?.created_at))}</small></span></a>`; };
  const nResp = (it) => (S.resp ? S.resp.length : Number(it?.respuestas) || 0);   // con la lista cargada manda la lista (el contador del feed puede ir atrasado)
  const accionesHTML = (it) => { const n = total(it); const c = nResp(it);
    return `<button type="button" class="gxv-acc${it?.mia ? ' is-on' : ''}" data-gxv-rx aria-pressed="${!!it?.mia}" aria-label="${it?.mia ? 'Quitar mi reacción' : 'Reaccionar con fuego'}"><span aria-hidden="true">${escapeHTML(it?.mia || '🔥')}</span>${n ? `<b>${n}</b>` : ''}</button>
      <button type="button" class="gxv-acc" data-gxv-comentar aria-label="Ver respuestas"><i class="fa-regular fa-comment" aria-hidden="true"></i><b data-gxv-nresp>${c || ''}</b></button>`; };
  const respuestasHTML = () => {
    if (S.resp === null) return '<p class="gxv-nota">Cargando respuestas…</p>';
    if (!S.resp.length) return '<p class="gxv-nota">Aún no hay respuestas. Sé el primero.</p>';
    return S.resp.map((r) => `<div class="gxv-resp"><span class="gxv-av">${avatarHTML(r.avatar_url, r.nombre_display, 30)}</span><div class="gxv-resp-c"><a href="${escapeHTML(perfil(r.username))}">${escapeHTML(r.nombre_display || 'Jugador')}</a>${r.texto ? `<p>${textoAHTML(r.texto)}</p>` : ''}${r.sticker ? `<div class="gxv-resp-stk">${stickerHTML(r.sticker)}</div>` : ''}<small>${escapeHTML(tiempoRelativo(r.created_at))}</small></div></div>`).join('');
  };

  function pintar({ soloFoto = false } = {}) {
    const it = op.datos?.(S.id); const f = S.fotos[S.i]; const varias = S.fotos.length > 1;
    dlg.dataset.modo = S.modo;
    if (soloFoto && dlg.querySelector('.gxv-pista')) {
      dlg.querySelector('.gxv-pista').innerHTML = `<img src="${escapeHTML(f.src)}" alt="${escapeHTML(f.alt)}" class="gxv-foto" draggable="false">`;
      dlg.querySelectorAll('.gxv-punto').forEach((p, k) => p.classList.toggle('is-on', k === S.i));
      const cta = dlg.querySelector('.gxv-cuenta'); if (cta) cta.textContent = varias ? `${S.i + 1} / ${S.fotos.length}` : '';
      return;
    }
    const resumen = resumenReacciones(it?.reacciones).slice(0, 3).map((x) => x.tipo).join('');
    const texto = String(it?.texto ?? '').trim();
    dlg.innerHTML = `
      <div class="gxv-barra">
        <div class="gxv-estilos" role="group" aria-label="Estilo del visor">
          <button type="button" data-gxv-modo="ig" aria-pressed="${S.modo === 'ig'}" title="Estilo Instagram: la foto a pantalla completa"><i class="fa-brands fa-instagram" aria-hidden="true"></i><span>Instagram</span></button>
          <button type="button" data-gxv-modo="fb" aria-pressed="${S.modo === 'fb'}" title="Estilo Facebook: la foto con sus detalles y respuestas"><i class="fa-brands fa-facebook" aria-hidden="true"></i><span>Facebook</span></button>
        </div>
        <button type="button" class="gxv-x" data-gxv-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="gxv-escena" data-gxv-escena>
        ${S.modo === 'ig' && it ? `<header class="gxv-cab">${autorHTML(it, 'gxv-autor')}</header>` : ''}
        ${varias ? '<button type="button" class="gxv-flecha gxv-ant" data-gxv-paso="-1" aria-label="Foto anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button><button type="button" class="gxv-flecha gxv-sig" data-gxv-paso="1" aria-label="Foto siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' : ''}
        <div class="gxv-pista" data-gxv-pista><img src="${escapeHTML(f.src)}" alt="${escapeHTML(f.alt)}" class="gxv-foto" draggable="false"></div>
        ${S.modo === 'fb' && varias ? `<p class="gxv-cuenta">${S.i + 1} / ${S.fotos.length}</p>` : ''}
        ${S.modo === 'ig' ? `<footer class="gxv-pie">
          ${varias ? `<div class="gxv-puntos" aria-hidden="true">${S.fotos.map((_, k) => `<span class="gxv-punto${k === S.i ? ' is-on' : ''}"></span>`).join('')}</div>` : ''}
          ${it ? `<div class="gxv-acciones">${accionesHTML(it)}</div>${texto ? `<p class="gxv-texto${S.textoLargo ? ' is-abierto' : ''}" data-gxv-texto><b>${escapeHTML(it.autor?.nombre_display || '')}</b> ${textoAHTML(texto)}</p>` : ''}` : ''}
        </footer>` : ''}
      </div>
      ${S.modo === 'fb' ? `<aside class="gxv-panel">
        ${it ? `${autorHTML(it, 'gxv-autor')}
        ${texto ? `<p class="gxv-panel-tx">${textoAHTML(texto)}</p>` : ''}
        <div class="gxv-resumen">${total(it) ? `<span><span aria-hidden="true">${resumen}</span> ${total(it)}</span>` : '<span>Sé el primero en reaccionar</span>'}<span data-gxv-nresp-tx>${nResp(it)} respuesta${nResp(it) === 1 ? '' : 's'}</span></div>
        <div class="gxv-botones">${accionesHTML(it)}</div>
        <div class="gxv-resps" data-gxv-resps>${respuestasHTML()}</div>
        ${op.yo?.() ? '<form class="gxv-responder" data-gxv-responder><input maxlength="500" placeholder="Escribe una respuesta…" aria-label="Escribe una respuesta" autocomplete="off"><button type="submit" aria-label="Enviar respuesta"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></form>' : '<p class="gxv-nota">Inicia sesión para responder.</p>'}` : '<p class="gxv-nota">Foto</p>'}
      </aside>` : ''}`;
    if (S.modo === 'fb' && S.resp === null) cargarRespuestas();
  }
  async function cargarRespuestas() {
    if (!op.respuestas || S.id == null) { S.resp = []; return; }
    const id = S.id;
    try { const r = await op.respuestas(id); if (id === S.id) S.resp = r ?? []; } catch { if (id === S.id) S.resp = []; }
    const caja = dlg.querySelector('[data-gxv-resps]'); if (caja && id === S.id) caja.innerHTML = respuestasHTML();
    if (id === S.id) { const n = S.resp.length; dlg.querySelectorAll('[data-gxv-nresp]').forEach((b) => { b.textContent = n || ''; }); const tx = dlg.querySelector('[data-gxv-nresp-tx]'); if (tx) tx.textContent = `${n} respuesta${n === 1 ? '' : 's'}`; }
  }
  const pasar = (d) => { if (S.fotos.length < 2) return; S.i = (S.i + d + S.fotos.length) % S.fotos.length; dlg.querySelector('.gxv-pista')?.setAttribute('data-dir', d > 0 ? 'sig' : 'ant'); pintar({ soloFoto: true }); };
  const llamarada = (x, y) => { if (quieto() || x == null) return; const l = document.createElement('span'); l.className = 'gx-llama'; l.textContent = '🔥'; l.setAttribute('aria-hidden', 'true'); l.style.left = `${x}px`; l.style.top = `${y}px`; dlg.append(l); l.addEventListener('animationend', () => l.remove(), { once: true }); };
  async function reaccionar({ soloPoner = false, x, y } = {}) {
    const it = op.datos?.(S.id); if (!it || !op.reaccionar) return;
    llamarada(x, y);
    if (soloPoner && it.mia) return;   // doble toque con tu reacción ya puesta: solo celebra (no la quita)
    await op.reaccionar(S.id); pintar();
  }

  // Abrir: tocar una foto de una publicación
  feed.addEventListener('click', (e) => {
    const a = e.target.closest('.sx-post-cuerpo a'); const img = a?.querySelector(':scope > img'); if (!img || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const todas = [...a.closest('.sx-post-cuerpo').querySelectorAll('a > img')];
    S.fotos = todas.map((x) => ({ src: x.closest('a').getAttribute('href'), alt: x.getAttribute('alt') || 'Foto' })); S.i = Math.max(0, todas.indexOf(img));
    S.id = Number(a.closest('[data-pub]')?.dataset.pub) || null; S.resp = null; S.textoLargo = false;
    pintar(); dlg.showModal(); document.documentElement.classList.add('gxv-abierto');
  });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('gxv-abierto'); });

  dlg.addEventListener('click', (e) => {
    const m = e.target.closest('[data-gxv-modo]'); if (m) { if (m.dataset.gxvModo !== S.modo) { S.modo = m.dataset.gxvModo; guardarModo(S.modo); pintar(); } return; }
    if (e.target.closest('[data-gxv-cerrar]')) { dlg.close(); return; }
    const p = e.target.closest('[data-gxv-paso]'); if (p) { pasar(Number(p.dataset.gxvPaso)); return; }
    if (e.target.closest('[data-gxv-rx]')) { reaccionar(); return; }
    if (e.target.closest('[data-gxv-comentar]')) { if (S.modo !== 'fb') { S.modo = 'fb'; guardarModo('fb'); pintar(); } dlg.querySelector('[data-gxv-responder] input')?.focus(); return; }
    const tx = e.target.closest('[data-gxv-texto]'); if (tx && !e.target.closest('a')) { S.textoLargo = !S.textoLargo; tx.classList.toggle('is-abierto', S.textoLargo); return; }
    if (S.modo === 'ig' && e.target.matches('[data-gxv-escena], [data-gxv-pista]')) dlg.close();   // tocar el fondo negro cierra (como en Instagram)
  });
  dlg.addEventListener('keydown', (e) => { if (e.target.closest('input')) return; if (e.key === 'ArrowRight') pasar(1); if (e.key === 'ArrowLeft') pasar(-1); });
  // Gestos sobre la foto: doble toque = 🔥; deslizar de lado pasa de foto; deslizar hacia abajo cierra (estilo Instagram)
  let ini = null; let ultimo = 0;
  dlg.addEventListener('pointerdown', (e) => { ini = e.target.closest('.gxv-escena') ? { x: e.clientX, y: e.clientY } : null; });
  dlg.addEventListener('pointerup', (e) => {
    if (!ini) return; const dx = e.clientX - ini.x; const dy = e.clientY - ini.y; ini = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { pasar(dx < 0 ? 1 : -1); return; }
    if (S.modo === 'ig' && dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) { dlg.close(); return; }
    if (!e.target.closest('.gxv-foto') || Math.hypot(dx, dy) > 10) return;
    const t = performance.now(); if (t - ultimo < 300) { ultimo = 0; reaccionar({ soloPoner: true, x: e.clientX, y: e.clientY }); } else ultimo = t;
  });
  // Responder desde el panel (estilo Facebook)
  dlg.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-gxv-responder]'); if (!f) return; e.preventDefault();
    const input = f.querySelector('input'); const t = input.value.trim(); if (!t || !op.responder) return;
    const b = f.querySelector('button'); b.disabled = true;
    try { await op.responder(S.id, t); input.value = ''; S.resp = null; await op.alCambiar?.(S.id); pintar(); }
    catch (err) { input.setCustomValidity(String(err?.message ?? 'No se pudo responder.')); input.reportValidity(); setTimeout(() => input.setCustomValidity(''), 2500); b.disabled = false; }
  });
}
