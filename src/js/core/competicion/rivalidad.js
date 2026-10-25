// Ficha de rivalidad «A vs B» — lógica PURA (sin DOM → `npm test`). Datos de public.rivalidad (migración 153). Nunca lanza.

/** Resumen para la cabecera: quién domina, porcentajes de la barra y frase de la racha. */
export function resumenRivalidad(r) {
  if (!r || r.visible !== true) return { visible: false, motivo: r?.motivo || 'No se pudo cargar esta rivalidad.' };
  const n = (x) => Math.max(0, Number(x) || 0);
  const a = n(r.gana_a), e = n(r.empates), b = n(r.gana_b), j = n(r.jugados) || a + e + b;
  const pct = (x) => (j ? Math.round((x * 1000) / j) / 10 : 0);
  const na = r.a?.nombre ?? 'Jugador A', nb = r.b?.nombre ?? 'Jugador B';
  let domina = 'Parejos';
  if (!j) domina = 'Aún no se han enfrentado';
  else if (a > b) domina = `Domina ${na}`;
  else if (b > a) domina = `Domina ${nb}`;
  let racha = '';
  const ra = r.racha;
  if (ra && n(ra.largo) >= 1) {
    const l = n(ra.largo);
    racha = ra.quien === 'empate' ? `${l} empate${l === 1 ? '' : 's'} seguido${l === 1 ? '' : 's'}`
      : `${ra.quien === 'a' ? na : nb} ganó ${l === 1 ? 'el último' : `los últimos ${l}`}`;
  }
  return { visible: true, jugados: j, a, e, b, pa: pct(a), pe: pct(e), pb: pct(b), golesA: n(r.goles_a), golesB: n(r.goles_b), domina, racha, na, nb };
}

/** Resultado de un partido desde el punto de vista de A: 'G' | 'E' | 'P'. */
export const letraDe = (p) => (Number(p?.ga) > Number(p?.gb) ? 'G' : Number(p?.ga) < Number(p?.gb) ? 'P' : 'E');

/** Lee ?a=&b= y valida que sean UUID distintos. */
export function idsDeUrl(search) {
  const q = new URLSearchParams(search ?? '');
  const ok = (x) => (typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x) ? x.toLowerCase() : null);
  const a = ok(q.get('a')), b = ok(q.get('b'));
  return a && b && a !== b ? { a, b } : null;
}
