// Pilares del menú de arriba: el desplegable se abre con hover/teclado por CSS; aquí solo el clic (pantallas táctiles),
// Escape y clic afuera para cerrar, y aria-expanded para lectores de pantalla.
export function montarPilares() {
  const pilares = [...document.querySelectorAll('.pilar')]; if (!pilares.length) return;
  const cerrar = (salvo) => pilares.forEach((p) => { if (p !== salvo) { p.removeAttribute('data-abierto'); p.querySelector('.pilar-btn')?.setAttribute('aria-expanded', 'false'); } });
  pilares.forEach((p) => {
    const b = p.querySelector('.pilar-btn');
    b?.addEventListener('click', () => { const abrir = !p.hasAttribute('data-abierto'); cerrar(p); p.toggleAttribute('data-abierto', abrir); b.setAttribute('aria-expanded', String(abrir)); });
    p.addEventListener('mouseenter', () => b?.setAttribute('aria-expanded', 'true'));
    p.addEventListener('mouseleave', () => { if (!p.hasAttribute('data-abierto')) b?.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.pilar')) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrar(); document.activeElement?.closest?.('.pilar')?.querySelector('.pilar-btn')?.blur(); } });
}
