// Clan contra clan — lógica PURA (sin DOM → `npm test`). Datos de clan_series_de (migración 150). Nunca lanza.
export const MEJOR_DE = [1, 3, 5, 7];
export const PLAZOS = [7, 14, 21, 30];

export const ESTADOS_SERIE = {
  propuesta: { texto: 'Pendiente', clase: 'text-amber-300 border-amber-400/40 bg-amber-400/10' },
  en_juego: { texto: 'En juego', clase: 'text-ok border-ok/50 bg-ok/10' },
  terminada: { texto: 'Terminada', clase: 'text-galaxy-400 border-galaxy-400/40' },
  rechazada: { texto: 'Rechazada', clase: 'text-gray-400 border-galaxy-border' },
  cancelada: { texto: 'Cancelada', clase: 'text-gray-400 border-galaxy-border' },
  caducada: { texto: 'Caducada', clase: 'text-gray-400 border-galaxy-border' },
};
export const estadoSerie = (e) => ESTADOS_SERIE[e] ?? ESTADOS_SERIE.cancelada;

/** Resumen de una serie desde el punto de vista de mi clan (si soy de uno de los dos). */
export function vistaSerie(s, miClanId = null) {
  if (!s || !s.a || !s.b) return null;
  const soyA = miClanId != null && Number(s.a.id) === Number(miClanId);
  const soyB = miClanId != null && Number(s.b.id) === Number(miClanId);
  const pa = Number(s.puntos_a) || 0, pb = Number(s.puntos_b) || 0;
  let resultado = '';
  if (s.estado === 'terminada') {
    if (s.ganador == null) resultado = 'Empate';
    else if (soyA || soyB) resultado = Number(s.ganador) === Number(miClanId) ? '¡Ganó tu clan!' : 'Perdió tu clan';
    else resultado = `Ganó ${Number(s.ganador) === Number(s.a.id) ? s.a.nombre : s.b.nombre}`;
  }
  return { id: s.id, a: s.a, b: s.b, pa, pb, estado: s.estado, mio: soyA || soyB, soyA, soyB, resultado,
    meta: `Al mejor de ${Number(s.mejor_de) || 1} · gana con ${Number(s.mayoria) || 1} · ${Number(s.jugados) || 0} jugado${Number(s.jugados) === 1 ? '' : 's'}`,
    puedoResponder: !!s.puedo_responder, puedoCancelar: !!s.puedo_cancelar };
}

/** ¿Puedo retar? Solo capitán o subcapitán. */
export const puedeRetar = (rol) => rol === 'capitan' || rol === 'subcapitan';

/** Valida el formulario de reto. */
export function validarReto({ rival, mejorDe, plazo, mensaje }, miClanId) {
  const r = Number(rival);
  if (!Number.isInteger(r) || r <= 0) return { ok: false, error: 'Elige el clan rival.' };
  if (r === Number(miClanId)) return { ok: false, error: 'No puedes retar a tu propio clan.' };
  if (!MEJOR_DE.includes(Number(mejorDe))) return { ok: false, error: 'Elige al mejor de 1, 3, 5 o 7.' };
  if (!PLAZOS.includes(Number(plazo))) return { ok: false, error: 'Elige un plazo válido.' };
  const m = String(mensaje ?? '').trim();
  if (m.length > 140 || /[<>]/.test(m)) return { ok: false, error: 'El mensaje: máximo 140 caracteres, sin < ni >.' };
  return { ok: true, rival: r, mejorDe: Number(mejorDe), plazo: Number(plazo), mensaje: m || null };
}
