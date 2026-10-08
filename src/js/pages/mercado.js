// Mercado (beta): vincular el programa Phoenix Mercado, ver mis reportes; staff: option file oficial + revisar cambios.
// BD: migración 078 (mercado_*). Todas las escrituras por RPC o con RLS de staff; el programa usa la Edge Function «mercado».
import { supabase } from '../core/supabase.js';
import { onSession, can } from '../core/session.js';
import { pedirTexto } from '../core/dialogo.js';
import { toast } from '../core/toast.js';
import { confirmar } from '../core/dialogo.js';
import { escapeHTML as esc } from '../core/dom.js';
import { haceCuanto } from '../core/notifs.js';

const $ = (id) => document.getElementById(id);
const ESTADO = { pendiente: ['En revisión', 'text-amber-200 border-amber-400/40 bg-amber-500/10'], aprobado: ['Aprobado', 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10'], rechazado: ['Rechazado', 'text-rose-200 border-rose-400/40 bg-rose-500/10'] };
const pildora = (e) => { const [t, c] = ESTADO[e] ?? [e, '']; return `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${c}">${esc(t)}</span>`; };
const cuando = (f) => esc(haceCuanto(f) ?? new Date(f).toLocaleString());
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
let yo = null; let esStaff = false; let reloj = null;

// ── Jugador ──
async function generarCodigo() {
  try {
    const { data, error } = await supabase.rpc('mercado_generar_codigo'); if (error) throw error;
    const fin = Date.parse(data.expira); clearInterval(reloj);
    const pintar = () => {
      const s = Math.max(0, Math.round((fin - Date.now()) / 1000));
      $('mk-codigo').innerHTML = s ? `<div class="rounded-xl border border-galaxy-400/40 bg-galaxy-400/5 p-3 text-center">
          <p class="text-[11px] text-gray-400 uppercase tracking-widest">Pega este código en Phoenix Mercado</p>
          <p class="font-mono text-3xl tracking-[0.3em] text-white my-1 select-all">${esc(data.codigo)}</p>
          <p class="text-[11px] text-gray-500">Vence en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · un solo uso</p></div>`
        : '<p class="text-xs text-gray-500">El código venció. Genera otro.</p>';
      if (!s) clearInterval(reloj);
    };
    pintar(); reloj = setInterval(pintar, 1000);
  } catch (e) { toast(e.message.includes('DEMASIADOS') ? 'Generaste muchos códigos. Espera unos minutos.' : `No se pudo generar: ${e.message}`, 'error'); }
}
async function pintarDispositivos() {
  const { data, error } = await supabase.from('mercado_dispositivos').select('id, nombre, version_app, ultimo_uso, created_at').eq('usuario', yo).eq('revocado', false).order('created_at', { ascending: false });
  if (error) { $('mk-dispositivos').innerHTML = '<p class="text-xs text-rose-300">No se pudieron cargar tus PCs.</p>'; console.warn('[mercado] dispositivos', error); return; }
  $('mk-dispositivos').innerHTML = !data.length ? '<p class="text-xs text-gray-500">Aún no vinculaste ninguna PC.</p>'
    : `<p class="text-[11px] text-gray-500 uppercase tracking-widest">PCs vinculadas</p>` + data.map((d) => `<div class="flex items-center gap-2 rounded-lg border border-galaxy-border px-3 py-2 text-xs">
        <i class="fa-solid fa-desktop text-galaxy-400"></i><span class="flex-1"><b class="text-white">${esc(d.nombre)}</b>${d.version_app ? ` · v${esc(d.version_app)}` : ''}<br><span class="text-gray-500">${d.ultimo_uso ? `Usada ${cuando(d.ultimo_uso)}` : 'Sin uso aún'}</span></span>
        <button type="button" class="btn !min-h-8 !text-[11px]" data-revocar="${esc(d.id)}">Desvincular</button></div>`).join('');
}
async function pintarAjuste() {
  const { data } = await supabase.from('mercado_ajustes').select('exigir_codigo').eq('usuario', yo).maybeSingle();
  $('mk-exigir').checked = !!data?.exigir_codigo;
}
$('mk-exigir')?.addEventListener('change', async (e) => {
  try { const { error } = await supabase.rpc('mercado_exigir_codigo', { p_exigir: e.target.checked }); if (error) throw error; toast(e.target.checked ? 'Ahora se exige el código manager.' : 'Phoenix Link ya puede usar el Modo Mánager.', 'ok'); }
  catch (err) { e.target.checked = !e.target.checked; toast(`No se pudo guardar: ${err.message}`, 'error'); }
});
async function pintarMisReportes() {
  const { data, error } = await supabase.from('mercado_reportes').select('id, option_version, resumen, estado, motivo, created_at').eq('usuario', yo).order('created_at', { ascending: false }).limit(10);
  if (error) { $('mk-mis-reportes').innerHTML = '<p class="text-xs text-rose-300">No se pudieron cargar.</p>'; return; }
  $('mk-mis-reportes').innerHTML = !data.length ? '<p class="text-xs text-gray-500">Cuando juegues con el programa, tus cambios aparecerán aquí.</p>'
    : data.map((r) => `<div class="rounded-lg border border-galaxy-border px-3 py-2"><div class="flex items-center gap-2">${pildora(r.estado)}<span class="text-[11px] text-gray-500">#${r.id} · ${cuando(r.created_at)}</span></div>
        <p class="text-gray-200 text-xs mt-1">${esc(r.resumen || 'Cambios del option file')}</p>${r.motivo ? `<p class="text-[11px] text-gray-400 mt-1">Staff: ${esc(r.motivo)}</p>` : ''}</div>`).join('');
}
async function pintarOficial() {
  const { data } = await supabase.from('mercado_option_files').select('version, notas, created_at').eq('actual', true).maybeSingle();
  $('mk-oficial').innerHTML = data ? `<i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i>Option file oficial: <b class="text-white">${esc(data.version)}</b> · ${cuando(data.created_at)}${data.notas ? `<br>${esc(data.notas)}` : ''}`
    : '<i class="fa-solid fa-hourglass-half mr-1"></i>El staff aún no publicó el option file oficial.';
}

// ── Staff ──
const cambioTxt = (c) => {
  if (!c || typeof c !== 'object') return esc(String(c));
  const fmt = (v) => (v && typeof v === 'object' ? Object.values(v).filter((x) => typeof x !== 'object').join(' · ') : String(v ?? '—'));
  const quien = c.jugador ?? c.entidad ?? ''; const campo = c.campo ? ` · ${c.campo}` : '';
  return `<b class="text-white">${esc(c.tipo ?? 'cambio')}</b> ${esc(quien)}${esc(campo)}: <span class="text-rose-300">${esc(fmt(c.de))}</span> → <span class="text-emerald-300">${esc(fmt(c.a))}</span>`;
};
async function pintarPendientes() {
  const { data, error } = await supabase.from('mercado_reportes').select('id, usuario, option_version, resumen, cambios, hash_antes, hash_despues, created_at').eq('estado', 'pendiente').order('created_at').limit(30);
  if (error) { $('mk-pendientes').innerHTML = '<p class="text-xs text-rose-300">No se pudieron cargar.</p>'; return; }
  $('mk-n-pend').textContent = data.length ? `(${data.length})` : '';
  const ids = [...new Set(data.map((r) => r.usuario))];
  const { data: perf } = ids.length ? await supabase.from('perfiles').select('id, nombre_display, username').in('id', ids) : { data: [] };
  const nom = (id) => { const p = (perf ?? []).find((x) => x.id === id); return p?.nombre_display || p?.username || 'Jugador'; };
  $('mk-pendientes').innerHTML = !data.length ? '<p class="text-xs text-emerald-200/80">Nada pendiente. 🎉</p>' : data.map((r) => {
    const lista = Array.isArray(r.cambios) ? r.cambios : [];
    return `<article class="rounded-xl border border-galaxy-border p-3 space-y-2">
      <div class="flex flex-wrap items-center gap-2 text-xs"><b class="text-white">${esc(nom(r.usuario))}</b><span class="text-gray-500">#${r.id} · ${cuando(r.created_at)} · option ${esc(r.option_version ?? '—')}</span>
        ${r.hash_antes && r.hash_antes === r.hash_despues ? '<span class="text-[11px] text-gray-400">(sin cambios en el archivo)</span>' : ''}</div>
      ${r.resumen ? `<p class="text-sm text-gray-200">${esc(r.resumen)}</p>` : ''}
      <details ${lista.length <= 8 ? 'open' : ''}><summary class="text-[11px] text-gray-400 cursor-pointer">${lista.length} cambio(s)</summary>
        <ul class="mt-1 space-y-1 text-xs text-gray-300">${lista.slice(0, 200).map((c) => `<li>• ${cambioTxt(c)}</li>`).join('')}${lista.length > 200 ? `<li class="text-gray-500">… y ${lista.length - 200} más</li>` : ''}</ul></details>
      <div class="flex gap-2"><button type="button" class="btn btn-primary !min-h-8 !text-xs" data-aprobar="${r.id}"><i class="fa-solid fa-check"></i> Aprobar</button>
        <button type="button" class="btn !min-h-8 !text-xs !text-rose-300" data-rechazar="${r.id}"><i class="fa-solid fa-xmark"></i> Rechazar</button></div></article>`;
  }).join('');
}
async function pintarVersiones() {
  const { data, error } = await supabase.from('mercado_option_files').select('id, version, sha256, tamano, notas, actual, created_at').order('created_at', { ascending: false }).limit(15);
  if (error) { $('mk-versiones').innerHTML = '<p class="text-xs text-rose-300">No se pudieron cargar.</p>'; return; }
  $('mk-versiones').innerHTML = !data.length ? '<p class="text-xs text-gray-500">Sube el primer option file oficial.</p>' : data.map((f) => `<div class="flex flex-wrap items-center gap-2 rounded-lg border ${f.actual ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-galaxy-border'} px-3 py-2 text-xs">
      <b class="text-white">${esc(f.version)}</b>${f.actual ? '<span class="text-[11px] text-emerald-300 font-bold">OFICIAL</span>' : ''}<span class="text-gray-500">${kb(f.tamano)} · ${cuando(f.created_at)}</span>
      <code class="text-[10px] text-gray-500" title="${esc(f.sha256)}">${esc(f.sha256.slice(0, 12))}…</code>
      <span class="flex-1 text-gray-400">${esc(f.notas ?? '')}</span>
      ${f.actual ? '' : `<button type="button" class="btn !min-h-7 !text-[11px]" data-publicar="${f.id}">Publicar como oficial</button>`}</div>`).join('');
}
async function sha256Archivo(file) {
  const b = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function subir(form) {
  const f = new FormData(form); const file = f.get('archivo'); const version = String(f.get('version')).trim(); const notas = String(f.get('notas') || '').trim() || null;
  if (!file?.size) return toast('Elige el archivo.', 'warn');
  if (file.size > 50_000_000) return toast('El archivo pesa más de 50 MB.', 'error');
  const btn = form.querySelector('button'); btn.disabled = true;
  try {
    const sha = await sha256Archivo(file); const ruta = `${version}/EDIT00000000`;
    const { error: e1 } = await supabase.storage.from('option-files').upload(ruta, file, { upsert: false, contentType: 'application/octet-stream' });
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('mercado_option_files').insert({ version, ruta, sha256: sha, tamano: file.size, notas, creado_por: yo });
    if (e2) throw e2;
    toast(`Versión ${version} subida. Publícala como oficial cuando quieras.`, 'ok'); form.reset(); pintarVersiones();
  } catch (e) { console.error('[mercado] subir', e); toast(`No se pudo subir: ${e.message}`, 'error'); }
  finally { btn.disabled = false; }
}

// ── Eventos ──
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-revocar],[data-aprobar],[data-rechazar],[data-publicar],#mk-generar'); if (!b || b.disabled) return;
  b.disabled = true;
  try {
    if (b.id === 'mk-generar') await generarCodigo();
    else if (b.dataset.revocar) { if (await confirmar('¿Desvincular esta PC? El programa dejará de funcionar en ella hasta que la vuelvas a vincular.', { peligro: true })) { const { error } = await supabase.rpc('mercado_revocar_dispositivo', { p_id: b.dataset.revocar }); if (error) throw error; toast('PC desvinculada.', 'ok'); pintarDispositivos(); } }
    else if (b.dataset.publicar) { const { error } = await supabase.rpc('mercado_publicar_option', { p_id: Number(b.dataset.publicar) }); if (error) throw error; toast('Ahora es el option file oficial.', 'ok'); pintarVersiones(); pintarOficial(); }
    else {
      const aprobar = 'aprobar' in b.dataset; const id = Number(b.dataset.aprobar ?? b.dataset.rechazar);
      const motivo = aprobar ? null : await pedirTexto('Motivo del rechazo (lo verá el jugador):', { titulo: 'Rechazar reporte', maximo: 500, obligatorio: false, aceptar: 'Rechazar' });
      if (!aprobar && motivo === null) return;
      const { error } = await supabase.rpc('mercado_revisar', { p_id: id, p_aprobar: aprobar, p_motivo: motivo }); if (error) throw error;
      toast(aprobar ? 'Cambios aprobados.' : 'Cambios rechazados.', 'ok'); pintarPendientes();
    }
  } catch (e) { console.error('[mercado]', e); toast(e.message, 'error'); }
  finally { b.disabled = false; }
});
$('mk-subir')?.addEventListener('submit', (e) => { e.preventDefault(); subir(e.target); });

onSession((st) => {
  yo = st?.session?.user?.id ?? null; esStaff = !!yo && can('resolverReportes');   // moderador o admin: igual que private.es_moderador() en la BD
  $('mk-sin-sesion').hidden = !!yo; $('mk-jugador').hidden = !yo; $('mk-staff').hidden = !esStaff;
  if (!yo) return;
  pintarDispositivos(); pintarMisReportes(); pintarOficial(); pintarAjuste();
  if (esStaff) { pintarPendientes(); pintarVersiones(); }
});
