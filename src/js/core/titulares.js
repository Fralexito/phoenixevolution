// Titulares de la portada «transmisión» (FX.transmision): frases cortas sacadas de los resultados REALES de la liga,
// cada una con el partido que la respalda (para el marcador). Lógica pura, sin DOM. Pruebas: tests/titulares.test.mjs
// Cada titular: { id, lineas: [primera, segunda], partido: { l, v, gl, gv, fecha, etiqueta } | null }. La 2.ª línea va con el degradado.
import { calcularTabla } from './tabla.js';

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const conFecha = (f, m, etiqueta) => ({ l: m.l, v: m.v, gl: jugado(m) ? m.gl : null, gv: jugado(m) ? m.gv : null, fecha: f.n, etiqueta });

/** Racha actual de victorias de cada jugador (contando desde su último partido jugado hacia atrás). */
export function rachaVictorias(fechas) {
  const hist = new Map();
  for (const f of fechas ?? []) for (const m of f.partidos ?? []) {
    if (!jugado(m)) continue;
    const r = m.gl > m.gv ? ['G', 'P'] : m.gl < m.gv ? ['P', 'G'] : ['E', 'E'];
    [m.l, m.v].forEach((n, i) => hist.set(n, [...(hist.get(n) ?? []), r[i]]));
  }
  const out = new Map();
  hist.forEach((rs, n) => { let k = 0; for (let i = rs.length - 1; i >= 0 && rs[i] === 'G'; i -= 1) k += 1; out.set(n, k); });
  return out;
}

export function titularesPortada(fechas) {
  const fs = (fechas ?? []).filter((f) => Array.isArray(f?.partidos));
  const tabla = calcularTabla(fs.flatMap((f) => f.partidos)).tabla.filter((t) => t.pj > 0);
  const jugadas = fs.filter((f) => f.partidos.some(jugado));
  const proxFecha = fs.find((f) => f.partidos.some((m) => !jugado(m))) ?? null;
  const top = new Set(tabla.slice(0, 4).map((t) => t.nombre));
  const lider = tabla[0] ?? null;
  const usados = new Set();
  const clave = (p) => (p ? `${p.fecha}|${p.l}|${p.v}` : '');
  const out = [];
  const push = (t) => { if (t.partido && usados.has(clave(t.partido))) t.partido = null; if (t.partido) usados.add(clave(t.partido)); out.push(t); };

  // Próximo partido «grande»: entre dos del top 4; si no hay, el primero sin jugar de la fecha en curso.
  const proximos = proxFecha ? proxFecha.partidos.filter((m) => !jugado(m)) : [];
  const grande = proximos.find((m) => top.has(m.l) && top.has(m.v)) ?? null;
  const elProximo = grande ?? proximos[0] ?? null;

  // 1. Bienvenida (la marca), con el próximo partido.
  const ultimo = [...jugadas].reverse()[0];
  const ultimoPartido = ultimo ? [...ultimo.partidos].reverse().find(jugado) : null;
  push({ id: 'bienvenida', lineas: ['Bienvenido a la', 'Galaxy'], partido: elProximo ? conFecha(proxFecha, elProximo, 'Próximo') : ultimoPartido ? conFecha(ultimo, ultimoPartido, 'Final') : null });

  // 2. El líder.
  if (lider) {
    const suyo = [...jugadas].reverse().flatMap((f) => [...f.partidos].reverse().filter((m) => jugado(m) && (m.l === lider.nombre || m.v === lider.nombre)).map((m) => conFecha(f, m, 'Final')))[0] ?? null;
    const invicto = lider.p === 0 && lider.pj >= 3;
    push({ id: 'lider', lineas: invicto ? [`${lider.nombre} sigue invicto.`, '¿Quién lo baja?'] : [`${lider.nombre} manda en la tabla.`, `${lider.pts} puntos y contando.`], partido: suyo });
  }

  // 3. La goleada más reciente (diferencia de 3 o más en las 2 últimas fechas jugadas).
  let gol = null;
  for (const f of jugadas.slice(-2)) for (const m of f.partidos) {
    if (!jugado(m)) continue;
    const d = Math.abs(m.gl - m.gv);
    if (d >= 3 && (!gol || d > gol.d || (d === gol.d && f.n > gol.f.n))) gol = { d, f, m };
  }
  if (gol) {
    const [g, p, n] = gol.m.gl > gol.m.gv ? [gol.m.l, gol.m.v, gol.m.gl] : [gol.m.v, gol.m.l, gol.m.gv];
    push({ id: 'goleada', lineas: [`${g} le metió ${n} a ${p}.`, `Goleada en la fecha ${gol.f.n}.`], partido: conFecha(gol.f, gol.m, 'Final') });
  }

  // 4. Racha: el mejor que no sea el líder, con 3 o más victorias seguidas.
  const rachas = [...rachaVictorias(fs)].filter(([n, k]) => k >= 3 && n !== lider?.nombre).sort((a, b) => b[1] - a[1]);
  if (rachas.length) {
    const [n, k] = rachas[0];
    const suyo = [...jugadas].reverse().flatMap((f) => f.partidos.filter((m) => jugado(m) && (m.l === n || m.v === n)).map((m) => conFecha(f, m, 'Final')))[0] ?? null;
    push({ id: 'racha', lineas: [`${n} ganó sus últimos ${k}.`, 'Viene encendido.'], partido: suyo });
  }

  // 5. Lo que se viene (si el partido grande no se usó ya en la bienvenida), o la pelea por la cima.
  if (grande && !usados.has(clave(conFecha(proxFecha, grande, 'Próximo')))) {
    push({ id: 'duelo', lineas: [`Se viene ${grande.l} vs ${grande.v}.`, `Fecha ${proxFecha.n}.`], partido: conFecha(proxFecha, grande, 'Próximo') });
  } else if (tabla.length > 1 && lider && lider.pts - tabla[1].pts <= 3) {
    const d = lider.pts - tabla[1].pts;
    push({ id: 'cima', lineas: [d === 0 ? 'Empate en la cima.' : `Solo ${d} ${d === 1 ? 'punto separa' : 'puntos separan'}`, d === 0 ? 'Nadie suelta el primer puesto.' : 'al primero del segundo.'], partido: null });
  }
  return out;
}

/** Línea de estado de la portada: «Fecha 9 en juego», «Terminada»… a partir de estadoLiga (core/pulso.js). */
export function lineaEstado(est) {
  if (!est || est.estado === 'sin_datos') return { texto: 'Galaxy League', vivo: false };
  if (est.estado === 'terminada') return { texto: 'Galaxy League · temporada terminada', vivo: false };
  if (est.estado === 'por_empezar') return { texto: `Galaxy League · arranca la fecha ${est.actual}`, vivo: false };
  return { texto: `Galaxy League · fecha ${est.actual} en juego`, vivo: true };
}
