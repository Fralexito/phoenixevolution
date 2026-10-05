// Tarjeta «Hoy en la Galaxy» de la portada: partido destacado, próximo evento (con cuenta atrás) y líderes de la tabla. Datos reales de la edición en curso.
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { EDICIONES } from '../../../data/ligaResultados.js';
import { CLUBES_VISUAL } from '../../../data/clubesVisual.js';
import { calcularTabla } from '../../core/tabla.js';
import { jornadasCentral, partidoDestacado, visualClub } from '../../core/central.js';
import { listarEventos } from '../eventos/api.js';
import { estadoEvento, cuentaRegresiva, formatoLima } from '../../core/evento.js';

const $ = (id) => document.getElementById(id);
const edicion = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = edicion?.fechas ?? [];
const clubDe = (n) => edicion?.clubes?.[n] ?? '';
const escudo = (n) => { const v = visualClub(clubDe(n), CLUBES_VISUAL); return `<span class="escudo w-11 h-11 rounded-full border-2 grid place-items-center font-display font-bold text-xs ${v.oscuro ? 'text-black' : 'text-white'}" style="border-color:${v.a};background:linear-gradient(135deg,${v.a},${v.b});box-shadow:0 0 14px ${v.a}77">${escapeHTML(v.sigla)}</span>`; };

function pintarPartido() {
  const box = $('hoy-partido'); const j = jornadasCentral(fechas); const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
  const m = partidoDestacado(j.proximos?.partidos, tabla);
  if (!m) { box.innerHTML = '<p class="hoy-et"><i class="fa-solid fa-fire"></i>Partido destacado</p><p class="text-xs text-gray-500">No quedan cruces por jugar en esta edición.</p>'; return; }
  box.innerHTML = `<p class="hoy-et"><i class="fa-solid fa-fire"></i>Partido destacado · Fecha ${j.proximos.n}</p>
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><div class="flex flex-col items-center gap-1 min-w-0">${escudo(m.l)}<b class="font-display text-white text-sm truncate max-w-full">${escapeHTML(m.l)}</b></div>
      <span class="vs-latido font-display font-bold text-2xl text-galaxy-400 italic">VS</span><div class="flex flex-col items-center gap-1 min-w-0">${escudo(m.v)}<b class="font-display text-white text-sm truncate max-w-full">${escapeHTML(m.v)}</b></div></div>`;
  const lid = $('hoy-lideres'); lid.hidden = !tabla.length;
  if (tabla.length) lid.innerHTML = `<p class="hoy-et"><i class="fa-solid fa-trophy"></i>Líderes de la tabla</p>${tabla.slice(0, 3).map((t, i) => `<div class="hoy-lider"><span class="medalla m${i + 1}">${i + 1}</span><span class="truncate text-white font-semibold">${escapeHTML(t.nombre)} <span class="text-[10px] text-gray-500 uppercase">${escapeHTML(clubDe(t.nombre))}</span></span><b class="font-display text-galaxy-400 tabular-nums">${t.pts} pts</b></div>`).join('')}`;
}

async function pintarEvento() {
  const box = $('hoy-evento');
  try {
    const lista = await Promise.race([listarEventos(false, 5), new Promise((_, no) => setTimeout(() => no(new Error('tiempo agotado')), 4000))]);
    const e = lista.find((x) => !x.cancelado && ['proximo', 'en_curso'].includes(estadoEvento(x))); if (!e) return;
    const pintar = () => { box.innerHTML = `<p class="hoy-et"><i class="fa-solid fa-calendar-day"></i>Próximo evento</p><a href="${href('eventos/')}" class="block group"><b class="font-display text-white group-hover:text-galaxy-400 transition-colors">${escapeHTML(e.titulo)}</b>
      <span class="block text-xs text-gray-400">${escapeHTML(formatoLima(e.inicia_at))} · <b class="text-galaxy-400">${escapeHTML(cuentaRegresiva(e.inicia_at))}</b></span></a>`; };
    pintar(); box.hidden = false; setInterval(() => { if (!document.hidden) pintar(); }, 30000);
  } catch (err) { console.warn('[inicio] hoy evento:', err?.message ?? err); }
}

export function iniciarHoy() { if (!$('hoy')) return; pintarPartido(); pintarEvento(); }
