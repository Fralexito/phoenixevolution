// Aviso para quien tiene una suspensión o baneo vigente: una franja clara arriba de la página (la BD ya le impide escribir; esto solo lo explica).
// Una sola consulta (`mi_sancion`) por página, con una caché corta en esta pestaña para no repetirla en cada navegación.
import { onSession } from '../../core/session.js';
import { describirMiSancion } from '../../core/moderacion.js';
import { miSancion } from './api.js';
import { avisoSancionHTML } from './vista.js';

const CLAVE = 'pes-mi-sancion'; const TTL_MS = 60_000;

function leerCache(uid) {
  try { const c = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null'); return c && c.uid === uid && Date.now() - c.en < TTL_MS ? { valor: c.valor } : null; } catch { return null; }
}
function guardarCache(uid, valor) { try { sessionStorage.setItem(CLAVE, JSON.stringify({ uid, en: Date.now(), valor })); } catch { /* sin almacenamiento: no pasa nada */ } }

export function initAvisoSancion() {
  let actual = null;
  onSession(async ({ session }) => {
    document.getElementById('aviso-sancion')?.remove();
    const uid = session?.user?.id ?? null; actual = uid;
    if (!uid) return;
    const cache = leerCache(uid);
    const s = cache ? cache.valor : await miSancion();
    if (!cache) guardarCache(uid, s);
    if (actual !== uid) return;   // la sesión cambió mientras se consultaba
    const d = describirMiSancion(s); if (!d) return;
    document.querySelector('main')?.insertAdjacentHTML('beforebegin', avisoSancionHTML(d));
  });
}
