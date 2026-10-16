// Recargas de gemas: pestaña «Comprar gemas» del jugador y paneles del administrador (cola de pagos, métodos, precios por moneda, auditoría).
// Esquema: pages/tienda → features/economia/recargas → features/economia/api → core/economia (puro). Reglas reales en la base (migraciones 108-110).
// Hoy solo hay pago MANUAL (Yape/Plin/transferencia con revisión del admin); las pasarelas se añadirán como métodos nuevos sin tocar esta pantalla.
import { escapeHTML } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { openModal, closeModal } from '../../core/modal.js';
import { vacioHTML } from '../../core/vacio.js';
import * as api from './api.js';
import * as mfa from './mfa.js';
import { formatoPrecio, formatoTokens, gemasPorSol, textoEstadoRecarga } from '../../core/economia.js';

let C = null; // contexto que entrega la página: { S, hacer, cargar, pintar, esAdmin }
export const iniciar = (ctx) => { C = ctx; mfa.iniciar(ctx); };
const vacio = (t) => vacioHTML(t, { icono: 'fa-gem' });
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const TONO = { ok: 'text-emerald-300', espera: 'text-amber-300', falta: 'text-cyan-300', mal: 'text-rose-300' };
const cab = (t) => `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">${escapeHTML(t)}</h3><button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white px-2"><i class="fa-solid fa-xmark"></i></button></div>`;
const CODIGO = /^[A-Za-z0-9-]{4,40}$/;
const nombreMetodo = (clave) => C.S.metodos.find((m) => m.clave === clave)?.nombre ?? C.S.admMetodos.find((m) => m.clave === clave)?.nombre ?? clave;

/** Datos que se piden/guardan según el proveedor del método (clave del JSON → etiqueta). */
const CAMPO_DATO = { yape: ['yape', 'Número de Yape'], plin: ['plin', 'Número de Plin'], banco: ['cuenta', 'Cuenta o CCI'] };

export async function cargarDatos(sesion, admin, pedir) {
  const [metodos, pagosManuales, admPagos, admMetodos, alertas, seguridad] = await Promise.all([
    sesion ? pedir(api.metodosPago(), []) : [], sesion ? pedir(api.misPagosManuales(), []) : [],
    sesion && admin ? pedir(api.adminPagosManuales('en_revision'), []) : [], sesion && admin ? pedir(api.adminMetodos(), []) : [],
    sesion && admin ? pedir(api.adminAlertas(false), []) : [],
    sesion && admin ? mfa.estado() : null,
  ]);
  return { metodos, pagosManuales, admPagos: Array.isArray(admPagos) ? admPagos : [], admMetodos: Array.isArray(admMetodos) ? admMetodos : [], alertas: Array.isArray(alertas) ? alertas : [], mfa: seguridad };
}

