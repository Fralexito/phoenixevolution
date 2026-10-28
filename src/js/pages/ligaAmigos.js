// Liga de amigos (/liga-amigos/, migración 142): una liga OFICIAL armada desde la web, la única clase de liga que recibe
// los resultados de Phoenix Link. El staff la crea, cada amigo se inscribe con su cuenta, el staff genera el calendario
// (todos contra todos) y la tabla se calcula en la base (vista liga_tabla) con los partidos confirmados.
// Los resultados los propone Link y los valida el staff en Moderación › Liga (igual que la Galaxy).
import { supabase } from '../core/sistema/supabase.js';
import { onSession, can } from '../core/sistema/session.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar, pedirTexto } from '../core/sistema/dialogo.js';
import { openAuthModal } from '../features/auth.js';
import { ESTADOS_LIGA } from '../core/competicion/ligaVivo.js';
import { escudoHTML } from '../core/sistema/escudos.js';

const base = import.meta.env.BASE_URL;
const caja = document.getElementById('la-ligas');
const panelCrear = document.getElementById('la-crear');
const ESTADO_ED = { inscripcion: 'Inscripción abierta', en_curso: 'En juego', finalizada: 'Finalizada' };
let uid = null;
let staff = false;
let canal = null;
let recargaPendiente = 0;

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'No se pudo completar la acción.');
  return data;
};

async function cargar() {
  const { data: eds, error } = await supabase.from('liga_ediciones')
    .select('id, nombre, estado, ida_vuelta, creado').eq('liga', 'amigos').order('creado', { ascending: false }).limit(12);
  if (error) { caja.innerHTML = `<p class="text-sm text-red-300">No se pudieron cargar las ligas: ${escapeHTML(error.message)}</p>`; return; }
  if (!eds?.length) {
    caja.innerHTML = `<div class="glass-panel rounded-2xl p-6 text-center text-gray-300 text-sm">Todavía no hay ninguna liga oficial.${staff ? ' Crea la primera arriba.' : ' Cuando el staff abra una, aparecerá aquí para que te inscribas.'}</div>`;
    return;
  }
  const ids = eds.map((e) => e.id);
  const [part, partidos, tabla] = await Promise.all([
    supabase.from('liga_participantes').select('edicion_id, nombre, club, usuario').in('edicion_id', ids),
    supabase.from('liga_partidos').select('id, edicion_id, fecha, local, visitante, goles_local, goles_visita, estado').in('edicion_id', ids).order('fecha').order('id'),
    supabase.from('liga_tabla').select('*').in('edicion_id', ids),
  ]);
  for (const r of [part, partidos, tabla]) if (r.error) console.warn('[liga amigos]', r.error.message);
  const de = (lista, id) => (lista.data ?? []).filter((x) => x.edicion_id === id);
  caja.innerHTML = eds.map((e) => tarjeta(e, de(part, e.id), de(partidos, e.id), de(tabla, e.id))).join('');
  const pedida = new URLSearchParams(location.search).get('liga');
  if (pedida) document.getElementById(`ed-${CSS.escape(pedida)}`)?.scrollIntoView({ block: 'start' });
}

