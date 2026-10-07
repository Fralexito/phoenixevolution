// Campana de notificaciones · lógica PURA (sin DOM ni red → `npm test`): categorías, filtros, grupos por día y «hace 5 min».
// ESPEJO de private.categoria_notif (migraciones 033/042/043/059): si allí se añade un tipo, se añade aquí.

/** Tipo de aviso → categoría (la misma que el usuario puede apagar en Amigos → Avisos). */
export function categoriaDe(tipo) {
  if (['AMISTAD_SOLICITUD', 'AMISTAD_ACEPTADA', 'SEGUIDOR_NUEVO', 'CLAN'].includes(tipo)) return 'social';
  if (tipo === 'MURO_RESPUESTA') return 'muro';
  if (tipo === 'MENCION') return 'menciones';
  if (tipo === 'LOGRO') return 'logros';
  if (tipo === 'EVENTO') return 'eventos';
  if (tipo === 'SALA_ABIERTA') return 'salas';
  if (tipo === 'MODERACION') return 'sistema';
  return 'duelos';
}

/** Filtros de la campana (chips). `incluye` decide qué categorías entran en cada uno. */
export const FILTROS = Object.freeze([
  { id: 'todas', titulo: 'Todas' },
  { id: 'no_leidas', titulo: 'No leídas' },
  { id: 'duelos', titulo: 'Duelos', icono: 'fa-bolt', incluye: ['duelos', 'salas'] },
  { id: 'social', titulo: 'Social', icono: 'fa-user-group', incluye: ['social', 'muro', 'menciones'] },
  { id: 'otros', titulo: 'Otros', icono: 'fa-star', incluye: ['logros', 'eventos', 'sistema'] },
]);

export function filtrar(items, filtro) {
  const f = FILTROS.find((x) => x.id === filtro);
  if (!f || f.id === 'todas') return items ?? [];
  if (f.id === 'no_leidas') return (items ?? []).filter((n) => !n.leida);
  return (items ?? []).filter((n) => f.incluye.includes(categoriaDe(n.tipo)));
}

/** No leídas por filtro (para el numerito de cada chip). */
export function conteoPorFiltro(items) {
  return Object.fromEntries(FILTROS.map((f) => [f.id, filtrar(items, f.id).filter((n) => !n.leida).length]));
}

/** Clave de día (AAAA-MM-DD) en la zona horaria dada. */
const diaEn = (fecha, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);

/** Grupo temporal de un aviso: hoy | ayer | semana (últimos 7 días) | antes. */
export function grupoTiempo(iso, ahora = new Date(), tz = 'America/Lima') {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return 'antes';
  const hoy = diaEn(ahora, tz); const d = diaEn(f, tz);
  if (d === hoy) return 'hoy';
  if (d === diaEn(new Date(ahora.getTime() - 864e5), tz)) return 'ayer';
  if (ahora - f < 7 * 864e5) return 'semana';
  return 'antes';
}
export const TITULO_GRUPO = Object.freeze({ hoy: 'Hoy', ayer: 'Ayer', semana: 'Esta semana', antes: 'Anteriores' });

/** Lista (más nuevas primero) → [{ grupo, items }] en orden hoy → antes, sin grupos vacíos. */
export function agruparPorTiempo(items, ahora = new Date(), tz = 'America/Lima') {
  const orden = ['hoy', 'ayer', 'semana', 'antes']; const m = new Map(orden.map((g) => [g, []]));
  for (const n of items ?? []) m.get(grupoTiempo(n.created_at, ahora, tz)).push(n);
  return orden.filter((g) => m.get(g).length).map((g) => ({ grupo: g, items: m.get(g) }));
}

/** «ahora», «hace 5 min», «hace 3 h», «hace 2 d»; más de 7 días → null (se muestra la fecha). */
export function haceCuanto(iso, ahora = new Date()) {
  const s = Math.floor((ahora - new Date(iso)) / 1000);
  if (!Number.isFinite(s)) return null;
  if (s < 45) return 'ahora';
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 7 * 86400) return `hace ${Math.round(s / 86400)} d`;
  return null;
}

/** ¿Merece animación de «llegó algo importante»? (retos directos, salas listas, avisos finales, invitaciones). */
export const URGENTES = new Set(['RETO_DIRECTO', 'INVITACION_RETO', 'SALA_LISTA', 'AVISO_FINAL', 'CONFIRMAR_PARTIDO', 'RESULTADO_DISPUTADO']);
export const esUrgente = (tipo) => URGENTES.has(tipo);

/** Deslizar para descartar: ¿la distancia/velocidad del gesto alcanza? (px recorridos, ancho del elemento, px/ms). */
export const alcanzaDescartar = (dx, ancho, velocidad = 0) => Math.abs(dx) > Math.max(80, ancho * 0.35) || (Math.abs(dx) > 30 && Math.abs(velocidad) > 0.6);