// ── Pestaña del jugador ────────────────────────────────────────────────────────────────────────────────────
function motivoBloqueo() {
  const S = C.S, p = S.pq;
  if (!S.yo) return 'Inicia sesión';
  if (!p.pagosActivos) return 'Próximamente';
  if (p.edad !== 'adulto') return 'Solo mayores de 18';
  if (!p.terminosAceptados) return 'Acepta los términos';
  if (!S.metodos.length) return 'Sin métodos de pago';
  return '';
}
function paqueteHTML(k, mejor, razon) {
  const gps = gemasPorSol(k.tokens, k.precioCentimos);
  return `<article class="relative rounded-2xl border ${mejor ? 'border-cyan-300/60' : 'border-galaxy-border'} bg-galaxy-900/40 p-4 text-center flex flex-col gap-1">
    ${mejor ? '<span class="absolute -top-2 left-1/2 -translate-x-1/2 text-[11px] font-display font-bold uppercase tracking-wider bg-cyan-300 text-galaxy-950 rounded-full px-2 py-0.5">Mejor valor</span>' : ''}
    <p class="font-display font-extrabold text-3xl text-cyan-300"><i class="fa-solid fa-gem text-2xl"></i> ${formatoTokens(k.tokens)}</p>
    <p class="text-xs text-gray-300">${escapeHTML(k.nombre)}</p><p class="text-[12px] text-gray-500">${gps} gemas por sol</p>
    <button type="button" data-paquete="${k.id}" class="btn btn-primary !min-h-10 !px-3 !text-sm mt-2 w-full" ${razon ? 'disabled' : ''}>${razon ? escapeHTML(razon) : formatoPrecio(k.precioCentimos, k.moneda)}</button>
    ${razon ? `<p class="text-[12px] text-gray-400">${formatoPrecio(k.precioCentimos, k.moneda)}</p>` : ''}</article>`;
}
export function recargasHTML() {
  const S = C.S, p = S.pq; if (!p) return vacio('Cargando…');
  const razon = motivoBloqueo(), mejor = p.paquetes.length ? p.paquetes.reduce((a, b) => (gemasPorSol(b.tokens, b.precioCentimos) > gemasPorSol(a.tokens, a.precioCentimos) ? b : a)).id : null;
  const intro = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-gem text-cyan-300"></i> Comprar gemas</h3>
    <p class="text-sm text-gray-300 mt-1">Las <b class="text-cyan-300">gemas</b> se compran con dinero real y sirven para comprar objetos premium o conseguir lo de la tienda más rápido. Las <b class="text-amber-300">ascuas</b> se ganan jugando. Son monedas distintas: no se cambian entre sí.</p></section>`;
  const aviso = !p.pagosActivos ? `<p class="text-sm text-amber-200 mt-3"><i class="fa-solid fa-lock"></i> Las compras con dinero real todavía no están activas. Así se verán los paquetes cuando se abran.${C.esAdmin() ? ' Como administrador, actívalas en la pestaña <b>Administrar</b>.' : ''}</p>`
    : (S.yo && p.edad !== 'adulto' ? '<p class="text-sm text-amber-200 mt-3">La compra con dinero real es solo para mayores de 18 años con fecha de nacimiento declarada en tu perfil.</p>' : '');
  const terminos = S.yo && p.pagosActivos && p.edad === 'adulto' && !p.terminosAceptados ? `<form id="ti-terminos" class="mt-3 space-y-2"><label class="flex items-start gap-2 text-xs text-gray-300"><input type="checkbox" id="ti-acepto" class="mt-0.5"><span>Soy mayor de 18 años y acepto los términos de compra (versión ${escapeHTML(p.version)}): las gemas son virtuales, no reembolsables salvo lo que exija la ley, no canjeables por dinero y solo sirven dentro del sitio.</span></label><button class="btn btn-primary !min-h-9 !px-3 !text-xs" type="submit">Aceptar y continuar</button></form>` : '';
  const metodos = S.metodos.length ? `<p class="text-[12px] text-gray-400 mt-3">Formas de pago: ${S.metodos.map((m) => `<span class="inline-block rounded-full border border-galaxy-border px-2 py-0.5 mr-1">${escapeHTML(m.nombre)}</span>`).join('')}</p>` : '';
  const grid = p.paquetes.length ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">${p.paquetes.map((k) => paqueteHTML(k, k.id === mejor && p.paquetes.length > 1, razon)).join('')}</div>` : vacio('No hay paquetes disponibles.');
  const paquetes = `<section class="glass-panel rounded-2xl p-4">${grid}${aviso}${terminos}${metodos}</section>`;
  return intro + paquetes + misRecargasHTML() + '<p class="text-[12px] text-gray-400">Las gemas no se transfieren entre personas ni se cambian por dinero. Compra reservada a mayores de 18 años con fecha de nacimiento declarada.</p>';
}
function misRecargasHTML() {
  const S = C.S; if (!S.yo || !S.pagosManuales.length) return '';
  const filas = S.pagosManuales.map((x) => {
    const e = textoEstadoRecarga(x), falta = e.tono === 'falta' && (!x.expiraAt || new Date(x.expiraAt) > new Date());
    return `<li class="flex flex-wrap items-center gap-2 py-2 text-sm"><span class="flex-1 min-w-[10rem] text-white">${formatoTokens(x.gemas)} gemas · ${formatoPrecio(x.montoCentimos)} <span class="text-[12px] text-gray-500">${escapeHTML(nombreMetodo(x.metodo))} · ${escapeHTML(fecha(x.creada))}</span></span>
      <span class="text-xs ${TONO[e.tono]}">${escapeHTML(e.texto)}</span>${falta ? `<button type="button" data-subir="${escapeHTML(x.orden)}" class="btn btn-primary !min-h-8 !px-3 !text-[12px]">Subir comprobante</button>` : ''}</li>`;
  }).join('');
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider">Mis recargas</h3><ul class="divide-y divide-galaxy-border/40 mt-1">${filas}</ul></section>`;
}

