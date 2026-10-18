// Datos físicos opcionales (altura y pie dominante; el peso se retiró a propósito: nadie debe sentirse obligado a darlo). Sin DOM → probable. Los límites deben coincidir con las checks de la BD [011].
export const ALTURA = { min: 120, max: 230 };
export const PESO = { min: 35, max: 160 };
export const PIES = ['Derecho', 'Izquierdo'];

/** Convierte lo escrito en un campo opcional: '' → {valor:null}; número válido → {valor}; inválido → {error:true}. */
export function leerMedida(texto, { min, max }) {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (t === '') return { valor: null, error: false };
  const n = Number(t);
  if (!Number.isFinite(n) || n < min || n > max) return { valor: null, error: true };
  return { valor: Math.round(n), error: false };
}
export const pieValido = (p) => (PIES.includes(p) ? p : null);

/** «182 cm · 78 kg · Pie der.» con solo lo que exista; '' si no hay nada. */
export function fisicoTexto(p) {
  const partes = [];
  if (p?.altura_cm) partes.push(`${p.altura_cm} cm`);
  if (p?.pie) partes.push(`Pie ${p.pie === 'Izquierdo' ? 'izq.' : 'der.'}`);
  return partes.join(' · ');
}

/** Datos físicos como piezas separadas para dibujarlas: [{k:'altura'|'peso'|'pie', texto, titulo}]. */
export function fisicoPartes(p) {
  const x = [];
  if (p?.altura_cm) x.push({ k: 'altura', texto: `${p.altura_cm} cm`, titulo: `Altura: ${p.altura_cm} cm` });
  if (p?.pie) x.push({ k: 'pie', texto: p.pie === 'Izquierdo' ? 'Izq.' : 'Der.', titulo: `Pie dominante: ${p.pie.toLowerCase()}` });
  return x;
}
