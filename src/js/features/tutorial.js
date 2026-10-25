// Tutorial de bienvenida (recorrido de ~1 minuto). Lógica pura y pasos en core/sistema/tutorial.js; estilos en styles/tutorial.css.
// Arranca SOLO: la primera vez que alguien abre la portada (por navegador), cuando la página ya se ve y no hay otra ventana abierta.
// A mano: Configuración → Datos → «Ver el tutorial otra vez», o ?tutorial=1 en cualquier página.
// Blindaje: si un botón no existe o está oculto se salta su paso; si la pantalla cambia de tamaño o se desplaza, se reacomoda;
// Esc/✕/«Saltar» lo cierran; ← → Enter navegan; el foco queda dentro y vuelve a donde estaba; respeta «menos movimiento»;
// si el navegador no deja guardar (modo privado), funciona igual y solo no recuerda que ya se vio. Cualquier error lo cierra limpio.
import { PASOS, CLAVE_TUTORIAL, pasosDisponibles, posicionTarjeta, debeArrancar, progresoTexto } from '../core/sistema/tutorial.js';
import { hayMovimientoReducido } from './ajustes.js';

const leer = () => { try { return localStorage.getItem(CLAVE_TUTORIAL); } catch { return null; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE_TUTORIAL, v); } catch { /* modo privado: no se recuerda, no pasa nada */ } };
const menosMovimiento = () => { try { return hayMovimientoReducido(); } catch { return true; } };

/** ¿Hay un elemento VISIBLE con ese selector? (en pantalla, con tamaño y sin ocultar). */
function visible(sel) {
  for (const el of document.querySelectorAll(sel)) {
    if (!el.isConnected || el.closest('[hidden], [inert]')) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05) return el;
  }
  return null;
}
const hayModal = () => Boolean(document.querySelector('.modal-backdrop, [role="dialog"][aria-modal="true"]:not(.tut)'))
  || (document.getElementById('sidebar-menu') ? !document.getElementById('sidebar-menu').classList.contains('translate-x-full') && !document.getElementById('sidebar-menu').inert : false);

let abierto = null;   // instancia viva (solo una a la vez)

/** Abre el recorrido. `forzado` = lo pidió la persona (sale aunque ya lo haya visto). Devuelve false si no se pudo abrir. */
export function abrirTutorial({ forzado = false } = {}) {
  if (abierto) return true;
  try {
    const lista = pasosDisponibles(PASOS, (s) => Boolean(visible(s)));
    if (lista.length < 2) return false;
    abierto = montar(lista, { forzado });
    return true;
  } catch (e) { console.error('[tutorial] no se pudo abrir:', e); cerrar(null); return false; }
}

