// Modal para crear/editar una ficha de jugador (solo admin; la BD lo refuerza con RLS).
// Cada estadística es una «ficha» con − / + (mantén pulsado para repetir), deslizador y número en color.
// La media (OVR) se calcula sola mientras no la toques; si la mueves queda manual hasta «Volver a automático».
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, safeImg, statColor } from '../core/dom.js';
import { cropSquareJpeg } from '../core/image.js';
import { clampStat, calcOvr } from '../core/stats.js';
import { toast } from '../core/toast.js';
import { STAT_INFO } from '../../data/stats.js';
import { POSICIONES, posInfo } from '../../data/posiciones.js';
import { STAT_KEYS } from './playerCard.js';

const LEYENDA_VACIA = 'Toca o desliza una estadística y aquí te explicamos qué significa.';

const tileHTML = (k, v, { grande = false, extra = '' } = {}) => {
  const nom = escapeHTML(STAT_INFO[k].nombre);
  const titulo = grande
    ? `<div class="min-w-0"><b class="font-display text-xs uppercase tracking-wider text-white">OVR</b><span class="block text-[10px] text-gray-500 leading-tight truncate">${nom}</span></div>`
    : `<div class="min-w-0 flex items-baseline gap-1.5"><b class="font-display text-xs uppercase tracking-wider text-white">${k}</b><span class="text-[10px] text-gray-500 truncate">${nom}</span></div>`;
  const menos = `<button type="button" class="step" data-d="-1" aria-label="Bajar ${nom}">−</button>`;
  const mas = `<button type="button" class="step" data-d="1" aria-label="Subir ${nom}">+</button>`;
  const num = (cls) => `<output class="stat-val font-display font-extrabold ${cls} text-center" aria-live="off">${v}</output>`;
  const rango = `<input type="range" class="stat-range" min="1" max="99" step="1" value="${v}" aria-label="${nom}">`;
  // Grande (OVR): número arriba y deslizador debajo. Normal (celda de 2 columnas): nombre + número arriba, «− deslizador +» abajo.
  return grande
    ? `<div class="stat-tile stat-tile-lg" data-k="${k}"><div class="flex items-center justify-between gap-2">${titulo}<div class="flex items-center gap-1 shrink-0">${menos}${num('text-3xl w-12')}${mas}</div></div>${rango}${extra}</div>`
    : `<div class="stat-tile stat-cell" data-k="${k}"><div class="flex items-center justify-between gap-1">${titulo}${num('text-lg')}</div><div class="flex items-center gap-1.5 mt-1">${menos}${rango}${mas}</div></div>`;
};

