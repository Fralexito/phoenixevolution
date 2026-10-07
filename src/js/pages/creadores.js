// Panel de creadores (migración 071): lista pública de verificados (en vivo primero), solicitud y botón «Estoy en vivo».
import { supabase } from '../core/supabase.js';
import { onSession } from '../core/session.js';
import { toast } from '../core/toast.js';
import { escapeHTML, safeUrl } from '../core/dom.js';
import { href } from '../core/config.js';

const $ = (id) => document.getElementById(id);
const RED = { twitch: ['fa-twitch', 'Twitch'], youtube: ['fa-youtube', 'YouTube'], kick: ['fa-kickstarter-k', 'Kick'], tiktok: ['fa-tiktok', 'TikTok'], facebook: ['fa-facebook', 'Facebook'] };
let yo = null; let mio = null;

function tarjeta(c) {
  const redes = Object.entries(c.plataformas ?? {}).filter(([k, u]) => RED[k] && safeUrl(u)).map(([k, u]) =>
    `<a href="${escapeHTML(u)}" target="_blank" rel="noopener" class="adv-chip !min-h-8 !px-2.5 !text-[12px]"><i class="fa-brands ${RED[k][0]}"></i> ${RED[k][1]}</a>`).join('');
  const vivo = c.en_vivo ? `<a href="${escapeHTML(safeUrl(c.enlace_live) || Object.values(c.plataformas ?? {})[0] || '#')}" target="_blank" rel="noopener"
      class="flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-400/40 px-2.5 py-1.5 text-xs text-rose-100"><i class="fa-solid fa-circle text-[8px] text-rose-400 animate-pulse"></i>
      <b>EN VIVO</b><span class="truncate">${escapeHTML(c.titulo_live ?? '')}</span></a>` : '';
  return `<article class="bg-galaxy-panel rounded-xl border ${c.en_vivo ? 'border-rose-400/50 shadow-[0_0_24px_-8px_rgba(244,63,94,.6)]' : 'border-galaxy-border'} p-3 space-y-2">
    <a href="${href('perfil/')}?u=${encodeURIComponent(c.username ?? '')}" class="flex items-center gap-3">
      ${safeUrl(c.avatar_url) ? `<img src="${escapeHTML(c.avatar_url)}" alt="" class="w-12 h-12 rounded-full object-cover ${c.en_vivo ? 'ring-2 ring-rose-400' : ''}" loading="lazy">` : '<span class="w-12 h-12 rounded-full bg-galaxy-800"></span>'}
      <span class="min-w-0"><b class="text-white block truncate">${escapeHTML(c.nombre)} <i class="fa-solid fa-circle-check text-galaxy-400 text-xs" title="Verificado"></i></b>
        <span class="text-[11px] text-gray-400">${escapeHTML((c.juegos ?? []).join(' · ') || 'Fútbol')}</span></span></a>
    ${vivo}${c.descripcion ? `<p class="text-xs text-gray-300">${escapeHTML(c.descripcion)}</p>` : ''}
    <div class="flex flex-wrap gap-1.5">${redes}</div></article>`;
}

async function cargar() {
  try {
    const { data, error } = await supabase.rpc('creadores_lista'); if (error) throw error;
    $('cr-lista').innerHTML = data.length ? data.map(tarjeta).join('') : '<p class="text-xs text-gray-400 col-span-full">Aún no hay creadores verificados. ¿Transmites PES o FL? Solicítalo arriba.</p>';
  } catch (e) { $('cr-lista').innerHTML = '<p class="text-xs text-gray-400">No se pudo cargar la lista.</p>'; console.warn('[creadores]', e.message); }
}

function panel() {
  const p = mio ?? {}; const pl = p.plataformas ?? {};
  $('cr-panel').innerHTML = p.verificado
    ? `<h2 class="font-display font-bold text-white uppercase text-sm tracking-wider mb-2">Tu directo</h2>
       <form id="cr-vivo" class="flex flex-wrap gap-2"><input name="t" class="field flex-1 min-w-48" maxlength="120" placeholder="Título del directo" value="${escapeHTML(p.titulo_live ?? '')}">
         <input name="u" class="field flex-1 min-w-48" placeholder="Enlace del directo (https://…)" value="${escapeHTML(p.enlace_live ?? '')}">
         <button class="btn ${p.en_vivo ? '' : 'btn-primary'}">${p.en_vivo ? '<i class="fa-solid fa-stop"></i> Terminar directo' : '<i class="fa-solid fa-circle text-rose-400"></i> Estoy en vivo'}</button></form>`
    : `<h2 class="font-display font-bold text-white uppercase text-sm tracking-wider mb-1">${mio ? 'Solicitud enviada · esperando al staff' : 'Solicitar verificación'}</h2>
       <p class="text-xs text-gray-400 mb-2">Pon tus canales (enlaces https). El staff revisa y te verifica.</p>
       <form id="cr-sol" class="grid sm:grid-cols-2 gap-2">${Object.keys(RED).map((k) => `<input name="${k}" class="field" placeholder="${RED[k][1]} (https://…)" value="${escapeHTML(pl[k] ?? '')}">`).join('')}
         <input name="juegos" class="field" placeholder="Juegos (ej. PES 2021, FL)" value="${escapeHTML((p.juegos ?? []).join(', '))}">
         <textarea name="desc" class="field sm:col-span-2" rows="2" maxlength="300" placeholder="Sobre tu canal (opcional)">${escapeHTML(p.descripcion ?? '')}</textarea>
         <button class="btn btn-primary sm:col-span-2">${mio ? 'Actualizar solicitud' : 'Enviar solicitud'}</button></form>`;
}

document.addEventListener('submit', async (ev) => {
  const f = ev.target; if (!['cr-sol', 'cr-vivo'].includes(f.id)) return; ev.preventDefault();
  const d = new FormData(f);
  try {
    if (f.id === 'cr-sol') {
      const pl = Object.fromEntries(Object.keys(RED).map((k) => [k, String(d.get(k) || '').trim()]).filter(([, v]) => v));
      const { error } = await supabase.rpc('solicitar_creador', { p_plataformas: pl, p_juegos: String(d.get('juegos') || '').split(',').map((x) => x.trim()).filter(Boolean), p_descripcion: d.get('desc') });
      if (error) throw error; toast('Solicitud enviada al staff.', 'ok');
    } else {
      const { error } = await supabase.rpc('creador_en_vivo', { p_en_vivo: !mio.en_vivo, p_titulo: d.get('t'), p_enlace: String(d.get('u') || '').trim() || null });
      if (error) throw error; toast(mio.en_vivo ? 'Directo terminado.' : '¡Estás en vivo!', 'ok');
    }
    await cargarMio(); cargar();
  } catch (e) { toast(e.message, 'error'); }
});
$('cr-yo').addEventListener('click', () => { $('cr-panel').hidden = !$('cr-panel').hidden; });

async function cargarMio() {
  const { data } = await supabase.from('creadores').select('*').eq('usuario', yo).maybeSingle();
  mio = data; panel();
  $('cr-yo').querySelector('span').textContent = mio?.verificado ? (mio.en_vivo ? 'En vivo ahora' : 'Mi directo') : mio ? 'Mi solicitud' : 'Quiero ser creador';
}
onSession((st) => { yo = st?.session?.user?.id ?? null; $('cr-yo').hidden = !yo; if (yo) cargarMio(); });
cargar(); setInterval(() => { if (!document.hidden) cargar(); }, 60_000);
