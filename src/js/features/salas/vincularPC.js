// Bloque «Vincular Phoenix Link» (reutilizable: Mi perfil → Phoenix Link y la página /mis-salas/).
// Genera el código de 6 dígitos (10 min, un uso) que la app canjea en POST /v1/emparejar, el código del instalador
// y la lista de PCs vinculadas (renombrar / desvincular). Suspender es solo del staff (panel de moderación).
import { toast } from '../../core/toast.js';
import { confirmar, pedirTexto } from '../../core/dialogo.js';
import { escapeHTML } from '../../core/dom.js';
import { mostrarCodigoPC, segundosRestantes } from '../../core/salas.js';
import * as api from './api.js';
import { NOMBRE_APP } from '../../../data/site.js';

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const btn = (attrs, html, extra = '') => `<button type="button" class="btn !min-h-9 !text-xs ${extra}" ${attrs}>${html}</button>`;

/** @param {HTMLElement} caja  @param {{ esHost: boolean }} op */
export function montarVincularPC(caja, { esHost, pasos = false }) {
  if (!caja) return;
  let reloj = null;
  const pintar = async () => {
    if (!esHost) { caja.innerHTML = '<p class="text-xs text-gray-400">Para abrir salas desde tu PC, el staff tiene que aprobarte como host. Activa «Puedo ser host» y pídelo en Discord.</p>'; return; }
    try {
      const pcs = (await api.misDispositivos()).filter((d) => !d.revocado);
      if (pasos) { caja.innerHTML = guiaPasos(pcs); return; }
      caja.innerHTML = `<div class="flex flex-wrap gap-2">
          ${btn('data-vpc="codigo"', '<i class="fa-solid fa-key"></i> Generar código de vinculación', 'btn-primary')}
          ${btn('data-vpc="instalar"', '<i class="fa-solid fa-download"></i> Código de instalación')}
        </div>
        <div data-vpc-codigo hidden class="rounded-lg border border-galaxy-400/40 bg-galaxy-600/10 p-3 text-center mt-3"></div>
        <ul class="mt-2">${pcs.map((d) => `<li class="flex flex-wrap items-center gap-2 py-2 border-b border-galaxy-border/40">
          <span class="flex-1 min-w-0"><b class="text-white">${escapeHTML(d.nombre)}</b>
            <span class="text-[11px] text-gray-400 block">v${escapeHTML(d.version_app ?? '?')} · último uso ${fecha(d.ultimo_uso)}${d.suspendido ? ' · <b class="text-rose-300">suspendida por el staff</b>' : ''}</span></span>
          ${btn(`data-vpc="renombrar" data-id="${d.id}" data-nombre="${escapeHTML(d.nombre)}" aria-label="Renombrar"`, '<i class="fa-solid fa-pen"></i>')}
          ${btn(`data-vpc="revocar" data-id="${d.id}"`, '<i class="fa-solid fa-trash"></i> Desvincular')}</li>`).join('') || '<li class="text-xs text-gray-400 py-2">Aún no vinculaste ninguna PC.</li>'}</ul>`;
    } catch (e) { caja.textContent = e.message; }
  };
  // Versión guiada (Mi perfil, ronda 251): 3 pasos claros y tus PCs. Si ya tienes PCs, primero salen ellas y los pasos van plegados.
  const listaPCs = (pcs) => `<ul class="pf2-pcs">${pcs.map((d) => `<li class="pf2-pc"><i class="fa-solid fa-desktop" aria-hidden="true"></i>
      <span class="flex-1 min-w-0"><b>${escapeHTML(d.nombre)}</b><small>v${escapeHTML(d.version_app ?? '?')} · último uso ${fecha(d.ultimo_uso)}${d.suspendido ? ' · <b class="text-rose-300">suspendida por el staff</b>' : ''}</small></span>
      ${btn(`data-vpc="renombrar" data-id="${d.id}" data-nombre="${escapeHTML(d.nombre)}" aria-label="Renombrar"`, '<i class="fa-solid fa-pen"></i>', 'btn-ghost')}
      ${btn(`data-vpc="revocar" data-id="${d.id}" aria-label="Desvincular"`, '<i class="fa-solid fa-link-slash"></i>', 'btn-ghost')}</li>`).join('')}</ul>`;
  const guiaPasos = (pcs) => {
    const ol = `<ol class="pf2-pasos">
        <li class="pf2-paso"><span class="pf2-num">1</span><b>Instala ${NOMBRE_APP}</b><p>Pide un código y escríbelo en el instalador (PhoenixSetup).</p>${btn('data-vpc="instalar"', '<i class="fa-solid fa-download"></i> Pedir código', 'btn-ghost')}</li>
        <li class="pf2-paso"><span class="pf2-num">2</span><b>Genera tu código</b><p>Son 6 dígitos. Valen 10 minutos y un solo uso.</p>${btn('data-vpc="codigo"', '<i class="fa-solid fa-key"></i> Generar código', 'btn-primary')}</li>
        <li class="pf2-paso"><span class="pf2-num">3</span><b>Escríbelo en la app</b><p>En ${NOMBRE_APP}, entra a «Vincular». Listo: tu PC ya puede abrir salas.</p></li>
      </ol>`;
    const codigo = '<div data-vpc-codigo hidden class="pf2-codigo"></div>';
    return pcs.length
      ? `<p class="pf2-sub">Tus PCs vinculadas</p>${listaPCs(pcs)}${codigo}<details class="pf2-plieg"><summary><span class="pf2-plieg-t"><i class="fa-solid fa-plus"></i><b>Vincular otra PC</b></span><i class="fa-solid fa-chevron-down pf2-flecha"></i></summary><div class="pf2-plieg-c">${ol}</div></details>`
      : `${ol}${codigo}<p class="pf2-sub">Tus PCs vinculadas</p><p class="text-xs text-gray-400">Aún no vinculaste ninguna PC. Sigue los 3 pasos de arriba.</p>`;
  };
  const mostrar = (titulo, codigo, expira, ayuda) => {
    const c = caja.querySelector('[data-vpc-codigo]'); if (!c) return; c.hidden = false; clearInterval(reloj);
    const pinta = () => {
      const s = segundosRestantes(expira);
      c.innerHTML = s ? `<p class="text-xs text-gray-300">${titulo}</p><p class="font-display font-extrabold text-3xl text-white tracking-[.3em] my-1">${escapeHTML(codigo)}</p>
        <p class="text-[11px] text-gray-400">${ayuda} · vence en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</p>` : '<p class="text-xs text-gray-400">El código venció. Genera otro.</p>';
      if (!s) clearInterval(reloj);
    };
    pinta(); reloj = setInterval(pinta, 1000);
  };
  caja.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-vpc]'); if (!b || b.disabled) return;
    b.disabled = true;
    try {
      const a = b.dataset.vpc;
      if (a === 'codigo') { const r = await api.generarCodigoPC(); mostrar(`Escríbelo en ${NOMBRE_APP} → Vincular`, mostrarCodigoPC(r.codigo), r.expira, 'Un solo uso'); }
      else if (a === 'instalar') { const r = await api.generarCodigoInstalacion(); mostrar('Código para PhoenixSetup', r.codigo, r.expira, 'Un solo uso · máx. 3 por día'); }
      else if (a === 'renombrar') { const n = await pedirTexto('Nuevo nombre de la PC:', { valor: b.dataset.nombre, maximo: 40, obligatorio: true }); if (n) { await api.renombrarDispositivo(b.dataset.id, n); await pintar(); } }
      else if (a === 'revocar') { if (await confirmar('Esta PC ya no podrá abrir salas hasta que la vuelvas a vincular. ¿Seguir?', { aceptar: 'Desvincular', peligro: true })) { await api.revocarDispositivo(b.dataset.id); toast('PC desvinculada.', 'ok'); await pintar(); } }
    } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
  });
  pintar();
}
