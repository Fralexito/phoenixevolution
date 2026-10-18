// ECONOMÍA — normalizadores y utilidades PURAS (sin navegador ni red; se prueban en Node). Reglas reales: migraciones 049-051 y 065 (ascuas = saldo, gemas = compradas).
import { escapeHTML } from '../sistema/dom.js';
import { esSonidoChat, SONIDOS_CHAT } from '../comunidad/sonidosChat.js';

export const CATEGORIAS = Object.freeze({
  marco:      { etiqueta: 'Marcos',            icono: 'fa-circle-notch' },
  titulo:     { etiqueta: 'Títulos',           icono: 'fa-signature' },
  fondo:      { etiqueta: 'Fondos de perfil',  icono: 'fa-image' },
  color_clan: { etiqueta: 'Color de clan',     icono: 'fa-palette' },
  insignia:   { etiqueta: 'Insignias',         icono: 'fa-certificate' },
  efecto_carta: { etiqueta: 'Efectos de carta', icono: 'fa-wand-magic-sparkles' },
  banner:     { etiqueta: 'Banners de perfil', icono: 'fa-panorama' },
  sonido_chat: { etiqueta: 'Sonidos de chat',  icono: 'fa-volume-high' },
});
export const ORDEN_CATEGORIAS = Object.freeze(Object.keys(CATEGORIAS));

const entero = (v, def = 0) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : def; };
const HEX = /^#[0-9a-fA-F]{6}$/, ICONO = /^fa-[a-z0-9-]{2,30}$/, TEXTO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .!¡¿?-]{2,24}$/;
const hex = (v, def = null) => (HEX.test(String(v ?? '')) ? String(v) : def);

/** Fase C (migración 121): valores permitidos, IGUALES a private.estilo_valido en la base. Nada de CSS libre ni URLs. */
export const EFECTOS_CARTA = Object.freeze({ holografico: 'Holográfico', dorado: 'Dorado', aurora: 'Aurora' });
export const PATRONES_BANNER = Object.freeze({ degradado: 'Degradado', diagonal: 'Rayas diagonales', rejilla: 'Rejilla', puntos: 'Estrellas' });
const enLista = (lista, v) => (typeof v === 'string' && Object.hasOwn(lista, v) ? v : null);
/** Un banner de perfil como CSS (solo patrón de la lista + colores #RRGGBB validados). '' si el estilo no sirve. */
export function estiloBanner(e) {
  const s = estiloSeguro(e); if (!s.color || !s.patron) return '';
  const c2 = s.color2 ?? s.color;
  if (s.patron === 'diagonal') return `background:repeating-linear-gradient(135deg,${s.color} 0 14px,${c2} 14px 28px)`;
  if (s.patron === 'rejilla') return `background:linear-gradient(${c2}33 1px,transparent 1px) 0 0/22px 22px,linear-gradient(90deg,${c2}33 1px,transparent 1px) 0 0/22px 22px,${s.color}`;
  if (s.patron === 'puntos') return `background:radial-gradient(circle,${c2} 1.2px,transparent 1.6px) 0 0/26px 26px,radial-gradient(circle,${c2}99 .9px,transparent 1.3px) 13px 13px/26px 26px,${s.color}`;
  return `background:linear-gradient(135deg,${s.color},${c2})`;
}

/** Estilo seguro: solo colores #RRGGBB, un texto corto o un icono fa-…, y (Fase C) efecto/patrón/sonido de la lista blanca; todo lo demás se descarta. */
export function estiloSeguro(e) {
  const o = e && typeof e === 'object' ? e : {};
  const out = { color: hex(o.color), color2: hex(o.color2), texto: TEXTO.test(String(o.texto ?? '')) ? String(o.texto) : null, icono: ICONO.test(String(o.icono ?? '')) ? String(o.icono) : null };
  const efecto = enLista(EFECTOS_CARTA, o.efecto), patron = enLista(PATRONES_BANNER, o.patron), sonido = esSonidoChat(o.sonido) ? o.sonido : null;
  if (efecto) out.efecto = efecto;
  if (patron) out.patron = patron;
  if (sonido) out.sonido = sonido;
  return out;
}

