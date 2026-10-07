// Modo «Acomodar» de Noticias (solo staff): lienzo libre con GridStack + ASISTENTE.
// · Mover a cualquier lugar (float) y redimensionar desde bordes/esquinas.
// · Propuestas: plantillas de acomodo que colocan todo de un clic (con miniatura de cómo quedaría con TUS noticias).
// · Corrector: revisa en vivo huecos, filas escalonadas, tarjetas que se cortan, jerarquía… y ofrece «Arreglar».
// · Deshacer / Rehacer (Ctrl+Z / Ctrl+Y).
// Se guarda en noticias.lienzo {x,y,w,h}. GridStack se carga solo al entrar al modo.
import { supabase } from '../../core/supabase.js';
import { toast } from '../../core/toast.js';
import { escapeHTML as esc } from '../../core/dom.js';
import { COLS, FILA_PX, tamanoBase, PROPUESTAS, diagnosticar, arreglar, arreglarTodo } from '../../core/noticiasLienzo.js';

const ICONO = { mal: 'fa-circle-xmark text-rose-400', ojo: 'fa-triangle-exclamation text-amber-300', tip: 'fa-lightbulb text-cyan-300' };

/** Miniatura SVG de un acomodo (cajas de colores: naranja = joda, cian = serio). */
function mini(nodos, info) {
  const alto = Math.max(1, ...nodos.map((n) => n.y + n.h));
  return `<svg viewBox="0 0 ${COLS} ${alto}" class="w-full h-16" preserveAspectRatio="xMidYMin meet">${nodos.map((n) =>
    `<rect x="${n.x + .15}" y="${n.y + .15}" width="${n.w - .3}" height="${n.h - .3}" rx=".4" fill="${info.get(String(n.id))?.joda ? '#f97316' : '#22d3ee'}" fill-opacity="${n === nodos[0] ? .9 : .45}"/>`).join('')}</svg>`;
}

/**
 * @param {{ grid: HTMLElement, panel: HTMLElement, items: {id:string, html:string, lienzo:object|null, cols:number, joda:boolean, imagen:boolean, titulo:string}[], alSalir: (guardado:boolean)=>void }} op
 */
