// Liga automática (ronda 224): validar los resultados que manda Phoenix Link. Los valida el STAFF o el
// ÁRBITRO DESIGNADO de ese partido, nunca el host (los partidos pueden jugarse en host neutral).
//   · montarPanelStaff(section)     → Moderación: disputas y resultados por validar + designar árbitro.
//   · montarPanelArbitro(section)   → Mis partidos: los partidos que me designaron para arbitrar.
//   · montarMisOficiales(section)   → Mis partidos: mis partidos oficiales que llegaron por Link, con «Reclamar».
// Todo pasa por las funciones de la base (migración 102): liga_resolver_resultado, liga_designar_arbitro y
// liga_reclamar_resultado. Ellas comprueban los permisos; aquí solo se muestra el botón a quien tiene sentido.
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { confirmar, pedirTexto, elegir } from '../../core/sistema/dialogo.js';
import { openModal, closeModal } from '../../core/sistema/modal.js';
import { lineaFicha, frasesRevisar } from '../../core/competicion/fichaPartido.js';
import { montarReglasPartido } from './reglasPartido.js';
import { ESTADOS_LIGA, golesVivo, textoGol, validarMarcador, colaValidacion, puedeReclamar, resumenDoctor } from '../../core/competicion/ligaVivo.js';

const COLS = 'id, edicion_id, fecha, local, visitante, goles_local, goles_visita, estado, origen, detalle, arbitro, propuesto_en, resuelto_en';
const MODAL = 'liga-corregir';
let canales = 0;   // cada panel escucha con su propio canal (dos con el mismo nombre chocarían)

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'No se pudo completar la acción.');
  return data;
};

const fechaHora = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Nombres de usuario de los árbitros designados (id → «@usuario»). */
async function nombresArbitros(partidos) {
  const ids = [...new Set(partidos.map((p) => p.arbitro).filter(Boolean))];
  const mapa = new Map();
  if (!ids.length) return mapa;
  const { data, error } = await supabase.from('perfiles').select('id, username, nombre_display').in('id', ids.slice(0, 100));
  if (error) { console.warn('[liga validar] árbitros:', error.message); return mapa; }
  for (const p of data ?? []) mapa.set(p.id, p.nombre_display || (p.username ? `@${p.username}` : 'Árbitro'));
  return mapa;
}

function golesHTML(p) {
  const gs = golesVivo(p.detalle?.juego?.goles);
  if (!gs.length) return '';
  const lado = (l) => gs.filter((g) => g.l === l).map((g) => escapeHTML(textoGol(g))).join(', ');
  const gl = lado('l'); const gv = lado('v');
  return `<p class="lv-dato">⚽ ${gl ? `<b>${escapeHTML(p.local)}:</b> ${gl}` : ''}${gl && gv ? ' · ' : ''}${gv ? `<b>${escapeHTML(p.visitante)}:</b> ${gv}` : ''}</p>`;
}

function doctorHTML(p) {
  const d = resumenDoctor(p.detalle);
  if (!d) return '';
  const avisos = d.avisos.length ? `<ul class="list-disc pl-5 mt-1">${d.avisos.map((a) => `<li>${escapeHTML(a)}</li>`).join('')}</ul>` : '<p class="mt-1">Sin avisos.</p>';
  return `<details class="lv-dato mt-1"><summary class="cursor-pointer">Phoenix Doctor (solo informativo)</summary>
    <p class="mt-1">Parche: <b>${escapeHTML(d.parche || '—')}</b> · huella <b>${escapeHTML(d.huella || '—')}</b></p>${avisos}</details>`;
}

/** Ficha del partido (Link 0.3.51) y, si no coincide con las reglas de la edición, el aviso «Revisar» (nunca bloquea). */
function fichaHTML(p) {
  const linea = lineaFicha(p.detalle?.ficha);
  const frases = frasesRevisar(p.detalle?.revisar);
  const anadido = Number.isInteger(p.detalle?.juego?.anadido) && p.detalle.juego.anadido > 0 ? ` · +${p.detalle.juego.anadido}′ de añadido` : '';
  const revisar = frases.length ? `<div class="lv-revisar" role="note"><p><i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i><b>Revisar:</b> la configuración del juego no coincide con las reglas de la edición.</p>
    <ul class="list-disc pl-5 mt-1">${frases.map((f) => `<li>${escapeHTML(f)}</li>`).join('')}</ul></div>` : '';
  return `${linea ? `<p class="lv-dato"><i class="fa-solid fa-clipboard-list mr-1" aria-hidden="true"></i>${escapeHTML(linea + anadido)}</p>` : ''}${revisar}`;
}

