// Página /ajustes/: refleja los ajustes en los interruptores y guarda cada cambio.
import { leerAjustes, cambiarAjuste } from '../features/ajustes.js';

const mov = document.getElementById('aj-movimiento'); const vivo = document.getElementById('aj-vivo'); const estado = document.getElementById('aj-estado');
function pintar() { const a = leerAjustes(); if (mov) mov.checked = a.movimiento === 'reducido'; if (vivo) vivo.checked = a.vivo; }
function guardar(clave, valor) {
  const { guardado } = cambiarAjuste(clave, valor);
  if (estado) estado.textContent = guardado ? 'Guardado en este navegador.' : 'Aplicado, pero tu navegador no permite guardarlo (modo privado o bloqueado).';
}
mov?.addEventListener('change', () => guardar('movimiento', mov.checked ? 'reducido' : 'normal'));
vivo?.addEventListener('change', () => guardar('vivo', vivo.checked));
pintar();