// ── Ventanas del jugador ───────────────────────────────────────────────────────────────────────────────────────
function modalMetodo(k) {
  const S = C.S, ok = (m) => k.precioCentimos >= m.minimoCentimos && (m.maximoCentimos == null || k.precioCentimos <= m.maximoCentimos);
  const lista = S.metodos.map((m, i) => `<label class="flex items-start gap-3 rounded-xl border border-galaxy-border p-3 ${ok(m) ? 'cursor-pointer' : 'opacity-50'}"><input type="radio" name="rc-m" value="${escapeHTML(m.clave)}" class="mt-1" ${ok(m) && i === S.metodos.findIndex(ok) ? 'checked' : ''} ${ok(m) ? '' : 'disabled'}>
      <span class="min-w-0"><b class="text-white text-sm">${escapeHTML(m.nombre)}</b><span class="block text-[12px] text-gray-400">${ok(m) ? 'Revisión manual: tarda un rato en acreditarse.' : `Mínimo ${formatoPrecio(m.minimoCentimos)} con este método.`}</span></span></label>`).join('');
  const m = openModal(`<div class="p-5 sm:p-6 space-y-4">${cab('Comprar ' + k.nombre)}
    <p class="text-sm text-gray-300">Pagas <b class="text-white">${formatoPrecio(k.precioCentimos, k.moneda)}</b> y recibes <b class="text-cyan-300">${formatoTokens(k.tokens)} gemas</b>.</p>
    <p class="text-xs text-gray-400">Elige cómo vas a pagar:</p><div class="space-y-2">${lista}</div>
    <p id="rc-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="button" id="rc-sig" class="btn btn-primary">Continuar</button></div></div>`, { id: 'tienda-modal' });
  m.querySelector('#rc-sig').addEventListener('click', async () => {
    const sel = m.querySelector('input[name="rc-m"]:checked'), err = m.querySelector('#rc-err'); if (!sel) { err.textContent = 'Elige un método de pago.'; err.hidden = false; return; }
    const b = m.querySelector('#rc-sig'); b.disabled = true;
    try { const o = await api.crearOrdenMetodo(k.id, sel.value); closeModal('tienda-modal'); await C.cargar(); modalComprobante({ orden: o.orden, montoCentimos: o.monto_centimos, gemas: o.gemas, metodo: o.metodo, expiraAt: o.expira_at, instrucciones: o.instrucciones, datos: o.datos }); }
    catch (e) { console.error('[recargas] crear orden:', e); err.textContent = e?.message || 'No se pudo crear la orden.'; err.hidden = false; b.disabled = false; }
  });
}
function datosPagoHTML(info) {
  const entradas = Object.entries(info.datos ?? {});
  if (!entradas.length) return '<p class="text-sm text-amber-200 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3"><i class="fa-solid fa-triangle-exclamation"></i> El administrador todavía no publicó los datos de pago de este método. <b>No envíes dinero</b> hasta que aparezcan.</p>';
  return `<dl class="rounded-xl border border-galaxy-border p-3 text-sm space-y-1">${entradas.map(([k, v]) => `<div class="flex justify-between gap-3"><dt class="text-gray-400">${escapeHTML(k.replace(/_/g, ' '))}</dt><dd class="text-white font-display font-bold select-all">${escapeHTML(v)}</dd></div>`).join('')}</dl>`;
}
function modalComprobante(info) {
  const m = openModal(`<form id="rc-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Paga y sube tu comprobante')}
    <div class="text-center"><p class="text-[12px] uppercase tracking-widest text-gray-400 font-display">Paga exactamente</p><p class="font-display font-extrabold text-3xl text-white">${formatoPrecio(info.montoCentimos)}</p>
      <p class="text-xs text-gray-400">por ${formatoTokens(info.gemas)} gemas · ${escapeHTML(nombreMetodo(info.metodo))}</p></div>
    ${info.instrucciones ? `<p class="text-xs text-gray-300">${escapeHTML(info.instrucciones)}</p>` : ''}${datosPagoHTML(info)}
    ${info.expiraAt ? `<p class="text-[12px] text-gray-400">Esta orden vence el ${escapeHTML(fecha(info.expiraAt))} — si no subes el comprobante a tiempo, se cancela sola.</p>` : ''}
    <div><label class="label" for="rc-cod">Código de operación</label><input id="rc-cod" class="field" maxlength="40" autocomplete="off" placeholder="Ej: OP48201733" required></div>
    <div><label class="label" for="rc-nom">Nombre de quien hizo el pago</label><input id="rc-nom" class="field" maxlength="80" autocomplete="off" placeholder="Como aparece en tu Yape, Plin o banco" required></div>
    <div><label class="label" for="rc-img">Captura del pago (JPG, PNG o WEBP, máx. 3 MB)</label><input id="rc-img" type="file" accept="image/png,image/jpeg,image/webp" class="field" required></div>
    <p id="rc-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Lo haré después</button><button type="submit" class="btn btn-primary">Enviar comprobante</button></div></form>`, { id: 'tienda-modal' });
  m.querySelector('#rc-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const err = m.querySelector('#rc-err'), cod = m.querySelector('#rc-cod').value.trim(), nom = m.querySelector('#rc-nom').value.trim(), img = m.querySelector('#rc-img').files[0], b = m.querySelector('button[type="submit"]');
    const mal = (t) => { err.textContent = t; err.hidden = false; };
    if (!CODIGO.test(cod)) return mal('El código lleva solo letras, números y guiones (4 a 40 caracteres).');
    if (nom.length < 3) return mal('Escribe el nombre de quien hizo el pago (mínimo 3 letras).');
    if (!img) return mal('Adjunta la captura del pago.');
    b.disabled = true;
    try { const ruta = await api.subirComprobante(C.S.yo, info.orden, img); await api.enviarComprobante(info.orden, cod, ruta, nom); closeModal('tienda-modal'); toast('Comprobante enviado. Un administrador lo revisará.', 'ok'); await C.cargar(); }
    catch (e) { console.error('[recargas] comprobante:', e); mal(e?.message || 'No se pudo enviar el comprobante.'); b.disabled = false; }
  });
}