function tarjeta(e, participantes, partidos, tabla) {
  const yo = participantes.find((p) => p.usuario && p.usuario === uid);
  const botones = [];
  if (e.estado === 'inscripcion') {
    if (!uid) botones.push(`<button class="btn btn-primary" data-acc="login">Inicia sesión para inscribirte</button>`);
    else if (yo) botones.push(`<button class="btn" data-acc="salir" data-ed="${escapeHTML(e.id)}">Salir de la liga</button>`);
    else botones.push(`<button class="btn btn-primary" data-acc="inscribir" data-ed="${escapeHTML(e.id)}"><i class="fa-solid fa-user-plus"></i> Inscribirme</button>`);
    if (staff) botones.push(`<button class="btn btn-primary" data-acc="iniciar" data-ed="${escapeHTML(e.id)}" data-n="${participantes.length}"><i class="fa-solid fa-calendar-plus"></i> Generar calendario y empezar</button>`);
  }
  if (e.estado === 'en_curso' && staff) {
    botones.push(`<a class="btn" href="${base}moderacion/#mod-liga"><i class="fa-solid fa-clipboard-check"></i> Validar resultados</a>`);
    botones.push(`<button class="btn" data-acc="finalizar" data-ed="${escapeHTML(e.id)}">Cerrar la liga</button>`);
  }
  botones.push(`<button class="btn" data-acc="copiar" data-ed="${escapeHTML(e.id)}"><i class="fa-solid fa-link"></i> Copiar enlace</button>`, `<button class="btn" data-acc="whatsapp" data-ed="${escapeHTML(e.id)}" data-nom="${escapeHTML(e.nombre)}"><i class="fa-solid fa-share-nodes"></i> Invitar amigos</button>`);

  const inscritos = participantes.length
    ? `<ul class="flex flex-wrap gap-2">${participantes.map((p) => `<li class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${p.usuario && p.usuario === uid ? 'bg-galaxy-400/15 border-galaxy-400/60' : 'bg-white/5 border-galaxy-border'} border text-sm text-white">${p.club ? escudoHTML(p.club, 20) : ''}<b>${escapeHTML(p.nombre)}</b>${p.club ? ` <span class="text-gray-400 text-xs">· ${escapeHTML(p.club)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="text-sm text-gray-400">Nadie inscrito todavía.</p>';

  return `<section id="ed-${escapeHTML(e.id)}" class="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="min-w-0">
        <h2 class="text-lg font-display font-bold text-white uppercase tracking-wider">${escapeHTML(e.nombre)}</h2>
        <p class="text-[12px] text-gray-400">${ESTADO_ED[e.estado] ?? e.estado} · ${participantes.length} inscritos${e.ida_vuelta ? ' · ida y vuelta' : ''}${yo ? ` · juegas como <b class="text-galaxy-400">${escapeHTML(yo.nombre)}</b>` : ''}</p>
      </div>
      <div class="flex flex-wrap gap-2">${botones.join('')}</div>
    </header>
    ${e.estado === 'inscripcion' ? inscritos : `${tablaHTML(tabla, participantes, yo)}${fechasHTML(partidos, yo)}`}
  </section>`;
}

function tablaHTML(tabla, participantes = [], yo = null) {
  if (!tabla.length) return '';
  const clubDe = (nom) => participantes.find((p) => p.nombre === nom)?.club ?? '';
  const filas = [...tabla].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.nombre.localeCompare(b.nombre));
  return `<div class="overflow-x-auto"><table class="w-full text-sm text-gray-200">
    <thead class="text-[12px] uppercase tracking-wider text-gray-400"><tr><th class="text-left py-1.5">#</th><th class="text-left">DT / Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
    <tbody>${filas.map((f, i) => { const cl = clubDe(f.nombre); const esYo = yo?.nombre === f.nombre; return `<tr class="border-t border-galaxy-border text-center ${esYo ? 'bg-galaxy-400/10' : ''}"><td class="text-left py-1.5 font-bold ${i === 0 ? 'text-amber-300' : ''}">${i + 1}</td><td class="text-left text-white"><span class="inline-flex items-center gap-1.5">${cl ? escudoHTML(cl, 20) : ''}<b>${escapeHTML(f.nombre)}</b>${cl ? `<span class="text-xs text-gray-400">· ${escapeHTML(cl)}</span>` : ''}</span></td><td>${f.pj}</td><td>${f.g}</td><td>${f.e}</td><td>${f.p}</td><td>${f.gf}</td><td>${f.gc}</td><td>${f.dg}</td><td class="font-bold text-galaxy-400">${f.pts}</td></tr>`; }).join('')}</tbody>
  </table><p class="text-[12px] text-gray-500 mt-1">Solo cuentan los resultados confirmados por el staff.</p></div>`;
}

function fechasHTML(partidos, yo = null) {
  if (!partidos.length) return '';
  const porFecha = new Map();
  for (const p of partidos) porFecha.set(p.fecha, [...(porFecha.get(p.fecha) ?? []), p]);
  return `<div class="grid sm:grid-cols-2 gap-3">${[...porFecha].map(([f, ps]) => `<div class="rounded-xl border border-galaxy-border p-3">
    <h3 class="text-[12px] uppercase tracking-widest text-gray-400 mb-2">Fecha ${f}</h3>
    ${ps.map((p) => {
    const marcador = p.goles_local == null ? 'vs' : `${p.goles_local} - ${p.goles_visita}`;
    const est = ESTADOS_LIGA[p.estado] ?? ESTADOS_LIGA.pendiente;
    const mio = yo && (p.local === yo.nombre || p.visitante === yo.nombre); const gl = p.goles_local; const gv = p.goles_visita; const jugado = gl != null && gv != null;
    return `<p class="flex items-center justify-between gap-2 text-sm text-white py-1 px-2 rounded-lg ${mio ? 'bg-galaxy-400/10 border border-galaxy-400/30' : ''}"><span class="truncate"><span class="${jugado && gl > gv ? 'font-bold text-white' : jugado && gl < gv ? 'text-gray-400' : ''}">${escapeHTML(p.local)}</span> <b class="text-galaxy-400 mx-1">${marcador}</b> <span class="${jugado && gv > gl ? 'font-bold text-white' : jugado && gv < gl ? 'text-gray-400' : ''}">${escapeHTML(p.visitante)}</span></span><span class="text-[12px] ${mio ? 'text-galaxy-400 font-semibold' : 'text-gray-400'} shrink-0">${mio ? 'Tu partido · ' : ''}${est.texto}</span></p>`;
  }).join('')}</div>`).join('')}</div>`;
}

