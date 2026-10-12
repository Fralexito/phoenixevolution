// Jugadores con UNA barra de herramientas (FX.jugadoresBarra, ronda 263). Pedido de Fralex: antes de ver la primera carta había que
// pasar por 5 bloques de controles. Aquí NO se quita nada ni cambia la lógica (pages/database.js): solo se mueven los mismos
// controles (con sus mismos ids) a dos filas compactas:
//   cabecera: título · buscador · Comparar · (Añadir, staff)
//   barra:    vista (Todos/Estilo/Nivel/Carrusel) · Ordenar · Equipo · Filtros (Liga/Torneo/Temporada) · Avanzada · … · Leyenda · Tamaño
// Para volver a como era: FX.jugadoresBarra = false.
import { FX } from '../../data/experimento.js';

export function montarJugadoresBarra() {
  if (!FX.jugadoresBarra) return;
  try {
    const $ = (id) => document.getElementById(id);
    const vistaBar = $('vista-bar'); const seg = $('vista-seg'); if (!vistaBar || !seg) return;
    const cab = vistaBar.parentElement.firstElementChild;           // la cabecera (título + controles de la derecha)
    cab.classList.add('jb-cab');
    const barra = document.createElement('div');
    barra.className = 'jb-barra'; barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Herramientas de la lista de jugadores');
    const izq = document.createElement('div'); izq.className = 'jb-izq';
    const der = document.createElement('div'); der.className = 'jb-der';
    barra.append(izq, der);
    cab.after(barra);

    // Izquierda: cómo ver y cómo filtrar
    izq.append(seg);
    if ($('orden-wrap')) izq.append($('orden-wrap'));
    const equipo = $('player-filter-select'); if (equipo) { equipo.classList.add('jb-equipo'); izq.append(equipo); }
    const hist = $('hist-filtros');
    if (hist) {
      hist.classList.add('jb-filtros');
      const etiqueta = hist.querySelector('summary > span'); if (etiqueta) etiqueta.innerHTML = '<i class="fa-solid fa-filter text-galaxy-400 mr-1.5"></i>Filtros';
      // lo que hay debajo del botón (selectores + nota) se agrupa en un panel que se abre bajo la barra
      const panel = document.createElement('div'); panel.className = 'jb-panel';
      [...hist.children].filter((c) => c.tagName !== 'SUMMARY').forEach((c) => panel.append(c));
      hist.append(panel);
      izq.append(hist);
    }
    if ($('btn-avanzada')) izq.append($('btn-avanzada'));
    // Derecha: leyenda y tamaño
    if ($('btn-leyenda')) der.append($('btn-leyenda'));
    const dens = document.querySelector('.dens-grupo'); if (dens) der.append(dens);

    // Ronda 264 (FX.jugadoresPro): cabecera en una línea con el número de jugadores que se ven ahora
    if (FX.jugadoresPro) {
      document.documentElement.setAttribute('data-fx-jpro', '');
      const h1 = cab.querySelector('h1');
      if (h1 && !h1.querySelector('.jb-cuenta')) {
        h1.insertAdjacentHTML('beforeend', '<span class="jb-cuenta" aria-live="polite"></span>');
        const cuenta = h1.querySelector('.jb-cuenta');
        const contar = () => {
          const enCarrusel = $('carrusel-zona') && !$('carrusel-zona').hidden;
          const n = enCarrusel ? document.querySelectorAll('#players-carrusel .carta-slot').length : document.querySelectorAll('#players-container .pcw').length;
          cuenta.textContent = n ? `${n} jugador${n === 1 ? '' : 'es'}` : '';
        };
        ['players-container', 'players-carrusel'].forEach((id) => { const el = $(id); if (el) new MutationObserver(contar).observe(el, { childList: true }); });
        contar();
      }
    }
    // El panel de «Avanzada» va justo debajo de la barra; la fila vieja de vistas ya está vacía
    const adv = $('adv-panel'); if (adv) barra.after(adv);
    vistaBar.remove();
    // Cerrar «Filtros» al tocar fuera
    document.addEventListener('click', (e) => { if (hist?.open && !hist.contains(e.target)) hist.open = false; });
  } catch (e) { console.warn('[jugadoresBarra] desactivado:', e); }
}
