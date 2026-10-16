// Tiras de secciones (.pilar-tabs) que se deslizan en celular (ronda 342): marca en `data-mas` si hay más contenido a la izquierda/derecha
// y deja a la vista la pestaña activa. Solo lee medidas; no mueve nada por su cuenta salvo centrar la activa al cargar.
export function initTirasDeslizables() {
  document.querySelectorAll('.pilar-tabs').forEach((t) => {
    const marcar = () => {
      const max = t.scrollWidth - t.clientWidth; const x = Math.abs(t.scrollLeft); const v = [];
      if (max > 2 && x > 2) v.push('izq'); if (max > 2 && x < max - 2) v.push('der');
      t.dataset.mas = v.join(' ');
    };
    t.addEventListener('scroll', marcar, { passive: true }); window.addEventListener('resize', marcar, { passive: true });
    const act = t.querySelector('[aria-current="page"]'); if (act && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, act.offsetLeft - t.clientWidth / 2 + act.offsetWidth / 2);
    marcar();
  });
}
