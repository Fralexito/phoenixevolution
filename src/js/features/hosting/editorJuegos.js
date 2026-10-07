// Selector de juegos y parches que hosteas (varios). Se usa en Mi perfil → Sistema Host.
// Guarda en perfiles.host_catalogo con la misma RPC que el panel «Hosting» del muro (muro_guardar_host).
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { HOST_JUEGOS, HOST_MAX_TEXTO, limpiarOpcion, alternarJuego, alternarOpcion } from '../../core/hostCatalogo.js';

/** Monta el selector en `caja` con el catálogo inicial. → { get(): catálogo actual } */
export function montarEditorJuegos(caja, catInicial = []) {
  let cat = catInicial; let abiertoOtros = false;
  const pintar = () => {
    const tarjeta = (j) => {
      const e = cat.find((x) => x.juego === j.id); const id = escapeHTML(j.id);
      const opciones = e ? [...new Set([...j.sugeridas, ...e.opciones])] : [];
      return `<div class="rounded-xl border ${e ? 'border-galaxy-400/50 bg-galaxy-600/10' : 'border-galaxy-border/60 bg-black/20'} p-2.5">
        <button type="button" data-ej="juego" data-juego="${id}" aria-pressed="${!!e}" class="flex items-center gap-2 text-sm text-white font-display font-bold uppercase tracking-wide w-full text-left"><i class="fa-regular ${e ? 'fa-square-check text-galaxy-400' : 'fa-square'}"></i>${id}</button>
        ${e ? `<p class="text-[12px] text-gray-400 mt-2 mb-1">${escapeHTML(j.opcion)} (puedes elegir varios)</p>
          <div class="flex flex-wrap gap-1.5">${opciones.map((o) => `<button type="button" data-ej="opcion" data-juego="${id}" data-o="${escapeHTML(o)}" aria-pressed="${e.opciones.includes(o)}" class="adv-chip !min-h-8 !px-2.5 !text-[12px]">${escapeHTML(o)}</button>`).join('')}</div>
          <div class="flex gap-1.5 mt-2"><input data-ej-otro="${id}" maxlength="${HOST_MAX_TEXTO}" placeholder="Otro (escríbelo)" class="flex-1 min-w-0 rounded-lg bg-black/30 border border-galaxy-border px-2.5 py-1.5 text-xs text-white">
            <button type="button" data-ej="agregar" data-juego="${id}" aria-label="Añadir" class="btn btn-ghost !min-h-8 !px-3 !text-xs"><i class="fa-solid fa-plus"></i></button></div>` : ''}</div>`;
    };
    // PES 2021 y FL son el centro de la web: van arriba y grandes. El resto queda plegado en «Otros juegos».
    const otros = HOST_JUEGOS.filter((j) => !j.principal);
    const marcadosOtros = otros.filter((j) => cat.some((x) => x.juego === j.id)).length;
    caja.innerHTML = HOST_JUEGOS.filter((j) => j.principal).map(tarjeta).join('')
      + `<details class="rounded-xl border border-galaxy-border/40 px-2.5 py-1.5" ${marcadosOtros || abiertoOtros ? 'open' : ''}>
          <summary class="text-[12px] text-gray-400 cursor-pointer select-none">Otros juegos${marcadosOtros ? ` (${marcadosOtros})` : ''}</summary>
          <div class="space-y-2 mt-2 opacity-90">${otros.map(tarjeta).join('')}</div></details>`;
    caja.querySelector('details')?.addEventListener('toggle', (e) => { abiertoOtros = e.target.open; });
  };
  caja.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ej]'); if (!b) return;
    const j = b.dataset.juego;
    if (b.dataset.ej === 'juego') cat = alternarJuego(cat, j);
    else if (b.dataset.ej === 'opcion') cat = alternarOpcion(cat, j, b.dataset.o);
    else {
      const inp = [...caja.querySelectorAll('[data-ej-otro]')].find((x) => x.dataset.ejOtro === j); const antes = cat;
      if (cat.find((x) => x.juego === j)?.opciones.includes(limpiarOpcion(inp?.value))) { toast('Esa opción ya está marcada.', 'info'); return; }
      cat = alternarOpcion(cat, j, inp?.value);
      if (cat === antes) { toast('Escribe el nombre o ya tienes el máximo de opciones.', 'info'); return; }
    }
    pintar();
  });
  pintar();
  return { get: () => cat };
}
