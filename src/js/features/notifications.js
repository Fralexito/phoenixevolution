// Campana con historial PERSISTENTE (tabla `notificaciones`) + aviso en tiempo real. Ronda 192: «con vida».
// Las crea la BD (triggers y tareas programadas); el cliente solo lee, marca leída/no leída y borra las suyas (RLS de la 003).
// Qué añade sobre la versión básica (misma estética Galaxy: panel, tarjetas notif-item, acento cian):
//   · Campana que «suena» (se balancea) al llegar algo; más fuerte si es urgente (reto directo, sala lista…). Contador que salta.
//   · Filtros (Todas / No leídas / Duelos / Social / Otros) con su contador; grupos Hoy / Ayer / Esta semana / Anteriores; «hace 5 min».
//   · Por aviso: marcar leída o no leída, y descartar (botón, tecla Supr o deslizando en el móvil) con «Deshacer» durante 5 s.
//   · «Ver más» (paginación), teclado (flechas, Esc), sincroniza entre pestañas y acceso directo a las preferencias de avisos.
// Lógica pura en core/notifs.js. Movimiento: solo transform/opacity, ≤ 260 ms salvo el balanceo; prefers-reduced-motion lo apaga.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { toast, beep } from '../core/toast.js';
import { href } from '../core/config.js';
import { enlaceAvisoSeguro } from '../core/avisos.js';
import { categoriaDe, FILTROS, filtrar, conteoPorFiltro, agruparPorTiempo, TITULO_GRUPO, haceCuanto, esUrgente, alcanzaDescartar } from '../core/notifs.js';
import { regionAhora } from './ajustes.js';
import { isRadarOn } from './radar.js';
import { showHolo } from './holo.js';

const ICON = {
  RETO_DIRECTO: 'fa-bolt', RETO_HOST: 'fa-server', RETO_ACEPTADO: 'fa-handshake', RETO_RECHAZADO: 'fa-ban',
  SALA_LISTA: 'fa-door-open', CONFIRMAR_PARTIDO: 'fa-clock', AVISO_FINAL: 'fa-triangle-exclamation',
  PARTIDO_CONFIRMADO: 'fa-circle-check', PARTIDO_CANCELADO: 'fa-circle-xmark', RETO_EXPIRADO: 'fa-hourglass-end',
  INVITACION_RETO: 'fa-user-plus', UNION_RETO: 'fa-users', SALIO_RETO: 'fa-user-minus',
  AMISTAD_SOLICITUD: 'fa-user-plus', AMISTAD_ACEPTADA: 'fa-user-group', SEGUIDOR_NUEVO: 'fa-heart',
  ESPECTADOR_SOLICITUD: 'fa-eye', ESPECTADOR_APROBADO: 'fa-eye', MURO_RESPUESTA: 'fa-comment', MENCION: 'fa-at', LOGRO: 'fa-medal', EVENTO: 'fa-calendar-day', CLAN: 'fa-shield-halved',
  RESULTADO_PROPUESTO: 'fa-clipboard-check', RESULTADO_CONFIRMADO: 'fa-circle-check', RESULTADO_DISPUTADO: 'fa-scale-balanced',
  SALA_ABIERTA: 'fa-tower-broadcast', MODERACION: 'fa-gavel',
};
const DESTINO = { AMISTAD_SOLICITUD: 'amigos/', AMISTAD_ACEPTADA: 'amigos/', SEGUIDOR_NUEVO: 'amigos/', ESPECTADOR_SOLICITUD: 'en-vivo/', ESPECTADOR_APROBADO: 'en-vivo/', MURO_RESPUESTA: 'perfil/', LOGRO: 'logros/', EVENTO: 'eventos/', CLAN: 'clanes/', RESULTADO_PROPUESTO: 'mis-partidos/', RESULTADO_CONFIRMADO: 'mis-partidos/', RESULTADO_DISPUTADO: 'mis-partidos/' };   // el resto de avisos son de retos → Duelos
const fmt = (iso) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...regionAhora() });
const LIMIT = 30;
const DESHACER_MS = 5000;
const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const reducido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const animar = (el, frames, opts) => { if (!el?.animate || reducido()) return null; try { return el.animate(frames, opts); } catch { return null; } };

