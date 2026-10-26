-- 159 · Limpieza automática de lo que ya no sirve (25-oct-2026, Cuenta 2). Pedido de Fralex: «Optimiza todo».
-- ESTADO: APLICADA el 25-oct-2026 (Fralex la pegó en el SQL Editor; tarea «limpieza-diaria» activa, verificada).
-- Esta migración SÍ borra filas viejas (por eso Supabase pide permiso una vez). Cada día a las 04:40 (Lima):
--   · duelo_goles NO vigentes (envíos repetidos de Link ya reemplazados) de más de 30 días;
--   · reto_chat de duelos con más de 90 días (el chat de la sala solo tiene sentido cerca del partido);
--   · duelo_repeticiones y reto_chat OCULTOS de más de 180 días (ya no hacen falta como prueba para moderación);
--   · reto_predicciones de duelos con más de 180 días (el conteo ya no se muestra);
--   · registro de tareas programadas (cron.job_run_details): de 7 a 3 días. Era la tabla más grande de la base (44 mil filas,
--     ~10 MB) por las tareas que corren cada minuto.
-- Nunca toca: resultados, goles vigentes, votos de MVP/prode/temporadas, movimientos de ascuas ni nada del dinero.
-- Devuelve cuántas filas quitó de cada tabla (queda en el registro de la tarea).
create or replace function private.limpieza_diaria() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n1 integer; n2 integer; n3 integer; n4 integer; n5 integer; n6 integer;
begin
  delete from public.duelo_goles where not vigente and creado < now() - interval '30 days';
  get diagnostics n1 = row_count;
  delete from public.reto_chat c using public.retos_matchmaking r
   where r.id = c.reto_id and coalesce(r.cerrado_at, r.created_at) < now() - interval '90 days';
  get diagnostics n2 = row_count;
  delete from public.reto_chat where oculto and creado < now() - interval '180 days';
  get diagnostics n3 = row_count;
  delete from public.duelo_repeticiones where oculto and creado < now() - interval '180 days';
  get diagnostics n4 = row_count;
  delete from public.reto_predicciones p using public.retos_matchmaking r
   where r.id = p.reto_id and coalesce(r.cerrado_at, r.created_at) < now() - interval '180 days';
  get diagnostics n5 = row_count;
  delete from cron.job_run_details where end_time < now() - interval '3 days';
  get diagnostics n6 = row_count;
  return jsonb_build_object('goles_no_vigentes', n1, 'chat_viejo', n2, 'chat_oculto', n3, 'repeticiones_ocultas', n4, 'predicciones', n5, 'registro_cron', n6);
end $$;
revoke all on function private.limpieza_diaria() from public, anon, authenticated;

select cron.schedule('limpieza-diaria', '40 9 * * *', 'select private.limpieza_diaria()');
-- El registro de cron ya lo limpia «limpieza-diaria» con 3 días; la tarea vieja (7 días) queda sin efecto pero no estorba.
