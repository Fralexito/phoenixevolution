// Catálogo de diseños de Noticias: galería de TODAS las plantillas con vista previa en vivo y controles de estilo (color, forma, brillo, animación, letra).
// Se abre desde la página (para aplicar un diseño a una noticia), desde el lector («Rediseñar») o desde el editor («Elegir diseño»).
import { openModal, closeModal } from '../../core/modal.js';
import { escapeHTML as esc } from '../../core/dom.js';
import { NORMALES, HEROES, LECTURAS, ACENTOS, OPCIONES, ETIQUETAS_OPCION, asignarDiseno, estiloAleatorio, limpiarEstilo, plantillaDe } from '../../core/noticiasPlantillas.js';
import { tarjetaHTML, lecturaHTML } from './tarjetas.js';

const ID = 'news-catalogo';
const MUESTRA = { slug: 'muestra', titulo: 'Así se verá tu noticia en este diseño', resumen: 'Cambia el color, la forma y la animación hasta que te guste. Este texto es solo de muestra.', cuerpo: ['Este es el primer párrafo de la noticia de muestra. Sirve para ver cómo se lee el texto en cada diseño.', 'El segundo párrafo permite comparar columnas, letra capital y espaciado.', 'Y un tercero para ver el ritmo de lectura completo.'], categoria: 'OFICIAL', tag: 'Fecha 8', imagen: '', liga: 'galaxy', publicadaEn: new Date().toISOString() };
const CONTROLES = ['acento', 'forma', 'brillo', 'anim', 'fuente'];

/**
 * @param {{noticias?:object[], noticiaId?:string|null, inicial?:{plantilla?:string,estilo?:object}, ctx:object, boton?:string, onAplicar:(r:{noticia:object|null,plantilla:string,estilo:object})=>Promise<void>|void}} o
 */
