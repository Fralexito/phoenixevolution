// Aviso del modo demostración (19-oct-2026; ver core/sistema/modoDemo.js). Lo carga boot.js SOLO con el modo encendido.
// Una píldora fija arriba: deja claro que lo que se ve es simulado y se sale con un toque. Estilos: styles/modoDemo.css.
import { salirDeDemo } from '../../core/sistema/modoDemo.js';

export function initAvisoDemo() {
  if (document.getElementById('px-demo')) return;
  const el = document.createElement('div');
  el.id = 'px-demo'; el.className = 'pxd'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="pxd-punto" aria-hidden="true"></span><b>Modo demostración</b><span class="pxd-txt">Datos simulados con actividad · no se guarda nada</span>
    <button type="button" class="pxd-salir">Salir</button>`;
  el.querySelector('.pxd-salir').addEventListener('click', salirDeDemo);
  document.body.append(el);
}
