// Modal de perfil con 4 pestañas (Identidad / Social / Sistema Host / Phoenix Soda) sobre la tabla `perfiles`.
// Identidad = foto + apodo (nombre visible) + @usuario (único y público, como en TikTok).
import { supabase } from '../core/sistema/supabase.js';
import { getState, refreshProfile } from '../core/sistema/session.js';
import { openModal, closeModal } from '../core/sistema/modal.js';
import { escapeHTML, safeUrl, toUsername } from '../core/sistema/dom.js';
import { cooldownInfo, USERNAME_COOLDOWN_DAYS, SPEED_BUCKETS, speedBucket } from '../core/sistema/rules.js';
import { href } from '../core/sistema/config.js';
import { PAISES } from '../../data/paises.js';
import { avatarPickerHTML, bindAvatarPicker, resolveAvatar, identityError } from './avatarPicker.js';
import { toast } from '../core/sistema/toast.js';
import { switchHTML, segHTML, bindSeg } from './formControls.js';
import { bindHandle } from './handleCheck.js';
import { montarEditorJuegos } from './hosting/editorJuegos.js';
import { montarVincularPC } from './salas/vincularPC.js';
import { NOMBRE_APP } from '../../data/site.js';
import { catalogoDe } from '../core/competicion/hostCatalogo.js';
import { guardarHost } from './muro/api.js';
import { FX } from '../../data/experimento.js';

const PLATAFORMAS = ['Ambos', 'Smash Soda', 'Parsec'];

