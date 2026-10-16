-- 118 · CHAT DE AYUDA CON IA: límites de uso (ronda 345). Plan: docs/PLAN-IA-WEB.md
-- Cada pregunta al chat cuesta dinero (API de Claude). Aquí se cuenta cuántas hace cada persona por día.
-- Solo la función de servidor `ayuda-ia` (con la clave service_role) puede llamar a ia_chat_turno; desde la web nadie.

create table if not exists public.ia_chat_uso (
  usuario uuid not null references auth.users(id) on delete cascade,
  fecha date not null default ((now() at time zone 'America/Lima')::date),
  preguntas int not null default 0 check (preguntas >= 0),
  primary key (usuario, fecha)
);
alter table public.ia_chat_uso enable row level security;
revoke all on public.ia_chat_uso from anon, authenticated;
-- Cada persona puede ver SOLO su propio conteo (para mostrar «te quedan N preguntas hoy»).
grant select on public.ia_chat_uso to authenticated;
drop policy if exists ia_chat_uso_propio on public.ia_chat_uso;
create policy ia_chat_uso_propio on public.ia_chat_uso for select to authenticated using (usuario = auth.uid());

-- Suma 1 pregunta si no se pasó ningún límite. Devuelve 'OK:<quedan>', 'LIMITE_USUARIO' o 'LIMITE_TOTAL'.
create or replace function public.ia_chat_turno(p_usuario uuid, p_max_usuario int default 15, p_max_total int default 300)
returns text language plpgsql security definer set search_path = '' as $$
declare v_hoy date := (now() at time zone 'America/Lima')::date; v_total int; v_mias int;
begin
  perform pg_advisory_xact_lock(hashtext('ia_chat_turno'));   -- evita que dos preguntas a la vez se salten el límite
  select coalesce(sum(preguntas), 0) into v_total from public.ia_chat_uso where fecha = v_hoy;
  if v_total >= p_max_total then return 'LIMITE_TOTAL'; end if;
  select coalesce(preguntas, 0) into v_mias from public.ia_chat_uso where usuario = p_usuario and fecha = v_hoy;
  if coalesce(v_mias, 0) >= p_max_usuario then return 'LIMITE_USUARIO'; end if;
  insert into public.ia_chat_uso (usuario, fecha, preguntas) values (p_usuario, v_hoy, 1)
  on conflict (usuario, fecha) do update set preguntas = public.ia_chat_uso.preguntas + 1;
  return 'OK:' || (p_max_usuario - coalesce(v_mias, 0) - 1);
end $$;
revoke all on function public.ia_chat_turno(uuid, int, int) from public, anon, authenticated;
grant execute on function public.ia_chat_turno(uuid, int, int) to service_role;

-- Limpieza: se borran los conteos de más de 30 días (una vez al día, 04:31 de Lima).
select cron.unschedule(jobid) from cron.job where jobname = 'limpiar-ia-chat-uso';
select cron.schedule('limpiar-ia-chat-uso', '31 9 * * *', $$delete from public.ia_chat_uso where fecha < current_date - 30$$);