async function accion(btn) {
  const acc = btn.dataset.acc;
  const ed = btn.dataset.ed;
  try {
    if (acc === 'login') return openAuthModal('login');
    if (acc === 'whatsapp') { const url = `${location.origin}${base}liga-amigos/?liga=${encodeURIComponent(ed)}`; window.open(`https://wa.me/?text=${encodeURIComponent(`⚽ ¡Inscríbete a nuestra liga oficial «${btn.dataset.nom ?? 'Phoenix'}» en Phoenix Evolution!\n👉 ${url}`)}`, '_blank', 'noopener'); return; }
    if (acc === 'copiar') {
      await navigator.clipboard.writeText(`${location.origin}${base}liga-amigos/?liga=${encodeURIComponent(ed)}`);
      return toast('Enlace copiado: pásalo a tus amigos.', 'success');
    }
    if (acc === 'inscribir') {
      const club = await pedirTexto('¿Con qué club juegas? (opcional, puedes dejarlo vacío)', { titulo: 'Inscribirme', maximo: 40, obligatorio: false, aceptar: 'Inscribirme' });
      if (club === null) return;
      const nombre = await rpc('liga_inscribirse', { p_edicion: ed, p_club: club || null });
      toast(`Inscrito como ${nombre}.`, 'success');
    } else if (acc === 'salir') {
      if (!(await confirmar('¿Seguro que quieres salir de esta liga?', { peligro: true, aceptar: 'Salir' }))) return;
      await rpc('liga_salir', { p_edicion: ed });
    } else if (acc === 'iniciar') {
      if (!(await confirmar(`Se cierra la inscripción con ${btn.dataset.n} jugadores y se sortea el calendario todos contra todos. Después ya nadie puede entrar ni salir.`, { titulo: 'Generar calendario', aceptar: 'Generar' }))) return;
      const n = await rpc('staff_liga_iniciar', { p_edicion: ed });
      toast(`Calendario listo: ${n} partidos. Ya aparecen en Phoenix Link › PARTIDO OFICIAL.`, 'success');
    } else if (acc === 'finalizar') {
      if (!(await confirmar('Al cerrarla, Link deja de ofrecer sus partidos. La tabla queda como está.', { titulo: 'Cerrar la liga', peligro: true, aceptar: 'Cerrar' }))) return;
      await rpc('staff_liga_finalizar', { p_edicion: ed });
    }
    await cargar();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function crear(ev) {
  ev.preventDefault();
  const f = ev.currentTarget;
  try {
    const id = await rpc('staff_liga_crear', { p_nombre: f.nombre.value, p_ida_vuelta: f.idaVuelta.checked });
    f.reset();
    toast('Liga creada: copia el enlace y pásalo a tus amigos para que se inscriban.', 'success');
    history.replaceState(null, '', `?liga=${encodeURIComponent(id)}`);
    await cargar();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// Cada resultado que llega de Link o que valida el staff refresca la página sola (Realtime de la migración 102).
function escuchar() {
  if (canal) return;
  canal = supabase.channel('liga-amigos').on('postgres_changes', { event: '*', schema: 'public', table: 'liga_partidos' }, () => {
    clearTimeout(recargaPendiente);
    recargaPendiente = setTimeout(cargar, 800);
  }).subscribe();
}

caja.addEventListener('click', (ev) => { const b = ev.target.closest('[data-acc]'); if (b) accion(b); });
panelCrear.querySelector('form').addEventListener('submit', crear);

onSession(({ session }) => {
  uid = session?.user?.id ?? null;
  staff = !!uid && can('editarLiga');
  panelCrear.hidden = !staff;
  cargar();
  escuchar();
});
