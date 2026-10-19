// EL FÉNIX · lógica pura de las portadas (ronda 351). Sin DOM: se prueba en tests/portadas.test.mjs.
// Regla de FRALEX: una portada por semana; «edición extra» solo si ese día pasó algo nuevo.

export const TEMAS = Object.freeze({
  amarillo: { fondo: '#ffe600', tinta: '#111111', acento: '#e30613', sombra: 'rgba(227,6,19,.35)' },
  rojo: { fondo: '#e30613', tinta: '#ffffff', acento: '#ffe600', sombra: 'rgba(0,0,0,.45)' },
  negro: { fondo: '#111111', tinta: '#ffe600', acento: '#00e5ff', sombra: 'rgba(0,229,255,.3)' },
});
export const PATCH = Object.freeze({ buff: 'Buff', nerf: 'Nerf', fix: 'Fix' });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const texto = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const lista = (v, n) => (Array.isArray(v) ? v : []).slice(0, n);

/** Día de hoy en Lima como 'AAAA-MM-DD' (la liga vive en hora de Lima). */
// Perú usa UTC−5 todo el año (sin horario de verano desde 1994): restar 5 h es exacto y evita cargar los datos de zonas horarias del navegador,
// que era lo más lento de la portada de Noticias al abrirla.
export function hoyLima(d = new Date()) {
  try { return new Date(d.getTime() - 5 * 3600e3).toISOString().slice(0, 10); }
  catch { return d.toISOString().slice(0, 10); }
}

/** Rellena huecos y recorta textos: una portada mal escrita nunca rompe la página. Devuelve null si no sirve (sin id, fecha o titular). */
export function limpiarPortada(p) {
  if (!p || typeof p !== 'object') return null;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha)) ? p.fecha : null;
  const titular = lista(p.titular, 2).map((t) => texto(t, 40)).filter(Boolean);
  if (!p.id || !fecha || !titular.length) return null;
  return {
    id: texto(p.id, 60), tipo: p.tipo === 'extra' ? 'extra' : 'semanal', semana: Number(p.semana) || null, fecha,
    tema: TEMAS[p.tema] ? p.tema : 'amarillo', colores: TEMAS[p.tema] ?? TEMAS.amarillo, noticia: p.noticia ? texto(p.noticia, 80) : null,
    franja: texto(p.franja, 160), kicker: texto(p.kicker, 40), logro: texto(p.logro, 30),
    titular: [titular[0], titular[1] ?? ''],
    local: texto(p.local, 16), visita: texto(p.visita, 16), lvl: [texto(p.lvl?.[0], 6), texto(p.lvl?.[1], 6)],
    globos: [texto(p.globos?.[0], 60), texto(p.globos?.[1], 60)], marcador: texto(p.marcador, 10), marcadorPie: texto(p.marcadorPie, 30),
    bajada: texto(p.bajada, 220), sticker: texto(p.sticker, 70),
    ampay: p.ampay ? { titulo: texto(p.ampay.titulo, 70), texto: texto(p.ampay.texto, 200) } : null,
    chismes: lista(p.chismes, 3).map((c) => texto(c, 120)).filter(Boolean),
    patch: lista(p.patch, 3).filter((x) => PATCH[x?.tipo]).map((x) => ({ tipo: x.tipo, etiqueta: PATCH[x.tipo], t: texto(x.t, 70) })),
    horoscopo: lista(p.horoscopo, 2).map((h) => ({ signo: texto(h?.signo, 12), t: texto(h?.t, 90) })).filter((h) => h.signo && h.t),
  };
}

/** Ediciones ya publicadas (fecha ≤ hoy), de la más nueva a la más vieja. Las inválidas se descartan con aviso. */
export function edicionesPublicadas(portadas, hoy = hoyLima()) {
  const out = [];
  for (const p of portadas ?? []) {
    const l = limpiarPortada(p);
    if (!l) { console.warn('[portadas] portada inválida, se omite:', p?.id); continue; }
    if (l.fecha <= hoy) out.push(l);
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha) || (a.tipo === 'extra' ? -1 : 1));
}

/** Nombre corto para el botón de cada edición: la semanal más nueva es «Esta semana»; las extra, «¡Edición extra!». */
export function etiquetaEdicion(p, i, todas = null) {
  if (p.tipo === 'extra') return { nombre: '¡Edición extra!', sub: fechaCorta(p.fecha) };
  const primeraSemanal = todas ? todas.findIndex((x) => x.tipo === 'semanal') : 0;
  return { nombre: i === primeraSemanal ? 'Esta semana' : `Semana ${p.semana ?? ''}`.trim(), sub: rangoSemana(p.fecha) };
}
export function fechaCorta(iso) {
  const [, m, d] = String(iso).split('-').map(Number);
  return m && d ? `${d} ${MESES[m - 1]}` : '';
}
/** «13 al 19 oct» a partir del lunes de la semana. */
export function rangoSemana(iso) {
  const d = new Date(`${iso}T12:00:00Z`); if (Number.isNaN(d.getTime())) return '';
  const f = new Date(d.getTime() + 6 * 86400000);
  const a = `${d.getUTCDate()}`; const b = `${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
  return d.getUTCMonth() === f.getUTCMonth() ? `${a} al ${b}` : `${a} ${MESES[d.getUTCMonth()]} al ${b}`;
}

/** Álbum de cupones: cuántas portadas SEGUIDAS (de la más nueva hacia atrás) abrió esta persona. Tope 5. */
export function cuponesSeguidos(ediciones, vistas) {
  const v = new Set(vistas ?? []); let n = 0;
  for (const e of (ediciones ?? []).filter((x) => x.tipo === 'semanal')) { if (!v.has(e.id)) break; n += 1; if (n === 5) break; }
  return n;
}
