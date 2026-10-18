// Lógica PURA del Phoenix Pass (pase de temporada) y de la marca «torneo premium». Sin DOM ni Supabase. Pruebas: tests/phoenix-pass.test.mjs
// Las reglas reales (precios, niveles, claves anti-duplicado) viven en la base (migración 123); aquí solo se ordena lo que llega para dibujarlo.
// OJO: no confundir con core/portada/pase.js, que es el «pase» de la portada élite (líder, puesto, próximo partido).
import { estiloSeguro, RAREZAS } from './economia.js';

const entero = (n, def = 0) => { const v = Math.trunc(Number(n)); return Number.isFinite(v) ? v : def; };
const PISTAS = Object.freeze(['gratis', 'premium']);
/** Equivalencia aproximada para mostrar «≈ S/ x»: el paquete Brasa da 110 gemas por S/ 10. Solo orientativo. */
export const GEMAS_POR_SOL = 11;
export const solesAprox = (gemas) => Math.round((entero(gemas) / GEMAS_POR_SOL) * 10) / 10;

/** Un premio crudo de la base → forma segura para dibujar (o null si no hay premio). */
export function normalizarPremio(r) {
  if (!r || typeof r !== 'object') return null;
  const tipo = ['ascuas', 'gemas', 'item'].includes(r.tipo) ? r.tipo : null; if (!tipo) return null;
  const it = r.item && typeof r.item === 'object' ? r.item : null;
  const item = tipo === 'item' && it ? { id: entero(it.id), clave: String(it.clave ?? ''), nombre: String(it.nombre ?? 'Objeto'), categoria: String(it.categoria ?? ''), rareza: RAREZAS[it.rareza] ? it.rareza : 'comun', estilo: estiloSeguro(it.estilo) } : null;
  if (tipo === 'item' && !item) return null;
  return { tipo, cantidad: tipo === 'item' ? 0 : Math.max(0, entero(r.cantidad)), item, reclamada: r.reclamada === true };
}

/** «+40 ascuas», «+10 gemas» o el nombre del objeto. */
export function textoPremio(p) {
  if (!p) return '—';
  if (p.tipo === 'item') return p.item?.nombre ?? 'Objeto';
  return `+${p.cantidad.toLocaleString('es-PE')} ${p.tipo === 'gemas' ? 'gemas' : 'ascuas'}`;
}

/** Respuesta de pase_estado → { activo, temporada, niveles:[{nivel,gratis,premium}], yo, proxima }. Tolera basura. */
export function normalizarPase(d) {
  const o = d && typeof d === 'object' ? d : {};
  const proxima = o.proxima && typeof o.proxima === 'object' ? { nombre: String(o.proxima.nombre ?? ''), inicia: String(o.proxima.inicia ?? '') } : null;
  const t = o.temporada && typeof o.temporada === 'object' ? o.temporada : null;
  if (!t || !t.id) return { activo: false, temporada: null, niveles: [], yo: null, proxima };
  const total = Math.max(1, entero(t.niveles, 30)), porNivel = Math.max(1, entero(t.xp_por_nivel, 100));
  const temporada = { id: String(t.id), clave: String(t.clave ?? ''), nombre: String(t.nombre ?? 'Temporada'), inicia: String(t.inicia ?? ''), termina: String(t.termina ?? ''), niveles: total, xpPorNivel: porNivel,
    precioGemas: Math.max(0, entero(t.precio_gemas)), enGracia: t.en_gracia === true, graciaDias: Math.max(0, entero(t.gracia_dias, 7)) };
  const filas = Array.from({ length: total }, (_, i) => ({ nivel: i + 1, gratis: null, premium: null }));
  for (const r of Array.isArray(o.recompensas) ? o.recompensas : []) {
    const n = entero(r?.nivel), pista = r?.pista; if (n < 1 || n > total || !PISTAS.includes(pista)) continue;
    filas[n - 1][pista] = normalizarPremio(r);
  }
  const y = o.yo && typeof o.yo === 'object' ? o.yo : null;
  const nivel = y ? Math.min(total, Math.max(0, entero(y.nivel))) : 0, enNivel = y ? Math.max(0, entero(y.xp_en_nivel)) : 0;
  const yo = y ? { xp: Math.max(0, entero(y.xp)), nivel, xpEnNivel: enNivel, tengoPremium: y.tengo_premium === true,
    progreso: nivel >= total ? 1 : Math.min(1, enNivel / porNivel), xpFaltante: nivel >= total ? 0 : Math.max(0, porNivel - enNivel) } : null;
  return { activo: true, temporada, niveles: filas, yo, proxima };
}

/** Estado de un premio para pintar el botón: reclamada · reclamable · requiere_premium · bloqueado (aún no llega al nivel) · vacio. */
export function estadoPremio(fila, pista, yo) {
  const p = fila?.[pista]; if (!p) return 'vacio';
  if (p.reclamada) return 'reclamada';
  if (!yo || yo.nivel < fila.nivel) return 'bloqueado';
  if (pista === 'premium' && !yo.tengoPremium) return 'requiere_premium';
  return 'reclamable';
}

/** Totales por pista (lo que ofrece el pase entero) y gemas de regreso. */
export function resumenPase(niveles) {
  const r = { gratis: { ascuas: 0, gemas: 0, objetos: 0 }, premium: { ascuas: 0, gemas: 0, objetos: 0 } };
  for (const f of niveles ?? []) for (const pista of PISTAS) {
    const p = f[pista]; if (!p) continue;
    if (p.tipo === 'item') r[pista].objetos += 1; else r[pista][p.tipo] += p.cantidad;
  }
  return r;
}

/** Cuánto cuesta de verdad el pase si reclamas todo: precio − gemas de regreso (nunca menos de 0). */
export const costeNeto = (precioGemas, gemasRegreso) => Math.max(0, entero(precioGemas) - entero(gemasRegreso));

/** Cuántos premios puede reclamar ya la persona (para el aviso de la pestaña). */
export function reclamablesYa(niveles, yo) {
  let n = 0;
  for (const f of niveles ?? []) for (const pista of PISTAS) if (estadoPremio(f, pista, yo) === 'reclamable') n += 1;
  return n;
}

/** «Quedan 12 días» / «Termina hoy» / «Terminó: te quedan 3 días para reclamar» / «Terminó». Puro (recibe la hora de referencia). */
export function textoTiempo(temporada, ahora = Date.now()) {
  if (!temporada) return '';
  const fin = Date.parse(temporada.termina); if (Number.isNaN(fin)) return '';
  const h = (fin - ahora) / 3600e3;
  if (h <= 0) {
    const d = Math.ceil((fin + temporada.graciaDias * 86400e3 - ahora) / 86400e3);
    return d > 0 ? `Terminó: te quedan ${d} día${d === 1 ? '' : 's'} para reclamar` : 'Terminó';
  }
  if (h < 24) return 'Termina hoy';
  const d = Math.floor(h / 24);
  return d === 1 ? 'Termina mañana' : `Quedan ${d} días`;
}

/** Respuesta de torneo_premium_info → forma segura (null si el torneo no existe). */
export function normalizarTorneoPremium(d) {
  const o = d && typeof d === 'object' ? d : {};
  if (!o.existe) return null;
  return { premium: o.premium === true, precioGemas: Math.max(0, entero(o.precio_gemas)), puede: o.puede === true, motivo: o.motivo ? String(o.motivo) : '' };
}
