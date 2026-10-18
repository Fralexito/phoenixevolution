// Página /link-versiones/: publicar o retirar versiones de Phoenix Link y ver qué versión tiene cada PC (migración 128).
// Las reglas viven en la BD: link_versiones_panel (staff), link_version_publicar / _obligatoria / _notas (solo admin).
import { onSession, can } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { toast } from '../core/sistema/toast.js';
import { escapeHTML as e } from '../core/sistema/dom.js';
import { estadoVersion, normalizarPanel, tamanoTexto } from '../core/pes/linkVersiones.js';

const $ = (id) => document.getElementById(id);
const S = { panel: normalizarPanel(null), confirmar: null, iniciado: false };
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const TONO = { verde: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10', ambar: 'text-amber-200 border-amber-400/40 bg-amber-500/10',
  rojo: 'text-rose-200 border-rose-400/40 bg-rose-500/10', gris: 'text-gray-300 border-white/15 bg-white/5' };

function mostrarError(err) {
  console.error('[link-versiones]', err);
  const m = String(err?.message ?? '');
  $('lv-error-txt').textContent = /does not exist|Could not find/.test(m) ? 'Falta pegar la migración 128 en Supabase.' : m.replace(/^.*?:\s*/, '') || 'Algo salió mal.';
  $('lv-error').hidden = false;
}

async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(error.message);
  return data;
}

