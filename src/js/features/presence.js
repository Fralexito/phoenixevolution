// Radar de jugadores en línea con Supabase Realtime PRESENCE.
// Aviso de diseño: Presence lo declara cada cliente, así que es información COSMÉTICA
// (quién aparece libre/ocupado). Nunca se usa para decidir permisos: eso lo hace la BD.
import { supabase } from '../core/supabase.js';

export const ESTADOS = {
  libre: { label: 'Libre', dot: 'bg-emerald-400' },
  esperando: { label: 'Esperando rival', dot: 'bg-amber-400' },
  ocupado: { label: 'Ocupado', dot: 'bg-red-500' },
};

const players = new Map();      // uid → { id, name, estado }
const subs = new Set();
let channel = null;
let me = null;
let estado = 'libre';

const emit = () => subs.forEach((f) => { try { f([...players.values()]); } catch (e) { console.error('[presence] listener:', e); } });

function rebuild() {
  players.clear();
  const state = channel?.presenceState() ?? {};
  for (const [uid, metas] of Object.entries(state)) {
    const m = metas[metas.length - 1];
    if (m) players.set(uid, { id: uid, name: String(m.name ?? 'Jugador').slice(0, 40), estado: ESTADOS[m.estado] ? m.estado : 'libre' });
  }
  emit();
}

const track = () => channel?.track({ name: me.name, estado }).catch((e) => console.error('[presence] track:', e));

export function startPresence(user) {
  if (channel) return;
  me = user;
  channel = supabase.channel('radar-duelos', { config: { presence: { key: user.id } } });
  channel.on('presence', { event: 'sync' }, rebuild);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') track();
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('[presence] canal:', status);
  });
}

export function stopPresence() {
  if (!channel) return;
  supabase.removeChannel(channel);
  channel = null; players.clear(); emit();
}

export function setEstado(next) {
  if (!ESTADOS[next] || next === estado) return;
  estado = next;
  if (channel) track();
}

export const isPresent = (uid) => players.has(uid);
export const onPresence = (fn) => { subs.add(fn); fn([...players.values()]); return () => subs.delete(fn); };
