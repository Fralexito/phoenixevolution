// PREMIOS de la liga (ronda 265). Lógica pura, sin DOM ni base de datos. Pruebas: tests/premios.test.mjs
// Pedido de Fralex: los reconocimientos de antes («Jugador de la fecha», «Más en forma», «Revelación») eran genéricos.
// Aquí salen MUCHOS premios con personalidad, calculados solos con los resultados de la edición (l, v, gl, gv por partido).
// Cada premio dice: quién lo ganó, el número que lo explica y una frase corta. Solo aparece si hay una historia que contar
// (por ejemplo, «La Paliza» no sale si nadie ganó por 3 o más). `peso` ordena del más llamativo al menos.
import { calcularTabla } from './tabla.js';

const jugado = (m) => m && m.l && m.v && m.l !== m.v && Number.isInteger(m.gl) && Number.isInteger(m.gv);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const redondeo = (x) => Math.round(x * 10) / 10;

/** Estadísticas de cada jugador en una lista de partidos, en orden. */
function acumular(partidos) {
  const m = new Map();
  const de = (n) => { if (!m.has(n)) m.set(n, { nombre: n, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, ceros: 0, res: [] }); return m.get(n); };
  for (const x of partidos) {
    if (!jugado(x)) continue;
    const a = de(x.l); const b = de(x.v);
    a.pj += 1; b.pj += 1; a.gf += x.gl; a.gc += x.gv; b.gf += x.gv; b.gc += x.gl;
    if (x.gv === 0) a.ceros += 1; if (x.gl === 0) b.ceros += 1;
    if (x.gl > x.gv) { a.g += 1; b.p += 1; a.res.push('G'); b.res.push('P'); }
    else if (x.gl < x.gv) { b.g += 1; a.p += 1; a.res.push('P'); b.res.push('G'); }
    else { a.e += 1; b.e += 1; a.res.push('E'); b.res.push('E'); }
  }
  return m;
}
/** Largo de la racha ACTUAL (desde el último partido hacia atrás) que cumple `ok`. */
function rachaActual(res, ok) { let n = 0; for (let i = res.length - 1; i >= 0 && ok(res[i]); i -= 1) n += 1; return n; }
/** El mayor según `valor`; entre iguales, el que va primero por nombre (para que el resultado no dependa del orden). */
function mejor(lista, valor) {
  let top = null;
  for (const x of lista) { const v = valor(x); if (v == null || Number.isNaN(v)) continue; if (!top || v > top.v || (v === top.v && x.nombre.localeCompare(top.x.nombre, 'es') < 0)) top = { x, v }; }
  return top;
}
const ganadorDe = (x) => (x.gl > x.gv ? { g: x.l, per: x.v, gf: x.gl, gc: x.gv } : { g: x.v, per: x.l, gf: x.gv, gc: x.gl });

/**
 * Premios de una edición. `ovrDe(nombre)` (opcional) devuelve la media de la carta para el premio «Revelación».
 * Devuelve { fecha: n | null, premios: [{ id, grupo: 'fecha'|'edicion', titulo, icono, color, nombre, valor, unidad, detalle, peso }] }.
 */
