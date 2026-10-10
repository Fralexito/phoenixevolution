// Página «Phoenix Sync»: interruptor (solo admin del grupo), fichajes con estado por miembro y permisos. Datos: features/sync/api.js. Lógica: core/sync.js.
import { onSession, isAdmin } from '../core/session.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto, elegir } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { MODOS, ESTADOS, ROLES, LEYENDA_MODO, AVISO_AUTOMATICO, modoSeguro, estadoDe, estadosDeOperacion, hace, lineaHistorial, terminoValido } from '../core/sync.js';
import * as api from '../features/sync/api.js';

const $ = (id) => document.getElementById(id);
const st = { yo: null, grupos: [], grupo: null, miembros: [], config: null, historial: [], ops: [], apl: [], nombres: {} };
const nom = (id) => st.nombres[id] ?? 'Jugador';
const soyAdminGrupo = () => st.miembros.some((m) => m.usuario_id === st.yo && m.rol === 'admin') || (isAdmin() && !!st.grupo);

function leyendaEstados() {
  $('sy-leyenda-estados').innerHTML = `<ul class="sy-leyenda">${Object.values(ESTADOS).map((e) => `<li data-tono="${e.tono}"><span aria-hidden="true">${e.icono}</span> <b>${esc(e.nombre)}</b> · ${esc(e.ayuda)}</li>`).join('')}</ul>`;
}

function pintarGrupos() {
  $('sy-grupos').innerHTML = st.grupos.length > 1 ? st.grupos.map((g) => `<button type="button" class="sy-tab" data-g="${g.id}" aria-pressed="${g.id === st.grupo}">${esc(g.nombre)}</button>`).join('') : '';
}
function pintarId() {
  const g = st.grupos.find((x) => x.id === st.grupo); if (!g) return;
  $('sy-id').innerHTML = `Código del grupo (se pega en Phoenix Sync): <code>${esc(g.id)}</code> <button type="button" class="btn btn-ghost" id="sy-copiar"><i class="fa-solid fa-copy"></i> Copiar</button>`;
}
function pintarModo() {
  const verlo = soyAdminGrupo();
  $('sy-modo').hidden = !verlo;
  if (!verlo) return;
  const modo = modoSeguro(st.config?.modo);
  $('sy-interruptor').innerHTML = Object.values(MODOS).map((m) => `<button type="button" class="sy-op" data-modo="${m.id}" aria-pressed="${m.id === modo}"><i class="fa-solid ${m.icono}" aria-hidden="true"></i><b>${esc(m.nombre)}</b><small>${esc(m.corto)}</small></button>`).join('');
  $('sy-modo-quien').textContent = st.config?.actualizado_en ? `Último cambio: ${nom(st.config.actualizado_por)} · ${hace(st.config.actualizado_en)}` : 'Aún no se ha cambiado: es el valor por defecto (Con autorización).';
  $('sy-modo-leyenda').textContent = LEYENDA_MODO;
  $('sy-aviso-auto').hidden = modo !== 'automatico';
  $('sy-aviso-auto').textContent = `⚠ ${AVISO_AUTOMATICO}`;
  $('sy-historial').innerHTML = st.historial.length ? `<details class="sy-det"><summary>Historial del interruptor</summary><ul>${st.historial.map((h) => `<li>${esc(lineaHistorial(h, st.nombres))} <small>· ${esc(hace(h.en))}</small></li>`).join('')}</ul></details>` : '';
}
function pintarOps() {
  if (!st.ops.length) { $('sy-ops').innerHTML = '<p class="sy-vacio">Todavía no hay fichajes compartidos. Cuando Phoenix Sync publique el primero, aparecerá aquí.</p>'; return; }
  $('sy-ops').innerHTML = `<ul class="sy-lista">${st.ops.map((op) => {
    const { filas } = estadosDeOperacion(op, st.apl, st.miembros);
    const chips = filas.map((f) => { const e = estadoDe(f.estado); return `<span class="sy-chip" data-tono="${e.tono}" title="${esc(e.nombre + (f.motivo ? ': ' + f.motivo : ''))}"><span aria-hidden="true">${e.icono}</span> ${esc(nom(f.usuario_id))}<span class="sy-sr"> ${esc(e.nombre)}</span></span>`; }).join('');
    return `<li class="sy-op-fila"><div class="sy-op-tit"><b>${esc(op.resumen || `Jugador ${op.jugador_id}: equipo ${op.equipo_origen} → ${op.equipo_destino}`)}</b>
      <small>#${op.seq} · por ${esc(nom(op.autor_usuario_id))} · ${esc(hace(op.creado_en))}${op.parche ? ` · ${esc(op.parche)}` : ''}${op.huella_bd ? ` · BD ${esc(op.huella_bd.slice(0, 8))}` : ''}</small></div>
      <div class="sy-chips">${chips || '<small>Sin destinatarios</small>'}</div></li>`;
  }).join('')}</ul>`;
}
function pintarPermisos() {
  const verlo = soyAdminGrupo(); $('sy-permisos').hidden = !verlo;
  if (!verlo) return;
  $('sy-miembros').innerHTML = `<ul class="sy-lista">${st.miembros.filter((m) => m.activo !== false).map((m) => `<li class="sy-miembro" data-u="${m.usuario_id}">
    <span class="sy-nombre"><b>${esc(nom(m.usuario_id))}</b><small>${esc(ROLES[m.rol]?.ayuda ?? '')}</small></span>
    <label class="sy-sel"><span class="sy-sr">Rol de ${esc(nom(m.usuario_id))}</span><select class="field" data-rol aria-label="Rol">
      ${['admin', 'publica', 'miembro'].map((r) => `<option value="${r}" ${m.rol === r ? 'selected' : ''}>${ROLES[r].nombre}</option>`).join('')}</select></label>
    <label class="tn-check"><input type="checkbox" data-aplica ${m.puede_aplicar || m.rol === 'admin' ? 'checked' : ''} ${m.rol === 'admin' ? 'disabled' : ''}> Aplica</label>
    ${m.usuario_id === st.yo ? '' : '<button type="button" class="btn btn-ghost" data-quitar aria-label="Quitar del grupo"><i class="fa-solid fa-user-minus"></i></button>'}</li>`).join('')}</ul>`;
}

