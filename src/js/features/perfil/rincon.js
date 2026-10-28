// «TU RINCÓN» (rediseño 27-oct-2026, idea de Fralex: «cada uno tiene su rincón»). Solo en TU perfil, debajo de tu cabecera:
// tu próximo partido de la Galaxy, tu puesto y accesos a lo tuyo (mis partidos, mi club, logros, ajustes).
// La portada queda neutral para todos; lo personal vive aquí. Lógica pura: core/portada/rincon.js. Estilos: styles/perfilRincon.css
import '../../../styles/perfilRincon.css';
import { EDICIONES } from '../../../data/ligaResultados.js';
import { datosRincon } from '../../core/portada/rincon.js';
import { escudoDe } from '../../core/sistema/escudos.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';

const DISCORD = 'https://discord.gg/jsxZ3mtfwe';
const escudo = (club, px) => { const u = escudoDe(club); return u ? `<img src="${esc(u)}" alt="" width="${px}" height="${px}" loading="lazy">` : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'; };

/** HTML del rincón para el perfil `p` (solo si es el tuyo). '' si no corresponde o algo falla. */
export function rinconHTML(p) {
  try {
    if (!p?.soy_yo) return '';
    const ed = EDICIONES.galaxy?.find((e) => e.estado === 'en_curso') ?? null;
    const r = datosRincon([p.username, p.nombre_display, p.ficha_nombre, p.nombre].filter(Boolean), ed);
    let liga;
    if (!r.enLiga) {
      liga = `<div class="rc-liga rc-fuera"><span class="rc-ico"><i class="fa-solid fa-trophy"></i></span><div><b>Aún no juegas la Galaxy League</b><small>Pide tu lugar y entra a la próxima fecha.</small></div><a class="rc-btn rc-btn-prim" href="${esc(href('unirme/'))}">Unirme a la liga</a></div>`;
    } else {
      const px = r.proximo;
      const partido = px
        ? `<div class="rc-duelo"><span class="rc-eq">${escudo(r.club, 40)}<b>${esc(r.nombre)}</b></span><span class="rc-vs">VS</span><span class="rc-eq rc-eq-der"><b>${esc(px.rival)}</b>${escudo(px.clubRival, 40)}</span></div>
           <small class="rc-meta">Fecha ${Number(px.fecha)} · ${px.local ? 'juegas de local' : 'juegas de visita'}</small>`
        : '<div class="rc-duelo rc-sin"><b>No tienes partidos pendientes</b></div><small class="rc-meta">Cuando salga la próxima fecha, tu partido aparece aquí.</small>';
      const pu = r.puesto ? `<div class="rc-puesto"><span class="rc-num">${r.puesto.puesto}<small>.º</small></span><span><b>de ${r.puesto.de}</b><small>${Number(r.puesto.fila.pts) || 0} pts · ${Number(r.puesto.fila.pj) || 0} PJ</small></span></div>` : '';
      liga = `<div class="rc-liga"><div class="rc-prox"><p class="rc-kicker">Tu próximo partido</p>${partido}
        <div class="rc-acc">${px ? `<a class="rc-btn rc-btn-prim" href="${DISCORD}" target="_blank" rel="noopener"><i class="fa-brands fa-discord"></i> Pactar la hora</a>` : ''}<a class="rc-btn" href="${esc(href('liga/'))}">Ver la tabla</a></div></div>${pu}</div>`;
    }
    const atajos = [['mis-partidos/', 'fa-calendar-check', 'Mis partidos'], ['manager/', 'fa-futbol', 'Mi club'], ['logros/', 'fa-medal', 'Mis logros'], ['ajustes/', 'fa-gear', 'Ajustes']]
      .map(([u, i, t]) => `<a class="rc-atajo" href="${esc(href(u))}"><i class="fa-solid ${i}" aria-hidden="true"></i><span>${t}</span></a>`).join('');
    return `<section class="rc" aria-label="Tu rincón"><p class="rc-tit"><i class="fa-solid fa-house-chimney-user" aria-hidden="true"></i> Tu rincón</p>${liga}<nav class="rc-atajos" aria-label="Lo tuyo">${atajos}</nav></section>`;
  } catch (e) { console.warn('[perfil] rincón:', e?.message ?? e); return ''; }
}
