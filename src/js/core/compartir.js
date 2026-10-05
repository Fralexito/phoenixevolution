// Datos de las TARJETAS PARA COMPARTIR (sin DOM → probable con `npm test`). El dibujo en canvas vive en features/compartir.js.
import { escudoDe } from './escudos.js';

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);
const recorta = (s, n) => { const t = String(s ?? ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

/**
 * Tarjeta «Resultados de la fecha».
 * @returns {{kind:'fecha', cabecera:string, titulo:string, filas:{l:string,v:string,gl:number|null,gv:number|null,cl:string|null,cv:string|null,jugado:boolean}[], pie:string, texto:string}}
 */
export function datosFecha({ liga = '', edicion = '', fecha, clubes = {} }) {
  const ps = fecha?.partidos ?? []; const js = ps.filter(jugado);
  const goles = js.reduce((a, m) => a + m.gl + m.gv, 0);
  const filas = ps.slice(0, 8).map((m) => ({ l: recorta(m.l, 14), v: recorta(m.v, 14), gl: jugado(m) ? m.gl : null, gv: jugado(m) ? m.gv : null, cl: escudoDe(clubes[m.l]), cv: escudoDe(clubes[m.v]), jugado: jugado(m) }));
  const pie = js.length ? `${goles} goles en ${js.length} partido${js.length === 1 ? '' : 's'}` : 'Fecha por jugar';
  const texto = `${liga} · Fecha ${fecha?.n ?? ''}\n${ps.map((m) => (jugado(m) ? `${m.l} ${m.gl}-${m.gv} ${m.v}` : `${m.l} vs ${m.v}`)).join('\n')}`;
  return { kind: 'fecha', cabecera: String(liga).toUpperCase(), titulo: `FECHA ${fecha?.n ?? ''}`, sub: edicion, filas, pie, texto };
}

/**
 * Tarjeta «Mi campaña» de un jugador. `campana` es lo que devuelve core/perfil.js campana(); `forma` = array de 'G'|'E'|'P'.
 */
export function datosJugador({ liga = '', edicion = '', nombre, campana, forma = [] }) {
  const f = campana?.fila; if (!f) return null;
  const texto = `${nombre} · ${liga} ${edicion}\n${campana.puesto}º de ${campana.total} · ${f.pts} pts · ${f.g}G ${f.e}E ${f.p}P · ${f.gf}:${f.gc}`;
  return {
    kind: 'jugador', cabecera: String(liga).toUpperCase(), titulo: recorta(nombre, 14).toUpperCase(), sub: `${edicion}${campana.club ? ` · ${campana.club}` : ''}`,
    escudo: escudoDe(campana.club), puesto: campana.puesto, total: campana.total, pts: f.pts, g: f.g, e: f.e, p: f.p, gf: f.gf, gc: f.gc, dg: f.dg, forma: forma.slice(-5), texto,
  };
}

/** Nombre de archivo seguro para descargar. */
export const nombreArchivo = (txt) => `${String(txt ?? 'tarjeta').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tarjeta'}.png`;
