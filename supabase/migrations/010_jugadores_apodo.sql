-- Apodo opcional del jugador (se muestra junto al nombre). Máx. 24 caracteres, sin < >.
alter table public.jugadores add column if not exists apodo text;
alter table public.jugadores add constraint jugadores_apodo_ok check (apodo is null or (char_length(apodo) between 1 and 24 and apodo !~ '[<>]'));
