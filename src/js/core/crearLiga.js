// «Crear mi liga» (ronda 276): lógica PURA (sin DOM → se prueba con `npm test`).
// Convierte las 3 respuestas rápidas (nombre, tipo, jugadores) + lo opcional de «Personalizar» en los argumentos de la RPC torneo_crear
// (los mismos de /torneos/: misma tabla torneos_libres, sin base de datos nueva).
import { formatoPorId, generar, validarFormato } from './formatos.js';

/** Las 4 tarjetas de la creación rápida. `formato` es el id del motor de formatos (core/formatos.js). */
export const PLANTILLAS = Object.freeze([
  { id: 'liga', nombre: 'Liga', frase: 'Todos contra todos', detalle: 'Cada uno juega contra cada uno. Gana quien más puntos suma.', icono: 'fa-table-list', formato: 'liguilla', min: 3, max: 12, defecto: 8 },
  { id: 'copa', nombre: 'Copa', frase: 'Pierdes y te vas', detalle: 'Llaves de eliminación directa hasta la gran final.', icono: 'fa-trophy', formato: 'eliminacion', min: 2, max: 64, defecto: 16 },
  { id: 'mundial', nombre: 'Grupos + copa', frase: 'Como el Mundial', detalle: 'Primero grupos; los mejores pasan a las llaves.', icono: 'fa-layer-group', formato: 'grupos', min: 6, max: 64, defecto: 16 },
  { id: 'suizo', nombre: 'Suizo', frase: 'Todos juegan, nadie se va', detalle: 'Cada ronda te toca alguien de tu nivel.', icono: 'fa-scale-balanced', formato: 'suizo', min: 4, max: 64, defecto: 16 },
]);
export const plantillaPorId = (id) => PLANTILLAS.find((p) => p.id === id) ?? null;

export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 80;
const VISIBILIDADES = ['publico', 'enlace', 'privado'];

/** Formato real del motor para una plantilla: la Liga con «ida y vuelta» usa el formato `idavuelta` (más corto: hasta 10). */
export function formatoDe(plantillaId, { idaVuelta = false } = {}) {
  const p = plantillaPorId(plantillaId);
  if (!p) return null;
  return p.id === 'liga' && idaVuelta ? 'idavuelta' : p.formato;
}

/** Límites de jugadores de la plantilla (cambian con la ida y vuelta). */
export function limitesDe(plantillaId, opciones = {}) {
  const f = formatoPorId(formatoDe(plantillaId, opciones));
  const p = plantillaPorId(plantillaId);
  if (!f || !p) return { min: 2, max: 64 };
  return { min: Math.max(p.min, f.min), max: Math.min(p.max, f.max) };
}

/** Ajusta un número de jugadores a los límites de la plantilla (entero). */
export function ajustarJugadores(plantillaId, n, opciones = {}) {
  const { min, max } = limitesDe(plantillaId, opciones);
  const v = Number.isFinite(Number(n)) ? Math.round(Number(n)) : min;
  return Math.min(max, Math.max(min, v));
}

/** Cuántos partidos se jugarán (para enseñarle algo concreto al organizador antes de crear). null si no se puede calcular. */
export function resumenPartidos(plantillaId, jugadores, opciones = {}) {
  const id = formatoDe(plantillaId, opciones);
  if (!id) return null;
  const nombres = Array.from({ length: Math.max(0, jugadores) }, (_, i) => `J${i + 1}`);
  const r = generar(id, nombres, { tercerPuesto: Boolean(opciones.tercerPuesto), grupos: opciones.grupos ?? undefined, sinTope: Boolean(opciones.sinTope) });
  if (!r.ok) return null;
  return { partidos: r.totalPartidos ?? 0, rondas: r.totalRondas ?? r.rondas?.length ?? 0, tipo: r.tipo };
}

const texto = (v, max) => { const t = String(v ?? '').trim(); return t ? t.slice(0, max) : null; };

/**
 * Arma los argumentos de `api.crear` o devuelve { ok:false, motivo }.
 * entrada: { plantilla, nombre, jugadores, opciones?: { idaVuelta, tercerPuesto, grupos, visibilidad, juega, descripcion, premio, reglas, enlace,
 *            inicia, dinamicas[], sorteo, reportan, sinTope } }
 */
export function construirTorneo({ plantilla, nombre, jugadores, opciones = {} } = {}) {
  const p = plantillaPorId(plantilla);
  if (!p) return { ok: false, motivo: 'Elige qué tipo de liga quieres.' };
  const nom = String(nombre ?? '').trim().replace(/\s+/g, ' ');
  if (nom.length < NOMBRE_MIN) return { ok: false, motivo: `El nombre necesita al menos ${NOMBRE_MIN} letras.` };
  if (nom.length > NOMBRE_MAX) return { ok: false, motivo: `El nombre admite hasta ${NOMBRE_MAX} letras.` };
  const n = Number(jugadores);
  if (!Number.isInteger(n)) return { ok: false, motivo: 'Escribe cuántos jugadores serán.' };
  const formato = formatoDe(p.id, opciones);
  const v = validarFormato(formato, n, { sinTope: Boolean(opciones.sinTope) });
  if (!v.ok) return { ok: false, motivo: v.motivo };
  const visibilidad = VISIBILIDADES.includes(opciones.visibilidad) ? opciones.visibilidad : 'publico';
  const grupos = Number.isInteger(Number(opciones.grupos)) && Number(opciones.grupos) >= 2 ? Number(opciones.grupos) : null;
  const inicia = opciones.inicia ? new Date(opciones.inicia) : null;
  if (inicia && Number.isNaN(inicia.getTime())) return { ok: false, motivo: 'La fecha de inicio no es válida.' };
  const enlace = texto(opciones.enlace, 300);
  if (enlace && !/^https:\/\/\S+$/.test(enlace)) return { ok: false, motivo: 'El enlace debe empezar por https://' };
  const config = {
    dinamicas: Array.isArray(opciones.dinamicas) ? opciones.dinamicas.map(String).slice(0, 30) : [],
    tercerPuesto: ['copa', 'mundial'].includes(p.id) && Boolean(opciones.tercerPuesto),
    grupos: p.id === 'mundial' ? grupos : null, maxRacha: 3, alcance: 3,
    sinTope: Boolean(opciones.sinTope), sortear: Boolean(opciones.sorteo), reportan_jugadores: Boolean(opciones.reportan),
    premio: texto(opciones.premio, 200), reglas_extra: texto(opciones.reglas, 1500), enlace,
    origen: 'crear-liga', plantilla: p.id,
  };
  return {
    ok: true,
    args: { nombre: nom, descripcion: texto(opciones.descripcion, 500), formato, config, visibilidad, cupo: n, inicia: inicia ? inicia.toISOString() : null, juega: opciones.juega !== false },
  };
}
