-- 161 · Sala de Duelos hasta 16 jugadores (8 vs 8) en total (28-oct-2026).
-- Amplía la restricción retos_tam_ok de 8 jugadores (1..7 por lado) a 16 jugadores (1..15 por lado),
-- acorde al módulo de 16 mandos en PES 2021 (phoenix_mandos_fase1.lua v0.9.60) y rules.js (MAX_PLAYERS = 16, MAX_TEAM = 15).
-- Cómo deshacer:
--   alter table public.retos_matchmaking drop constraint if exists retos_tam_ok;
--   alter table public.retos_matchmaking add constraint retos_tam_ok check (tam_a between 1 and 7 and tam_b between 1 and 7 and tam_a + tam_b <= 8);

alter table public.retos_matchmaking drop constraint if exists retos_tam_ok;
alter table public.retos_matchmaking add constraint retos_tam_ok check (tam_a between 1 and 15 and tam_b between 1 and 15 and tam_a + tam_b <= 16);

