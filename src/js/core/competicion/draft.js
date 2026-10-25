// Draft en vivo — lógica PURA (sin DOM → `npm test`). Espejo de la migración 151 para pintar el tablero y el reloj.
// La BD manda (turnos, reloj, elecciones); esto solo arma lo que se ve. Nunca lanza.

/** Quién elige en la elección n (0 = primera). Serpiente: las rondas impares van al revés. */
export function ordenDe(n, participantes, serpiente) {
  if (!Number.isInteger(n) || n < 0 || !Number.isInteger(participantes) || participantes <= 0) return null;
  const ronda = Math.floor(n / participantes); const pos = n % participantes;
  return serpiente && ronda % 2 === 1 ? participantes - 1 - pos : pos;
}

/** Segundos que le quedan al turno según el reloj del servidor (corrige la hora del celular con «ahora» del servidor). */
export function segundosRestantes(d, relojLocalAlRecibir = Date.now(), ahoraLocal = Date.now()) {
  if (!d) return null;
  if (d.estado === 'pausado') return Number.isFinite(d.restante_pausa) ? d.restante_pausa : null;
  if (d.estado !== 'en_vivo' || !d.vence || !d.ahora) return null;
  const desfase = new Date(d.ahora).getTime() - relojLocalAlRecibir;   // servidor − local
  const s = Math.ceil((new Date(d.vence).getTime() - (ahoraLocal + desfase)) / 1000);
  return Number.isFinite(s) ? Math.max(0, s) : null;
}

export const reloj = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

/** Tablero: filas = rondas, columnas = participantes (en su orden), cada celda con su elección (o vacía / «ahora»). */
export function tablero(d) {
  const P = Array.isArray(d?.participantes) ? d.participantes.length : 0;
  const R = Number(d?.rondas) || 0;
  if (!P || !R) return [];
  const picks = new Map((Array.isArray(d.picks) ? d.picks : []).map((p) => [p.n, p]));
  const filas = [];
  for (let r = 0; r < R; r++) {
    const celdas = Array.from({ length: P }, () => null);
    for (let i = 0; i < P; i++) {
      const n = r * P + i; const o = ordenDe(n, P, !!d.serpiente);
      celdas[o] = { n, pick: picks.get(n) ?? null, actual: n === d.turno && ['en_vivo', 'pausado'].includes(d.estado) };
    }
    filas.push(celdas);
  }
  return filas;
}

export const ESTADOS_DRAFT = {
  preparando: 'Preparando', en_vivo: 'En vivo', pausado: 'En pausa', terminado: 'Terminado', cancelado: 'Cancelado',
};

/** Lista de equipos escrita a mano (una por línea o separada por comas) → limpia, sin repetidos, sin < >. */
export function parsearOpciones(texto) {
  const vistos = new Set(); const out = [];
  for (const crudo of String(texto ?? '').split(/[\n,;]+/)) {
    const t = crudo.replace(/\s+/g, ' ').trim();
    if (!t || t.length > 60 || /[<>]/.test(t)) continue;
    const k = t.toLocaleLowerCase('es'); if (vistos.has(k)) continue;
    vistos.add(k); out.push(t);
  }
  return out.slice(0, 300);
}
