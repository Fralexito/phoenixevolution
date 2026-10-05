// Barrera de edad: a toda cuenta sin fecha de nacimiento se le pide una ventana que NO se puede cerrar (migración 037).
// Si la BD aún no tiene la función (migración sin aplicar) o falla la red, NO se bloquea a nadie: solo se deja un aviso en consola.
import { supabase } from '../core/supabase.js';
import { onSession, refreshProfile } from '../core/session.js';
import { openModal, closeModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { escapeHTML } from '../core/dom.js';
import { validarNacimiento, debePedirFecha, EDAD_MINIMA } from '../core/edad.js';

const ID = 'edad-modal';
let comprobado = null;      // id de usuario ya comprobado en esta página
let abierto = false;

function hoyISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

async function consultar() {
  const { data, error } = await supabase.rpc('mi_edad_estado');
  if (error) { console.warn('[edad] mi_edad_estado:', error.code, error.message); return null; }
  return data;
}

function mostrar(uid) {
  abierto = true;
  const m = openModal(`
    <form id="edad-form" class="p-6 space-y-4" novalidate>
      <div><h2 class="font-display font-bold text-2xl text-white uppercase tracking-widest"><i class="fa-solid fa-cake-candles text-galaxy-400 mr-2"></i>Tu fecha de nacimiento</h2>
        <p class="text-sm text-gray-300 mt-1">Necesitamos saber tu edad para cuidar a los más jóvenes de la comunidad. Es un dato privado: <b>nadie lo ve</b>, ni siquiera en tu perfil.</p></div>
      <div><label class="label" for="edad-fecha">Fecha de nacimiento</label><input id="edad-fecha" type="date" class="field" max="${escapeHTML(hoyISO())}" min="1900-01-01" required></div>
      <ul class="text-[11px] text-gray-400 space-y-1 list-disc pl-4">
        <li>La edad mínima para usar la comunidad es de <b>${EDAD_MINIMA} años</b>.</li>
        <li>Si tienes menos de 18, tu cuenta tendrá protecciones extra (por ejemplo, mensajes y búsquedas más limitados).</li>
        <li><b>Solo se puede escribir una vez</b>: revísala antes de continuar.</li></ul>
      <p id="edad-err" class="text-xs text-bad min-h-4" role="alert"></p>
      <button type="submit" class="btn btn-primary w-full">Guardar</button>
      <button type="button" id="edad-salir" class="w-full text-xs text-gray-500 hover:text-white">Prefiero cerrar sesión</button>
    </form>`, { id: ID, persistent: true, onClose: () => { abierto = false; } });
  const $ = (s) => m.querySelector(s); const err = $('#edad-err');
  $('#edad-salir').addEventListener('click', async () => { await supabase.auth.signOut(); closeModal(ID); });
  $('#edad-form').addEventListener('submit', async (ev) => {
    ev.preventDefault(); err.textContent = '';
    const v = validarNacimiento($('#edad-fecha').value);
    if (!v.ok) { err.textContent = v.error; return; }
    const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const { data, error } = await supabase.rpc('declarar_nacimiento', { p_fecha: v.iso });
      if (error) throw error;
      if (data?.bloqueada) {
        $('#edad-form').innerHTML = `<div class="space-y-3 text-center"><i class="fa-solid fa-ban text-3xl text-bad"></i>
          <p class="text-sm text-gray-200">Lo sentimos: para usar la comunidad hay que tener al menos <b>${EDAD_MINIMA} años</b>. Tu cuenta no puede continuar.</p>
          <p class="text-[11px] text-gray-500">Si escribiste mal tu fecha, contacta al equipo de la liga desde Discord.</p>
          <button type="button" id="edad-ok" class="btn btn-ghost w-full">Entendido</button></div>`;
        $('#edad-ok').addEventListener('click', async () => { await supabase.auth.signOut(); closeModal(ID); });
        return;
      }
      closeModal(ID); toast('Listo, gracias. Tu fecha quedó guardada de forma privada.', 'ok');
      await refreshProfile();                                   // reabre la bienvenida si faltaba
    } catch (ex) {
      console.error('[edad] declarar:', ex);
      err.textContent = ex?.message && !/fetch|network/i.test(ex.message) ? ex.message : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
    } finally { btn.disabled = false; }
  });
}

export function initEdad() {
  onSession(async ({ session }) => {
    const uid = session?.user?.id ?? null;
    if (!uid) { comprobado = null; return; }
    if (comprobado === uid || abierto) return; comprobado = uid;
    try { if (debePedirFecha(await consultar())) { if (!document.getElementById(ID)) mostrar(uid); } }
    catch (e) { console.warn('[edad] comprobación:', e); }
  });
}
