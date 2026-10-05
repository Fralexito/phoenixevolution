// SISTEMA DE DIVISIONES (BETA). Aquí se configura todo; la lógica vive en js/core/temporada.js y la página en pages/temporada.astro.
// Para ACTIVAR la Segunda División de verdad:
//   1) agrega la liga a data/ligas.js con id 'ascenso' (Central y Liga la dibujan solas),
//   2) agrega su edición en data/ligaResultados.js → EDICIONES.ascenso (mismo formato que galaxy),
//   3) la página Temporada usa esa tabla en lugar de la de ejemplo (DEMO_SEGUNDA) automáticamente.
export const SISTEMA = {
  nombre: 'Sistema de Divisiones',
  temporada: '2026',
  divisiones: [
    { nivel: 1, ligaId: 'galaxy', liga: 'Galaxy League', nombre: 'Primera División', corto: 'Liga 1', icono: 'fa-crown' },
    { nivel: 2, ligaId: 'ascenso', liga: 'Segunda División', nombre: 'Segunda División', corto: 'Liga 2', icono: 'fa-seedling' },
  ],
  // Valores iniciales de los controles (el visitante puede cambiarlos en la página para simular).
  inicial: { suben: 2, copa1: 4, copa2: 4 },
  copa: { nombre: 'Copa Interdivisional', icono: 'fa-trophy', formato: 'Eliminación directa a partido único; si empatan, penales.' },
  // Resultados de la copa: se leen de Supabase (tabla copa_resultados, los edita el admin en /temporada/). Esto es solo el respaldo si la base no responde.
  resultadosCopa: {},
};

// TABLA DE EJEMPLO de la Segunda División: SOLO para que la beta se pueda probar antes de que exista la liga real. Nombres genéricos a propósito.
export const DEMO_SEGUNDA = [
  { nombre: 'Aspirante 1', pts: 21, pj: 9, dg: 14 }, { nombre: 'Aspirante 2', pts: 19, pj: 9, dg: 9 }, { nombre: 'Aspirante 3', pts: 16, pj: 9, dg: 5 },
  { nombre: 'Aspirante 4', pts: 14, pj: 9, dg: 1 }, { nombre: 'Aspirante 5', pts: 11, pj: 9, dg: -3 }, { nombre: 'Aspirante 6', pts: 8, pj: 9, dg: -7 },
  { nombre: 'Aspirante 7', pts: 5, pj: 9, dg: -9 }, { nombre: 'Aspirante 8', pts: 3, pj: 9, dg: -10 },
];

// SISTEMA PROPIO de las ligas independientes (no se mezcla con Galaxy/Segunda). Cada una tiene sus zonas y su propia escalera de divisiones.
export const SISTEMAS_LIGA = {
  sudario: {
    nombre: 'Sistema de Divisiones · Sudario',
    divisiones: [
      { nivel: 1, nombre: 'División Sudario', corto: 'Div. 1', icono: 'fa-star' },
      { nivel: 2, nombre: 'División de Ascenso Sudario', corto: 'Div. 2', icono: 'fa-seedling' },
    ],
    // suben: 0 → de momento no hay zona de ascenso (la División 2 de Sudario aún no existe); el descenso y la copa sí funcionan.
    suben: 0, bajan: 2, copa: 4,
  },
};
