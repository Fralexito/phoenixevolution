-- Plantillas de noticias: cada noticia puede elegir su diseño (plantilla) y un estilo propio (acento, forma, brillo…).
-- 'auto' = el sitio elige y rota los diseños para que dos noticias seguidas nunca se vean iguales. Solo escribe el admin (política ya existente).
alter table public.noticias
  add column if not exists plantilla text not null default 'auto' check (plantilla ~ '^[a-z0-9-]{1,30}$'),
  add column if not exists estilo jsonb not null default '{}'::jsonb check (jsonb_typeof(estilo) = 'object' and char_length(estilo::text) <= 600);
