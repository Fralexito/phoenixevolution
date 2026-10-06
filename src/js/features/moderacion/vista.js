// HTML de reportes y moderación (funciones puras: datos → texto, sin DOM → se pueden probar). TODO dato de la BD o del usuario pasa por escapeHTML.
import { escapeHTML, safeImg } from '../../core/dom.js';
import { tiempoRelativo } from '../../core/muro.js';
import {
  MOTIVOS, SANCIONES, DIAS_SUSPENSION, DETALLE_MAX, NOTA_SANCION_MAX, NOTA_OCULTAR_MAX, tipoInfo, etiquetaMotivo, esOcultable, puedeActuar, puedeLevantar, quedaTiempo,
} from '../../core/moderacion.js';
import { avatarMini, rolBadge, TONOS } from '../auditoria/vista.js';

const e = escapeHTML;
const tono = (t) => TONOS[t] ?? TONOS.neutro;
const BTN = '!min-h-9 !px-3 !text-[12px]';

/* ---------- Modales ---------- */
const cabecera = (icono, titulo, sub = '') => `<div class="flex items-start gap-3 mb-3"><span class="w-9 h-9 rounded-full border border-galaxy-400/40 bg-galaxy-600/20 text-galaxy-400 grid place-items-center shrink-0"><i class="fa-solid ${icono}"></i></span>
  <div class="min-w-0"><h2 class="font-display font-bold text-white uppercase tracking-wider text-base">${e(titulo)}</h2>${sub ? `<p class="text-xs text-gray-400 mt-0.5">${e(sub)}</p>` : ''}</div></div>`;
const pie = (etiquetaBtn, idBtn, icono = 'fa-paper-plane') => `<ul id="mod-err" class="text-xs text-rose-300 space-y-0.5 mt-2" role="alert"></ul>
  <div class="flex justify-end gap-2 mt-4"><button type="button" data-close class="btn btn-ghost ${BTN}">Cancelar</button><button type="submit" id="${idBtn}" class="btn btn-primary ${BTN}"><i class="fa-solid ${icono}"></i><span>${e(etiquetaBtn)}</span></button></div>`;

/** Formulario de «Reportar»: motivo (obligatorio) + detalle (opcional). */
export function reportarHTML({ tipo, titulo = '' } = {}) {
  const t = tipoInfo(tipo);
  const motivos = MOTIVOS.map((m) => `<label class="flex items-center gap-2.5 rounded-lg border border-galaxy-border bg-black/25 px-3 py-2 cursor-pointer hover:border-galaxy-400/60 has-[:checked]:border-galaxy-400 has-[:checked]:bg-galaxy-600/15">
      <input type="radio" name="motivo" value="${e(m.id)}" class="accent-galaxy-400"><i class="fa-solid ${m.icono} w-4 text-center text-gray-400"></i><span class="text-sm text-gray-100">${e(m.etiqueta)}</span></label>`).join('');
  return `<form id="mod-form" novalidate>${cabecera('fa-flag', `Reportar ${t.etiqueta.toLowerCase()}`, titulo)}
    <fieldset class="space-y-1.5"><legend class="text-[12px] text-gray-400 mb-1">¿Qué problema hay con ${e(t.articulo)}?</legend>${motivos}</fieldset>
    <label class="block mt-3"><span class="text-[12px] text-gray-400">Cuéntanos más (opcional, máx. ${DETALLE_MAX})</span>
      <textarea id="mod-detalle" rows="3" maxlength="${DETALLE_MAX + 100}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white" placeholder="Ej.: me escribe todos los días insultándome"></textarea></label>
    <p class="text-[12px] text-gray-500 mt-2"><i class="fa-solid fa-user-shield mr-1"></i>Tu reporte es confidencial: la persona reportada no sabrá quién lo envió.</p>
    ${pie('Enviar reporte', 'mod-enviar')}</form>`;
}

/** Formulario de «Ocultar / Mostrar» contenido (moderador+). */
export function ocultarHTML({ tipo, titulo = '', ocultar = true } = {}) {
  const t = tipoInfo(tipo);
  return `<form id="mod-form" novalidate>${cabecera(ocultar ? 'fa-eye-slash' : 'fa-eye', `${ocultar ? 'Ocultar' : 'Volver a mostrar'} ${t.etiqueta.toLowerCase()}`, titulo)}
    <p class="text-xs text-gray-300">${ocultar ? 'Dejará de verse para todos y la persona recibirá un aviso con tu motivo. No se borra: puedes mostrarlo de nuevo.' : 'Volverá a verse para todos.'}</p>
    <label class="block mt-3"><span class="text-[12px] text-gray-400">Motivo (queda en la auditoría, máx. ${NOTA_OCULTAR_MAX})</span>
      <textarea id="mod-nota" rows="2" maxlength="${NOTA_OCULTAR_MAX + 100}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white" placeholder="${ocultar ? 'Ej.: publicidad de otra comunidad' : 'Ej.: fue un error mío'}"></textarea></label>
    ${pie(ocultar ? 'Ocultar' : 'Mostrar', 'mod-enviar', ocultar ? 'fa-eye-slash' : 'fa-eye')}</form>`;
}

