// Salas Smash Soda (módulo 2): reglas PURAS para la web (sin red ni DOM → se prueban con `npm test`).
// La base de datos manda (RLS, pg_cron, Edge Function «phoenix»); aquí solo se decide cómo mostrar lo que llega.

export const SEG_INESTABLE = 90;          // sin latido 90 s → «inestable» (el servidor la marca «caída» a los 3 min)
export const ESTADOS_VIVOS = Object.freeze(['preparando', 'abierta', 'en_partida']);

/** Salud visible de una sala: viva | inestable | en_partida | cerrada | caida. `ahora` en ms (inyectable para pruebas). */
export function saludSala(sala, ahora = Date.now()) {
  if (!sala || !ESTADOS_VIVOS.includes(sala.estado)) return sala?.estado === 'caida' ? 'caida' : 'cerrada';
  const ms = Date.parse(sala.latido);
  if (Number.isFinite(ms) && ahora - ms > SEG_INESTABLE * 1000) return 'inestable';
  return sala.estado === 'en_partida' ? 'en_partida' : 'viva';
}

/** Orden de la lista «Salas en vivo»: con plazas primero, luego las de amigos/reto, luego las más recientes. */
export function ordenarSalas(salas, ahora = Date.now()) {
  const peso = (s) => {
    const salud = saludSala(s, ahora);
    if (salud === 'cerrada' || salud === 'caida') return 9;
    return (s.plazas_libres > 0 ? 0 : 2) + (salud === 'inestable' ? 3 : 0);
  };
  return [...(salas ?? [])].sort((a, b) => peso(a) - peso(b) || Date.parse(b.abierta_en) - Date.parse(a.abierta_en));
}

/** Integra un cambio de Realtime (INSERT/UPDATE/DELETE) en la lista; las salas que dejan de estar vivas salen. */
export function aplicarCambioSala(lista, { eventType, new: nueva, old: vieja }) {
  const sin = (lista ?? []).filter((s) => s.id !== (nueva?.id ?? vieja?.id));
  if (eventType === 'DELETE' || !nueva || !ESTADOS_VIVOS.includes(nueva.estado)) return sin;
  const previa = (lista ?? []).find((s) => s.id === nueva.id);
  return [...sin, { ...previa, ...nueva }];
}

/** «123456» → «123 456» (código de emparejamiento) para leerlo en voz alta sin errores. */
export const mostrarCodigoPC = (c) => (/^\d{6}$/.test(c ?? '') ? `${c.slice(0, 3)} ${c.slice(3)}` : '');

/** ID de Parsec escrito por el usuario → solo dígitos, o null si no es válido. */
export function limpiarParsecId(x) {
  const t = String(x ?? '').replace(/\s+/g, '');
  return /^[0-9]{1,20}$/.test(t) ? t : null;
}

/** Segundos que faltan para que venza un código (0 si ya venció). */
export const segundosRestantes = (expira, ahora = Date.now()) => Math.max(0, Math.floor((Date.parse(expira) - ahora) / 1000));

/** Etiquetas legibles. */
export const MODO_TXT = Object.freeze({ amistoso: 'Amistoso', torneo_privado: 'Torneo privado', oficial: 'Oficial' });
export const SALUD_TXT = Object.freeze({ viva: 'Abierta', en_partida: 'En partido', inestable: 'Señal inestable', cerrada: 'Cerrada', caida: 'Caída' });
