// Verificación en vivo del @usuario (único y público, como en TikTok). Lee `perfiles` (lectura pública).
import { supabase } from '../core/supabase.js';
import { toUsername } from '../core/dom.js';

const RESERVADOS = ['admin', 'administrador', 'moderador', 'soporte', 'staff', 'comisario', 'oficial', 'phoenix', 'phoenixevolution', 'galaxyleague', 'sistema', 'root']; // [BD] igual que perfiles_username_reservado
export const MIN_HANDLE = 3;

/** Estados: 'corto' | 'reservado' | 'libre' | 'ocupado' | 'error'. exceptId = tu propio perfil (tu @ actual cuenta como libre). */
export async function checkHandle(value, exceptId = null) {
  const v = toUsername(value);
  if (v.length < MIN_HANDLE) return 'corto';
  if (RESERVADOS.includes(v)) return 'reservado';
  try {
    const { data, error } = await supabase.from('perfiles').select('id').eq('username', v).limit(1);
    if (error) throw error;
    return data?.length && data[0].id !== exceptId ? 'ocupado' : 'libre';
  } catch (e) { console.error('[usuario] comprobar:', e); return 'error'; }
}

const MSG = {
  corto: ['Mínimo 3 caracteres: letras, números o _', 'text-gray-500'],
  reservado: ['Ese nombre está reservado. Elige otro.', 'text-bad'],
  libre: ['<i class="fa-solid fa-circle-check mr-1"></i>Disponible', 'text-ok'],
  ocupado: ['<i class="fa-solid fa-circle-xmark mr-1"></i>Ya está en uso', 'text-bad'],
  error: ['No se pudo comprobar ahora. Se validará al guardar.', 'text-gray-500'],
  vacio: ['Solo minúsculas, números y _ (máx. 20). Es público y único.', 'text-gray-500'],
};

/**
 * Conecta un <input> con su línea de estado. Devuelve { estado(): último estado, comprobar(): Promise<estado> }.
 * Normaliza lo que se escribe (minúsculas, sin símbolos) y evita respuestas atrasadas con un contador.
 */
export function bindHandle(input, statusEl, { exceptId = null } = {}) {
  let estado = 'vacio'; let n = 0; let t;
  const pintar = (s) => { estado = s; const [html, cls] = MSG[s]; statusEl.className = `text-[11px] mt-1 min-h-4 ${cls}`; statusEl.innerHTML = html; };
  const comprobar = async () => {
    const mi = ++n; const s = await checkHandle(input.value, exceptId);
    if (mi === n) pintar(s);
    return s;
  };
  input.addEventListener('input', () => {
    const limpio = toUsername(input.value); if (input.value !== limpio) input.value = limpio;
    clearTimeout(t);
    if (!limpio) { n++; pintar('vacio'); return; }
    pintar('corto'); if (limpio.length >= MIN_HANDLE) t = setTimeout(comprobar, 350);
  });
  pintar(input.value ? 'corto' : 'vacio'); if (input.value) comprobar();
  return { estado: () => estado, comprobar };
}