async function cargarGrupo() {
  const g = st.grupo; if (!g) return;
  const [miembros, config, historial, ops] = await Promise.all([api.miembrosDe(g), api.configDe(g), api.historialDe(g).catch(() => []), api.operacionesDe(g)]);
  st.miembros = miembros; st.config = config; st.historial = historial; st.ops = ops;
  st.apl = await api.aplicacionesDe(ops.map((o) => o.id));
  st.nombres = await api.nombresDe([...miembros.map((m) => m.usuario_id), config?.actualizado_por, ...historial.map((h) => h.por), ...ops.map((o) => o.autor_usuario_id)]);
  pintarGrupos(); pintarId(); pintarModo(); pintarOps(); pintarPermisos();
}
async function cargar() {
  $('sy-sin-sesion').hidden = !!st.yo;
  $('sy-crear').hidden = !(st.yo && isAdmin());
  if (!st.yo) { $('sy-panel').hidden = true; $('sy-vacio').hidden = true; return; }
  try {
    st.grupos = await api.misGrupos();
    $('sy-vacio').hidden = st.grupos.length > 0; $('sy-panel').hidden = !st.grupos.length;
    $('sy-vacio').textContent = 'Todavía no estás en ningún grupo de Phoenix Sync. Pídele al admin que te añada con tu usuario de la web.';
    if (!st.grupos.some((g) => g.id === st.grupo)) st.grupo = st.grupos[0]?.id ?? null;
    await cargarGrupo();
  } catch (err) { toast(err.message, 'error'); }
}

