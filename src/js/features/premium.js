// Toque premium (FX.premium, ronda 255): convierte los avisos sueltos «Inicia sesión para…» de las páginas en una tarjeta
// con candado y dos botones (Entrar · Crear cuenta). No cambia la lógica de cada página: si la página vuelve a escribir el aviso,
// se vuelve a armar. Solo actúa sobre avisos «de bloque» (un panel cuyo único contenido es esa frase), nunca sobre botones ni toasts.
import { FX } from '../../data/experimento.js';
import { escapeHTML } from '../core/sistema/dom.js';

const FRASE = /^Inicia sesión para\s/i;

function armar(el) {
  const texto = el.textContent.trim();
  if (el.dataset.prTexto === texto) return;
  el.dataset.prTexto = texto;
  el.classList.add('pr-acceso');
  el.innerHTML = `<span class="pr-acceso-ico" aria-hidden="true"><i class="fa-solid fa-lock"></i></span>
    <p class="pr-acceso-txt">${escapeHTML(texto)}</p>
    <span class="pr-acceso-btns"><button type="button" class="btn btn-primary" data-pr-auth="login"><i class="fa-solid fa-right-to-bracket"></i> Entrar</button>
    <button type="button" class="btn btn-ghost" data-pr-auth="register"><i class="fa-solid fa-user-plus"></i> Crear cuenta</button></span>`;
  // armar() cambia el texto del panel: guardamos el nuevo para no volver a armarlo en bucle
  el.dataset.prTexto = el.textContent.trim();
}

function revisar(raiz) {
  raiz.querySelectorAll('main div, main section, main p').forEach((el) => {
    if (el.closest('.pr-acceso') && !el.classList.contains('pr-acceso')) return;
    if (el.classList.contains('pr-acceso')) { if (el.dataset.prTexto !== el.textContent.trim()) { el.classList.remove('pr-acceso'); delete el.dataset.prTexto; } else return; }
    if (el.children.length || !FRASE.test(el.textContent.trim())) return;
    const caja = el.matches('.glass-panel, [class*="rounded"]') ? el : null;   // solo paneles, no frases dentro de otra cosa
    if (caja && caja.textContent.trim().length < 120) armar(caja);
  });
}

export function initPremium() {
  if (!FX.premium) return;
  try {
    revisar(document);
    let pend = 0;
    new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; revisar(document); }); })
      .observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pr-auth]'); if (!b) return;
      const { openAuthModal } = await import('./auth.js');
      openAuthModal(b.dataset.prAuth);
    });
  } catch (e) { console.warn('[premium] desactivado:', e); }
}
