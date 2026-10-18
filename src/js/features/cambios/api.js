// Acceso a datos de CAMBIOS OFICIALES y REGISTRO DE PCs (migración 125). Escribe solo por RPC: la base decide quién puede.
import { supabase } from '../../core/supabase.js';
import { mensajeError } from '../../core/cambiosOficiales.js';

async function rpc(nombre, args) {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(mensajeError(error));
  return data;
}
const leer = async (q) => { const { data, error } = await q; if (error) throw new Error(mensajeError(error)); return data ?? []; };

export const catalogoTipos = () => leer(supabase.from('pes_tipos_cambio').select('tipo, etiqueta, destinos, activo').order('tipo'));
export const crearCambio = (tipo, destino, datos, nota) => rpc('pes_cambio_crear', { p_tipo: tipo, p_destino: destino, p_datos: datos, p_nota: nota || null });
export const anularCambio = (id, motivo) => rpc('pes_cambio_anular', { p_id: id, p_motivo: motivo || null });
export const historialCambios = (limite = 50, antes = null) => rpc('pes_cambios_historial', { p_limite: limite, p_antes: antes });
export const listaPcs = () => rpc('pes_pcs_lista', {});
export const historialPc = (dispositivo, limite = 100) => rpc('pes_pc_historial', { p_dispositivo: dispositivo, p_limite: limite });

/** Ayuda para el formulario: jugadores de la Liga Máster de la web con id de PES (sirve también para la base normal). */
export const buscarJugadores = (texto) => leer(supabase.from('lm_jugadores')
  .select('id, pes_id, nombre, club_id, lm_clubes(nombre, pes_team_id)')
  .ilike('nombre', `%${String(texto).replace(/[%_,()]/g, ' ').trim()}%`).order('nombre').limit(8));
export const clubesLm = () => leer(supabase.from('lm_clubes').select('id, nombre, pes_team_id').order('nombre'));
