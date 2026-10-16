// Highlights de la portada (ronda 307): un visor grande + lista. El video de YouTube NO se carga hasta que la persona lo toca
// (mejor velocidad y privacidad: youtube-nocookie). Tocar un clip de la lista lo pone en el visor.
const raiz = document.querySelector('[data-highlights]');
if (raiz) {
  const visor = raiz.querySelector('#hl-visor');
  const filas = [...raiz.querySelectorAll('[data-hl-id]')];
  const poner = (id) => { visor.innerHTML = `<iframe class="absolute inset-0 w-full h-full" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`; };
  const poster = (f) => { visor.innerHTML = `<button type="button" class="hl-poster" data-hl-play aria-label="Reproducir: ${f.dataset.hlTitulo.replace(/"/g, '')}"><img src="https://i.ytimg.com/vi/${encodeURIComponent(f.dataset.hlId)}/hqdefault.jpg" alt="" class="absolute inset-0 w-full h-full object-cover"><span class="hl-play"><i class="fa-solid fa-play"></i></span></button>`; };
  let actual = filas[0];
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-hl-play]')) { poner(actual.dataset.hlId); return; }
    const f = e.target.closest('[data-hl-id]'); if (!f) return;
    actual = f; filas.forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
    raiz.querySelector('#hl-tag').textContent = f.dataset.hlTag; raiz.querySelector('#hl-titulo').textContent = f.dataset.hlTitulo; raiz.querySelector('#hl-canal').textContent = `${f.dataset.hlCanal} · YouTube`;
    poster(f); poner(f.dataset.hlId);
  });
}