export function abrirCatalogo({ noticias = [], noticiaId = null, inicial = {}, ctx, boton = 'Aplicar diseño', onAplicar }) {
  const est = { plantilla: plantillaDe(inicial.plantilla) ? inicial.plantilla : 'auto', estilo: limpiarEstilo(inicial.estilo), tab: 'tarjetas', semilla: Date.now() % 100000, id: noticiaId };
  const wrap = openModal(`<div class="p-4 sm:p-6 space-y-4">
    <div class="flex justify-between items-start gap-3 border-b border-galaxy-border pb-3">
      <div><span class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-widest">Catálogo</span><h3 class="font-display font-bold text-xl text-white uppercase">Diseños de noticias</h3>
        <p class="text-xs text-gray-400 mt-0.5"><b class="text-white">${NORMALES.length}</b> tarjetas · <b class="text-white">${HEROES.length}</b> destacadas · <b class="text-white">${LECTURAS.length}</b> lectores · combínalos con colores, formas y animaciones.</p></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button></div>
    ${noticias.length ? `<div class="flex flex-wrap items-center gap-2"><label for="cat-noticia" class="label !mb-0">Aplicar a</label><select id="cat-noticia" class="field !w-auto max-w-full flex-1 min-w-[12rem]">${noticias.map((n) => `<option value="${esc(n.id)}"${n.id === noticiaId ? ' selected' : ''}>${esc(n.titulo)}</option>`).join('')}</select></div>` : ''}
    <div id="cat-ctrl" class="space-y-2"></div>
    <div class="flex flex-wrap gap-2 items-center"><div class="liga-sel" id="cat-tabs" role="tablist"><button type="button" data-tab="tarjetas" aria-pressed="true">Tarjetas</button><button type="button" data-tab="heroes" aria-pressed="false">Destacadas</button><button type="button" data-tab="lectura" aria-pressed="false">Lectura</button></div>
      <button type="button" id="cat-azar" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-dice"></i> Sorprenderme</button>
      <button type="button" id="cat-auto" class="btn btn-ghost !min-h-9 !px-3 !text-[11px]"><i class="fa-solid fa-wand-magic-sparkles"></i> Automático</button></div>
    <div id="cat-galeria" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[52vh] overflow-y-auto pr-1"></div>
    <div class="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-galaxy-border/50"><p id="cat-info" class="text-xs text-gray-400"></p>
      <div class="flex gap-2"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="button" id="cat-ok" class="btn btn-primary">${esc(boton)}</button></div></div>
  </div>`, { id: ID, wide: true });
  const $ = (s) => wrap.querySelector(s);
  const actual = () => noticias.find((n) => n.id === est.id) ?? MUESTRA;
  const resolver = (n, plantilla) => asignarDiseno([{ ...n, plantilla, estilo: est.estilo }], { heroIdx: plantillaDe(plantilla)?.tamano === 'hero' ? 0 : -1 })[0];

  const controles = () => {
    $('#cat-ctrl').innerHTML = CONTROLES.map((k) => `<div class="flex flex-wrap items-center gap-1.5"><span class="w-28 shrink-0 text-[10px] font-display font-bold uppercase tracking-widest text-gray-500">${ETIQUETAS_OPCION[k]}</span>
      <button type="button" data-k="${k}" data-v="" aria-pressed="${est.estilo[k] === undefined}" class="adv-chip !min-h-8 !px-2.5 !text-[11px]">Auto</button>
      ${OPCIONES[k].map((v) => k === 'acento'
        ? `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${est.estilo[k] === v}" title="${esc(ACENTOS[v].nombre)}" aria-label="${esc(ACENTOS[v].nombre)}" class="w-7 h-7 rounded-full border-2 ${est.estilo[k] === v ? 'border-white' : 'border-transparent'}" style="background:rgb(${ACENTOS[v].rgb});box-shadow:0 0 10px rgb(${ACENTOS[v].rgb}/.5)"></button>`
        : `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${est.estilo[k] === v}" class="adv-chip !min-h-8 !px-2.5 !text-[11px]">${esc(ETIQUETAS_OPCION[v])}</button>`).join('')}</div>`).join('');
  };
  const galeria = () => {
    const n = actual(); const g = $('#cat-galeria');
    if (est.tab === 'lectura') {
      g.className = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[52vh] overflow-y-auto pr-1';
      g.innerHTML = LECTURAS.map((l) => `<div role="button" tabindex="0" data-lectura="${l.id}" aria-pressed="${est.estilo.lectura === l.id}" class="cat-item"><b>${esc(l.nombre)}</b><span>${esc(l.nota)}</span></div>`).join('')
        + `<div class="col-span-full rounded-xl border border-galaxy-border/60 bg-black/30 max-h-[40vh] overflow-y-auto" id="cat-lector"></div>`;
      const d = resolver(n, 'clasica'); const e = { ...d.estilo, ...(est.estilo.lectura ? {} : {}), lectura: est.estilo.lectura ?? d.estilo.lectura };
      $('#cat-lector').innerHTML = lecturaHTML({ ...n, cuerpo: n.cuerpo?.length ? n.cuerpo : MUESTRA.cuerpo }, e, ctx, '').replace(/data-close/g, 'data-x');
      return;
    }
    const lista = est.tab === 'heroes' ? HEROES : NORMALES;
    g.className = est.tab === 'heroes' ? 'grid gap-4 grid-cols-1 max-h-[52vh] overflow-y-auto pr-1' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[52vh] overflow-y-auto pr-1';
    g.innerHTML = lista.map((p) => { const d = resolver(n, p.id);
      return `<div role="button" tabindex="0" data-plantilla="${p.id}" aria-pressed="${est.plantilla === p.id}" class="cat-item"><div class="cat-vista ${p.cols > 1 && est.tab !== 'heroes' ? 'sm:col-span-2' : ''}">${tarjetaHTML(n, p.id, d.estilo, ctx)}</div><b>${esc(p.nombre)}</b><span>${esc(p.nota)}</span></div>`; }).join('');
    g.querySelectorAll('.nt').forEach((b) => { b.tabIndex = -1; });
  };
  const info = () => { $('#cat-info').textContent = est.plantilla === 'auto' ? 'Diseño automático: el sitio lo elige y lo rota para que no se repita.' : `Diseño elegido: ${plantillaDe(est.plantilla)?.nombre ?? est.plantilla}.`; };
  const pintar = () => { controles(); galeria(); info(); wrap.querySelectorAll('#cat-tabs [data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === est.tab))); };
  pintar();

  wrap.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]'); if (k) { const v = k.dataset.v; if (v) est.estilo[k.dataset.k] = v; else delete est.estilo[k.dataset.k]; pintar(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { est.tab = t.dataset.tab; pintar(); return; }
    const p = e.target.closest('[data-plantilla]'); if (p) { est.plantilla = est.plantilla === p.dataset.plantilla ? 'auto' : p.dataset.plantilla; pintar(); return; }
    const l = e.target.closest('[data-lectura]'); if (l) { est.estilo.lectura = l.dataset.lectura; pintar(); return; }
    if (e.target.closest('#cat-azar')) { est.semilla += 1; est.estilo = estiloAleatorio(est.semilla, actual().categoria); const lista = est.tab === 'heroes' ? HEROES : NORMALES; est.plantilla = lista[est.semilla % lista.length].id; pintar(); return; }
    if (e.target.closest('#cat-auto')) { est.plantilla = 'auto'; est.estilo = {}; pintar(); }
  });
  wrap.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-plantilla],[role="button"][data-lectura]')) { e.preventDefault(); e.target.click(); } });
  wrap.querySelector('#cat-noticia')?.addEventListener('change', (e) => { est.id = e.target.value; const n = actual(); est.plantilla = plantillaDe(n.plantilla) ? n.plantilla : 'auto'; est.estilo = limpiarEstilo(n.estilo); pintar(); });
  $('#cat-ok').addEventListener('click', async () => {
    const b = $('#cat-ok'); b.disabled = true;
    try { await onAplicar({ noticia: noticias.find((n) => n.id === est.id) ?? null, plantilla: est.plantilla, estilo: limpiarEstilo(est.estilo) }); closeModal(ID); }
    catch (err) { console.error('[catalogo] aplicar:', err); b.disabled = false; }
  });
}
