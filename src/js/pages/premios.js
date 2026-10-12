// Página Premios (ronda 265). Calcula los premios con core/premios.js sobre la edición en curso de cada liga y los pinta como trofeos.
// Las fotos (si las hay) salen de las cartas de `jugadores`; si no, iniciales con el color del premio.
import { supabase } from '../core/supabase.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { href } from '../core/config.js';
import { premiosEdicion } from '../core/premios.js';
import { nombreEnEdicion } from '../core/perfil.js';
import { escudoHTML } from '../core/escudos.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { montarVotoSemana } from '../features/reconocimientos.js';

const $ = (id) => document.getElementById(id);
const edicionDe = (lid) => { const eds = EDICIONES[lid] ?? []; return eds.find((e) => e.estado === 'en_curso') ?? eds.at(-1) ?? null; };
let jugadores = [];
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
  const av = foto ? `<img src="${escapeHTML(foto)}" alt="" loading="lazy" class="pr-av">` : `<span class="pr-av pr-av-ini">${escapeHTML(ini(pr.nombre))}</span>`;
  const nom = j ? `<a href="${href(`jugador/?id=${encodeURIComponent(j.id)}`)}">${escapeHTML(pr.nombre)}</a>` : escapeHTML(pr.nombre);
  return `<div class="pr-quien">${av}<span class="min-w-0"><b>${nom}</b>${club ? `<small>${escudoHTML(club, 14)} ${escapeHTML(club)}</small>` : ''}</span></div>`;
}

const trofeo = (pr, ed, i, destacado = false) => `<article class="pr-trofeo${destacado ? ' pr-destacado' : ''}" style="--c:${pr.color};--i:${i}">
    <header class="pr-t-cab"><span class="pr-ico"><i class="fa-solid ${pr.icono}"></i></span><h3>${escapeHTML(pr.titulo)}</h3></header>
    ${quien(pr, ed)}
    <p class="pr-valor"><b>${escapeHTML(pr.valor)}</b><span>${escapeHTML(pr.unidad)}</span></p>
    <p class="pr-det">${escapeHTML(pr.detalle)}</p>
  </article>`;

function pintar() {
  const ed = edicionDe(ligaActual);
  const ovrDe = (nombre) => { const j = jugadores.find((p) => nombreEnEdicion(p, ed) === nombre); return j ? Number(j.ovr) : NaN; };
  const r = premiosEdicion(ed, { ovrDe });
  const fecha = r.premios.filter((p) => p.grupo === 'fecha'); const edic = r.premios.filter((p) => p.grupo === 'edicion');
  $('pr-fecha-n').textContent = r.fecha ? `Fecha ${r.fecha}` : '';
  $('pr-ed-n').textContent = ed?.nombre ?? '';
  const vacio = (t) => `<p class="pr-vacio"><i class="fa-solid fa-hourglass-half"></i>${t}</p>`;
  $('pr-fecha').innerHTML = fecha.length ? fecha.map((p, i) => trofeo(p, ed, i, i === 0)).join('') : vacio('Los premios de la fecha aparecen cuando se juega una fecha.');
  $('pr-edicion').innerHTML = edic.length ? edic.map((p, i) => trofeo(p, ed, i)).join('') : vacio('Los premios de la edición aparecen cuando cada jugador lleva al menos 3 partidos.');
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
    jugadores = data ?? []; pintar();
    montarVotoSemana($('pr-voto'), jugadores);
  } catch (e) { console.warn('[premios] jugadores:', e?.message ?? e); montarVotoSemana($('pr-voto'), []); }
})();
