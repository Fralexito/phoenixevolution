// Lógica pura de la pantalla «Phoenix Sync» (sin red ni DOM: se prueba con npm test). Datos: migración 098. Contrato: docs/contrato-v1.md §26.
export const MODOS = {
  autorizacion: { id: 'autorizacion', nombre: 'Con autorización', icono: 'fa-shield-halved', corto: 'Cada PC debe pulsar Aplicar' },
  automatico: { id: 'automatico', nombre: 'Automático', icono: 'fa-bolt', corto: 'Los fichajes se aplican solos' },
};
/** Un modo desconocido cuenta como «con autorización» (lo más seguro; igual que en el contrato). */
export const modoSeguro = (m) => (MODOS[m] ? m : 'autorizacion');

export const ESTADOS = {
  aplicada: { icono: '✅', nombre: 'Aplicada', tono: 'ok', ayuda: 'La PC ya puso el fichaje en su option file (con respaldo).' },
  pendiente: { icono: '⏳', nombre: 'Pendiente', tono: 'espera', ayuda: 'Esa PC aún no lo aplicó o no ha respondido.' },
  conflicto: { icono: '⚠', nombre: 'Conflicto', tono: 'aviso', ayuda: 'La PC no pudo aplicarlo tal cual (p. ej. el jugador ya estaba en otro equipo). Se resuelve en Phoenix Sync.' },
  incompatible: { icono: '⛔', nombre: 'Incompatible', tono: 'mal', ayuda: 'El parche o la base de datos de esa PC no coincide con la del fichaje.' },
  omitida: { icono: '↷', nombre: 'Omitida', tono: 'neutro', ayuda: 'La PC decidió saltarse este fichaje.' },
  rechazada: { icono: '✖', nombre: 'Rechazada', tono: 'mal', ayuda: 'La persona de esa PC no autorizó el fichaje.' },
};
export const estadoDe = (e) => ESTADOS[e] ?? ESTADOS.pendiente;

export const ROLES = {
  admin: { nombre: 'Admin', ayuda: 'Puede todo: el interruptor, los permisos y publicar.' },
  publica: { nombre: 'Publica', ayuda: 'Puede publicar fichajes (y aplicar si tiene el permiso).' },
  miembro: { nombre: 'Miembro', ayuda: 'Recibe y aplica fichajes.' },
};

/** Texto de la leyenda del interruptor (el que pidió FRALEX). */
export const LEYENDA_MODO = 'Automático: los fichajes se aplican solos en cada PC. Con autorización: cada PC debe pulsar Aplicar.';
export const AVISO_AUTOMATICO = 'Los cambios de otros miembros se aplicarán sin preguntar. Siempre se hace un respaldo antes.';

/** Resumen para una operación: un estado por miembro que debe aplicarla (si no hay fila, es «pendiente»). */
export function estadosDeOperacion(op, aplicaciones, miembros) {
  const porUsuario = new Map(aplicaciones.filter((a) => a.op_id === op.id).map((a) => [a.usuario_id, a]));
  const filas = miembros.filter((m) => m.activo !== false && (m.puede_aplicar || m.rol === 'admin' || porUsuario.has(m.usuario_id)))
    .map((m) => ({ usuario_id: m.usuario_id, estado: porUsuario.get(m.usuario_id)?.estado ?? 'pendiente', motivo: porUsuario.get(m.usuario_id)?.motivo ?? null }));
  const conteo = {};
  for (const f of filas) conteo[f.estado] = (conteo[f.estado] ?? 0) + 1;
  return { filas, conteo };
}

/** «hace 5 min», «hace 2 h», «hace 3 d» (o la fecha si es más viejo). */
export function hace(iso, ahora = Date.now()) {
  const ms = ahora - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 30 * 86400) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('es-PE');
}

/** Línea del historial del interruptor: «Ana pasó de Con autorización a Automático». */
export function lineaHistorial(h, nombres = {}) {
  const quien = nombres[h.por] ?? 'Alguien';
  const a = MODOS[modoSeguro(h.modo_nuevo)].nombre;
  return h.modo_anterior ? `${quien}: ${MODOS[modoSeguro(h.modo_anterior)].nombre} → ${a}` : `${quien} creó el grupo en «${a}»`;
}

/** ¿Lo escrito en el buscador de personas sirve? Letras (con tildes), números, espacio, punto, guion y guion bajo; de 2 a 32. Sin comas ni paréntesis (rompen el filtro). */
export const terminoValido = (t) => /^[\p{L}\p{N}._ -]{2,32}$/u.test(String(t ?? '').trim().replace(/^@/, ''));
