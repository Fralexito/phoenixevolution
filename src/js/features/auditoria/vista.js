// HTML de la página de Auditoría (funciones puras: datos → texto, sin DOM → se pueden probar). TODO dato de la BD pasa por escapeHTML.
import { escapeHTML, safeImg } from '../../core/dom.js';
import { tiempoRelativo } from '../../core/muro.js';
import { ACCIONES, FILTRO_ACCIONES, FILTRO_SECCIONES, agruparPorDia } from '../../core/auditoria.js';
import { ROLES, ROL_INFO, normalizarRol } from '../../core/roles.js';

/** Colores por tono. Cada clase va ESCRITA ENTERA (Tailwind solo genera las que ve literalmente en el código). */
export const TONOS = Object.freeze({
  ok:     { borde: 'border-l-emerald-400', icono: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40', chip: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/10', barra: 'bg-emerald-400' },
  warn:   { borde: 'border-l-amber-400',   icono: 'bg-amber-500/15 text-amber-300 border-amber-400/40',       chip: 'text-amber-300 border-amber-400/50 bg-amber-500/10',       barra: 'bg-amber-400' },
  oculto: { borde: 'border-l-orange-400',  icono: 'bg-orange-500/15 text-orange-300 border-orange-400/40',    chip: 'text-orange-300 border-orange-400/50 bg-orange-500/10',    barra: 'bg-orange-400' },
  bad:    { borde: 'border-l-rose-400',    icono: 'bg-rose-500/15 text-rose-300 border-rose-400/40',          chip: 'text-rose-300 border-rose-400/50 bg-rose-500/10',          barra: 'bg-rose-400' },
  rol:    { borde: 'border-l-violet-400',  icono: 'bg-violet-500/15 text-violet-300 border-violet-400/40',    chip: 'text-violet-300 border-violet-400/50 bg-violet-500/10',    barra: 'bg-violet-400' },
  info:   { borde: 'border-l-sky-400',     icono: 'bg-sky-500/15 text-sky-300 border-sky-400/40',             chip: 'text-sky-300 border-sky-400/50 bg-sky-500/10',             barra: 'bg-sky-400' },
  neutro: { borde: 'border-l-slate-500',   icono: 'bg-slate-500/15 text-slate-300 border-slate-400/40',       chip: 'text-slate-300 border-slate-500/50 bg-slate-500/10',       barra: 'bg-slate-400' },
});
const tono = (t) => TONOS[t] ?? TONOS.neutro;
const e = escapeHTML;
const vacio = (t) => `<div class="text-center py-8 px-4 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border">${t}</div>`;

export function avatarMini(nombre, url, px = 'w-9 h-9') {
  const src = safeImg(url);
  return src ? `<img src="${e(src)}" alt="" class="${px} rounded-full object-cover border border-galaxy-border shrink-0" loading="lazy">`
    : `<span class="${px} rounded-full bg-galaxy-900 border border-galaxy-border flex items-center justify-center font-display font-bold text-galaxy-400 shrink-0">${e(String(nombre || '?').trim().charAt(0).toUpperCase())}</span>`;
}

export function rolBadge(rol) {
  const info = ROL_INFO[normalizarRol(rol)];
  return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider align-middle ${tono(info.tono).chip}"><i class="fa-solid ${info.icono}"></i>${e(info.etiqueta)}</span>`;
}

const horaLima = (ms) => new Date(ms).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' });