async function elegirModo(modo) {
  if (modo === modoSeguro(st.config?.modo)) return;
  if (modo === 'automatico' && !(await confirmar(`${AVISO_AUTOMATICO} ¿Activar el modo Automático?`, { titulo: 'Modo automático', aceptar: 'Sí, activar', peligro: true }))) return;
  try { await api.cambiarModo(st.grupo, modo); toast(`Modo: ${MODOS[modo].nombre}`, 'ok'); await cargarGrupo(); } catch (err) { toast(err.message, 'error'); }
}
async function cambiarMiembro(fila, quitar) {
  const u = fila.dataset.u;
  try {
    if (quitar) { if (!(await confirmar('¿Quitar a esta persona del grupo?', { aceptar: 'Quitar', peligro: true }))) return; await api.quitarMiembro(st.grupo, u); }
    else await api.ponerMiembro(st.grupo, u, fila.querySelector('[data-rol]').value, fila.querySelector('[data-aplica]').checked);
    await cargarGrupo();
  } catch (err) { toast(err.message, 'error'); await cargarGrupo(); }
}

leyendaEstados();
$('sy-id').addEventListener('click', async (e) => { if (!e.target.closest('#sy-copiar')) return; try { await navigator.clipboard.writeText(st.grupo); toast('Código copiado', 'ok'); } catch { toast('No se pudo copiar: selecciónalo a mano.', 'warn'); } });
$('sy-grupos').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; st.grupo = b.dataset.g; cargarGrupo().catch((er) => toast(er.message, 'error')); });
$('sy-interruptor').addEventListener('click', (e) => { const b = e.target.closest('[data-modo]'); if (b) elegirModo(b.dataset.modo); });
$('sy-recargar').addEventListener('click', () => cargarGrupo().catch((er) => toast(er.message, 'error')));
$('sy-miembros').addEventListener('change', (e) => { const f = e.target.closest('.sy-miembro'); if (f) cambiarMiembro(f, false); });
$('sy-miembros').addEventListener('click', (e) => { const f = e.target.closest('.sy-miembro'); if (f && e.target.closest('[data-quitar]')) cambiarMiembro(f, true); });
$('sy-form-miembro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = $('sy-usuario').value.trim();
  if (!terminoValido(t)) { toast('Escribe al menos 2 letras del usuario o del nombre.', 'warn'); return; }
  try {
    const hallados = (await api.buscarUsuarios(t)).filter((p) => !st.miembros.some((m) => m.usuario_id === p.id && m.activo !== false));
    if (!hallados.length) { toast('No encontramos a nadie con ese nombre (o ya está en el grupo).', 'warn'); return; }
    let p = hallados[0];
    if (hallados.length > 1) {
      const id = await elegir('¿A quién quieres añadir?', hallados.map((x) => ({ valor: x.id, texto: x.nombre_display || x.username, detalle: `@${x.username}` })), { titulo: 'Añadir al grupo' });
      p = hallados.find((x) => x.id === id);
    }
    if (!p) return;
    await api.ponerMiembro(st.grupo, p.id, 'miembro', true); $('sy-usuario').value = ''; toast(`${p.nombre_display || p.username} añadido`, 'ok'); await cargarGrupo();
  } catch (err) { toast(err.message, 'error'); }
});
$('sy-nuevo').addEventListener('click', async () => {
  const n = await pedirTexto('Nombre del grupo (ej.: Fichajes FRALEX + amigo)', { titulo: 'Nuevo grupo', maximo: 60, aceptar: 'Crear' });
  if (!n) return;
  try { st.grupo = await api.crearGrupo(n); toast('Grupo creado en «Con autorización»', 'ok'); await cargar(); } catch (err) { toast(err.message, 'error'); }
});
onSession((s) => { const yo = s.session?.user?.id ?? null; if (yo !== st.yo || !st.grupos.length) { st.yo = yo; cargar(); } });
