// Arranque común a TODAS las páginas (lo carga Layout.astro una sola vez).
import { initSession } from './core/sistema/session.js';
import { initSidebar } from './features/sidebar.js';
import { initNavbar } from './features/navbar.js';
import { initWelcome } from './features/welcome.js';
import { initEdad } from './features/edad.js';
import { initAjustes } from './features/ajustes.js';
import { initModoLigero } from './features/modoLigero.js';
import { initAvatarFallback } from './core/sistema/avatar.js';
import { initReveal } from './features/reveal.js';
import { initCarruseles } from './features/carruseles.js';
import { initSinIconosWeb } from './features/sinIconosWeb.js';
import { initPwa } from './features/pwa.js';
import { initScrollSuave } from './features/scrollSuave.js';
import { initMarco } from './features/marco.js';
import { initSitio } from './features/sitioAplicar.js';
import { initAvisoSancion } from './features/moderacion/aviso.js';
import { FX } from '../data/experimento.js';
import { interruptorDemo } from './core/sistema/modoDemo.js';

initAjustes();
initModoLigero();
// Selector Phoenix (27-oct-2026): ninguna lista desplegable usa la ventana nativa del sistema. Se carga enseguida (alguien puede tocar
// un selector al instante). Si fallara, queda la lista nativa.
if (FX.funcionesNuevas) import('./features/selectorPhoenix.js').then((m) => m.initSelectorPhoenix()).catch((e) => console.error('[boot] selector:', e));
// Calendario Phoenix (27-oct-2026): lo mismo para las casillas de fecha y hora (sin el calendario del sistema).
// Apple design (FX.fluido, 28-oct-2026): las hojas del celular (listas y calendario) se cierran bajándolas con el dedo.
if (FX.fluido) import('./features/fluido/hojas.js').then((m) => m.initHojasArrastrables()).catch((e) => console.error('[boot] hojas:', e));
if (FX.funcionesNuevas) import('./features/calendarioPhoenix.js').then((m) => m.initCalendarioPhoenix()).catch((e) => console.error('[boot] calendario:', e));
initSitio();
initSidebar();
initNavbar();
initAvatarFallback();
initEdad();
initWelcome();
initAvisoSancion();
initReveal();
initCarruseles();
// Modo demostración (core/sistema/modoDemo.js): el interruptor Demo/Real (en la beta siempre; en la web oficial solo con la demo encendida).
if (interruptorDemo()) import('./features/demo/aviso.js').then((m) => m.initAvisoDemo()).catch((e) => console.error('[boot] demo:', e));
// Lo que no se necesita para ver la página arranca cuando ya se mostró (antes se hacía en plena carga y frenaba la primera vista,
// sobre todo en celulares). Medido el 18-oct-2026 con Lighthouse y perfiles de CPU: ver docs/bitacoras/HISTORIA-WEB.md («REVISION-GENERAL-18-OCT») §7.
const despues = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 800));
// Y su CÓDIGO también se descarga después (import() = archivo aparte): así no se descarga ni se ejecuta junto con lo visible
// (el buscador, por ejemplo, trae fuse.js, 26 KB). Medido el 19-oct-2026.
const luego = (nombre, cargar) => despues(() => cargar().catch((e) => console.error("[boot] " + nombre + ":", e)));
// Tutorial de bienvenida: solo la primera vez en la portada (o con ?tutorial=1). Su código se descarga aparte y después.
if (document.querySelector('[data-vt-grid]') || location.search.includes('tutorial=1')) luego('tutorial', () => import('./features/tutorial.js').then((m) => m.initTutorial()));
luego('ticker', () => import('./features/ticker.js').then((m) => m.initTicker()));
luego('en vivo', () => Promise.all([import('./features/liveFeed.js'), import('./features/liveDock.js')]).then(([a, b]) => { a.initLiveFeed(); b.initLiveDock(); }));
luego('buscador', () => import('./features/buscadorGlobal.js').then((m) => m.initBuscadorGlobal()));
luego('efectos', () => Promise.all([import('./features/dopamina.js'), import('./features/prof3d.js'), import('./features/cartasEfecto.js'), import('./features/efectosCarta.js'), import('./features/premium.js')])
  .then(([d, p3, ce, ec, pr]) => { for (const [n, f] of [['dopamina', d.initDopamina], ['3d', p3.initProf3d], ['cartas', ce.initCartasEfecto], ['efectos carta', ec.initEfectosCarta], ['premium', pr.initPremium]]) { try { f(); } catch (e) { console.error("[boot] " + n + ":", e); } } }));
if (FX.sinIconosWeb) initSinIconosWeb();
// Temas (ronda 387): probador y luz del puntero; archivo aparte y después de lo visible
if (FX.pruebaJuego && document.documentElement.hasAttribute('data-prueba-juego')) luego('prueba juego', () => import('./features/pruebaJuego.js').then((m) => m.initPruebaJuego()));
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
despues(() => {
  if (FX.contactos) import('./features/chatFlotante/index.js').then((m) => m.initChatFlotante()).catch((e) => console.error('[boot] chat flotante:', e));
  import('./features/tirasDeslizables.js').then((m) => m.initTirasDeslizables()).catch((e) => console.error('[boot] tiras:', e));
  import('./features/pausaFueraDePantalla.js').then((m) => m.initPausaFueraDePantalla()).catch((e) => console.error('[boot] pausa fuera:', e));
  if (FX.proximoPartido) import('./features/proximoPartido.js').then((m) => m.initProximoPartido()).catch((e) => console.error('[boot] próximo partido:', e));
});
if (FX.pilares) import('./features/pilares.js').then((m) => m.montarPilares()).catch((e) => console.error('[boot] pilares:', e));
initSession().catch((e) => console.error('[boot] sesión:', e));
