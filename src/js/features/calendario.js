// Calendario personal: ventana «Añadir a mi calendario» (Google Calendar por evento o archivo .ics para todos).
// Lógica pura en core/sistema/calendario.js. La usan Mis partidos, Eventos y la ficha de un torneo.
// Blindaje: sin eventos válidos → aviso claro (no ventana vacía); descarga con Blob y, si el navegador no deja (iPhone viejo,
// navegador embebido), se ofrece compartir el archivo o abrirlo directo; enlaces de Google en pestaña nueva y sin «opener».
import { crearIcs, enlaceGoogle, prepararEventos, avisoOmitidos } from '../core/sistema/calendario.js';
import { openModal } from '../core/sistema/modal.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';

const fmt = (d) => { try { return d.toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d.toISOString(); } };

/** Descarga (o comparte) el .ics. Devuelve true si se pudo. */
export async function descargarIcs(eventos, nombre = 'phoenix-partidos') {
  const ics = crearIcs(eventos);
  if (!ics) { toast(avisoOmitidos(prepararEventos(eventos)) || 'No hay nada con fecha para añadir.', 'info'); return false; }
  const archivo = `${String(nombre).replace(/[^a-z0-9-]+/gi, '-').slice(0, 60) || 'calendario'}.ics`;
  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    // Celulares que no descargan bien (iOS dentro de apps): compartir el archivo abre «Calendario» directamente.
    const f = typeof File === 'function' ? new File([blob], archivo, { type: 'text/calendar' }) : null;
    if (f && navigator.canShare?.({ files: [f] }) && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      await navigator.share({ files: [f], title: 'Mis partidos' }); return true;
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: archivo, rel: 'noopener' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) {
    if (e?.name === 'AbortError') return false;   // canceló el menú de compartir
    console.error('[calendario] descarga:', e);
    try { location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`; return true; } catch { /* nada */ }
    toast('Tu navegador no dejó descargar el archivo. Usa los botones de Google Calendar.', 'warn');
    return false;
  }
}

/**
 * Abre la ventana con cada evento (botón de Google) y «Descargar todos».
 * @param {object[]} eventos  { uid, titulo, inicio, minutos?, descripcion?, url? }
 * @param {{ titulo?: string, archivo?: string }} [op]
 */
export function abrirCalendario(eventos, { titulo = 'Añadir a mi calendario', archivo = 'phoenix-partidos' } = {}) {
  const prep = prepararEventos(eventos);
  const omitidos = avisoOmitidos(prep);
  if (!prep.validos.length) { toast(omitidos || 'No hay nada con fecha para añadir.', 'info'); return; }
  const filas = prep.validos.map((e) => {
    const g = enlaceGoogle(e);
    return `<li class="cal-fila"><div class="cal-txt"><b>${esc(e.titulo)}</b><small>${esc(fmt(e.inicio))}</small></div>
      ${g ? `<a class="btn btn-ghost cal-g" href="${esc(g)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i> Google</a>` : ''}</li>`;
  }).join('');
  const m = openModal(`<div class="p-5 sm:p-6 space-y-4">
    <h2 class="text-lg font-display font-bold text-white"><i class="fa-solid fa-calendar-plus text-galaxy-400 mr-2"></i>${esc(titulo)}</h2>
    <p class="text-sm text-gray-300">${prep.validos.length === 1 ? 'Añádelo a Google Calendar o descarga el archivo, que abre el calendario de tu celular o PC.' : 'Añádelos uno por uno a Google Calendar o descarga todos en un archivo que abre el calendario de tu celular o PC.'} Te avisa 30 minutos antes.</p>
    <ul class="cal-lista">${filas}</ul>
    ${omitidos ? `<p class="text-xs text-gray-400">${esc(omitidos)}</p>` : ''}
    <div class="flex flex-wrap gap-2 justify-end"><button type="button" class="btn btn-ghost" data-close>Cerrar</button>
      <button type="button" class="btn btn-primary" data-cal-todos><i class="fa-solid fa-download"></i> ${prep.validos.length === 1 ? 'Descargar (.ics)' : 'Descargar todos (.ics)'}</button></div></div>`, { id: 'modal-calendario' });
  const raiz = document.getElementById('modal-calendario') ?? m;
  raiz?.querySelector?.('[data-cal-todos]')?.addEventListener('click', async () => { if (await descargarIcs(prep.validos, archivo)) toast('Listo: ábrelo para añadirlo a tu calendario.', 'ok'); });
}