/** Panel «¿Cómo leer este registro?»: la explicación didáctica de colores, tipos de acción y garantías. */
export function ayudaHTML() {
  const filas = [
    ['ok', 'fa-plus', 'Creó', 'Algo nuevo: una ficha, una noticia, un resultado.'],
    ['warn', 'fa-pen', 'Editó', 'Cambió un dato. Verás el valor de antes y el de después.'],
    ['oculto', 'fa-eye-slash', 'Ocultó', 'Lo retiró de la vista sin perderlo (p. ej. una noticia pasó a borrador).'],
    ['bad', 'fa-trash', 'Borró', 'Lo eliminó. El registro conserva una copia de sus datos.'],
    ['rol', 'fa-user-shield', 'Rol', 'Cambió el rol de una cuenta (siempre con un motivo escrito).'],
  ];
  return `<div class="grid sm:grid-cols-2 gap-2">${filas.map(([t, ic, nom, txt]) => `<div class="flex items-start gap-2.5 rounded-lg border-l-4 ${tono(t).borde} bg-black/25 px-3 py-2">
      <span class="w-7 h-7 rounded-full border grid place-items-center text-xs shrink-0 ${tono(t).icono}"><i class="fa-solid ${ic}"></i></span>
      <p class="text-xs text-gray-300"><b class="text-white">${nom}.</b> ${txt}</p></div>`).join('')}</div>
    <ul class="mt-3 space-y-1 text-xs text-gray-400 list-disc pl-5">
      <li><b class="text-gray-200">Inalterable:</b> nadie puede editar ni borrar este registro, ni siquiera un administrador desde la web.</li>
      <li><b class="text-gray-200">Quién y cuándo:</b> cada línea dice la persona, su rol en ese momento y la hora de Lima.</li>
      <li><b class="text-gray-200">«Sistema»:</b> cambios hechos directamente desde el panel de Supabase, sin pasar por la web.</li>
      <li><b class="text-gray-200">Qué ve cada rol:</b> el administrador ve todo; el moderador solo sus propias acciones.</li></ul>`;
}

/** Barras por día + una tarjeta por persona con su desglose. */
export function resumenHTML(r, { dias = 7, esAdmin = false } = {}) {
  const chips = [7, 30].map((d) => `<button type="button" data-dias="${d}" aria-pressed="${d === dias}" class="adv-chip !min-h-8 ${d === dias ? '!border-galaxy-400' : ''}">${d} días</button>`).join('');
  const cadaN = r.serie.length > 14 ? 5 : 1;
  const barras = r.serie.map((s, i) => {
    const h = s.total ? Math.max(10, Math.round((s.total / r.maximo) * 100)) : 3;
    const etiqueta = i % cadaN === 0 || i === r.serie.length - 1 ? String(Number(s.clave.slice(8))) : '';
    return `<div class="flex-1 min-w-0 flex flex-col items-center gap-1" title="${e(s.clave)} · ${s.total} acción${s.total === 1 ? '' : 'es'}">
      <div class="w-full h-16 flex items-end"><div class="w-full rounded-t ${s.total ? 'bg-galaxy-400/80' : 'bg-white/10'}" style="height:${h}%"></div></div>
      <span class="text-[9px] text-gray-500 h-3">${etiqueta}</span></div>`;
  }).join('');
  const SEG = [['creadas', 'ok', 'Creó'], ['editadas', 'warn', 'Editó'], ['ocultadas', 'oculto', 'Ocultó'], ['borradas', 'bad', 'Borró'], ['roles', 'rol', 'Roles']];
  const personas = r.personas.length ? r.personas.map((p) => `<article class="rounded-xl border border-galaxy-border/80 bg-galaxy-panel p-3 space-y-2">
      <div class="flex items-center gap-2.5">${avatarMini(p.nombre, p.avatar)}
        <div class="min-w-0 flex-1"><p class="font-display font-bold text-white text-sm truncate">${e(p.nombre)}</p><p class="text-[11px] text-gray-400">${p.rol ? rolBadge(p.rol) : '<span class="text-gray-500">Sistema</span>'}</p></div>
        <div class="text-right"><p class="font-display font-extrabold text-xl text-galaxy-400 leading-none">${p.total}</p><p class="text-[10px] text-gray-500">acciones</p></div></div>
      <div class="flex h-2 rounded-full overflow-hidden bg-white/10" role="img" aria-label="${e(SEG.filter(([k]) => p[k]).map(([k, , n]) => `${n} ${p[k]}`).join(', '))}">${SEG.filter(([k]) => p[k]).map(([k, t]) => `<span class="${tono(t).barra}" style="width:${(p[k] / Math.max(1, p.total)) * 100}%"></span>`).join('')}</div>
      <p class="text-[11px] text-gray-400 flex flex-wrap gap-x-3 gap-y-0.5">${SEG.filter(([k]) => p[k]).map(([k, t, n]) => `<span><i class="inline-block w-2 h-2 rounded-full ${tono(t).barra} mr-1"></i>${n} ${p[k]}</span>`).join('')}</p>
      <div class="flex items-center justify-between gap-2"><span class="text-[11px] text-gray-500">${p.ultima ? `Última acción: ${e(tiempoRelativo(p.ultima))}` : ''}</span>
        ${esAdmin && p.actorId ? `<button type="button" data-actor="${e(p.actorId)}" class="adv-chip !min-h-7 !text-[11px]">Ver sus acciones</button>` : ''}</div></article>`).join('')
    : vacio('Aún no hay actividad del staff en este periodo. Cuando un moderador o administrador cree, edite u oculte algo, aparecerá aquí.');
  return `<div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-display font-bold text-white uppercase tracking-wider text-sm"><i class="fa-solid fa-chart-column text-galaxy-400 mr-2"></i>Actividad del staff</h2><div class="flex gap-1.5" role="group" aria-label="Periodo">${chips}</div></div>
    <div class="rounded-xl border border-galaxy-border/80 bg-galaxy-panel p-3"><p class="text-[11px] text-gray-400 mb-2">Acciones por día · <b class="text-white">${r.total}</b> en los últimos ${r.dias} días</p><div class="flex gap-1">${barras}</div></div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">${personas}</div>`;
}