export function initNotifications(userId) {
  const btn = document.getElementById('btn-notif');
  const panel = document.getElementById('dropdown-notif');
  const dot = document.getElementById('notif-dot');
  if (!btn || !panel || !dot) return () => {};
  btn.setAttribute('aria-controls', 'dropdown-notif'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-haspopup', 'dialog');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Notificaciones');
  btn.classList.add('notif-campana');

  let items = []; let filtro = 'todas'; let hayMas = false; let cargandoMas = false; let primeraApertura = true;
  const papelera = new Map();     // id → aviso «en espera» de borrarse (se puede deshacer)
  let tPapelera = 0; let tReloj = 0; let ultimoConteo = 0; let error = '';

  const visibles = () => items.filter((n) => !papelera.has(n.id));
  const unread = () => visibles().filter((n) => !n.leida).length;
  const tz = () => regionAhora().timeZone || 'America/Lima';

  // ── Campana ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function pintarCampana() {
    const u = unread();
    dot.hidden = u === 0; dot.textContent = u > 9 ? '9+' : String(u || '');
    btn.setAttribute('aria-label', u ? `Notificaciones, ${u} sin leer` : 'Notificaciones');
    btn.classList.toggle('notif-hay', u > 0);
    if (u > ultimoConteo) animar(dot, [{ transform: 'scale(.4)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
    ultimoConteo = u;
  }
  /** Balanceo de campana (como un timbre). Urgente = más amplio + destello. */
  function sonar(urgente) {
    const i = btn.querySelector('i');
    const a = urgente ? 22 : 14;
    animar(i, [0, -a, a * 0.85, -a * 0.6, a * 0.4, -a * 0.2, 0].map((r) => ({ transform: `rotate(${r}deg)` })), { duration: urgente ? 900 : 650, easing: 'ease-in-out' });
    if (urgente && !reducido()) { btn.classList.remove('notif-destello'); void btn.offsetWidth; btn.classList.add('notif-destello'); }
  }

  // ── Panel ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  function filaHTML(n) {
    const cat = categoriaDe(n.tipo); const rel = haceCuanto(n.created_at);
    const destino = href(enlaceAvisoSeguro(n.enlace) ?? DESTINO[n.tipo] ?? 'duelos/');
    const accion = n.leida ? 'Marcar como no leída' : 'Marcar como leída';
    return `<div class="notif-fila" data-fila="${n.id}">
      <a href="${escapeHTML(destino)}" data-n="${n.id}" class="notif-item ${n.leida ? '' : 'is-new'}${esUrgente(n.tipo) && !n.leida ? ' is-urgente' : ''}">
        <span class="notif-ico notif-c-${cat}" aria-hidden="true"><i class="fa-solid ${ICON[n.tipo] ?? 'fa-bell'}"></i></span>
        <span class="min-w-0 flex-1"><b class="block text-white text-xs font-display uppercase tracking-wide">${escapeHTML(n.titulo)}</b>
          <span class="notif-msg">${escapeHTML(n.mensaje)}</span>
          <span class="block text-[12px] text-gray-500 mt-0.5" title="${escapeHTML(fmt(n.created_at))}">${escapeHTML(rel ?? fmt(n.created_at))}${n.fecha_ref ? ` · partido ${escapeHTML(fmt(n.fecha_ref))}` : ''}</span></span>
        ${n.leida ? '' : '<i class="notif-punto" aria-hidden="true"></i>'}
      </a>
      <span class="notif-acc">
        <button type="button" data-leer="${n.id}" class="notif-mini" title="${accion}" aria-label="${accion}"><i class="fa-${n.leida ? 'regular' : 'solid'} fa-circle"></i></button>
        <button type="button" data-borrar="${n.id}" class="notif-mini" title="Descartar" aria-label="Descartar aviso"><i class="fa-solid fa-xmark"></i></button>
      </span></div>`;
  }

  function cuerpoHTML() {
    if (error && !items.length) return `<div class="notif-vacio"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHTML(error)}</p><button type="button" data-reintentar class="text-galaxy-400 underline text-xs">Reintentar</button></div>`;
    const lista = filtrar(visibles(), filtro);
    if (!lista.length) {
      const msg = filtro === 'todas' ? 'Sin novedades por ahora.' : filtro === 'no_leidas' ? '¡Todo al día! No tienes avisos sin leer.' : 'Nada en esta categoría.';
      return `<div class="notif-vacio"><i class="fa-solid ${filtro === 'no_leidas' ? 'fa-check-double' : 'fa-bell-slash'}"></i><p>${msg}</p></div>`;
    }
    return agruparPorTiempo(lista, new Date(), tz()).map((g) => `<p class="notif-grupo">${TITULO_GRUPO[g.grupo]}</p>${g.items.map(filaHTML).join('')}`).join('')
      + (hayMas && filtro === 'todas' ? `<button type="button" data-mas class="notif-mas">${cargandoMas ? '<i class="fa-solid fa-spinner fa-spin"></i> Cargando…' : 'Ver avisos anteriores'}</button>` : '');
  }

  function deshacerHTML() {
    if (!papelera.size) return '';
    return `<div class="notif-deshacer" role="status"><span>${papelera.size === 1 ? 'Aviso descartado' : `${papelera.size} avisos descartados`}</span><button type="button" data-deshacer>Deshacer</button></div>`;
  }

  function paint() {
    pintarCampana();
    if (panel.hidden) return;
    const u = unread(); const c = conteoPorFiltro(visibles());
    const scroll = panel.querySelector('.notif-lista')?.scrollTop ?? 0;
    const foco = document.activeElement?.closest?.('#dropdown-notif') ? document.activeElement.dataset.n || document.activeElement.dataset.filtro : null;
    panel.innerHTML = `
      <div class="px-4 pt-3 pb-2 border-b border-galaxy-border">
        <div class="flex items-center gap-2">
          <span class="font-display font-bold text-xs uppercase tracking-widest text-gray-400">Notificaciones</span>
          ${u ? `<span class="notif-pill">${u} nueva${u === 1 ? '' : 's'}</span>` : ''}
          <span class="ml-auto flex items-center gap-1">
            ${u ? '<button type="button" data-n="all" class="notif-mini" title="Marcar todas como leídas" aria-label="Marcar todas como leídas"><i class="fa-solid fa-check-double"></i></button>' : ''}
            <a href="${escapeHTML(href('amigos/?tab=avisos'))}" class="notif-mini" title="Qué avisos quiero recibir" aria-label="Preferencias de avisos"><i class="fa-solid fa-sliders"></i></a>
          </span>
        </div>
        <div class="notif-chips" role="tablist" aria-label="Filtrar avisos">${FILTROS.map((f) => `<button type="button" role="tab" data-filtro="${f.id}" aria-selected="${filtro === f.id}" class="notif-chip">${escapeHTML(f.titulo)}${c[f.id] && f.incluye ? `<b>${c[f.id] > 9 ? '9+' : c[f.id]}</b>` : ''}</button>`).join('')}</div>
      </div>
      <div class="notif-lista max-h-[60vh] overflow-y-auto overscroll-contain">${cuerpoHTML()}</div>${deshacerHTML()}`;
    panel.querySelector('.notif-lista').scrollTop = scroll;
    const chips = panel.querySelector('.notif-chips'); chips.classList.toggle('notif-desborda', chips.scrollWidth > chips.clientWidth + 1);   // degradado solo si hay filtros fuera de la vista
    panel.querySelector('.notif-chip[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (foco) panel.querySelector(`[data-n="${CSS.escape(foco)}"], [data-filtro="${CSS.escape(foco)}"]`)?.focus({ preventScroll: true });
  }

  /** Entrada escalonada (al abrir o al cambiar de filtro): las primeras filas caen en cascada. */
  function cascada() {
    [...panel.querySelectorAll('.notif-fila')].slice(0, 8).forEach((f, i) => animar(f, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: i * 28, easing: EASE, fill: 'backwards' }));
  }

  function abrir(v) {
    if (v === !panel.hidden) return;
    panel.hidden = !v; btn.setAttribute('aria-expanded', String(v));
    clearInterval(tReloj);
    if (!v) return;
    paint();
    animar(panel, [{ opacity: 0, transform: 'translateY(-6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EASE });
    if (primeraApertura || unread()) cascada();
    primeraApertura = false;
    tReloj = setInterval(() => { if (!panel.hidden) paint(); }, 60_000);     // «hace 5 min» se mantiene al día
  }

  // ── Datos ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  // `enlace` existe desde la migración 033. Si aún no está aplicada, se reintenta sin esa columna: la campana nunca debe quedarse muda por eso.
  const COLS = 'id, tipo, titulo, mensaje, reto_id, fecha_ref, leida, created_at';
  const pedir = (cols, antesDe) => {
    let q = supabase.from('notificaciones').select(cols).eq('usuario_id', userId).order('created_at', { ascending: false }).limit(LIMIT);
    if (antesDe) q = q.lt('created_at', antesDe);
    return q;
  };
  async function traer(antesDe) {
    let { data, error: e } = await pedir(`${COLS}, enlace`, antesDe);
    if (e) { console.warn('[notif] carga con «enlace» falló; reintento sin esa columna:', e.message); ({ data, error: e } = await pedir(COLS, antesDe)); }
    if (e) throw e;
    return data ?? [];
  }
  async function load() {
    try { const d = await traer(); items = d; hayMas = d.length === LIMIT; error = ''; }
    catch (e) { console.error('[notif] carga:', e.message); error = 'No se pudieron cargar los avisos.'; }
    paint();
  }
  async function cargarMas() {
    if (cargandoMas || !items.length) return;
    cargandoMas = true; paint();
    try { const d = await traer(items.at(-1).created_at); const ids = new Set(items.map((n) => n.id)); items.push(...d.filter((n) => !ids.has(n.id))); hayMas = d.length === LIMIT; }
    catch (e) { console.error('[notif] más:', e.message); toast('No se pudieron cargar más avisos.', 'error', { key: 'notif-mas' }); }
    cargandoMas = false; paint();
  }

  async function marcar(ids, leida = true) {
    const cambia = items.filter((n) => ids.includes(n.id) && n.leida !== leida);
    if (!cambia.length) return;
    cambia.forEach((n) => { n.leida = leida; }); paint();
    const { error: e } = await supabase.from('notificaciones').update({ leida }).in('id', cambia.map((n) => n.id));
    if (e) { console.error('[notif] marcar:', e.message); cambia.forEach((n) => { n.leida = !leida; }); paint(); toast('No se pudo actualizar el aviso.', 'error', { key: 'notif-marcar' }); }
  }

  /** Descartar: desaparece al instante; se borra de verdad a los 5 s si no se deshace. */
  function descartar(id, fila) {
    if (!items.some((n) => n.id === id)) return;
    const quitar = () => { papelera.set(id, true); paint(); clearTimeout(tPapelera); tPapelera = setTimeout(vaciarPapelera, DESHACER_MS); };
    const anim = fila && animar(fila, [{ opacity: Number(fila.style.opacity || 1), transform: fila.style.transform || 'none' }, { opacity: 0, transform: `translateX(${(parseFloat(fila.style.transform?.slice(11)) || 0) < 0 ? -60 : 60}px)` }], { duration: 180, easing: EASE });
    if (anim) anim.onfinish = quitar; else quitar();
  }
  async function vaciarPapelera() {
    if (!papelera.size) return;
    const ids = [...papelera.keys()];
    items = items.filter((n) => !papelera.has(n.id)); papelera.clear(); paint();
    const { error: e } = await supabase.from('notificaciones').delete().in('id', ids);
    if (e) { console.error('[notif] borrar:', e.message); toast('No se pudieron descartar algunos avisos.', 'error', { key: 'notif-borrar' }); load(); }
  }
  function deshacer() { clearTimeout(tPapelera); papelera.clear(); paint(); cascada(); }

  // ── Eventos ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const onBtn = (e) => { e.stopPropagation(); abrir(panel.hidden); };
  const onPanel = (e) => {
    const f = e.target.closest('[data-filtro]')?.dataset.filtro;
    if (f) { if (f !== filtro) { filtro = f; paint(); cascada(); } return; }
    if (e.target.closest('[data-mas]')) { cargarMas(); return; }
    if (e.target.closest('[data-reintentar]')) { load(); return; }
    if (e.target.closest('[data-deshacer]')) { deshacer(); return; }
    const leer = e.target.closest('[data-leer]')?.dataset.leer;
    if (leer) { const n = items.find((x) => x.id === Number(leer)); if (n) marcar([n.id], !n.leida); return; }
    const borrar = e.target.closest('[data-borrar]')?.dataset.borrar;
    if (borrar) { descartar(Number(borrar), e.target.closest('.notif-fila')); return; }
    const t = e.target.closest('[data-n]'); if (!t) return;
    if (t.dataset.n === 'all') { e.preventDefault(); marcar(visibles().filter((n) => !n.leida).map((n) => n.id)); }
    else marcar([Number(t.dataset.n)]);
  };
  const onTecla = (e) => {
    if (e.key === 'Escape') { abrir(false); btn.focus(); return; }
    const enlaces = [...panel.querySelectorAll('.notif-item')]; const i = enlaces.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!enlaces.length) return;
      const sig = i < 0 ? enlaces[0] : enlaces[(i + (e.key === 'ArrowDown' ? 1 : -1) + enlaces.length) % enlaces.length];
      sig.focus();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && i >= 0) {
      e.preventDefault(); const sig = enlaces[i + 1] ?? enlaces[i - 1];
      descartar(Number(enlaces[i].dataset.n), enlaces[i].closest('.notif-fila'));
      setTimeout(() => panel.querySelector(`[data-n="${sig?.dataset.n}"]`)?.focus(), 220);
    }
  };
  const onDoc = (e) => { if (!e.target.closest('#btn-notif, #dropdown-notif')) abrir(false); };

  // Deslizar para descartar (dedo o lápiz; con mouse están los botones). Si el gesto es más vertical que horizontal, es scroll.
  let gesto = null; let recienArrastrado = false;
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return;
    const fila = e.target.closest('.notif-fila'); if (!fila || e.target.closest('button')) return;
    gesto = { fila, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, activo: false };
  };
  const onMove = (e) => {
    if (!gesto) return;
    const dx = e.clientX - gesto.x; const dy = e.clientY - gesto.y;
    if (!gesto.activo) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesto = null; return; }
      if (Math.abs(dx) < 10) return;
      gesto.activo = true; gesto.fila.classList.add('notif-arrastre');
    }
    gesto.dx = dx; gesto.fila.style.transform = `translateX(${dx}px)`; gesto.fila.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 260));
  };
  const onUp = () => {
    if (!gesto) return; const { fila, dx, t, activo } = gesto; gesto = null;
    if (!activo) return;
    recienArrastrado = true; setTimeout(() => { recienArrastrado = false; }, 350);
    fila.classList.remove('notif-arrastre');
    const v = dx / Math.max(1, performance.now() - t);
    if (alcanzaDescartar(dx, fila.offsetWidth, v)) descartar(Number(fila.dataset.fila), fila);
    else { animar(fila, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 200, easing: EASE }); fila.style.transform = ''; fila.style.opacity = ''; }
  };
  // Al soltar un deslizamiento no debe abrirse el enlace.
  const onClickCaptura = (e) => { if (recienArrastrado && e.target.closest('.notif-fila')) { e.preventDefault(); e.stopPropagation(); } };

  // Rueda vertical sobre los filtros = desplazarlos de lado (en PC no hay gesto horizontal cómodo).
  const onRueda = (e) => { const ch = e.target.closest('.notif-chips'); if (ch && Math.abs(e.deltaY) > Math.abs(e.deltaX) && ch.scrollWidth > ch.clientWidth) { ch.scrollLeft += e.deltaY; e.preventDefault(); } };
  panel.addEventListener('wheel', onRueda, { passive: false });
  btn.addEventListener('click', onBtn); panel.addEventListener('click', onPanel); panel.addEventListener('keydown', onTecla); document.addEventListener('click', onDoc);
  panel.addEventListener('pointerdown', onDown); panel.addEventListener('pointermove', onMove); panel.addEventListener('pointerup', onUp); panel.addEventListener('pointercancel', onUp);
  panel.addEventListener('click', onClickCaptura, true);

  pintarCampana(); load();

  const channel = supabase.channel(`notif-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` }, (p) => {
      const n = p.new;
      if (items.some((x) => x.id === n.id)) return;
      items.unshift(n); paint();
      sonar(esUrgente(n.tipo));
      if (!panel.hidden) { const f = panel.querySelector(`[data-fila="${n.id}"]`); f?.classList.add('notif-llega'); animar(f, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE }); }
      window.dispatchEvent(new CustomEvent('duelos:refresh'));
      // Directo o invitación → siempre holograma + sonido. Petición de host a todos → solo con el radar activo (evita spam).
      if (n.tipo === 'RETO_DIRECTO' || n.tipo === 'INVITACION_RETO' || (n.tipo === 'RETO_HOST' && isRadarOn())) showHolo(n);
      else { toast(`${n.titulo}: ${n.mensaje}`, 'info', { key: `n${n.id}` }); beep(); }
    })
    // Otras pestañas o dispositivos: si allí se marca o se borra, aquí también.
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` }, ({ new: n }) => {
      const x = items.find((i) => i.id === n.id); if (x && x.leida !== n.leida) { x.leida = n.leida; paint(); }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notificaciones' }, ({ old }) => {
      if (old?.id && items.some((i) => i.id === old.id) && !papelera.has(old.id)) { items = items.filter((i) => i.id !== old.id); paint(); }
    })
    .subscribe((s) => { if (s === 'CHANNEL_ERROR') console.error('[notif] canal Realtime con error'); });

  // Si se sale de la página con avisos «en espera», se borran igual (es lo que el usuario pidió).
  const onSalir = () => { if (papelera.size) vaciarPapelera(); };
  window.addEventListener('pagehide', onSalir);

  return () => {
    onSalir(); clearTimeout(tPapelera); clearInterval(tReloj);
    supabase.removeChannel(channel);
    btn.removeEventListener('click', onBtn); panel.removeEventListener('click', onPanel); panel.removeEventListener('keydown', onTecla); document.removeEventListener('click', onDoc);
    panel.removeEventListener('pointerdown', onDown); panel.removeEventListener('pointermove', onMove); panel.removeEventListener('pointerup', onUp); panel.removeEventListener('pointercancel', onUp);
    panel.removeEventListener('click', onClickCaptura, true); panel.removeEventListener('wheel', onRueda); window.removeEventListener('pagehide', onSalir);
  };
}