/** Formulario de «Sancionar» (moderador+; solo a rangos menores — la lista de opciones no depende de eso, la BD lo impone). */
export function sancionarHTML({ nombre = 'esta cuenta', rol = 'jugador', baneoPermitido = true } = {}) {
  const tipos = Object.entries(SANCIONES).filter(([id]) => id !== 'baneo' || baneoPermitido).map(([id, s], i) => `<label class="flex items-start gap-2.5 rounded-lg border border-galaxy-border bg-black/25 px-3 py-2 cursor-pointer hover:border-galaxy-400/60 has-[:checked]:border-galaxy-400 has-[:checked]:bg-galaxy-600/15">
      <input type="radio" name="tipo" value="${e(id)}" ${i === 0 ? 'checked' : ''} class="accent-galaxy-400 mt-1"><span class="min-w-0"><b class="text-sm text-white"><i class="fa-solid ${s.icono} mr-1.5 text-gray-400"></i>${e(s.etiqueta)}</b>
      <span class="block text-[12px] text-gray-400">${e(s.descripcion)}</span></span></label>`).join('');
  const dias = DIAS_SUSPENSION.map((d) => `<option value="${d}">${d} día${d === 1 ? '' : 's'}</option>`).join('');
  return `<form id="mod-form" novalidate>${cabecera('fa-gavel', 'Sancionar cuenta', `${nombre}`)}
    <p class="text-[12px] text-gray-400 mb-2">Rol de la cuenta: ${rolBadge(rol)} · solo puedes sancionar a alguien de rango menor al tuyo.</p>
    <fieldset class="space-y-1.5"><legend class="sr-only">Tipo de sanción</legend>${tipos}</fieldset>
    <label id="mod-dias-caja" class="block mt-2" hidden><span class="text-[12px] text-gray-400">Duración de la suspensión</span>
      <select id="mod-dias" class="field mt-1">${dias}</select></label>
    <label class="block mt-3"><span class="text-[12px] text-gray-400">Motivo (la persona lo verá y queda en la auditoría, máx. ${NOTA_SANCION_MAX})</span>
      <textarea id="mod-nota" rows="3" maxlength="${NOTA_SANCION_MAX + 100}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white" placeholder="Ej.: insultos reiterados en el chat"></textarea></label>
    ${pie('Aplicar sanción', 'mod-enviar', 'fa-gavel')}</form>`;
}

/** Pedir solo un motivo (resolver, descartar, levantar sanción). */
export function notaHTML({ titulo, sub = '', accion, obligatoria = true, max = 300 } = {}) {
  return `<form id="mod-form" novalidate>${cabecera('fa-pen-to-square', titulo, sub)}
    <label class="block"><span class="text-[12px] text-gray-400">Nota ${obligatoria ? '(obligatoria; queda en la auditoría)' : '(opcional)'} · máx. ${max}</span>
      <textarea id="mod-nota" rows="3" maxlength="${max + 100}" class="mt-1 w-full rounded-lg bg-black/30 border border-galaxy-border px-3 py-2 text-sm text-white"></textarea></label>
    ${pie(accion, 'mod-enviar', 'fa-check')}</form>`;
}

/* ---------- Aviso a la persona sancionada ---------- */
export function avisoSancionHTML(d) {
  if (!d) return '';
  const t = d.tipo === 'baneo' ? tono('bad') : tono('oculto');
  return `<div id="aviso-sancion" role="status" class="border-b ${t.icono.split(' ').filter((c) => c.startsWith('border-')).join(' ')} bg-black/80">
    <div class="max-w-5xl mx-auto px-4 py-2.5 flex items-start gap-3">
      <span class="w-8 h-8 rounded-full border grid place-items-center text-sm shrink-0 ${t.icono}"><i class="fa-solid ${d.tipo === 'baneo' ? 'fa-ban' : 'fa-clock'}"></i></span>
      <div class="min-w-0 text-xs"><p class="font-display font-bold text-white uppercase tracking-wider text-sm">${e(d.titulo)}${d.quedan ? ` <span class="text-gray-400 normal-case font-normal">· quedan ${e(d.quedan)}</span>` : ''}</p>
        <p class="text-gray-300">${e(d.texto)}</p>${d.motivo ? `<p class="text-gray-400 mt-0.5"><b class="text-gray-200">Motivo:</b> ${e(d.motivo)}</p>` : ''}</div></div></div>`;
}