// ── Paneles del administrador ───────────────────────────────────────────────────────────────────────────────
export function adminRecargasHTML() {
  const S = C.S, cola = S.admPagos;
  const pagos = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-receipt text-cyan-300"></i> Pagos por revisar (${cola.length})</h3>
    ${cola.length ? `<ul class="divide-y divide-galaxy-border/40 mt-1">${cola.map((x) => `<li class="py-3 space-y-2"><div class="flex flex-wrap items-center gap-2 text-sm"><span class="flex-1 min-w-[10rem] text-white"><b>${escapeHTML(x.usuario ?? '—')}</b> · ${formatoTokens(x.gemas)} gemas · <b class="text-amber-300">${formatoPrecio(x.monto_centimos, x.moneda)}</b></span>
      <span class="text-[12px] text-gray-500">${escapeHTML(nombreMetodo(x.metodo))} · ${escapeHTML(fecha(x.enviado))}</span></div>
      <p class="text-xs text-gray-300">Código de operación: <b class="text-white select-all">${escapeHTML(x.referencia)}</b> · Pagó: <b class="text-white">${escapeHTML(x.nombre_pagador ?? '—')}</b></p>
      ${(x.banderas ?? []).length ? `<ul class="text-[12px] text-amber-200 space-y-0.5">${x.banderas.map((f) => `<li><i class="fa-solid fa-flag"></i> ${escapeHTML(f)}</li>`).join('')}</ul>` : ''}
      <div class="flex flex-wrap gap-2">${x.comprobante_path ? `<button type="button" data-ver="${escapeHTML(x.comprobante_path)}" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]"><i class="fa-solid fa-image"></i> Ver captura</button>` : ''}
      <button type="button" data-aprobar="${escapeHTML(x.orden)}" class="btn btn-primary !min-h-8 !px-3 !text-[12px]"><i class="fa-solid fa-check"></i> Aprobar y dar gemas</button>
      <button type="button" data-rechazar="${escapeHTML(x.orden)}" class="btn btn-ghost !min-h-8 !px-3 !text-[12px] !text-rose-300"><i class="fa-solid fa-xmark"></i> Rechazar</button></div></li>`).join('')}</ul>` : '<p class="text-xs text-gray-500 mt-1">No hay pagos esperando revisión.</p>'}
    <p class="text-[12px] text-gray-500 mt-2">Antes de aprobar, comprueba en tu app (Yape/Plin/banco) que el dinero llegó con el monto exacto y el mismo código de operación.</p></section>`;
  const metodos = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-wallet text-cyan-300"></i> Métodos de pago</h3>
    <p class="text-[12px] text-gray-400 mt-1">Un método solo se muestra a los jugadores si está activo. Pon aquí tu número o cuenta cuando quieras abrirlo.</p>
    <ul class="divide-y divide-galaxy-border/40 mt-1">${S.admMetodos.map((m) => { const [clave, etiqueta] = CAMPO_DATO[m.proveedor] ?? ['dato', 'Dato de pago'];
      return `<li><form data-metodo="${escapeHTML(m.clave)}" class="grid grid-cols-2 gap-2 py-3 text-xs text-gray-300"><span class="col-span-2 text-white text-sm font-display font-bold">${escapeHTML(m.nombre)}</span>
      <label>${escapeHTML(etiqueta)}<input name="dato" class="field !min-h-9 mt-1" maxlength="60" value="${escapeHTML(m.datos?.[clave] ?? '')}"></label>
      <label>Titular (opcional)<input name="titular" class="field !min-h-9 mt-1" maxlength="60" value="${escapeHTML(m.datos?.titular ?? '')}"></label>
      <label class="col-span-2">Instrucciones para el jugador<input name="instr" class="field !min-h-9 mt-1" maxlength="400" value="${escapeHTML(m.instrucciones ?? '')}"></label>
      <label>Mínimo (S/)<input name="min" type="number" min="0" step="0.5" class="field !min-h-9 mt-1" value="${(Math.max(0, Number(m.minimo_centimos) || 0) / 100).toFixed(2)}"></label>
      <label class="flex items-center gap-2 mt-5"><input name="activo" type="checkbox" ${m.activo ? 'checked' : ''}> Activo (visible)</label>
      <div class="col-span-2"><button class="btn btn-primary !min-h-9 !px-3 !text-xs" type="submit">Guardar método</button></div></form></li>`; }).join('')}</ul></section>`;
  const precios = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-tags text-cyan-300"></i> Precios por moneda</h3>
    <p class="text-[12px] text-gray-400 mt-1">Deja una casilla vacía para que el objeto <b>no</b> se venda con esa moneda (por ejemplo, un objeto premium solo con gemas). Referencia: 1 gema = 5 ascuas.</p>
    <ul class="divide-y divide-galaxy-border/40 mt-1">${S.admItems.map((i) => `<li><form data-precios="${i.id}" class="flex flex-wrap items-center gap-2 py-2 text-xs text-gray-300"><span class="flex-1 min-w-[8rem] text-white">${escapeHTML(i.nombre)}</span>
      <label class="text-amber-300"><i class="fa-solid fa-fire"></i> <input name="asc" type="number" min="0" class="field !w-20 !min-h-8" value="${i.precioAscuas ?? ''}"></label>
      <label class="text-cyan-300"><i class="fa-solid fa-gem"></i> <input name="gem" type="number" min="0" class="field !w-20 !min-h-8" value="${i.precioGemas ?? ''}"></label>
      <button class="btn btn-ghost !min-h-8 !px-2 !text-[12px]" type="submit">Guardar</button></form></li>`).join('')}</ul></section>`;
  const aud = S.auditoria ? (S.auditoria.ok ? `<p class="text-xs text-emerald-300 mt-2"><i class="fa-solid fa-circle-check"></i> Todo cuadra: 0 diferencias. En circulación: ${formatoTokens(S.auditoria.ascuas_en_circulacion)} ascuas y ${formatoTokens(S.auditoria.gemas_en_circulacion)} gemas.</p>` : `<p class="text-xs text-rose-300 mt-2"><i class="fa-solid fa-triangle-exclamation"></i> Hay ${S.auditoria.diferencias} diferencias entre el libro y las billeteras. No actives pagos hasta revisarlo.</p>`) : '';
  const auditoria = `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-scale-balanced text-cyan-300"></i> Auditoría</h3>
    <p class="text-[12px] text-gray-400 mt-1">Comprueba que la suma de movimientos coincide con cada billetera.</p><button type="button" data-auditar class="btn btn-primary !min-h-9 !px-3 !text-xs mt-2">Revisar que las cuentas cuadran</button>${aud}</section>`;
  return mfa.mfaHTML(S.mfa) + alertasHTML() + pagos + metodos + precios + auditoria;
}
const NIVEL = { critica: ['text-rose-300', 'Crítica'], alta: ['text-amber-300', 'Alta'], media: ['text-amber-200', 'Media'], info: ['text-cyan-300', 'Info'] };
function alertasHTML() {
  const al = C.S.alertas ?? [], crit = al.some((a) => a.nivel === 'critica');
  return `<section class="glass-panel rounded-2xl p-4 ${crit ? 'border border-rose-400/60' : ''}"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-shield-halved ${crit ? 'text-rose-300' : 'text-cyan-300'}"></i> Vigilancia del dinero (${al.length})</h3>
    <p class="text-[12px] text-gray-400 mt-1">Cada 10 minutos el sistema comprueba que todo cuadre. Si algo crítico falla, apaga los pagos solo y te avisa aquí.</p>
    ${al.length ? `<ul class="divide-y divide-galaxy-border/40 mt-1">${al.map((a) => { const [c, t] = NIVEL[a.nivel] ?? NIVEL.info;
      return `<li class="py-2 flex flex-wrap items-center gap-2 text-sm"><span class="text-[11px] font-display font-bold uppercase ${c}">${t}</span><span class="flex-1 min-w-[10rem] text-gray-200">${escapeHTML(a.mensaje)}</span><span class="text-[12px] text-gray-500">${escapeHTML(fecha(a.creada_at))}</span>
      <button type="button" data-alerta="${a.id}" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]">Resolver</button></li>`; }).join('')}</ul>` : '<p class="text-xs text-emerald-300 mt-1"><i class="fa-solid fa-circle-check"></i> Sin alertas abiertas.</p>'}
    <button type="button" data-revisar class="btn btn-ghost !min-h-9 !px-3 !text-xs mt-2">Revisar ahora</button></section>`;
}
function modalMonto(x) {
  const m = openModal(`<form id="rm-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Confirma el monto')}
    <p class="text-xs text-gray-300">Es un pago grande. Mira tu app (Yape/Plin/banco) y escribe aquí <b>cuántos soles te llegaron</b> de verdad. Solo se aprueba si coincide con la orden.</p>
    <div><label class="label" for="rm-monto">Soles recibidos (S/)</label><input id="rm-monto" class="field" type="number" min="0" step="0.01" inputmode="decimal" required></div>
    <p id="rm-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Aprobar y dar gemas</button></div></form>`, { id: 'tienda-modal' });
  m.querySelector('#rm-monto').focus();
  m.querySelector('#rm-form').addEventListener('submit', (ev) => { ev.preventDefault(); const c = Math.round(Number(m.querySelector('#rm-monto').value) * 100), err = m.querySelector('#rm-err');
    if (!Number.isInteger(c) || c <= 0) { err.textContent = 'Escribe el monto recibido.'; err.hidden = false; return; }
    closeModal('tienda-modal'); C.hacer(() => api.adminResolverPago(x.orden, true, null, c), 'Pago aprobado: gemas acreditadas (queda en la auditoría).'); });
}
function modalAlerta(id) {
  const m = openModal(`<form id="ra-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Resolver alerta')}
    <p class="text-xs text-gray-400">Escribe qué comprobaste o corregiste. Queda en la auditoría.</p>
    <div><label class="label" for="ra-nota">Nota</label><input id="ra-nota" class="field" maxlength="300"></div>
    <p id="ra-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Marcar resuelta</button></div></form>`, { id: 'tienda-modal' });
  m.querySelector('#ra-nota').focus();
  m.querySelector('#ra-form').addEventListener('submit', (ev) => { ev.preventDefault(); const nota = m.querySelector('#ra-nota').value.trim(), err = m.querySelector('#ra-err');
    if (nota.length < 5) { err.textContent = 'Escribe qué comprobaste (mínimo 5 letras).'; err.hidden = false; return; }
    closeModal('tienda-modal'); C.hacer(() => api.adminResolverAlerta(id, nota), 'Alerta resuelta.'); });
}
function modalRechazo(orden) {
  const m = openModal(`<form id="rr-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Rechazar pago')}
    <p class="text-xs text-gray-400">La persona verá este motivo. No se dan gemas.</p>
    <div><label class="label" for="rr-nota">Motivo</label><input id="rr-nota" class="field" maxlength="200" placeholder="Ej: el pago no llegó a la cuenta"></div>
    <p id="rr-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Rechazar</button></div></form>`, { id: 'tienda-modal' });
  m.querySelector('#rr-nota').focus();
  m.querySelector('#rr-form').addEventListener('submit', (ev) => { ev.preventDefault(); const nota = m.querySelector('#rr-nota').value.trim(), err = m.querySelector('#rr-err');
    if (nota.length < 5) { err.textContent = 'Escribe el motivo (mínimo 5 letras).'; err.hidden = false; return; }
    closeModal('tienda-modal'); C.hacer(() => api.adminResolverPago(orden, false, nota), 'Pago rechazado (queda en la auditoría).'); });
}

