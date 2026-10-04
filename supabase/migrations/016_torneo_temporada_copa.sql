-- 1) Participaciones: dos ejes más para filtrar (torneo y temporada) además de la liga.
alter table public.participaciones add column if not exists torneo text check (torneo is null or (char_length(torneo) between 1 and 60 and torneo !~ '[<>]'));
alter table public.participaciones add column if not exists temporada text check (temporada is null or temporada ~ '^[0-9]{4}$');
create index if not exists participaciones_club_idx on public.participaciones (club);

-- 2) Resultados de la Copa Interdivisional, por temporada y cruce (R1-P1 = ronda 1, partido 1). Lectura pública; escribe solo el admin.
create table if not exists public.copa_resultados (
  temporada text not null check (temporada ~ '^[0-9]{4}$'),
  cruce text not null check (cruce ~ '^R[0-9]{1,2}-P[0-9]{1,2}$'),
  ga smallint check (ga is null or ga between 0 and 99),
  gb smallint check (gb is null or gb between 0 and 99),
  pa smallint check (pa is null or pa between 0 and 99),
  pb smallint check (pb is null or pb between 0 and 99),
  updated_at timestamptz not null default now(),
  primary key (temporada, cruce)
);
alter table public.copa_resultados enable row level security;
create policy copa_resultados_lectura on public.copa_resultados for select to anon, authenticated using (true);
create policy copa_resultados_admin_escritura on public.copa_resultados for all to authenticated using (private.es_admin()) with check (private.es_admin());
grant select on public.copa_resultados to anon, authenticated;
grant insert, update, delete on public.copa_resultados to authenticated;
