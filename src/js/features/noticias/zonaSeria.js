// ZONA SERIA de Noticias (ronda 351, FX.noticiasV2): marcadores de la fecha, primera plana, lo último,
// secciones (5 bloques), el resto de la semana y La Tribuna (joda) al final.
// Solo pinta HTML a partir de datos; los clics los maneja pages/noticiasV2.js (data-slug, data-bloque, data-liga).
import { EDICIONES } from '../../../data/ligaResultados.js';
import { tablaEdicion } from '../../core/tabla.js';
import { resumenFecha } from '../../core/ligaStats.js';
import { departamento, BLOQUES, esJoda } from '../../core/departamentos.js';
import { escapeHTML as esc } from '../../core/dom.js';

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);

/** Última fecha con algún partido jugado + top 3 de la tabla (solo ligas con resultados cargados). */
export function marcadoresHTML(ligaId) {
  try {
    const ed = (EDICIONES[ligaId] ?? []).find((e) => e.estado === 'en_curso') ?? EDICIONES[ligaId]?.[0];
    const fechas = ed?.fechas ?? [];
    const f = [...fechas].reverse().find((x) => resumenFecha(x).jugados > 0);
    if (!f) return '';
    const tabla = tablaEdicion(ed).slice(0, 3);
    const r = resumenFecha(f);
    const partidos = f.partidos.filter(jugado).map((m, k) => `<div class="nv-res${k === 0 ? ' nv-res-top' : ''}"><span>${esc(m.l)}</span><b>${m.gl} – ${m.gv}</b><span>${esc(m.v)}</span></div>`).join('');
    return `<section class="nv-marcadores" aria-label="Resultados de la fecha ${f.n}">
      <div class="nv-fecha">Fecha ${f.n}<small>${r.pendientes ? `${r.pendientes} sin cargar` : 'Finales'}</small></div>
      ${partidos}
      ${tabla.length ? `<div class="nv-tabla-mini"><small>Tabla</small>${tabla.map((t, k) => `<span>${k + 1} ${esc(t.nombre)} <b>${t.pts}</b></span>`).join('')}</div>` : ''}
    </section>`;
  } catch (e) { console.error('[zona-seria] marcadores:', e); return ''; }
}

const color = (dep) => departamento(dep).color;
const base = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(la|el|los|las)\s+/, '').trim();
/** «La Crónica · Fecha 11»: el nombre del departamento + lo de la etiqueta que no lo repita. */
export const etiqueta = (it) => {
  const nom = departamento(it.dep).nombre;
  const extra = String(it.noticia.tag ?? '').split('·').map((x) => x.trim()).filter((x) => x && base(x) !== base(nom));
  return [nom, ...extra].join(' · ');
};
const reacciones = (n, social) => {
  const s = social?.get(n.id); if (!s) return '';
  const top = Object.entries(s.reacciones ?? {}).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 2);
  const EMO = { fuego: '🔥', risa: '😂', sorpresa: '😮', aplauso: '👏', calavera: '💀' };
  const chips = top.map(([k, v]) => `<span class="nv-chip">${EMO[k] ?? ''} ${v}</span>`).join('');
  return chips || s.comentarios_total ? `<span class="nv-chips">${chips}${s.comentarios_total ? `<span class="nv-chip">💬 ${s.comentarios_total}</span>` : ''}</span>` : '';
};

const tarjeta = (it, cuando, cls = '') => `<button type="button" data-slug="${esc(it.noticia.slug)}" class="nv-card ${cls}" style="--dp:${color(it.dep)}">
  <span class="nv-dep">${esc(etiqueta(it))}</span>
  <h3>${esc(it.noticia.titulo)}</h3>
  <small>${esc(cuando(it.noticia))}</small>
</button>`;

/**
 * @param {{ portada: ReturnType<import('../../core/diario.js').armarPortada>, bloque: string, conteos: Record<string,number>, total: number,
 *           cuando: (n)=>string, ligaId: string, borrador: (n)=>string }} d
 */
export function zonaSeriaHTML(d) {
  const { portada: p, bloque, conteos, total, cuando, ligaId, borrador } = d;
  if (!p.orden.length) return `${marcadoresHTML(ligaId)}<p class="nv-vacio">Todavía no hay noticias en esta sección. El paquete de la semana sale los lunes.</p>`;
  const primera = p.afiche;
  const segundas = [p.hero, p.resto[0]].filter(Boolean);
  const resto = p.resto.slice(segundas.includes(p.resto[0]) ? 1 : 0);
  const filtroBtn = (id, nombre, n) => `<button type="button" data-bloque="${id}" aria-pressed="${bloque === id}">${esc(nombre)} · ${n}</button>`;
  return `${marcadoresHTML(ligaId)}
  <section class="nv-arriba">
    ${primera ? `<button type="button" data-slug="${esc(primera.noticia.slug)}" class="nv-primera" style="--dp:${color(primera.dep)}">
      <span class="nv-dep"><i></i>Primera plana · ${esc(etiqueta(primera))}</span>
      <h2>${esc(primera.noticia.titulo)}${borrador(primera.noticia)}</h2>
      <p>${esc(primera.noticia.resumen)}</p>
      <small>${esc(cuando(primera.noticia))}${reacciones(primera.noticia, d.social)}</small>
    </button>` : ''}
    <div class="nv-lado">
      ${segundas.length ? `<div class="nv-dos">${segundas.map((it) => tarjeta(it, cuando, 'nv-card-alta')).join('')}</div>` : ''}
      ${p.ultimas.length ? `<div class="nv-ultimo"><span class="nv-et">Lo último</span>${p.ultimas.slice(0, 4).map((n) => { const it = p.orden.find((x) => x.noticia === n) ?? { noticia: n, dep: 'cronica' }; return `<button type="button" data-slug="${esc(n.slug)}"><b style="color:${color(it.dep)}">${esc(departamento(it.dep).nombre)}</b><span>${esc(n.titulo)}</span><small>${esc(cuando(n))}</small></button>`; }).join('')}</div>` : ''}
    </div>
  </section>
  <nav class="nv-secciones" aria-label="Secciones del diario"><span class="nv-et">Secciones</span>
    ${filtroBtn('TODOS', 'Todo', total)}${BLOQUES.filter((b) => conteos[b.id]).map((b) => filtroBtn(b.id, b.nombre, conteos[b.id])).join('')}
  </nav>
  <section class="nv-abajo">
    <div class="nv-grilla">${resto.map((it) => tarjeta(it, cuando)).join('') || '<p class="nv-vacio">No hay más noticias en esta sección.</p>'}</div>
    ${p.joda.length ? `<div class="nv-tribunas">${p.joda.map((it) => `<button type="button" data-slug="${esc(it.noticia.slug)}" class="nv-tribuna">
      <span class="nv-sticker">Pura joda</span><span class="nv-dep">${esc(departamento(it.dep).nombre)}</span>
      <h3>${esc(it.noticia.titulo)}</h3><p>${esc(it.noticia.resumen)}</p>${reacciones(it.noticia, d.social)}</button>`).join('')}</div>` : ''}
  </section>
  ${p.sobran ? `<p class="nv-mas">Hay ${p.sobran} noticia${p.sobran === 1 ? '' : 's'} más · usa el buscador para encontrarlas.</p>` : ''}`;
}

/** Cuenta cuántas noticias hay por bloque (para los botones de Secciones). */
export function contarBloques(items) {
  const c = {}; for (const it of items) { const b = departamento(it.dep).bloque; c[b] = (c[b] ?? 0) + 1; } return c;
}
export const esDeJoda = (it) => esJoda(it.dep);