export function premiosEdicion(edicion, { ovrDe } = {}) {
  const fechas = (edicion?.fechas ?? []).filter((f) => Array.isArray(f?.partidos));
  const ult = [...fechas].reverse().find((f) => f.partidos.some(jugado)) ?? null;
  const todos = fechas.flatMap((f) => f.partidos).filter(jugado);
  const premios = [];
  const add = (p) => { if (p) premios.push(p); };
  if (!todos.length) return { fecha: null, premios };

  // ───── De la última fecha jugada ─────
  if (ult) {
    const deFecha = ult.partidos.filter(jugado);
    // La Paliza: la goleada más grande (mínimo 3 de diferencia)
    const pal = mejor(deFecha.filter((x) => x.gl !== x.gv).map((x) => ({ ...ganadorDe(x), nombre: ganadorDe(x).g })), (x) => (x.gf - x.gc) * 100 + x.gf);
    if (pal && pal.x.gf - pal.x.gc >= 3) add({ id: 'paliza', grupo: 'fecha', titulo: 'La Paliza', icono: 'fa-hand-fist', color: '#f97316', nombre: pal.x.g, valor: `${pal.x.gf}-${pal.x.gc}`, unidad: `a ${pal.x.per}`, detalle: `La goleada más grande de la fecha ${ult.n}.`, peso: 60 + (pal.x.gf - pal.x.gc) * 4 });
    // Pichichi de la fecha: más goles anotados en la fecha (mínimo 3)
    const gf = acumular(deFecha);
    const pich = mejor([...gf.values()], (x) => x.gf);
    if (pich && pich.v >= 3 && !(pal && pal.x.g === pich.x.nombre && pal.x.gf === pich.v)) add({ id: 'pichichi', grupo: 'fecha', titulo: 'Pichichi de la fecha', icono: 'fa-futbol', color: '#facc15', nombre: pich.x.nombre, valor: String(pich.v), unidad: 'goles', detalle: `Nadie metió más goles en la fecha ${ult.n}.`, peso: 50 + pich.v * 3 });
    // Matagigantes: le ganó a alguien que estaba al menos 3 puestos más arriba en la tabla ANTES de la fecha
    const antes = calcularTabla(fechas.filter((f) => f.n < ult.n).flatMap((f) => f.partidos)).tabla;
    const pos = new Map(antes.map((f, i) => [f.nombre, i + 1]));
    const sorpresas = deFecha.filter((x) => x.gl !== x.gv).map((x) => { const w = ganadorDe(x); const pw = pos.get(w.g); const pp = pos.get(w.per); return pw && pp ? { ...w, nombre: w.g, pw, pp, dif: pw - pp } : null; }).filter(Boolean);
    const mata = mejor(sorpresas, (x) => x.dif);
    if (mata && mata.v >= 3) add({ id: 'matagigantes', grupo: 'fecha', titulo: 'Matagigantes', icono: 'fa-bolt', color: '#a78bfa', nombre: mata.x.g, valor: `${mata.x.pw}.º`, unidad: `venció al ${mata.x.pp}.º`, detalle: `Le ganó ${mata.x.gf}-${mata.x.gc} a ${mata.x.per}, que estaba ${plural(mata.v, 'puesto', 'puestos')} más arriba.`, peso: 70 + mata.v * 3 });
    // Partidazo de la fecha: el partido con más goles (mínimo 6)
    const pz = mejor(deFecha.map((x) => ({ ...x, nombre: `${x.l} ${x.v}` })), (x) => x.gl + x.gv);
    const mismoQuePaliza = pal && pz && pal.x.gf - pal.x.gc >= 3 && [pz.x.l, pz.x.v].includes(pal.x.g) && [pz.x.l, pz.x.v].includes(pal.x.per);
    if (pz && pz.v >= 6 && !mismoQuePaliza) add({ id: 'partidazo', grupo: 'fecha', titulo: 'Partidazo de la fecha', icono: 'fa-fire-flame-curved', color: '#fb7185', nombre: `${pz.x.l} vs ${pz.x.v}`, valor: `${pz.x.gl}-${pz.x.gv}`, unidad: plural(pz.v, 'gol', 'goles'), detalle: `El partido con más goles de la fecha ${ult.n}.`, peso: 40 + pz.v * 2, duelo: true });
  }

  // ───── De toda la edición (mínimo 3 partidos para entrar) ─────
  const st = [...acumular(todos).values()];
  const aptos = st.filter((x) => x.pj >= 3);
  if (aptos.length) {
    const lider = calcularTabla(todos).tabla[0];
    if (lider) add({ id: 'lider', grupo: 'edicion', titulo: 'El que manda', icono: 'fa-crown', color: '#fbbf24', nombre: lider.nombre, valor: String(lider.pts), unidad: 'puntos', detalle: `Líder de la tabla con ${plural(lider.g, 'victoria', 'victorias')} en ${plural(lider.pj, 'partido', 'partidos')}.`, peso: 45 });
    const can = mejor(aptos, (x) => x.gf);
    if (can) add({ id: 'canonero', grupo: 'edicion', titulo: 'El Cañonero', icono: 'fa-bullseye', color: '#f43f5e', nombre: can.x.nombre, valor: String(can.v), unidad: 'goles', detalle: `El que más goles lleva en la edición (${redondeo(can.v / can.x.pj)} por partido).`, peso: 44 });
    const mur = mejor(aptos, (x) => -x.gc / x.pj);
    if (mur) add({ id: 'muralla', grupo: 'edicion', titulo: 'La Muralla', icono: 'fa-shield-halved', color: '#38bdf8', nombre: mur.x.nombre, valor: String(redondeo(-mur.v)), unidad: 'recibe por partido', detalle: `La defensa más difícil de romper: ${plural(mur.x.gc, 'gol recibido', 'goles recibidos')} en ${plural(mur.x.pj, 'partido', 'partidos')}.`, peso: 43 });
    const llam = mejor(aptos, (x) => rachaActual(x.res, (r) => r === 'G'));
    if (llam && llam.v >= 3) add({ id: 'enllamas', grupo: 'edicion', titulo: 'En Llamas', icono: 'fa-fire', color: '#fb923c', nombre: llam.x.nombre, valor: String(llam.v), unidad: 'victorias seguidas', detalle: 'La racha de victorias más larga en este momento.', peso: 50 + llam.v * 3 });
    const imp = mejor(aptos, (x) => rachaActual(x.res, (r) => r !== 'P'));
    if (imp && imp.v >= 4 && !(llam && llam.x.nombre === imp.x.nombre && llam.v === imp.v)) add({ id: 'imparable', grupo: 'edicion', titulo: 'Imparable', icono: 'fa-person-running', color: '#34d399', nombre: imp.x.nombre, valor: String(imp.v), unidad: 'partidos sin perder', detalle: 'Nadie lo ha podido vencer últimamente.', peso: 42 + imp.v * 2 });
    const cer = mejor(aptos, (x) => x.ceros);
    if (cer && cer.v >= 2) add({ id: 'cerrojo', grupo: 'edicion', titulo: 'El Cerrojo', icono: 'fa-lock', color: '#22d3ee', nombre: cer.x.nombre, valor: String(cer.v), unidad: 'vallas invictas', detalle: 'El que más veces dejó su arco en cero.', peso: 38 + cer.v * 2 });
    const dom = mejor(aptos, (x) => x.gf - x.gc);
    if (dom && dom.v > 0 && dom.x.nombre !== lider?.nombre) add({ id: 'dominante', grupo: 'edicion', titulo: 'El Dominante', icono: 'fa-chart-line', color: '#818cf8', nombre: dom.x.nombre, valor: `+${dom.v}`, unidad: 'diferencia de gol', detalle: 'La mejor diferencia entre goles hechos y recibidos.', peso: 34 });
    const emp = mejor(aptos, (x) => x.e);
    if (emp && emp.v >= 3) add({ id: 'empates', grupo: 'edicion', titulo: 'Rey del Empate', icono: 'fa-scale-balanced', color: '#94a3b8', nombre: emp.x.nombre, valor: String(emp.v), unidad: 'empates', detalle: 'Nadie reparte más puntos que él.', peso: 22 + emp.v });
    if (typeof ovrDe === 'function') {
      const rev = mejor(aptos.filter((x) => Number.isFinite(ovrDe(x.nombre))), (x) => { const real = (x.g * 3 + x.e) / (x.pj * 3); const esperado = Math.min(1, Math.max(0, (ovrDe(x.nombre) - 60) / 40)); return real - esperado; });
      if (rev && rev.v > 0.15) add({ id: 'revelacion', grupo: 'edicion', titulo: 'La Revelación', icono: 'fa-seedling', color: '#4ade80', nombre: rev.x.nombre, valor: `${Math.round(((rev.x.g * 3 + rev.x.e) / (rev.x.pj * 3)) * 100)}%`, unidad: 'de los puntos', detalle: 'Rinde muy por encima de lo que dice la media de su carta.', peso: 40 });
    }
  }
  // Récords de toda la edición
  const palE = mejor(todos.filter((x) => x.gl !== x.gv).map((x) => ({ ...ganadorDe(x), nombre: ganadorDe(x).g })), (x) => (x.gf - x.gc) * 100 + x.gf);
  if (palE && palE.x.gf - palE.x.gc >= 5) add({ id: 'record-goleada', grupo: 'edicion', titulo: 'Goleada Histórica', icono: 'fa-meteor', color: '#ef4444', nombre: palE.x.g, valor: `${palE.x.gf}-${palE.x.gc}`, unidad: `a ${palE.x.per}`, detalle: 'La goleada más grande de toda la edición.', peso: 36 });
  const pzE = mejor(todos.map((x) => ({ ...x, nombre: `${x.l} ${x.v}` })), (x) => x.gl + x.gv);
  const mismoQueGoleada = palE && pzE && [pzE.x.l, pzE.x.v].includes(palE.x.g) && [pzE.x.l, pzE.x.v].includes(palE.x.per) && palE.x.gf - palE.x.gc >= 5;
  if (pzE && pzE.v >= 8 && !mismoQueGoleada) add({ id: 'record-partido', grupo: 'edicion', titulo: 'El Partido del Año', icono: 'fa-star', color: '#e879f9', nombre: `${pzE.x.l} vs ${pzE.x.v}`, valor: `${pzE.x.gl}-${pzE.x.gv}`, unidad: plural(pzE.v, 'gol', 'goles'), detalle: 'El partido con más goles de toda la edición.', peso: 30, duelo: true });

  premios.sort((a, b) => b.peso - a.peso);
  return { fecha: ult?.n ?? null, premios };
}