export function openPlayerForm(player = null, onSaved = () => {}) {
  const p = player ?? {};
  let photo = null;
  const vals = Object.fromEntries(STAT_KEYS.map((k) => [k, clampStat(p[k])]));
  const media = () => calcOvr(STAT_KEYS.map((k) => vals[k]));
  // Si la ficha ya tenía una media distinta del promedio, se respeta como manual.
  let manual = p.ovr != null && clampStat(p.ovr) !== media();
  vals.ovr = manual ? clampStat(p.ovr) : media();
  const foto0 = safeImg(p.foto_url) || safeImg(p.foto);

  const m = openModal(`
    <form id="pf" class="p-5 sm:p-6 space-y-4" novalidate>
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">${player ? 'Editar' : 'Añadir'} jugador</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>

      <div class="flex items-start gap-4">
        <div class="flex-1 min-w-0 space-y-3">
          <div><label class="label" for="f-nombre">Nombre</label><input id="f-nombre" class="field" maxlength="40" value="${escapeHTML(p.nombre)}"></div>
          <div><label class="label" for="f-club">Club</label><input id="f-club" class="field" maxlength="60" value="${escapeHTML(p.club ?? 'Agente Libre')}"></div>
        </div>
        <label class="photo-pick" title="Foto (opcional)">
          <span id="f-prev" class="block w-full h-full">${foto0 ? `<img src="${escapeHTML(foto0)}" alt="" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user-astronaut text-3xl text-galaxy-400/70"></i>'}</span>
          <span class="photo-pick-badge"><i class="fa-solid fa-camera"></i></span>
          <input id="f-foto" type="file" accept="image/*" hidden>
        </label>
      </div>

      <div>
        <span class="label">Posición</span>
        <div id="f-pos" class="grid grid-cols-6 gap-1.5" role="group" aria-label="Posición">
          ${POSICIONES.map((x) => { const i = posInfo(x.cod); return `<button type="button" class="chip pos-chip !px-0" data-pos="${x.cod}" style="--pc:${i.color}" title="${escapeHTML(i.nombre)}" aria-label="${escapeHTML(i.nombre)}" aria-pressed="${x.cod === (p.posicion ?? 'DC')}">${x.cod}</button>`; }).join('')}
        </div>
        <p id="pos-cap" class="text-[12px] mt-1.5 min-h-5" aria-live="polite"></p>
      </div>

      ${tileHTML('ovr', vals.ovr, { grande: true, extra: `<div class="flex items-center justify-between mt-2"><span id="ovr-modo" class="text-[11px] font-display font-bold uppercase tracking-wider"></span><button type="button" id="ovr-auto" class="text-[11px] text-galaxy-400 hover:text-white font-bold uppercase" hidden>Volver a automático</button></div>` })}

      <div class="sticky top-0 z-10 bg-galaxy-panel/95 backdrop-blur pb-1 -mx-1 px-1">
        <div class="flex items-center justify-between mb-1">
          <span class="label !mb-0">Leyenda</span>
          <button type="button" id="ley-toggle" class="text-[11px] text-galaxy-400 hover:text-white font-bold uppercase" aria-expanded="false" aria-controls="ley-full"><i class="fa-solid fa-list-ul mr-1"></i><span>Ver completa</span></button>
        </div>
        <div id="leyenda" class="rounded-lg border border-galaxy-border bg-galaxy-panel px-3 py-2 text-[13px] leading-snug text-gray-300 h-[6rem] sm:h-[4.75rem] overflow-y-auto" aria-live="polite">${LEYENDA_VACIA}</div>
      </div>
      <div id="ley-full" hidden class="rounded-lg border border-galaxy-border bg-black/30 divide-y divide-galaxy-border/60 max-h-72 overflow-y-auto">
        ${[...STAT_KEYS, 'ovr'].map((k) => `<button type="button" data-ley="${k}" class="w-full text-left px-3 py-2 hover:bg-white/5"><b class="font-display text-xs uppercase tracking-wider text-galaxy-400">${k === 'ovr' ? 'OVR' : k} · ${escapeHTML(STAT_INFO[k].nombre)}</b><span class="block text-[12px] text-gray-400 leading-snug">${escapeHTML(STAT_INFO[k].texto)}</span></button>`).join('')}
      </div>

      <div class="grid grid-cols-2 gap-2">
        ${STAT_KEYS.map((k) => tileHTML(k, vals[k])).join('')}
      </div>

      <div><label class="label" for="f-quote">Frase <span class="text-gray-500 normal-case">(opcional)</span></label><input id="f-quote" class="field" maxlength="140" placeholder="Una frase que lo represente" value="${escapeHTML(p.quote)}"></div>
      <div>
        <label class="label" for="f-desc">Descripción del jugador <span class="text-gray-500 normal-case">(opcional)</span></label>
        <textarea id="f-desc" class="field" rows="4" maxlength="600" placeholder="Su táctica, estrategia, estilo de juego, cómo ataca y defiende…">${escapeHTML(p.descripcion)}</textarea>
        <p class="text-[11px] text-gray-500 mt-1 text-right"><span id="f-desc-n">0</span>/600</p>
      </div>
      <p id="f-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar ficha</button>
    </form>`, { id: 'player-modal', wide: true });

  const $ = (s) => m.querySelector(s);
  const err = $('#f-err');
  const tile = (k) => m.querySelector(`.stat-tile[data-k="${k}"]`);

  /* ---- Pintado de una ficha: número, color y relleno del deslizador ---- */
  const paint = (k) => {
    const t = tile(k); const v = vals[k]; const c = statColor(v);
    const out = t.querySelector('.stat-val'); out.textContent = v; out.style.color = c;
    const r = t.querySelector('.stat-range'); r.value = v; r.style.setProperty('--p', `${((v - 1) / 98) * 100}%`); r.style.setProperty('--c', c);
  };
  const paintModo = () => {
    const el = $('#ovr-modo'); el.textContent = manual ? 'Manual' : 'Automático · promedio de las 14';
    el.className = `text-[11px] font-display font-bold uppercase tracking-wider ${manual ? 'text-warn' : 'text-ok'}`;
    $('#ovr-auto').hidden = !manual;
  };
  const set = (k, v) => {
    vals[k] = clampStat(v, vals[k]);
    if (k === 'ovr') manual = true;
    else if (!manual) { vals.ovr = media(); paint('ovr'); }
    paint(k); paintModo();
  };
  const leyenda = (k) => { $('#leyenda').innerHTML = `<b class="text-galaxy-400 font-display uppercase tracking-wider">${k === 'ovr' ? 'OVR' : k} · ${escapeHTML(STAT_INFO[k].nombre)}</b> — ${escapeHTML(STAT_INFO[k].texto)}`; };
  const activa = (k) => { m.querySelectorAll('.stat-tile').forEach((t) => t.classList.toggle('stat-tile-on', t.dataset.k === k)); leyenda(k); };
  [...STAT_KEYS, 'ovr'].forEach(paint); paintModo();

  /* ---- Interacción: − / + (con repetición al mantener), deslizador, leyenda ---- */
  let rep = null; const parar = () => { clearTimeout(rep); clearInterval(rep); rep = null; };
  m.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.step'); if (!b) return;
    const k = b.closest('.stat-tile').dataset.k; const d = Number(b.dataset.d);
    activa(k); set(k, vals[k] + d);
    parar(); rep = setTimeout(() => { rep = setInterval(() => set(k, vals[k] + d), 70); }, 380);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => m.addEventListener(ev, parar));
  m.addEventListener('click', (e) => { const b = e.target.closest('.step'); if (b && e.detail === 0) set(b.closest('.stat-tile').dataset.k, vals[b.closest('.stat-tile').dataset.k] + Number(b.dataset.d)); }); // teclado
  m.addEventListener('input', (e) => { const r = e.target.closest('.stat-range'); if (r) { const k = r.closest('.stat-tile').dataset.k; activa(k); set(k, r.value); } });
  m.querySelectorAll('.stat-tile').forEach((t) => {
    t.addEventListener('pointerenter', () => { if (!t.matches(':focus-within')) leyenda(t.dataset.k); });
    t.addEventListener('pointerdown', () => activa(t.dataset.k));
    t.addEventListener('focusin', () => activa(t.dataset.k));
  });
  $('#ovr-auto').addEventListener('click', () => { manual = false; vals.ovr = media(); paint('ovr'); paintModo(); });

  /* ---- Leyenda completa (lista de las 14 + OVR) ---- */
  $('#ley-toggle').addEventListener('click', () => {
    const f = $('#ley-full'); f.hidden = !f.hidden;
    $('#ley-toggle').setAttribute('aria-expanded', String(!f.hidden)); $('#ley-toggle span').textContent = f.hidden ? 'Ver completa' : 'Ocultar';
  });
  $('#ley-full').addEventListener('click', (e) => {
    const k = e.target.closest('[data-ley]')?.dataset.ley; if (!k) return;
    activa(k); tile(k).scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  const contar = () => { $('#f-desc-n').textContent = $('#f-desc').value.length; };
  $('#f-desc').addEventListener('input', contar); contar();

  /* ---- Posición ---- */
  // La línea de abajo dice el nombre completo: al pasar el mouse (PC) o al tocar/elegir (celular); en reposo muestra la elegida.
  const capPos = (cod) => { const i = posInfo(cod); $('#pos-cap').innerHTML = `<b style="color:${i.color}">${escapeHTML(i.cod)}</b> · ${escapeHTML(i.nombre)} <span class="text-gray-500">· ${escapeHTML(i.grupoNombre)}</span>`; };
  const elegida = () => $('#f-pos [aria-pressed=true]')?.dataset.pos ?? 'DC';
  $('#f-pos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pos]'); if (!b) return;
    m.querySelectorAll('[data-pos]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); capPos(b.dataset.pos);
  });
  $('#f-pos').addEventListener('pointerover', (e) => { const b = e.target.closest('[data-pos]'); if (b && e.pointerType === 'mouse') capPos(b.dataset.pos); });
  $('#f-pos').addEventListener('pointerleave', () => capPos(elegida()));
  $('#f-pos').addEventListener('focusin', (e) => { const b = e.target.closest('[data-pos]'); if (b) capPos(b.dataset.pos); });
  capPos(elegida());

  /* ---- Foto ---- */
  $('#f-foto').addEventListener('change', async (e) => {
    try {
      photo = await cropSquareJpeg(e.target.files[0], 256, 0.82);
      $('#f-prev').innerHTML = `<img src="${URL.createObjectURL(photo)}" alt="" class="w-full h-full object-cover">`;
    } catch (ex) { err.textContent = ex.message; photo = null; }
  });

  /* ---- Guardar ---- */
  $('#pf').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const nombre = $('#f-nombre').value.trim().replace(/[<>]/g, '');
    if (!nombre) { err.textContent = 'Escribe el nombre.'; return; }
    const row = {
      nombre, club: $('#f-club').value.trim().replace(/[<>]/g, '') || 'Agente Libre',
      posicion: $('#f-pos [aria-pressed=true]')?.dataset.pos ?? 'DC', quote: $('#f-quote').value.trim(), descripcion: $('#f-desc').value.trim().replace(/[<>]/g, '') || null,
      ovr: vals.ovr,
    };
    STAT_KEYS.forEach((k) => { row[k] = vals[k]; });
    btn.disabled = true;
    try {
      const id = player?.id ?? crypto.randomUUID();
      if (photo) {
        const path = `${id}.jpg`;
        const up = await supabase.storage.from('fichas').upload(path, photo, { upsert: true, contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        row.foto_url = `${supabase.storage.from('fichas').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const q = player ? supabase.from('jugadores').update(row).eq('id', id) : supabase.from('jugadores').insert({ id, ...row });
      const { error } = await q;
      if (error) throw error;
      closeModal('player-modal'); toast('Ficha guardada.', 'ok'); onSaved();
    } catch (ex) {
      console.error('[ficha] guardar:', ex);
      err.textContent = /row-level security|policy/i.test(ex.message) ? 'No tienes permiso (solo administradores).' : ex.message;
    } finally { btn.disabled = false; }
  });
}
