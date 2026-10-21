// Sección «Patrocinadores» de Moderación (migración 139, ronda 363). Solo admin: crear, editar, pausar y quitar (archiva, no borra).
import { supabase } from '../core/sistema/supabase.js';
import { onSession, isAdmin } from '../core/sistema/session.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar } from '../core/sistema/dialogo.js';
import { escapeHTML as esc, safeUrl } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { validarPatrocinio, vigente, TIPOS } from '../core/economia/patrocinios.js';
import { olvidarPatrocinios } from './patrocinios.js';

const $ = (id) => document.getElementById(id);
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
let lista = [];

async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(/does not exist|Could not find/i.test(error.message) ? 'Falta aplicar la migración 139 en Supabase.' : error.message);
  return data;
}

function limpiar() {
  $('pat-id').value = ''; ['pat-obj', 'pat-nombre', 'pat-logo', 'pat-web', 'pat-hasta', 'pat-nota'].forEach((id) => { $(id).value = ''; });
  $('pat-tipo').value = 'torneo'; $('pat-desde').value = hoy(); $('pat-activo').checked = true; $('pat-nuevo').hidden = true; $('pat-guardar').textContent = 'Guardar';
}

async function pintar() {
  const box = $('pat-lista'); if (!box) return;
  try { lista = await rpc('patrocinios_admin_listar') ?? []; } catch (e) { box.innerHTML = `<p class="text-xs text-amber-300">${esc(e.message)}</p>`; return; }
  box.innerHTML = lista.map((p) => {
    const ruta = p.tipo === 'torneo' ? href(`torneo/?id=${p.objetivo_id}`) : href('clanes/');
    const estado = vigente(p, hoy()) ? '<span class="text-emerald-300">se ve ahora</span>' : '<span class="text-gray-500">no se ve</span>';
    const logo = safeUrl(p.logo_url ?? '');
    return `<div class="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
      ${logo ? `<img src="${esc(logo)}" alt="" class="h-8 w-8 object-contain rounded bg-black/30">` : ''}
      <div class="min-w-0 flex-1"><p class="text-sm text-white font-bold break-words">${esc(p.nombre)}</p>
      <p class="text-xs text-gray-400"><a class="hover:underline" href="${ruta}">${esc(TIPOS[p.tipo] ?? p.tipo)} ${esc(p.objetivo_id)}</a> · ${esc(p.desde)}${p.hasta ? ` → ${esc(p.hasta)}` : ''} · ${estado}${p.nota ? ` · ${esc(p.nota)}` : ''}</p></div>
      <button type="button" class="btn btn-ghost !min-h-9 !text-xs" data-pat-editar="${p.id}">Editar</button>
      <button type="button" class="btn btn-ghost !min-h-9 !text-xs" data-pat-borrar="${p.id}">Quitar</button></div>`;
  }).join('') || '<p class="text-xs text-gray-400">Todavía no hay patrocinadores.</p>';
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'pat-form') return; e.preventDefault();
  const d = { tipo: $('pat-tipo').value, objetivo: $('pat-obj').value, nombre: $('pat-nombre').value, logo: $('pat-logo').value, enlace: $('pat-web').value, desde: $('pat-desde').value, hasta: $('pat-hasta').value };
  const err = validarPatrocinio(d); if (err) { toast(err, 'error'); return; }
  try {
    await rpc('patrocinio_guardar', { p_id: $('pat-id').value ? Number($('pat-id').value) : null, p_tipo: d.tipo, p_objetivo: Number(d.objetivo), p_nombre: d.nombre.trim(), p_logo: d.logo.trim(), p_enlace: d.enlace.trim(),
      p_desde: d.desde || null, p_hasta: d.hasta || null, p_activo: $('pat-activo').checked, p_nota: $('pat-nota').value.trim() });
    toast('Patrocinador guardado.', 'ok'); olvidarPatrocinios(); limpiar(); await pintar();
  } catch (er) { toast(er.message, 'error'); }
});
document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-pat-editar]'); const bo = e.target.closest('[data-pat-borrar]');
  if (e.target.closest('#pat-nuevo')) { limpiar(); return; }
  if (ed) {
    const p = lista.find((x) => String(x.id) === ed.dataset.patEditar); if (!p) return;
    $('pat-id').value = p.id; $('pat-tipo').value = p.tipo; $('pat-obj').value = p.objetivo_id; $('pat-nombre').value = p.nombre; $('pat-logo').value = p.logo_url ?? ''; $('pat-web').value = p.enlace ?? '';
    $('pat-desde').value = p.desde ?? ''; $('pat-hasta').value = p.hasta ?? ''; $('pat-nota').value = p.nota ?? ''; $('pat-activo').checked = p.activo !== false;
    $('pat-nuevo').hidden = false; $('pat-guardar').textContent = 'Guardar cambios'; $('pat-form').scrollIntoView({ block: 'nearest' });
  }
  if (bo) {
    if (!(await confirmar('¿Quitar este patrocinador? Su logo deja de verse en la web. El registro queda guardado en la base como historial.', { aceptar: 'Quitar', peligro: true }))) return;
    try { await rpc('patrocinio_borrar', { p_id: Number(bo.dataset.patBorrar) }); toast('Patrocinador quitado.', 'ok'); olvidarPatrocinios(); await pintar(); } catch (er) { toast(er.message, 'error'); }
  }
});
onSession(() => { const c = $('pat-card'); if (!c) return; c.hidden = !isAdmin(); if (!c.hidden) { limpiar(); pintar(); } });
