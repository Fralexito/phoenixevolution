// Aparición suave de bloques al hacer scroll (interruptor: FX.reveal en data/experimento.js).
// Marca como «visto» cada <section> de primer nivel de <main> cuando entra en pantalla. Si algo falla, todo se muestra igual (nunca queda contenido oculto).
export function initReveal() {
  try {
    if (!document.documentElement.hasAttribute('data-fx-reveal')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const bloques = [...document.querySelectorAll('main section')].filter((s) => !s.parentElement.closest('section'));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    bloques.forEach((b) => { b.setAttribute('data-reveal', ''); io.observe(b); });
    setTimeout(() => bloques.forEach((b) => b.classList.add('visto')), 2500);   // red de seguridad
  } catch (e) { console.warn('[reveal] desactivado:', e); }
}
