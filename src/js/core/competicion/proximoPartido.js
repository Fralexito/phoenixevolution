// «Tu próximo partido» (puro, con test): de mis retos activos elige el que toca primero.
// Orden: EN_JUEGO primero; luego el de fecha más cercana; los sin fecha («ya») cuentan como ahora.
const ts = (x) => { const t = new Date(x ?? '').getTime(); return Number.isNaN(t) ? null : t; };
export function elegirProximo(retos, yo) {
  const mios = (retos ?? []).filter((r) => (r.estado === 'ACEPTADO' || r.estado === 'EN_JUEGO') && (r.retador_id === yo || r.rival_id === yo));
  if (!mios.length) return null;
  const peso = (r) => (r.estado === 'EN_JUEGO' ? -1 : (ts(r.fecha_programada) ?? 0));
  return [...mios].sort((a, b) => peso(a) - peso(b) || (a.id ?? 0) - (b.id ?? 0))[0];
}
/** Texto corto de cuándo: «Ahora», «Hoy 8:00 p. m.», «Mañana …», «vie 8:00 p. m.». `ahora` y `tz` se pueden inyectar (tests). */
export function cuando(r, ahora = Date.now(), tz) {
  if (r.estado === 'EN_JUEGO') return 'En juego';
  const t = ts(r.fecha_programada); if (t === null) return 'Ahora';
  const dia = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: tz });
  const hora = new Date(t).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  if (t < ahora - 3600000) return 'Pendiente';
  if (dia(t) === dia(ahora)) return `Hoy ${hora}`;
  if (dia(t) === dia(ahora + 86400000)) return `Mañana ${hora}`;
  return `${new Date(t).toLocaleDateString('es', { weekday: 'short', timeZone: tz })} ${hora}`;
}