/** Tarjeta de un partido. `acciones`: 'staff' | 'arbitro' | 'dt'. */
function tarjeta(p, acciones, arbitros) {
  const est = ESTADOS_LIGA[p.estado] ?? ESTADOS_LIGA.pendiente;
  const hay = p.goles_local != null && p.goles_visita != null;
  const pk = p.detalle?.juego;
  const penales = Number.isInteger(pk?.pk_local) && Number.isInteger(pk?.pk_visita) && (pk.pk_local || pk.pk_visita)
    ? ` <span class="lv-dato">(pen. ${pk.pk_local}-${pk.pk_visita})</span>` : '';
  const reclamo = p.detalle?.reclamo?.motivo ? `<p class="lv-dato"><b>Reclamo:</b> ${escapeHTML(p.detalle.reclamo.motivo)}</p>` : '';
  const arbitro = p.arbitro ? `<p class="lv-dato">Árbitro: <b>${escapeHTML(arbitros.get(p.arbitro) ?? 'designado')}</b></p>` : '';
  const id = Number(p.id);
  let botones = '';
  if ((acciones === 'staff' || acciones === 'arbitro') && (p.estado === 'propuesto' || p.estado === 'disputa')) {
    botones += `${hay ? `<button type="button" data-lv="confirmar" data-id="${id}" class="btn btn-primary !min-h-8 !text-xs">Confirmar</button>` : ''}
      <button type="button" data-lv="corregir" data-id="${id}" class="btn btn-ghost !min-h-8 !text-xs">Corregir y confirmar</button>
      ${p.estado === 'propuesto' ? `<button type="button" data-lv="disputa" data-id="${id}" class="btn btn-ghost !min-h-8 !text-xs">En disputa</button>` : ''}`;
  }
  if (acciones === 'staff') botones += `<button type="button" data-lv="arbitro" data-id="${id}" class="btn btn-ghost !min-h-8 !text-xs"><i class="fa-solid fa-user-tie"></i> ${p.arbitro ? 'Cambiar árbitro' : 'Designar árbitro'}</button>`;
  if (acciones === 'dt' && puedeReclamar(p)) botones += `<button type="button" data-lv="reclamar" data-id="${id}" class="btn btn-ghost !min-h-8 !text-xs"><i class="fa-solid fa-flag"></i> Reclamar</button>`;
  return `<article class="glass-panel rounded-xl p-3 space-y-2" data-partido="${id}">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="lv-dato">Fecha <b>${Number(p.fecha)}</b>${p.propuesto_en ? ` · ${escapeHTML(fechaHora(p.propuesto_en))}` : ''}${p.origen === 'link' ? ' · Phoenix Link' : ''}</span>
      <span class="lv-estado lv-estado-${est.tono}">${escapeHTML(est.texto)}</span>
    </div>
    <p class="font-display font-bold text-white uppercase tracking-wide">${escapeHTML(p.local)}
      <span class="px-2 py-0.5 mx-1 rounded-md bg-galaxy-900 border border-galaxy-600/50 font-extrabold tabular-nums">${hay ? `${Number(p.goles_local)}-${Number(p.goles_visita)}` : 'vs'}</span>
      ${escapeHTML(p.visitante)}${penales}</p>
    ${golesHTML(p)}${fichaHTML(p)}${reclamo}${arbitro}${doctorHTML(p)}
    ${botones ? `<div class="flex flex-wrap gap-2 pt-1">${botones}</div>` : ''}
  </article>`;
}