export function normalizarEconomia(d) {
  const o = d && typeof d === 'object' ? d : {};
  const xp = Math.max(0, entero(o.xp)), base = Math.max(0, entero(o.xp_nivel)), sig = Math.max(base + 1, entero(o.xp_siguiente, base + 1));
  return { saldo: entero(o.saldo), gemas: entero(o.gemas), enGarantia: Math.max(0, entero(o.en_garantia)), puedeApostar: o.puede_apostar === true, motivoNoApostar: o.motivo_no_apostar ? String(o.motivo_no_apostar) : null, xp, nivel: Math.max(1, entero(o.nivel, 1)), xpNivel: base, xpSiguiente: sig, progreso: Math.min(1, Math.max(0, (xp - base) / (sig - base))) };
}
export function normalizarItem(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { id: entero(o.id), clave: String(o.clave ?? ''), nombre: String(o.nombre ?? ''), descripcion: String(o.descripcion ?? ''),
    categoria: ORDEN_CATEGORIAS.includes(o.categoria) ? o.categoria : 'insignia', precio: Math.max(0, entero(o.precio)),
    precioAscuas: o.precio_ascuas === undefined ? Math.max(0, entero(o.precio)) : (o.precio_ascuas == null ? null : Math.max(0, entero(o.precio_ascuas))),
    precioGemas: o.precio_gemas == null ? null : Math.max(0, entero(o.precio_gemas)), nivelMin: Math.max(1, entero(o.nivel_min, 1)),
    stock: o.stock == null ? null : Math.max(0, entero(o.stock)), agotado: !!o.agotado, estilo: estiloSeguro(o.estilo), tengo: !!o.tengo, equipado: !!o.equipado, activo: o.activo !== false,
    rareza: RAREZAS[o.rareza] ? o.rareza : 'comun', limitadaHasta: o.limitada_hasta ? String(o.limitada_hasta) : null };
}
/** Rarezas de los objetos: etiqueta y clases de color (la base decide cuál tiene cada objeto). */
export const RAREZAS = Object.freeze({
  comun: { etiqueta: 'Común', clase: 'text-gray-300 border-gray-500/50' },
  raro: { etiqueta: 'Raro', clase: 'text-cyan-300 border-cyan-300/50' },
  epico: { etiqueta: 'Épico', clase: 'text-fuchsia-300 border-fuchsia-300/50' },
  legendario: { etiqueta: 'Legendario', clase: 'text-amber-300 border-amber-300/60' },
});
/** «Termina en 3 días» / «Termina hoy» / «Terminó» para una edición limitada. Puro (recibe la hora de referencia). */
export function textoLimitada(iso, ahora = Date.now()) {
  const t = Date.parse(iso ?? ''); if (Number.isNaN(t)) return '';
  const ms = t - ahora; if (ms <= 0) return 'Terminó';
  const h = Math.ceil(ms / 3600000); if (h < 24) return h <= 1 ? 'Termina en menos de 1 hora' : `Termina en ${h} horas`;
  const d = Math.ceil(h / 24); return d === 1 ? 'Termina mañana' : `Termina en ${d} días`;
}
export const normalizarLista = (d) => (Array.isArray(d) ? d.map(normalizarItem).filter((i) => i.id) : []);
export function normalizarMovimiento(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { id: entero(o.id), delta: entero(o.delta), tipo: String(o.tipo ?? ''), fuente: String(o.fuente ?? ''), saldoDespues: entero(o.saldo), fecha: String(o.cuando ?? '') };
}
export function normalizarRegla(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { fuente: String(o.fuente ?? ''), descripcion: String(o.descripcion ?? ''), xp: Math.max(0, entero(o.xp)), tokens: Math.max(0, entero(o.tokens)), topeDiario: o.tope_diario == null ? null : entero(o.tope_diario), activa: o.activa !== false };
}
export function normalizarPaquetes(d) {
  const o = d && typeof d === 'object' ? d : {};
  return { pagosActivos: o.pagos_activos === true, version: String(o.version_terminos ?? '1'), terminosAceptados: o.terminos_aceptados === true, edad: o.edad ?? null,
    bonoPct: Math.max(0, entero(o.bono_primera_pct)), bonoDisponible: o.bono_disponible === true,
    paquetes: (Array.isArray(o.paquetes) ? o.paquetes : []).map((p) => ({ id: entero(p.id), nombre: String(p.nombre ?? ''), tokens: Math.max(0, entero(p.tokens)), precioCentimos: Math.max(0, entero(p.precio_centimos)), moneda: String(p.moneda ?? 'PEN') })) };
}

