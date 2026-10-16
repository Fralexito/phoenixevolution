-- 117 · BANDEJA DE APROBACIÓN DE LA IA (ronda 345). Plan completo: docs/PLAN-IA-WEB.md
-- La IA (tarea programada «Redacción IA Phoenix», que entra con permisos de servidor) PREPARA cosas y las deja aquí;
-- un moderador o admin las APRUEBA o RECHAZA desde la página /bandeja-ia/. Desde la web nadie puede crear propuestas.
-- Aprobar una noticia = publicarla. Rechazarla = sigue como borrador (no se borra nada).

create table if not exists public.ia_propuestas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('noticia', 'aviso')),
  titulo text not null check (char_length(titulo) between 3 and 160),
  detalle text check (char_length(detalle) <= 2000),           -- por qué la IA lo propone / qué revisar
  noticia_id uuid references public.noticias(id) on delete cascade,
  prioridad smallint not null default 2 check (prioridad between 1 and 3),   -- 1 = urgente, 3 = cuando puedas
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo text check (char_length(motivo) <= 500),
  creado_en timestamptz not null default now(),
  revisado_por uuid references public.perfiles(id) on delete set null,
  revisado_en timestamptz
);
create index if not exists ia_propuestas_estado_idx on public.ia_propuestas (estado, creado_en desc);
create unique index if not exists ia_propuestas_noticia_uidx on public.ia_propuestas (noticia_id) where noticia_id is not null;

-- Un resumen por día, escrito por la IA para FRALEX.
create table if not exists public.ia_resumenes (
  fecha date primary key,
  texto text not null check (char_length(texto) between 3 and 6000),
  datos jsonb,
  creado_en timestamptz not null default now()
);

alter table public.ia_propuestas enable row level security;
alter table public.ia_resumenes enable row level security;
revoke all on public.ia_propuestas, public.ia_resumenes from anon;
revoke insert, update, delete on public.ia_propuestas, public.ia_resumenes from authenticated;
grant select on public.ia_propuestas, public.ia_resumenes to authenticated;
drop policy if exists ia_propuestas_staff on public.ia_propuestas;
create policy ia_propuestas_staff on public.ia_propuestas for select to authenticated using (private.es_moderador());
drop policy if exists ia_resumenes_staff on public.ia_resumenes;
create policy ia_resumenes_staff on public.ia_resumenes for select to authenticated using (private.es_moderador());

-- Lo que ve la bandeja: propuestas + la noticia completa (los borradores solo los lee un admin por RLS,
-- así que esta función los entrega al moderador SOLO dentro de la bandeja).
create or replace function public.ia_bandeja(p_historial boolean default false)
returns table (id bigint, tipo text, titulo text, detalle text, prioridad smallint, estado text, motivo text,
               creado_en timestamptz, revisado_en timestamptz, revisor text,
               noticia_slug text, noticia_titulo text, noticia_resumen text, noticia_cuerpo text, noticia_tag text, noticia_publicada boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  return query
    select p.id, p.tipo, p.titulo, p.detalle, p.prioridad, p.estado, p.motivo, p.creado_en, p.revisado_en,
           coalesce(pf.nombre_display, pf.username),
           n.slug, n.titulo, n.resumen, n.cuerpo, n.tag, n.publicada
      from public.ia_propuestas p
      left join public.noticias n on n.id = p.noticia_id
      left join public.perfiles pf on pf.id = p.revisado_por
     where (p_historial and p.estado <> 'pendiente') or (not p_historial and p.estado = 'pendiente')
     order by case when p_historial then null else p.prioridad end, p.creado_en desc
     limit case when p_historial then 30 else 100 end;
end $$;
revoke all on function public.ia_bandeja(boolean) from public, anon;
grant execute on function public.ia_bandeja(boolean) to authenticated;

-- Aprobar / rechazar (solo moderador o admin; queda anotado quién y cuándo).
create or replace function public.ia_revisar(p_id bigint, p_aprobar boolean, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.ia_propuestas;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update public.ia_propuestas
     set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         motivo = nullif(left(coalesce(p_motivo, ''), 500), ''), revisado_por = auth.uid(), revisado_en = now()
   where id = p_id and estado = 'pendiente'
  returning * into v;
  if v.id is null then raise exception 'NO_PENDIENTE'; end if;
  if p_aprobar and v.tipo = 'noticia' and v.noticia_id is not null then
    update public.noticias set publicada = true, publicada_en = now() where id = v.noticia_id and not publicada;
  end if;
  return jsonb_build_object('ok', true, 'estado', v.estado);
end $$;
revoke all on function public.ia_revisar(bigint, boolean, text) from public, anon;
grant execute on function public.ia_revisar(bigint, boolean, text) to authenticated;
