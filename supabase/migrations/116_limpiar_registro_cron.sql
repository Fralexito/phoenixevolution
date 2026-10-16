-- 116 · Limpieza diaria del REGISTRO de tareas automáticas (ronda 340).
-- Cada tarea programada (pg_cron) anota cada ejecución en cron.job_run_details. Con 4 tareas que corren cada minuto
-- el registro crece ~5.600 filas por día (~30 MB al mes) y nunca se borraba: ya era lo más pesado de la base (12 MB).
-- Se guardan solo los últimos 7 días (sirven para investigar si una tarea falla); lo más viejo se borra cada día.

-- Limpieza inicial
delete from cron.job_run_details where end_time < now() - interval '7 days';

-- Tarea diaria a las 09:23 UTC (04:23 de Lima). Si ya existía con ese nombre, se reemplaza.
select cron.unschedule(jobid) from cron.job where jobname = 'limpiar-registro-cron';
select cron.schedule(
  'limpiar-registro-cron',
  '23 9 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
