// Lógica pura de unas pestañas: a qué pestaña ir según la tecla. Sin DOM (tiene prueba en tests/pestanas.test.mjs).
// Flecha derecha/izquierda dan la vuelta al llegar al final; Inicio/Fin van a la primera/última. Otra tecla = null (no hace nada).
export function pestanaSegunTecla(actual, total, tecla) {
  if (!(total > 0)) return null;
  if (tecla === 'ArrowRight') return (actual + 1) % total;
  if (tecla === 'ArrowLeft') return (actual - 1 + total) % total;
  if (tecla === 'Home') return 0;
  if (tecla === 'End') return total - 1;
  return null;
}