export const TIPOS_MOVIMIENTO = Object.freeze({ ganado: 'Ganados jugando', compra_tienda: 'Compra en la tienda', compra_dinero: 'Compra de gemas', bono_primera_compra: 'Bono de primera compra', reembolso: 'Reembolso', ajuste_admin: 'Ajuste del staff', devolucion: 'Devolución', apuesta_garantia: 'Ascuas puestas en un reto', apuesta_premio: 'Pozo ganado', apuesta_devolucion: 'Pozo devuelto' });
export const textoTipo = (t) => TIPOS_MOVIMIENTO[t] ?? 'Movimiento';

/** 500 + 'PEN' → «S/ 5.00». Para otras monedas, «5.00 USD». */
export function formatoPrecio(centimos, moneda = 'PEN') {
  const v = (Math.max(0, entero(centimos)) / 100).toFixed(2);
  return moneda === 'PEN' ? `S/ ${v}` : `${v} ${moneda}`;
}
export const formatoTokens = (n) => entero(n).toLocaleString('es-PE');

/** Razón por la que NO se puede comprar un objeto con una moneda ('ascuas' o 'gemas'); '' si se puede. Es solo ayuda visual: la base decide de verdad. */
export function motivoNoComprable(item, eco, moneda = 'ascuas') {
  const gemas = moneda === 'gemas', precio = gemas ? item.precioGemas : item.precioAscuas, saldo = gemas ? eco.gemas : eco.saldo;
  if (item.tengo) return 'Ya lo tienes';
  if (item.agotado) return 'Agotado';
  if (eco.nivel < item.nivelMin) return `Nivel ${item.nivelMin}`;
  if (precio == null) return gemas ? 'Solo con ascuas' : 'Solo con gemas';
  if (saldo < precio) return saldo < 0 ? 'Saldo negativo' : (gemas ? 'Gemas insuficientes' : 'Ascuas insuficientes');
  return '';
}

