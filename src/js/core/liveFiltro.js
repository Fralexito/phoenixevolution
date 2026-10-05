// Filtro y búsqueda avanzada del historial «En vivo» (PURO, sin DOM → se prueba en tests/pure.test.mjs).
// Búsqueda: palabras sueltas (todas deben aparecer; sin acentos ni mayúsculas) + operadores  campo:valor  + exclusiones con  -palabra.
//   jugador:camilo   juego:pes   parche:dream   formato:2v2   tipo:radar | tipo:reto   hora:19:00-21:30   -fralex   "frase exacta"
// Se combina (AND) con los controles del panel (tipo, formato, juego, jugador, horas, demo).
import { norm } from './search.js';
import { etiquetaJuego } from './rules.js';

export const CAMPOS = ['jugador', 'juego', 'parche', 'formato', 'tipo', 'hora'];
export const TIPOS = { reto_aceptado: 'Retos aceptados', radar_on: 'Radar activado' };
export const FAMILIAS = ['PES 21', 'SP Football Life', 'EA FC', 'FIFA', 'eFootball'];

/** «jugador:camilo -fralex "reto aceptado" hora:19:00-21:00 gg» → { libres, frases, excluir, campos }. Nunca lanza. */
export function parsearBusqueda(texto) {
  const out = { libres: [], frases: [], excluir: [], campos: {} };
  const s = String(texto ?? '').slice(0, 200);
  const re = /(-?)(?:(\w+):)?(?:"([^"]*)"|(\S+))/g;
  let m;
  while ((m = re.exec(s))) {
    const [, neg, campo, frase, palabra] = m; const valor = norm(frase ?? palabra ?? '');
    if (!valor) continue;
    const c = campo ? campo.toLowerCase() : '';
    if (c && CAMPOS.includes(c) && !neg) { (out.campos[c] ??= []).push(valor); continue; }
    const crudo = c && !CAMPOS.includes(c) ? norm(`${campo}:${frase ?? palabra}`) : valor;   // «ab:cd» con campo desconocido se busca tal cual
    if (neg) out.excluir.push(crudo); else if (frase !== undefined) out.frases.push(crudo); else out.libres.push(crudo);
  }
  return out;
}

/** 'HH:MM' → minutos del día (0-1439) o null. */
export function minutosDe(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim()); if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]); return h < 24 && mi < 60 ? h * 60 + mi : null;
}
/** Minutos del día de `ts` en la zona dada (o la local). */
export function minutosDelDia(ts, timeZone) {
  const d = new Date(ts); if (Number.isNaN(d.getTime())) return null;
  if (!timeZone) return d.getHours() * 60 + d.getMinutes();
  try {
    const p = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(d);
    return Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
  } catch { return d.getHours() * 60 + d.getMinutes(); }
}
/** 'HH:MM-HH:MM' (también «19-21») → [desde, hasta] en minutos o null. Si desde > hasta cruza la medianoche (lo maneja enRango). */
export function rangoDe(texto) {
  const m = /^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)$/.exec(String(texto ?? '').trim()); if (!m) return null;
  const f = (x) => minutosDe(x.includes(':') ? x : `${x}:00`);
  const a = f(m[1]); const b = f(m[2]); return a === null || b === null ? null : [a, b];
}
const enRango = (min, a, b) => (a === null && b === null) || (a === null ? min <= b : b === null ? min >= a : (a <= b ? min >= a && min <= b : min >= a || min <= b));

/** Datos buscables de un evento (todo normalizado). */
export function fichaEvento(ev) {
  const etiqueta = etiquetaJuego(ev);
  const familia = FAMILIAS.find((f) => etiqueta.startsWith(f)) ?? '';
  const jugadores = [ev.quien, ev.rival].filter(Boolean).map(String);
  return {
    jugadores: jugadores.map(norm), etiqueta, familia, parche: norm(ev.parche), formato: norm(ev.formato), tipo: ev.tipo,
    tipoTxt: norm(ev.tipo === 'radar_on' ? 'radar activó el radar' : 'reto aceptó el reto'),
    pajar: norm([jugadores.join(' '), etiqueta, ev.formato, ev.parche, ev.version, ev.tipo === 'radar_on' ? 'radar activó el radar' : 'reto aceptó el reto', ev.demo ? 'demo' : 'real'].join(' ')),
  };
}

