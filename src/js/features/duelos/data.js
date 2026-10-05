// Estado y lectura de datos de Duelos (única fuente; los demás módulos solo leen de aquí).
import { supabase } from '../../core/supabase.js';
import { getState } from '../../core/session.js';
import { isStale } from '../../core/schedule.js';

export const data = {
  retos: [],                 // retos visibles para mí (RLS decide cuáles)
  perfiles: new Map(),       // id → { id, username, avatar_url, nombre_display, club_favorito, puede_hostear }
  conexion: new Map(),       // reto_id → { link, detalle } (solo si soy participante confirmado)
  parts: new Map(),          // reto_id → filas de reto_participantes (sin las que salieron)
  online: new Set(),         // ids presentes en el radar
  historial: [],             // MIS partidos ya terminados (FINALIZADO), más reciente primero
};

export const me = () => getState().session?.user.id ?? null;
export const myProfile = () => getState().profile;
export const nm = (id) => data.perfiles.get(id)?.nombre_display || 'Jugador';
export const partsOf = (retoId) => data.parts.get(retoId) ?? [];
export const myPart = (r, id) => partsOf(r.id).find((p) => p.usuario_id === id) ?? null;
export const isLeader = (r, id) => !!id && (r.retador_id === id || r.rival_id === id);
export const isMine = (r, id) => !!id && (isLeader(r, id) || r.destinatario_id === id || !!myPart(r, id));
export const isActive = (r) => ['BUSCANDO', 'ACEPTADO', 'EN_JUEGO'].includes(r.estado);

const RETO_COLS = 'id, retador_id, rival_id, destinatario_id, host_id, directo_publico, requiere_host, plataforma, estado, modalidad, fecha_programada, created_at, confirmo_retador_at, confirmo_rival_at, tam_a, tam_b, acuerdo_retador_at, acuerdo_rival_at';

export async function loadPerfiles() {
  const { data: rows, error } = await supabase.from('perfiles').select('id, username, avatar_url, nombre_display, club_favorito, puede_hostear').limit(500)   // username y avatar_url son columnas públicas (grant); sin ellas Amigos/Mensajes no podían enlazar al perfil ni mostrar fotos;
  if (error) { console.error('[duelos] perfiles:', error.message); return; }
  data.perfiles = new Map((rows ?? []).map((p) => [p.id, p]));
}

const HIST_COLS = `${RETO_COLS}, cerrado_at`;
/** Mis partidos terminados: donde soy líder/destinatario o participante. Máx. 50. */
async function cargarHistorial() {
  const id = me(); if (!id) return [];
  try {
    const mios = await supabase.from('reto_participantes').select('reto_id').eq('usuario_id', id).neq('estado', 'SALIO').limit(200);
    if (mios.error) throw mios.error;
    const ids = (mios.data ?? []).map((x) => x.reto_id);
    const filtro = [`retador_id.eq.${id}`, `rival_id.eq.${id}`, `destinatario_id.eq.${id}`, ...(ids.length ? [`id.in.(${ids.join(',')})`] : [])].join(',');
    const { data: rows, error } = await supabase.from('retos_matchmaking').select(HIST_COLS).eq('estado', 'FINALIZADO').or(filtro).order('cerrado_at', { ascending: false, nullsFirst: false }).limit(50);
    if (error) throw error;
    return rows ?? [];
  } catch (e) { console.error('[duelos] historial:', e?.message ?? e); return []; }
}

/** Lee retos + participantes + enlaces. Lanza si falla la lectura principal. */
export async function loadRetos() {
  const { data: rows, error } = await supabase.from('retos_matchmaking').select(RETO_COLS)
    .in('estado', ['BUSCANDO', 'ACEPTADO', 'EN_JUEGO']).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  data.retos = rows ?? [];

  data.historial = await cargarHistorial();   // si falla, queda vacío y se registra; no tumba la sala

  data.parts = new Map();
  const ids = [...new Set([...data.retos, ...data.historial].map((r) => r.id))];
  if (ids.length) {
    const p = await supabase.from('reto_participantes').select('reto_id, usuario_id, equipo, estado').in('reto_id', ids).neq('estado', 'SALIO');
    if (p.error) console.error('[duelos] participantes:', p.error.message);
    for (const x of p.data ?? []) data.parts.set(x.reto_id, [...(data.parts.get(x.reto_id) ?? []), x]);
  }

  data.conexion = new Map();
  if (me()) {
    const l = await supabase.from('retos_conexion').select('reto_id, link, detalle');
    if (l.error) console.error('[duelos] enlaces:', l.error.message);
    data.conexion = new Map((l.data ?? []).map((x) => [x.reto_id, x]));
  }
}

/** Retos que se muestran: los ajenos vencidos se ocultan; los míos siempre (para poder cancelarlos). */
export function visibleRetos() {
  const id = me();
  return data.retos.filter((r) => isMine(r, id) || !isStale(r));
}
