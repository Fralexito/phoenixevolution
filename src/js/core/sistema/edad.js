// Reglas puras de la FECHA DE NACIMIENTO (sin DOM, sin red → probables). La BD (migración 037) es la que decide; esto solo valida el formulario
// y explica el resultado. «hoy» es inyectable para poder probar los bordes (cumpleaños).
export const EDAD_MINIMA = 13;
export const MAYORIA = 18;

/** Edad cumplida en años a la fecha `hoy`. Fechas inválidas → NaN. Solo cuenta el día, sin zonas horarias (se comparan año/mes/día). */
export function edadCumplida(iso, hoy = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '')); if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(y, mo - 1, d)); if (f.getUTCFullYear() !== y || f.getUTCMonth() !== mo - 1 || f.getUTCDate() !== d) return NaN;
  const hy = hoy.getFullYear(), hm = hoy.getMonth() + 1, hd = hoy.getDate();
  return hy - y - (hm < mo || (hm === mo && hd < d) ? 1 : 0);
}
/** 'bloqueado' (<13) | 'menor' (13-17) | 'adulto' (18+). */
export const categoriaDeEdad = (e) => (e < EDAD_MINIMA ? 'bloqueado' : e < MAYORIA ? 'menor' : 'adulto');

/** Valor del <input type=date> → { ok, iso, edad, categoria, error }. */
export function validarNacimiento(iso, hoy = new Date()) {
  const edad = edadCumplida(iso, hoy);
  if (!Number.isFinite(edad)) return { ok: false, iso: '', edad: NaN, categoria: null, error: 'Escribe tu fecha de nacimiento completa.' };
  if (edad < 0 || edad > 100) return { ok: false, iso: '', edad, categoria: null, error: 'Esa fecha de nacimiento no parece correcta. Revísala.' };
  return { ok: true, iso, edad, categoria: categoriaDeEdad(edad), error: '' };
}
/** Respuesta de `mi_edad_estado` → ¿hay que pedir la fecha? Solo si el servidor dice claramente que NO está declarada (ante la duda, no se bloquea a nadie). */
export const debePedirFecha = (r) => r?.declarada === false;
