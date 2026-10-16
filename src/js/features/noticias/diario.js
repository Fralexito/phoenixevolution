// LA PORTADA DEL DIARIO: afiche del día + primera plana + lo justo del resto + la joda al final.
// Regla de Fralex: poco scroll. Nada de filas de relleno; las tarjetas de una fila miden lo mismo.
import { escapeHTML as esc } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { armarPortada } from '../../core/diario.js';
import { departamento } from '../../core/departamentos.js';
import { datosAfiche } from '../../core/afiche.js';
import { aficheHTML, aficheArchivo, fechaCorta } from './afiche.js';

const sello = (dep) => { const d = departamento(dep); return `<span class="dia-sello" style="--dp:${d.color}">${esc(d.nombre)}</span>`; };
const borrador = (n) => (n.publicada ? '' : '<span class="dia-borrador">Borrador</span>');

function heroHTML(it, ctx) {
  const n = it.noticia; const d = departamento(it.dep);
  return `<article class="dia-hero" style="--dp:${d.color}" data-slug="${esc(n.slug)}" tabindex="0" role="button">
    <div class="dia-hero-cab">${sello(it.dep)}<span class="dia-meta">${esc(ctx.cuando(n))}</span>${borrador(n)}</div>
    <h2 class="dia-hero-tit">${esc(n.titulo)}</h2>
    <p class="dia-hero-res">${esc(n.resumen)}</p>
    <span class="dia-leer">Leer la nota</span>
  </article>`;
}
function miniHTML(it, ctx) {
  const n = it.noticia; const d = departamento(it.dep);
  return `<article class="dia-min" style="--dp:${d.color}" data-slug="${esc(n.slug)}" tabindex="0" role="button">
    <div class="dia-min-cab">${sello(it.dep)}<span class="dia-meta">${esc(ctx.cuando(n))}</span></div>
    <h3 class="dia-min-tit">${esc(n.titulo)}${borrador(n)}</h3>
  </article>`;
}
const ultimaHTML = (n, i, ctx) => `<li><button type="button" data-slug="${esc(n.slug)}"><b>${i + 1}</b><span>${esc(n.titulo)}</span></button></li>`;

/**
 * Pinta la portada de hoy.
 * @returns {{sobran:number, max:number}} para que la página sepa si hace falta «Ver más».
 */
export function pintarDiario({ cajaAfiche, cajaGrilla, lista, ctx, hoy = new Date(), max = 6 }) {
  const p = armarPortada(lista, { hoy, max });
  if (!p.afiche) {
    cajaAfiche.innerHTML = '';
    cajaGrilla.className = '';
    cajaGrilla.innerHTML = '<div class="dia-vacio">No hay noticias que coincidan con la búsqueda.</div>';
    return { sobran: 0, max };
  }
  const d = datosAfiche(p.afiche.noticia, { hoy, dep: p.afiche.dep });
  const tambien = [p.hero, ...p.resto].filter(Boolean).slice(0, 2).map((i) => i.noticia.titulo);

  cajaAfiche.innerHTML = `<section class="dia-top">
    <div class="dia-col-afiche">
      ${aficheHTML(d, { hoy, tambien, slug: p.afiche.noticia.slug })}
      <div class="dia-bajar">
        <button type="button" class="btn dia-btn-ppal" data-bajar="3:4">Descargar portada</button>
        <button type="button" class="btn btn-ghost" data-bajar="grupo">Al grupo</button>
        <button type="button" class="btn btn-ghost" data-bajar="9:16">Vertical 9:16</button>
      </div>
    </div>
    <div class="dia-col-hero">${p.hero ? heroHTML(p.hero, ctx) : ''}</div>
    ${p.ultimas.length > 1 ? `<aside class="dia-ultimas"><h3>Lo último</h3><ol>${p.ultimas.map((n, i) => ultimaHTML(n, i, ctx)).join('')}</ol></aside>` : ''}
  </section>`;

  const joda = p.joda.length ? `<section class="dia-joda">
      <div class="dia-joda-cab"><span class="dia-joda-tit">Zona de joda</span><span class="dia-meta">Burla solo de fútbol: del jugador, nunca de la persona.</span></div>
      <div class="dia-rejilla">${p.joda.map((i) => miniHTML(i, ctx)).join('')}</div>
    </section>` : '';
  cajaGrilla.className = 'dia-cuerpo';
  cajaGrilla.innerHTML = `${p.resto.length ? `<section class="dia-resto"><div class="dia-sep"><span>Lo demás del día</span></div><div class="dia-rejilla">${p.resto.map((i) => miniHTML(i, ctx)).join('')}</div>${p.sobran ? `<button type="button" class="btn btn-ghost dia-mas">Ver ${p.sobran} más</button>` : ''}</section>` : ''}${joda}`;

  // Descargar / compartir el afiche
  cajaAfiche.querySelectorAll('[data-bajar]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const modo = b.dataset.bajar; const antes = b.textContent; b.disabled = true; b.textContent = 'Preparando…';
    try {
      const medida = modo === '9:16' ? { ancho: 820, alto: 1458 } : { ancho: 820, alto: 1066 };
      const archivo = await aficheArchivo(d, { hoy, tambien, ...medida });
      if (modo === 'grupo' && navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: `Portada del ${fechaCorta(hoy)} · phoenixevolution.com` });
      } else {
        const url = URL.createObjectURL(archivo);
        const a = document.createElement('a'); a.href = url; a.download = archivo.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast(modo === 'grupo' ? 'Tu teléfono no deja compartir directo: la portada se descargó para que la mandes tú.' : 'Portada descargada.', 'ok');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') { console.error('[noticias] afiche:', err); toast('No se pudo preparar la portada.', 'error'); }
    } finally { b.disabled = false; b.textContent = antes; }
  }));

  return { sobran: p.sobran, max };
}
