// Modo «Acomodar» de Noticias (solo staff): agarrar y soltar las tarjetas para elegir el orden de la página.
// La primera queda como portada (destacada). Se guarda en noticias.orden (0, 1, 2…). SortableJS se carga solo al entrar al modo.
import { supabase } from '../../core/supabase.js';
import { toast } from '../../core/toast.js';

/**
 * @param {{ grid: HTMLElement, alSalir: (guardado: boolean) => void }} op
 * @returns {Promise<{ guardar: () => Promise<boolean>, cancelar: () => void }>}
 */
export async function entrarAcomodar({ grid, alSalir }) {
  const { default: Sortable } = await import('sortablejs');
  grid.classList.add('nt-acomodando');
  const s = Sortable.create(grid, {
    animation: 180, draggable: '[data-slug]', ghostClass: 'nt-fantasma', chosenClass: 'nt-agarrada',
    delay: 120, delayOnTouchOnly: true,   // en celular: mantener pulsado un instante para agarrar (así no choca con el scroll)
  });
  const salir = (ok) => { s.destroy(); grid.classList.remove('nt-acomodando'); alSalir(ok); };
  return {
    cancelar: () => salir(false),
    async guardar() {
      const ids = [...grid.querySelectorAll('[data-slug]')].map((el) => el.dataset.id).filter(Boolean);
      try {
        const res = await Promise.all(ids.map((id, i) => supabase.from('noticias').update({ orden: i }).eq('id', id).select('id')));
        const fallo = res.find((r) => r.error || !r.data?.length);
        if (fallo) throw fallo.error ?? new Error('Sin permiso para reordenar.');
        toast('Orden guardado. La primera es la portada.', 'ok'); salir(true); return true;
      } catch (e) { console.error('[noticias] acomodar:', e); toast(`No se pudo guardar el orden: ${e.message}`, 'error'); return false; }
    },
  };
}
