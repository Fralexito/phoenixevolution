// Página Premios (ronda 265). Calcula los premios con core/premios.js sobre la edición en curso de cada liga y los pinta como trofeos.
// Las fotos (si las hay) salen de las cartas de `jugadores`; si no, iniciales con el color del premio.
import { supabase } from '../core/supabase.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { href } from '../core/config.js';
import { premiosEdicion, tamanosMuro } from '../core/premios.js';
import { nombreEnEdicion } from '../core/perfil.js';
import { escudoHTML } from '../core/escudos.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { montarVotoSemana } from '../features/reconocimientos.js';
import { FX } from '../../data/experimento.js';
import { huecoGrafico, dibujarGraficos } from '../features/premiosGraficos.js';

const $ = (id) => document.getElementById(id);
const edicionDe = (lid) => { const eds = EDICIONES[lid] ?? []; return eds.find((e) => e.estado === 'en_curso') ?? eds.at(-1) ?? null; };
let jugadores = [];
// SIN RASTRO DE IA (ronda 269, FX.premiosSinIA): sin cuadraditos con ícono, sin íconos gigantes de fondo, sin brillos; solo fotos, escudos reales y tipografía.
const SIN_IA = !!FX.premiosSinIA;
let ligaActual = LIGAS.find((l) => (EDICIONES[l.id] ?? []).some((e) => (e.fechas ?? []).length))?.id ?? 'galaxy';

const ini = (n) => { const p = String(n).trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase(); };

function quien(pr, ed) {
  if (pr.duelo) {
    const [a, b] = pr.nombre.split(' vs ');
    return `<div class="pr-quien pr-duelo"><span>${escapeHTML(a)}</span><i>vs</i><span>${escapeHTML(b)}</span></div>`;
  }
  const j = jugadores.find((p) => nombreEnEdicion(p, ed) === pr.nombre);
  const foto = j && safeImg(j.foto_url);
  const club = ed?.clubes?.[pr.nombre];
  const av = foto ? `<img src="${escapeHTML(foto)}" alt="" loading="lazy" class="pr-av">`
    : SIN_IA && club ? `<span class="pr-av pr-av-esc">${escudoHTML(club, 30)}</span>`   // sin foto: el escudo real del club, no iniciales de colores
    : `<span class="pr-av pr-av-ini">${escapeHTML(ini(pr.nombre))}</span>`;
  const nom = j ? `<a href="${href(`jugador/?id=${encodeURIComponent(j.id)}`)}">${escapeHTML(pr.nombre)}</a>` : escapeHTML(pr.nombre);
  return `<div class="pr-quien">${av}<span class="min-w-0"><b>${nom}</b>${club ? `<small>${SIN_IA && !foto ? '' : escudoHTML(club, 14) + ' '}${escapeHTML(club)}</small>` : ''}</span></div>`;
}

