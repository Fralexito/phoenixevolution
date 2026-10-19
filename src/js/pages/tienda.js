// Página /tienda/: cartera (nivel + tokens), catálogo, inventario, cómo ganar, compra de tokens, historial y panel de admin.
// Esquema: pages/tienda → features/economia/api → core/economia (puro). Las reglas (precios, niveles, stock, edad) viven en la BD (049-051).
import { vacioHTML } from '../core/sistema/vacio.js';
import { rafaga } from '../features/dopamina.js';
import { onSession, can } from '../core/sistema/session.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { openModal, closeModal } from '../core/sistema/modal.js';
import { buscarPersonas } from '../features/social/api.js';
import * as api from '../features/economia/api.js';
import * as rec from '../features/economia/recargas.js';
import * as pase from '../features/economia/pase.js';
import { CATEGORIAS, ORDEN_CATEGORIAS, RAREZAS, formatoPrecio, formatoTokens, motivoNoComprable, vistaPrevia, textoTipo, textoLimitada, validarItemAdmin, EFECTOS_CARTA, PATRONES_BANNER } from '../core/economia/economia.js';
import { SONIDOS_CHAT } from '../core/comunidad/sonidosChat.js';
import { initSonidosChat } from '../features/sonidosChat.js';
import * as gan from '../features/economia/ganar.js';

const $ = (id) => document.getElementById(id);
// S.req = «versión» de la última carga (descarta respuestas viejas); S.busy = acción en curso (evita dobles clics).
const S = { tab: 'tienda', yo: null, listo: false, req: 0, busy: false, eco: null, items: [], reglas: [], pq: null, movs: [], ordenes: [], adm: null, admItems: [], edit: null, encontrados: [], cat: 'todas', metodos: [], pagosManuales: [], admPagos: [], admMetodos: [], alertas: [], mfa: null, auditoria: null, ganar: null };
const avisoError = (m) => { $('ti-error-txt').textContent = m; $('ti-error').hidden = !m; };
const vacio = (t) => vacioHTML(t, { icono: 'fa-store' });
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const demoAdmin = api.esDemo() && new URLSearchParams(location.search).get('admin') !== 'no';
const esAdmin = () => demoAdmin || can('administrarTienda');

