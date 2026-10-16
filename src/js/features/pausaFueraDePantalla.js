// Pausa las animaciones infinitas de los escudos cuando no se ven (ahorra batería/CPU en celulares).
// Solo cambia animation-play-state vía [data-fuera]; no altera nada visible.
export function initPausaFueraDePantalla() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => { for (const e of es) e.target.toggleAttribute('data-fuera', !e.isIntersecting); }, { rootMargin: '80px' });
  const visto = new WeakSet();
  const barrer = (raiz) => raiz.querySelectorAll?.('.escudo').forEach((el) => { if (!visto.has(el)) { visto.add(el); io.observe(el); } });
  barrer(document);
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => barrer(document), 200); }).observe(document.body, { childList: true, subtree: true });
}
