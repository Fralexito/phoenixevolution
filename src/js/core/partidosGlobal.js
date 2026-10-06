// Historial GLOBAL de partidos — lógica PURA (sin DOM → probable): aplana todas las ligas/ediciones, filtra y pagina.
import { selloPartido } from './pulso.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const JUGADOS = new Set(['oficial', 'wo', 'incidencia']);   // sellos que llevan marcador

/**
 * Todos los partidos de todas las ligas en una lista plana. Orden: fecha más reciente primero; a igualdad, orden de las ligas y luego del fixture.
 * @param {{id:string, titulo:string[]}[]} ligas  @param {Record<string, object[]>} ediciones (data/ligaResultados.js → EDICIONES)
 * @returns {{clave:string, liga:string, ligaTitulo:string, edicion:string, edicionNombre:string, fecha:number, l:string, v:string, gl:number|null, gv:number|null, sello:string, jugado:boolean, clubL:string, clubV:string, orden:number}[]}
 */
export function aplanarPartidos(ligas, ediciones) {
  const out = []; let orden = 0;
  (ligas ?? []).forEach((liga, li) => {
    for (const ed of ediciones?.[liga.id] ?? []) for (const f of ed.fechas ?? []) for (const m of f.partidos ?? []) {
      const sello = selloPartido(m);
      out.push({
        clave: `${liga.id}|${ed.id}|${f.n}|${m.l}|${m.v}`, liga: liga.id, ligaTitulo: (liga.titulo ?? []).join(' '), edicion: ed.id, edicionNombre: ed.nombre ?? '',
        fecha: f.n, l: m.l, v: m.v, gl: m.gl ?? null, gv: m.gv ?? null, sello, jugado: JUGADOS.has(sello),
        clubL: ed.clubes?.[m.l] ?? '', clubV: ed.clubes?.[m.v] ?? '', orden: orden++, _li: li,
      });
    }
  });
  return out.sort((a, b) => b.fecha - a.fecha || a._li - b._li || a.orden - b.orden).map(({ _li, ...x }) => x);
}

/**
 * Filtros: `liga` (id), `estado` ('' todos · 'jugados' · 'pendientes' · 'aplazado' · 'wo' · 'incidencia') y `q` (texto: todas las palabras deben aparecer
 * en jugador, club o liga; «fecha N» filtra por esa fecha exacta; sin tildes ni mayúsculas).
 */
export function filtrarPartidos(lista, { liga = '', estado = '', q = '' } = {}) {
  let texto = norm(q); const f = texto.match(/\bfecha\s*(\d{1,2})\b/); if (f) texto = texto.replace(f[0], ' ');   // «fecha 8» = exactamente la fecha 8 (no «18»)
  const ps = texto.split(/\s+/).filter(Boolean);
  return (lista ?? []).filter((m) => {
    if (f && m.fecha !== Number(f[1])) return false;
    if (liga && m.liga !== liga) return false;
    if (estado === 'jugados' && !m.jugado) return false;
    if (estado === 'pendientes' && m.sello !== 'pendiente') return false;
    if (['aplazado', 'wo', 'incidencia'].includes(estado) && m.sello !== estado) return false;
    if (!ps.length) return true;
    const t = norm(`${m.l} ${m.v} ${m.clubL} ${m.clubV} ${m.ligaTitulo}`);
    return ps.every((w) => t.includes(w));
  });
}

/** Una página de la lista (1-based; se ajusta a los límites). `paginas` nunca baja de 1. */
export function paginar(lista, pagina = 1, tam = 15) {
  const l = Array.isArray(lista) ? lista : []; const paginas = Math.max(1, Math.ceil(l.length / tam));
  const p = Math.min(paginas, Math.max(1, Math.trunc(Number(pagina)) || 1));
  return { items: l.slice((p - 1) * tam, p * tam), pagina: p, paginas, total: l.length };
}

/** Lee los filtros desde una cadena de consulta (?liga=&estado=&q=&p=) validando cada valor; lo desconocido vuelve al valor por defecto. */
export function leerFiltros(busqueda, ligasValidas = []) {
  const u = new URLSearchParams(busqueda ?? '');
  const liga = u.get('liga') ?? ''; const estado = u.get('estado') ?? '';
  return {
    liga: ligasValidas.includes(liga) ? liga : '',
    estado: ['jugados', 'pendientes', 'aplazado', 'wo', 'incidencia'].includes(estado) ? estado : 'jugados',
    q: (u.get('q') ?? '').slice(0, 40), pagina: Math.max(1, Math.trunc(Number(u.get('p'))) || 1),
  };
}
