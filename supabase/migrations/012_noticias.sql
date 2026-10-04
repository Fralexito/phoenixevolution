-- Noticias reales: las publica un admin desde la web. Lectura pública SOLO de las publicadas; los borradores los ve únicamente un admin.
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),   -- enlace: noticias/?n=<slug>
  titulo text not null check (char_length(titulo) between 3 and 140),
  resumen text not null check (char_length(resumen) between 3 and 400),
  cuerpo text not null check (char_length(cuerpo) between 3 and 20000),                              -- párrafos separados por una línea en blanco; TEXTO PLANO
  categoria text not null default 'OFICIAL' check (categoria in ('OFICIAL', 'JORNADA', 'TRIBUNAL')),
  tag text not null default '' check (char_length(tag) <= 40),
  imagen text check (imagen is null or imagen ~ '^https://'),
  liga text not null default 'galaxy' check (liga ~ '^[a-z0-9-]{1,40}$'),                           -- id de la liga (data/ligas.js)
  destacada boolean not null default false,
  publicada boolean not null default true,
  publicada_en timestamptz not null default now(),
  discord_en timestamptz,                                                                            -- cuándo se avisó a Discord (evita avisar dos veces)
  autor_id uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists noticias_publicada_en_idx on public.noticias (publicada_en desc);

alter table public.noticias enable row level security;
create policy noticias_lectura on public.noticias for select to anon, authenticated using (publicada or private.es_admin());
create policy noticias_admin_escritura on public.noticias for all to authenticated using (private.es_admin()) with check (private.es_admin());
grant select on public.noticias to anon, authenticated;
grant insert, update, delete on public.noticias to authenticated;

-- Una sola noticia destacada por liga + fecha de edición automática.
create or replace function public.noticias_before_write() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.destacada then
    update public.noticias set destacada = false where liga = new.liga and destacada and id <> new.id;
  end if;
  return new;
end $$;
create trigger noticias_before_write before insert or update on public.noticias for each row execute function public.noticias_before_write();

-- Portadas: bucket público; solo un admin sube/borra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('noticias', 'noticias', true, 1048576, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
create policy noticias_img_admin on storage.objects for all to authenticated
  using (bucket_id = 'noticias' and private.es_admin()) with check (bucket_id = 'noticias' and private.es_admin());
