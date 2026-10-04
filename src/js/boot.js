// Arranque común a TODAS las páginas (lo carga Layout.astro una sola vez).
import { initSession } from './core/session.js';
import { initSidebar } from './features/sidebar.js';
import { initNavbar } from './features/navbar.js';

initSidebar();
initNavbar();
initSession().catch((e) => console.error('[boot] sesión:', e));