/** Chips de acción + selectores de sección, persona y fecha. */
export function filtrosHTML(f, personas = [], esAdmin = false) {
  const chip = (valor, texto, icono) => `<button type="button" data-accion="${e(valor)}" aria-pressed="${f.accion === valor}" class="adv-chip !min-h-8 ${f.accion === valor ? '!border-galaxy-400' : ''}">${icono ? `<i class="fa-solid ${icono} mr-1"></i>` : ''}${e(texto)}</button>`;
  const opt = (v, t, sel) => `<option value="${e(v)}"${sel ? ' selected' : ''}>${e(t)}</option>`;
  const secciones = FILTRO_SECCIONES.filter((s, i, a) => a.findIndex((x) => x.etiqueta === s.etiqueta) === i);
  return `<div class="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de acción">${chip('', 'Todo')}${FILTRO_ACCIONES.map((a) => chip(a.accion, a.etiqueta, a.icono)).join('')}</div>
    <div class="grid sm:grid-cols-3 gap-2">
      <div><label class="label" for="aud-seccion">Sección</label><select id="aud-seccion" class="field"><option value="">Todas</option>${secciones.map((s) => opt(s.tabla, s.etiqueta, f.tabla === s.tabla)).join('')}</select></div>
      ${esAdmin ? `<div><label class="label" for="aud-persona">Persona</label><select id="aud-persona" class="field"><option value="">Todas</option>${personas.filter((p) => p.actorId).map((p) => opt(p.actorId, p.nombre, f.actor === p.actorId)).join('')}</select></div>` : '<div class="hidden sm:block"></div>'}
      <div><label class="label" for="aud-rango">Fecha</label><select id="aud-rango" class="field">${[['todo', 'Todo el tiempo'], ['hoy', 'Hoy'], ['7', 'Últimos 7 días'], ['30', 'Últimos 30 días']].map(([v, t]) => opt(v, t, f.rango === v)).join('')}</select></div></div>`;
}

