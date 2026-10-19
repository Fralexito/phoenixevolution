// Interruptor del modo demostración (19-oct-2026; ver core/sistema/modoDemo.js). Lo carga boot.js cuando hay que mostrarlo (interruptorDemo()).
// Una píldora fija abajo a la izquierda (estilos: styles/modoDemo.css):
//   · con la demostración encendida: «Modo demostración · Ver datos reales» (deja claro que lo que se ve es simulado);
//   · apagada (solo en la beta): «Datos reales · Ver demo», más discreta (Fralex: «déjame intercambiar entre el modo demo y el modo normal»).
import { demoActivo, salirDeDemo, entrarDemo } from '../../core/sistema/modoDemo.js';

export function initAvisoDemo() {
  if (document.getElementById('px-demo')) return;
  const demo = demoActivo();
  const el = document.createElement('div');
  el.id = 'px-demo'; el.className = demo ? 'pxd' : 'pxd es-real'; el.setAttribute('role', 'status');
  el.innerHTML = demo
    ? `<span class="pxd-punto" aria-hidden="true"></span><b>Modo demostración</b><span class="pxd-txt">Datos simulados con actividad · lo que hagas sobre ellos no se guarda</span>
    <button type="button" class="pxd-salir" title="Ver la web con los datos reales">Ver datos reales</button>`
    : `<span class="pxd-punto" aria-hidden="true"></span><b>Datos reales</b>
    <button type="button" class="pxd-salir" title="Ver la web con datos simulados y actividad">Ver demo</button>`;
  el.querySelector('.pxd-salir').addEventListener('click', demo ? salirDeDemo : entrarDemo);
  document.body.append(el);
}
