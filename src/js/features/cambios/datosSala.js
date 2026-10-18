// Datos de la sala de fichajes: plantillas de los clubes (import dinámico, ~67 KB) + lo de la Liga Máster de la web
// (clubes, quién es el DT —el usuario— de cada uno y los jugadores con su id de la Liga Máster). Todo se pide una sola vez.
import { supabase } from '../../core/supabase.js';
import { CLUBES_PES } from '../../../data/clubesPes.js';
import { emparejarClubesLm } from '../../core/clubesPes.js';

let plantillas = null;
export function cargarPlantillas() {
  plantillas ??= import('../../../data/plantillasPes.js').then((m) => m.PLANTILLAS);
  return plantillas;
}

let lm = null;
/** { clubes: Map<id del catálogo, {id, nombre, dt: {id, nombre, usuario, avatar}|null}>, jugadores: Map<id PES, {id, club_id}> }. Si la base no responde, queda vacío (la sala sigue sirviendo). */
export function cargarLm() {
  lm ??= (async () => {
    try {
      const [{ data: clubes }, { data: jugs }] = await Promise.all([
        supabase.from('lm_clubes').select('id, nombre, dueno').eq('liga', 'galaxy'),
        supabase.from('lm_jugadores').select('id, pes_id, club_id').not('pes_id', 'is', null).limit(2000),
      ]);
      const ids = [...new Set((clubes ?? []).map((c) => c.dueno).filter(Boolean))];
      const perfiles = ids.length ? (await supabase.from('perfiles').select('id, username, nombre_display, avatar_url').in('id', ids)).data ?? [] : [];
      const dt = new Map(perfiles.map((p) => [p.id, { id: p.id, nombre: p.nombre_display || p.username, usuario: p.username, avatar: p.avatar_url || null }]));
      const lista = (clubes ?? []).map((c) => ({ id: c.id, nombre: c.nombre, dt: dt.get(c.dueno) ?? null }));
      return { clubes: emparejarClubesLm(lista, CLUBES_PES), jugadores: new Map((jugs ?? []).map((j) => [j.pes_id, j])) };
    } catch { return { clubes: new Map(), jugadores: new Map() }; }
  })();
  return lm;
}

/** Club de la Liga Máster que corresponde al club del catálogo con ese nombre; `dt` = null si lo lleva la IA. undefined = no está en la Liga Máster (o aún no cargó). */
let ultimo = null;
cargarLm().then((x) => { ultimo = x; });
export function lmDeClubPorNombre(nombre) {
  if (!ultimo) return undefined;
  const c = CLUBES_PES.find((x) => x.nombre === nombre);
  return c ? ultimo.clubes.get(c.id) : undefined;
}