export const CRITERIOS_VACIOS = { texto: '', tipo: 'todos', formato: '', juego: '', jugador: '', desde: '', hasta: '', origen: 'todos', orden: 'desc' };

/** ¿Hay algún filtro activo? (para mostrar «Limpiar»). */
export const hayFiltros = (c) => !!(String(c?.texto ?? '').trim() || (c?.tipo && c.tipo !== 'todos') || c?.formato || c?.juego || c?.jugador || c?.desde || c?.hasta || (c?.origen && c.origen !== 'todos'));

/** Aplica criterios a la lista de eventos. No muta. `timeZone` = zona de las horas (la del ajuste de región). */
export function filtrarEventos(hist, criterios = {}, { timeZone } = {}) {
  const c = { ...CRITERIOS_VACIOS, ...criterios };
  const q = parsearBusqueda(c.texto);
  const desde = minutosDe(c.desde); const hasta = minutosDe(c.hasta);
  const rangosTxt = (q.campos.hora ?? []).map(rangoDe).filter(Boolean);
  const lista = (Array.isArray(hist) ? hist : []).filter((ev) => {
    if (!ev || !Number.isFinite(ev.ts)) return false;
    const f = fichaEvento(ev);
    if (c.tipo !== 'todos' && ev.tipo !== c.tipo) return false;
    if (c.formato && f.formato !== norm(c.formato)) return false;
    if (c.juego && f.familia !== c.juego) return false;
    if (c.jugador && !f.jugadores.includes(norm(c.jugador))) return false;
    if (c.origen === 'demo' && !ev.demo) return false;
    if (c.origen === 'real' && ev.demo) return false;
    const min = minutosDelDia(ev.ts, timeZone);
    if (!enRango(min, desde, hasta)) return false;
    if (rangosTxt.length && !rangosTxt.some(([a, b]) => enRango(min, a, b))) return false;
    const k = q.campos;
    if (k.jugador && !k.jugador.every((v) => f.jugadores.some((j) => j.includes(v)))) return false;
    if (k.juego && !k.juego.every((v) => norm(f.etiqueta).includes(v))) return false;
    if (k.parche && !k.parche.every((v) => f.parche.includes(v))) return false;
    if (k.formato && !k.formato.every((v) => f.formato === v)) return false;
    if (k.tipo && !k.tipo.every((v) => f.tipoTxt.includes(v))) return false;
    if (!q.libres.every((v) => f.pajar.includes(v)) || !q.frases.every((v) => f.pajar.includes(v))) return false;
    if (q.excluir.some((v) => f.pajar.includes(v))) return false;
    return true;
  });
  return lista.sort((a, b) => (c.orden === 'asc' ? a.ts - b.ts : b.ts - a.ts));
}

/** Opciones disponibles según lo que hay en el historial (con conteos), para los desplegables. */
export function facetas(hist) {
  const cuenta = (m, k) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };
  const jug = new Map(); const fam = new Map(); const fmt = new Map();
  for (const ev of Array.isArray(hist) ? hist : []) {
    if (!ev) continue; const f = fichaEvento(ev);
    [ev.quien, ev.rival].filter(Boolean).forEach((n) => cuenta(jug, String(n)));
    cuenta(fam, f.familia); cuenta(fmt, ev.formato ? String(ev.formato) : '');
  }
  const orden = (m) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(([valor, n]) => ({ valor, n }));
  return { jugadores: orden(jug), juegos: orden(fam), formatos: orden(fmt) };
}
