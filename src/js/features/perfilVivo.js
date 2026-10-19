// «MI PERFIL» VIVO (19-oct-2026, Fralex: «dinamismo, estética, visualidad, premium… ajustes del perfil»). Lo monta features/profile.js
// dentro de su ventana (FX.perfilNuevo). No guarda nada por su cuenta: solo hace visible lo que escribes y te ayuda a llenarlo.
//   · «Así te ven»: tarjeta con tu foto, apodo, @usuario, país, club (con escudo), biografía y redes, que cambia mientras escribes.
//   · Medidor «Perfil al N %» (anillo animado) + lo que falta, en botones que te llevan a ese campo.
//   · País en insignias para tocar (sin menú desplegable; el <select> original sigue para guardar).
//   · Club favorito con sugerencias del catálogo y su escudo.
//   · El botón dice cuántos cambios vas a guardar.
import { escapeHTML, toUsername } from '../core/sistema/dom.js';
import { PAISES } from '../../data/paises.js';
import { buscarClubes, clubExacto, escudoUrl } from '../core/pes/clubesPes.js';

const nombrePais = (c) => PAISES.find(([k]) => k === c)?.[1] ?? '';
const CAMPOS = [
  ['foto', 'Foto', 'identidad', '#p-file'], ['apodo', 'Apodo', 'identidad', '#p-name'], ['usuario', '@usuario', 'identidad', '#p-user'],
  ['pais', 'País', 'identidad', '#pf3-paises button'], ['club', 'Club favorito', 'identidad', '#p-club'],
  ['bio', 'Biografía', 'social', '#p-bio'], ['redes', 'Discord o stream', 'social', '#p-disc'],
];

