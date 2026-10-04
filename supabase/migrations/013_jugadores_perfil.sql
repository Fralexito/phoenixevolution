-- Perfil público ampliado del jugador: biografía, ciudad, miembro desde, estilo de juego, logros y redes. Todo opcional; sin < >.
alter table public.jugadores
  add column if not exists biografia text,
  add column if not exists ciudad text,
  add column if not exists miembro_desde date,
  add column if not exists estilo_juego text,
  add column if not exists logros text,
  add column if not exists redes jsonb not null default '{}'::jsonb;
alter table public.jugadores
  add constraint jugadores_biografia_ok check (biografia is null or (char_length(biografia) <= 2000 and biografia !~ '[<>]')),
  add constraint jugadores_ciudad_ok check (ciudad is null or (char_length(ciudad) between 1 and 60 and ciudad !~ '[<>]')),
  add constraint jugadores_estilo_ok check (estilo_juego is null or (char_length(estilo_juego) between 1 and 120 and estilo_juego !~ '[<>]')),
  add constraint jugadores_logros_ok check (logros is null or (char_length(logros) <= 800 and logros !~ '[<>]')),
  add constraint jugadores_redes_ok check (jsonb_typeof(redes) = 'object' and char_length(redes::text) <= 1000 and redes::text !~ '[<>]');
