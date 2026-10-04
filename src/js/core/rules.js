// REGLAS DEL JUEGO en un solo lugar.
// ⚠ Los valores marcados [BD] también existen en Supabase (supabase/migrations). Si cambias uno aquí,
//   cámbialo allá en la misma sesión; si no, la web y la base de datos dejarán de coincidir.
export const MAX_PLAYERS = 8;       // [BD] retos_tam_ok: tam_a + tam_b <= 8 (límite de PES)
export const MAX_TEAM = 7;          // [BD] retos_tam_ok: cada equipo entre 1 y 7
export const MIN_LEAD_MIN = 30;     // [BD] validar_reto_insert: un PROGRAMADO exige 30 min de antelación
export const CONFIRM_OPEN_MIN = 30; // [BD] confirmar_partido: la confirmación abre 30 min antes
export const CONFIRM_CLOSE_MIN = 10;// [BD] confirmar_partido / procesar_retos: cierra (y cancela) a 10 min
