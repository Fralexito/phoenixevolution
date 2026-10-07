-- Orden manual de Noticias (arrastrar y soltar del staff). null = sin acomodar (va arriba, por fecha).
alter table public.noticias add column if not exists orden int;