function montar(lista, { forzado }) {
  const previo = document.activeElement;
  const raiz = document.createElement('div');
  raiz.className = 'tut'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'tut-titulo');
  if (menosMovimiento()) raiz.dataset.quieto = '';
  raiz.innerHTML = `<svg class="tut-velo" aria-hidden="true" focusable="false"><path fill-rule="evenodd"></path></svg><div class="tut-foco" aria-hidden="true"></div>
    <div class="tut-tarjeta" tabindex="-1"><div class="tut-cab"><span class="tut-ico" aria-hidden="true"><i class="fa-solid"></i></span>
      <p class="tut-prog" aria-live="polite"></p><button type="button" class="tut-x" data-tut="saltar" aria-label="Cerrar el tutorial"><i class="fa-solid fa-xmark"></i></button></div>
      <h2 id="tut-titulo" class="tut-t"></h2><p class="tut-txt"></p>
      <div class="tut-puntos" aria-hidden="true">${lista.map(() => '<i></i>').join('')}</div>
      <div class="tut-acc"><button type="button" class="btn btn-ghost tut-saltar" data-tut="saltar">Saltar</button>
        <span class="tut-esp"></span><button type="button" class="btn btn-ghost" data-tut="atras">Atrás</button><button type="button" class="btn btn-primary" data-tut="sig">Siguiente</button></div></div>`;
  document.body.append(raiz);
  const tarjeta = raiz.querySelector('.tut-tarjeta'); const foco = raiz.querySelector('.tut-foco'); const velo = raiz.querySelector('.tut-velo path');
  // Capa oscura con un «agujero» redondeado sobre el elemento (SVG, evenodd): funciona en todos los navegadores, a diferencia de una
  // sombra gigante (box-shadow de 9999 px), que algunos no dibujan.
  const agujero = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
  const pintarVelo = (r) => {
    const W = innerWidth, H = innerHeight; let d = `M0 0H${W}V${H}H0Z`;
    if (r) { const pad = 6, x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad); const w = Math.min(W - x, r.width + 2 * pad), h = Math.min(H - y, r.height + 2 * pad);
      if (w > 0 && h > 0) d += agujero(x, y, w, h, Math.min(14, w / 2, h / 2)); }
    velo.setAttribute('d', d);
  };
  const st = { i: 0, lista, raiz, tarjeta, foco, previo, forzado, el: null, rafo: 0 };

  const pintar = () => {
    const { paso, selector } = lista[st.i];
    st.el = selector ? visible(selector) : null;   // se vuelve a buscar: pudo cambiar (giro de pantalla, menú que se abrió)
    raiz.querySelector('.tut-ico i').className = `fa-solid ${paso.icono ?? 'fa-circle-info'}`;
    raiz.querySelector('.tut-t').textContent = paso.titulo;
    raiz.querySelector('.tut-txt').textContent = paso.texto;
    raiz.querySelector('.tut-prog').textContent = progresoTexto(st.i, lista.length);
    raiz.querySelectorAll('.tut-puntos i').forEach((p, k) => p.classList.toggle('on', k === st.i));
    const ultimo = st.i === lista.length - 1;
    raiz.querySelector('[data-tut="atras"]').hidden = st.i === 0;
    raiz.querySelector('[data-tut="sig"]').textContent = ultimo ? 'Terminar' : (st.i === 0 ? 'Empezar' : 'Siguiente');
    raiz.querySelector('.tut-saltar').hidden = ultimo;
    if (st.el) {
      const r = st.el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) st.el.scrollIntoView({ block: 'center', behavior: menosMovimiento() ? 'auto' : 'smooth' });
    }
    colocar();
    tarjeta.focus({ preventScroll: true });
  };
  const colocar = () => {
    try {
      const r = st.el?.isConnected ? st.el.getBoundingClientRect() : null;
      if (r && r.width > 0) {
        const pad = 6;
        Object.assign(foco.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px` });
        foco.hidden = false; pintarVelo(r);
      } else { foco.hidden = true; pintarVelo(null); }
      const t = tarjeta.getBoundingClientRect();
      const p = posicionTarjeta(r && r.width > 0 ? r : null, { width: t.width || 340, height: t.height || 220 }, { width: innerWidth, height: innerHeight });
      tarjeta.style.top = `${p.top}px`; tarjeta.style.left = `${p.left}px`; tarjeta.dataset.lado = p.lado;
      raiz.toggleAttribute('data-centrada', !r || !(r.width > 0));
    } catch (e) { console.warn('[tutorial] no se pudo colocar:', e); }
  };
  const recolocar = () => { cancelAnimationFrame(st.rafo); st.rafo = requestAnimationFrame(colocar); };

  const ir = (d) => {
    const n = st.i + d;
    if (n < 0) return;
    if (n >= lista.length) { cerrar('visto'); return; }
    st.i = n; pintar();
  };
  const onClick = (e) => {
    const b = e.target.closest('[data-tut]'); if (!b) return;
    if (b.dataset.tut === 'saltar') cerrar(st.i === lista.length - 1 ? 'visto' : 'saltado');
    else if (b.dataset.tut === 'atras') ir(-1);
    else ir(1);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(st.i === lista.length - 1 ? 'visto' : 'saltado'); }
    else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target.closest?.('button'))) { e.preventDefault(); ir(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
    else if (e.key === 'Tab') {   // el foco no sale de la tarjeta
      const f = [...tarjeta.querySelectorAll('button:not([hidden])')]; if (!f.length) return;
      const a = f.indexOf(document.activeElement);
      if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };
  raiz.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey, true);
  addEventListener('resize', recolocar); addEventListener('scroll', recolocar, { passive: true, capture: true });
  st.quitar = () => { document.removeEventListener('keydown', onKey, true); removeEventListener('resize', recolocar); removeEventListener('scroll', recolocar, { capture: true }); cancelAnimationFrame(st.rafo); };
  pintar();
  requestAnimationFrame(() => raiz.classList.add('tut-on'));
  return st;
}

function cerrar(estado) {
  const st = abierto; abierto = null;
  if (estado) guardar(estado);
  if (!st) return;
  try { st.quitar?.(); } catch { /* nada */ }
  st.raiz?.remove();
  try { if (st.previo?.isConnected) st.previo.focus({ preventScroll: true }); } catch { /* nada */ }
}

/** Arranque automático (boot.js). Espera a que la página esté tranquila; si hay una ventana abierta, lo intenta un rato y luego desiste. */
export function initTutorial() {
  try {
    const forzado = new URLSearchParams(location.search).get('tutorial') === '1';
    const esPortada = Boolean(document.querySelector('[data-vt-grid]'));
    if (!forzado && !esPortada) return;
    if (window.self !== window.top) return;   // dentro de un iframe (vista previa, capturas): nunca
    let intentos = 0;
    const probar = () => {
      if (abierto) return;
      if (!debeArrancar({ estado: leer(), esPortada, hayModal: hayModal(), forzado })) {
        if (hayModal() && intentos++ < 12) setTimeout(probar, 1500);   // hasta ~18 s esperando a que cierre la bienvenida o el registro
        return;
      }
      abrirTutorial({ forzado });
    };
    setTimeout(probar, forzado ? 300 : 2500);   // la primera vez, deja que la portada se vea antes de taparla
  } catch (e) { console.error('[tutorial] arranque:', e); }
}
