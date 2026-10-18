// EL FÉNIX · el diario chicha de arriba de Noticias (ronda 351, FX.noticiasV2).
// Pinta la portada de la edición elegida, los botones de ediciones, la descarga en PNG (post 4:5 e historia 9:16),
// compartir (WhatsApp / Discord / sistema) y el álbum de cupones (solo en este navegador).
// Datos: data/portadas.js → core/portada/portadas.js. Si algo falla, la zona seria de abajo se sigue viendo igual.
import { PORTADAS } from '../../../data/portadas.js';
import { CLUBES } from '../../../data/ligaResultados.js';
import { edicionesPublicadas, etiquetaEdicion, cuponesSeguidos } from '../../core/portada/portadas.js';
import { escudoDe } from '../../core/sistema/escudos.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';

const CLAVE_VISTAS = 'pes:fenix:vistas';
const leerVistas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? '[]'); } catch { return []; } };
const guardarVista = (id) => { try { const v = new Set(leerVistas()); v.add(id); localStorage.setItem(CLAVE_VISTAS, JSON.stringify([...v].slice(-30))); } catch { /* sin almacenamiento: el álbum queda en 0 */ } };

function fotoHTML(nombre, lvl, globo, lado) {
  const esc0 = escudoDe(CLUBES[nombre]);
  return `<div class="fx-foto fx-foto-${lado}">
    ${esc0 ? `<img src="${esc0}" alt="" class="fx-escudo" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : '<span class="fx-sinfoto" aria-hidden="true">?</span>'}
    ${lvl ? `<span class="fx-lvl">LVL ${esc(lvl)}</span>` : ''}
    <span class="fx-nombre">${esc(nombre)}</span>
    ${globo ? `<span class="fx-globo">${esc(globo)}</span>` : ''}
  </div>`;
}

/** HTML de una portada (también se usa para la imagen descargable). */
export function portadaHTML(p) {
  const c = p.colores;
  return `<article class="fx-portada" data-tema="${p.tema}" style="--fx-fondo:${c.fondo};--fx-tinta:${c.tinta};--fx-acento:${c.acento};--fx-sombra:${c.sombra}" aria-label="Portada de El Fénix: ${esc(p.titular.join(' '))}">
    <header class="fx-cab">
      <div class="fx-marca"><span class="fx-marca-nom">El Fénix</span><span class="fx-marca-lema">¡Deportes, chismes y lag! · El diario que no se calla ni en los penales</span></div>
      <div class="fx-precio"><span class="fx-num">Año 1 · ${p.tipo === 'extra' ? 'Edición extra' : `Semana ${p.semana ?? ''}`}</span><span class="fx-ascua">Solo 1 ascua</span></div>
    </header>
    <div class="fx-hoy"><b>Hoy en tu Fénix:</b>${p.ampay ? '<span class="fx-t-rojo">¡Ampay!</span>' : ''}${p.patch.length ? '<span class="fx-t-blanco">Patch notes</span>' : ''}${p.horoscopo.length ? '<span class="fx-t-cian">Horóscopo gamer</span>' : ''}<span class="fx-t-negro">Cupón</span></div>
    ${p.franja ? `<div class="fx-franja"><span>${esc(p.franja)}</span></div>` : ''}
    <div class="fx-fila">${p.kicker ? `<span class="fx-kicker">${esc(p.kicker)}</span>` : '<span></span>'}${p.logro ? `<span class="fx-logro">★ Logro: ${esc(p.logro)}</span>` : ''}</div>
    <h2 class="fx-titular">${esc(p.titular[0])}${p.titular[1] ? `<br><span>${esc(p.titular[1])}</span>` : ''}</h2>
    <div class="fx-duelo">
      ${fotoHTML(p.local, p.lvl[0], p.globos[0], 'izq')}
      <div class="fx-marcador"><b>${esc(p.marcador)}</b><span>${esc(p.marcadorPie)}</span></div>
      ${fotoHTML(p.visita, p.lvl[1], p.globos[1], 'der')}
    </div>
    ${p.bajada ? `<p class="fx-bajada">${esc(p.bajada)}</p>` : ''}
    <div class="fx-cajas">
      ${p.ampay ? `<div class="fx-ampay"><span class="fx-ampay-sello">¡Ampay!</span><span class="fx-ampay-t">${esc(p.ampay.titulo)}</span><span class="fx-ampay-x">${esc(p.ampay.texto)}</span></div>` : ''}
      ${p.chismes.length ? `<div class="fx-lechuza"><span class="fx-lechuza-t">La Lechuza del Parsec</span><small>Se dice, se comenta…</small>${p.chismes.map((x) => `<span class="fx-chisme">${esc(x)}</span>`).join('')}</div>` : ''}
      ${p.patch.length ? `<div class="fx-patch"><span class="fx-pixel">Patch notes</span>${p.patch.map((x) => `<span class="fx-patch-l"><b data-t="${x.tipo}">${x.etiqueta}</b>${esc(x.t)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="fx-pie">
      ${p.horoscopo.length ? `<div class="fx-horo"><b>Horóscopo gamer <small>· por Madame Lag</small></b>${p.horoscopo.map((h) => `<span><b>${esc(h.signo)}:</b> ${esc(h.t)}</span>`).join('')}</div>` : ''}
      <div class="fx-cupon"><small>✂ Recorta y colecciona</small><b>Cupón El Fénix</b><span>Junta 5 portadas seguidas</span></div>
    </div>
    ${p.sticker ? `<span class="fx-sticker">${esc(p.sticker)}</span>` : ''}
  </article>`;
}

/**
 * Monta El Fénix en `caja`. `alLeer(slug)` abre la noticia completa si la portada apunta a una.
 */
export function montarFenix(caja, { alLeer } = {}) {
  let ediciones = [];
  try { ediciones = edicionesPublicadas(PORTADAS); } catch (e) { console.error('[fenix] portadas:', e); }
  if (!ediciones.length) { caja.hidden = true; return; }
  let i = 0;

  const pintar = () => {
    const p = ediciones[i];
    guardarVista(p.id);
    const cupones = cuponesSeguidos(ediciones, leerVistas());
    caja.innerHTML = `<div class="fx-zona">
      <div class="fx-lienzo">${portadaHTML(p)}</div>
      <aside class="fx-panel" aria-label="Opciones de la portada">
        <div class="fx-intro"><span>La portada de la semana</span><h2>Mándala al grupo y que arda</h2><p>Cada lunes sale una portada nueva. Si en la semana pasa algo gordo, sale una edición extra.</p></div>
        ${ediciones.length > 1 ? `<div class="fx-bloque"><span class="fx-et">Ediciones</span><div class="fx-ediciones" role="group" aria-label="Elegir edición">${ediciones.slice(0, 4).map((e, k) => { const t = etiquetaEdicion(e, k, ediciones); return `<button type="button" data-ed="${k}" aria-pressed="${k === i}"><b>${esc(t.nombre)}</b><small>${esc(t.sub)}</small></button>`; }).join('')}</div></div>` : ''}
        <div class="fx-bloque"><span class="fx-et">Descargar y compartir</span>
          <button type="button" class="fx-bajar" data-bajar="post">Descargar la portada</button>
          <div class="fx-dos">
            <button type="button" data-bajar="historia">Historia / TikTok 9:16</button>
            <button type="button" data-compartir="whatsapp" class="fx-wa">Enviar por WhatsApp</button>
            <button type="button" data-compartir="copiar" class="fx-dc">Copiar enlace (Discord)</button>
            ${p.noticia ? '<button type="button" data-leer>Leer la noticia</button>' : '<button type="button" data-ir-seria>Ver las noticias ↓</button>'}
          </div>
        </div>
        <div class="fx-bloque fx-album"><span class="fx-pixel">Tu álbum de cupones</span>
          <div class="fx-cupones">${[1, 2, 3, 4, 5].map((n) => `<span data-ok="${n <= cupones}">${n}</span>`).join('')}</div>
          <small>${cupones >= 5 ? '¡Álbum completo! Avísale al staff para tu premio.' : 'Abre la portada de cada semana para sumar tu cupón.'}</small></div>
      </aside></div>`;
  };

  async function aImagen(modo, boton) {
    const portada = caja.querySelector('.fx-portada'); if (!portada) return;
    const textoAntes = boton.textContent; boton.disabled = true; boton.textContent = 'Preparando…';
    let marco = null;
    try {
      const { toPng } = await import('html-to-image');
      let nodo = portada; portada.classList.add('fx-captura');
      if (modo === 'historia') {
        marco = document.createElement('div'); marco.className = 'fx-marco-historia';
        marco.innerHTML = `${portadaHTML(ediciones[i])}<p class="fx-marco-pie">Lee todo en la web de Phoenix Evolution · Noticias</p>`;
        document.body.appendChild(marco); nodo = marco;
      }
      await document.fonts?.ready;
      const url = await toPng(nodo, { pixelRatio: 2, cacheBust: true, backgroundColor: modo === 'historia' ? '#03010f' : undefined });
      const nombre = `el-fenix-${ediciones[i].id}${modo === 'historia' ? '-historia' : ''}.png`;
      const blob = await (await fetch(url)).blob();
      const archivo = new File([blob], nombre, { type: 'image/png' });
      if (navigator.canShare?.({ files: [archivo] })) {
        try { await navigator.share({ files: [archivo], title: 'El Fénix' }); boton.textContent = '¡Listo!'; return; }
        catch (e) { if (e?.name === 'AbortError') { boton.textContent = textoAntes; return; } console.warn('[fenix] share:', e); }
      }
      const a = Object.assign(document.createElement('a'), { href: url, download: nombre }); a.click();
      boton.textContent = '¡Listo! Ya está en tus descargas';
    } catch (e) {
      console.error('[fenix] descargar:', e); toast('No se pudo crear la imagen. Prueba de nuevo o toma una captura.', 'error'); boton.textContent = textoAntes;
    } finally {
      marco?.remove(); portada.classList.remove('fx-captura'); boton.disabled = false;
      setTimeout(() => { if (boton.isConnected && !boton.disabled) boton.textContent = textoAntes; }, 4000);
    }
  }

  async function compartir(como) {
    const u = new URL(location.href); u.search = ''; u.hash = '';
    const texto = `¡Salió El Fénix! ${ediciones[i].titular.join(' ')} 🔥 ${u.toString()}`;
    if (como === 'whatsapp') { window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); return; }
    try { await navigator.clipboard.writeText(texto); toast('Copiado: pégalo en Discord.', 'ok'); }
    catch (e) { console.warn('[fenix] copiar:', e); toast('No se pudo copiar; copia la dirección del navegador.', 'warn'); }
  }

  caja.addEventListener('click', (ev) => {
    const t = ev.target;
    const ed = t.closest('[data-ed]'); if (ed) { i = Number(ed.dataset.ed) || 0; pintar(); return; }
    const b = t.closest('[data-bajar]'); if (b) { aImagen(b.dataset.bajar, b); return; }
    const c = t.closest('[data-compartir]'); if (c) { compartir(c.dataset.compartir); return; }
    if (t.closest('[data-leer]') && ediciones[i].noticia) { alLeer?.(ediciones[i].noticia); return; }
    if (t.closest('[data-ir-seria]')) document.getElementById('nv-seria')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  pintar();
}
