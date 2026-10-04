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

// ---- Sistema Host ----
/** Velocidades de subida que se ofrecen (Mbps). Se guardan como número en perfiles.ancho_banda_mbps (1–10000). */
export const SPEED_BUCKETS = [
  { v: 25, label: '−50' }, { v: 100, label: '100' }, { v: 300, label: '300' }, { v: 500, label: '500' }, { v: 1000, label: '+500' },
];
/** Cualquier valor guardado (incluidos los antiguos 5, 10, 50…) → el grupo más cercano hacia abajo. null si no hay dato. */
export function speedBucket(mbps) {
  const n = Number(mbps); if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 100) return 25; if (n < 300) return 100; if (n < 500) return 300; if (n === 500) return 500; return 1000;
}
export const JUEGOS = ['PES 2021', 'SP Football Life'];
export const SP_VERSIONES = ['25', '26', '27'];   // «Otra» se escribe a mano (≤ 20 caracteres) [BD] perfiles_sp_version_ok
