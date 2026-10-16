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
import { initModoLigero } from './features/modoLigero.js';
import { initAvatarFallback } from './core/avatar.js';
import { initBuscadorGlobal } from './features/buscadorGlobal.js';
import { initReveal } from './features/reveal.js';
import { initDopamina } from './features/dopamina.js';
import { initProf3d } from './features/prof3d.js';
import { initCarruseles } from './features/carruseles.js';
import { initCartasEfecto } from './features/cartasEfecto.js';
import { initEfectosCarta } from './features/efectosCarta.js';
import { initPremium } from './features/premium.js';
import { initSinIconosWeb } from './features/sinIconosWeb.js';
import { initPwa } from './features/pwa.js';
import { initScrollSuave } from './features/scrollSuave.js';
import { initMarco } from './features/marco.js';
import { initSitio } from './features/sitioAplicar.js';
import { initAvisoSancion } from './features/moderacion/aviso.js';
import { FX } from '../data/experimento.js';

initAjustes();
initModoLigero();
initSitio();
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
initDopamina();
initProf3d();
initCarruseles();
initCartasEfecto();
initEfectosCarta();
initPremium();
if (FX.sinIconosWeb) initSinIconosWeb();
if (FX.pwa) initPwa();
if (FX.scrollSuave) initScrollSuave();
initMarco();
// Barra lateral izquierda (experimento): solo en pantallas anchas; se descarga solo cuando hace falta.
if (FX.barraLateral && document.getElementById('barra-lat')) {
  const ancha = window.matchMedia('(min-width: 1280px)'); let lista = false;
  const montar = () => { if (lista || !ancha.matches) return; lista = true; import('./features/barraLateral.js').then((m) => m.initBarraLateral()).catch((e) => console.error('[boot] barra lateral:', e)); };
  montar(); ancha.addEventListener('change', montar);
}
// Chat flotante (experimento): contactos + ventanitas. Se descarga aparte para no frenar la primera carga.
if (FX.contactos) import('./features/chatFlotante/index.js').then((m) => m.initChatFlotante()).catch((e) => console.error('[boot] chat flotante:', e));
import('./features/tirasDeslizables.js').then((m) => m.initTirasDeslizables()).catch((e) => console.error('[boot] tiras:', e));
import('./features/pausaFueraDePantalla.js').then((m) => m.initPausaFueraDePantalla()).catch((e) => console.error('[boot] pausa fuera:', e));
if (FX.pilares) import('./features/pilares.js').then((m) => m.montarPilares()).catch((e) => console.error('[boot] pilares:', e));
if (FX.proximoPartido) import('./features/proximoPartido.js').then((m) => m.initProximoPartido()).catch((e) => console.error('[boot] próximo partido:', e));
initSession().catch((e) => console.error('[boot] sesión:', e));
