// EL ORDEN DEL DÍA (lógica pura → probable con `npm test`).
// La portada NO tiene un orden fijo: cada día se baraja sola. Pero el azar está atado a cinco reglas
// para que nunca quede fea: manda lo que pasó hoy · lo serio antes que la joda · nada repetido al lado ·
// lo urgente nunca al final · y si el staff acomodó a mano, su orden manda sobre todo.
import { hash, azar } from './noticiasPlantillas.js';
import { departamentoDe, departamento, esJoda, esUrgente } from './departamentos.js';
import { hayOrdenManual } from './noticias.js';

/** Clave del día (hora local): misma clave ⇒ misma portada durante todo el día. */
export const claveDia = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Qué tan fresca es la noticia: 40 puntos hoy, 0 si pasó una semana. */
export function frescura(n, hoy = new Date()) {
  const d = new Date(n?.publicadaEn); if (Number.isNaN(d.getTime())) return 10;
  const dia = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const dif = Math.round((dia(hoy) - dia(d)) / 86400000);
  if (dif <= 0) return 40; if (dif === 1) return 30; if (dif === 2) return 22; if (dif < 7) return 14;
  return 0;
}

/** Regla 5: lo urgente (Tribunal, En vivo) nunca queda enterrado al final. */
function subirUrgentes(items, limite = 4) {
  for (let i = limite; i < items.length; i += 1) {
    if (!esUrgente(items[i].dep)) continue;
    const [u] = items.splice(i, 1); items.splice(Math.min(limite - 1, items.length), 0, u);
  }
  return items;
}
/** Regla 3: nunca dos del mismo departamento pegadas (si hay con qué cambiarlas). */
function separarIguales(items) {
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].dep !== items[i - 1].dep) continue;
    const j = items.findIndex((x, k) => k > i && x.dep !== items[i - 1].dep && (k + 1 >= items.length || items[k + 1].dep !== items[i].dep));
    if (j > i) { const t = items[i]; items[i] = items[j]; items[j] = t; }
  }
  return items;
}

/**
 * Baraja las noticias del día. Mismo día ⇒ mismo orden para todos; mañana es otro.
 * @returns {{noticia:object, dep:string, punt:number}[]} serios primero, joda al final.
 */
export function ordenDelDia(lista, { hoy = new Date(), semilla = null } = {}) {
  const r = azar(semilla ?? hash(claveDia(hoy)));
  const items = lista.map((n) => {
    const dep = departamentoDe(n);
    return { noticia: n, dep, punt: departamento(dep).peso + frescura(n, hoy) + (n.destacada ? 15 : 0) + r() * 30 };
  });
  if (hayOrdenManual(lista)) return items;   // el staff acomodó a mano: su orden manda y el azar no lo toca
  const porPunt = (a, b) => b.punt - a.punt;
  const serios = items.filter((i) => !esJoda(i.dep)).sort(porPunt);
  const joda = items.filter((i) => esJoda(i.dep)).sort(porPunt);
  return [...separarIguales(subirUrgentes(serios)), ...joda];
}

/**
 * Arma la portada de hoy con lo justo y necesario (poco scroll):
 * afiche (la nota más fuerte) · primera plana · últimas · una fila de lo demás · la joda al final.
 */
export function armarPortada(lista, { hoy = new Date(), semilla = null, max = 6 } = {}) {
  const orden = ordenDelDia(lista, { hoy, semilla });
  const serios = orden.filter((i) => !esJoda(i.dep));
  const joda = orden.filter((i) => esJoda(i.dep));
  const afiche = serios[0] ?? joda[0] ?? null;
  const hero = serios[1] ?? null;
  const resto = serios.slice(2, 2 + max);
  const sobran = Math.max(0, serios.length - (2 + max));
  const ultimas = [...lista].sort((a, b) => String(b.publicadaEn).localeCompare(String(a.publicadaEn))).slice(0, 5);
  return { orden, afiche, hero, resto, sobran, joda: joda.slice(0, 3), ultimas };
}