// VARIEDAD (ronda 267, FX.premiosVariedad): misma malla y mismo orden, pero cada familia muestra su cifra a su manera.
//   goleadas → marcador de estadio · rachas → bolitas (una por partido) · Matagigantes → salto de puesto ·
//   Revelación → barra de rendimiento · líder y defensas → ícono grande de fondo (corona / escudo).
const RACHAS = ['enllamas', 'imparable']; const AGUA = ['lider', 'muralla', 'cerrojo'];
function valorHTML(pr) {
  const v = escapeHTML(pr.valor), u = escapeHTML(pr.unidad);
  if (!FX.premiosVariedad) return `<p class="pr-valor"><b>${v}</b><span>${u}</span></p>`;
  const marc = /^(\d+)-(\d+)$/.exec(pr.valor);
  if (marc) return `<p class="pr-valor pr-marcador"><b><em>${marc[1]}</em><em>${marc[2]}</em></b><span>${u}</span></p>`;
  if (pr.id === 'matagigantes') {
    const arriba = /(\d+)\.º/.exec(pr.unidad)?.[1];
    if (arriba) return `<p class="pr-valor pr-salto"><b>${v}</b><i class="fa-solid fa-angles-right" aria-hidden="true"></i><b class="pr-gigante">${escapeHTML(arriba)}.º</b><span>le ganó</span></p>`;
  }
  if (RACHAS.includes(pr.id)) {
    const n = Math.min(Number(pr.valor) || 0, 12);
    return `<p class="pr-valor"><b>${v}</b><span>${u}</span></p><div class="pr-puntos" aria-hidden="true">${'<i></i>'.repeat(n)}</div>`;
  }
  if (pr.id === 'revelacion') {
    const pct = Math.max(0, Math.min(100, parseInt(pr.valor, 10) || 0));
    return `<p class="pr-valor"><b>${v}</b><span>${u}</span></p><div class="pr-barra" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  }
  return `<p class="pr-valor"><b>${v}</b><span>${u}</span></p>`;
}

const trofeo = (pr, ed, i, destacado = false, t = '') => `<article ${t ? `data-t="${t}"` : ''} class="pr-trofeo${destacado ? ' pr-destacado' : ''}${FX.premiosVariedad && pr.id === 'lider' ? ' pr-corona' : ''}" data-premio="${escapeHTML(pr.id)}" style="--c:${pr.color};--i:${i}">
    ${t ? `${SIN_IA ? '' : `<i class="fa-solid ${pr.icono} pr-agua" aria-hidden="true"></i>`}${familiaDe(pr.id) ? `<span class="pr-chip">${familiaDe(pr.id)}</span>` : ''}` : !SIN_IA && FX.premiosVariedad && AGUA.includes(pr.id) ? `<i class="fa-solid ${pr.icono} pr-agua" aria-hidden="true"></i>` : ''}
    <header class="pr-t-cab">${SIN_IA ? '' : `<span class="pr-ico"><i class="fa-solid ${pr.icono}"></i></span>`}<h3>${escapeHTML(pr.titulo)}</h3></header>
    ${quien(pr, ed)}
    ${valorHTML(pr)}
    ${FX.premiosGraficos ? huecoGrafico(pr) : ''}
    <p class="pr-det">${escapeHTML(pr.detalle)}</p>
  </article>`;

// Orden visual (ronda 266): los premios de la edición van en 4 familias, cada una con su rótulo.
const FAMILIAS = [
  { t: 'La tabla', i: 'fa-list-ol', ids: ['lider', 'dominante', 'revelacion', 'empates'] },
  { t: 'Ataque', i: 'fa-futbol', ids: ['canonero', 'record-goleada', 'record-partido'] },
  { t: 'Defensa', i: 'fa-shield-halved', ids: ['muralla', 'cerrojo'] },
  { t: 'Rachas', i: 'fa-fire', ids: ['enllamas', 'imparable'] },
];
let votoListo = false;
const familiaDe = (id) => FAMILIAS.find((f) => f.ids.includes(id))?.t ?? '';
// «Esta semana» en muro: el primero grande, el resto chicos/anchos y el voto como cuadro ancho; siempre 2 filas completas.
const MURO_SEMANA = { 1: ['g'], 2: ['g', 'w'], 3: ['g', 'c', 'c'], 4: ['g', 'c', 'c', 'w'] };

function pintar() {
  const ed = edicionDe(ligaActual);
  const ovrDe = (nombre) => { const j = jugadores.find((p) => nombreEnEdicion(p, ed) === nombre); return j ? Number(j.ovr) : NaN; };
  const r = premiosEdicion(ed, { ovrDe });
  const fecha = r.premios.filter((p) => p.grupo === 'fecha'); const edic = r.premios.filter((p) => p.grupo === 'edicion');
  $('pr-fecha-n').textContent = r.fecha ? `Fecha ${r.fecha}` : '';
  $('pr-ed-n').textContent = ed?.nombre ?? '';
  const vacio = (t) => `<p class="pr-vacio"><i class="fa-solid fa-hourglass-half"></i>${t}</p>`;
  if (FX.premiosGaleria) { pintarMuro(ed, fecha, edic, vacio); return; }
  // «Esta semana»: premios de la fecha + el voto de la afición, siempre llenando filas de 4 en PC.
  const voto = $('pr-voto') ?? Object.assign(document.createElement('div'), { id: 'pr-voto', className: 'pr-voto' });
  const huecos = fecha.length + 1;
  const ancho = huecos < 4 ? 4 - huecos + 1 : 1;          // el primero crece para no dejar huecos
  $('pr-fecha').innerHTML = fecha.length
    ? fecha.map((p, i) => trofeo(p, ed, i, i === 0 && ancho > 1).replace('<article ', `<article data-ancho="${i === 0 ? ancho : 1}" `)).join('')
    : vacio('Los premios de la fecha aparecen cuando se juega una fecha.');
  voto.dataset.ancho = huecos > 4 ? '4' : '1';
  $('pr-fecha').append(voto);
  if (!votoListo) { votoListo = true; montarVotoSemana(voto, jugadores); }
  // «De toda la edición»: una caja por familia; cada caja ocupa tantas columnas como premios tiene.
  const cajas = FAMILIAS.map((f) => ({ ...f, ps: f.ids.map((id) => edic.find((p) => p.id === id)).filter(Boolean) })).filter((f) => f.ps.length);
  let k = 0;
  $('pr-edicion').innerHTML = cajas.length
    ? cajas.map((f) => `<div class="pr-familia" style="--n:${f.ps.length}"><h3 class="pr-fam-t"><i class="fa-solid ${f.i}"></i>${f.t}</h3>${f.ps.map((p) => trofeo(p, ed, k++)).join('')}</div>`).join('')
    : vacio('Los premios de la edición aparecen cuando cada jugador lleva al menos 3 partidos.');
}

// MURO DE GALERÍA (ronda 268, FX.premiosGaleria): cuadros de tamaños distintos como una pared de museo.
// El tamaño lo decide la importancia (peso): el primero va grande. La familia (Ataque, Defensa…) va en una etiqueta del cuadro.
function pintarMuro(ed, fecha, edic, vacio) {
  const voto = $('pr-voto') ?? Object.assign(document.createElement('div'), { id: 'pr-voto', className: 'pr-voto' });
  const fs = fecha.slice(0, 4); const ts = MURO_SEMANA[fs.length] ?? [];
  $('pr-fecha').className = 'pr-muro';
  $('pr-fecha').innerHTML = fs.length ? fs.map((p, i) => trofeo(p, ed, i, false, ts[i])).join('') : vacio('Los premios de la fecha aparecen cuando se juega una fecha.');
  voto.dataset.t = fs.length === 1 ? 'g' : fs.length === 4 ? 'f' : 'w';
  $('pr-fecha').append(voto);
  if (!votoListo) { votoListo = true; montarVotoSemana(voto, jugadores); }
  const te = tamanosMuro(edic.length);
  $('pr-edicion').className = 'pr-muro';
  $('pr-edicion').innerHTML = edic.length ? edic.map((p, i) => trofeo(p, ed, i, false, te[i])).join('') : vacio('Los premios de la edición aparecen cuando cada jugador lleva al menos 3 partidos.');
  if (FX.premiosGraficos) { dibujarGraficos($('pr-fecha'), ed); dibujarGraficos($('pr-edicion'), ed); }
}

document.querySelector('.pr-ligas')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-liga]'); if (!b) return;
  ligaActual = b.dataset.liga;
  document.querySelectorAll('.pr-ligas [data-liga]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  pintar();
});

pintar();   // primero con los resultados (no esperan a la base); las fotos llegan después
(async () => {
  try {
    const { data, error } = await supabase.from('jugadores').select('*');
    if (error) throw error;
    jugadores = data ?? []; votoListo = false; $('pr-voto')?.replaceWith(Object.assign(document.createElement('div'), { id: 'pr-voto', className: 'pr-voto' })); pintar();
  } catch (e) { console.warn('[premios] jugadores:', e?.message ?? e); }
})();