/** Panel genérico: carga → pinta → acciones. */
function crearPanel(section, { acciones, cargarPartidos, vacio }) {
  const cont = section.querySelector('[data-lista]');
  let lista = []; let arbitros = new Map();
  async function cargar() {
    try { lista = await cargarPartidos(); arbitros = await nombresArbitros(lista); }
    catch (e) { console.warn('[liga validar] carga:', e.message); lista = []; }
    pintar();
  }
  function pintar() {
    const cuenta = section.querySelector('[data-cuenta]');
    if (cuenta) cuenta.textContent = lista.length ? `(${lista.length})` : '';
    if (vacio === null && !lista.length) { section.hidden = true; return; }
    section.hidden = false;
    cont.innerHTML = lista.length ? lista.map((p) => tarjeta(p, acciones, arbitros)).join('') : `<p class="lv-dato">${escapeHTML(vacio)}</p>`;
  }
  async function ejecutar(boton, fn) {
    boton.disabled = true;
    try { await fn(); await cargar(); }
    catch (e) { toast(e?.message || 'No se pudo completar la acción.', 'error'); }
    finally { boton.disabled = false; }
  }
  function abrirCorregir(p) {
    const m = openModal(`<form id="lv-form" class="p-6 space-y-4" novalidate>
      <div class="flex justify-between items-start gap-3"><div><h2 class="font-display font-bold text-xl text-white uppercase tracking-widest">Corregir y confirmar</h2>
        <p class="text-xs text-gray-400 mt-0.5">Fecha ${Number(p.fecha)} · ${escapeHTML(p.local)} vs ${escapeHTML(p.visitante)}</p></div>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button></div>
      <div class="flex items-end gap-3"><label class="text-[12px] text-gray-400 flex-1">Goles de ${escapeHTML(p.local)}<input name="a" inputmode="numeric" maxlength="2" value="${p.goles_local ?? ''}" class="field !text-center" required></label>
        <span class="pb-2 text-gray-500">-</span>
        <label class="text-[12px] text-gray-400 flex-1">Goles de ${escapeHTML(p.visitante)}<input name="b" inputmode="numeric" maxlength="2" value="${p.goles_visita ?? ''}" class="field !text-center" required></label></div>
      <p class="text-[12px] text-gray-400">El resultado queda confirmado y cuenta para la tabla. Queda en la Auditoría.</p>
      <p id="lv-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button type="submit" class="btn btn-primary w-full">Confirmar resultado</button></form>`, { id: MODAL });
    m.querySelector('#lv-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const err = m.querySelector('#lv-err'); err.textContent = '';
      const fd = new FormData(ev.target); const v = validarMarcador(fd.get('a'), fd.get('b'));
      if (!v.ok) { err.textContent = v.error; return; }
      const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        await rpc('liga_resolver_resultado', { p_partido: p.id, p_aceptar: true, p_goles_local: v.gl, p_goles_visita: v.gv });
        toast('Resultado confirmado.', 'ok'); closeModal(MODAL); await cargar();
      } catch (e) { err.textContent = e?.message || 'No se pudo completar la acción.'; }
      finally { btn.disabled = false; }
    });
  }
  async function designar(p, boton) {
    const texto = await pedirTexto('Escribe el usuario (o parte del nombre) de quien arbitrará este partido. Déjalo vacío para quitar el árbitro.',
      { titulo: 'Designar árbitro', placeholder: 'usuario', maximo: 40, obligatorio: false, aceptar: 'Buscar' });
    if (texto === null) return;
    const t = texto.trim().replace(/[^\p{L}\p{N} _.-]/gu, '');
    if (!t) {
      if (!p.arbitro) return;
      if (await confirmar('¿Quitar el árbitro designado de este partido?', { titulo: 'Quitar árbitro', aceptar: 'Quitar' }))
        await ejecutar(boton, async () => { await rpc('liga_designar_arbitro', { p_partido: p.id, p_arbitro: null }); toast('Árbitro quitado.', 'ok'); });
      return;
    }
    const { data, error } = await supabase.from('perfiles').select('id, username, nombre_display, rol')
      .or(`username.ilike.%${t}%,nombre_display.ilike.%${t}%`).limit(12);
    if (error) { toast(error.message, 'error'); return; }
    if (!data?.length) { toast('No encontré a nadie con ese nombre.', 'warn'); return; }
    const id = await elegir('¿Quién arbitra este partido?', data.map((x) => ({
      valor: x.id, texto: x.nombre_display || `@${x.username}`, detalle: `@${x.username ?? ''} · ${x.rol ?? 'jugador'}`,
    })), { titulo: 'Designar árbitro' });
    if (!id) return;
    await ejecutar(boton, async () => { await rpc('liga_designar_arbitro', { p_partido: p.id, p_arbitro: id }); toast('Árbitro designado.', 'ok'); });
  }
  section.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lv]'); if (!b || b.disabled) return;
    const p = lista.find((x) => Number(x.id) === Number(b.dataset.id)); if (!p) return;
    const nombre = `${p.local} ${p.goles_local ?? ''}-${p.goles_visita ?? ''} ${p.visitante}`;
    try {
      switch (b.dataset.lv) {
        case 'confirmar':
          if (await confirmar(`¿Confirmar ${nombre} (fecha ${p.fecha})? Pasará a contar para la tabla.`, { titulo: 'Confirmar resultado', aceptar: 'Confirmar' }))
            await ejecutar(b, async () => { await rpc('liga_resolver_resultado', { p_partido: p.id, p_aceptar: true }); toast('Resultado confirmado.', 'ok'); });
          break;
        case 'corregir': abrirCorregir(p); break;
        case 'disputa':
          if (await confirmar(`¿Marcar ${nombre} como «en disputa»? No contará hasta que se resuelva.`, { titulo: 'En disputa', aceptar: 'Marcar', peligro: true }))
            await ejecutar(b, async () => { await rpc('liga_resolver_resultado', { p_partido: p.id, p_aceptar: false }); toast('Partido en disputa.', 'ok'); });
          break;
        case 'arbitro': await designar(p, b); break;
        case 'reclamar': {
          const motivo = await pedirTexto('Cuenta qué está mal en este resultado. El staff lo revisará.', { titulo: 'Reclamar resultado', maximo: 300, placeholder: 'Ej.: el gol del 80′ fue en la repetición…', aceptar: 'Enviar reclamo' });
          if (motivo?.trim()) await ejecutar(b, async () => { await rpc('liga_reclamar_resultado', { p_partido: p.id, p_motivo: motivo.trim() }); toast('Reclamo enviado al staff.', 'ok'); });
          break;
        }
        default: break;
      }
    } catch (err) { console.error('[liga validar] acción:', err); toast('No se pudo completar la acción.', 'error'); }
  });
  // Un cambio en liga_partidos (otro miembro del staff, Link o un reclamo) refresca la lista
  try {
    supabase.channel(`liga-partidos-${acciones}-${++canales}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'liga_partidos' }, () => { cargar(); })
      .subscribe();
  } catch (e) { console.warn('[liga validar] realtime:', e); }
  return { cargar };
}

/** Moderación (staff): disputas y resultados por validar, y los próximos partidos para designar árbitro. */
export function montarPanelStaff(section) {
  if (!section) return null;
  const panel = crearPanel(section, {
    acciones: 'staff',
    vacio: 'No hay resultados por validar.',
    cargarPartidos: async () => {
      const { data, error } = await supabase.from('liga_partidos').select(COLS).in('estado', ['propuesto', 'disputa']).limit(60);
      if (error) throw error;
      return colaValidacion(data);
    },
  });
  panel.cargar();
  const prox = section.querySelector('[data-proximos]');
  if (prox) {
    const panelProx = crearPanel(prox, {
      acciones: 'staff',
      vacio: 'No hay partidos por jugar.',
      cargarPartidos: async () => {
        // La fecha por jugar más baja y la siguiente (los atrasados también entran)
        const { data, error } = await supabase.from('liga_partidos').select(COLS).eq('estado', 'pendiente').order('fecha').order('id').limit(40);
        if (error) throw error;
        const minima = data?.[0]?.fecha;
        return (data ?? []).filter((p) => p.fecha <= minima + 1);
      },
    });
    panelProx.cargar();
  }
  montarReglasPartido(section.querySelector('[data-reglas-partido]'));
  return panel;
}

/** Mis partidos: los que el staff me designó para arbitrar (oculto si no hay ninguno). */
export function montarPanelArbitro(section, userId) {
  if (!section || !userId) return null;
  const panel = crearPanel(section, {
    acciones: 'arbitro',
    vacio: null,
    cargarPartidos: async () => {
      const { data, error } = await supabase.from('liga_partidos').select(COLS).eq('arbitro', userId)
        .in('estado', ['pendiente', 'propuesto', 'disputa']).order('fecha').limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });
  panel.cargar();
  return panel;
}

/** Mis partidos: mis partidos oficiales que llegaron por Phoenix Link (con «Reclamar»). Oculto si no hay. */
export function montarMisOficiales(section, userId) {
  if (!section || !userId) return null;
  const panel = crearPanel(section, {
    acciones: 'dt',
    vacio: null,
    cargarPartidos: async () => {
      const { data: yo, error } = await supabase.from('liga_participantes').select('edicion_id, nombre').eq('usuario', userId);
      if (error) throw error;
      const salida = [];
      for (const { edicion_id: ed, nombre } of yo ?? []) {
        const { data, error: e2 } = await supabase.from('liga_partidos').select(COLS).eq('edicion_id', ed)
          .or(`local.eq."${nombre.replace(/"/g, '')}",visitante.eq."${nombre.replace(/"/g, '')}"`)
          .not('propuesto_en', 'is', null).order('fecha', { ascending: false }).limit(20);
        if (e2) throw e2;
        salida.push(...(data ?? []));
      }
      return salida;
    },
  });
  panel.cargar();
  return panel;
}