function pintar() {
  const { versiones, pcs, ultima, resumen, esAdmin } = S.panel;
  $('lv-resumen').innerHTML = ultima
    ? `Versión publicada: <b class="text-white">${e(ultima.version)}</b>${ultima.obligatoria ? ' <span class="text-rose-200">(obligatoria)</span>' : ''} · `
      + `<b class="text-white">${resumen.alDia}</b> de ${resumen.total} PCs al día${resumen.conProblema ? ` · <span class="text-rose-200">${resumen.conProblema} con problema al actualizar</span>` : ''}`
    : 'Todavía no hay ninguna versión publicada. Las PCs siguen con la que tienen.';

  $('lv-versiones').innerHTML = versiones.length ? versiones.map((v) => {
    const est = estadoVersion(v);
    const pidiendo = S.confirmar === `${v.id}:${v.publicada ? 'retirar' : 'publicar'}`;
    const boton = !esAdmin ? '' : v.publicada
      ? `<button type="button" class="btn btn-ghost !min-h-8 !px-3 !text-[12px]" data-acc="retirar" data-id="${v.id}">${pidiendo ? '¿Seguro? Pulsa otra vez' : 'Retirar'}</button>`
      : v.subida ? `<button type="button" class="btn btn-primary !min-h-8 !px-3 !text-[12px]" data-acc="publicar" data-id="${v.id}">${pidiendo ? '¿Seguro? Pulsa otra vez' : 'Publicar'}</button>` : '';
    return `<article class="glass-panel rounded-2xl px-4 py-3 space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-display font-extrabold text-white text-lg">${e(v.version)}</span>
        ${v.etapa ? `<span class="text-[11px] text-gray-400">${e(v.etapa)}</span>` : ''}
        <span class="text-[11px] px-2 py-0.5 rounded border ${TONO[est.tono]}">${e(est.texto)}</span>
        <span class="text-[11px] text-gray-400">${tamanoTexto(v.tamano)} · subida ${e(fecha(v.creada))} · ${v.pcs} PC${v.pcs === 1 ? '' : 's'}</span>
        <span class="flex-1"></span>
        ${esAdmin ? `<label class="text-[12px] text-gray-300 flex items-center gap-1.5"><input type="checkbox" data-acc="obligatoria" data-id="${v.id}" ${v.obligatoria ? 'checked' : ''}> Obligatoria</label>` : ''}
        ${boton}
      </div>
      ${esAdmin ? `<textarea data-acc="notas" data-id="${v.id}" rows="2" maxlength="2000" class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-100" placeholder="Qué trae esta versión (español simple, lo ve cada jugador en Link)">${e(v.notas)}</textarea>`
        : `<p class="text-sm text-gray-300 whitespace-pre-line">${e(v.notas) || '—'}</p>`}
      <p class="text-[11px] text-gray-500 break-all">sha256 ${e(v.sha256)}</p>
    </article>`;
  }).join('') : '<p class="glass-panel rounded-2xl px-4 py-6 text-center text-sm text-gray-400">Aún no subiste ninguna versión.</p>';

  $('lv-pcs').innerHTML = pcs.length ? `<table class="w-full text-sm"><thead class="text-[11px] uppercase text-gray-400"><tr>
      <th class="text-left px-3 py-2">Jugador</th><th class="text-left px-3 py-2">PC</th><th class="text-left px-3 py-2">Versión</th><th class="text-left px-3 py-2">Último aviso</th><th class="text-left px-3 py-2">Última actualización</th></tr></thead><tbody>
    ${pcs.map((p) => `<tr class="border-t border-white/5">
      <td class="px-3 py-2 text-white">${e(p.usuario)}</td><td class="px-3 py-2 text-gray-300">${e(p.pc)}</td>
      <td class="px-3 py-2 ${p.alDia ? 'text-emerald-300' : 'text-amber-200'}">${e(p.version)}${p.alDia ? '' : ' (vieja)'}</td>
      <td class="px-3 py-2 text-gray-400">${e(fecha(p.ultimo_contacto))}</td>
      <td class="px-3 py-2 ${p.intento?.problema ? 'text-rose-200' : 'text-gray-400'}">${p.intento ? `${e(p.intento.version)}: ${e(p.intento.estado)}${p.intento.detalle ? ` — ${e(p.intento.detalle)}` : ''}` : '—'}</td></tr>`).join('')}
    </tbody></table>` : '<p class="px-4 py-6 text-center text-sm text-gray-400">Ninguna PC ha preguntado todavía (cada Link pregunta al abrirse y cada hora).</p>';
}

async function cargar() {
  try { S.panel = normalizarPanel(await rpc('link_versiones_panel')); $('lv-error').hidden = true; pintar(); }
  catch (err) { mostrarError(err); }
}

function conectar() {
  const app = $('lv-app');
  app.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-acc]'); if (!b) return;
    const clave = `${b.dataset.id}:${b.dataset.acc}`;
    if (S.confirmar !== clave) { S.confirmar = clave; pintar(); return; }   // primer clic pide confirmar
    S.confirmar = null; b.disabled = true;
    try {
      const r = await rpc('link_version_publicar', { p_id: Number(b.dataset.id), p_publicar: b.dataset.acc === 'publicar' });
      toast(r.publicada ? `Publicada la ${r.version}: los Link la verán en menos de 1 hora.` : `Retirada la ${r.version}.`);
    } catch (err) { mostrarError(err); }
    cargar();
  });
  app.addEventListener('change', async (ev) => {
    const t = ev.target; if (!t.dataset?.acc) return;
    try {
      if (t.dataset.acc === 'obligatoria') await rpc('link_version_obligatoria', { p_id: Number(t.dataset.id), p_obligatoria: t.checked });
      else if (t.dataset.acc === 'notas') await rpc('link_version_notas', { p_id: Number(t.dataset.id), p_notas: t.value });
      toast('Guardado.');
    } catch (err) { mostrarError(err); }
    cargar();
  });
  $('lv-reintentar').addEventListener('click', cargar);
}

onSession(({ session }) => {
  const permitido = !!session && can('verAuditoriaCompleta');
  $('lv-sinsesion').hidden = !!session;
  $('lv-denegado').hidden = !session || permitido;
  $('lv-app').hidden = !permitido;
  if (permitido && !S.iniciado) { S.iniciado = true; conectar(); cargar(); }
});
