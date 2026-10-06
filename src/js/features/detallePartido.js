// Detalle de un partido: goles con minuto, goleador y asistente (tabla `partido_goles`, migración 054).
// Lo ve cualquiera; el staff (permiso `editarLiga`) puede cargar y borrar goles. La lógica pura está en core/golesPartido.js.
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { escudoHTML } from '../core/escudos.js';
import { openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { can } from '../core/session.js';
import { borrarFilas } from './escritura.js';
import { selloPartido } from '../core/pulso.js';
import { ordenarGoles, validarGol, revisarMarcador, TIPOS_GOL } from '../core/golesPartido.js';

const ID = 'detalle-partido';
const NOMBRE_SELLO = { oficial: 'Oficial', pendiente: 'Pendiente', aplazado: 'Aplazado', wo: 'WO', incidencia: 'En revisión' };
const jugado = (p) => Number.isInteger(p?.gl) && Number.isInteger(p?.gv);

/** Lee los goles del partido. Lanza el error de Supabase si falla (el llamador lo muestra). */
async function leerGoles(c) {
  const { data, error } = await supabase.from('partido_goles').select('id, lado, goleador, minuto, asistente, tipo')
    .eq('liga', c.liga).eq('edicion', c.edicion).eq('fecha', c.fecha).eq('local', c.partido.l).eq('visitante', c.partido.v);
  if (error) throw error;
  return data ?? [];
}

const icono = (g) => g.tipo === 'penal' ? '<i class="fa-solid fa-bullseye text-amber-300" title="Penal"></i>' : g.tipo === 'en_contra' ? '<i class="fa-solid fa-rotate-left text-rose-400" title="Autogol"></i>' : '<i class="fa-solid fa-futbol text-galaxy-400" title="Gol"></i>';
const textoGol = (g) => `<b class="text-white">${escapeHTML(g.goleador)}</b>${g.tipo === 'en_contra' ? ' <span class="text-[10px] uppercase text-rose-300">(en contra)</span>' : ''}${g.asistente ? `<small class="block text-[11px] text-gray-400"><i class="fa-solid fa-shoe-prints mr-1"></i>${escapeHTML(g.asistente)}</small>` : ''}`;

function cabecera(c) {
  const p = c.partido; const k = selloPartido(p); const club = (n) => c.clubes?.[n] ?? '';
  const lado = (n, der) => `<div class="min-w-0 flex flex-col items-center gap-1 text-center"><span class="grid place-items-center w-14 h-14 rounded-full bg-black/40 border border-galaxy-border/60">${escudoHTML(club(n), 40)}</span><b class="font-display text-white uppercase truncate max-w-full">${escapeHTML(n)}</b><small class="text-[10px] text-gray-400 uppercase truncate max-w-full">${escapeHTML(club(n))}</small></div>`;
  return `<div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">${lado(p.l)}<div class="text-center"><span class="block font-display font-extrabold text-4xl text-white tabular-nums">${jugado(p) ? `${p.gl} - ${p.gv}` : 'VS'}</span><span class="sello-partido ${k} mt-1">${NOMBRE_SELLO[k]}</span></div>${lado(p.v)}</div>
    <p class="text-center text-[11px] font-display font-bold uppercase tracking-[0.2em] text-galaxy-400 mt-3">${escapeHTML(c.ligaTitulo)} · ${escapeHTML(c.edicionNombre)} · Fecha ${c.fecha}</p>`;
}

function lineaTiempo(goles) {
  if (!goles.length) return '';
  return `<ol class="space-y-2" aria-label="Goles del partido">${ordenarGoles(goles).map((g) => `<li class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
    <span class="text-right min-w-0">${g.lado === 'l' ? textoGol(g) : ''}</span>
    <span class="inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-galaxy-border/60 px-2.5 py-1 font-display font-bold text-white tabular-nums">${icono(g)}${g.minuto}'</span>
    <span class="min-w-0">${g.lado === 'v' ? textoGol(g) : ''}</span></li>`).join('')}</ol>`;
}

const AVISO = {
  sin_detalle: ['text-gray-400', 'fa-circle-info', 'Todavía no se cargó el detalle de los goles de este partido.'],
  faltan: ['text-amber-300', 'fa-triangle-exclamation', 'El detalle está incompleto: faltan goles por cargar.'],
  sobran: ['text-rose-300', 'fa-triangle-exclamation', 'Hay más goles cargados que en el marcador oficial: revisa el detalle.'],
};

/** Abre el detalle de un partido. `c` = { liga, ligaTitulo, edicion, edicionNombre, fecha, partido:{l,v,gl,gv,estado?}, clubes }. */
export async function abrirDetalle(c) {
  // La cabecera (equipos y marcador) se muestra al instante; solo los goles esperan a la red.
  const m = openModal(`<div class="p-5 sm:p-6 space-y-4" id="dp-cuerpo"><div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">Detalle del partido</h3><button type="button" data-close class="text-gray-400 hover:text-white" aria-label="Cerrar"><i class="fa-solid fa-xmark text-xl"></i></button></div>${cabecera(c)}<div class="esqueleto h-16" role="status" aria-label="Cargando los goles"></div></div>`, { id: ID });
  const cuerpo = m.querySelector('#dp-cuerpo'); let goles = [], fallo = false, editando = false;

  const pintarVista = () => {
    const rev = revisarMarcador(goles, c.partido); const aviso = jugado(c.partido) && !fallo ? AVISO[rev.estado] : null;
    const staff = can('editarLiga') && jugado(c.partido);
    cuerpo.innerHTML = `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">Detalle del partido</h3><button type="button" data-close class="text-gray-400 hover:text-white" aria-label="Cerrar"><i class="fa-solid fa-xmark text-xl"></i></button></div>
      ${cabecera(c)}
      ${fallo ? '<p class="text-center text-xs text-rose-300" role="alert">No se pudo cargar el detalle de los goles. Intenta de nuevo más tarde.</p>' : lineaTiempo(goles)}
      ${aviso && (rev.estado === 'sin_detalle' || staff || rev.estado !== 'completo') ? `<p class="text-center text-xs ${aviso[0]}"><i class="fa-solid ${aviso[1]} mr-1"></i>${aviso[2]}</p>` : ''}
      ${!jugado(c.partido) ? '<p class="text-center text-xs text-gray-400">El detalle aparece cuando el partido tiene marcador.</p>' : ''}
      ${staff ? '<div class="text-center"><button type="button" id="dp-editar" class="btn btn-ghost !py-1.5 text-xs"><i class="fa-solid fa-pen"></i> Editar goles</button></div>' : ''}`;
    cuerpo.querySelector('#dp-editar')?.addEventListener('click', () => { editando = true; pintarEditor(); });
  };

  const recargar = async () => { try { goles = await leerGoles(c); fallo = false; } catch (e) { console.error('[detalle] leer goles:', e); fallo = true; } };

  const pintarEditor = () => {
    const rev = revisarMarcador(goles, c.partido);
    const fila = (g) => `<li class="flex items-center gap-2 text-sm rounded-lg bg-black/30 border border-galaxy-border/40 px-3 py-1.5"><span class="w-10 font-display font-bold text-white tabular-nums">${g.minuto}'</span><span class="flex-1 min-w-0 truncate">${icono(g)} <b class="text-white">${escapeHTML(g.goleador)}</b> <small class="text-gray-400">→ ${escapeHTML(g.lado === 'l' ? c.partido.l : c.partido.v)}${g.asistente ? ` · asist. ${escapeHTML(g.asistente)}` : ''}</small></span><button type="button" data-borrar="${Number(g.id)}" class="text-rose-300 hover:text-rose-200" aria-label="Borrar gol"><i class="fa-solid fa-trash"></i></button></li>`;
    cuerpo.innerHTML = `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">Editar goles · ${escapeHTML(c.partido.l)} ${c.partido.gl}-${c.partido.gv} ${escapeHTML(c.partido.v)}</h3><button type="button" data-close class="text-gray-400 hover:text-white" aria-label="Cerrar"><i class="fa-solid fa-xmark text-xl"></i></button></div>
      <p class="text-xs ${rev.estado === 'completo' ? 'text-emerald-300' : 'text-gray-300'}">Cargados: ${escapeHTML(c.partido.l)} ${rev.l} · ${escapeHTML(c.partido.v)} ${rev.v} — Marcador oficial: ${c.partido.gl}-${c.partido.gv}${rev.estado === 'completo' ? ' ✔' : ''}</p>
      <ul class="space-y-1.5" id="dp-lista">${ordenarGoles(goles).map(fila).join('') || '<li class="text-xs text-gray-500">Aún no hay goles cargados.</li>'}</ul>
      <form id="dp-form" class="grid grid-cols-2 gap-2 border-t border-galaxy-border pt-3" novalidate>
        <label class="label col-span-2 !mb-0">Agregar gol</label>
        <select id="dp-lado" class="field" aria-label="A quién se le anota"><option value="l">Suma a ${escapeHTML(c.partido.l)}</option><option value="v">Suma a ${escapeHTML(c.partido.v)}</option></select>
        <select id="dp-tipo" class="field" aria-label="Tipo de gol">${Object.entries(TIPOS_GOL).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>
        <input id="dp-gol" class="field" maxlength="60" placeholder="Quién metió el gol (jugador del juego)" autocomplete="off" aria-label="Goleador">
        <input id="dp-min" class="field" inputmode="numeric" maxlength="3" placeholder="Minuto (0–130)" autocomplete="off" aria-label="Minuto">
        <input id="dp-asi" class="field col-span-2" maxlength="60" placeholder="Asistencia (opcional)" autocomplete="off" aria-label="Asistente">
        <ul id="dp-err" class="col-span-2 text-xs text-rose-400" role="alert"></ul>
        <div class="col-span-2 flex flex-wrap gap-2 justify-between"><button type="button" id="dp-listo" class="btn btn-ghost">Listo</button><button type="submit" id="dp-add" class="btn btn-primary">Agregar gol</button></div>
        <p class="col-span-2 text-[11px] text-gray-500">En un autogol, el goleador es del equipo rival pero el gol suma al equipo elegido arriba.</p>
      </form>`;
    const q = (x) => cuerpo.querySelector(x); const err = (l) => { q('#dp-err').innerHTML = l.map((t) => `<li>${escapeHTML(t)}</li>`).join(''); };
    q('#dp-listo').addEventListener('click', () => { editando = false; pintarVista(); });
    q('#dp-lista').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-borrar]'); if (!b) return;
      if (!(await confirmar('¿Borrar este gol del detalle?', { titulo: 'Borrar gol', aceptar: 'Borrar', peligro: true }))) return;
      try { await borrarFilas(supabase, 'partido_goles', { id: Number(b.dataset.borrar) }, 'id'); toast('Gol borrado.', 'ok'); await recargar(); window.dispatchEvent(new CustomEvent('goles-cambiaron')); pintarEditor(); }
      catch (e2) { console.error('[detalle] borrar gol:', e2); err([e2.message || 'No se pudo borrar.']); }
    });
    q('#dp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = validarGol({ lado: q('#dp-lado').value, tipo: q('#dp-tipo').value, goleador: q('#dp-gol').value, minuto: q('#dp-min').value, asistente: q('#dp-asi').value });
      if (!v.ok) { err(v.errores); return; }
      err([]); const btn = q('#dp-add'); btn.disabled = true;
      try {
        const { error } = await supabase.from('partido_goles').insert({ liga: c.liga, edicion: c.edicion, fecha: c.fecha, local: c.partido.l, visitante: c.partido.v, ...v.gol });
        if (error) throw error;
        toast('Gol agregado.', 'ok'); await recargar(); window.dispatchEvent(new CustomEvent('goles-cambiaron')); pintarEditor(); q('#dp-gol')?.focus();
      } catch (e2) {
        console.error('[detalle] agregar gol:', e2); btn.disabled = false;
        err([/row-level security|policy/i.test(e2.message) ? 'No tienes permiso para editar goles.' : (e2.message || 'No se pudo guardar.')]);
      }
    });
    q('#dp-gol').focus();
  };

  await recargar();
  if (!document.getElementById(ID)) return;   // el usuario cerró la ventana mientras cargaba
  editando ? pintarEditor() : pintarVista();
}

/** Todos los goles de una edición (para los rankings de goleadores y asistentes). Devuelve [] si falla (se registra en consola). */
export async function leerGolesEdicion(liga, edicion) {
  try {
    const { data, error } = await supabase.from('partido_goles').select('goleador, asistente, tipo').eq('liga', liga).eq('edicion', edicion).limit(2000);
    if (error) throw error; return data ?? [];
  } catch (e) { console.warn('[detalle] goles de la edición:', e?.message ?? e); return []; }
}