/* ---------- Página /moderacion/ ---------- */
const chipEstado = { abierto: ['warn', 'Abierto'], resuelto: ['ok', 'Resuelto'], descartado: ['neutro', 'Descartado'] };

function contenidoReportado(r) {
  const c = r.contenido; const img = safeImg(c.imagen);
  const partes = [];
  if (c.titulo) partes.push(`<p class="text-sm font-bold text-white">${e(c.titulo)}</p>`);
  if (c.texto) partes.push(`<p class="text-sm text-gray-100 whitespace-pre-line break-words">${e(c.texto)}</p>`);
  if (img) partes.push(`<img src="${e(img)}" alt="Foto reportada" loading="lazy" referrerpolicy="no-referrer" class="mt-2 rounded-lg max-h-48 border border-galaxy-border">`);
  if (c.video) partes.push(`<p class="text-[12px] text-gray-400 mt-1 break-all"><i class="fa-solid fa-film mr-1"></i>Video: ${e(c.video)}</p>`);
  if (r.tipo === 'usuario') partes.push(`<p class="text-sm text-gray-100">Cuenta reportada: <b class="text-white">${e(c.nombre || c.usuario || r.acusado.nombre)}</b></p>`);
  return partes.length ? `<div class="rounded-lg border border-galaxy-border/70 bg-black/30 px-3 py-2">${partes.join('')}</div>` : '<p class="text-[12px] text-gray-500">(Sin copia del contenido)</p>';
}

/** Tarjeta de un reporte. `yo` = { rol, puedeModerar, urlPerfil(username) }: decide qué botones se muestran (la BD vuelve a comprobarlo). */
export function reporteHTML(r, yo = {}) {
  const t = tipoInfo(r.tipo); const [tonoEstado, textoEstado] = chipEstado[r.estado] ?? chipEstado.abierto; const ct = tono(tonoEstado);
  const abierto = r.estado === 'abierto';
  const urlPerfil = yo.urlPerfil ?? ((u) => `../perfil/?u=${encodeURIComponent(u)}`);
  const puedeSobre = !!yo.puedeModerar && r.acusado.id && puedeActuar(yo.rol, r.acusado.rol);
  const botones = [];
  if (r.acusado.username) botones.push(`<a href="${e(urlPerfil(r.acusado.username))}" target="_blank" rel="noopener" class="btn btn-ghost ${BTN}"><i class="fa-solid fa-user"></i><span>Ver perfil</span></a>`);
  if (r.acusado.id) botones.push(`<button type="button" data-act="historial" data-usuario="${e(r.acusado.id)}" data-rep="${r.id}" class="btn btn-ghost ${BTN}"><i class="fa-solid fa-clock-rotate-left"></i><span>Historial</span></button>`);
  if (yo.puedeModerar && esOcultable(r.tipo) && r.oculto !== null && puedeSobre) {
    botones.push(`<button type="button" data-act="ocultar" data-id="${r.id}" data-ocultar="${r.oculto ? '0' : '1'}" class="btn btn-ghost ${BTN}"><i class="fa-solid ${r.oculto ? 'fa-eye' : 'fa-eye-slash'}"></i><span>${r.oculto ? 'Mostrar de nuevo' : 'Ocultar'}</span></button>`);
  }
  if (abierto && puedeSobre) botones.push(`<button type="button" data-act="sancionar" data-id="${r.id}" class="btn btn-primary ${BTN}"><i class="fa-solid fa-gavel"></i><span>Sancionar</span></button>`);
  if (abierto && yo.puedeModerar) {
    botones.push(`<button type="button" data-act="resolver" data-id="${r.id}" data-estado="resuelto" class="btn btn-ghost ${BTN}"><i class="fa-solid fa-check"></i><span>Marcar resuelto</span></button>`);
    botones.push(`<button type="button" data-act="resolver" data-id="${r.id}" data-estado="descartado" class="btn btn-ghost ${BTN}"><i class="fa-solid fa-xmark"></i><span>Descartar</span></button>`);
  }
  const sancion = r.sancion ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${tono(r.sancion.tipo === 'baneo' ? 'bad' : 'oculto').chip}"><i class="fa-solid ${r.sancion.tipo === 'baneo' ? 'fa-ban' : 'fa-clock'}"></i>${r.sancion.tipo === 'baneo' ? 'Baneada' : `Suspendida${r.sancion.hasta ? ` · ${e(quedaTiempo(r.sancion.hasta))}` : ''}`}</span>` : '';
  const oculto = r.oculto === true ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${tono('oculto').chip}"><i class="fa-solid fa-eye-slash"></i>Oculto</span>` : '';
  const mismos = r.mismos > 1 ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${tono('bad').chip}"><i class="fa-solid fa-clone"></i>${r.mismos} reportes sobre esto</span>` : '';
  const cierre = !abierto ? `<p class="text-[12px] text-gray-400"><i class="fa-solid fa-circle-check mr-1"></i>${e(textoEstado)}${r.resueltoPor ? ` por <b class="text-gray-200">${e(r.resueltoPor)}</b>` : ''}${r.resueltoEn ? ` · ${e(tiempoRelativo(r.resueltoEn))}` : ''}${r.resolucion ? ` · «${e(r.resolucion)}»` : ''}</p>` : '';
  return `<article id="rep-${r.id}" data-rep="${r.id}" class="rounded-xl border-l-4 ${ct.borde} bg-galaxy-panel border border-galaxy-border p-3 sm:p-4 space-y-2.5">
    <header class="flex items-start gap-2.5">
      ${avatarMini(r.acusado.nombre, r.acusado.avatar)}
      <div class="min-w-0 flex-1"><p class="text-sm text-white font-bold truncate">${e(r.acusado.nombre)} ${rolBadge(r.acusado.rol)}</p>
        <p class="text-[12px] text-gray-500">${r.acusado.username ? `@${e(r.acusado.username)} · ` : ''}${e(tiempoRelativo(r.creado))}</p></div>
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${ct.chip}">${e(textoEstado)}</span></header>
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${tono('info').chip}"><i class="fa-solid ${t.icono}"></i>${e(t.etiqueta)}</span>
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[12px] font-bold uppercase tracking-wider ${tono('neutro').chip}">${e(etiquetaMotivo(r.motivo))}</span>${mismos}${sancion}${oculto}</div>
    ${contenidoReportado(r)}
    ${r.detalle ? `<p class="text-xs text-gray-300"><b class="text-gray-100">Detalle de quien reporta:</b> ${e(r.detalle)}</p>` : ''}
    <p class="text-[12px] text-gray-500"><i class="fa-solid fa-flag mr-1"></i>Reportado por <b class="text-gray-300">${e(r.reportante.nombre)}</b></p>
    ${cierre}
    ${botones.length ? `<div class="flex flex-wrap gap-1.5 pt-1">${botones.join('')}</div>` : ''}
    <div data-historial="${r.id}" hidden></div></article>`;
}

