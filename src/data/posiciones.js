// Posiciones de la ficha: nombre completo, grupo y color del grupo. Única fuente (formulario, tarjetas, comparador).
export const GRUPOS = {
  portero:   { nombre: 'Portero',        color: '#fbbf24' },
  defensa:   { nombre: 'Defensa',        color: '#3b82f6' },
  medio:     { nombre: 'Centrocampista', color: '#22c55e' },
  delantero: { nombre: 'Delantero',      color: '#ef4444' },
};
export const POSICIONES = [
  { cod: 'PO',  nombre: 'Portero',               grupo: 'portero' },
  { cod: 'DFC', nombre: 'Defensa central',       grupo: 'defensa' },
  { cod: 'LD',  nombre: 'Lateral derecho',       grupo: 'defensa' },
  { cod: 'LI',  nombre: 'Lateral izquierdo',     grupo: 'defensa' },
  { cod: 'MCD', nombre: 'Mediocentro defensivo', grupo: 'medio' },
  { cod: 'MC',  nombre: 'Mediocentro',           grupo: 'medio' },
  { cod: 'MCO', nombre: 'Mediocentro ofensivo',  grupo: 'medio' },
  { cod: 'EI',  nombre: 'Extremo izquierdo',     grupo: 'delantero' },
  { cod: 'ED',  nombre: 'Extremo derecho',       grupo: 'delantero' },
  { cod: 'SD',  nombre: 'Segundo delantero',     grupo: 'delantero' },
  { cod: 'DC',  nombre: 'Delantero centro',      grupo: 'delantero' },
];
/** Datos de una posición por su código; si no existe, devuelve un gris neutro con el código tal cual. */
export function posInfo(cod) {
  const p = POSICIONES.find((x) => x.cod === cod);
  if (!p) return { cod: String(cod ?? '?'), nombre: String(cod ?? '?'), grupo: '', grupoNombre: '', color: '#9ca3af' };
  const g = GRUPOS[p.grupo];
  return { ...p, grupoNombre: g.nombre, color: g.color };
}
