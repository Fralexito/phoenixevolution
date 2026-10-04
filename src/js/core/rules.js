// REGLAS DEL JUEGO en un solo lugar.
// ⚠ Los valores marcados [BD] también existen en Supabase (supabase/migrations). Si cambias uno aquí,
//   cámbialo allá en la misma sesión; si no, la web y la base de datos dejarán de coincidir.
export const MAX_PLAYERS = 8;       // [BD] retos_tam_ok: tam_a + tam_b <= 8 (límite de PES)
export const MAX_TEAM = 7;          // [BD] retos_tam_ok: cada equipo entre 1 y 7
export const MIN_LEAD_MIN = 30;     // [BD] validar_reto_insert: un PROGRAMADO exige 30 min de antelación
export const CONFIRM_OPEN_MIN = 30; // [BD] confirmar_partido: la confirmación abre 30 min antes
export const CONFIRM_CLOSE_MIN = 10;// [BD] confirmar_partido / procesar_retos: cierra (y cancela) a 10 min

// ---- Identidad ----
export const USERNAME_COOLDOWN_DAYS = 14; // [BD] perfiles_antes_de_actualizar: el @usuario solo cambia 1 vez cada 14 días
const DAY_MS = 86_400_000;

/**
 * ¿Puede este perfil cambiar su @usuario ahora? Devuelve { blocked, until: Date|null }.
 * Mientras `perfil_completo` sea false (aún no pasó por el formulario de bienvenida) el cambio es libre.
 * Es solo para mostrar el aviso: quien manda de verdad es el trigger de la base de datos.
 */
export function cooldownInfo(profile, now = new Date()) {
  if (!profile?.perfil_completo || !profile.username_changed_at) return { blocked: false, until: null };
  const until = new Date(new Date(profile.username_changed_at).getTime() + USERNAME_COOLDOWN_DAYS * DAY_MS);
  return Number.isNaN(until.getTime()) || now >= until ? { blocked: false, until: null } : { blocked: true, until };
}
