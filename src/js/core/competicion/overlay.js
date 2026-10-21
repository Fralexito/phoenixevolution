// Overlay de transmisión de un torneo premium (ronda 363): qué mostrar encima del stream (OBS / TikTok LIVE Studio). Puro, sin DOM.
import { campeonSugerido, progreso } from './torneos.js';

const listo = (p) => !!(p?.a_nombre && p?.b_nombre);
const marca = (p) => (p?.jugado_en ? Date.parse(p.jugado_en) || 0 : 0);

/** { fase, campeon, ultimo, recientes[], proximos[], progreso } a partir del torneo y sus partidos. */
export function resumenOverlay(t, partidos) {
  const lista = Array.isArray(partidos) ? partidos : [];
  const jugados = lista.filter((p) => p.jugado && listo(p)).sort((a, b) => marca(b) - marca(a) || (b.orden ?? 0) - (a.orden ?? 0));
  const proximos = lista.filter((p) => !p.jugado && listo(p)).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).slice(0, 3);
  const fase = t?.estado === 'terminado' ? 'final' : t?.estado === 'en_curso' ? 'en_curso' : t?.estado === 'inscripcion' ? 'inscripcion' : 'otro';
  const sug = fase === 'en_curso' ? campeonSugerido(t, lista) : null;
  const campeon = fase === 'final' ? (t?.campeon || sug?.nombre || null) : (sug?.definitivo ? sug.nombre : null);
  return { fase, campeon, ultimo: jugados[0] ?? null, recientes: jugados.slice(1, 4), proximos, progreso: progreso(lista) };
}

/** Texto del marcador: «Ana 2 – 1 Beto» (con penales/ganador si hubo empate en eliminatoria). */
export function marcadorTexto(p) {
  if (!p) return '';
  if (!p.jugado) return `${p.a_nombre} vs ${p.b_nombre}`;
  const pasa = p.ga === p.gb && p.ganador ? ` (pasa ${p.ganador === 'a' ? p.a_nombre : p.b_nombre})` : '';
  return `${p.a_nombre} ${p.ga} – ${p.gb} ${p.b_nombre}${pasa}`;
}
