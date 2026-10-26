// «Temporadas» en /ranking/: premios de la temporada en curso + historial de campeones (migración 154).
// Blindaje: sin la función → la sección se oculta; nombres de perfiles privados salen como «Perfil privado»; nunca rompe la página.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { cartaJuegoHTML, pruebaJuego } from '../../core/sistema/cartaJuego.js';
import { PREMIOS, MIN_DUELOS, MIN_PARTICIPANTES, nombreMes, diasParaCierre, ICONO } from '../../core/competicion/temporadas.js';

export function montarTemporadas(seccion) {
  if (!seccion) return { cargar: () => {} };
  async function cargar() {
    try {
      const { data, error } = await supabase.rpc('temporadas_historial', { p_limite: 6 });
      if (error) { if (error.code === 'PGRST202') { seccion.hidden = true; return; } throw error; }
      const lista = Array.isArray(data) ? data : [];
      const d = diasParaCierre();
      const nombre = (u) => (u ? `<a class="hover:underline" href="${esc(href(u.username ? `perfil/?u=${encodeURIComponent(u.username)}` : 'perfil/'))}">${esc(u.nombre ?? 'Jugador')}</a>` : '<span class="text-gray-500">Perfil privado</span>');
      const historial = lista.map((t) => `<li class="rounded-xl border border-galaxy-border p-3"><p class="text-[12px] text-gray-400 uppercase font-display">${esc(nombreMes(t.mes))} · ${Number(t.participantes) || 0} jugadores</p>
          ${t.con_premios ? `<p class="text-sm text-white mt-1">${(t.podio ?? []).filter((p) => p.puesto <= 3).map((p) => `${ICONO[p.puesto] ?? ''} ${nombre(p.usuario)} <span class="text-[12px] text-gray-400">${Number(p.puntos)} pts</span>`).join(' · ')}</p>`
            : `<p class="text-[12px] text-gray-500 mt-1">Sin premios: hubo menos de ${MIN_PARTICIPANTES} jugadores con ${MIN_DUELOS}+ duelos.</p>`}</li>`).join('');
      // PRUEBA «carta de juego» (ronda 391): el campeón de la última temporada con premios, como carta grande
      const ult = pruebaJuego() ? lista.find((t) => t.con_premios && (t.podio ?? []).some((p) => p.puesto === 1 && p.usuario)) : null;
      const camp = ult ? ult.podio.find((p) => p.puesto === 1) : null;
      const carta = camp ? `<div class="pj-carta-caja">${cartaJuegoHTML({ etiqueta: `Campeón de ${nombreMes(ult.mes)}`, nombre: camp.usuario.nombre ?? 'Jugador', sub: `${Number(ult.participantes) || 0} jugadores en la temporada`,
          cifra: Number(camp.puntos), cifraEt: 'Pts', puesto: '🏆', stats: [['Premio', `${Number(camp.ascuas) || PREMIOS[0]} ascuas`]], href: href(camp.usuario.username ? `perfil/?u=${encodeURIComponent(camp.usuario.username)}` : 'perfil/') })}</div>` : '';
      seccion.hidden = false;
      seccion.innerHTML = `${carta}<div class="flex flex-wrap items-center gap-2"><h2 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-trophy text-amber-300 mr-1"></i>Premios de la temporada</h2>
          <span class="text-[12px] text-amber-300 ml-auto">Cierra en ${d} día${d === 1 ? '' : 's'}</span></div>
        <p class="text-[12px] text-gray-300">Al terminar el mes (hora de Lima) el ranking <b>competitivo</b> se cierra solo: 🥇 ${PREMIOS[0]} · 🥈 ${PREMIOS[1]} · 🥉 ${PREMIOS[2]} · 4.º a 10.º ${PREMIOS[3]} ascuas gratis, más la insignia en tu perfil. Cuentan quienes jueguen al menos ${MIN_DUELOS} duelos confirmados; hacen falta ${MIN_PARTICIPANTES} jugadores así.</p>
        ${historial ? `<h3 class="text-[12px] font-display font-bold uppercase text-gray-300 pt-1">Campeones anteriores</h3><ul class="grid sm:grid-cols-2 gap-2">${historial}</ul>` : ''}`;
    } catch (e) { console.warn('[temporadas]', e); seccion.hidden = true; }
  }
  return { cargar };
}

/** Insignias de temporada de una persona (perfil). Nunca lanza → [] si no hay o falla. */
export async function insigniasDe(usuarioId) {
  try { const { data, error } = await supabase.rpc('insignias_temporada_de', { p_usuario: usuarioId }); if (error) return []; return Array.isArray(data) ? data : []; }
  catch { return []; }
}
