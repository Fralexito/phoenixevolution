// Panel «Primeros pasos» (propuesta 2 del rediseño): anillo de progreso + lista de 5 pasos con «por qué importa».
// Se usa en /club/ y en el Inicio con sesión. Se oculta solo al completar los 5, o si la persona pulsa «Ocultar» (se recuerda en el navegador).
import { escapeHTML } from '../core/dom.js';
import { porcentajeClub, siguienteClub, faltanClub, pasosClub } from '../core/club.js';
import { supabase } from '../core/supabase.js';
import { misDispositivos } from './salas/api.js';

/** Lee lo necesario para los pasos (PCs vinculadas y si ya jugó). Nunca lanza. → { pasos, pcs } */
export async function pasosDe(uid, profile) {
  let pcs = null; try { pcs = (await misDispositivos()).filter((d) => !d.revocado).length; } catch (e) { console.warn('[primeros pasos] dispositivos:', e?.message ?? e); }
  let jugo = false; try { const { count } = await supabase.from('retos_matchmaking').select('id', { count: 'exact', head: true }).eq('estado', 'FINALIZADO').or(`retador_id.eq.${uid},rival_id.eq.${uid}`); jugo = (count ?? 0) > 0; } catch (e) { console.warn('[primeros pasos] jugó:', e?.message ?? e); }
  return { pasos: pasosClub({ perfilCompleto: !!profile?.perfil_completo, avatar: !!profile?.avatar_url, ficha: !!profile?.ficha_id, pc: !!pcs, jugo }), pcs };
}

const KEY = 'pes-primeros-pasos-oculto';
const oculto = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const ocultar = () => { try { localStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ } };

/**
 * Pinta el panel dentro de `box`. pasos = pasosClub(ctx). opts: { href(path) → url, onProfile() abre «Mi perfil», compacto:true (Inicio) }.
 * Devuelve true si quedó visible.
 */
export function montarPrimerosPasos(box, pasos, { href = (p) => p, onProfile = null, compacto = false } = {}) {
  if (!box) return false;
  const faltan = faltanClub(pasos);
  if (!faltan || oculto()) { box.hidden = true; return false; }
  const pct = porcentajeClub(pasos); const sig = siguienteClub(pasos);
  const r = 44, c = 2 * Math.PI * r, falta = c * (1 - pct / 100);
  const item = (p) => {
    const estado = p.hecho ? 'ok' : (p.id === sig?.id ? 'sig' : '');
    const boton = p.hecho ? '<span class="pp-hecho">hecho</span>'
      : p.accion ? `<button type="button" class="in-btn ${estado === 'sig' ? 'in-btn-p' : 'in-btn-s'} pp-btn" data-pp-accion="${p.accion}">${escapeHTML(p.boton || 'Ir')}</button>`
      : `<a href="${href(p.href)}" class="in-btn ${estado === 'sig' ? 'in-btn-p' : 'in-btn-s'} pp-btn">${escapeHTML(p.boton || 'Ir')}</a>`;
    return `<div class="pp-it ${estado}"><span class="pp-ck">${p.hecho ? '<i class="fa-solid fa-check"></i>' : ''}</span>
      <div class="min-w-0"><b>${escapeHTML(p.titulo)}</b><p>${escapeHTML(p.ayuda)}</p>${p.porque && !p.hecho ? `<small><i class="fa-regular fa-lightbulb"></i>Por qué importa: ${escapeHTML(p.porque)}</small>` : ''}</div>${boton}</div>`;
  };
  box.innerHTML = `<div class="pp ${compacto ? 'compacto' : ''}">
    <div class="pp-izq">
      <svg class="pp-aro" viewBox="0 0 100 100" role="img" aria-label="Progreso ${pct}%"><circle cx="50" cy="50" r="${r}" class="pp-aro-fondo"/><circle cx="50" cy="50" r="${r}" class="pp-aro-barra" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${falta.toFixed(1)}"/><text x="50" y="47" class="pp-aro-num">${pct}%</text><text x="50" y="62" class="pp-aro-txt">listo</text></svg>
      <p>Te falta${faltan === 1 ? '' : 'n'} <b>${faltan}</b> paso${faltan === 1 ? '' : 's'}. Esta lista desaparece sola cuando termines.</p>
      <button type="button" class="in-btn in-btn-g pp-ocultar" data-pp-ocultar><i class="fa-regular fa-eye-slash"></i> Ocultar por ahora</button>
    </div>
    <div class="pp-lista"><span class="in-eti">Primeros pasos</span>${pasos.map(item).join('')}</div>
  </div>`;
  box.hidden = false;
  box.querySelector('[data-pp-ocultar]')?.addEventListener('click', () => { ocultar(); box.hidden = true; });
  box.querySelectorAll('[data-pp-accion]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.ppAccion === 'profile' && onProfile) onProfile(); }));
  return true;
}
