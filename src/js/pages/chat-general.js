// Página «Chat general»: lee y escribe el chat global (el mismo de Phoenix Link). Lógica: core/chatGeneral.js · datos: features/chatGeneral/api.js.
import { onSession, can } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { estadoEscritura, fusionar, insignia, horaCorta, MAX_TEXTO } from '../core/chatGeneral.js';
import * as api from '../features/chatGeneral/api.js';

const $ = (id) => document.getElementById(id);
const SONDEO_MS = 6000;
const ESPERA_MS = 3000;
const st = { yo: null, lista: [], ultimoId: 0, timer: null, cargando: false, primera: true, hasta: 0, enf: null };
const esMod = () => can('moderarChat');

function filaHTML(m) {
  const ins = insignia(m.rol); const mio = m.usuario_id === st.yo;
  return `<li class="cg-msg${mio ? ' cg-mio' : ''}" data-id="${m.id}"><div class="cg-cab"><b>${esc(m.nombre)}</b>${ins ? `<span class="cg-ins" data-tono="${ins.tono}">${esc(ins.texto)}</span>` : ''}<small>${esc(horaCorta(m.creado_en))}</small>${esMod() ? `<button type="button" class="cg-borrar" data-borrar="${m.id}" aria-label="Borrar este mensaje" title="Borrar"><i class="fa-solid fa-trash"></i></button>` : ''}</div><p>${esc(m.texto)}</p></li>`;
}
function pintar(bajar) {
  const ol = $('cg-lista');
  const pegado = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
  ol.innerHTML = st.lista.length ? st.lista.map(filaHTML).join('') : '<li class="cg-vacio">Todavía no hay mensajes. ¡Rompe el hielo!</li>';
  if (bajar || pegado) { ol.scrollTop = ol.scrollHeight; $('cg-nuevos').hidden = true; } else $('cg-nuevos').hidden = false;
}
async function refrescar(forzarBajar = false) {
  if (!st.yo || st.cargando || document.hidden) return;
  st.cargando = true;
  try {
    const r = await api.listar(st.ultimoId, 50);
    const f = fusionar(st.lista, r);
    const cambio = f.hayNuevos || f.lista.length !== st.lista.length;
    st.lista = f.lista; st.ultimoId = f.ultimoId;
    if (cambio || st.primera) pintar(forzarBajar || st.primera);
    st.primera = false;
  } catch (e) { if (st.primera) $('cg-lista').innerHTML = `<li class="cg-vacio">${esc(e.message)}</li>`; }
  finally { st.cargando = false; }
}
function arrancar() { clearInterval(st.timer); st.timer = setInterval(refrescar, SONDEO_MS); refrescar(true); }

function actualizarCuenta() {
  const e = estadoEscritura($('cg-texto').value);
  $('cg-cuenta').textContent = `${e.restan} caracteres restantes`; $('cg-cuenta').dataset.mal = e.restan < 0 ? '1' : '';
  $('cg-enviar').disabled = !e.puede || Date.now() < st.hasta;
}
function enfriar() {
  st.hasta = Date.now() + ESPERA_MS;
  const btn = $('cg-enviar'); const base = st.base || btn.innerHTML; st.base = base;
  clearInterval(st.enf);
  const paso = () => {
    const resta = Math.ceil((st.hasta - Date.now()) / 1000);
    if (resta <= 0) { clearInterval(st.enf); btn.innerHTML = base; actualizarCuenta(); return; }
    btn.innerHTML = `${base.replace(/ Enviar/, '')} ${resta}s`; btn.disabled = true;
  };
  st.enf = setInterval(paso, 250); paso();
}
async function enviar(ev) {
  ev.preventDefault();
  const e = estadoEscritura($('cg-texto').value); if (!e.puede || Date.now() < st.hasta) return;
  $('cg-enviar').disabled = true;
  try { await api.enviar(e.limpio); enfriar(); $('cg-texto').value = ''; actualizarCuenta(); await refrescar(true); }
  catch (err) { toast(err.message, 'error', { key: 'cg-error' }); if (/LIMITE_EXCEDIDO|DEMASIADOS/.test(String(err.code || err.message))) enfriar(); else actualizarCuenta(); }
}
async function borrar(id) {
  if (!(await confirmar('¿Borrar este mensaje? También desaparece en Phoenix Link.', { titulo: 'Borrar mensaje', aceptar: 'Borrar', peligro: true }))) return;
  const motivo = await pedirTexto('Motivo (opcional, queda en la auditoría)', { titulo: 'Motivo', obligatorio: false, maximo: 200, aceptar: 'Guardar' });
  if (motivo === null) return;
  try { await api.borrar(id, motivo || null); st.lista = st.lista.filter((m) => m.id !== id); pintar(false); toast('Mensaje borrado', 'ok'); } catch (err) { toast(err.message, 'error'); }
}

$('cg-form').addEventListener('submit', enviar);
$('cg-texto').addEventListener('input', actualizarCuenta);
$('cg-texto').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('cg-form').requestSubmit(); } });
$('cg-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-borrar]'); if (b) borrar(Number(b.dataset.borrar)); });
$('cg-nuevos').addEventListener('click', () => { const ol = $('cg-lista'); ol.scrollTop = ol.scrollHeight; $('cg-nuevos').hidden = true; });
$('cg-lista').addEventListener('scroll', () => { const ol = $('cg-lista'); if (ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60) $('cg-nuevos').hidden = true; });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refrescar(); });
$('cg-texto').setAttribute('maxlength', String(MAX_TEXTO + 100));
actualizarCuenta();
onSession((s) => {
  const yo = s.session?.user?.id ?? null;
  $('cg-sin-sesion').hidden = !!yo; $('cg-caja').hidden = !yo;
  if (yo !== st.yo) { st.yo = yo; st.lista = []; st.ultimoId = 0; st.primera = true; if (yo) arrancar(); else clearInterval(st.timer); }
});
