// Editor de noticias (solo admin; la base de datos lo refuerza con RLS) + aviso a Discord.
// Flujo: abrirEditor() → validar() → (subir portada) → insert/update → (avisar a Discord) → onGuardada().
import { supabase } from '../core/supabase.js';
import { openModal, closeModal } from '../core/modal.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { getState } from '../core/session.js';
import { redimensionarJpeg } from '../core/image.js';
import { CATEGORIAS, slugify, slugUnico, validar } from '../core/noticias.js';
import { generarCronica } from '../core/cronica.js';
import { resumenFecha } from '../core/ligaStats.js';
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';

const ID = 'news-editor';
const ETIQUETA_CAT = { OFICIAL: 'Oficial', JORNADA: 'Jornadas', TRIBUNAL: 'Tribunal' };
const edicionActual = (ligaId) => (EDICIONES[ligaId] ?? []).at(-1) ?? null;
const ligaDe = (id) => LIGAS.find((l) => l.id === id);

/** Avisa a Discord vía la función segura `notificar-discord` (el webhook vive en el servidor, nunca en el navegador). Nunca lanza: devuelve true/false. */
export async function avisarDiscord(slug) {
  try {
    const url = `${location.origin}${location.pathname}?n=${encodeURIComponent(slug)}`;
    const { data, error } = await supabase.functions.invoke('notificar-discord', { body: { slug, url } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    toast('Aviso enviado a Discord.', 'ok'); return true;
  } catch (e) {
    console.error('[noticias] aviso a Discord:', e);
    const msg = String(e?.context?.status === 503 || /webhook/i.test(e?.message ?? '') ? 'Falta configurar el webhook de Discord en Supabase (secreto DISCORD_WEBHOOK_URL).' : 'No se pudo avisar a Discord. La noticia sí quedó publicada.');
    toast(msg, 'warn', { ms: 8000 }); return false;
  }
}

export async function borrarNoticia(n) {
  const { error } = await supabase.from('noticias').delete().eq('id', n.id);
  if (error) { console.error('[noticias] borrar:', error); toast('No se pudo eliminar la noticia.', 'error'); return false; }
  toast('Noticia eliminada.', 'ok'); return true;
}

/** @param {{noticia?: object|null, slugsUsados?: string[], onGuardada?: Function}} o  noticia = null para crear una nueva. */
export function abrirEditor({ noticia = null, slugsUsados = [], onGuardada = () => {} } = {}) {
  const n = noticia ?? { titulo: '', resumen: '', cuerpo: [], categoria: 'OFICIAL', tag: '', imagen: '', liga: LIGAS[0]?.id ?? 'galaxy', destacada: false, publicada: true };
  const editando = !!noticia;
  const opt = (v, t, sel) => `<option value="${escapeHTML(v)}"${sel ? ' selected' : ''}>${escapeHTML(t)}</option>`;
  const wrap = openModal(`<form id="ne-form" class="p-5 sm:p-6 space-y-4" novalidate>
    <div class="flex justify-between items-start border-b border-galaxy-border pb-3">
      <div><span class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-widest">${editando ? 'Editar' : 'Nueva'} noticia</span>
        <h3 class="font-display font-bold text-xl text-white uppercase">${editando ? 'Editar comunicado' : 'Publicar comunicado'}</h3></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="ne-cronica" class="rounded-xl border border-galaxy-border/60 bg-black/25 p-3 space-y-2" hidden>
      <span class="label !mb-0"><i class="fa-solid fa-wand-magic-sparkles text-galaxy-400 mr-1"></i>Crónica automática de una fecha</span>
      <div class="flex gap-2"><select id="ne-fecha" class="field" aria-label="Fecha"></select><button type="button" id="ne-generar" class="btn btn-ghost shrink-0">Generar borrador</button></div>
      <p class="text-[11px] text-gray-500">Rellena los campos con los resultados de esa fecha. Revísalo y edítalo antes de publicar.</p>
    </div>
    <div><label class="label" for="ne-titulo">Título</label><input id="ne-titulo" class="field" maxlength="140" value="${escapeHTML(n.titulo)}"></div>
    <div><label class="label" for="ne-resumen">Resumen <span class="text-gray-500 normal-case">(se ve en la tarjeta)</span></label><textarea id="ne-resumen" class="field" rows="2" maxlength="400">${escapeHTML(n.resumen)}</textarea></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="label" for="ne-cat">Categoría</label><select id="ne-cat" class="field">${CATEGORIAS.map((c) => opt(c, ETIQUETA_CAT[c], c === n.categoria)).join('')}</select></div>
      <div><label class="label" for="ne-liga">Liga</label><select id="ne-liga" class="field">${LIGAS.map((l) => opt(l.id, l.titulo.join(' '), l.id === n.liga)).join('')}</select></div>
    </div>
    <div><label class="label" for="ne-tag">Etiqueta <span class="text-gray-500 normal-case">(opcional, ej. «Fecha 8»)</span></label><input id="ne-tag" class="field" maxlength="40" value="${escapeHTML(n.tag)}"></div>
    <div><label class="label" for="ne-cuerpo">Texto <span class="text-gray-500 normal-case">(separa los párrafos con una línea en blanco)</span></label><textarea id="ne-cuerpo" class="field" rows="8" maxlength="20000">${escapeHTML(n.cuerpo.join('\n\n'))}</textarea></div>
    <div class="space-y-2">
      <span class="label !mb-0">Portada <span class="text-gray-500 normal-case">(opcional)</span></span>
      <div class="flex items-center gap-3">
        <div id="ne-prev" class="w-28 h-16 rounded-lg overflow-hidden bg-black/40 border border-galaxy-border/60 shrink-0 grid place-items-center text-gray-600">${safeImg(n.imagen) ? `<img src="${escapeHTML(safeImg(n.imagen))}" alt="" class="w-full h-full object-cover">` : '<i class="fa-regular fa-image"></i>'}</div>
        <div class="flex-1 min-w-0 space-y-1.5"><input id="ne-img" class="field" placeholder="Enlace https:// de la imagen" value="${escapeHTML(n.imagen)}"><label class="btn btn-ghost !w-full cursor-pointer"><i class="fa-solid fa-upload"></i> Subir una imagen<input id="ne-file" type="file" accept="image/*" hidden></label></div>
      </div>
    </div>
    <div class="grid sm:grid-cols-3 gap-2 text-sm text-gray-200">
      <label class="flex items-center gap-2"><input id="ne-dest" type="checkbox" ${n.destacada ? 'checked' : ''}> Destacada</label>
      <label class="flex items-center gap-2"><input id="ne-pub" type="checkbox" ${n.publicada ? 'checked' : ''}> Publicada</label>
      <label class="flex items-center gap-2" id="ne-disc-wrap"><input id="ne-disc" type="checkbox"> Avisar a Discord</label>
    </div>
    <p class="text-[11px] text-gray-500 -mt-2">Sin «Publicada» queda como borrador (solo los admins la ven). Solo puede haber una destacada por liga.</p>
    <ul id="ne-errores" class="text-xs text-rose-400 space-y-0.5" role="alert"></ul>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" id="ne-guardar" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Guardar noticia'}</button></div>
  </form>`, { id: ID, persistent: true, wide: true });
  const $ = (id) => wrap.querySelector(`#${id}`);

  // --- Crónica automática: depende de la liga elegida (usa su edición más reciente) ---
  const pintarFechas = () => {
    const ed = edicionActual($('ne-liga').value); const fechas = (ed?.fechas ?? []).filter((f) => resumenFecha(f).jugados > 0);
    $('ne-cronica').hidden = !fechas.length;
    $('ne-fecha').innerHTML = [...fechas].reverse().map((f) => `<option value="${f.n}">Fecha ${f.n}</option>`).join('');
  };
  $('ne-liga').addEventListener('change', pintarFechas); pintarFechas();
  $('ne-generar').addEventListener('click', () => {
    const lg = ligaDe($('ne-liga').value); const ed = edicionActual($('ne-liga').value);
    const c = ed && generarCronica({ fechas: ed.fechas, n: Number($('ne-fecha').value), clubes: ed.clubes, nombreLiga: lg ? lg.titulo.join(' ').replace(/\b(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase()) : 'liga', nombreEdicion: ed.nombre });
    if (!c) { toast('Esa fecha todavía no tiene resultados.', 'warn'); return; }
    $('ne-titulo').value = c.titulo; $('ne-resumen').value = c.resumen; $('ne-cuerpo').value = c.cuerpo; $('ne-tag').value = c.tag; $('ne-cat').value = c.categoria;
    toast('Borrador generado: revísalo antes de publicar.', 'ok');
  });

  // --- Portada: vista previa al escribir el enlace o al elegir un archivo ---
  let archivo = null;
  const previa = (src) => { $('ne-prev').innerHTML = safeImg(src) ? `<img src="${escapeHTML(safeImg(src))}" alt="" class="w-full h-full object-cover">` : '<i class="fa-regular fa-image"></i>'; };
  $('ne-img').addEventListener('input', (e) => { archivo = null; previa(e.target.value); });
  $('ne-file').addEventListener('change', (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    archivo = f; $('ne-img').value = ''; previa(URL.createObjectURL(f));
  });
  // «Avisar a Discord» solo tiene sentido al publicar y si aún no se avisó.
  const sincronizarAviso = () => { const ya = !!n.discordEn; $('ne-disc-wrap').hidden = ya || !$('ne-pub').checked; if ($('ne-disc-wrap').hidden) $('ne-disc').checked = false; };
  $('ne-pub').addEventListener('change', sincronizarAviso); sincronizarAviso();

  // --- Guardar ---
  $('ne-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = { titulo: $('ne-titulo').value.trim(), resumen: $('ne-resumen').value.trim(), cuerpo: $('ne-cuerpo').value.trim(), categoria: $('ne-cat').value, tag: $('ne-tag').value.trim(), imagen: archivo ? '' : $('ne-img').value.trim(), liga: $('ne-liga').value };
    const v = validar(b); $('ne-errores').innerHTML = v.errores.map((x) => `<li>${escapeHTML(x)}</li>`).join('');
    if (!v.ok) return;
    const btn = $('ne-guardar'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const slug = editando ? n.slug : slugUnico(slugify(b.titulo), slugsUsados);
      let imagen = b.imagen || null;
      if (archivo) {
        const blob = await redimensionarJpeg(archivo);
        const path = `${slug}-${Date.now()}.jpg`;
        const up = await supabase.storage.from('noticias').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
        imagen = supabase.storage.from('noticias').getPublicUrl(path).data.publicUrl;
      }
      const publicada = $('ne-pub').checked;
      const fila = { slug, titulo: b.titulo, resumen: b.resumen, cuerpo: b.cuerpo, categoria: b.categoria, tag: b.tag, imagen, liga: b.liga, destacada: $('ne-dest').checked, publicada };
      if (!editando) fila.autor_id = getState().session?.user?.id ?? null;
      if (editando && !n.publicada && publicada) fila.publicada_en = new Date().toISOString();   // un borrador cuenta como «nuevo» el día que se publica
      const q = editando ? supabase.from('noticias').update(fila).eq('id', n.id) : supabase.from('noticias').insert(fila);
      const { data, error } = await q.select().single();
      if (error) throw error;
      closeModal(ID); toast(editando ? 'Noticia actualizada.' : 'Noticia guardada.', 'ok');
      if ($('ne-disc')?.checked && publicada) await avisarDiscord(data.slug);
      onGuardada(data);
    } catch (err) {
      console.error('[noticias] guardar:', err);
      const msg = err?.code === '23505' ? 'Ya existe una noticia con ese enlace; cambia un poco el título.' : err?.code === '42501' ? 'No tienes permiso para publicar noticias.' : err?.message || 'No se pudo guardar. Intenta de nuevo.';
      $('ne-errores').innerHTML = `<li>${escapeHTML(msg)}</li>`;
      btn.disabled = false; btn.textContent = editando ? 'Guardar cambios' : 'Guardar noticia';
    }
  });
}