export function openProfileModal() {
  const { session, profile: p } = getState();
  if (!session) return;
  const prof = p ?? {};
  const uid = session.user.id;
  const cd = cooldownInfo(prof);
  const fechaCd = cd.until?.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  // Estado local del formulario (se guarda todo junto al pulsar "Guardar").
  let speed = speedBucket(prof.ancho_banda_mbps);
  let soft = PLATAFORMAS.includes(prof.software_host) ? prof.software_host : 'Ambos';

  // FX.perfilNuevo (ronda 249): mismas 4 pestañas y mismos campos que puso Fralex, mejor ordenados:
  // cabecera fija (título + pestañas cápsula) · tarjeta con foto, apodo y @usuario en vivo · campos en pares · bloques con título · «Guardar» fijo abajo.
  const N = FX.perfilNuevo;
  const TABS = [['identidad', 'Identidad', 'fa-id-card'], ['social', 'Social', 'fa-comments'], ['host', 'Sistema Host', 'fa-server'], ['soda', NOMBRE_APP, 'fa-desktop']];
  const tabsHTML = N
    ? `<div role="tablist" aria-label="Secciones del perfil" class="pilar-tabs-lista pf2-tabs">${TABS.map(([k, l, ic], i) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}"><i class="fa-solid ${ic}"></i>${escapeHTML(l)}</button>`).join('')}</div>`
    : `<div role="tablist" class="flex gap-1 border-b border-galaxy-border font-display text-sm uppercase tracking-wider">${TABS.map(([k, l], i) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}" class="px-3 py-2 text-gray-400 aria-selected:text-galaxy-400 aria-selected:border-b-2 aria-selected:border-galaxy-400">${escapeHTML(l)}</button>`).join('')}</div>`;
  const yo = N ? `<p class="pf2-yo"><b id="pf2-nom">${escapeHTML(prof.nombre_display || 'Tu apodo')}</b><span id="pf2-arroba">@${escapeHTML(prof.username || 'usuario')}</span></p>` : '';
  const bloque = (titulo, cuerpo) => N ? `<fieldset class="pf2-bloque"><legend>${titulo}</legend>${cuerpo}</fieldset>` : cuerpo;
  const par = (a, b) => N ? `<div class="pf2-par">${a}${b}</div>` : a + b;

  const fNombre = `<div><label class="label" for="p-name">Apodo (nombre visible)</label><input id="p-name" class="field" maxlength="30" value="${escapeHTML(prof.nombre_display)}"><p class="text-[12px] text-gray-500 mt-1">Es como te ven en tus partidos. Puedes poner lo que quieras.</p></div>`;
  const fUser = `<div>
          <label class="label" for="p-user">Usuario único</label>
          <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-display font-bold">@</span><input id="p-user" class="field !pl-7" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHTML(prof.username)}" ${cd.blocked ? 'disabled' : ''}></div>
          <p id="p-user-st" class="text-[12px] mt-1 min-h-4"></p>
          ${cd.blocked ? '' : prof.perfil_completo ? `<p class="text-[12px] text-gray-500">Ojo: después de cambiarlo, no podrás volver a hacerlo hasta pasados ${USERNAME_COOLDOWN_DAYS} días.</p>` : ''}
        </div>`;
  const fPais = `<div><label class="label" for="p-pais">País</label><select id="p-pais" class="field">${PAISES.map(([c, n]) => `<option value="${c}" ${c === (prof.pais_codigo || 'PE') ? 'selected' : ''}>${escapeHTML(n)}</option>`).join('')}</select></div>`;
  const avisoMenor = '<p class="text-[12px] text-gray-500 mt-1">Por privacidad, si eres menor de 18 años no guardamos ni mostramos tu país ni tu club.</p>';
  const fClub = `<div><label class="label" for="p-club">Club favorito</label><input id="p-club" class="field uppercase" maxlength="60" value="${escapeHTML(prof.club_favorito)}">${N ? '' : avisoMenor}</div>`;
  const ico = (i, campo) => N ? `<div class="pf2-ico"><i class="${i}" aria-hidden="true"></i>${campo}</div>` : campo;
  const fBio = N
    ? `<div><label class="label" for="p-bio">Biografía</label><p class="text-[12px] text-gray-500 -mt-1 mb-2">Una frase sobre ti como jugador. Sale en tu perfil para que te conozcan.</p><textarea id="p-bio" class="field" rows="2" maxlength="280" placeholder="Ej.: Juego 4-3-3 con presión alta. Hincha del Barça. Busco rivales de noche.">${escapeHTML(prof.bio)}</textarea><p class="pf2-cuenta"><span id="pf2-bio-n">${(prof.bio ?? '').length}</span>/280</p></div>`
    : `<div><label class="label" for="p-bio">Biografía táctica</label><textarea id="p-bio" class="field" rows="3" maxlength="280">${escapeHTML(prof.bio)}</textarea></div>`;
  const fDisc = `<div><label class="label" for="p-disc">Discord</label>${ico('fa-brands fa-discord', `<input id="p-disc" class="field" maxlength="40" value="${escapeHTML(prof.discord_tag)}">`)}</div>`;
  const fStream = `<div><label class="label" for="p-stream">Enlace de stream (https://…)</label>${ico('fa-solid fa-tower-broadcast', `<input id="p-stream" class="field" maxlength="200" value="${escapeHTML(prof.stream_url)}">`)}</div>`;
  const fSpeed = `<div>
            <span class="label">Velocidad de subida (Mbps)</span>
            <div class="seg" id="p-speed" role="group" aria-label="Velocidad de subida en Mbps">
              ${SPEED_BUCKETS.map((b) => `<button type="button" data-v="${b.v}" aria-pressed="${b.v === speed}">${b.label}</button>`).join('')}
            </div>
          </div>`;
  const fSoft = `<div><span class="label">Plataforma</span>${segHTML({ id: 'p-soft', options: PLATAFORMAS.map((v) => ({ v, label: v })), current: soft, label: 'Plataforma' })}</div>`;
  const fJuegos = `<div><p class="label">Juegos y parches que hosteas <span class="text-gray-500 normal-case">(puedes elegir varios)</span></p><div id="p-hjuegos" class="space-y-2"></div></div>`;
  const fNotas = `<div><label class="label" for="p-hnotas">Aclaraciones sobre tu host <span class="text-gray-500 normal-case">(opcional)</span></label><textarea id="p-hnotas" class="field" rows="3" maxlength="300" placeholder="Horarios, ping, reglas de tu sala…">${escapeHTML(prof.host_notas)}</textarea></div>`;

  // Sistema Host en 2 tarjetas plegables (solo una abierta a la vez): de primera solo se ve el resumen de cada una.
  const plieg = (ic, t, idRes, cuerpo) => `<details name="pf2-host" class="pf2-plieg"><summary><span class="pf2-plieg-t"><i class="fa-solid ${ic}"></i><b>${t}</b></span><span class="pf2-resumen" id="${idRes}"></span><i class="fa-solid fa-chevron-down pf2-flecha"></i></summary><div class="pf2-plieg-c">${cuerpo}</div></details>`;

  const m = openModal(`
    <form id="prof-form" class="${N ? 'pf2' : 'p-6 space-y-5'}" data-pf-tab="identidad" novalidate>
      ${N ? '<div class="pf2-cabeza">' : ''}
      <div class="flex justify-between items-center">
        <h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest">Mi perfil</h2>
        <button type="button" data-close aria-label="Cerrar" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
      </div>
      ${N ? `${tabsHTML}</div><div class="pf2-cuerpo"><div class="pf2-tarjeta">${avatarPickerHTML({ avatarUrl: prof.avatar_url, name: prof.nombre_display, user: session.user, cabecera: yo })}</div>`
          : `${avatarPickerHTML({ avatarUrl: prof.avatar_url, name: prof.nombre_display, user: session.user })}${tabsHTML}`}

      <div data-pane="identidad" role="tabpanel" class="space-y-4">
        ${bloque('Cómo te ven', par(fNombre, fUser))}
        ${bloque('De dónde eres', par(fPais, fClub) + (N ? avisoMenor : ''))}
      </div>

      <div data-pane="social" role="tabpanel" hidden class="space-y-4">
        ${bloque('Sobre ti', fBio)}
        ${bloque('Dónde encontrarte', par(fDisc, fStream))}
      </div>

      <div data-pane="soda" role="tabpanel" hidden class="space-y-3">
        ${N ? `<p class="pf2-aviso"><i class="fa-solid fa-desktop text-galaxy-400 mr-1.5"></i><b>${NOMBRE_APP}</b> es la app que conecta tu PC con la web: así puedes abrir salas de partido desde aquí.</p>`
            : `<p class="text-xs text-gray-300"><i class="fa-solid fa-desktop text-galaxy-400 mr-1.5"></i><b>Vincular ${NOMBRE_APP}</b>: genera un código de 6 dígitos (vale 10 minutos y un solo uso) y escríbelo en la app para que tu PC pueda abrir salas.</p>`}
        <div id="p-soda" class="text-sm text-gray-300">Cargando…</div>
      </div>
      <div data-pane="host" role="tabpanel" hidden class="space-y-4">
        ${switchHTML({ id: 'p-host', checked: !!prof.puede_hostear, title: 'Puedo ser host', hint: 'Te avisamos cuando alguien necesite que le hosteen una partida.' })}
        ${N ? `<p id="pf2-host-off" class="pf2-apagado">Activa «Puedo ser host» para elegir tu conexión y lo que hosteas.</p>
        <div id="host-fields" class="pf2-acordeon">
          ${plieg('fa-gauge-high', 'Tu conexión', 'pf2-res-con', fSpeed + fSoft)}
          ${plieg('fa-gamepad', 'Qué hosteas', 'pf2-res-jue', fJuegos + fNotas)}
        </div>` : `<div id="host-fields" class="space-y-4">${fSpeed}${fSoft}${fJuegos}${fNotas}</div>`}
      </div>
      ${N ? '</div><div class="pf2-pie">' : ''}
      <p id="p-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button class="btn btn-primary w-full" type="submit">Guardar cambios</button>
      ${N ? '</div>' : ''}
    </form>`, { id: 'profile-modal', wide: N });

  const $ = (s) => m.querySelector(s);
  const err = $('#p-err');
  const picker = bindAvatarPicker(m, { user: session.user, getName: () => $('#p-name').value || prof.nombre_display, onError: (t) => { err.textContent = t; }, currentUrl: prof.avatar_url });
  $('#p-name').addEventListener('input', () => { picker.repaint(); if ($('#pf2-nom')) $('#pf2-nom').textContent = $('#p-name').value.trim() || 'Tu apodo'; });
  $('#p-user').addEventListener('input', () => { if ($('#pf2-arroba')) $('#pf2-arroba').textContent = `@${toUsername($('#p-user').value) || 'usuario'}`; });
  $('#p-bio').addEventListener('input', () => { if ($('#pf2-bio-n')) $('#pf2-bio-n').textContent = String($('#p-bio').value.length); });

  /* ---- Pestañas ---- */
  m.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    m.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    m.querySelectorAll('[data-pane]').forEach((x) => { x.hidden = x.dataset.pane !== b.dataset.tab; });
    if (N) { $('#prof-form').dataset.pfTab = b.dataset.tab; m.querySelector('.modal-card')?.scrollTo({ top: 0 }); }
  }));

  /* ---- @usuario con verificación en vivo ---- */
  let handle = null;
  if (cd.blocked) { $('#p-user-st').className = 'text-[12px] mt-1 text-warn'; $('#p-user-st').innerHTML = `<i class="fa-solid fa-lock mr-1"></i>Podrás cambiarlo de nuevo el ${escapeHTML(fechaCd)}.`; }
  else handle = bindHandle($('#p-user'), $('#p-user-st'), { exceptId: uid });

  /* ---- Host: interruptor + selectores segmentados ---- */
  const hostFields = $('#host-fields');
  const syncHost = N
    ? () => { const on = $('#p-host').checked; hostFields.hidden = !on; $('#pf2-host-off').hidden = on; }
    : () => { hostFields.style.opacity = $('#p-host').checked ? '1' : '.4'; hostFields.inert = !$('#p-host').checked; };
  syncHost(); $('#p-host').addEventListener('change', syncHost);
  const juegos = montarEditorJuegos($('#p-hjuegos'), catalogoDe(prof));
  montarVincularPC($('#p-soda'), { esHost: !!prof.host_aprobado || ['ayudante', 'moderador', 'admin'].includes(prof.rol), pasos: N });
  // Resúmenes de las tarjetas plegables de Sistema Host (se actualizan al cambiar algo)
  const resumir = () => {
    if (!N) return;
    const vel = SPEED_BUCKETS.find((x) => x.v === speed)?.label ?? '';
    $('#pf2-res-con').textContent = `${vel} Mbps · ${soft}`;
    const cat = juegos.get();
    $('#pf2-res-jue').textContent = cat.length ? cat.map((e) => e.opciones.length ? `${e.juego} (${e.opciones.length})` : e.juego).join(' · ') : 'Ninguno aún';
  };
  bindSeg($('#p-speed'), (v) => { speed = Number(v); resumir(); });
  bindSeg($('#p-soft'), (v) => { soft = v; resumir(); });
  $('#p-hjuegos').addEventListener('click', () => setTimeout(resumir, 0));
  resumir();

  /* ---- Guardar ---- */
  $('#prof-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const btn = ev.target.querySelector('button[type=submit]');
    const username = toUsername($('#p-user').value);
    const nombre = $('#p-name').value.trim().replace(/[<>]/g, '');
    const stream = $('#p-stream').value.trim();
    if (!cd.blocked && username.length < 3) { err.textContent = 'Tu usuario debe tener al menos 3 caracteres (a-z, 0-9 y _).'; return; }
    if (!nombre) { err.textContent = 'Escribe tu apodo.'; return; }
    if (stream && !safeUrl(stream)) { err.textContent = 'El enlace de stream debe empezar con https://'; return; }

    btn.disabled = true;
    try {
      const cambia = !cd.blocked && username !== prof.username;
      const estado = cambia ? await handle.comprobar() : 'libre';
      if (estado === 'ocupado') { err.textContent = 'Ese usuario ya está en uso. Elige otro.'; return; }
      if (estado === 'reservado') { err.textContent = 'Ese usuario está reservado. Elige otro.'; return; }
      const patch = {
        nombre_display: nombre, pais_codigo: $('#p-pais').value,
        club_favorito: $('#p-club').value.trim().replace(/[<>]/g, '').toUpperCase(),
        bio: $('#p-bio').value.trim(), discord_tag: $('#p-disc').value.trim(), stream_url: stream,
        puede_hostear: $('#p-host').checked, ancho_banda_mbps: speed,
        software_host: soft,
        host_notas: $('#p-hnotas').value.trim().replace(/[<>]/g, ''),
      };
      if (cambia) patch.username = username;
      const nuevaFoto = await resolveAvatar(picker.get(), uid);
      if (nuevaFoto !== undefined) patch.avatar_url = nuevaFoto;
      const { error } = await supabase.from('perfiles').update(patch).eq('id', uid);
      if (error) throw error;
      await guardarHost(soft, juegos.get(), prof.host_visible !== false);
      await refreshProfile();
      closeModal('profile-modal');
      toast('Perfil actualizado.', 'ok');
    } catch (ex) {
      console.error('[perfil] guardar:', ex);
      err.textContent = identityError(ex);
    } finally { btn.disabled = false; }
  });
}
