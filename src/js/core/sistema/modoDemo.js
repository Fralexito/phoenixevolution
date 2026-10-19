// MODO DEMOSTRACIÓN (19-oct-2026, Fralex: «por ahora en la página simula datos y actividad para ver cómo funcionaría cada sistema»).
// Interruptor POR NAVEGADOR (nada se guarda en la base de datos): Configuración → «Notificaciones y en vivo» → «Modo demostración»,
// o la dirección con ?demo=1 (y ?demo=0 para salir). Lo leen core/sistema/supabase.js (cambia las lecturas por datos simulados),
// boot.js (el aviso flotante «Datos simulados · Salir») y features/ajustes.js (recarga la página al cambiarlo).
import { CLAVE_AJUSTES } from './ajustes.js';

const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE_AJUSTES) || '{}') || {}; } catch { return {}; } };
const escribir = (activo) => {
  try { const a = leer(); a.demo = !!activo; localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a)); } catch { /* sin almacenamiento: solo dura esta página */ }
};

// En la FASE BETA (vista previa, PUBLIC_PREVIEW) viene ENCENDIDO la primera vez (19-oct-2026, Fralex: «que en la página misma se me muestre
// la simulación de todas las actividades»). Solo esa primera vez: si luego lo apagas («Salir» o el interruptor), queda apagado. La web oficial no cambia.
const BETA = !!import.meta.env?.PUBLIC_PREVIEW;
const MARCA_BETA = 'pes-demo-beta-v1';

let activo = false;
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(location.search).get('demo');
  if (q === '1' || q === '0') escribir(q === '1');
  else if (BETA) { try { if (localStorage.getItem(MARCA_BETA) !== '1') { localStorage.setItem(MARCA_BETA, '1'); escribir(true); } } catch { /* sin almacenamiento: queda como esté */ } }
  activo = q === '1' || (q !== '0' && leer().demo === true);
  window.__pxDemo = activo;
}

/** ¿Está encendido el modo demostración en este navegador? (se decide una vez al cargar la página) */
export const demoActivo = () => activo;
/** Apaga el modo demostración y recarga sin el ?demo de la dirección. */
export function salirDeDemo() {
  escribir(false);
  const u = new URL(location.href); u.searchParams.delete('demo'); location.replace(u.href);
}
