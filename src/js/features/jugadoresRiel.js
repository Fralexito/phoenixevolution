// Jugadores con PANEL LATERAL (FX.jugadoresRiel, ronda 362), el patrón de la Sala de fichajes llevado a la lista de jugadores.
// En PC: columna fija a la izquierda con «Posición» (color de cada línea, como en la Sala y Mi club) y «Equipo», cada uno con su número.
// En celular: solo las posiciones, como fichas que se deslizan de lado encima de las cartas (el equipo sigue en el desplegable de la barra).
// No filtra por su cuenta: avisa a pages/database.js (alGrupo / alClub) y este le devuelve las cuentas con pintar().
// Para volver a como era: FX.jugadoresRiel = false.
import { FX } from '../../data/experimento.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { contarPorGrupo, contarPorClub } from '../core/jugadores/riel.js';

export function montarRiel({ alGrupo, alClub } = {}) {
  if (!FX.jugadoresRiel) return null;
  try {
    const box = document.getElementById('players-container'); if (!box) return null;
    document.documentElement.setAttribute('data-fx-jriel', '');
    const cuerpo = document.createElement('div'); cuerpo.className = 'jr-cuerpo';
    const riel = document.createElement('aside'); riel.className = 'jr-riel'; riel.setAttribute('aria-label', 'Filtrar jugadores');
    riel.innerHTML = `<section class="jr-bloque"><h2 class="jr-h">Posición</h2><div class="jr-pos" role="group" aria-label="Filtrar por posición"></div></section>
      <section class="jr-bloque jr-equipos"><h2 class="jr-h">Equipo</h2><div class="jr-lista" role="group" aria-label="Filtrar por equipo"></div></section>`;
    const main = document.createElement('div'); main.className = 'jr-main';
    const carr = document.getElementById('carrusel-zona');
    (carr ?? box).before(cuerpo); cuerpo.append(riel, main); if (carr) main.append(carr); main.append(box);

    riel.addEventListener('click', (e) => {
      const g = e.target.closest('[data-grupo]'); if (g) { alGrupo?.(g.dataset.grupo); return; }
      const c = e.target.closest('[data-club]'); if (c) alClub?.(c.dataset.club);
    });

    const boton = (attr, valor, activo, texto, n, color) => `<button type="button" ${attr}="${escapeHTML(valor)}" aria-pressed="${activo}"${color ? ` style="--c:${color}"` : ''}>`
      + `${color ? '<i class="jr-punto" aria-hidden="true"></i>' : ''}<span>${escapeHTML(texto)}</span><em>${n}</em></button>`;
    return {
      /** base = lista con todos los filtros menos la posición; sinClub = lista con todos menos el equipo. */
      pintar({ base, sinClub, grupo = '', club = 'ALL' }) {
        const g = contarPorGrupo(base);
        riel.querySelector('.jr-pos').innerHTML = boton('data-grupo', '', !grupo, 'Todas', g.total)
          + g.grupos.map((x) => boton('data-grupo', x.grupo, grupo === x.grupo, x.nombre, x.n, x.color)).join('');
        const clubes = contarPorClub(sinClub);
        const total = clubes.reduce((s, x) => s + x.n, 0);
        riel.querySelector('.jr-lista').innerHTML = boton('data-club', 'ALL', club === 'ALL', 'Todos', total)
          + clubes.map((x) => boton('data-club', x.club, club === x.club, x.club, x.n)).join('');
      },
    };
  } catch (e) { console.warn('[jugadoresRiel] desactivado:', e); return null; }
}
