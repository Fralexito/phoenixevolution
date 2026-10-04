// Controles de formulario reutilizables (interruptor y selector segmentado) para no repetir HTML ni lógica.
import { escapeHTML } from '../core/dom.js';

/** Interruptor accesible (checkbox real oculto + pista visual). Lee/escribe con el <input id>. */
export function switchHTML({ id, checked = false, title, hint = '' }) {
  return `
    <label class="flex items-center justify-between gap-4 cursor-pointer bg-black/40 border border-galaxy-border rounded-xl px-4 py-3 hover:border-galaxy-400/60 transition-colors">
      <span class="min-w-0">
        <span class="block text-sm font-display font-bold text-white uppercase tracking-wide">${escapeHTML(title)}</span>
        ${hint ? `<span class="block text-[11px] text-gray-400 mt-0.5">${escapeHTML(hint)}</span>` : ''}
      </span>
      <span class="relative inline-flex shrink-0">
        <input id="${escapeHTML(id)}" type="checkbox" class="peer sr-only" ${checked ? 'checked' : ''}>
        <span class="w-12 h-6 rounded-full bg-gray-800 border border-gray-600 peer-checked:bg-galaxy-600 peer-checked:border-galaxy-400 peer-focus-visible:ring-2 peer-focus-visible:ring-galaxy-400 transition-colors"></span>
        <span class="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-400 peer-checked:bg-white peer-checked:translate-x-6 transition-transform"></span>
      </span>
    </label>`;
}

/** Selector segmentado (usa la clase .seg). options: [{ v, label }]. */
export function segHTML({ id, options, current, label = '' }) {
  return `<div class="seg" id="${escapeHTML(id)}" role="group" aria-label="${escapeHTML(label)}">${options
    .map((o) => `<button type="button" data-v="${escapeHTML(o.v)}" aria-pressed="${String(o.v) === String(current)}">${escapeHTML(o.label)}</button>`).join('')}</div>`;
}

/** Hace que un .seg se comporte como grupo de opciones exclusivas; llama onChange(valor). */
export function bindSeg(root, onChange) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]'); if (!b || !root.contains(b)) return;
    root.querySelectorAll('button[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onChange(b.dataset.v);
  });
}
