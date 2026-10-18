// Juegos EXTRA del host (puro, sin DOM → probable). Los principales (PES 2021 y SP Football Life) viven en otras columnas; esto es opcional y mínimo.
export const EXTRAS_JUEGOS = [
  { id: 'eFootball', versionEj: 'ej. 2025 o v4.6', modEj: 'Parche o mod (opcional)' },
  { id: 'FIFA', versionEj: 'ej. FIFA 23', modEj: 'Mod (opcional)' },
];
export const MAX_VERSION = 20; export const MAX_MOD = 60;
const limpio = (v, max) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Cualquier valor (de la BD o del formulario) → lista segura [{juego, version, mod}]. Un juego una sola vez; solo los del catálogo. Nunca lanza. */
export function sanitizarExtras(x) {
  const out = []; const vistos = new Set();
  for (const e of Array.isArray(x) ? x : []) {
    const juego = EXTRAS_JUEGOS.find((j) => j.id === e?.juego)?.id;
    if (!juego || vistos.has(juego)) continue;
    vistos.add(juego); out.push({ juego, version: limpio(e.version, MAX_VERSION), mod: limpio(e.mod, MAX_MOD) });
  }
  return out;
}

/** «eFootball 2025 · mod X» — texto corto para mostrar. */
export const resumenExtra = (e) => [e.juego, e.version].filter(Boolean).join(' ') + (e.mod ? ` · ${e.mod}` : '');
