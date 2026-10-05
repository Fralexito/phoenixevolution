// Navegación pegada de la portada: mide la cabecera para pegarse justo debajo y marca la sección que estás viendo.
export function iniciarNavegacion() {
  const nav = document.getElementById('sec-nav'); if (!nav) return;
  const barra = document.querySelector('.sticky.top-0 > header, .sticky.top-0 > *:first-child'), cinta = document.getElementById('ticker');
  // Parte visible de la cabecera pegada: la cinta de «Última hora» se esconde (se desliza detrás de la barra) al bajar, así que se mide lo que realmente se ve.
  const medir = () => { const v = Math.max(barra?.getBoundingClientRect().bottom ?? 0, cinta?.getBoundingClientRect().bottom ?? 0); document.documentElement.style.setProperty('--hdr-h', `${Math.max(0, Math.round(v))}px`); };
  let hasta = 0, raf = 0;
  const seguir = () => { medir(); raf = performance.now() < hasta ? requestAnimationFrame(seguir) : 0; };
  const pedir = () => { hasta = performance.now() + 700; if (!raf) raf = requestAnimationFrame(seguir); };   // la animación de la cinta dura < 0,7 s
  medir(); window.addEventListener('scroll', pedir, { passive: true }); window.addEventListener('resize', pedir);
  const enlaces = [...nav.querySelectorAll('a[data-sec]')];
  const marcar = (id) => enlaces.forEach((a) => a.setAttribute('aria-current', String(a.dataset.sec === id)));
  const visibles = new Map();
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((en) => {
    for (const e of en) visibles.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
    let mejor = null, v = 0; for (const [id, r] of visibles) if (r > v) { v = r; mejor = id; }
    marcar(mejor);
  }, { threshold: [0, .15, .35, .6], rootMargin: '-25% 0px -45% 0px' });
  enlaces.forEach((a) => { const s = document.getElementById(a.dataset.sec); if (s) io.observe(s); });
  nav.addEventListener('click', (e) => { const a = e.target.closest('a[data-sec]'); if (!a) return; const s = document.getElementById(a.dataset.sec); if (!s || s.hidden) return; e.preventDefault(); s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
}
