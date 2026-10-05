-- 047 · FASE 5 · VIGILANCIA DE USO DEL PLAN GRATUITO. Depende de 046 (discord_enviar, discord_envios).
-- Plan gratuito de Supabase: base de datos 500 MB y almacenamiento de archivos 1 GB. Si se llena, el proyecto pasa a solo lectura.
-- Cada día (08:30 Lima) mide ambos y avisa por Discord al cruzar el 70 % («atención») y el 90 % («crítico»), una sola vez por día y nivel.
-- Si el puente de Discord no está configurado, no hace nada. Nunca lanza errores.

alter table public.discord_envios drop constraint if exists discord_envios_tipo_check;
alter table public.discord_envios add constraint discord_envios_tipo_check check (tipo in ('resumen', 'evento', 'prueba', 'uso'));

create or replace function private.vigilar_uso(p_bd_mb numeric default 500, p_archivos_mb numeric default 1024) returns text
language plpgsql security definer set search_path = '' as $$
declare bd numeric := round(pg_database_size(current_database()) / 1048576.0, 1); arch numeric := 0; pb numeric; pa numeric; nivel text; dia text := to_char((now() at time zone 'UTC') - interval '5 hours', 'YYYY-MM-DD'); lineas text := ''; peor numeric;
begin
  if to_regclass('storage.objects') is not null then
    begin
      execute $q$ select coalesce(sum((metadata->>'size')::numeric), 0) / 1048576.0 from storage.objects $q$ into arch;
    exception when others then arch := 0;
    end;
  end if;
  pb := round(100 * bd / p_bd_mb, 1); pa := round(100 * arch / p_archivos_mb, 1); peor := greatest(pb, pa);
  nivel := case when peor >= 90 then 'critico' when peor >= 70 then 'atencion' else null end;
  if nivel is null then return 'OK'; end if;
  lineas := '• Base de datos: ' || bd || ' MB de ' || p_bd_mb || ' MB (' || pb || ' %)' || E'\n' || '• Archivos: ' || round(arch, 1) || ' MB de ' || p_archivos_mb || ' MB (' || pa || ' %)';
  return private.discord_enviar('uso', dia || '-' || nivel, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
    'title', case when nivel = 'critico' then '🚨 Uso del plan gratuito: CRÍTICO' else '⚠️ Uso del plan gratuito: atención' end,
    'description', lineas || E'\n\nAl llenarse el plan, Supabase deja el proyecto en solo lectura. Conviene limpiar datos o pasar a un plan de pago.',
    'color', case when nivel = 'critico' then 15158332 else 16761095 end))));
exception when others then
  raise warning '[uso] vigilar_uso: %', sqlerrm; return 'ERROR';
end $$;
revoke all on function private.vigilar_uso(numeric, numeric) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'vigilar-uso';
select cron.schedule('vigilar-uso', '30 13 * * *', 'select private.vigilar_uso()');
