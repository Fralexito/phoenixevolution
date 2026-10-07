alter table public.noticias drop constraint noticias_categoria_check;
alter table public.noticias add constraint noticias_categoria_check check (categoria = any (array['OFICIAL','JORNADA','TRIBUNAL','TRIBUNA']));