function carteraHTML() {
  const e = S.eco; if (!e) return '<p class="text-xs text-gray-400">Inicia sesión para ver tu nivel, tus ascuas y tus gemas.</p>';
  return `<div class="flex flex-wrap items-center gap-4"><div><p class="text-[12px] uppercase tracking-widest text-gray-400 font-display">Nivel</p><p class="font-display font-extrabold text-3xl text-white">${e.nivel}</p></div>
    <div class="flex-1 min-w-[10rem]"><div class="h-2 rounded-full bg-galaxy-800 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(e.progreso * 100)}" aria-label="Progreso al siguiente nivel"><div class="h-full bg-gradient-to-r from-galaxy-400 to-cyan-300" style="width:${Math.round(e.progreso * 100)}%"></div></div>
      <p class="text-[12px] text-gray-400 mt-1">${formatoTokens(e.xp)} / ${formatoTokens(e.xpSiguiente)} XP para el nivel ${e.nivel + 1}</p></div>
    <div class="flex gap-5 text-right"><div><p class="text-[12px] uppercase tracking-widest text-gray-400 font-display">Ascuas</p><p class="font-display font-extrabold text-2xl ${e.saldo < 0 ? 'text-rose-300' : 'text-amber-300'}" title="Se ganan jugando"><i class="fa-solid fa-fire"></i> ${formatoTokens(e.saldo)}</p></div>
      <div><p class="text-[12px] uppercase tracking-widest text-gray-400 font-display">Gemas</p><p class="font-display font-extrabold text-2xl ${e.gemas < 0 ? 'text-rose-300' : 'text-cyan-300'}" title="Se compran con dinero real"><i class="fa-solid fa-gem"></i> ${formatoTokens(e.gemas)}</p></div></div></div>
    ${e.saldo < 0 || e.gemas < 0 ? '<p class="text-[12px] text-rose-300 mt-2">Tu saldo es negativo por un reembolso o disputa. Ganando ascuas o comprando gemas se compensa; mientras tanto no puedes comprar con esa moneda.</p>' : ''}`;
}
function filtroHTML() {
  return `<div class="flex flex-wrap gap-2">${['todas', ...ORDEN_CATEGORIAS].map((c) => `<button type="button" data-cat="${c}" aria-pressed="${S.cat === c}" class="adv-chip !min-h-8">${c === 'todas' ? 'Todo' : CATEGORIAS[c].etiqueta}</button>`).join('')}</div>`;
}
/** Botón de compra con una moneda: muestra el precio; si no se puede, queda apagado y dice por qué (la base decide de verdad). */
function botonCompra(i, moneda) {
  const precio = moneda === 'gemas' ? i.precioGemas : i.precioAscuas; if (precio == null) return '';
  const razon = S.eco ? motivoNoComprable(i, S.eco, moneda) : 'Inicia sesión', gem = moneda === 'gemas';
  return `<button type="button" data-comprar="${i.id}" data-moneda="${moneda}" title="${razon ? escapeHTML(razon) : 'Comprar con ' + moneda}" class="btn ${gem ? 'btn-primary' : 'btn-ghost'} !min-h-8 !px-3 !text-[12px] w-full justify-center ${razon ? 'opacity-60' : ''}" ${razon ? 'disabled' : ''}>
    <i class="fa-solid ${gem ? 'fa-gem text-cyan-200' : 'fa-fire text-amber-300'}"></i> ${formatoTokens(precio)}${razon && S.eco ? ` · <span class="font-normal">${escapeHTML(razon)}</span>` : ''}</button>`;   // sin sesión ya lo dice el aviso de arriba: no se repite «Inicia sesión» en cada botón (19-oct-2026)
}
function itemHTML(i) {
  const r = RAREZAS[i.rareza] ?? RAREZAS.comun, lim = i.limitadaHasta ? textoLimitada(i.limitadaHasta) : '';
  return `<article class="glass-panel rounded-2xl p-3 flex flex-col gap-2"><div class="h-14 flex items-center justify-center">${vistaPrevia(i)}</div>
    <div class="min-w-0"><div class="flex flex-wrap gap-1 mb-1"><span class="text-[11px] font-display font-bold uppercase tracking-wider border rounded-full px-2 ${r.clase}">${r.etiqueta}</span>${lim ? `<span class="text-[11px] font-display font-bold uppercase tracking-wider border rounded-full px-2 text-rose-300 border-rose-300/50">Limitada</span>` : ''}</div>
    <h3 class="font-display font-bold text-white text-sm truncate">${escapeHTML(i.nombre)}</h3><p class="text-[12px] text-gray-400 line-clamp-2">${escapeHTML(i.descripcion)}</p>
    <p class="text-[12px] text-gray-500 mt-1">${CATEGORIAS[i.categoria].etiqueta}${i.nivelMin > 1 ? ` · Nivel ${i.nivelMin}+` : ''}${i.stock !== null ? ` · Quedan ${i.stock}` : ''}</p>${lim ? `<p class="text-[12px] text-rose-300">${escapeHTML(lim)}</p>` : ''}</div>
    <div class="mt-auto flex flex-col gap-1.5">${i.tengo ? '<p class="text-xs text-emerald-300 text-center py-1"><i class="fa-solid fa-circle-check"></i> Ya lo tienes</p>' : ['ascuas', 'gemas'].map((m) => botonCompra(i, m)).join('')}</div></article>`;
}
const tiendaHTML = () => {
  const l = S.items.filter((i) => S.cat === 'todas' || i.categoria === S.cat);
  return filtroHTML() + (l.length ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">${l.map(itemHTML).join('')}</div>` : vacio('No hay objetos en esta categoría.'));
};
function inventarioHTML() {
  if (!S.yo) return vacio('Inicia sesión para ver tu inventario.');
  if (!S.inv?.length) return vacio('Aún no tienes objetos. Visita la tienda.');
  return `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${S.inv.map((i) => `<article class="glass-panel rounded-2xl p-3 flex flex-col gap-2 ${i.equipado ? 'border border-galaxy-400/60' : ''}"><div class="h-14 flex items-center justify-center">${vistaPrevia(i)}</div>
    <h3 class="font-display font-bold text-white text-sm truncate">${escapeHTML(i.nombre)}</h3><p class="text-[12px] text-gray-500">${CATEGORIAS[i.categoria].etiqueta}</p>
    <button type="button" data-equipar="${i.id}" data-valor="${i.equipado ? 'no' : 'si'}" class="btn ${i.equipado ? 'btn-ghost' : 'btn-primary'} !min-h-8 !px-3 !text-[12px] mt-auto">${i.equipado ? 'Quitar' : 'Equipar'}</button></article>`).join('')}</div>`;
}
function ganarHTML() {
  if (!S.reglas.length) return gan.ganarExtraHTML() || vacio('Aún no hay reglas publicadas.');
  return gan.ganarExtraHTML() + `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Cómo ganar XP y ascuas</h3>
    <ul class="divide-y divide-galaxy-border/40 mt-2">${S.reglas.map((r) => `<li class="flex flex-wrap items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 text-white">${escapeHTML(r.descripcion || r.fuente)}</span>
      <span class="text-xs text-cyan-300">+${r.xp} XP</span><span class="text-xs text-amber-300">+${r.tokens} ascuas</span>${r.topeDiario ? `<span class="text-[12px] text-gray-500">máx. ${r.topeDiario}/día</span>` : ''}</li>`).join('')}</ul>
    <p class="text-[12px] text-gray-400 mt-2">Los partidos solo cuentan cuando el resultado queda confirmado. Las ascuas no se pueden transferir ni cambiar por dinero. Las gemas se compran en la pestaña «Comprar gemas».</p></section>`;
}
// La pestaña «Comprar gemas» vive en features/economia/recargas.js (paquetes, métodos de pago, comprobante y mis recargas).
const tokensHTML = () => rec.recargasHTML();
function historialHTML() {
  if (!S.yo) return vacio('Inicia sesión para ver tu historial.');
  const m = S.movs.length ? `<ul class="divide-y divide-galaxy-border/40">${S.movs.map((x) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 text-white">${escapeHTML(textoTipo(x.tipo))} <span class="text-[12px] text-gray-500">${escapeHTML(fecha(x.fecha))}</span></span><span class="font-display font-bold ${x.delta > 0 ? 'text-emerald-300' : 'text-rose-300'}">${x.delta > 0 ? '+' : ''}${x.delta}</span><span class="text-[12px] text-gray-500 w-16 text-right">saldo ${x.saldoDespues}</span></li>`).join('')}</ul>` : '<p class="text-xs text-gray-500">Sin movimientos todavía.</p>';
  const o = S.ordenes.length ? `<h4 class="font-display font-bold text-white text-xs uppercase tracking-wider mt-4 mb-1">Órdenes de compra</h4><ul class="divide-y divide-galaxy-border/40">${S.ordenes.map((x) => `<li class="flex items-center gap-2 py-2 text-xs text-gray-300"><span class="flex-1">${escapeHTML(x.paquete)} · ${formatoPrecio(x.monto_centimos, x.moneda)}</span><span>${escapeHTML(x.estado)}</span></li>`).join('')}</ul>` : '';
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider mb-1">Movimientos de ascuas y gemas</h3>${m}${o}</section>`;
}
function adminHTML() {
  if (!esAdmin()) return vacio('Solo el administrador.');
  const r = S.adm; if (!r) return vacio('Cargando…');
  const e = S.edit || { clave: '', nombre: '', descripcion: '', categoria: 'marco', precio: 100, nivelMin: 1, stock: '', color: '#ffc828', color2: '', texto: '', icono: '', activo: true, id: null };
  const resumen = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Resumen</h3>
    <p class="text-xs text-gray-300 mt-1">Tokens en circulación: <b>${formatoTokens(r.tokens_en_circulacion)}</b> · Billeteras negativas: <b>${r.billeteras_negativas}</b> · Ingresos confirmados: <b>${formatoPrecio(r.ingresos_centimos)}</b></p>
    <p class="text-xs text-gray-300 mt-1">Órdenes: ${escapeHTML(JSON.stringify(r.ordenes))}</p>
    <label class="flex items-center gap-2 text-sm text-white mt-3"><input type="checkbox" id="ti-pagos" ${r.pagos_activos ? 'checked' : ''}> Compras con dinero real activas <span class="text-[12px] text-gray-500">(requiere pasarela conectada)</span></label></section>`;
  const items = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Catálogo</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${S.admItems.map((i) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 truncate ${i.activo ? 'text-white' : 'text-gray-500 line-through'}">${escapeHTML(i.nombre)} <span class="text-[12px] text-gray-500">${i.categoria} · ${i.precio}</span></span><button type="button" data-editar-item="${i.id}" class="btn btn-ghost !min-h-7 !px-2 !text-[12px]">Editar</button></li>`).join('')}</ul></section>`;
  const f = `<form id="ti-item" class="glass-panel rounded-2xl p-4 grid grid-cols-2 gap-2"><h3 class="col-span-2 font-display font-bold text-white text-sm uppercase tracking-wider">${e.id ? 'Editar objeto' : 'Nuevo objeto'}</h3>
    <input id="ai-clave" class="field" placeholder="clave_unica" maxlength="40" value="${escapeHTML(e.clave)}" ${e.id ? 'readonly' : ''}><input id="ai-nombre" class="field" placeholder="Nombre" maxlength="40" value="${escapeHTML(e.nombre)}">
    <input id="ai-desc" class="field col-span-2" placeholder="Descripción" maxlength="200" value="${escapeHTML(e.descripcion)}">
    <select id="ai-cat" class="field" ${e.id ? 'disabled' : ''}>${ORDEN_CATEGORIAS.map((c) => `<option value="${c}" ${e.categoria === c ? 'selected' : ''}>${CATEGORIAS[c].etiqueta}</option>`).join('')}</select>
    <input id="ai-precio" type="number" min="0" class="field" placeholder="Precio" value="${e.precio}"><input id="ai-nivel" type="number" min="1" max="100" class="field" placeholder="Nivel mínimo" value="${e.nivelMin}"><input id="ai-stock" type="number" min="0" class="field" placeholder="Stock (vacío = ilimitado)" value="${e.stock ?? ''}">
    <input id="ai-color" class="field" placeholder="Color #RRGGBB" value="${escapeHTML(e.color ?? '')}"><input id="ai-color2" class="field" placeholder="Color 2 (opcional)" value="${escapeHTML(e.color2 ?? '')}">
    <input id="ai-texto" class="field" placeholder="Texto (títulos)" value="${escapeHTML(e.texto ?? '')}"><input id="ai-icono" class="field" placeholder="Icono fa-crown (insignias)" value="${escapeHTML(e.icono ?? '')}">
    <select id="ai-efecto" class="field"><option value="">Efecto (efectos de carta)</option>${Object.entries(EFECTOS_CARTA).map(([k, v]) => `<option value="${k}" ${e.efecto === k ? 'selected' : ''}>${escapeHTML(typeof v === 'string' ? v : v.etiqueta)}</option>`).join('')}</select><select id="ai-patron" class="field"><option value="">Patrón (banners)</option>${Object.entries(PATRONES_BANNER).map(([k, v]) => `<option value="${k}" ${e.patron === k ? 'selected' : ''}>${escapeHTML(typeof v === 'string' ? v : v.etiqueta)}</option>`).join('')}</select>
    <div class="col-span-2"><select id="ai-sonido" class="field w-full"><option value="">Sonido (sonidos de chat)</option>${Object.entries(SONIDOS_CHAT).map(([k, v]) => `<option value="${k}" ${e.sonido === k ? 'selected' : ''}>${escapeHTML(typeof v === 'string' ? v : v.etiqueta)}</option>`).join('')}</select></div>
    <label class="col-span-2 text-xs text-gray-300 flex items-center gap-2"><input type="checkbox" id="ai-activo" ${e.activo ? 'checked' : ''}> Visible en la tienda</label>
    <p id="ai-error" hidden class="col-span-2 text-xs text-rose-300"></p>
    <div class="col-span-2 flex gap-2"><button class="btn btn-primary !min-h-9 !px-3 !text-xs" type="submit">Guardar</button>${e.id ? '<button type="button" id="ai-nuevo" class="btn btn-ghost !min-h-9 !px-3 !text-xs">Nuevo</button>' : ''}</div></form>`;
  const reglas = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Reglas de ganancia</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${S.reglas.map((x) => `<li><form data-regla="${escapeHTML(x.fuente)}" class="flex flex-wrap items-center gap-2 py-2 text-xs text-gray-300"><span class="flex-1 min-w-[8rem] text-white">${escapeHTML(x.fuente)}</span>
    XP <input name="xp" type="number" min="0" class="field !w-16 !min-h-8" value="${x.xp}"> Tokens <input name="tokens" type="number" min="0" class="field !w-16 !min-h-8" value="${x.tokens}"> Tope/día <input name="tope" type="number" min="0" class="field !w-16 !min-h-8" value="${x.topeDiario ?? ''}">
    <label><input name="activa" type="checkbox" ${x.activa ? 'checked' : ''}> activa</label><button class="btn btn-ghost !min-h-8 !px-2 !text-[12px]" type="submit">Guardar</button></form></li>`).join('')}</ul></section>`;
  const aj = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Ajustar tokens de una persona</h3>
    <button type="button" data-ajustar="${escapeHTML(S.yo)}" class="btn btn-primary !min-h-9 !px-3 !text-xs mt-2"><i class="fa-solid fa-coins"></i> Ajustarme a mí</button>
    <form id="ti-buscar" class="flex gap-2 mt-2"><input id="ti-buscar-q" class="field flex-1 min-w-0" maxlength="40" placeholder="Buscar persona" aria-label="Buscar persona"><button class="btn btn-ghost !min-h-9 !px-3 !text-xs" type="submit">Buscar</button></form>
    <ul class="divide-y divide-galaxy-border/40 mt-1">${S.encontrados.map((u) => `<li class="flex items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-0 truncate text-white">${escapeHTML(u.nombre)} <span class="text-gray-500 text-xs">@${escapeHTML(u.username)}</span></span><button type="button" data-ajustar="${escapeHTML(u.id)}" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]">Ajustar</button></li>`).join('')}</ul></section>`;
  return resumen + rec.adminRecargasHTML() + items + f + reglas + aj;
}
function pintar() {
  $('ti-cartera').innerHTML = carteraHTML(); $('ti-tab-admin').hidden = !esAdmin();
  for (const b of $('ti-tabs').querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === S.tab));
  const v = { tienda: tiendaHTML, inventario: inventarioHTML, ganar: ganarHTML, tokens: tokensHTML, pase: pase.paseHTML, historial: historialHTML, admin: adminHTML }[S.tab] ?? tiendaHTML;
  $('ti-contenido').innerHTML = v();
}

// ── Carga ────────────────────────────────────────────────────────────────────────────────────────────────────
async function cargar() {
  const mi = ++S.req; avisoError('');
  const sesion = !!S.yo, pedir = (p, def) => p.catch((e) => { console.error('[tienda]', e); if (!S.fallo) S.fallo = e.message; return def; });
  S.fallo = '';
  const [items, reglas, pq, eco, inv, movs, ord, adm, admItems, extra, bonus, extraPase] = await Promise.all([
    pedir(api.tienda(), []), pedir(api.reglas(), []), pedir(api.paquetes(), null),
    sesion ? pedir(api.miEconomia(), null) : null, sesion ? pedir(api.miInventario(), []) : [], sesion ? pedir(api.movimientos(30), []) : [], sesion ? pedir(api.misOrdenes(), []) : [],
    sesion && esAdmin() ? pedir(api.adminResumen(), null) : null, sesion && esAdmin() ? pedir(api.adminItems(), []) : [],
    rec.cargarDatos(sesion, esAdmin(), pedir), gan.cargarDatos(sesion, pedir), pase.cargarDatos(),
  ]);
  if (mi !== S.req) return;
  Object.assign(S, { items, reglas, pq, eco, inv, movs, ordenes: Array.isArray(ord) ? ord : [], adm, admItems, ...extra, ...bonus, ...extraPase });
  if (S.fallo) avisoError(S.fallo);
  pintar();
}
async function hacer(fn, ok) {
  if (S.busy) return; S.busy = true;
  try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok, 'ok'); await cargar(); }
  catch (e) { console.error('[tienda] acción:', e); toast(e?.message || 'No se pudo completar la acción.', 'error'); rec.manejarError(e); }
  finally { S.busy = false; }
}


// ── Ventanas propias (en lugar de los cuadros del navegador) ──────────────────────────────────────────────────
const cabecera = (titulo) => `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">${escapeHTML(titulo)}</h3><button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button></div>`;
function modalCompra(i, moneda = 'ascuas') {
  const gem = moneda === 'gemas', precio = gem ? i.precioGemas : i.precioAscuas, icono = gem ? 'fa-gem text-cyan-300' : 'fa-fire text-amber-300', nombreMoneda = gem ? 'gemas' : 'ascuas';
  if (precio == null) return;
  const despues = (gem ? (S.eco?.gemas ?? 0) : (S.eco?.saldo ?? 0)) - precio;
  openModal(`<div class="p-5 sm:p-6 space-y-4">${cabecera('Confirmar compra')}
    <div class="flex items-center gap-4"><div class="w-20 h-14 flex items-center justify-center shrink-0">${vistaPrevia(i)}</div><div class="min-w-0"><p class="font-display font-bold text-white">${escapeHTML(i.nombre)}</p><p class="text-xs text-gray-400">${escapeHTML(i.descripcion)}</p></div></div>
    <dl class="text-sm space-y-1"><div class="flex justify-between"><dt class="text-gray-400">Precio</dt><dd class="font-display font-bold text-white"><i class="fa-solid ${icono}"></i> ${formatoTokens(precio)} ${nombreMoneda}</dd></div>
      <div class="flex justify-between"><dt class="text-gray-400">Te quedarán</dt><dd class="text-white font-display font-bold">${formatoTokens(despues)} ${nombreMoneda}</dd></div></dl>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="button" id="tm-ok" class="btn btn-primary">Comprar</button></div></div>`, { id: 'tienda-modal' })
    .querySelector('#tm-ok').addEventListener('click', () => { closeModal('tienda-modal'); const origen = document.querySelector(`[data-comprar="${i.id}"]`); hacer(() => api.comprar(i.id, moneda), (r) => { rafaga(origen, ['🛒', '✨', '🎉', '⭐'], { n: 12 }); return `¡Listo! Te quedan ${gem ? (r?.gemas ?? '') : (r?.saldo ?? '')} ${nombreMoneda}.`; }); });
}
function modalAjuste(usuario, nombre) {
  const m = openModal(`<form id="tm-form" class="p-5 sm:p-6 space-y-4" novalidate>${cabecera('Ajustar tokens')}
    <p class="text-xs text-gray-400">Persona: <b class="text-white">${escapeHTML(nombre)}</b>. El ajuste queda en la auditoría.</p>
    <div><label class="label" for="tm-delta">Cantidad (negativa para restar)</label><input id="tm-delta" type="number" step="1" class="field" placeholder="500" required></div>
    <div><label class="label" for="tm-motivo">Motivo</label><input id="tm-motivo" class="field" maxlength="200" placeholder="Ej: prueba de la tienda"></div>
    <p id="tm-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Aplicar</button></div></form>`, { id: 'tienda-modal' });
  m.querySelector('#tm-delta').focus();
  m.querySelector('#tm-form').addEventListener('submit', (ev) => {
    ev.preventDefault(); const delta = Number(m.querySelector('#tm-delta').value), motivo = m.querySelector('#tm-motivo').value.trim(), err = m.querySelector('#tm-err');
    if (!Number.isInteger(delta) || delta === 0) { err.textContent = 'Escribe un número entero distinto de cero.'; err.hidden = false; return; }
    if (!motivo) { err.textContent = 'El motivo es obligatorio.'; err.hidden = false; return; }
    closeModal('tienda-modal'); hacer(() => api.adminAjustar(usuario, delta, motivo), 'Ajuste aplicado (queda en la auditoría).');
  });
}

