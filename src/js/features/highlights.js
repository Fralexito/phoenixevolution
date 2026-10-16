// Highlights de la portada (ronda 307): un visor grande + lista. El video de YouTube NO se carga hasta que la persona lo toca
// (mejor velocidad y privacidad: youtube-nocookie). Tocar un clip de la lista lo pone en el visor.
import { urlEmbed, miniatura, etiquetaFuente } from '../core/clips.js';
const raiz = document.querySelector('[data-highlights]');
if (raiz) {
  const visor = raiz.querySelector('#hl-visor');
  const filas = [...raiz.querySelectorAll('[data-hl-id]')];
  const clipDe = (f) => ({ id: f.dataset.hlId, fuente: f.dataset.hlFuente });
  const fondoPoster = (c) => { const m = miniatura(c); return m ? `<img src="${m}" alt="" class="absolute inset-0 w-full h-full object-cover">` : `<span class="absolute inset-0 grid place-items-center bg-gradient-to-br from-purple-900/60 to-black font-display font-bold uppercase tracking-widest text-white text-lg">${etiquetaFuente(c)}</span>`; };
  const poner = (c) => { visor.innerHTML = `<iframe class="absolute inset-0 w-full h-full" src="${urlEmbed(c, location.hostname)}" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`; };
  const poster = (f) => { visor.innerHTML = `<button type="button" class="hl-poster" data-hl-play aria-label="Reproducir: ${f.dataset.hlTitulo.replace(/"/g, '')}">${fondoPoster(clipDe(f))}<span class="hl-play"><i class="fa-solid fa-play"></i></span></button>`; };
  let actual = filas[0];
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-hl-play]')) { poner(clipDe(actual)); return; }
    const f = e.target.closest('[data-hl-id]'); if (!f) return;
    actual = f; filas.forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
    raiz.querySelector('#hl-tag').textContent = f.dataset.hlTag; raiz.querySelector('#hl-titulo').textContent = f.dataset.hlTitulo; raiz.querySelector('#hl-canal').textContent = `${f.dataset.hlCanal} · ${etiquetaFuente(clipDe(f))}`;
    poster(f); poner(clipDe(f));
  });
}
