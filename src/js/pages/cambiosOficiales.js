// Página «Cambios oficiales» (migración 125): formulario único (tipo + Base normal / Liga Máster / Las dos + datos) e historial.
// Lógica pura: core/cambiosOficiales.js · Datos: features/cambios/api.js · Tipos: features/cambios/<tipo>.js (126 y 127 añaden los suyos aquí).
import { onSession, isAdmin, isStaff } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { DESTINOS, tiposDisponibles, tipoRegistrado, ESTADO_LADO, resumenResultados, resumenFichaje, mensajeError } from '../core/cambiosOficiales.js';
import * as api from '../features/cambios/api.js';
import '../features/cambios/fichaje.js';
// ← enchufes: aquí importan sus tipos las sesiones 126 (stats/info) y 127 (dinero/valor).

const $ = (id) => document.getElementById(id);
const st = { tipos: [], tipo: null, destino: 'base', cambios: [], hayMas: false, listo: false, enviando: false };
const ctx = () => ({ tipo: st.tipo, destino: st.destino });

function pintarOpciones() {
  $('cf-tipos').innerHTML = st.tipos.map((t) => `<button type="button" role="radio" class="sy-op" data-tipo="${t.tipo}" aria-checked="${t.tipo === st.tipo}"><b>${esc(t.etiqueta)}</b></button>`).join('')
    || '<p class="sy-ayuda">No hay tipos de cambio encendidos.</p>';
  const permitidos = st.tipos.find((t) => t.tipo === st.tipo)?.destinos ?? [];
  if (!permitidos.includes(st.destino)) st.destino = permitidos[0] ?? 'base';
  $('cf-destinos').innerHTML = DESTINOS.filter((d) => permitidos.includes(d.id)).map((d) =>
    `<button type="button" role="radio" class="sy-op" data-destino="${d.id}" aria-checked="${d.id === st.destino}"><b>${d.id === st.destino ? '☑' : '☐'} ${esc(d.nombre)}</b><small>${esc(d.ayuda)}</small></button>`).join('');
}
async function pintarCampos() {
  const t = tipoRegistrado(st.tipo);
  if (!t) { $('cf-campos').innerHTML = ''; return; }
  await t.pintar($('cf-campos'), ctx());
}

function chips(lista) {
  return lista.length ? lista.map((r) => `<span class="cf-chip" data-tono="${r.tono}">${r.n} · ${esc(r.texto)}</span>`).join(' ') : '<span class="cf-chip" data-tono="apagado">Ningún PC ha informado aún</span>';
}
function lado(nombre, estado, lista) {
  if (estado === 'no_aplica') return '';
  const e = ESTADO_LADO[estado] ?? ESTADO_LADO.no_aplica;
  return `<div class="cf-lado"><b>${esc(nombre)}</b> <span class="cf-chip" data-tono="${e.tono}">${esc(e.texto)}</span> ${estado === 'publicado' || lista.length ? chips(lista) : ''}</div>`;
}
function pintarHistorial() {
  if (!st.cambios.length) { $('cf-historial').innerHTML = '<p class="sy-vacio">Todavía no hay cambios oficiales. El primero que mandes aparecerá aquí.</p>'; $('cf-mas').hidden = true; return; }
  $('cf-historial').innerHTML = `<ul class="sy-lista">${st.cambios.map((c) => {
    const res = resumenResultados(c.resultados);
    const que = c.tipo === 'fichaje' ? resumenFichaje(c.datos) : c.tipo;
    const destino = DESTINOS.find((d) => d.id === c.destino)?.nombre ?? c.destino;
    return `<li class="cf-cambio" data-anulado="${c.estado === 'anulado'}">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><b>#${c.seq} · ${esc(que)}</b>
        <small class="sy-ayuda">${esc(destino)} · ${esc(c.autor_nombre || 'Staff')} · ${esc(new Date(c.creado).toLocaleString('es-PE'))}</small></div>
      ${c.nota ? `<p class="sy-ayuda">${esc(c.nota)}</p>` : ''}
      ${c.estado === 'anulado' ? `<p><span class="cf-chip" data-tono="mal">Anulado${c.motivo_anulacion ? `: ${esc(c.motivo_anulacion)}` : ''}</span></p>` : ''}
      ${lado('Base normal', c.estado_base, res.base)}${lado('Liga Máster', c.estado_lm, res.lm)}
      ${c.estado === 'activo' && isAdmin() ? `<button type="button" class="btn btn-ghost cf-anular" data-id="${esc(c.id)}"><i class="fa-solid fa-ban"></i> Anular</button>` : ''}
    </li>`;
  }).join('')}</ul>`;
  $('cf-mas').hidden = !st.hayMas;
}
async function cargarHistorial(mas = false) {
  try {
    const antes = mas && st.cambios.length ? st.cambios[st.cambios.length - 1].seq : null;
    const lote = await api.historialCambios(30, antes);
    st.cambios = mas ? [...st.cambios, ...lote] : lote;
    st.hayMas = lote.length === 30;
    pintarHistorial();
  } catch (e) { $('cf-historial').innerHTML = `<p class="sy-aviso">${esc(e.message)}</p>`; }
}