rec.iniciar({ S, hacer, cargar, esAdmin });
pase.iniciar({ S, hacer, cargar });
initSonidosChat();   // botones «Escuchar» de los sonidos de chat (solo suenan al pulsarlos)
gan.iniciar({ S, hacer });

// ── Eventos ──────────────────────────────────────────────────────────────────────────────────────────────────
$('ti-contenido').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return; const d = b.dataset;
  if (rec.click(ev)) return; // recargas: paquetes, comprobantes y revisión de pagos
  if (gan.click(ev)) return; // cómo ganar: racha diaria, misiones y logros
  if (pase.click(ev)) return; // Phoenix Pass: comprar el pase y reclamar premios
  if (d.cat) { S.cat = d.cat; pintar(); }
  else if (d.comprar) { const i = S.items.find((x) => x.id === Number(d.comprar)); if (i) modalCompra(i, d.moneda === 'gemas' ? 'gemas' : 'ascuas'); }
  else if (d.equipar) hacer(() => api.equipar(Number(d.equipar), d.valor === 'si').then((r) => { import('../features/efectosCarta.js').then((m) => m.olvidarEfectosCarta()); return r; }), d.valor === 'si' ? 'Equipado.' : 'Quitado.');
  else if (d.editarItem) { const i = S.admItems.find((x) => x.id === Number(d.editarItem)); if (i) { S.edit = { id: i.id, clave: i.clave, nombre: i.nombre, descripcion: i.descripcion, categoria: i.categoria, precio: i.precio, nivelMin: i.nivelMin, stock: i.stock, color: i.estilo.color, color2: i.estilo.color2, texto: i.estilo.texto, icono: i.estilo.icono, efecto: i.estilo.efecto, patron: i.estilo.patron, sonido: i.estilo.sonido, activo: i.activo }; pintar(); } }
  else if (b.id === 'ai-nuevo') { S.edit = null; pintar(); }
  else if (d.ajustar) modalAjuste(d.ajustar, d.ajustar === S.yo ? 'Tú' : (S.encontrados.find((u) => u.id === d.ajustar)?.nombre ?? 'esta persona'));
});
$('ti-contenido').addEventListener('change', (ev) => { if (ev.target.id === 'ti-pagos') { const v = ev.target.checked; hacer(() => api.adminPagos(v), v ? 'Pagos activados.' : 'Pagos desactivados.'); } });
$('ti-contenido').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target;
  if (rec.submit(ev)) return; // recargas: métodos de pago y precios por moneda
  if (f.id === 'ti-terminos') { if (!$('ti-acepto').checked) { toast('Marca la casilla para continuar.', 'error'); return; } hacer(() => api.aceptarTerminos(), 'Términos aceptados.'); }
  else if (f.id === 'ti-item') {
    const v = validarItemAdmin({ clave: $('ai-clave').value.trim(), nombre: $('ai-nombre').value, descripcion: $('ai-desc').value, categoria: $('ai-cat').value, precio: $('ai-precio').value, nivelMin: $('ai-nivel').value, stock: $('ai-stock').value, color: $('ai-color').value.trim(), color2: $('ai-color2').value.trim(), texto: $('ai-texto').value.trim(), icono: $('ai-icono').value.trim(), efecto: $('ai-efecto').value, patron: $('ai-patron').value, sonido: $('ai-sonido').value, activo: $('ai-activo').checked });
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
if (api.esDemo()) { S.listo = true; S.yo = 'demo'; S.adminVisto = esAdmin(); cargar(); } // demostración (solo desarrollo): sin sesión real
else onSession(({ session }) => {
  const id = session?.user?.id ?? null;
  const adm = esAdmin();
  if (S.listo && id === S.yo && adm === S.adminVisto) { pintar(); return; }
  S.listo = true; S.yo = id; S.adminVisto = adm; S.eco = null; cargar();
});
