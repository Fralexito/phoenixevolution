// LECTOR de página completa (ronda 351, FX.noticiasV2): reemplaza la ventanita. Se abre con ?n=<slug> (enlace propio
// para compartir), tiene botón «Volver al diario», reacciones/encuesta/comentarios (features/noticias/social.js),
// la tabla al costado y «Sigue leyendo». El staff ve Editar / Ocultar / Eliminar (mismas funciones de antes).
import { EDICIONES } from '../../../data/ligaResultados.js';
import { tablaEdicion } from '../../core/tabla.js';
import { departamento, departamentoDe } from '../../core/departamentos.js';
import { escapeHTML as esc, safeImg } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { confirmar } from '../../core/dialogo.js';
import { can } from '../../core/session.js';
import { FX } from '../../../data/experimento.js';
import { href } from '../../core/config.js';
import { montarSocial } from './social.js';
import { etiqueta } from './zonaSeria.js';

const minutos = (n) => Math.max(1, Math.round((n.cuerpo ?? []).join(' ').split(/\s+/).length / 200));

function tablaLado(ligaId) {
  try {
    const ed = (EDICIONES[ligaId] ?? []).find((e) => e.estado === 'en_curso') ?? EDICIONES[ligaId]?.[0];
    const t = tablaEdicion(ed).slice(0, 5); if (!t.length) return '';
    return `<div class="nl2-caja"><span class="nv-et">Tabla</span><div class="nl2-tabla">${t.map((f, k) => `<b>${k + 1}</b><span>${esc(f.nombre)}</span><b>${f.pts}</b>`).join('')}</div><a href="${esc(href('liga/'))}" class="nl2-link">Ver tabla completa →</a></div>`;
  } catch (e) { console.warn('[lector] tabla:', e); return ''; }
}

/**
 * Pinta la noticia `n` dentro de `caja`.
 * @param {{ lista: object[], cuando: (n)=>string, alVolver: ()=>void, alAbrir: (slug)=>void, acciones: { editar, ocultar, borrar } }} o
 */
export function pintarLector(caja, n, o) {
  const dep = departamentoDe(n); const d = departamento(dep);
  const otras = o.lista.filter((x) => x.slug !== n.slug && x.publicada).slice(0, 3);
  const puedeEditar = can('editarLiga') && n.editable; const puedeBorrar = can('borrarLiga') && n.editable;
  const img = safeImg(n.imagen);
  caja.innerHTML = `<div class="nl2" style="--dp:${d.color}">
    <div class="nl2-barra">
      <button type="button" class="nl2-volver" data-volver>‹ Volver al diario</button>
      <div class="nl2-acc">
        <button type="button" data-copiar>Copiar enlace</button>
        ${puedeEditar ? '<button type="button" data-editar class="nl2-staff">Editar</button>' : ''}
        ${puedeEditar && n.publicada ? '<button type="button" data-ocultar class="nl2-staff">Ocultar</button>' : ''}
        ${puedeBorrar ? '<button type="button" data-borrar class="nl2-staff nl2-peligro">Eliminar</button>' : ''}
      </div>
    </div>
    <header class="nl2-cab">
      <span class="nv-dep"><i></i>${esc(etiqueta({ noticia: n, dep }))}</span>
      <h1>${esc(n.titulo)}</h1>
      <p class="nl2-bajada">${esc(n.resumen)}</p>
      <small>Por ${esc(d.firma ?? d.nombre)} · ${esc(o.cuando(n))} · ${minutos(n)} min de lectura${n.publicada ? '' : ' · <b class="nl2-borrador">Borrador</b>'}</small>
    </header>
    <div class="nl2-cuerpo">
      <div class="nl2-texto">
        ${img ? `<img src="${esc(img)}" alt="" class="nl2-img" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
        ${(n.cuerpo ?? []).map((p) => `<p>${esc(p)}</p>`).join('')}
        <div class="ns" data-social></div>
      </div>
      <aside class="nl2-lado">
        ${tablaLado(n.liga)}
        ${otras.length ? `<div class="nl2-caja"><span class="nv-et">Sigue leyendo</span>${otras.map((x) => { const dx = departamento(departamentoDe(x)); return `<button type="button" data-slug="${esc(x.slug)}" class="nl2-otra"><b style="color:${dx.color}">${esc(dx.nombre)}</b><span>${esc(x.titulo)}</span></button>`; }).join('')}</div>` : ''}
      </aside>
    </div>
  </div>`;

  const social = caja.querySelector('[data-social]');
  if (FX.noticiasSocial && n.editable && social) { try { montarSocial(social, n); } catch (e) { console.error('[lector] social:', e); } }
  else social?.remove();

  caja.querySelector('[data-volver]').addEventListener('click', o.alVolver);
  caja.querySelectorAll('[data-slug]').forEach((b) => b.addEventListener('click', () => o.alAbrir(b.dataset.slug)));
  caja.querySelector('[data-copiar]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Enlace copiado.', 'ok'); }
    catch (e) { console.warn('[lector] copiar:', e); toast('No se pudo copiar; copia la dirección del navegador.', 'warn'); }
  });
  caja.querySelector('[data-editar]')?.addEventListener('click', () => o.acciones.editar(n));
  caja.querySelector('[data-ocultar]')?.addEventListener('click', () => o.acciones.ocultar(n));
  caja.querySelector('[data-borrar]')?.addEventListener('click', async () => {
    if (await confirmar(`Se eliminará «${n.titulo}» para siempre.`, { titulo: 'Eliminar noticia', aceptar: 'Eliminar', peligro: true })) o.acciones.borrar(n);
  });
}
