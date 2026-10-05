// Página /tienda/: cartera (nivel + tokens), catálogo, inventario, cómo ganar, compra de tokens, historial y panel de admin.
// Esquema: pages/tienda → features/economia/api → core/economia (puro). Las reglas (precios, niveles, stock, edad) viven en la BD (049-051).
import { onSession, can } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { buscarPersonas } from '../features/social/api.js';
import * as api from '../features/economia/api.js';
import { CATEGORIAS, ORDEN_CATEGORIAS, formatoPrecio, formatoTokens, motivoNoComprable, vistaPrevia, textoTipo, validarItemAdmin } from '../core/economia.js';

const $ = (id) => document.getElementById(id);
// S.req = «versión» de la última carga (descarta respuestas viejas); S.busy = acción en curso (evita dobles clics).
const S = { tab: 'tienda', yo: null, listo: false, req: 0, busy: false, eco: null, items: [], reglas: [], pq: null, movs: [], ordenes: [], adm: null, admItems: [], edit: null, encontrados: [], cat: 'todas' };
const avisoError = (m) => { $('ti-error-txt').textContent = m; $('ti-error').hidden = !m; };
const vacio = (t) => `<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">${escapeHTML(t)}</div>`;
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const esAdmin = () => can('administrarTienda');

function carteraHTML() {
  const e = S.eco; if (!e) return '<p class="text-xs text-gray-400">Inicia sesión para ver tu nivel y tus tokens.</p>';
  return `<div class="flex flex-wrap items-center gap-4"><div><p class="text-[10px] uppercase tracking-widest text-gray-400 font-display">Nivel</p><p class="font-display font-extrabold text-3xl text-white">${e.nivel}</p></div>
    <div class="flex-1 min-w-[10rem]"><div class="h-2 rounded-full bg-galaxy-800 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(e.progreso * 100)}" aria-label="Progreso al siguiente nivel"><div class="h-full bg-gradient-to-r from-galaxy-400 to-cyan-300" style="width:${Math.round(e.progreso * 100)}%"></div></div>
      <p class="text-[11px] text-gray-400 mt-1">${formatoTokens(e.xp)} / ${formatoTokens(e.xpSiguiente)} XP para el nivel ${e.nivel + 1}</p></div>
    <div class="text-right"><p class="text-[10px] uppercase tracking-widest text-gray-400 font-display">Tokens</p><p class="font-display font-extrabold text-2xl ${e.saldo < 0 ? 'text-rose-300' : 'text-amber-300'}"><i class="fa-solid fa-coins"></i> ${formatoTokens(e.saldo)}</p></div></div>
    ${e.saldo < 0 ? '<p class="text-[11px] text-rose-300 mt-2">Tu saldo es negativo por un reembolso o disputa. Ganando tokens o comprando un paquete se compensa; mientras tanto no puedes comprar en la tienda.</p>' : ''}`;
}
function filtroHTML() {
  return `<div class="flex flex-wrap gap-2">${['todas', ...ORDEN_CATEGORIAS].map((c) => `<button type="button" data-cat="${c}" aria-pressed="${S.cat === c}" class="adv-chip !min-h-8">${c === 'todas' ? 'Todo' : CATEGORIAS[c].etiqueta}</button>`).join('')}</div>`;
}
function itemHTML(i) {
  const razon = S.eco ? motivoNoComprable(i, S.eco) : 'Inicia sesión';
  return `<article class="glass-panel rounded-2xl p-3 flex flex-col gap-2"><div class="h-14 flex items-center justify-center">${vistaPrevia(i)}</div>
    <div class="min-w-0"><h3 class="font-display font-bold text-white text-sm truncate">${escapeHTML(i.nombre)}</h3><p class="text-[11px] text-gray-400 line-clamp-2">${escapeHTML(i.descripcion)}</p>
    <p class="text-[10px] text-gray-500 mt-1">${CATEGORIAS[i.categoria].etiqueta}${i.nivelMin > 1 ? ` · Nivel ${i.nivelMin}+` : ''}${i.stock !== null ? ` · Quedan ${i.stock}` : ''}</p></div>
    <div class="mt-auto flex items-center gap-2"><span class="font-display font-extrabold text-amber-300 text-sm"><i class="fa-solid fa-coins"></i> ${formatoTokens(i.precio)}</span>
    <button type="button" data-comprar="${i.id}" class="btn btn-primary !min-h-8 !px-3 !text-[11px] ml-auto" ${razon ? 'disabled' : ''}>${razon ? escapeHTML(razon) : 'Comprar'}</button></div></article>`;
}
const tiendaHTML = () => {
  const l = S.items.filter((i) => S.cat === 'todas' || i.categoria === S.cat);
  return filtroHTML() + (l.length ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">${l.map(itemHTML).join('')}</div>` : vacio('No hay objetos en esta categoría.'));
};
function inventarioHTML() {
  if (!S.yo) return vacio('Inicia sesión para ver tu inventario.');
  if (!S.inv?.length) return vacio('Aún no tienes objetos. Visita la tienda.');
  return `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${S.inv.map((i) => `<article class="glass-panel rounded-2xl p-3 flex flex-col gap-2 ${i.equipado ? 'border border-galaxy-400/60' : ''}"><div class="h-14 flex items-center justify-center">${vistaPrevia(i)}</div>
    <h3 class="font-display font-bold text-white text-sm truncate">${escapeHTML(i.nombre)}</h3><p class="text-[10px] text-gray-500">${CATEGORIAS[i.categoria].etiqueta}</p>
    <button type="button" data-equipar="${i.id}" data-valor="${i.equipado ? 'no' : 'si'}" class="btn ${i.equipado ? 'btn-ghost' : 'btn-primary'} !min-h-8 !px-3 !text-[11px] mt-auto">${i.equipado ? 'Quitar' : 'Equipar'}</button></article>`).join('')}</div>`;
}
function ganarHTML() {
  if (!S.reglas.length) return vacio('Aún no hay reglas publicadas.');
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Cómo ganar XP y tokens</h3>
    <ul class="divide-y divide-galaxy-border/40 mt-2">${S.reglas.map((r) => `<li class="flex flex-wrap items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 text-white">${escapeHTML(r.descripcion || r.fuente)}</span>
      <span class="text-xs text-cyan-300">+${r.xp} XP</span><span class="text-xs text-amber-300">+${r.tokens} tokens</span>${r.topeDiario ? `<span class="text-[10px] text-gray-500">máx. ${r.topeDiario}/día</span>` : ''}</li>`).join('')}</ul>
    <p class="text-[11px] text-gray-400 mt-2">Los partidos solo cuentan cuando el resultado queda confirmado. Los tokens no se pueden transferir ni cambiar por dinero.</p></section>`;
}
function tokensHTML() {
  const p = S.pq; if (!p) return vacio('Cargando…');
  const aviso = '<p class="text-[11px] text-gray-400 mt-2">Los tokens son una moneda virtual del sitio: sirven solo para objetos cosméticos, no se transfieren entre personas ni se cambian por dinero. Compra reservada a mayores de 18 años con fecha de nacimiento declarada.</p>';
  if (!p.pagosActivos) return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-lock text-gray-400"></i> Compra de tokens</h3><p class="text-sm text-gray-300 mt-1">Todavía no está disponible. Mientras tanto, los tokens se ganan jugando.</p>${aviso}</section>`;
  if (!S.yo) return vacio('Inicia sesión para comprar tokens.');
  if (p.edad !== 'adulto') return `<section class="glass-panel rounded-2xl p-4"><p class="text-sm text-amber-200">La compra con dinero real es solo para mayores de 18 años con fecha de nacimiento declarada en tu perfil.</p></section>`;
  const terminos = p.terminosAceptados ? '' : `<form id="ti-terminos" class="mt-3 space-y-2"><label class="flex items-start gap-2 text-xs text-gray-300"><input type="checkbox" id="ti-acepto" class="mt-0.5"><span>Soy mayor de 18 años y acepto los términos de compra (versión ${escapeHTML(p.version)}): los tokens son virtuales, no reembolsables salvo lo que exija la ley, no canjeables por dinero y solo sirven para cosméticos.</span></label><button class="btn btn-primary !min-h-9 !px-3 !text-xs" type="submit">Aceptar y continuar</button></form>`;
  const lista = p.terminosAceptados ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">${p.paquetes.map((k) => `<article class="rounded-xl border border-galaxy-border p-3 text-center"><p class="font-display font-extrabold text-amber-300 text-lg"><i class="fa-solid fa-coins"></i> ${formatoTokens(k.tokens)}</p><p class="text-xs text-gray-300">${escapeHTML(k.nombre)}</p><button type="button" data-paquete="${k.id}" class="btn btn-primary !min-h-9 !px-3 !text-xs mt-2 w-full">${formatoPrecio(k.precioCentimos, k.moneda)}</button></article>`).join('')}</div>` : '';
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Comprar tokens</h3>${terminos}${lista}${aviso}</section>`;
}
function historialHTML() {
  if (!S.yo) return vacio('Inicia sesión para ver tu historial.');
  const m = S.movs.length ? `<ul class="divide-y divide-galaxy-border/40">${S.movs.map((x) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 text-white">${escapeHTML(textoTipo(x.tipo))} <span class="text-[10px] text-gray-500">${escapeHTML(fecha(x.fecha))}</span></span><span class="font-display font-bold ${x.delta > 0 ? 'text-emerald-300' : 'text-rose-300'}">${x.delta > 0 ? '+' : ''}${x.delta}</span><span class="text-[10px] text-gray-500 w-16 text-right">saldo ${x.saldoDespues}</span></li>`).join('')}</ul>` : '<p class="text-xs text-gray-500">Sin movimientos todavía.</p>';
  const o = S.ordenes.length ? `<h4 class="font-display font-bold text-white text-xs uppercase tracking-wider mt-4 mb-1">Órdenes de compra</h4><ul class="divide-y divide-galaxy-border/40">${S.ordenes.map((x) => `<li class="flex items-center gap-2 py-2 text-xs text-gray-300"><span class="flex-1">${escapeHTML(x.paquete)} · ${formatoPrecio(x.monto_centimos, x.moneda)}</span><span>${escapeHTML(x.estado)}</span></li>`).join('')}</ul>` : '';
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider mb-1">Movimientos de tokens</h3>${m}${o}</section>`;
}
function adminHTML() {
  if (!esAdmin()) return vacio('Solo el administrador.');
  const r = S.adm; if (!r) return vacio('Cargando…');
  const e = S.edit || { clave: '', nombre: '', descripcion: '', categoria: 'marco', precio: 100, nivelMin: 1, stock: '', color: '#ffc828', color2: '', texto: '', icono: '', activo: true, id: null };
  const resumen = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Resumen</h3>
    <p class="text-xs text-gray-300 mt-1">Tokens en circulación: <b>${formatoTokens(r.tokens_en_circulacion)}</b> · Billeteras negativas: <b>${r.billeteras_negativas}</b> · Ingresos confirmados: <b>${formatoPrecio(r.ingresos_centimos)}</b></p>
    <p class="text-xs text-gray-300 mt-1">Órdenes: ${escapeHTML(JSON.stringify(r.ordenes))}</p>
    <label class="flex items-center gap-2 text-sm text-white mt-3"><input type="checkbox" id="ti-pagos" ${r.pagos_activos ? 'checked' : ''}> Compras con dinero real activas <span class="text-[10px] text-gray-500">(requiere pasarela conectada)</span></label></section>`;
  const items = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Catálogo</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${S.admItems.map((i) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 truncate ${i.activo ? 'text-white' : 'text-gray-500 line-through'}">${escapeHTML(i.nombre)} <span class="text-[10px] text-gray-500">${i.categoria} · ${i.precio}</span></span><button type="button" data-editar-item="${i.id}" class="btn btn-ghost !min-h-7 !px-2 !text-[10px]">Editar</button></li>`).join('')}</ul></section>`;
  const f = `<form id="ti-item" class="glass-panel rounded-2xl p-4 grid grid-cols-2 gap-2"><h3 class="col-span-2 font-display font-bold text-white text-sm uppercase tracking-wider">${e.id ? 'Editar objeto' : 'Nuevo objeto'}</h3>
    <input id="ai-clave" class="field" placeholder="clave_unica" maxlength="40" value="${escapeHTML(e.clave)}" ${e.id ? 'readonly' : ''}><input id="ai-nombre" class="field" placeholder="Nombre" maxlength="40" value="${escapeHTML(e.nombre)}">
    <input id="ai-desc" class="field col-span-2" placeholder="Descripción" maxlength="200" value="${escapeHTML(e.descripcion)}">
    <select id="ai-cat" class="field" ${e.id ? 'disabled' : ''}>${ORDEN_CATEGORIAS.map((c) => `<option value="${c}" ${e.categoria === c ? 'selected' : ''}>${CATEGORIAS[c].etiqueta}</option>`).join('')}</select>
    <input id="ai-precio" type="number" min="0" class="field" placeholder="Precio" value="${e.precio}"><input id="ai-nivel" type="number" min="1" max="100" class="field" placeholder="Nivel mínimo" value="${e.nivelMin}"><input id="ai-stock" type="number" min="0" class="field" placeholder="Stock (vacío = ilimitado)" value="${e.stock ?? ''}">
    <input id="ai-color" class="field" placeholder="Color #RRGGBB" value="${escapeHTML(e.color ?? '')}"><input id="ai-color2" class="field" placeholder="Color 2 (opcional)" value="${escapeHTML(e.color2 ?? '')}">
    <input id="ai-texto" class="field" placeholder="Texto (títulos)" value="${escapeHTML(e.texto ?? '')}"><input id="ai-icono" class="field" placeholder="Icono fa-crown (insignias)" value="${escapeHTML(e.icono ?? '')}">
    <label class="col-span-2 text-xs text-gray-300 flex items-center gap-2"><input type="checkbox" id="ai-activo" ${e.activo ? 'checked' : ''}> Visible en la tienda</label>
    <p id="ai-error" hidden class="col-span-2 text-xs text-rose-300"></p>
    <div class="col-span-2 flex gap-2"><button class="btn btn-primary !min-h-9 !px-3 !text-xs" type="submit">Guardar</button>${e.id ? '<button type="button" id="ai-nuevo" class="btn btn-ghost !min-h-9 !px-3 !text-xs">Nuevo</button>' : ''}</div></form>`;
  const reglas = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Reglas de ganancia</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${S.reglas.map((x) => `<li><form data-regla="${escapeHTML(x.fuente)}" class="flex flex-wrap items-center gap-2 py-2 text-xs text-gray-300"><span class="flex-1 min-w-[8rem] text-white">${escapeHTML(x.fuente)}</span>
    XP <input name="xp" type="number" min="0" class="field !w-16 !min-h-8" value="${x.xp}"> Tokens <input name="tokens" type="number" min="0" class="field !w-16 !min-h-8" value="${x.tokens}"> Tope/día <input name="tope" type="number" min="0" class="field !w-16 !min-h-8" value="${x.topeDiario ?? ''}">
    <label><input name="activa" type="checkbox" ${x.activa ? 'checked' : ''}> activa</label><button class="btn btn-ghost !min-h-8 !px-2 !text-[10px]" type="submit">Guardar</button></form></li>`).join('')}</ul></section>`;
  const aj = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Ajustar tokens de una persona</h3>
    <form id="ti-buscar" class="flex gap-2 mt-2"><input id="ti-buscar-q" class="field flex-1 min-w-0" maxlength="40" placeholder="Buscar persona" aria-label="Buscar persona"><button class="btn btn-ghost !min-h-9 !px-3 !text-xs" type="submit">Buscar</button></form>
    <ul class="divide-y divide-galaxy-border/40 mt-1">${S.encontrados.map((u) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 truncate text-white">${escapeHTML(u.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(u.username)}</span></span><button type="button" data-ajustar="${escapeHTML(u.id)}" class="btn btn-ghost !min-h-8 !px-3 !text-[11px]">Ajustar</button></li>`).join('')}</ul></section>`;
  return resumen + items + f + reglas + aj;
}
function pintar() {
  $('ti-cartera').innerHTML = carteraHTML(); $('ti-tab-admin').hidden = !esAdmin();
  for (const b of $('ti-tabs').querySelectorAll('[data-tab]')) b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab));
  const v = { tienda: tiendaHTML, inventario: inventarioHTML, ganar: ganarHTML, tokens: tokensHTML, historial: historialHTML, admin: adminHTML }[S.tab] ?? tiendaHTML;
  $('ti-contenido').innerHTML = v();
}

// ── Carga ────────────────────────────────────────────────────────────────────────────────────────────────────
async function cargar() {
  const mi = ++S.req; avisoError('');
  const sesion = !!S.yo, pedir = (p, def) => p.catch((e) => { console.error('[tienda]', e); if (!S.fallo) S.fallo = e.message; return def; });
  S.fallo = '';
  const [items, reglas, pq, eco, inv, movs, ord, adm, admItems] = await Promise.all([
    pedir(api.tienda(), []), pedir(api.reglas(), []), pedir(api.paquetes(), null),
    sesion ? pedir(api.miEconomia(), null) : null, sesion ? pedir(api.miInventario(), []) : [], sesion ? pedir(api.movimientos(30), []) : [], sesion ? pedir(api.misOrdenes(), []) : [],
    sesion && esAdmin() ? pedir(api.adminResumen(), null) : null, sesion && esAdmin() ? pedir(api.adminItems(), []) : [],
  ]);
  if (mi !== S.req) return;
  Object.assign(S, { items, reglas, pq, eco, inv, movs, ordenes: Array.isArray(ord) ? ord : [], adm, admItems });
  if (S.fallo) avisoError(S.fallo);
  pintar();
}
async function hacer(fn, ok) {
  if (S.busy) return; S.busy = true;
  try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok, 'ok'); await cargar(); }
  catch (e) { console.error('[tienda] acción:', e); toast(e?.message || 'No se pudo completar la acción.', 'error'); }
  finally { S.busy = false; }
}

