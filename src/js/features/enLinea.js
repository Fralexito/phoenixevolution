// «¿Quién está en la web ahora mismo?» — presencia de TODO el sitio con Supabase Realtime Presence (canal «sitio-en-linea»).
// Distinto del radar de Duelos (features/presence.js), que solo cuenta a quien está en la Sala de Duelos.
// Privacidad: si el jugador apagó «Mostrar mi conexión» (Amigos → Privacidad), NO se anuncia: solo mira. Es información
// COSMÉTICA (cada navegador declara su propia presencia): nunca se usa para permisos.
// Coste: 1 conexión Realtime por pestaña abierta (plan FREE: 200 simultáneas). Si se acerca al límite, apagar FX.contactos.
import { supabase } from '../core/supabase.js';

let canal = null; let yo = null; let anunciado = false;
const enLinea = new Set();
const subs = new Set();

const emitir = () => subs.forEach((f) => { try { f(new Set(enLinea)); } catch (e) { console.error('[en-linea] listener:', e); } });

function reconstruir() {
  enLinea.clear();
  for (const uid of Object.keys(canal?.presenceState() ?? {})) if (uid !== yo) enLinea.add(uid);
  emitir();
}

/** Arranca (idempotente). `anunciarme` = respeta la privacidad del jugador; false = solo ver quién está. */
export function iniciarEnLinea(usuarioId, { anunciarme = true } = {}) {
  if (canal && yo === usuarioId) {
    if (anunciarme && !anunciado) { anunciado = true; canal.track({ t: Date.now() }).catch((e) => console.warn('[en-linea] track:', e)); }
    if (!anunciarme && anunciado) { anunciado = false; canal.untrack().catch(() => {}); }
    return;
  }
  detenerEnLinea();
  yo = usuarioId;
  try {
    canal = supabase.channel('sitio-en-linea', { config: { presence: { key: usuarioId } } });
    canal.on('presence', { event: 'sync' }, reconstruir);
    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED' && anunciarme) { anunciado = true; canal.track({ t: Date.now() }).catch((e) => console.warn('[en-linea] track:', e)); }
      else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') console.warn('[en-linea] canal:', estado);
    });
  } catch (e) { console.error('[en-linea] no se pudo abrir el canal:', e); canal = null; }
}

export function detenerEnLinea() {
  if (canal) { try { supabase.removeChannel(canal); } catch { /* ya cerrado */ } }
  canal = null; yo = null; anunciado = false; enLinea.clear(); emitir();
}

/** Escucha cambios (recibe un Set de ids conectados, sin incluirme). Devuelve función para dejar de escuchar. */
export const alCambiarEnLinea = (fn) => { subs.add(fn); fn(new Set(enLinea)); return () => subs.delete(fn); };
export const estaEnLinea = (id) => enLinea.has(id);
