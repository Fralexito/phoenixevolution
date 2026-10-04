// ÚNICA fuente de verdad de "quién está conectado".
// Guarda sesión + perfil (tabla `perfiles`) y avisa a quien se suscriba.
import { supabase } from './supabase.js';

const state = { session: null, profile: null, ready: false };
const listeners = new Set();
let started = null;

const emit = () => listeners.forEach((fn) => { try { fn({ ...state }); } catch (e) { console.error('[session] listener:', e); } });

async function loadProfile(userId) {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle();
  if (error) console.error('[session] no se pudo leer el perfil:', error.message);
  return data ?? null;
}

async function apply(session) {
  state.session = session;
  state.profile = session ? await loadProfile(session.user.id) : null;
  state.ready = true;
  emit();
}

/** Arranca una sola vez (idempotente). */
export function initSession() {
  if (started) return started;
  started = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('[session] getSession:', error.message);
    await apply(data?.session ?? null);
    supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED / INITIAL_SESSION no cambian la identidad: se ignoran para no repintar de más.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // setTimeout evita bloqueos de la librería al llamar a Supabase dentro del callback.
        setTimeout(() => apply(session), 0);
      }
    });
  })();
  return started;
}

export const getState = () => ({ ...state });
export const isAdmin = () => state.profile?.rol === 'admin';

/** Suscribe un listener; se ejecuta ya mismo si el estado está listo. Devuelve función para desuscribir. */
export function onSession(fn) {
  listeners.add(fn);
  if (state.ready) fn({ ...state });
  return () => listeners.delete(fn);
}

export async function refreshProfile() {
  if (state.session) { state.profile = await loadProfile(state.session.user.id); emit(); }
}
