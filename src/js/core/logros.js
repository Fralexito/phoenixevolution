// Reglas de presentación de los LOGROS (puro, sin DOM → probable). Qué se gana y con qué metas lo decide la BD (migración 035, tabla logros_catalogo);
// aquí solo se normaliza lo recibido, se ordena y se calcula el estilo/porcentaje a mostrar.

export const NIVELES = Object.freeze({
  oro:    { nombre: 'Oro',    orden: 0, clase: 'text-amber-300 border-amber-300/50 bg-amber-300/10' },
  plata:  { nombre: 'Plata',  orden: 1, clase: 'text-slate-200 border-slate-300/40 bg-slate-300/10' },
  bronce: { nombre: 'Bronce', orden: 2, clase: 'text-orange-300 border-orange-400/40 bg-orange-400/10' },
});
export const CATEGORIAS_LOGRO = Object.freeze([['duelos', 'Duelos'], ['muro', 'Muro'], ['social', 'Social'], ['cuenta', 'Cuenta']]);

const ICONO = /^fa-[a-z0-9-]{2,30}$/;
export const nivelDe = (n) => NIVELES[n] ?? NIVELES.bronce;
/** El icono viene de la BD; solo se admite el formato `fa-xxx` (nada de comillas ni HTML en una clase). */
export const iconoSeguro = (i) => (typeof i === 'string' && ICONO.test(i) ? i : 'fa-medal');
/** Porcentaje 0‑100 (entero) de progreso; datos raros → 0. */
export function porcentaje(progreso, objetivo) {
  const p = Number(progreso), o = Number(objetivo);
  if (!Number.isFinite(p) || !Number.isFinite(o) || o <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((p / o) * 100)));
}
/** Respuesta de `mis_logros` → { logros (con `obtenido` y `pct`), obtenidos, total }. Tolera null y basura. */
export function normalizarMisLogros(r) {
  const logros = (Array.isArray(r?.logros) ? r.logros : []).filter((l) => l && typeof l.id === 'string').map((l) => ({
    ...l, icono: iconoSeguro(l.icono), obtenido: !!l.obtenido_at, pct: l.obtenido_at ? 100 : porcentaje(l.progreso, l.objetivo),
  }));
  return { logros, obtenidos: logros.filter((l) => l.obtenido).length, total: logros.length };
}
/** Respuesta de `logros_de` → { visible, logros (oro primero), obtenidos }. */
export function normalizarLogrosDe(r) {
  const logros = (Array.isArray(r?.logros) ? r.logros : []).filter((l) => l && typeof l.id === 'string').map((l) => ({ ...l, icono: iconoSeguro(l.icono) }))
    .sort((a, b) => nivelDe(a.nivel).orden - nivelDe(b.nivel).orden);
  return { visible: r?.visible === true, logros, obtenidos: logros.length };
}