async function enviar(ev) {
  ev.preventDefault();
  if (st.enviando) return;
  const t = tipoRegistrado(st.tipo);
  if (!t) return;
  $('cf-error').hidden = true;
  let datos;
  try { datos = t.leer(ctx()); } catch (e) { $('cf-error').textContent = e.message; $('cf-error').hidden = false; return; }
  const destino = DESTINOS.find((d) => d.id === st.destino)?.nombre;
  const que = st.tipo === 'fichaje' ? resumenFichaje(datos) : t.etiqueta;
  if (!(await confirmar(`${que}\n\nSe aplica a: ${destino}.\nLlegará solo al PES de todos los que usan Phoenix Link. ¿Lo mandas?`, { titulo: 'Mandar cambio oficial', aceptar: 'Sí, mandar' }))) return;
  st.enviando = true; $('cf-enviar').disabled = true;
  try {
    const r = await api.crearCambio(st.tipo, st.destino, datos, $('cf-nota').value.trim());
    toast(`Cambio #${r.seq} guardado${r.estado_base === 'publicado' ? ': ya va camino de los PCs' : ''}.`, 'success');
    t.limpiar?.(); $('cf-nota').value = '';
    await cargarHistorial();
  } catch (e) { $('cf-error').textContent = mensajeError(e); $('cf-error').hidden = false; }
  finally { st.enviando = false; $('cf-enviar').disabled = false; }
}

async function iniciar() {
  if (st.listo) return;
  st.listo = true;
  try { st.tipos = tiposDisponibles(await api.catalogoTipos()); }
  catch (e) { $('cf-error').textContent = e.message; $('cf-error').hidden = false; st.tipos = []; }
  st.tipo = st.tipos[0]?.tipo ?? null;
  pintarOpciones(); await pintarCampos();
  $('cf-tipos').addEventListener('click', async (ev) => { const b = ev.target.closest('[data-tipo]'); if (!b || b.dataset.tipo === st.tipo) return; st.tipo = b.dataset.tipo; pintarOpciones(); await pintarCampos(); });
  $('cf-destinos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-destino]'); if (!b) return; st.destino = b.dataset.destino; pintarOpciones(); tipoRegistrado(st.tipo)?.cambiarDestino?.(st.destino); });
  $('cf-form').addEventListener('submit', enviar);
  $('cf-recargar').addEventListener('click', () => cargarHistorial());
  $('cf-mas').addEventListener('click', () => cargarHistorial(true));
  $('cf-historial').addEventListener('click', async (ev) => {
    const b = ev.target.closest('.cf-anular'); if (!b) return;
    const motivo = await pedirTexto('Los PCs que aún no lo bajaron ya no lo recibirán. Lo que ya se aplicó se deshace con un cambio nuevo en sentido contrario. ¿Por qué lo anulas?', { titulo: 'Anular cambio', obligatorio: false, maximo: 300, aceptar: 'Anular' });
    if (motivo === null) return;
    try { await api.anularCambio(b.dataset.id, motivo); toast('Cambio anulado.', 'success'); await cargarHistorial(); } catch (e) { toast(e.message, 'error'); }
  });
  await cargarHistorial();
}

onSession(() => {
  const admin = isAdmin(), staff = isStaff();
  $('cf-sin-permiso').hidden = staff;
  $('cf-formulario').hidden = !admin;
  $('cf-historial-sec').hidden = !staff;
  if (staff) iniciar();
});
