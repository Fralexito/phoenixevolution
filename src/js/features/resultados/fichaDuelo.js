// Ficha del partido de un duelo (ronda 386, migración 160): estadio, clima, hora, duración y añadido, tal como los leyó
// Phoenix Link 0.3.51 con la sonda de Sider. Si el host no tiene la sonda, no hay ficha y no se muestra nada.
// data-ico-keep: estos iconos SÍ se ven (sinIconosWeb oculta los que no tienen equivalente fino; añadirlos al mapa global
// mostraba iconos ocultos en otras páginas y movía su diseño — probado con capturas el 25-oct).
// Se usa en la ventana «Repeticiones» (Mis partidos) y en la Sala en vivo cuando el duelo terminó.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { datosFicha, textoPenales } from '../../core/competicion/fichaPartido.js';

/** Respuesta de ficha_de_duelo → HTML de chips ('' si no hay nada que mostrar). */
export function htmlFichaDuelo(d) {
  if (!d || typeof d !== 'object') return '';
  const chips = datosFicha(d.ficha).map((x) => ({ icono: x.icono, texto: x.texto }));
  if (Number.isInteger(d.anadido) && d.anadido > 0) chips.push({ icono: 'fa-hourglass-half', texto: `+${d.anadido}′ de añadido` });
  const pen = textoPenales(d.penales_a, d.penales_b);
  if (pen) chips.push({ icono: 'fa-bullseye', texto: pen });
  if (!chips.length) return '';
  return `<div class="ficha-duelo" aria-label="Ficha del partido"><p class="ficha-duelo-t">Ficha del partido</p><ul data-ico-keep>${chips.map((c) =>
    `<li><i class="fa-solid ${esc(c.icono)}" aria-hidden="true"></i>${esc(c.texto)}</li>`).join('')}</ul></div>`;
}

/** Pide la ficha del duelo. Nunca lanza: ante cualquier error devuelve '' (la ficha es un extra). */
export async function cargarFichaDuelo(retoId) {
  try {
    const { data, error } = await supabase.rpc('ficha_de_duelo', { p_reto: Number(retoId) });
    if (error) { if (error.code !== 'PGRST202') console.warn('[ficha duelo]', error.message); return ''; }
    return htmlFichaDuelo(data);
  } catch (e) { console.warn('[ficha duelo]', e?.message ?? e); return ''; }
}
