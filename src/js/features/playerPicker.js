// Selector de jugador con BÚSQUEDA por nombre: un campo de texto con lista desplegable que se filtra al escribir.
// Se usa en los comparadores. Teclado: ↑ ↓ Enter Esc. `exclude()` devuelve ids que no deben ofrecerse.
import { escapeHTML } from '../core/dom.js';
import { filterPlayers } from '../core/search.js';

export function mountPicker(root, { players, selected = null, exclude = () => [], onPick, placeholder = 'Buscar jugador…', clearOnPick = false, color = null }) {
  const id = `${root.id}-in`;
  root.classList.add('picker');
  root.innerHTML = `<input id="${id}" class="field" type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${id}-lista" autocomplete="off" spellcheck="false" maxlength="40" placeholder="${escapeHTML(placeholder)}" ${color ? `style="border-color:${color}66"` : ''}>
    <ul id="${id}-lista" class="picker-list" role="listbox" hidden></ul>`;
  const input = root.querySelector('input'); const list = root.querySelector('ul');
  let sel = selected; let items = []; let act = -1; let abierto = false;
  const nombreSel = () => (clearOnPick ? '' : sel?.nombre ?? '');
  input.value = nombreSel();

  const pintar = () => {
    // Si el texto es justo el nombre elegido, se ofrece la lista completa (el usuario quiere cambiar, no filtrar).
    const term = input.value === nombreSel() ? '' : input.value;
    items = filterPlayers(players, term, exclude());
    act = items.length ? 0 : -1;
    list.innerHTML = items.length
      ? items.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === act}"><span class="truncate">${escapeHTML(p.nombre)}</span><span class="picker-meta uppercase">${escapeHTML(p.club)} · <b>${escapeHTML(p.ovr)}</b></span></li>`).join('')
      : '<li class="picker-empty">Sin resultados</li>';
  };
  const abrir = () => { pintar(); list.hidden = false; abierto = true; input.setAttribute('aria-expanded', 'true'); };
  const cerrar = () => { list.hidden = true; abierto = false; input.setAttribute('aria-expanded', 'false'); };
  const marcar = (i) => {
    if (!items.length) return; act = (i + items.length) % items.length;
    list.querySelectorAll('[role=option]').forEach((li, n) => li.setAttribute('aria-selected', String(n === act)));
    list.querySelector(`[data-i="${act}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const elegir = (p) => { sel = p; input.value = nombreSel(); cerrar(); onPick(p); if (clearOnPick) input.blur(); };

  input.addEventListener('focus', () => { input.select(); abrir(); });
  input.addEventListener('input', () => { if (!abierto) abrir(); else pintar(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!abierto) abrir(); else marcar(act + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(act - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (abierto && items[act]) elegir(items[act]); }
    else if (e.key === 'Escape' && abierto) { e.stopPropagation(); cerrar(); input.value = nombreSel(); }
  });
  // mousedown (no click) para elegir antes de que el campo pierda el foco.
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); elegir(items[Number(li.dataset.i)]); } });
  input.addEventListener('blur', () => {
    cerrar();
    if (!clearOnPick && !input.value.trim() && sel) { sel = null; onPick(null); }   // campo vacío = quitar la elección
    else input.value = nombreSel();
  });

  return {
    setDisabled(v, ph) { input.disabled = v; if (ph) input.placeholder = ph; },
    setSelected(p) { sel = p; input.value = nombreSel(); },
  };
}
