-- 103 · Liga automática: en qué parte del juego están (ronda 225, chat LINK con permiso de Fralex, 11-oct-2026).
-- Phoenix Referee (Lua de Sider, antes «phoenix_estadio») escribe pantalla.json y Phoenix Link la manda con el
-- marcador en vivo. La web dice «Eligiendo equipos», «Saliendo al campo», «En pausa»…
-- Solo añade una columna opcional (null = Link viejo o sin el Lua): no cambia nada de lo que ya existe.
alter table public.liga_vivo
  add column if not exists pantalla text
  check (pantalla is null or pantalla in ('menu', 'equipos', 'ajustes', 'cargando', 'saliendo', 'en_juego', 'descanso', 'pausa', 'final'));
