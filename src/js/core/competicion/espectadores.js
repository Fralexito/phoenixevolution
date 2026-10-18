// Espectadores (puro, sin DOM → probable): catálogo de modos, normalización y estado del botón de cada partido.
/** Única fuente de los modos que el retador puede elegir. */
export const MODOS = [
  { id: 'APAGADO', etiqueta: 'No acepto', icono: 'fa-eye-slash', corto: 'Sin espectadores', ayuda: 'Nadie puede pedir ver este partido.' },
  { id: 'APROBACION', etiqueta: 'Con aprobación', icono: 'fa-user-check', corto: 'Con aprobación', ayuda: 'Cualquiera pide entrar y tú decides.' },
  { id: 'AMIGOS', etiqueta: 'Solo amigos', icono: 'fa-user-group', corto: 'Solo amigos', ayuda: 'Los amigos de los jugadores entran directo.' },
  { id: 'CUALQUIERA', etiqueta: 'Cualquiera', icono: 'fa-door-open', corto: 'Abierto', ayuda: 'Cualquier jugador con sesión entra directo.' },
];
const IDS = new Set(MODOS.map((m) => m.id));
export const modoDe = (id) => MODOS.find((m) => m.id === id) ?? MODOS[0];
export const modoValido = (id) => (IDS.has(id) ? id : 'APAGADO');
export const MAX_ESPECTADORES = 20;
export const clampMax = (n) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.min(Math.max(v, 1), MAX_ESPECTADORES) : 4; };

const lista = (x) => (Array.isArray(x) ? x : []);

/** Respuesta de `partidos_en_vivo()` → lista segura. Nunca lanza. */
export function normalizarPartidos(raw) {
  return lista(raw).filter((p) => p && Number.isInteger(p.id)).map((p) => ({
    id: p.id, estado: p.estado, plataforma: String(p.plataforma ?? ''), tam_a: Number(p.tam_a) || 1, tam_b: Number(p.tam_b) || 1, fecha: p.fecha ?? null, modalidad: p.modalidad ?? null,
    modo: modoValido(p.modo), max: clampMax(p.max), aprobados: Math.max(0, Number(p.aprobados) || 0),
    retador_id: p.retador_id ?? null, rival_id: p.rival_id ?? null, host_id: p.host_id ?? null,
    jugadores: lista(p.jugadores).filter((x) => typeof x === 'string'), mi_estado: ['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(p.mi_estado) ? p.mi_estado : null, motivo: p.motivo || '',
  }));
}

/** Respuesta de `mis_salas()` → lista segura (solicitudes separadas por estado). */
export function normalizarSalas(raw) {
  return lista(raw).filter((s) => s && Number.isInteger(s.id)).map((s) => {
    const e = lista(s.espectadores).filter((x) => x && typeof x.usuario_id === 'string');
    return { id: s.id, estado: s.estado, plataforma: String(s.plataforma ?? ''), tam_a: Number(s.tam_a) || 1, tam_b: Number(s.tam_b) || 1, modo: modoValido(s.modo), max: clampMax(s.max),
      retador_id: s.retador_id ?? null, rival_id: s.rival_id ?? null, host_id: s.host_id ?? null,
      pendientes: e.filter((x) => x.estado === 'PENDIENTE').map((x) => x.usuario_id), aprobados: e.filter((x) => x.estado === 'APROBADO').map((x) => x.usuario_id) };
  });
}

/** Qué botón mostrar en la tarjeta de un partido. tipo: 'ver' (aprobado) | 'pendiente' | 'pedir' | 'entrar' | 'lleno' | 'no'. */
export function accionPara(p) {
  if (p.mi_estado === 'APROBADO') return { tipo: 'ver', texto: 'Ver enlace', activo: true };
  if (p.mi_estado === 'PENDIENTE') return { tipo: 'pendiente', texto: 'Esperando aprobación', activo: false };
  if (p.motivo) return { tipo: 'no', texto: p.motivo, activo: false };
  if (p.aprobados >= p.max) return { tipo: 'lleno', texto: 'Sala llena', activo: false };
  return p.modo === 'APROBACION' ? { tipo: 'pedir', texto: 'Pedir entrar', activo: true } : { tipo: 'entrar', texto: 'Entrar a ver', activo: true };
}
