// Crónica automática de una fecha: arma un BORRADOR de noticia con plantillas (sin IA, sin costo) a partir de los resultados.
// El admin lo revisa y lo edita antes de publicarlo. Sin DOM → probable.
import { calcularTabla } from './tabla.js';
import { resumenFecha } from './ligaStats.js';

const hecho = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const club = (clubes, nombre) => (clubes?.[nombre] ? ` (${clubes[nombre]})` : '');

/**
 * @param {{fechas: {n:number, partidos:object[]}[], n: number, clubes?: object, nombreLiga?: string, nombreEdicion?: string}} datos
 * @returns {{titulo, resumen, cuerpo: string, tag: string, categoria: 'JORNADA'}|null} null si la fecha no existe o no tiene partidos jugados.
 */
export function generarCronica({ fechas, n, clubes = {}, nombreLiga = 'liga', nombreEdicion = '' }) {
  const fecha = (fechas ?? []).find((f) => f.n === n); if (!fecha) return null;
  const jugados = fecha.partidos.filter(hecho); if (!jugados.length) return null;
  const r = resumenFecha(fecha);
  const despues = calcularTabla((fechas ?? []).filter((f) => f.n <= n).flatMap((f) => f.partidos)).tabla;
  const previas = (fechas ?? []).filter((f) => f.n < n);
  const antes = previas.length ? calcularTabla(previas.flatMap((f) => f.partidos)).tabla : [];
  const lider = despues[0]; const cambioLider = antes[0] && antes[0].nombre !== lider.nombre;

  // Partido más abultado (a igual diferencia, el de más goles).
  const mayor = [...jugados].sort((a, b) => Math.abs(b.gl - b.gv) - Math.abs(a.gl - a.gv) || (b.gl + b.gv) - (a.gl + a.gv))[0];
  const dif = Math.abs(mayor.gl - mayor.gv);
  const gana = mayor.gl >= mayor.gv ? mayor.l : mayor.v; const pierde = gana === mayor.l ? mayor.v : mayor.l;
  const marcador = `${Math.max(mayor.gl, mayor.gv)}-${Math.min(mayor.gl, mayor.gv)}`;
  const verbo = dif >= 3 ? 'golea a' : 'se impone a';

  const titulo = (dif === 0 ? `Fecha ${n}: reparto de puntos en la ${nombreLiga}` : `Fecha ${n}: ${gana} ${verbo} ${pierde} ${marcador}`) + (cambioLider ? ` y ${lider.nombre} toma la cima` : '');
  const resumen = `${plural(r.jugados, 'partido', 'partidos')} y ${plural(r.goles, 'gol', 'goles')} (${r.promedio} por partido). ${lider.nombre} ${cambioLider ? 'asume el liderato' : 'lidera'} con ${plural(lider.pts, 'punto', 'puntos')}.`;

  const p = [];
  p.push(`La fecha ${n} de la ${nombreLiga}${nombreEdicion ? ` ${nombreEdicion}` : ''} dejó ${plural(r.jugados, 'partido', 'partidos')} con ${plural(r.goles, 'gol', 'goles')}, un promedio de ${r.promedio} por encuentro${r.empates ? ` y ${plural(r.empates, 'empate', 'empates')}` : ''}.`);
  p.push(`Resultados: ${jugados.map((m) => `${m.l} ${m.gl}-${m.gv} ${m.v}`).join('; ')}.`);
  if (dif > 0) p.push(`La mayor diferencia fue de ${gana}${club(clubes, gana)} ante ${pierde}: ${marcador}.`);
  const top = despues.slice(0, 3); const ultimo = despues[despues.length - 1];
  const detalle = top.map((f, i) => (i === 0 ? '' : `${f.nombre} (${f.pts})`)).filter(Boolean).join(' y ');
  p.push(`En la tabla, ${lider.nombre} ${cambioLider ? `desplaza a ${antes[0].nombre} y pasa a liderar` : 'lidera'} con ${plural(lider.pts, 'punto', 'puntos')}${detalle ? `, seguido de ${detalle}` : ''}. ${ultimo.nombre} ${ultimo === lider ? '' : `cierra la clasificación con ${plural(ultimo.pts, 'punto', 'puntos')}`}`.trim().replace(/\s+$/, '') + (ultimo === lider ? '' : '.'));
  const pend = fecha.partidos.filter((m) => !hecho(m));
  if (pend.length) p.push(`Quedan por jugarse de esta fecha: ${pend.map((m) => `${m.l} – ${m.v}`).join('; ')}.`);
  return { titulo, resumen, cuerpo: p.join('\n\n'), tag: `Fecha ${n}`, categoria: 'JORNADA' };
}
