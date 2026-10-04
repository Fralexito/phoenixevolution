// Lógica pura del perfil público de un jugador (sin DOM → probable): lo busca dentro de una edición de liga y resume su campaña.
import { norm } from './search.js';
import { calcularTabla } from './tabla.js';

const jugado = (m) => Number.isInteger(m.gl) && Number.isInteger(m.gv);

/** ¿El nombre usado en la liga («Fralex») corresponde a este jugador? Compara nombre y apodo sin tildes ni mayúsculas. */
export function coincide(jugador, nombreLiga) {
  const n = norm(nombreLiga ?? ''); if (!n) return false;
  return [jugador?.nombre, jugador?.apodo].some((x) => x && norm(x) === n);
}

/** Nombre con el que el jugador aparece en la edición (o null si no participa). */
export function nombreEnEdicion(jugador, edicion) {
  const nombres = new Set((edicion?.fechas ?? []).flatMap((f) => f.partidos.flatMap((m) => [m.l, m.v])));
  return [...nombres].find((n) => coincide(jugador, n)) ?? null;
}

/**
 * Campaña de `nombre` en `edicion`.
 * @returns {{puesto:number, fila:object, club:string, jugados:object[], proximos:object[], total:number}|null}
 *  jugados: [{n, rival, local, gf, gc, res:'G'|'E'|'P'}] en orden · proximos: [{n, rival, local}] · puesto 1-N en la tabla actual.
 */
export function campana(edicion, nombre) {
  if (!edicion || !nombre) return null;
  const { tabla } = calcularTabla(edicion.fechas.flatMap((f) => f.partidos));
  const i = tabla.findIndex((f) => f.nombre === nombre);
  const jugados = []; const proximos = [];
  for (const f of edicion.fechas) for (const m of f.partidos) {
    if (m.l !== nombre && m.v !== nombre) continue;
    const local = m.l === nombre; const rival = local ? m.v : m.l;
    if (!jugado(m)) { proximos.push({ n: f.n, rival, local }); continue; }
    const gf = local ? m.gl : m.gv; const gc = local ? m.gv : m.gl;
    jugados.push({ n: f.n, rival, local, gf, gc, res: gf > gc ? 'G' : gf < gc ? 'P' : 'E' });
  }
  if (i < 0 && !jugados.length && !proximos.length) return null;
  return { puesto: i + 1, fila: tabla[i] ?? null, club: edicion.clubes?.[nombre] ?? '', jugados, proximos, total: tabla.length };
}

/** Rendimiento contra cada rival ya enfrentado (para ver «a quién le gana»). Ordenado por rival. */
export function contraRivales(jugados) {
  const m = new Map();
  for (const p of jugados) { const r = m.get(p.rival) ?? { rival: p.rival, g: 0, e: 0, p: 0, gf: 0, gc: 0 }; r[p.res.toLowerCase()] += 1; r.gf += p.gf; r.gc += p.gc; m.set(p.rival, r); }
  return [...m.values()].sort((a, b) => a.rival.localeCompare(b.rival, 'es'));
}

// ---- Redes y textos del perfil ----
/** Redes admitidas. `base` = prefijo para armar el enlace cuando se escribe solo el usuario (@usuario). Discord no tiene enlace público: se muestra como texto. */
export const REDES = [
  { id: 'discord',   nombre: 'Discord',   icono: 'fa-brands fa-discord',   base: null,                         ayuda: 'Tu usuario, ej. fralex' },
  { id: 'youtube',   nombre: 'YouTube',   icono: 'fa-brands fa-youtube',   base: 'https://www.youtube.com/@',  ayuda: '@canal o enlace https://' },
  { id: 'kick',      nombre: 'Kick',      icono: 'fa-solid fa-k',          base: 'https://kick.com/',          ayuda: 'usuario o enlace https://' },
  { id: 'tiktok',    nombre: 'TikTok',    icono: 'fa-brands fa-tiktok',    base: 'https://www.tiktok.com/@',   ayuda: '@usuario o enlace https://' },
  { id: 'instagram', nombre: 'Instagram', icono: 'fa-brands fa-instagram', base: 'https://www.instagram.com/', ayuda: '@usuario o enlace https://' },
  { id: 'twitter',   nombre: 'X',         icono: 'fa-brands fa-x-twitter', base: 'https://x.com/',             ayuda: '@usuario o enlace https://' },
];
const USUARIO = /^[A-Za-z0-9._-]{1,40}$/;
/** Valor escrito → texto guardable o '' si no es válido. Acepta enlace https:// o usuario (con o sin @). */
export function limpiarRed(id, valor) {
  const r = REDES.find((x) => x.id === id); const v = String(valor ?? '').trim(); if (!r || !v) return '';
  if (/^https:\/\/[^\s<>"']{3,200}$/i.test(v)) return r.base ? v : '';
  const u = v.replace(/^@/, '');
  return USUARIO.test(u) ? u : '';
}
/** Objeto `redes` de la BD (o del formulario) → solo las redes válidas. Nunca lanza. */
export function limpiarRedes(obj) {
  const out = {};
  for (const r of REDES) { const v = limpiarRed(r.id, obj?.[r.id]); if (v) out[r.id] = v; }
  return out;
}
/** Enlace https para una red guardada; null si no hay enlace (Discord) o el valor no sirve. */
export function enlaceRed(id, guardado) {
  const r = REDES.find((x) => x.id === id); const v = limpiarRed(id, guardado); if (!r || !v || !r.base) return null;
  return /^https:\/\//i.test(v) ? v : `${r.base}${encodeURIComponent(v)}`;
}
/** Texto con un logro por línea → lista sin vacíos (máx. 12). */
export const partirLogros = (texto) => String(texto ?? '').split(/\r?\n/).map((l) => l.replace(/^[-•*\s]+/, '').trim()).filter(Boolean).slice(0, 12);
/** «2024-03-15» → «marzo de 2024» (UTC para no correr el día). '' si no es fecha. */
export function mesAnio(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? '')); if (!m) return '';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mes = meses[Number(m[2]) - 1]; return mes ? `${mes} de ${m[1]}` : '';
}
