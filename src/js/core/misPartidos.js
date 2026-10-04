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
