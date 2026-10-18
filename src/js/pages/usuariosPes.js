// Página «Usuarios en PES» (migración 125): lista de PCs con Phoenix Link y el historial de cada una.
// Lógica pura: core/cambiosOficiales.js · Datos: features/cambios/api.js
import { onSession, isStaff } from '../core/session.js';
import { escapeHTML as esc } from '../core/dom.js';
import { frescura, versionMasNueva, compararVersion, lineaEvento, RESULTADO } from '../core/cambiosOficiales.js';
import * as api from '../features/cambios/api.js';

const $ = (id) => document.getElementById(id);
const st = { pcs: [], filtro: '', abierto: null, listo: false };

function pintar() {
  const f = st.filtro.toLowerCase();
  const lista = st.pcs.filter((p) => !f || [p.usuario_nombre, p.username, p.pc_nombre, p.parche, p.link_version].some((x) => String(x ?? '').toLowerCase().includes(f)));
  const nueva = versionMasNueva(st.pcs);
  const usuarios = new Set(st.pcs.map((p) => p.usuario)).size;
  const activas = st.pcs.filter((p) => frescura(p.ultimo_contacto).tono === 'bien').length;
  $('up-cuenta').textContent = `· ${st.pcs.length}`;
  $('up-resumen').textContent = st.pcs.length ? `${usuarios} usuario(s) · ${st.pcs.length} PC(s) · ${activas} conectada(s) ahora${nueva ? ` · versión más nueva de Link: ${nueva}` : ''}` : '';
  $('up-filas').innerHTML = lista.length ? lista.map((p) => {
    const fr = frescura(p.ultimo_contacto);
    const vieja = nueva && p.link_version && compararVersion(p.link_version, nueva) < 0;
    return `<tr data-pc="${esc(p.dispositivo)}" tabindex="0" aria-selected="${st.abierto === p.dispositivo}">
      <td><b>${esc(p.usuario_nombre)}</b>${p.username ? ` <small>@${esc(p.username)}</small>` : ''}</td>
      <td>${esc(p.pc_nombre ?? 'PC')}${p.revocado ? ' <span class="cf-chip" data-tono="mal">desvinculada</span>' : ''}</td>
      <td>${esc(p.link_version || '¿?')}${vieja ? ' <span class="cf-chip" data-tono="aviso">desactualizado</span>' : ''}</td>
      <td>${esc(p.parche || '—')}${p.base_huella ? ` <small title="Huella de su base">#${esc(p.base_huella.slice(0, 6))}</small>` : ''}</td>
      <td><span class="cf-chip" data-tono="${fr.tono}">${esc(fr.texto)}</span>${p.oficial === false ? ' <span class="cf-chip" data-tono="aviso">no recibe oficiales</span>' : ''}</td>
      <td>${p.aplicados}</td><td>${p.saltados}</td><td>${p.errores}</td></tr>`;
  }).join('') : `<tr><td colspan="8" class="sy-vacio">${st.pcs.length ? 'Nada coincide con la búsqueda.' : 'Ninguna PC ha informado todavía. Aparecen al abrir Phoenix Link 0.3.17 o más nuevo con la cuenta vinculada.'}</td></tr>`;
}

async function abrir(dispositivo) {
  st.abierto = dispositivo;
  const p = st.pcs.find((x) => x.dispositivo === dispositivo);
  $('up-detalle').hidden = false;
  $('up-detalle-nombre').textContent = p ? `${p.usuario_nombre} · ${p.pc_nombre ?? 'PC'}` : 'la PC';
  $('up-eventos').innerHTML = '<div class="esqueleto h-16"></div>';
  pintar();
  try {
    const ev = await api.historialPc(dispositivo, 200);
    $('up-eventos').innerHTML = ev.length ? `<ul class="sy-lista">${ev.map((e) => {
      const tono = e.tipo === 'contacto' ? 'apagado' : (RESULTADO[e.resultado]?.tono ?? 'apagado');
      return `<li class="up-evento"><span class="cf-chip" data-tono="${tono}">${esc(new Date(e.creado).toLocaleString('es-PE'))}</span> ${esc(lineaEvento(e))}</li>`;
    }).join('')}</ul>` : '<p class="sy-vacio">Sin historial todavía.</p>';
    $('up-detalle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) { $('up-eventos').innerHTML = `<p class="sy-aviso">${esc(e.message)}</p>`; }
}

async function cargar() {
  try { st.pcs = await api.listaPcs(); pintar(); }
  catch (e) { $('up-filas').innerHTML = `<tr><td colspan="8"><p class="sy-aviso">${esc(e.message)}</p></td></tr>`; }
}

function iniciar() {
  if (st.listo) return;
  st.listo = true;
  $('up-filtro').addEventListener('input', () => { st.filtro = $('up-filtro').value.trim(); pintar(); });
  $('up-recargar').addEventListener('click', cargar);
  $('up-filas').addEventListener('click', (ev) => { const tr = ev.target.closest('tr[data-pc]'); if (tr) abrir(tr.dataset.pc); });
  $('up-filas').addEventListener('keydown', (ev) => { const tr = ev.target.closest('tr[data-pc]'); if (tr && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); abrir(tr.dataset.pc); } });
  cargar();
}

onSession((s) => {
  const dentro = !!s.session;
  $('up-sin-sesion').hidden = dentro;
  $('up-panel').hidden = !dentro;
  if (!dentro) return;
  if (!isStaff()) $('up-filtro').placeholder = 'Buscar en mis PCs';
  iniciar();
});
