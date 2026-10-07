-- Lienzo libre de Noticias: posición y tamaño de cada tarjeta en una grilla de 12 columnas {x,y,w,h}.
alter table public.noticias add column if not exists lienzo jsonb check (lienzo is null or (jsonb_typeof(lienzo)='object' and char_length(lienzo::text) <= 120));
