// Lógica pura de Noticias (sin DOM ni red → probable con `npm test`).
// Forma en pantalla de una noticia: { id, slug, titulo, resumen, cuerpo: string[], categoria, tag, imagen, liga, destacada, publicada, publicadaEn (ISO), editable }.

export const CATEGORIAS = ['OFICIAL', 'JORNADA', 'TRIBUNAL'];
export const LIMITES = { titulo: [3, 140], resumen: [3, 400], cuerpo: [3, 20000], tag: [0, 40] };   // [BD] iguales a los check de la tabla `noticias`

/** «Auditoría Antifraude: Actas» → «auditoria-antifraude-actas» (minúsculas, sin tildes, solo a-z 0-9 y guiones; máx. 70). */
export function slugify(texto) {
  const s = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '');
  return s || 'noticia';
}
/** Si `base` ya existe en `usados`, añade -2, -3… hasta que quede libre. */
export function slugUnico(base, usados = []) {
  const set = new Set(usados); if (!set.has(base)) return base;
  let i = 2; while (set.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
/** Texto del editor → lista de párrafos (se separan por una línea en blanco). */
export const partirCuerpo = (texto) => String(texto ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** «Hoy», «Ayer», «Hace 3 días» (hasta 6) o «12 oct 2026». Cuenta días de calendario en la hora local. Fecha inválida → ''. */
export function fechaRelativa(iso, ahora = new Date()) {
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return '';
  const dia = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const dif = Math.round((dia(ahora) - dia(d)) / 86400000);
  if (dif <= 0) return 'Hoy'; if (dif === 1) return 'Ayer'; if (dif < 7) return `Hace ${dif} días`;
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Fila de la base de datos → forma en pantalla. */
export function normalizar(f) {
  return {
    id: f.id, slug: f.slug, titulo: f.titulo, resumen: f.resumen, cuerpo: partirCuerpo(f.cuerpo), categoria: f.categoria, tag: f.tag ?? '',
    imagen: f.imagen ?? '', liga: f.liga ?? 'galaxy', destacada: !!f.destacada, publicada: f.publicada !== false, publicadaEn: f.publicada_en ?? f.publicadaEn ?? '', editable: !!f.editable,
  };
}
/** Valida un borrador del editor con los mismos límites que la base. Devuelve { ok, errores: string[] }. */
export function validar(b) {
  const e = []; const largo = (v) => String(v ?? '').trim().length;
  const rango = (campo, nombre) => { const [min, max] = LIMITES[campo]; const n = largo(b[campo]); if (n < min) e.push(`${nombre}: escribe al menos ${min} caracteres.`); else if (n > max) e.push(`${nombre}: máximo ${max} caracteres (llevas ${n}).`); };
  rango('titulo', 'Título'); rango('resumen', 'Resumen'); rango('cuerpo', 'Texto'); rango('tag', 'Etiqueta');
  if (!CATEGORIAS.includes(b.categoria)) e.push('Categoría no válida.');
  if (b.imagen && !/^https:\/\//i.test(String(b.imagen).trim())) e.push('La imagen debe ser un enlace https://.');
  if (!/^[a-z0-9-]{1,40}$/.test(String(b.liga ?? ''))) e.push('Liga no válida.');
  return { ok: e.length === 0, errores: e };
}
/** Más recientes primero. No modifica la lista original. */
export const ordenar = (lista) => [...lista].sort((a, b) => String(b.publicadaEn).localeCompare(String(a.publicadaEn)));
/** La destacada de la lista (la marcada; si no hay, la más reciente). null si la lista está vacía. */
export const elegirDestacada = (lista) => lista.find((n) => n.destacada) ?? lista[0] ?? null;
/** Ids de liga que aparecen en las noticias, sin repetir y en orden de aparición. */
export const ligasPresentes = (lista) => [...new Set(lista.map((n) => n.liga))];
/** Filtra por categoría ('TODOS' = todas), liga ('TODAS' = todas) y texto (título, resumen o etiqueta). */
export function filtrar(lista, { cat = 'TODOS', liga = 'TODAS', term = '' } = {}) {
  const q = String(term).trim().toLowerCase();
  return lista.filter((n) => (cat === 'TODOS' || n.categoria === cat) && (liga === 'TODAS' || n.liga === liga) && (!q || [n.titulo, n.resumen, n.tag].some((s) => String(s).toLowerCase().includes(q))));
}
