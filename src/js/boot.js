// Arranque común a TODAS las páginas (lo carga Layout.astro una sola vez).
import { initSession } from './core/session.js';
import { initSidebar } from './features/sidebar.js';
import { initNavbar } from './features/navbar.js';
import { initTicker } from './features/ticker.js';
import { initLiveFeed } from './features/liveFeed.js';
import { initLiveDock } from './features/liveDock.js';
import { initWelcome } from './features/welcome.js';
import { initEdad } from './features/edad.js';
import { initAjustes } from './features/ajustes.js';
import { initAvatarFallback } from './core/avatar.js';
import { initBuscadorGlobal } from './features/buscadorGlobal.js';
import { initReveal } from './features/reveal.js';
import { initAvisoSancion } from './features/moderacion/aviso.js';
import { FX } from '../data/experimento.js';

initAjustes();
initSidebar();
initNavbar();
initTicker();
initAvatarFallback();
initEdad();
initWelcome();
initLiveFeed();
initLiveDock();
initAvisoSancion();
initBuscadorGlobal();
initReveal();
// Barra lateral izquierda (experimento): solo en pantallas anchas; se descarga solo cuando hace falta.
if (FX.barraLateral && document.getElementById('barra-lat')) {
  const ancha = window.matchMedia('(min-width: 1280px)'); let lista = false;
  const montar = () => { if (lista || !ancha.matches) return; lista = true; import('./features/barraLateral.js').then((m) => m.initBarraLateral()).catch((e) => console.error('[boot] barra lateral:', e)); };
  montar(); ancha.addEventListener('change', montar);
}
initSession().catch((e) => console.error('[boot] sesión:', e));
