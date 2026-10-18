// Capa 1 de la Liga Máster: traspasos del mundo real, por ventana (tablas lm_ventanas_reales / lm_traspasos_reales, migración 084).
// Lógica pura (sin red ni DOM) para validar el formulario del staff antes de guardar. La base vuelve a comprobar lo suyo (checks y unique).

export const TIPOS = [['traspaso', 'Traspaso'], ['cesion', 'Cesión'], ['libre', 'Llega libre'], ['retiro', 'Retiro']];
export const ESTADOS_VENTANA = [['abierta', 'Abierta'], ['cerrada', 'Cerrada'], ['aplicada', 'Aplicada']];

const entero = (v) => {
  const t = String(v ?? '').trim();
  if (t === '') return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
};

/** Convierte lo escrito en el formulario en una fila lista para guardar, o devuelve el motivo del error. */
export function validarTraspaso(f = {}) {
  const pes = entero(f.pes_id);
  if (pes === null || Number.isNaN(pes) || pes < 1) return { ok: false, error: 'El ID del jugador (pes_id) debe ser un número mayor que 0.' };
  const jugador = String(f.jugador ?? '').trim();
  if (!jugador) return { ok: false, error: 'Escribe el nombre del jugador.' };
  if (jugador.length > 80) return { ok: false, error: 'El nombre del jugador pasa de 80 letras.' };
  const tipo = String(f.tipo ?? 'traspaso');
  if (!TIPOS.some(([k]) => k === tipo)) return { ok: false, error: 'Tipo de movimiento no válido.' };
  const de = entero(f.de);
  const a = entero(f.a);
  if (Number.isNaN(de) || Number.isNaN(a) || (de !== null && de < 1) || (a !== null && a < 1)) return { ok: false, error: 'Los IDs de equipo deben ser números mayores que 0.' };
  if (de !== null && de === a) return { ok: false, error: 'El equipo de origen y el de destino no pueden ser el mismo.' };
  if ((tipo === 'traspaso' || tipo === 'cesion') && (de === null || a === null)) return { ok: false, error: 'Un traspaso o una cesión necesita equipo de origen y de destino.' };
  if (tipo === 'retiro' && a !== null) return { ok: false, error: 'Un retiro no tiene equipo de destino.' };
  const nota = String(f.nota ?? '').trim();
  if (nota.length > 200) return { ok: false, error: 'La nota pasa de 200 letras.' };
  return { ok: true, datos: { pes_id: pes, jugador, tipo, de_pes_team_id: de, a_pes_team_id: a, nota: nota || null } };
}

/** Texto corto que describe un movimiento, usando una función que traduce un pes_team_id a nombre (o null). */
export function describirMovimiento(t, nombreEquipo = () => null) {
  const eq = (id) => (id == null ? null : (nombreEquipo(id) ?? `equipo ${id}`));
  const de = eq(t.de_pes_team_id);
  const a = eq(t.a_pes_team_id);
  if (t.tipo === 'retiro') return `Se retira${de ? ` (${de})` : ''}`;
  if (t.tipo === 'libre') return a ? `Llega libre a ${a}` : 'Queda libre';
  const verbo = t.tipo === 'cesion' ? 'Cedido' : 'Traspasado';
  return `${verbo}${de ? ` de ${de}` : ''}${a ? ` a ${a}` : ' (queda libre)'}`;
}
