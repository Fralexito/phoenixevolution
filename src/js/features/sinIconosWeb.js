// Ronda 318/320: cambia los iconos genéricos por Phosphor Light (trazo fino); los que no tienen equivalente y van pegados a un texto se ocultan. Antes: quita los iconos DECORATIVOS de toda la web (los que van pegados a un texto) y deja solo lo que sirve:
// flechas, chevrones, ✕, ✓, +, − y los iconos de botones que no tienen texto. En la barra lateral, el icono pasa a ser un monograma (2 letras).
// Se apaga con FX.sinIconosWeb = false (reconstruir). Excluir algo a propósito: data-ico-keep.
import { FA_A_PH } from '../../data/iconosFinos.js';
const MANTENER = /fa-(chevron|arrow|angle|caret|xmark|check|plus|minus|spinner|circle-notch|rotate|ellipsis|bars|eye|eye-slash|grip|heart)\b/;
const SELECTOR = 'i.fa-solid:not([data-ico]), i.fa-regular:not([data-ico])';
// ¿Tiene texto VISIBLE? (el texto solo para lectores de pantalla, .sr-only, no cuenta: ese botón es de solo icono)
function texto(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeValue.trim() && !n.parentElement.closest('.sr-only, [hidden]')) return true; }
  return false;
}

function revisar(raiz) {
  raiz.querySelectorAll(SELECTOR).forEach((i) => {
    i.dataset.ico = '1';
    if (i.closest('[data-ico-keep]')) return;
    if (MANTENER.test(i.className)) return;                                // flechas, ✕, ✓…: se quedan como están
    const fa = [...i.classList].find((c) => c.startsWith('fa-') && c !== 'fa-solid' && c !== 'fa-regular');
    const ph = fa && FA_A_PH[fa.slice(3)];
    if (ph) { i.classList.remove('fa-solid', 'fa-regular', fa); i.classList.add('ph-bold', `ph-${ph}`, 'ico-fino'); return; }  // cambio por icono fino
    const item = i.closest('.barra-item');
    if (item) { const t = (item.getAttribute('title') || item.textContent || '').replace(/\s+/g, ' ').trim(); item.dataset.mono = t.slice(0, 2).toUpperCase(); i.classList.add('ico-deco'); return; }
    const host = i.parentElement; if (!host) return;
    if (texto(host)) { i.classList.add('ico-deco'); return; }            // icono pegado a un texto
    const cont = host.closest('button, a'); if (cont && !texto(cont)) return; // botón o enlace solo con icono: se queda
    const abuelo = host.parentElement;                                   // cuadrito que envuelve solo al icono, junto a un texto
    if (abuelo && host.children.length === 1 && texto(cont || abuelo)) host.classList.add('ico-deco');
  });
}

export function initSinIconosWeb() {
  let programado = false;
  const pasar = () => { programado = false; revisar(document); };
  const pedir = () => { if (!programado) { programado = true; requestAnimationFrame(pasar); } };
  pasar();
  new MutationObserver(pedir).observe(document.body, { childList: true, subtree: true });
}