export async function entrarAcomodar({ grid, panel, items, alSalir }) {
  const { GridStack } = await import('gridstack');   // su CSS se importa en pages/noticias.astro (el import dinámico de CSS falla en el build)
  const info = new Map(items.map((i) => [String(i.id), i]));
  grid.className = 'grid-stack nt-acomodando';
  let yLibre = Math.max(0, ...items.filter((i) => i.lienzo).map((i) => i.lienzo.y + i.lienzo.h));
  grid.innerHTML = items.map((it) => {
    const l = it.lienzo ?? (() => { const b = tamanoBase(it.cols); const r = { x: 0, y: yLibre, ...b }; yLibre += b.h; return r; })();
    return `<div class="grid-stack-item" gs-id="${esc(it.id)}" gs-x="${l.x}" gs-y="${l.y}" gs-w="${l.w}" gs-h="${l.h}" gs-min-w="2" gs-min-h="2"><div class="grid-stack-item-content">${it.html}</div></div>`;
  }).join('');
  const gs = GridStack.init({ column: COLS, cellHeight: FILA_PX, margin: 8, float: true, animate: true, resizable: { handles: 'e,se,s,sw,w' }, draggable: { cancel: '' } }, grid);

  const nodos = () => gs.engine.nodes.map((n) => ({ id: String(n.id), x: n.x, y: n.y, w: n.w, h: n.h }));
  const historial = [nodos()]; let pos = 0; let aplicando = false;
  const aplicar = (lista, guardarEnHistorial = true) => {
    aplicando = true; gs.batchUpdate();
    lista.forEach((n) => { const el = grid.querySelector(`[gs-id="${CSS.escape(n.id)}"]`); if (el) gs.update(el, { x: n.x, y: n.y, w: n.w, h: n.h }); });
    gs.batchUpdate(false); aplicando = false;
    if (guardarEnHistorial) registrar(); else pintar();
  };
  const registrar = () => { historial.splice(pos + 1); historial.push(nodos()); if (historial.length > 50) historial.shift(); pos = historial.length - 1; pintar(); };
  const deshacer = () => { if (pos > 0) aplicar(historial[--pos], false); };
  const rehacer = () => { if (pos < historial.length - 1) aplicar(historial[++pos], false); };
  gs.on('change', () => { if (!aplicando) registrar(); });

  // Orden de importancia para las propuestas: el actual de lectura (lo que el staff ya puso arriba manda).
  const importancia = () => nodos().sort((a, b) => a.y - b.y || a.x - b.x).map((n) => info.get(n.id));

  function pintar() {
    const actual = nodos(); const diag = diagnosticar(actual, info); const imp = importancia();
    const nota = diag.filter((d) => d.nivel === 'mal').length ? 'Hay cosas que arreglar' : diag.length ? 'Casi perfecto' : '¡Se ve impecable!';
    panel.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <button type="button" data-a="deshacer" class="btn btn-ghost !min-h-8 !text-xs" ${pos ? '' : 'disabled'} title="Deshacer (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>
        <button type="button" data-a="rehacer" class="btn btn-ghost !min-h-8 !text-xs" ${pos < historial.length - 1 ? '' : 'disabled'} title="Rehacer (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>
        <span class="ml-auto text-[11px] uppercase tracking-wider font-bold ${diag.some((d) => d.nivel === 'mal') ? 'text-rose-300' : diag.length ? 'text-amber-200' : 'text-emerald-300'}">${nota}</span>
      </div>
      <p class="nt-asis-tit">Corrector</p>
      ${diag.length ? `<ul class="space-y-2 mb-2">${diag.map((d, i) => `<li class="flex gap-2 items-start text-[12px] text-gray-300"><i class="fa-solid ${ICONO[d.nivel]} mt-0.5"></i><span class="flex-1">${esc(d.texto)}</span>${d.arreglo ? `<button type="button" data-fix="${i}" class="btn !min-h-7 !text-[11px] !px-2 shrink-0">Arreglar</button>` : ''}</li>`).join('')}</ul>
        ${diag.filter((d) => d.arreglo).length > 1 ? '<button type="button" data-a="todo" class="btn btn-primary !min-h-8 !text-xs w-full mb-3"><i class="fa-solid fa-wand-magic-sparkles"></i> Arreglar todo</button>' : ''}`
        : '<p class="text-[12px] text-emerald-200/80 mb-3">Sin huecos, sin cortes y con jerarquía clara.</p>'}
      <p class="nt-asis-tit">Propuestas de acomodo</p>
      <div class="grid grid-cols-2 gap-2">${PROPUESTAS.map((p) => `<button type="button" data-prop="${p.id}" class="nt-prop" title="${esc(p.desc)}">${mini(p.armar(imp), info)}<span><i class="fa-solid ${p.icono}"></i> ${esc(p.nombre)}</span></button>`).join('')}</div>
      <button type="button" data-a="sorpresa" class="btn btn-ghost !min-h-8 !text-xs w-full mt-2"><i class="fa-solid fa-dice"></i> Sorpréndeme</button>
      <p class="text-[11px] text-gray-500 mt-3">La primera noticia (arriba a la izquierda) es la que se toma como principal. Las propuestas respetan ese orden.</p>`;
    panel._diag = diag;
  }

  const sorpresa = () => { // propuesta al azar + mezcla de tamaños, luego corrige solo
    const p = PROPUESTAS[Math.floor(Math.random() * PROPUESTAS.length)];
    let n = p.armar(importancia()).map((x) => ({ ...x }));
    for (const f of ['compactar', 'rellenar']) n = arreglar(n, f);
    aplicar(n); toast(`Probando «${p.nombre}». ¿No convence? Ctrl+Z.`, 'info');
  };
  const alClic = (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.prop) { const p = PROPUESTAS.find((x) => x.id === b.dataset.prop); aplicar(arreglar(p.armar(importancia()), 'compactar')); toast(`Acomodo «${p.nombre}» aplicado.`, 'ok'); }
    else if (b.dataset.fix) { const d = panel._diag[Number(b.dataset.fix)]; if (d) aplicar(arreglar(nodos(), d.arreglo, { id: d.id, info })); }
    else if (b.dataset.a === 'deshacer') deshacer(); else if (b.dataset.a === 'rehacer') rehacer();
    else if (b.dataset.a === 'todo') { aplicar(arreglarTodo(nodos(), info)); toast('Listo: tamaños, huecos y jerarquía corregidos. Ctrl+Z si no te gusta.', 'ok'); } else if (b.dataset.a === 'sorpresa') sorpresa();
  };
  const teclas = (e) => {
    if (!(e.ctrlKey || e.metaKey) || /input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); }
  };
  panel.addEventListener('click', alClic); document.addEventListener('keydown', teclas);
  panel.hidden = false; requestAnimationFrame(() => { historial[0] = nodos(); pintar(); });   // GridStack termina de colocar en el siguiente cuadro

  const salir = (ok) => { gs.destroy(false); grid.className = ''; panel.hidden = true; panel.innerHTML = ''; panel.removeEventListener('click', alClic); document.removeEventListener('keydown', teclas); alSalir(ok); };
  return {
    cancelar: () => salir(false),
    async guardar() {
      try {
        const res = await Promise.all(nodos().map((n) => supabase.from('noticias').update({ lienzo: { x: n.x, y: n.y, w: n.w, h: n.h } }).eq('id', n.id).select('id')));
        const fallo = res.find((r) => r.error || !r.data?.length);
        if (fallo) throw fallo.error ?? new Error('Sin permiso para guardar.');
        toast('Diseño de la página guardado.', 'ok'); salir(true); return true;
      } catch (e) { console.error('[noticias] acomodar:', e); toast(`No se pudo guardar: ${e.message}`, 'error'); return false; }
    },
  };
}
