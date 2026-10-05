// Ventanas (modales) de moderación: reportar, ocultar/mostrar, sancionar y pedir una nota. Reutilizadas por el muro, el chat, el perfil y /moderacion/.
// Esquema: este archivo (DOM + eventos) → api (RPC) + vista (HTML) → core/moderacion (validación pura). La base de datos repite TODAS las reglas.
import { openModal, closeModal } from '../../core/modal.js';
import { toast } from '../../core/toast.js';
import { validarReporte, validarNota, validarSancion, NOTA_OCULTAR_MAX, NOTA_SANCION_MAX } from '../../core/moderacion.js';
import * as api from './api.js';
import { reportarHTML, ocultarHTML, sancionarHTML, notaHTML } from './vista.js';

const ID = 'mod-modal';

function mostrarErrores(m, lista) {
  m.querySelector('#mod-err')?.replaceChildren(...lista.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
}

/** Conecta el formulario del modal: `leer()` devuelve {ok, error?, ...datos}; `enviar(datos)` hace la llamada. Evita doble clic y muestra el error de la BD dentro del modal. */
function conectar(m, { leer, enviar, ok, onListo }) {
  m.querySelector('#mod-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = leer(m); if (!v.ok) { mostrarErrores(m, [v.error]); return; }
    mostrarErrores(m, []);
    const btn = m.querySelector('#mod-enviar'); btn.disabled = true;
    try { await enviar(v); toast(ok, 'ok'); closeModal(ID); await onListo?.(); }
    catch (err) { mostrarErrores(m, [err?.message || 'No se pudo completar la acción.']); }
    finally { btn.disabled = false; }
  });
}

/** «Reportar» (cualquier persona con sesión). */
export function abrirReportar({ tipo, objetivo, titulo = '', onListo } = {}) {
  const m = openModal(reportarHTML({ tipo, titulo }), { id: ID });
  conectar(m, {
    leer: (mm) => validarReporte({ tipo, objetivo, motivo: mm.querySelector('input[name="motivo"]:checked')?.value, detalle: mm.querySelector('#mod-detalle').value }),
    enviar: (v) => api.reportar(v.tipo, v.objetivo, v.motivo, v.detalle),
    ok: 'Reporte enviado. Gracias: el equipo lo revisará.', onListo,
  });
  return m;
}

/** «Ocultar» o «Mostrar de nuevo» un contenido (moderador+). */
export function abrirOcultar({ tipo, id, titulo = '', ocultar = true, onListo } = {}) {
  const m = openModal(ocultarHTML({ tipo, titulo, ocultar }), { id: ID });
  conectar(m, {
    leer: (mm) => validarNota(mm.querySelector('#mod-nota').value, { max: NOTA_OCULTAR_MAX }),
    enviar: (v) => api.ocultarContenido(tipo, id, ocultar, v.valor),
    ok: ocultar ? 'Contenido ocultado.' : 'Contenido visible de nuevo.', onListo,
  });
  return m;
}

/** «Sancionar» una cuenta (moderador+, solo a rangos menores). */
export function abrirSancionar({ usuario, reporte = null, baneoPermitido = true, onListo } = {}) {
  const m = openModal(sancionarHTML({ nombre: usuario.nombre, rol: usuario.rol, baneoPermitido }), { id: ID });
  const cajaDias = m.querySelector('#mod-dias-caja');
  const refrescar = () => { cajaDias.hidden = m.querySelector('input[name="tipo"]:checked')?.value !== 'suspension'; };
  m.addEventListener('change', (ev) => { if (ev.target.name === 'tipo') refrescar(); });
  refrescar();
  conectar(m, {
    leer: (mm) => validarSancion({ tipo: mm.querySelector('input[name="tipo"]:checked')?.value, dias: mm.querySelector('#mod-dias').value, motivo: mm.querySelector('#mod-nota').value }),
    enviar: (v) => api.sancionar(usuario.id, v.tipo, v.dias, v.motivo, reporte),
    ok: 'Sanción aplicada. La persona recibirá un aviso.', onListo,
  });
  return m;
}

/** Pide una nota y ejecuta `hacer(nota)` (resolver, descartar, levantar sanción). */
export function abrirNota({ titulo, sub = '', accion, obligatoria = true, max = NOTA_OCULTAR_MAX, hacer, ok = 'Listo.', onListo } = {}) {
  const m = openModal(notaHTML({ titulo, sub, accion, obligatoria, max }), { id: ID });
  conectar(m, { leer: (mm) => validarNota(mm.querySelector('#mod-nota').value, { max, obligatoria }), enviar: (v) => hacer(v.valor), ok, onListo });
  return m;
}

export { NOTA_SANCION_MAX };
