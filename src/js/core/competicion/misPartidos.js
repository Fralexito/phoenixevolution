// MIS PARTIDOS (puro, sin DOM): reparte MIS retos en tres grupos.
//  · agendados = partido ya aceptado (ACEPTADO / EN_JUEGO): ya tiene rival y está por jugarse o jugándose.
//  · historial = partido terminado (FINALIZADO), el más reciente primero.
//  · pendientes = retos que aún nadie aceptó (BUSCANDO) o invitaciones por responder: NO son partidos todavía, por eso salen de «Mis partidos».
const ts = (x) => { const t = new Date(x ?? '').getTime(); return Number.isNaN(t) ? null : t; };

/** Agendados: primero los que se juegan «ya» (sin fecha) o los más próximos. */
export function ordenarAgendados(retos) {
  return retos.filter((r) => r.estado === 'ACEPTADO' || r.estado === 'EN_JUEGO')
    .sort((a, b) => (ts(a.fecha_programada) ?? 0) - (ts(b.fecha_programada) ?? 0) || (a.id ?? 0) - (b.id ?? 0));
}
/** Historial: terminados, del más reciente al más antiguo (por cierre; si falta, por creación). */
export function ordenarPartidosJugados(retos) {
  const f = (r) => ts(r.cerrado_at) ?? ts(r.created_at) ?? 0;
  return retos.filter((r) => r.estado === 'FINALIZADO').sort((a, b) => f(b) - f(a));
}
export const pendientes = (retos) => retos.filter((r) => r.estado === 'BUSCANDO');

/**
 * Historial con cada rival en DUELOS: cuenta cuántos partidos terminados jugaste contra cada persona.
 * @param {object[]} retos      partidos FINALIZADOS míos
 * @param {(retoId:number)=>{usuario_id:string,equipo:string}[]} partsOf  participantes de cada reto
 * @param {string} yo           mi id
 * @returns {{id:string, partidos:number, ultimo:string|null}[]} más partidos primero (empate: el más reciente)
 */
export function rivalesDeDuelos(retos, partsOf, yo) {
  const m = new Map();
  for (const r of retos) {
    if (r.estado !== 'FINALIZADO') continue;
    const ps = partsOf(r.id) ?? [];
    const lado = (id) => ps.find((p) => p.usuario_id === id)?.equipo ?? (id === r.retador_id ? 'A' : id === r.rival_id || id === r.destinatario_id ? 'B' : null);
    const mio = lado(yo); if (!mio) continue;
    const rivales = new Set(ps.filter((p) => p.equipo && p.equipo !== mio).map((p) => p.usuario_id));
    const lider = mio === 'A' ? (r.rival_id ?? r.destinatario_id) : r.retador_id;
    if (!rivales.size && lider) rivales.add(lider);
    for (const id of rivales) {
      if (id === yo) continue;
      const x = m.get(id) ?? { id, partidos: 0, ultimo: null };
      x.partidos += 1;
      const t = r.cerrado_at ?? r.created_at ?? null;
      if (t && (!x.ultimo || ts(t) > ts(x.ultimo))) x.ultimo = t;
      m.set(id, x);
    }
  }
  return [...m.values()].sort((a, b) => b.partidos - a.partidos || (ts(b.ultimo) ?? 0) - (ts(a.ultimo) ?? 0));
}