/** @param {HTMLElement} m ventana del perfil · @param {{ prof: object }} op */
export function montarPerfilVivo(m, { prof }) {
  const $ = (s) => m.querySelector(s);
  const vivo = $('#pf3-vivo'); const sel = $('#p-pais'); if (!vivo || !sel) return { cambios: () => 0, pintar: () => {} };

  // ── Tarjeta «Así te ven» + medidor ──
  vivo.innerHTML = `<div class="pf3-medidor">
      <span class="pf3-anillo" aria-hidden="true"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="pf3-anillo-f"/><circle cx="22" cy="22" r="19" class="pf3-anillo-v" id="pf3-anillo-v"/></svg><b id="pf3-pct">0%</b></span>
      <div class="min-w-0"><p class="pf3-medidor-t" id="pf3-medidor-t">Tu perfil</p><div class="pf3-faltan" id="pf3-faltan"></div></div></div>
    <article class="pf3-carnet" aria-label="Así te ven los demás">
      <div class="pf3-carnet-banda" aria-hidden="true"></div>
      <span class="pf3-carnet-av" id="pf3-av" aria-hidden="true"></span>
      <div class="pf3-carnet-cuerpo">
        <p class="pf3-carnet-tag">Así te ven</p>
        <b class="pf3-carnet-nom" id="pf3-nom"></b><span class="pf3-carnet-user" id="pf3-user"></span>
        <div class="pf3-carnet-chips" id="pf3-chips"></div>
        <p class="pf3-carnet-bio" id="pf3-bio"></p>
      </div>
    </article>`;

  // ── País en insignias ──
  sel.classList.add('pf3-oculto'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
  const caja = document.createElement('div'); caja.className = 'pf3-paises'; caja.id = 'pf3-paises'; caja.setAttribute('role', 'radiogroup'); caja.setAttribute('aria-label', 'País');
  const VISIBLES = 9;   // los demás aparecen con «+N países» (en el celular 23 insignias ocupaban media pantalla)
  caja.innerHTML = PAISES.map(([c, n], i) => `<button type="button" role="radio" data-pais="${c}" aria-checked="${c === sel.value}"${i >= VISIBLES && c !== sel.value ? ' data-extra hidden' : ''}><span class="pf3-cod">${c}</span>${escapeHTML(n)}</button>`).join('')
    + `<button type="button" class="pf3-mas-paises" data-pf3-mas>+${PAISES.length - VISIBLES} países</button>`;
  sel.after(caja);
  caja.addEventListener('click', (e) => {
    if (e.target.closest('[data-pf3-mas]')) { caja.querySelectorAll('[data-extra]').forEach((x) => { x.hidden = false; }); e.target.closest('[data-pf3-mas]').remove(); return; }
    const b = e.target.closest('[data-pais]'); if (!b) return;
    sel.value = b.dataset.pais; sel.dispatchEvent(new Event('change', { bubbles: true }));
    caja.querySelectorAll('[data-pais]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); pintar();
  });

  // ── Club favorito con escudos ──
  const club = $('#p-club'); const sug = document.createElement('div'); sug.className = 'pf3-clubes'; sug.hidden = true; sug.setAttribute('role', 'listbox');
  club.parentElement.classList.add('pf3-club-campo'); club.after(sug); club.setAttribute('autocomplete', 'off');
  const pintarSug = () => {
    const t = club.value.trim(); const lista = t.length >= 2 && !clubExacto(t) ? buscarClubes(t, { max: 6 }) : [];
    sug.hidden = !lista.length;
    sug.innerHTML = lista.map((c) => `<button type="button" role="option" data-club="${escapeHTML(c.nombre)}"><img src="${escapeHTML(escudoUrl(c))}" alt="" width="26" height="26" loading="lazy"><span>${escapeHTML(c.nombre)}</span><small>${escapeHTML(c.liga ?? '')}</small></button>`).join('');
  };
  club.addEventListener('input', pintarSug); club.addEventListener('focus', pintarSug);
  club.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
  sug.addEventListener('mousedown', (e) => e.preventDefault());
  sug.addEventListener('click', (e) => { const b = e.target.closest('[data-club]'); if (!b) return; club.value = b.dataset.club.toUpperCase(); sug.hidden = true; club.dispatchEvent(new Event('input', { bubbles: true })); pintar(); });

  // ── Lo que falta: botones que llevan a cada campo ──
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pf3-ir]'); if (!b) return;
    const [, , tab, sel2] = CAMPOS.find(([k]) => k === b.dataset.pf3Ir) ?? [];
    m.querySelector(`[data-tab="${tab}"]`)?.click();
    requestAnimationFrame(() => {
      const el = m.querySelector(sel2); if (!el) return;
      if (el.matches('#p-file')) { el.click(); return; }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (el.matches('input, textarea')) el.focus({ preventScroll: true });
    });
  });

  // ── Estado: qué está completo y qué cambió ──
  const valor = () => ({
    foto: !!$('#p-prev img'), apodo: $('#p-name').value.trim(), usuario: toUsername($('#p-user').value), pais: sel.value, club: club.value.trim(),
    bio: $('#p-bio').value.trim(), disc: $('#p-disc').value.trim(), stream: $('#p-stream').value.trim(),
  });
  const inicial = { ...valor(), hostOn: !!$('#p-host')?.checked };
  const completo = (v) => ({ foto: v.foto, apodo: !!v.apodo, usuario: v.usuario.length >= 3, pais: !!v.pais, club: !!v.club, bio: v.bio.length >= 10, redes: !!(v.disc || v.stream) });
  let fotoCambio = false;
  function cambios() {
    const v = valor(); let n = fotoCambio ? 1 : 0;
    for (const k of ['apodo', 'usuario', 'pais', 'club', 'bio', 'disc', 'stream']) if (v[k] !== inicial[k]) n += 1;
    if (($('#p-host')?.checked ?? false) !== inicial.hostOn) n += 1;
    return n;
  }
  function pintar() {
    const v = valor(); const c = completo(v); const hechos = Object.values(c).filter(Boolean).length; const pct = Math.round((hechos / CAMPOS.length) * 100);
    $('#pf3-pct').textContent = `${pct}%`; $('#pf3-anillo-v').style.strokeDashoffset = String(119.4 * (1 - pct / 100));
    vivo.dataset.nivel = pct === 100 ? 'completo' : pct >= 60 ? 'bien' : 'bajo';
    $('#pf3-medidor-t').innerHTML = pct === 100 ? '<b>¡Perfil completo!</b> Así da gusto conocerte.' : `Perfil al <b>${pct}%</b> · completa lo que falta`;
    $('#pf3-faltan').innerHTML = CAMPOS.filter(([k]) => !c[k]).map(([k, t]) => `<button type="button" data-pf3-ir="${k}"><i class="fa-solid fa-circle-plus" aria-hidden="true"></i>${t}</button>`).join('');
    const img = $('#p-prev img'); $('#pf3-av').innerHTML = img ? `<img src="${escapeHTML(img.getAttribute('src') ?? '')}" alt="">` : `<b>${escapeHTML((v.apodo || '?').charAt(0).toUpperCase())}</b>`;
    $('#pf3-nom').textContent = v.apodo || 'Tu apodo';
    $('#pf3-user').textContent = `@${v.usuario || 'usuario'}`;
    const clubCat = v.club ? clubExacto(v.club) : null;
    $('#pf3-chips').innerHTML = [
      v.pais ? `<span class="pf3-chip"><span class="pf3-cod">${escapeHTML(v.pais)}</span>${escapeHTML(nombrePais(v.pais))}</span>` : '',
      v.club ? `<span class="pf3-chip">${clubCat ? `<img src="${escapeHTML(escudoUrl(clubCat))}" alt="" width="16" height="16">` : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'}${escapeHTML(v.club)}</span>` : '',
      v.disc ? '<span class="pf3-chip"><i class="fa-brands fa-discord" aria-hidden="true"></i>Discord</span>' : '',
      v.stream ? '<span class="pf3-chip"><i class="fa-solid fa-tower-broadcast" aria-hidden="true"></i>En directo</span>' : '',
      $('#p-host')?.checked ? '<span class="pf3-chip pf3-chip-host"><i class="fa-solid fa-server" aria-hidden="true"></i>Host</span>' : '',
    ].join('');
    $('#pf3-bio').textContent = v.bio || 'Tu biografía aparecerá aquí.'; $('#pf3-bio').classList.toggle('vacia', !v.bio);
    const n = cambios(); const btn = m.querySelector('#prof-form button[type=submit]');
    if (btn && !btn.disabled) btn.innerHTML = n ? `<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Guardar ${n} cambio${n === 1 ? '' : 's'}` : 'Sin cambios por guardar';
    btn?.classList.toggle('pf3-sin-cambios', !n);
  }
  m.addEventListener('input', pintar); m.addEventListener('change', pintar);
  const prevEl = $('#p-prev'); if (prevEl) new MutationObserver(() => { fotoCambio = true; pintar(); }).observe(prevEl, { childList: true, subtree: true });
  pintar();
  return { cambios, pintar };
}
