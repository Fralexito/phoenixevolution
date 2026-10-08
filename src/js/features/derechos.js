// «Tus datos y derechos» (Configuración → Cuenta). Usa RPC ya existentes en la base:
// exportar_mis_datos(), solicitar_derecho(p_tipo, p_detalle), mis_solicitudes_privacidad().
import { supabase } from '../core/supabase.js';
import { toast } from '../core/toast.js';
import { confirmar, pedirTexto } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { href } from '../core/config.js';

const TIPOS = {
  rectificacion: ['fa-pen', 'Corregir un dato', '¿Qué dato está mal y cuál es el correcto?'],
  oposicion: ['fa-hand', 'Oponerme a un uso', '¿A qué uso de tus datos te opones?'],
  baja: ['fa-bell-slash', 'Darme de baja de avisos', '¿De qué avisos quieres darte de baja? (opcional)'],
  eliminacion: ['fa-user-xmark', 'Eliminar mi cuenta', 'Cuéntanos el motivo (opcional). Tus resultados quedarán anónimos para no romper las tablas de otros.'],
};
const ESTADO = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelta: 'Resuelta', rechazada: 'Rechazada' };
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

async function descargarDatos(boton) {
  boton.disabled = true;
  try {
    const { data, error } = await supabase.rpc('exportar_mis_datos');
    if (error) throw error;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `mis-datos-phoenix-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Copia de tus datos descargada.', 'ok');
  } catch (e) { console.error('[derechos] exportar', e); toast('No se pudo generar la copia. Intenta de nuevo.', 'error'); }
  finally { boton.disabled = false; }
}

async function solicitar(tipo, cont) {
  const [, titulo, pregunta] = TIPOS[tipo];
  if (tipo === 'eliminacion' && !(await confirmar('El staff borrará o anonimizará tu cuenta y tus datos personales en un máximo de 30 días. No se puede deshacer. ¿Enviar la solicitud?', { titulo, aceptar: 'Enviar solicitud', peligro: true }))) return;
  const opcional = tipo === 'eliminacion' || tipo === 'baja';
  const detalle = await pedirTexto(pregunta, { titulo, maximo: 1000, obligatorio: !opcional, aceptar: 'Enviar' });
  if (detalle === null) return;   // canceló
  const { error } = await supabase.rpc('solicitar_derecho', { p_tipo: tipo, p_detalle: String(detalle).trim() || null });
  if (error) { toast(error.message || 'No se pudo enviar.', 'error'); return; }
  toast('Solicitud enviada. El staff te responderá aquí.', 'ok');
  await pintarLista(cont);
}

async function pintarLista(cont) {
  const lista = cont.querySelector('[data-der-lista]');
  const { data, error } = await supabase.rpc('mis_solicitudes_privacidad');
  if (error) { console.warn('[derechos] lista', error); lista.innerHTML = ''; return; }
  lista.innerHTML = !data?.length ? '' : `<h4 class="text-[12px] uppercase tracking-widest text-gray-500 mt-3 mb-1">Tus solicitudes</h4><ul class="space-y-1 text-xs">${data.map((s) => `
    <li class="flex flex-wrap gap-x-2"><b class="text-white">${esc(TIPOS[s.tipo]?.[1] ?? s.tipo)}</b><span class="text-gray-500">${fecha(s.creada)}</span><span class="text-galaxy-400">${esc(ESTADO[s.estado] ?? s.estado)}</span>${s.nota ? `<span class="w-full text-gray-400">Staff: ${esc(s.nota)}</span>` : ''}</li>`).join('')}</ul>`;
}

/** Pinta el bloque dentro de `cont` (solo con sesión iniciada). */
export function pintarDerechos(cont) {
  cont.innerHTML = `<div class="mt-4 pt-4 border-t border-galaxy-border/60">
    <h3 class="text-white text-sm font-semibold"><i class="fa-solid fa-user-shield text-galaxy-400 mr-1.5"></i>Tus datos y derechos</h3>
    <p class="text-[12px] text-gray-400 mb-2">Descarga todo lo que guardamos de ti o envía una solicitud al staff. Más detalles en la <a class="text-galaxy-400 hover:underline" href="${esc(href('legal/privacidad/'))}">Política de privacidad</a>.</p>
    <div class="flex flex-wrap gap-2">
      <button type="button" data-der-exportar class="btn btn-ghost !min-h-9 !text-xs"><i class="fa-solid fa-file-arrow-down"></i> Descargar mis datos</button>
      ${Object.entries(TIPOS).map(([k, [ic, t]]) => `<button type="button" data-der="${k}" class="btn btn-ghost !min-h-9 !text-xs ${k === 'eliminacion' ? '!text-bad !border-bad/50' : ''}"><i class="fa-solid ${ic}"></i> ${t}</button>`).join('')}
    </div>
    <div data-der-lista></div></div>`;
  cont.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-der-exportar')) descargarDatos(b);
    else if (b.dataset.der) solicitar(b.dataset.der, cont);
  });
  pintarLista(cont);
}