// ── Eventos ──────────────────────────────────────────────────────────────────────────────────────────────────
$('ti-contenido').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.cat) { S.cat = d.cat; pintar(); }
  else if (d.comprar) { const i = S.items.find((x) => x.id === Number(d.comprar)); if (i && window.confirm(`¿Comprar «${i.nombre}» por ${i.precio} tokens?`)) hacer(() => api.comprar(i.id), (r) => `¡Listo! Te quedan ${r?.saldo ?? ''} tokens.`); }
  else if (d.equipar) hacer(() => api.equipar(Number(d.equipar), d.valor === 'si'), d.valor === 'si' ? 'Equipado.' : 'Quitado.');
  else if (d.paquete) hacer(() => api.crearOrden(Number(d.paquete)), 'Orden creada. El pago se completará en la pasarela (aún por conectar).');
  else if (d.editarItem) { const i = S.admItems.find((x) => x.id === Number(d.editarItem)); if (i) { S.edit = { id: i.id, clave: i.clave, nombre: i.nombre, descripcion: i.descripcion, categoria: i.categoria, precio: i.precio, nivelMin: i.nivelMin, stock: i.stock, color: i.estilo.color, color2: i.estilo.color2, texto: i.estilo.texto, icono: i.estilo.icono, activo: i.activo }; pintar(); } }
  else if (b.id === 'ai-nuevo') { S.edit = null; pintar(); }
  else if (d.ajustar) {
    const delta = Number(window.prompt('Cantidad de tokens a sumar (negativa para restar):')); if (!Number.isInteger(delta) || delta === 0) return;
    const motivo = (window.prompt('Motivo (queda en la auditoría):') || '').trim(); if (!motivo) return;
    hacer(() => api.adminAjustar(d.ajustar, delta, motivo), 'Ajuste aplicado (queda en la auditoría).');
  }
});
$('ti-contenido').addEventListener('change', (ev) => { if (ev.target.id === 'ti-pagos') { const v = ev.target.checked; hacer(() => api.adminPagos(v), v ? 'Pagos activados.' : 'Pagos desactivados.'); } });
$('ti-contenido').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target;
  if (f.id === 'ti-terminos') { if (!$('ti-acepto').checked) { toast('Marca la casilla para continuar.', 'error'); return; } hacer(() => api.aceptarTerminos(), 'Términos aceptados.'); }
  else if (f.id === 'ti-item') {
    const v = validarItemAdmin({ clave: $('ai-clave').value.trim(), nombre: $('ai-nombre').value, descripcion: $('ai-desc').value, categoria: $('ai-cat').value, precio: $('ai-precio').value, nivelMin: $('ai-nivel').value, stock: $('ai-stock').value, color: $('ai-color').value.trim(), color2: $('ai-color2').value.trim(), texto: $('ai-texto').value.trim(), icono: $('ai-icono').value.trim(), activo: $('ai-activo').checked });
    const err = $('ai-error'); if (!v.ok) { err.textContent = v.error; err.hidden = false; return; } err.hidden = true;
    const id = S.edit?.id ?? null; await hacer(() => api.adminGuardarItem(v.valores, id), 'Objeto guardado (queda en la auditoría).'); if (!S.fallo) S.edit = null; pintar();
  } else if (f.dataset.regla) {
    const g = new FormData(f), tope = String(g.get('tope') ?? '').trim();
    hacer(() => api.adminRegla({ fuente: f.dataset.regla, xp: Number(g.get('xp')), tokens: Number(g.get('tokens')), topeDiario: tope === '' ? null : Number(tope), activa: g.get('activa') === 'on' }), 'Regla guardada (queda en la auditoría).');
  } else if (f.id === 'ti-buscar') {
    const q = $('ti-buscar-q').value.trim(); if (q.length < 2) { toast('Escribe al menos 2 letras.', 'error'); return; }
    try { S.encontrados = await buscarPersonas(q, 8); pintar(); if (!S.encontrados.length) toast('No hay resultados.', 'error'); } catch (e) { console.error('[tienda] buscar:', e); toast('No se pudo buscar.', 'error'); }
  }
});
$('ti-tabs').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (!b || b.dataset.tab === S.tab) return; S.tab = b.dataset.tab; pintar(); });
$('ti-reintentar').addEventListener('click', cargar);
onSession(({ session }) => {
  const id = session?.user?.id ?? null;
  const adm = esAdmin();
  if (S.listo && id === S.yo && adm === S.adminVisto) { pintar(); return; }
  S.listo = true; S.yo = id; S.adminVisto = adm; S.eco = null; cargar();
});