function detalleCambios(d) {
  if (!d.cambios.length) return '';
  const soloDespues = d.accion === 'crear'; const soloAntes = d.accion === 'borrar';
  const filas = d.cambios.map((c) => `<tr class="border-t border-galaxy-border/40"><th scope="row" class="py-1.5 pr-3 text-left font-semibold text-gray-300 align-top">${e(c.etiqueta)}</th>
    ${soloDespues ? '' : `<td class="py-1.5 pr-3 align-top ${c.tipo === 'nuevo' ? 'text-gray-500' : 'text-rose-300 line-through decoration-rose-400/40'} break-words">${e(c.antes)}</td>`}
    ${soloAntes ? '' : `<td class="py-1.5 align-top ${c.tipo === 'quitado' ? 'text-gray-500' : 'text-emerald-300'} break-words">${e(c.despues)}</td>`}</tr>`).join('');
  const cab = `<tr><th class="text-left text-[10px] uppercase tracking-wider text-gray-500 pb-1">Dato</th>${soloDespues ? '' : `<th class="text-left text-[10px] uppercase tracking-wider text-gray-500 pb-1">${soloAntes ? 'Valor que tenía' : 'Antes'}</th>`}${soloAntes ? '' : `<th class="text-left text-[10px] uppercase tracking-wider text-gray-500 pb-1">${soloDespues ? 'Valor guardado' : 'Después'}</th>`}</tr>`;
  return `<details class="mt-2 group"><summary class="cursor-pointer text-[11px] text-galaxy-400 hover:underline select-none">Ver detalle (${d.cambios.length})</summary>
    <div class="mt-1.5 overflow-x-auto"><table class="w-full text-xs"><thead>${cab}</thead><tbody>${filas}</tbody></table></div></details>`;
}

export function entradaHTML(d, ahora = Date.now()) {
  const t = tono(d.tono);
  return `<article class="flex gap-3 rounded-xl border border-galaxy-border/70 border-l-4 ${t.borde} bg-galaxy-panel px-3 py-2.5" data-aud-id="${d.id}">
    <span class="w-9 h-9 rounded-full border grid place-items-center text-sm shrink-0 ${t.icono}" aria-hidden="true"><i class="fa-solid ${d.icono}"></i></span>
    <div class="min-w-0 flex-1">
      <p class="text-sm text-gray-200 leading-snug"><b class="text-white">${e(d.actor)}</b> ${d.actorRol ? rolBadge(d.actorRol) : ''} ${e(d.verbo)} ${e(d.objeto)}${d.titulo ? ` <b class="text-white">«${e(d.titulo)}»</b>` : ''}</p>
      <p class="text-[11px] text-gray-500 mt-0.5"><i class="fa-solid ${e(d.iconoTabla)} mr-1"></i>${e(d.seccion)} · ${e(horaLima(d.momento))} · ${e(tiempoRelativo(d.momento, ahora))}</p>
      ${d.corto ? `<p class="mt-1 text-xs text-gray-300 break-words">${e(d.corto)}</p>` : ''}
      ${d.motivo ? `<p class="mt-1 text-xs text-violet-300 break-words"><i class="fa-solid fa-comment-dots mr-1"></i>Motivo: ${e(d.motivo)}</p>` : ''}
      ${detalleCambios(d)}</div></article>`;
}

/** Línea de tiempo agrupada por día (Hoy, Ayer, fecha). */
export function lineaHTML(entradas, ahora = Date.now()) {
  if (!entradas.length) return vacio('No hay acciones con estos filtros.');
  return agruparPorDia(entradas, ahora).map((g) => `<section aria-label="${e(g.etiqueta)}" class="space-y-2">
    <h3 class="sticky top-14 z-10 -mx-1 px-1 py-1 bg-galaxy-deep/90 backdrop-blur text-[11px] uppercase tracking-[.2em] text-gray-400 capitalize">${e(g.etiqueta)} <span class="text-gray-600">· ${g.entradas.length}</span></h3>
    ${g.entradas.map((d) => entradaHTML(d, ahora)).join('')}</section>`).join('');
}

const filaCuenta = (c, yo, extra = '') => `<li class="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-galaxy-panel border border-galaxy-border/80">${avatarMini(c.nombre, c.avatar)}
    <div class="min-w-0 flex-1"><p class="font-display font-bold text-white text-sm truncate">${e(c.nombre)}${c.id === yo ? ' <span class="text-[10px] text-gray-500 normal-case">(tú)</span>' : ''}</p><p class="text-[11px] text-gray-400 truncate">${c.username ? `@${e(c.username)}` : ''}</p></div>
    ${rolBadge(c.rol)}${extra}</li>`;
