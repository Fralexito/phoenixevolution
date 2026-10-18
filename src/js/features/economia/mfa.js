// Verificación en dos pasos (MFA con app de códigos) para el administrador del dinero. Esquema: features/economia/recargas → features/economia/mfa → Supabase Auth.
// La base (admin_seguro, migración 112) exige nivel aal2 cuando admin_exige_mfa='true'. Aquí se registra el factor, se confirma el código y se sube la sesión a aal2.
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { openModal, closeModal } from '../../core/sistema/modal.js';
import { supabase } from '../../core/sistema/supabase.js';
import { esDemo } from './api.js';
import { resumenMfa } from '../../core/economia/economia.js';

let C = null; // contexto de la tienda: { S, cargar }
export const iniciar = (ctx) => { C = ctx; };
const cab = (t) => `<div class="flex items-start justify-between border-b border-galaxy-border pb-3"><h3 class="font-display font-bold text-lg text-white uppercase">${escapeHTML(t)}</h3><button type="button" data-close aria-label="Cerrar" class="text-gray-400 hover:text-white px-2"><i class="fa-solid fa-xmark"></i></button></div>`;
const FALLO = 'No se pudo completar la verificación. Inténtalo de nuevo.';

/** Estado actual: { estado:'sin_activar'|'falta_codigo'|'activa', factorId, pendientes, demo }. */
export async function estado() {
  if (esDemo()) return { estado: 'sin_activar', factorId: null, pendientes: [], demo: true };
  try {
    const [f, a] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
    if (f.error) throw f.error;
    return { ...resumenMfa(f.data?.all ?? [], a.data?.currentLevel), demo: false };
  } catch (e) { console.error('[mfa] estado:', e); return { estado: 'error', factorId: null, pendientes: [], demo: false }; }
}

export function mfaHTML(m) {
  const s = m ?? { estado: 'error' };
  const cuerpo = {
    sin_activar: `<p class="text-xs text-amber-200 mt-1"><i class="fa-solid fa-triangle-exclamation"></i> Aún no tienes la verificación en dos pasos. Actívala antes de abrir los pagos con dinero real.</p><button type="button" data-mfa="activar" class="btn btn-primary !min-h-9 !px-3 !text-xs mt-2">Activar verificación en dos pasos</button>`,
    falta_codigo: `<p class="text-xs text-amber-200 mt-1"><i class="fa-solid fa-lock"></i> Tu cuenta tiene MFA, pero esta sesión aún no lo confirmó. Escribe el código de tu app para aprobar pagos o encender los pagos.</p><button type="button" data-mfa="confirmar" class="btn btn-primary !min-h-9 !px-3 !text-xs mt-2">Escribir mi código</button>`,
    activa: `<p class="text-xs text-emerald-300 mt-1"><i class="fa-solid fa-circle-check"></i> Verificación en dos pasos activa en esta sesión.</p>`,
    error: `<p class="text-xs text-rose-300 mt-1">No se pudo leer el estado de la verificación en dos pasos.</p>`,
  }[s.estado] ?? '';
  return `<section class="glass-panel rounded-2xl p-4"><h3 class="font-display font-bold text-white text-sm uppercase tracking-wider"><i class="fa-solid fa-key text-cyan-300"></i> Seguridad de tu cuenta</h3>
    <p class="text-[12px] text-gray-400 mt-1">Con la verificación en dos pasos, aprobar pagos pide además un código de 6 números de tu app (Google Authenticator, Microsoft Authenticator, Authy…).</p>${cuerpo}${s.demo ? '<p class="text-[12px] text-gray-500 mt-1">En la demostración no se conecta a Supabase.</p>' : ''}</section>`;
}

/** Devuelve true si el clic era de MFA. */
export function click(ev) {
  const b = ev.target.closest('button[data-mfa]'); if (!b) return false;
  if (esDemo()) { toast('En la demostración no se puede activar el MFA real.', 'ok'); return true; }
  if (b.dataset.mfa === 'activar') activar();
  else if (b.dataset.mfa === 'confirmar') pedirCodigo(C.S.mfa?.factorId);
  return true;
}

async function activar() {
  try {
    // Limpia intentos a medias de antes (factores sin verificar) para que no se acumulen.
    const f = await supabase.auth.mfa.listFactors();
    for (const x of (f.data?.all ?? []).filter((y) => y.factor_type === 'totp' && y.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Phoenix administrador' });
    if (error) throw error;
    const m = openModal(`<form id="mfa-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Activar verificación en dos pasos')}
      <ol class="text-xs text-gray-300 list-decimal pl-4 space-y-1"><li>Abre tu app de códigos y elige «Añadir cuenta».</li><li>Escanea este código QR (o escribe la clave de abajo).</li><li>Escribe aquí el código de 6 números que te muestre.</li></ol>
      <div class="flex justify-center"><img alt="Código QR para la app de verificación" class="bg-white rounded-xl p-2" width="180" height="180" src="${escapeHTML(data.totp.qr_code)}"></div>
      <p class="text-[12px] text-gray-400 text-center">Clave manual: <b class="text-white select-all break-all">${escapeHTML(data.totp.secret)}</b></p>
      <div><label class="label" for="mfa-cod">Código de 6 números</label><input id="mfa-cod" class="field" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
      <p id="mfa-err" hidden role="alert" class="text-xs text-rose-400"></p>
      <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Confirmar y activar</button></div></form>`, { id: 'tienda-modal' });
    enviar(m, data.id, 'Verificación en dos pasos activada.');
  } catch (e) { console.error('[mfa] activar:', e); toast(e?.message || FALLO, 'error'); }
}

/** Pide el código de la app para subir la sesión a aal2 (factor ya registrado). */
export function pedirCodigo(factorId) {
  if (!factorId) { toast('Esta cuenta aún no tiene MFA. Actívalo primero.', 'error'); return; }
  const m = openModal(`<form id="mfa-form" class="p-5 sm:p-6 space-y-4" novalidate>${cab('Confirma tu código')}
    <p class="text-xs text-gray-300">Escribe el código de 6 números que muestra tu app de verificación.</p>
    <div><label class="label" for="mfa-cod">Código de 6 números</label><input id="mfa-cod" class="field" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
    <p id="mfa-err" hidden role="alert" class="text-xs text-rose-400"></p>
    <div class="flex gap-2 justify-end"><button type="button" data-close class="btn btn-ghost">Cancelar</button><button type="submit" class="btn btn-primary">Confirmar</button></div></form>`, { id: 'tienda-modal' });
  enviar(m, factorId, 'Código confirmado: sesión verificada.');
}

function enviar(m, factorId, okMsg) {
  m.querySelector('#mfa-cod').focus();
  m.querySelector('#mfa-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const err = m.querySelector('#mfa-err'), b = m.querySelector('button[type="submit"]'), code = m.querySelector('#mfa-cod').value.trim();
    const mal = (t) => { err.textContent = t; err.hidden = false; };
    if (!/^\d{6}$/.test(code)) return mal('El código tiene 6 números.');
    b.disabled = true;
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      await supabase.auth.refreshSession(); // el token nuevo ya trae aal2
      closeModal('tienda-modal'); toast(okMsg, 'ok'); await C.cargar();
    } catch (e) { console.error('[mfa] verificar:', e); mal(/invalid|expired/i.test(e?.message ?? '') ? 'Código incorrecto o vencido. Prueba con el siguiente.' : FALLO); b.disabled = false; }
  });
}