export const listaReportesHTML = (lista, yo) => (lista.length ? lista.map((r) => reporteHTML(r, yo)).join('')
  : '<div class="text-center py-10 px-4 text-gray-500 text-xs bg-galaxy-panel rounded-xl border border-galaxy-border"><i class="fa-solid fa-circle-check text-ok text-xl block mb-2"></i>No hay reportes aquí. ¡Todo tranquilo!</div>');

/** Historial de sanciones de una persona (dentro de la tarjeta). */
export function historialHTML(lista, yo = {}) {
  if (!lista.length) return '<p class="text-[12px] text-gray-500 py-1">Esta cuenta no tiene sanciones.</p>';
  return `<ul class="space-y-1.5 mt-1">${lista.map((s) => {
    const info = SANCIONES[s.tipo]; const activo = s.vigente; const t = tono(activo ? info.tono : 'neutro');
    const levantar = activo && yo.puedeModerar && yo.rolObjetivo !== undefined && puedeLevantar(yo.rol, yo.rolObjetivo, s.tipo)
      ? `<button type="button" data-act="levantar" data-id="${s.id}" class="btn btn-ghost ${BTN}"><i class="fa-solid fa-rotate-left"></i><span>Levantar</span></button>` : '';
    return `<li class="rounded-lg border-l-4 ${t.borde} bg-black/25 px-3 py-2 text-xs"><p class="text-gray-100"><b>${e(info.etiqueta)}</b>${s.tipo === 'suspension' && s.hasta ? ` · hasta ${e(new Date(s.hasta).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' }))}` : ''}
      ${activo ? '<span class="text-amber-300">· vigente</span>' : s.levantadaEn ? '<span class="text-gray-500">· levantada</span>' : '<span class="text-gray-500">· terminada</span>'}
      <span class="text-gray-500">· ${e(tiempoRelativo(s.creado))}${s.por ? ` · por ${e(s.por)}` : ''}</span></p>
      <p class="text-gray-300">${e(s.motivo)}</p>${s.levantadaMotivo ? `<p class="text-gray-500">Levantada: ${e(s.levantadaMotivo)}</p>` : ''}${levantar ? `<div class="mt-1.5">${levantar}</div>` : ''}</li>`;
  }).join('')}</ul>`;
}