// ── Eventos delegados desde la página ────────────────────────────────────────────────────────────────────────
/** Devuelve true si el clic era de una recarga. */
export function click(ev) {
  const b = ev.target.closest('button'); if (!b) return false; const d = b.dataset, S = C.S;
  if (d.mfa) return mfa.click(ev);
  if (d.paquete) { const k = S.pq?.paquetes.find((x) => x.id === Number(d.paquete)); if (k && !motivoBloqueo()) modalMetodo(k); return true; }
  if (d.subir) { const x = S.pagosManuales.find((p) => p.orden === d.subir), m = S.metodos.find((y) => y.clave === x?.metodo);
    if (x) modalComprobante({ orden: x.orden, montoCentimos: x.montoCentimos, gemas: x.gemas, metodo: x.metodo, expiraAt: x.expiraAt, instrucciones: m?.instrucciones ?? '', datos: m?.datos ?? {} }); return true; }
  if (d.ver) { api.urlComprobante(d.ver).then((u) => { if (u) window.open(u, '_blank', 'noopener'); else toast('En la demostración no hay imagen real.', 'ok'); }).catch((e) => toast(e?.message || 'No se pudo abrir la captura.', 'error')); return true; }
  if (d.aprobar) { const x = S.admPagos.find((p) => p.orden === d.aprobar);
    if (x?.confirmar_monto) modalMonto(x); else C.hacer(() => api.adminResolverPago(d.aprobar, true, null), 'Pago aprobado: gemas acreditadas (queda en la auditoría).'); return true; }
  if (d.alerta) { modalAlerta(Number(d.alerta)); return true; }
  if (d.revisar !== undefined) { C.hacer(() => api.adminRevisarYa(), 'Revisión hecha.'); return true; }
  if (d.rechazar) { modalRechazo(d.rechazar); return true; }
  if (d.auditar !== undefined) { C.hacer(async () => { C.S.auditoria = await api.economiaAuditar(); }, 'Auditoría hecha.'); return true; }
  return false;
}
/** Devuelve true si el formulario era de recargas. */
export function submit(ev) {
  const f = ev.target, S = C.S;
  if (f.dataset.metodo) {
    const m = S.admMetodos.find((x) => x.clave === f.dataset.metodo); if (!m) return true; const g = new FormData(f), [clave] = CAMPO_DATO[m.proveedor] ?? ['dato'], datos = {};
    if (String(g.get('dato') ?? '').trim()) datos[clave] = String(g.get('dato')).trim(); if (String(g.get('titular') ?? '').trim()) datos.titular = String(g.get('titular')).trim();
    C.hacer(() => api.adminGuardarMetodo({ clave: m.clave, nombre: m.nombre, tipo: m.tipo, activo: g.get('activo') === 'on', orden: m.orden, minimo: Math.round(Number(g.get('min') || 0) * 100), maximo: m.maximo_centimos ?? null, instrucciones: String(g.get('instr') ?? '').trim() || null, datos }), 'Método guardado (queda en la auditoría).');
    return true;
  }
  if (f.dataset.precios) {
    const g = new FormData(f), num = (v) => (String(v ?? '').trim() === '' ? null : Number(v)), asc = num(g.get('asc')), gem = num(g.get('gem'));
    if ((asc === null && gem === null) || [asc, gem].some((v) => v !== null && (!Number.isInteger(v) || v < 0))) { toast('Pon un entero en al menos una moneda.', 'error'); return true; }
    C.hacer(() => api.adminSetPrecios(Number(f.dataset.precios), asc, gem), 'Precios guardados (quedan en la auditoría).');
    return true;
  }
  return false;
}

/** Si la base pide la verificación en dos pasos y la persona ya la tiene, abre la ventana del código. */
export function manejarError(e) {
  if (/verificación en dos pasos/i.test(e?.message ?? '') && C?.S.mfa?.factorId) mfa.pedirCodigo(C.S.mfa.factorId);
}
