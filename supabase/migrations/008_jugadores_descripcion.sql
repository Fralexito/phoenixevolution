-- 008 · Ficha de jugador: descripción libre (táctica, estilo de juego…). Opcional, ≤ 600 caracteres, sin < >.
-- `jugadores` tiene permisos a nivel de tabla (no por columna), así que no hace falta grant extra.
alter table public.jugadores add column if not exists descripcion text;
alter table public.jugadores add constraint jugadores_descripcion_ok check (descripcion is null or (char_length(descripcion) <= 600 and descripcion !~ '[<>]'));
