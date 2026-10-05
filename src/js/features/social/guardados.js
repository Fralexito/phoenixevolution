// Estado de los marcadores en la página actual: qué publicaciones/clips tengo guardados y cómo alternar uno.
// Las páginas pintan el botón con `botonGuardarHTML` y delegan el clic en `alternar`; este módulo no toca el DOM salvo el propio botón.
import * as api from './api.js';
import { toast } from '../../core/toast.js';

const marcados = { publicacion: new Set(), clip: new Set() };
export const estaGuardado = (tipo, id) => !!marcados[tipo]?.has(Number(id));

/** Carga el estado de estos ids (se suma a lo ya conocido). */
export async function cargarEstado(tipo, ids) { const s = await api.guardadosDe(tipo, ids); for (const id of (ids ?? [])) { if (s.has(Number(id))) marcados[tipo].add(Number(id)); else marcados[tipo].delete(Number(id)); } }

export const botonGuardarHTML = (tipo, id, { clase = 'w-8 h-8 rounded-lg shrink-0' } = {}) => {
  const on = estaGuardado(tipo, id);
  return `<button type="button" data-guardar="${Number(id)}" data-gtipo="${tipo}" aria-pressed="${on}" title="${on ? 'Quitar de guardados' : 'Guardar'}" aria-label="${on ? 'Quitar de guardados' : 'Guardar'}" class="${clase} ${on ? 'text-galaxy-400' : 'text-gray-400 hover:text-galaxy-400'}"><i class="fa-${on ? 'solid' : 'regular'} fa-bookmark"></i></button>`;
};

/** Cambia el estado de un marcador (con actualización inmediata del botón y vuelta atrás si falla). `btn` = el botón pulsado. → estado final. */
export async function alternar(btn, { onCambio = null } = {}) {
  const tipo = btn.dataset.gtipo; const id = Number(btn.dataset.guardar); if (!marcados[tipo] || !Number.isFinite(id) || btn.disabled) return null;
  const antes = estaGuardado(tipo, id); btn.disabled = true;
  try {
    const ahora = await api.guardar(tipo, id, !antes);
    if (ahora) marcados[tipo].add(id); else marcados[tipo].delete(id);
    btn.outerHTML = botonGuardarHTML(tipo, id, { clase: btn.className.replace(/\s*(text-galaxy-400|text-gray-400|hover:text-galaxy-400)/g, '') });
    toast(ahora ? 'Guardado. Lo encuentras en «Guardados».' : 'Quitado de guardados.', 'ok', { key: 'guardado' });
    onCambio?.(tipo, id, ahora); return ahora;
  } catch (e) { btn.disabled = false; toast(e.message, 'error'); return null; }
}
