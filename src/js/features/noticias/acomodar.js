// Modo «Acomodar» de Noticias (solo staff): lienzo libre con GridStack. Cada tarjeta se arrastra a CUALQUIER lugar
// (se permiten huecos: float) y se agranda/achica desde sus bordes y esquinas. Se guarda en noticias.lienzo {x,y,w,h}.
// GridStack (+ su CSS) se carga solo al entrar al modo, así la página normal no pesa nada extra.
import { supabase } from '../../core/supabase.js';
import { toast } from '../../core/toast.js';
import { COLS, FILA_PX, tamanoBase } from '../../core/noticiasLienzo.js';

/**
 * @param {{ grid: HTMLElement, items: {id:string, html:string, lienzo:object|null, cols:number}[], alSalir: (guardado:boolean)=>void }} op
 */
export async function entrarAcomodar({ grid, items, alSalir }) {
  const [{ GridStack }] = await Promise.all([import('gridstack'), import('gridstack/dist/gridstack.min.css')]);
  grid.className = 'grid-stack nt-acomodando';
  let yLibre = Math.max(0, ...items.filter((i) => i.lienzo).map((i) => i.lienzo.y + i.lienzo.h));
  grid.innerHTML = items.map((it) => {
    const l = it.lienzo ?? (() => { const b = tamanoBase(it.cols); const r = { x: 0, y: yLibre, ...b }; yLibre += b.h; return r; })();
    return `<div class="grid-stack-item" gs-id="${it.id}" gs-x="${l.x}" gs-y="${l.y}" gs-w="${l.w}" gs-h="${l.h}" gs-min-w="2" gs-min-h="2"><div class="grid-stack-item-content">${it.html}</div></div>`;
  }).join('');
  const gs = GridStack.init({ column: COLS, cellHeight: FILA_PX, margin: 8, float: true, animate: true, resizable: { handles: 'e,se,s,sw,w' }, draggable: { cancel: '' } }, grid);
  const salir = (ok) => { gs.destroy(false); grid.className = ''; alSalir(ok); };
  return {
    cancelar: () => salir(false),
    async guardar() {
      try {
        const nodos = gs.save(false);
        const res = await Promise.all(nodos.map((n) => supabase.from('noticias').update({ lienzo: { x: n.x, y: n.y, w: n.w, h: n.h } }).eq('id', n.id).select('id')));
        const fallo = res.find((r) => r.error || !r.data?.length);
        if (fallo) throw fallo.error ?? new Error('Sin permiso para guardar.');
        toast('Diseño de la página guardado.', 'ok'); salir(true); return true;
      } catch (e) { console.error('[noticias] acomodar:', e); toast(`No se pudo guardar: ${e.message}`, 'error'); return false; }
    },
  };
}
