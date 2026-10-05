// Acceso a la auditoría y a los roles: cada función llama a una RPC de Supabase (las reglas viven en la base de datos, migración 030).
// Esquema: pages/auditoria.js → features/auditoria/{api, vista} → core/{auditoria, roles} (lógica pura).
import { supabase } from '../../core/supabase.js';
import { describirEntrada, normalizarResumen } from '../../core/auditoria.js';
import { normalizarRol } from '../../core/roles.js';

/** Error que sabe decir si la causa es «la migración 030 todavía no está aplicada» (la función no existe). */
export class ErrorAuditoria extends Error {
  constructor(mensaje, { sinMigracion = false } = {}) { super(mensaje); this.name = 'ErrorAuditoria'; this.sinMigracion = sinMigracion; }
}

async function rpc(nombre, args = {}) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) {
    console.error(`[auditoria] ${nombre}:`, error.code, error.message);
    const sinMigracion = error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message ?? '');
    throw new ErrorAuditoria(sinMigracion ? 'La base de datos todavía no tiene activada la auditoría (falta aplicar la migración 030).' : (error.message || 'No se pudo completar la acción.'), { sinMigracion });
  }
  return data;
}

/** Entradas ya descritas en español, más nuevas primero. `antes` = id de la última entrada que ya tienes (paginación). */
export async function listar({ actor = null, tabla = null, accion = null, desde = null, antes = null, limite = 30 } = {}) {
  const data = await rpc('auditoria_listar', { p_actor: actor, p_tabla: tabla, p_accion: accion, p_desde: desde, p_antes: antes, p_limite: limite });
  return (Array.isArray(data) ? data : []).map(describirEntrada).filter(Boolean);
}

export async function resumen(dias = 7) { return normalizarResumen(await rpc('auditoria_resumen', { p_dias: dias })); }

/** Solo un admin puede; el motivo es obligatorio y queda en la auditoría. */
export const asignarRol = (usuario, rol, motivo) => rpc('asignar_rol', { p_usuario: usuario, p_rol: rol, p_motivo: motivo });

const normalizarCuenta = (p) => ({ id: p.id, username: p.username ?? '', nombre: p.nombre_display || p.username || 'Jugador', avatar: p.avatar_url ?? '', rol: normalizarRol(p.rol) });
const COLS = 'id, username, nombre_display, avatar_url, rol';

/** Cuentas con algún rol (todo lo que no sea «jugador»). */
export async function listarEquipo() {
  const { data, error } = await supabase.from('perfiles').select(COLS).neq('rol', 'jugador').order('rol').limit(100);
  if (error) { console.error('[auditoria] equipo:', error.message); throw new ErrorAuditoria('No se pudo leer el equipo.'); }
  return (data ?? []).map(normalizarCuenta);
}

/** Busca cuentas por @usuario o nombre (mín. 2 letras). Los caracteres especiales del filtro se quitan para que no se pueda romper la consulta. */
export async function buscarCuentas(texto) {
  const t = String(texto ?? '').replace(/[^\p{L}\p{N}_ .-]/gu, '').trim().slice(0, 30);
  if (t.length < 2) return [];
  const { data, error } = await supabase.from('perfiles').select(COLS).or(`username.ilike.%${t}%,nombre_display.ilike.%${t}%`).limit(8);
  if (error) { console.error('[auditoria] buscar:', error.message); throw new ErrorAuditoria('No se pudo buscar.'); }
  return (data ?? []).map(normalizarCuenta);
}
