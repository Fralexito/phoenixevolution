-- 080 · La API «mercado» acepta también el token de Phoenix Link (phx_…, de /phoenix/v1/emparejar).
-- El token pml_… («código manager») sigue funcionando. Ajuste para EXIGIR el código manager:
--   · global (staff):   lm_config.exigir_codigo_manager
--   · por usuario:      mercado_ajustes.exigir_codigo
-- Si cualquiera está activo, un token de Phoenix Link recibe CODIGO_MANAGER_REQUERIDO en las acciones del modo manager.
alter table public.lm_config add column if not exists exigir_codigo_manager boolean not null default false;

create table if not exists public.mercado_ajustes (
  usuario uuid primary key references auth.users(id) on delete cascade,
  exigir_codigo boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.mercado_ajustes enable row level security;
drop policy if exists majustes_propios on public.mercado_ajustes;
create policy majustes_propios on public.mercado_ajustes for select to authenticated using (usuario = auth.uid());

-- reportes enviados desde Phoenix Link: no tienen fila en mercado_dispositivos → guardamos de dónde vinieron.
alter table public.mercado_reportes add column if not exists origen text not null default 'manager' check (origen in ('manager', 'link'));
alter table public.mercado_reportes add column if not exists dispositivo_link uuid references public.dispositivos_host(id) on delete set null;

create or replace function public.mercado_exigir_codigo(p_exigir boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'SIN_SESION'; end if;
  insert into mercado_ajustes (usuario, exigir_codigo) values (auth.uid(), p_exigir)
  on conflict (usuario) do update set exigir_codigo = excluded.exigir_codigo, updated_at = now();
end $$;
revoke all on function public.mercado_exigir_codigo(boolean) from public, anon;
grant execute on function public.mercado_exigir_codigo(boolean) to authenticated;

create or replace function public.lm_staff_exigir_codigo(p_liga text, p_exigir boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update lm_config set exigir_codigo_manager = p_exigir, updated_at = now() where liga = p_liga;
end $$;
revoke all on function public.lm_staff_exigir_codigo(text, boolean) from public, anon;
grant execute on function public.lm_staff_exigir_codigo(text, boolean) to authenticated;
