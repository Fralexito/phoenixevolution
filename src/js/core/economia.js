// ECONOMÍA — normalizadores y utilidades PURAS (sin navegador ni red; se prueban en Node). Reglas reales: migraciones 049-051 y 065 (ascuas = saldo, gemas = compradas).
import { escapeHTML } from './dom.js';

export const CATEGORIAS = Object.freeze({
  marco:      { etiqueta: 'Marcos',            icono: 'fa-circle-notch' },
  titulo:     { etiqueta: 'Títulos',           icono: 'fa-signature' },
  fondo:      { etiqueta: 'Fondos de perfil',  icono: 'fa-image' },
  color_clan: { etiqueta: 'Color de clan',     icono: 'fa-palette' },
  insignia:   { etiqueta: 'Insignias',         icono: 'fa-certificate' },
});
export const ORDEN_CATEGORIAS = Object.freeze(Object.keys(CATEGORIAS));

const entero = (v, def = 0) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : def; };
const HEX = /^#[0-9a-fA-F]{6}$/, ICONO = /^fa-[a-z0-9-]{2,30}$/, TEXTO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .!¡¿?-]{2,24}$/;
const hex = (v, def = null) => (HEX.test(String(v ?? '')) ? String(v) : def);

/** Estilo seguro: solo colores #RRGGBB, un texto corto o un icono fa-…; todo lo demás se descarta. */
export function estiloSeguro(e) {
  const o = e && typeof e === 'object' ? e : {};
  return { color: hex(o.color), color2: hex(o.color2), texto: TEXTO.test(String(o.texto ?? '')) ? String(o.texto) : null, icono: ICONO.test(String(o.icono ?? '')) ? String(o.icono) : null };
}

export function normalizarEconomia(d) {
  const o = d && typeof d === 'object' ? d : {};
  const xp = Math.max(0, entero(o.xp)), base = Math.max(0, entero(o.xp_nivel)), sig = Math.max(base + 1, entero(o.xp_siguiente, base + 1));
  return { saldo: entero(o.saldo), gemas: entero(o.gemas), enGarantia: Math.max(0, entero(o.en_garantia)), puedeApostar: o.puede_apostar === true, motivoNoApostar: o.motivo_no_apostar ? String(o.motivo_no_apostar) : null, xp, nivel: Math.max(1, entero(o.nivel, 1)), xpNivel: base, xpSiguiente: sig, progreso: Math.min(1, Math.max(0, (xp - base) / (sig - base))) };
}
export function normalizarItem(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { id: entero(o.id), clave: String(o.clave ?? ''), nombre: String(o.nombre ?? ''), descripcion: String(o.descripcion ?? ''),
    categoria: ORDEN_CATEGORIAS.includes(o.categoria) ? o.categoria : 'insignia', precio: Math.max(0, entero(o.precio)), nivelMin: Math.max(1, entero(o.nivel_min, 1)),
    stock: o.stock == null ? null : Math.max(0, entero(o.stock)), agotado: !!o.agotado, estilo: estiloSeguro(o.estilo), tengo: !!o.tengo, equipado: !!o.equipado, activo: o.activo !== false };
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
    paquetes: (Array.isArray(o.paquetes) ? o.paquetes : []).map((p) => ({ id: entero(p.id), nombre: String(p.nombre ?? ''), tokens: Math.max(0, entero(p.tokens)), precioCentimos: Math.max(0, entero(p.precio_centimos)), moneda: String(p.moneda ?? 'PEN') })) };
}

export const TIPOS_MOVIMIENTO = Object.freeze({ ganado: 'Ganados jugando', compra_tienda: 'Compra en la tienda', compra_dinero: 'Compra de tokens', reembolso: 'Reembolso', ajuste_admin: 'Ajuste del staff', devolucion: 'Devolución', apuesta_garantia: 'Ascuas puestas en un reto', apuesta_premio: 'Pozo ganado', apuesta_devolucion: 'Pozo devuelto' });
export const textoTipo = (t) => TIPOS_MOVIMIENTO[t] ?? 'Movimiento';

/** 500 + 'PEN' → «S/ 5.00». Para otras monedas, «5.00 USD». */
export function formatoPrecio(centimos, moneda = 'PEN') {
  const v = (Math.max(0, entero(centimos)) / 100).toFixed(2);
  return moneda === 'PEN' ? `S/ ${v}` : `${v} ${moneda}`;
}
export const formatoTokens = (n) => entero(n).toLocaleString('es-PE');

/** Razón por la que NO se puede comprar un objeto (o '' si se puede). Es solo ayuda visual: la base decide de verdad. */
export function motivoNoComprable(item, eco) {
  if (item.tengo) return 'Ya lo tienes';
  if (item.agotado) return 'Agotado';
  if (eco.nivel < item.nivelMin) return `Nivel ${item.nivelMin}`;
  if (eco.saldo < item.precio) return eco.saldo < 0 ? 'Saldo negativo' : 'Tokens insuficientes';
  return '';
}

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
  if (item.categoria === 'color_clan') return `<span class="font-display font-extrabold" style="${estiloColor(s)}">[ABC]</span>`;
  return `<i class="fa-solid ${escapeHTML(s.icono ?? 'fa-star')} text-xl" style="${estiloColor(s)}"></i>`;
}

/** Equipamiento público {categoria:{clave,nombre,estilo}} → solo lo reconocido y saneado. */
export function normalizarEquipamiento(d) {
  const o = d && typeof d === 'object' ? d : {}, out = {};
  for (const c of ORDEN_CATEGORIAS) if (o[c] && typeof o[c] === 'object') out[c] = { clave: String(o[c].clave ?? ''), nombre: String(o[c].nombre ?? ''), estilo: estiloSeguro(o[c].estilo) };
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
  else { if (!HEX.test(String(o.color ?? ''))) return { ok: false, error: 'El color principal debe ser #RRGGBB.' }; e.color = o.color; if (o.categoria !== 'color_clan' && o.color2) { if (!HEX.test(o.color2)) return { ok: false, error: 'El segundo color debe ser #RRGGBB.' }; e.color2 = o.color2; } }
  return { ok: true, valores: { clave: o.clave, nombre, descripcion: String(o.descripcion ?? '').trim().slice(0, 200), categoria: o.categoria, precio, nivelMin: nivel, stock, estilo: e, activo: o.activo !== false } };
}