const botonCambiar = (c, yo) => (c.id === yo ? '<span class="text-[10px] text-gray-500 max-w-24 leading-tight" title="Para no quedarte sin acceso, tu propio rol lo cambia otra cuenta admin.">No puedes cambiar tu propio rol</span>'
  : `<button type="button" data-rol-cuenta="${e(c.id)}" class="adv-chip !min-h-8 !text-[11px]">Cambiar rol</button>`);

/** Resultados del buscador de cuentas: `null` = aún no se buscó nada. */
export function resultadosHTML(resultados, yo = null) {
  if (resultados === null) return '';
  return resultados.length ? `<ul class="space-y-2 pt-1">${resultados.map((c) => filaCuenta(c, yo, botonCambiar(c, yo))).join('')}</ul>` : '<p class="text-xs text-gray-500 pt-1">No encontré cuentas con ese nombre.</p>';
}

/** Equipo actual (cuentas con rol) + buscador para dar un rol a otra cuenta. Solo admin. */
export function equipoHTML(equipo, yo = null, resultados = null) {
  const lista = equipo.length ? equipo.map((c) => filaCuenta(c, yo, botonCambiar(c, yo))).join('') : vacio('Todavía no hay cuentas con rol.');
  return `<ul class="space-y-2">${lista}</ul>
    <div class="rounded-xl border border-galaxy-border/60 bg-black/25 p-3 space-y-1.5">
      <label class="label" for="eq-buscar">Dar o quitar un rol a otra cuenta</label>
      <input id="eq-buscar" type="search" autocomplete="off" maxlength="30" class="field" placeholder="Escribe el @usuario o el nombre (mín. 2 letras)">
      <div id="eq-res">${resultadosHTML(resultados, yo)}</div></div>`;
}

/** Contenido del modal «Cambiar rol»: una opción por rol con su explicación y un motivo obligatorio. */
export function modalRolHTML(cuenta) {
  return `<form id="rol-form" class="p-5 sm:p-6 space-y-4" novalidate>
    <div class="flex items-start justify-between border-b border-galaxy-border pb-3"><div><span class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-widest">Roles</span>
      <h3 class="font-display font-bold text-xl text-white uppercase">Rol de ${e(cuenta.nombre)}</h3><p class="text-xs text-gray-400 mt-0.5">Ahora es ${rolBadge(cuenta.rol)}</p></div>
      <button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white text-xl p-1"><i class="fa-solid fa-xmark"></i></button></div>
    <fieldset class="space-y-1.5"><legend class="label">Nuevo rol</legend>
      ${[...ROLES].reverse().map((r) => { const i = ROL_INFO[r]; return `<label class="flex items-start gap-2.5 rounded-lg border border-galaxy-border/60 bg-black/20 px-3 py-2 cursor-pointer has-[:checked]:border-galaxy-400 has-[:checked]:bg-galaxy-400/10">
        <input type="radio" name="rol" value="${r}" class="mt-1 accent-cyan-400"${r === cuenta.rol ? ' checked' : ''}>
        <span class="text-xs"><b class="text-white"><i class="fa-solid ${i.icono} mr-1 text-galaxy-400"></i>${e(i.etiqueta)}</b><span class="block text-gray-400">${e(i.descripcion)}</span></span></label>`; }).join('')}</fieldset>
    <div><label class="label" for="rol-motivo">Motivo <span class="text-gray-500 normal-case">(obligatorio, queda en la auditoría)</span></label>
      <textarea id="rol-motivo" class="field" rows="2" maxlength="300" placeholder="Ej: Colaborará moderando el chat de la liga"></textarea></div>
    <ul id="rol-err" class="text-xs text-rose-400 space-y-0.5" role="alert"></ul>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" id="rol-guardar" class="btn btn-primary">Guardar rol</button></div></form>`;
}

export { ACCIONES };
