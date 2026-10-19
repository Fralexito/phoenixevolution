// «MI PERFIL» VIVO (19-oct-2026, Fralex: «dinamismo, estética, visualidad, premium… ajustes del perfil»). Lo monta features/profile.js
// dentro de su ventana (FX.perfilNuevo). No guarda nada por su cuenta: solo hace visible lo que escribes y te ayuda a llenarlo.
//   · «Así te ven»: tarjeta con tu foto, apodo, @usuario, país, club (con escudo), biografía y redes, que cambia mientras escribes.
//   · Medidor «Perfil al N %» (anillo animado) + lo que falta, en botones que te llevan a ese campo.
//   · País en una lista desplegable propia con banderas, buscador y teclado (el <select> original sigue, oculto, para guardar).
//   · Club favorito con sugerencias del catálogo y su escudo.
//   · El botón dice cuántos cambios vas a guardar.
import { escapeHTML, toUsername } from '../core/sistema/dom.js';
import { PAISES } from '../../data/paises.js';
import { buscarClubes, clubExacto, escudoUrl } from '../core/pes/clubesPes.js';
import { banderaSVG } from '../../data/banderas.js';

const nombrePais = (c) => PAISES.find(([k]) => k === c)?.[1] ?? '';
const CAMPOS = [
  ['foto', 'Foto', 'identidad', '#p-file'], ['apodo', 'Apodo', 'identidad', '#p-name'], ['usuario', '@usuario', 'identidad', '#p-user'],
  ['pais', 'País', 'identidad', '#pf3-dd-btn'], ['club', 'Club favorito', 'identidad', '#p-club'],
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

  // ── País: lista desplegable con banderas (Fralex: «que los países estén en una lista desplegable con sus banderas») ──
  sel.classList.add('pf3-oculto'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
  const dd = document.createElement('div'); dd.className = 'pf3-dd'; dd.id = 'pf3-paises';
  dd.innerHTML = `<button type="button" class="pf3-dd-btn" id="pf3-dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="País"></button>
    <div class="pf3-dd-menu" hidden>
      <label class="pf3-dd-buscar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" placeholder="Buscar país" aria-label="Buscar país" autocomplete="off"></label>
      <ul role="listbox" aria-label="País">${PAISES.map(([c, n]) => `<li role="option" data-pais="${c}" data-nombre="${escapeHTML(n.toLowerCase())}" tabindex="-1">${banderaSVG(c, 'pf3-flag')}<span>${escapeHTML(n)}</span><i class="fa-solid fa-circle-check pf3-dd-ok" aria-hidden="true"></i></li>`).join('')}</ul>
      <p class="pf3-dd-nada" hidden>No encontramos ese país. Elige «Otro».</p>
    </div>`;
  sel.after(dd);
  const ddBtn = dd.querySelector('.pf3-dd-btn'); const ddMenu = dd.querySelector('.pf3-dd-menu'); const ddBus = dd.querySelector('input'); const ops = [...dd.querySelectorAll('[data-pais]')];
  const pintarBtn = () => { const c = sel.value; ddBtn.innerHTML = `${banderaSVG(c, 'pf3-flag')}<span>${escapeHTML(nombrePais(c) || 'Elige tu país')}</span><i class="pf3-dd-v" aria-hidden="true"></i>`; ops.forEach((o) => o.setAttribute('aria-selected', String(o.dataset.pais === c))); };
  const visibles = () => ops.filter((o) => !o.hidden);
  const abrirDd = (si) => {
    ddMenu.hidden = !si; ddBtn.setAttribute('aria-expanded', String(si)); dd.classList.toggle('abierto', si);
    if (si) { ddBus.value = ''; filtrar(); requestAnimationFrame(() => { (ops.find((o) => o.dataset.pais === sel.value) ?? ops[0])?.scrollIntoView({ block: 'nearest' }); ddBus.focus(); }); }
  };
  const filtrar = () => { const q = ddBus.value.trim().toLowerCase(); ops.forEach((o) => { o.hidden = !!q && !o.dataset.nombre.includes(q) && !o.dataset.pais.toLowerCase().startsWith(q); }); dd.querySelector('.pf3-dd-nada').hidden = visibles().length > 0; };
  const elegir = (o) => { if (!o) return; sel.value = o.dataset.pais; sel.dispatchEvent(new Event('change', { bubbles: true })); pintarBtn(); abrirDd(false); ddBtn.focus(); pintar(); };
  ddBtn.addEventListener('click', () => abrirDd(ddMenu.hidden));
  ddBus.addEventListener('input', filtrar);
  dd.addEventListener('click', (e) => { const o = e.target.closest('[data-pais]'); if (o) elegir(o); });
  dd.addEventListener('keydown', (e) => {
    const v = visibles(); const i0 = v.indexOf(document.activeElement);
    if (e.key === 'Escape' && !ddMenu.hidden) { e.preventDefault(); e.stopPropagation(); abrirDd(false); ddBtn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (ddMenu.hidden) abrirDd(true); else v[Math.min(v.length - 1, i0 + 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i0 <= 0) ddBus.focus(); else v[i0 - 1]?.focus(); }
    else if (e.key === 'Enter' && !ddMenu.hidden) { e.preventDefault(); elegir(i0 >= 0 ? v[i0] : v[0]); }
  });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target) && !ddMenu.hidden) abrirDd(false); });
  pintarBtn();

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
      v.pais ? `<span class="pf3-chip">${banderaSVG(v.pais, 'pf3-flag')}${escapeHTML(nombrePais(v.pais))}</span>` : '',
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
