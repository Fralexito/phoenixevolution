// Modal reutilizable: crea, muestra, cierra con Escape/clic fuera y devuelve el nodo.
// persistent: no se cierra con Escape ni haciendo clic fuera (solo con un botón [data-close]); para formularios importantes.
export function openModal(html, { id = 'modal', onClose, persistent = false, wide = false } = {}) {
  closeModal(id);
  const wrap = document.createElement('div');
  wrap.id = id;
  wrap.className = 'modal-backdrop';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = `<div class="modal-card${wide ? ' modal-wide' : ''}">${html}</div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape' && !persistent) close(); };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !persistent) close(); });
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(wrap);
  wrap._close = close;
  return wrap;
}
export const closeModal = (id = 'modal') => document.getElementById(id)?._close?.();
