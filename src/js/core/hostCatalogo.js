// Catálogo de HOSTING de un perfil (puro, sin DOM): varios juegos y, en cada uno, varios parches/versiones. Se guarda en perfiles.host_catalogo (migración 026).
// Forma: [{ juego: 'PES 2021', opciones: ['Dream Patch', 'VirtuaRED'] }, …]. Límites [BD] = los de la RPC muro_guardar_host.
import { PARCHES_PES, SP_VERSIONES } from './rules.js';
import { sanitizarExtras } from './hostExtras.js';

export const HOST_MAX_JUEGOS = 5;     // [BD]
export const HOST_MAX_OPCIONES = 8;   // [BD]
export const HOST_MAX_TEXTO = 40;     // [BD]
/** Juegos que se pueden ofrecer, con sus opciones sugeridas (el usuario puede añadir otras a mano) y el nombre de lo que son. */
export const HOST_JUEGOS = [
  { id: 'PES 2021', principal: true, opcion: 'Parches', sugeridas: PARCHES_PES },
  { id: 'SP Football Life', principal: true, opcion: 'Versiones', sugeridas: SP_VERSIONES },
  { id: 'eFootball', opcion: 'Versiones o mods', sugeridas: ['2025', '2026', '2027'] },
  { id: 'FIFA', opcion: 'Versiones o mods', sugeridas: ['FIFA 22', 'FIFA 23'] },
  { id: 'EA FC', opcion: 'Versiones o mods', sugeridas: ['24', '25', '26', '27'] },
];
const IDS = HOST_JUEGOS.map((j) => j.id);
export const limpiarOpcion = (t) => String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, HOST_MAX_TEXTO);

/** Cualquier valor (BD o formulario) → catálogo seguro: solo juegos conocidos, sin repetir, opciones limpias y sin duplicados. Nunca lanza. */
export function sanitizarCatalogo(x) {
  const out = []; const vistos = new Set();
  for (const e of Array.isArray(x) ? x : []) {
    if (!IDS.includes(e?.juego) || vistos.has(e.juego) || out.length >= HOST_MAX_JUEGOS) continue;
    vistos.add(e.juego);
    const ops = [];
    for (const o of Array.isArray(e.opciones) ? e.opciones : []) { const t = limpiarOpcion(o); if (typeof o === 'string' && t && !ops.includes(t) && ops.length < HOST_MAX_OPCIONES) ops.push(t); }
    out.push({ juego: e.juego, opciones: ops });
  }
  return out;
}

/** Perfil antiguo (un solo juego/parche + extras) → catálogo. Solo para precargar el panel la primera vez. */
export function catalogoDesdeLegacy(p) {
  const cat = [];
  if (p?.host_juego === 'PES 2021') cat.push({ juego: 'PES 2021', opciones: p.host_parche ? [p.host_parche] : [] });
  else if (p?.host_juego === 'SP Football Life') cat.push({ juego: 'SP Football Life', opciones: p.host_sp_version ? [p.host_sp_version] : [] });
  for (const e of sanitizarExtras(p?.host_extras)) cat.push({ juego: e.juego, opciones: [e.version, e.mod].filter(Boolean) });
  return sanitizarCatalogo(cat);
}
/** Catálogo efectivo de un perfil: el nuevo si existe; si no, el que se deduce de las columnas antiguas. */
export function catalogoDe(p) { const n = sanitizarCatalogo(p?.host_catalogo); return n.length ? n : catalogoDesdeLegacy(p); }

/** Marca/desmarca un juego (al marcarlo nace sin opciones). No muta. Respeta el máximo de juegos. */
export function alternarJuego(cat, juego) {
  if (!IDS.includes(juego)) return cat;
  if (cat.some((e) => e.juego === juego)) return cat.filter((e) => e.juego !== juego);
  return cat.length >= HOST_MAX_JUEGOS ? cat : [...cat, { juego, opciones: [] }];
}
/** Marca/desmarca una opción de un juego (si el juego no estaba, lo añade). No muta. Respeta el máximo de opciones. */
export function alternarOpcion(cat, juego, opcion) {
  const t = limpiarOpcion(opcion); if (!IDS.includes(juego) || !t) return cat;
  const base = cat.some((e) => e.juego === juego) ? cat : alternarJuego(cat, juego);
  return base.map((e) => {
    if (e.juego !== juego) return e;
    if (e.opciones.includes(t)) return { ...e, opciones: e.opciones.filter((o) => o !== t) };
    return e.opciones.length >= HOST_MAX_OPCIONES ? e : { ...e, opciones: [...e.opciones, t] };
  });
}

/** Líneas legibles: [{juego, detalle}] → «PES 2021» + «Dream Patch, VirtuaRED». */
export const lineasHost = (cat) => sanitizarCatalogo(cat).map((e) => ({ juego: e.juego, detalle: e.opciones.join(', ') }));
