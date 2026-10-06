// Autocompletado de @menciones: al escribir «@an» en un campo marcado con data-menciones, sugiere personas (buscar_personas) y completa «@usuario ».
// Delegado en `document`: funciona aunque la página repinte el campo. Si algo falla (sin sesión, sin migración 034, sin red) simplemente no sugiere.
import { escapeHTML } from '../../core/dom.js';
import { avatarHTML } from '../../core/avatar.js';
import { mencionEnCursor, insertarMencion } from '../../core/social.js';
import * as api from './api.js';

const ESPERA_MS = 250, MAX = 5;
const E = { campo: null, lista: [], sel: 0, req: 0, timer: null, caja: null };
let iniciado = false;

function cerrar() { clearTimeout(E.timer); E.req++; E.lista = []; E.caja?.remove(); E.caja = null; }

function posicionar() {
  if (!E.caja || !E.campo?.isConnected) { cerrar(); return; }
  const r = E.campo.getBoundingClientRect();
  Object.assign(E.caja.style, { position: 'fixed', left: `${Math.max(8, r.left)}px`, top: `${r.bottom + 4}px`, width: `${Math.min(Math.max(r.width, 220), 340)}px`, zIndex: 80 });
}

function pintar() {
  if (!E.lista.length) { cerrar(); return; }
  if (!E.caja) { E.caja = document.createElement('div'); E.caja.id = 'mencion-lista'; E.caja.setAttribute('role', 'listbox'); E.caja.className = 'rounded-xl border border-galaxy-border bg-galaxy-panel shadow-2xl overflow-hidden'; document.body.appendChild(E.caja); }
  E.caja.innerHTML = E.lista.map((p, i) => `<div role="option" aria-selected="${i === E.sel}" data-i="${i}" class="flex items-center gap-2 px-3 py-2 cursor-pointer ${i === E.sel ? 'bg-galaxy-600/30' : 'hover:bg-white/5'}">
    <span class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-galaxy-card border border-galaxy-border shrink-0">${avatarHTML(p.avatar, p.nombre, 28)}</span>
    <span class="min-w-0"><b class="block text-xs text-white truncate">${escapeHTML(p.nombre)}</b><span class="block text-[12px] text-gray-400 truncate">@${escapeHTML(p.username)}</span></span></div>`).join('');
  posicionar();
}

function elegir(i) {
  const p = E.lista[i]; const c = E.campo; if (!p || !c) return;
  const men = mencionEnCursor(c.value, c.selectionStart); if (!men) { cerrar(); return; }
  const r = insertarMencion(c.value, men, p.username);
  c.value = r.texto; c.setSelectionRange(r.pos, r.pos); cerrar(); c.focus();
  c.dispatchEvent(new Event('input', { bubbles: true }));       // contadores y validaciones de la página se enteran
}

async function sugerir(campo, consulta) {
  const req = ++E.req;
  try { const r = await api.buscarPersonas(consulta, MAX); if (req !== E.req || campo !== E.campo) return; E.lista = r; E.sel = 0; pintar(); }
  catch (e) { if (req === E.req) { console.warn('[menciones] sin sugerencias:', e.message); cerrar(); } }
}

export function initMencionAuto() {
  if (iniciado) return; iniciado = true;
  document.addEventListener('input', (e) => {
    const campo = e.target.closest?.('[data-menciones]'); if (!campo) return;
    E.campo = campo; clearTimeout(E.timer);
    const men = mencionEnCursor(campo.value, campo.selectionStart);
    if (!men || men.consulta.length < 2) { cerrar(); return; }
    E.timer = setTimeout(() => sugerir(campo, men.consulta), ESPERA_MS);
  });
  // Fase de CAPTURA y stopPropagation: con el selector abierto, Enter/Tab/flechas/Escape son DEL SELECTOR. Si llegaran al campo, la página
  // (p. ej. «Enter envía la respuesta») enviaría un texto a medias.
  document.addEventListener('keydown', (e) => {
    if (!E.caja || e.target !== E.campo) return;
    const consumir = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { consumir(); E.sel = (E.sel + (e.key === 'ArrowDown' ? 1 : -1) + E.lista.length) % E.lista.length; pintar(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { consumir(); elegir(E.sel); }
    else if (e.key === 'Escape') { consumir(); cerrar(); }
  }, true);
  document.addEventListener('mousedown', (e) => {                // mousedown (no click): el campo no pierde el foco antes de elegir
    const op = e.target.closest?.('#mencion-lista [data-i]');
    if (op) { e.preventDefault(); elegir(Number(op.dataset.i)); } else if (E.caja && !e.target.closest('[data-menciones]')) cerrar();
  });
  document.addEventListener('focusout', (e) => { if (e.target === E.campo) setTimeout(() => { if (document.activeElement !== E.campo) cerrar(); }, 150); });
  window.addEventListener('resize', posicionar); window.addEventListener('scroll', posicionar, true);
}