/** Métodos de pago activos (pagos_metodos_lista). Los «datos» (número de Yape, cuenta…) se limitan a texto corto. */
export function normalizarMetodos(d) {
  const lista = Array.isArray(d) ? d : [];
  return lista.map((m) => {
    const o = m && typeof m === 'object' ? m : {}, datos = {};
    for (const [k, v] of Object.entries(o.datos && typeof o.datos === 'object' ? o.datos : {})) if (/^[a-z_]{2,30}$/.test(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) datos[k] = String(v).slice(0, 120);
    return { clave: String(o.clave ?? ''), nombre: String(o.nombre ?? ''), tipo: ['pasarela', 'efectivo', 'manual'].includes(o.tipo) ? o.tipo : 'manual',
      minimoCentimos: Math.max(0, entero(o.minimo_centimos)), maximoCentimos: o.maximo_centimos == null ? null : Math.max(0, entero(o.maximo_centimos)), instrucciones: String(o.instrucciones ?? '').slice(0, 600), datos };
  }).filter((m) => m.clave);
}
/** Una recarga manual del jugador (mis_pagos_manuales). */
export function normalizarPagoManual(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { orden: String(o.orden ?? ''), metodo: String(o.metodo ?? ''), montoCentimos: Math.max(0, entero(o.monto_centimos)), gemas: Math.max(0, entero(o.gemas)), estadoOrden: String(o.estado_orden ?? ''),
    expiraAt: o.expira_at ? String(o.expira_at) : null, creada: String(o.creada ?? ''), comprobante: o.comprobante ? String(o.comprobante) : null, nota: o.nota ? String(o.nota).slice(0, 300) : null };
}
/** Texto claro del estado de una recarga manual (orden + comprobante). */
export function textoEstadoRecarga(p) {
  if (p.estadoOrden === 'PAGADA') return { texto: 'Acreditada', tono: 'ok' };
  if (p.estadoOrden === 'EXPIRADA') return { texto: 'Venció sin comprobante', tono: 'mal' };
  if (p.estadoOrden === 'REEMBOLSADA' || p.estadoOrden === 'DISPUTADA') return { texto: 'Revertida', tono: 'mal' };
  if (p.comprobante === 'en_revision') return { texto: 'En revisión', tono: 'espera' };
  if (p.comprobante === 'rechazado' || p.estadoOrden === 'FALLIDA') return { texto: 'Rechazada' + (p.nota ? ': ' + p.nota : ''), tono: 'mal' };
  return { texto: 'Falta tu comprobante', tono: 'falta' };
}
export const gemasPorSol = (gemas, centimos) => (centimos > 0 ? Math.round((entero(gemas) / (entero(centimos) / 100)) * 10) / 10 : 0);

/** Estilos en línea ya saneados (solo colores validados) para pintar un marco/fondo/etiqueta. */
export function estiloMarco(e) { const s = estiloSeguro(e); return s.color ? `box-shadow:0 0 0 2px ${s.color}${s.color2 ? `,0 0 10px 2px ${s.color2}` : ''}` : ''; }
export function estiloFondo(e) { const s = estiloSeguro(e); return s.color ? `background:linear-gradient(135deg,${s.color},${s.color2 ?? s.color})` : ''; }
export function estiloColor(e) { const s = estiloSeguro(e); return s.color ? `color:${s.color}` : ''; }

/** Vista previa HTML de un objeto (todo escapado; estilos solo con colores validados). */
export function vistaPrevia(item) {
  const s = item.estilo;
  if (item.categoria === 'marco') return `<span class="inline-block w-10 h-10 rounded-full bg-galaxy-800" style="${estiloMarco(s)}"></span>`;
  if (item.categoria === 'fondo') return `<span class="inline-block w-16 h-10 rounded-lg" style="${estiloFondo(s)}"></span>`;
  if (item.categoria === 'titulo') return `<span class="font-display font-bold text-xs uppercase tracking-wider" style="${estiloColor(s)}">${escapeHTML(s.texto ?? '')}</span>`;
  if (item.categoria === 'efecto_carta') return `<span class="ec-demo inline-flex w-12 h-16 rounded-lg bg-galaxy-800 border border-galaxy-600/50" data-efecto-carta="${escapeHTML(s.efecto ?? 'holografico')}" aria-hidden="true"></span>`;
  if (item.categoria === 'banner') return `<span class="inline-block w-24 h-10 rounded-lg" style="${estiloBanner(s)}"></span>`;
  if (item.categoria === 'sonido_chat') return `<button type="button" data-sonido="${escapeHTML(s.sonido ?? '')}" class="btn btn-ghost !min-h-9 !px-3 !text-[12px]" aria-label="Escuchar ${escapeHTML(SONIDOS_CHAT[s.sonido]?.etiqueta ?? 'sonido')}"><i class="fa-solid fa-play"></i><span>Escuchar</span></button>`;
  if (item.categoria === 'color_clan') return `<span class="font-display font-extrabold" style="${estiloColor(s)}">[ABC]</span>`;
  return `<i class="fa-solid ${escapeHTML(s.icono ?? 'fa-star')} text-xl" style="${estiloColor(s)}"></i>`;
}

/** Equipamiento público {categoria:{clave,nombre,estilo}} → solo lo reconocido y saneado. */
export function normalizarEquipamiento(d) {
  const o = d && typeof d === 'object' ? d : {}, out = {};
  for (const c of ORDEN_CATEGORIAS) if (o[c] && typeof o[c] === 'object') out[c] = { clave: String(o[c].clave ?? ''), nombre: String(o[c].nombre ?? ''), estilo: estiloSeguro(o[c].estilo) };
  return out;
}

/** Efectos de carta de varias personas {usuario_id: efecto} → solo ids con forma de uuid y efectos de la lista blanca. */
export function normalizarEfectosCarta(d) {
  const o = d && typeof d === 'object' && !Array.isArray(d) ? d : {}, out = {};
  for (const [id, ef] of Object.entries(o)) if (/^[0-9a-f-]{36}$/i.test(id) && enLista(EFECTOS_CARTA, ef)) out[id.toLowerCase()] = ef;
  return out;
}

export function validarItemAdmin(v) {
  const o = v ?? {}, precio = Number(o.precio), nivel = Number(o.nivelMin || 1);
  if (!/^[a-z0-9_]{3,40}$/.test(String(o.clave ?? ''))) return { ok: false, error: 'La clave: 3-40 letras minúsculas, números o guion bajo.' };
  const nombre = String(o.nombre ?? '').trim(); if (nombre.length < 3 || nombre.length > 40) return { ok: false, error: 'El nombre debe tener entre 3 y 40 caracteres.' };
  if (!ORDEN_CATEGORIAS.includes(o.categoria)) return { ok: false, error: 'Elige una categoría.' };
  if (!Number.isInteger(precio) || precio < 0 || precio > 1000000) return { ok: false, error: 'El precio debe ser un entero entre 0 y 1 000 000.' };
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 100) return { ok: false, error: 'El nivel mínimo va de 1 a 100.' };
  const stock = o.stock === '' || o.stock == null ? null : Number(o.stock); if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return { ok: false, error: 'El stock es un entero o vacío (ilimitado).' };
  const e = {};
  if (o.categoria === 'titulo') { if (!TEXTO.test(String(o.texto ?? ''))) return { ok: false, error: 'El título: 2-24 letras, números o signos simples.' }; e.texto = String(o.texto); if (o.color) { if (!HEX.test(o.color)) return { ok: false, error: 'Color inválido (#RRGGBB).' }; e.color = o.color; } }
  else if (o.categoria === 'insignia') { if (!ICONO.test(String(o.icono ?? ''))) return { ok: false, error: 'El icono debe verse como fa-crown.' }; e.icono = String(o.icono); if (o.color) { if (!HEX.test(o.color)) return { ok: false, error: 'Color inválido (#RRGGBB).' }; e.color = o.color; } }
  else if (o.categoria === 'efecto_carta') { if (!enLista(EFECTOS_CARTA, o.efecto)) return { ok: false, error: 'Elige un efecto de la lista.' }; e.efecto = o.efecto; }
  else if (o.categoria === 'sonido_chat') { if (!esSonidoChat(o.sonido)) return { ok: false, error: 'Elige un sonido del catálogo.' }; e.sonido = o.sonido; }
  else if (o.categoria === 'banner') { if (!enLista(PATRONES_BANNER, o.patron)) return { ok: false, error: 'Elige un patrón de la lista.' }; if (!HEX.test(String(o.color ?? ''))) return { ok: false, error: 'El color principal debe ser #RRGGBB.' }; e.patron = o.patron; e.color = o.color; if (o.color2) { if (!HEX.test(o.color2)) return { ok: false, error: 'El segundo color debe ser #RRGGBB.' }; e.color2 = o.color2; } }
  else { if (!HEX.test(String(o.color ?? ''))) return { ok: false, error: 'El color principal debe ser #RRGGBB.' }; e.color = o.color; if (o.categoria !== 'color_clan' && o.color2) { if (!HEX.test(o.color2)) return { ok: false, error: 'El segundo color debe ser #RRGGBB.' }; e.color2 = o.color2; } }
  return { ok: true, valores: { clave: o.clave, nombre, descripcion: String(o.descripcion ?? '').trim().slice(0, 200), categoria: o.categoria, precio, nivelMin: nivel, stock, estilo: e, activo: o.activo !== false } };
}

/** Estado de la verificación en dos pasos: factores de Supabase (lista) + nivel de la sesión ('aal1'|'aal2'). Puro, para pintar el panel. */
export function resumenMfa(factores, nivel) {
  const lista = Array.isArray(factores) ? factores : [];
  const ok = lista.filter((f) => f && f.factor_type === 'totp' && f.status === 'verified');
  const pendientes = lista.filter((f) => f && f.factor_type === 'totp' && f.status !== 'verified');
  const sesionSegura = nivel === 'aal2';
  const estado = !ok.length ? 'sin_activar' : (sesionSegura ? 'activa' : 'falta_codigo');
  return { estado, factorId: ok[0]?.id ?? null, pendientes: pendientes.map((f) => f.id) };
}
