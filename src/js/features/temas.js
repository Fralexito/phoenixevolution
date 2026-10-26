// Temas de diseño (ronda 387): probador para elegir entre 4 estilos y la luz que sigue al puntero en los paneles.
// Estilos en styles/temas.css. El atributo <html data-estilo> lo pone ANTES de pintar el script de la cabecera (Layout.astro),
// para que no haya parpadeo. OJO: «data-tema» ya existe (Galaxy/Sudario de cada liga) → aquí es «data-estilo» y el parámetro «?estilo=»; este módulo solo cambia de tema en vivo y muestra el probador.
//   · ?estilo=champions|neon|fc|mezcla  → aplica ese tema, lo recuerda y abre el probador.
//   · ?estilo=actual                    → vuelve al diseño de siempre.
//   · ?probar-temas                   → solo abre el probador. La ✕ lo cierra (el tema elegido se queda).
// Todo en try/catch: sin localStorage (modo privado) el tema dura lo que dure la página.
export const TEMAS = [
  { id: '', nombre: 'Actual' },
  { id: 'champions', nombre: 'Champions' },
  { id: 'neon', nombre: 'Neón' },
  { id: 'fc', nombre: 'EA FC' },
  { id: 'mezcla', nombre: 'Mezcla' },
];
const CLAVE = 'pes-tema';
const CLAVE_PROBAR = 'pes-tema-probar';
const valido = (t) => TEMAS.some((x) => x.id === t);
const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* sin almacenamiento */ } };

/** Tema activo ('' = el diseño de siempre). */
export function temaActual() { return document.documentElement.getAttribute('data-estilo') || ''; }

/** Cambia el tema en vivo y lo recuerda. */
export function aplicarTema(id) {
  const t = valido(id) ? id : '';
  const h = document.documentElement;
  if (t) h.setAttribute('data-estilo', t); else h.removeAttribute('data-estilo');
  guardar(CLAVE, t);
  window.dispatchEvent(new CustomEvent('tema:cambio', { detail: t }));
}

function montarProbador() {
  if (document.querySelector('.tp-probador')) return;
  const el = document.createElement('div');
  el.className = 'tp-probador';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Probar estilos de la web');
  const pintar = () => {
    const act = temaActual();
    el.innerHTML = `<b>Estilo</b>${TEMAS.map((t) => `<button type="button" data-tp="${t.id}" aria-pressed="${t.id === act}">${t.nombre}</button>`).join('')}
      <button type="button" class="tp-cerrar" data-tp-cerrar aria-label="Cerrar el probador de estilos" title="Cerrar (el estilo elegido se queda)">✕</button>`;
  };
  pintar();
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-tp-cerrar]')) { guardar(CLAVE_PROBAR, ''); el.remove(); return; }
    const b = e.target.closest('[data-tp]'); if (!b) return;
    aplicarTema(b.dataset.tp); pintar();
  });
  document.body.appendChild(el);
}

/** Luz que sigue al puntero dentro del panel bajo el mouse (solo temas con --t-spot y con mouse). Un solo listener, 1 vez por cuadro. */
function montarLuz() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let pendiente = null; let ultimo = null;
  const usa = () => { const t = temaActual(); return t === 'neon' || t === 'mezcla'; };
  document.addEventListener('pointermove', (e) => {
    if (!usa() || document.documentElement.getAttribute('data-aj-mov-efectivo') === 'reducido') return;
    pendiente = e;
    if (pendiente && !montarLuz.raf) montarLuz.raf = requestAnimationFrame(() => {
      montarLuz.raf = 0;
      const ev = pendiente; pendiente = null;
      const p = ev.target instanceof Element ? ev.target.closest('.glass-panel') : null;
      if (ultimo && ultimo !== p) { ultimo.style.removeProperty('--mx'); ultimo.style.removeProperty('--my'); }
      ultimo = p;
      if (!p) return;
      const r = p.getBoundingClientRect();
      p.style.setProperty('--mx', `${Math.round(ev.clientX - r.left)}px`);
      p.style.setProperty('--my', `${Math.round(ev.clientY - r.top)}px`);
    });
  }, { passive: true });
}

export function initTemas() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('estilo')) { const t = q.get('estilo'); aplicarTema(t === 'actual' ? '' : t); guardar(CLAVE_PROBAR, '1'); }
    if (q.has('probar-temas')) guardar(CLAVE_PROBAR, '1');
    if (leer(CLAVE_PROBAR) === '1') montarProbador();
    montarLuz();
  } catch (e) { console.warn('[temas]', e?.message ?? e); }
}
