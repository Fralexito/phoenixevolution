// «Carta grande con el nombre» (PRUEBA de la ronda 391, idea de la muestra de videojuego). HTML puro, sin DOM: sirve en el servidor
// (portada, Astro) y en el navegador (ranking, MVP, temporadas, mejor gol). Estilos: styles/pruebaJuego.css. Inclinación 3D:
// js/features/pruebaJuego.js. Solo se usa con la prueba encendida (<html data-prueba-juego>). Test: tests/cartaJuego.test.mjs.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const color = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c ?? '')) ? c : null);
const urlOk = (u) => /^(https?:\/\/|\/)[^\s"'<>]*$/i.test(String(u ?? ''));

/**
 * @param {object} o
 *  etiqueta  texto chico arriba («Líder de la Galaxy», «MVP del partido»…)
 *  nombre    el nombre grande · sub  la línea de abajo (club, título del gol…)
 *  cifra / cifraEt  número grande y su unidad («29» «PTS») · puesto  «1°», «MVP», «🏆»
 *  escudo    URL de una imagen (escudo o avatar) · iniciales  si no hay imagen
 *  colores   { a, b } colores del club (si no, los de Galaxy) · stats  [[«PJ», 11], …] (máx. 6) · forma  ['V','E','D'…]
 *  href      a dónde lleva al tocarla · externo  true si es un enlace a otro sitio · chica  true = versión más pequeña
 */
export function cartaJuegoHTML(o = {}) {
  const a = color(o.colores?.a); const b = color(o.colores?.b);
  const estilo = a && b ? ` style="--cj-a:${a};--cj-b:${b}"` : '';
  const img = urlOk(o.escudo) ? `<img src="${esc(o.escudo)}" alt="" width="110" height="110" loading="lazy" decoding="async">` : `<span class="cj-ini">${esc(String(o.iniciales ?? o.nombre ?? '?').slice(0, 2).toUpperCase())}</span>`;
  const stats = (Array.isArray(o.stats) ? o.stats : []).filter((s) => Array.isArray(s) && s.length === 2).slice(0, 6);
  const forma = (Array.isArray(o.forma) ? o.forma : []).filter((x) => ['V', 'E', 'D'].includes(x)).slice(-5);
  const cuerpo = `<span class="cj-holo" aria-hidden="true"></span>
    <span class="cj-cab">${o.cifra !== undefined && o.cifra !== null ? `<span class="cj-cifra">${esc(o.cifra)}<span class="cj-cifra-et">${esc(o.cifraEt ?? '')}</span></span>` : '<span></span>'}${o.puesto ? `<span class="cj-puesto">${esc(o.puesto)}</span>` : ''}</span>
    ${o.etiqueta ? `<span class="cj-et">${esc(o.etiqueta)}</span>` : ''}
    <span class="cj-img">${img}</span>
    <span class="cj-nombre">${esc(o.nombre ?? '')}</span>
    ${o.sub ? `<span class="cj-sub">${esc(o.sub)}</span>` : ''}
    ${stats.length || forma.length ? `<span class="cj-stats">${stats.map(([k, v]) => `<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`).join('')}${forma.length ? `<span><small>Forma</small><b class="cj-forma">${forma.map((x) => `<i class="cj-f${x}">${x}</i>`).join('')}</b></span>` : ''}</span>` : ''}`;
  const clase = `cj${o.chica ? ' cj-chica' : ''}`;
  const aria = esc([o.etiqueta, o.nombre, o.cifra !== undefined && o.cifra !== null ? `${o.cifra} ${o.cifraEt ?? ''}` : ''].filter(Boolean).join(': '));
  return urlOk(o.href)
    ? `<a class="cj-zona" href="${esc(o.href)}"${o.externo ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${aria}"><span class="${clase}" data-cj${estilo}>${cuerpo}</span></a>`
    : `<div class="cj-zona" role="group" aria-label="${aria}"><span class="${clase}" data-cj${estilo}>${cuerpo}</span></div>`;
}

/** ¿Está encendida la prueba? (atributo que pone la cabecera de Layout.astro). Fuera del navegador: false. */
export function pruebaJuego() {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-prueba-juego');
}
