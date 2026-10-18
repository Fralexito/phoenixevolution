// Configuración editable del sitio (Panel). Lógica PURA: sin DOM ni red, con test (tests/sitio.test.mjs).
// Forma: { portada: { titulo, sub, orden: [ids], ventanas: { <id>: { on, vista, principal:{titulo,href}, extra:[{titulo,href}] } } },
//          menu: { ocultos: [idNav] }, lateral: { ocultos: [idNav] },
//          textos: { <idPagina>: 'Título nuevo (h1)' }, enlaces: [{ titulo, href }] (botones nuevos en barra lateral y pie) }
export const VENTANAS = ['social', 'competencia', 'duelos', 'club'];
export const VISTAS = ['vivo', 'mosaico', 'grande'];
export const MAX_EXTRA = 3;
export const MAX_ENLACES = 4;

const txt = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 40) : []);
const unicos = (a) => [...new Set(a)];
// Solo rutas internas relativas o https: nada de javascript: ni datos.
export const hrefValido = (h) => typeof h === 'string' && /^(?:[a-z0-9][a-z0-9\-_/#?=.&]*|https:\/\/[^\s<>"']+)$/i.test(h.trim()) && h.length <= 200;

function normVentana(v) {
  const o = v && typeof v === 'object' ? v : {};
  const principal = o.principal && txt(o.principal.titulo, 28) && hrefValido(o.principal.href) ? { titulo: txt(o.principal.titulo, 28), href: o.principal.href.trim() } : null;
  const extra = (Array.isArray(o.extra) ? o.extra : []).filter((e) => e && txt(e.titulo, 22) && hrefValido(e.href)).slice(0, MAX_EXTRA).map((e) => ({ titulo: txt(e.titulo, 22), href: e.href.trim() }));
  return { on: o.on !== false, vista: VISTAS.includes(o.vista) ? o.vista : '', principal, extra };
}

function normTextos(t) {
  const out = {};
  if (t && typeof t === 'object' && !Array.isArray(t)) for (const [k, v] of Object.entries(t).slice(0, 40)) { const x = txt(v, 60); if (/^[a-z0-9-]{1,30}$/.test(k) && x) out[k] = x; }
  return out;
}

/** Convierte lo que venga (incluso basura) en una configuración completa y segura. */
export function normalizar(c) {
  const o = c && typeof c === 'object' ? c : {};
  const p = o.portada && typeof o.portada === 'object' ? o.portada : {};
  const orden = unicos([...lista(p.orden).filter((id) => VENTANAS.includes(id)), ...VENTANAS]);
  const ventanas = {};
  for (const id of VENTANAS) ventanas[id] = normVentana(p.ventanas?.[id]);
  return {
    portada: { titulo: txt(p.titulo, 40), sub: txt(p.sub, 120), orden, ventanas },
    menu: { ocultos: unicos(lista(o.menu?.ocultos)) },
    lateral: { ocultos: unicos(lista(o.lateral?.ocultos)) },
    textos: normTextos(o.textos),
    enlaces: (Array.isArray(o.enlaces) ? o.enlaces : []).filter((e) => e && txt(e.titulo, 22) && hrefValido(e.href)).slice(0, MAX_ENLACES).map((e) => ({ titulo: txt(e.titulo, 22), href: e.href.trim() })),
  };
}

/** Sube (-1) o baja (+1) una ventana en el orden. */
export function mover(orden, id, paso) {
  const a = [...orden]; const i = a.indexOf(id); const j = i + paso;
  if (i < 0 || j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

/** Arrastrar: pone `id` en el lugar de `haciaId` (los demás se corren). */
export function moverA(orden, id, haciaId) {
  const a = orden.filter((x) => x !== id); const j = a.indexOf(haciaId);
  if (j < 0 || !orden.includes(id)) return [...orden];
  const i0 = orden.indexOf(id), j0 = orden.indexOf(haciaId);
  a.splice(i0 < j0 ? j + 1 : j, 0, id);
  return a;
}

/** Pone o quita un id de una lista (para ocultar/mostrar botones). */
export function alternar(lista0, id) {
  return lista0.includes(id) ? lista0.filter((x) => x !== id) : [...lista0, id];
}

/** ¿Hay algo distinto del sitio original? (para saber si «Restaurar» tiene sentido) */
export const esBase = (c) => JSON.stringify(normalizar(c)) === JSON.stringify(normalizar({}));
export const iguales = (a, b) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
