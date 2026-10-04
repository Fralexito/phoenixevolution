-- Datos físicos opcionales del jugador: altura (cm), peso (kg) y pie dominante.
alter table public.jugadores add column if not exists altura_cm smallint;
alter table public.jugadores add column if not exists peso_kg smallint;
alter table public.jugadores add column if not exists pie text;
alter table public.jugadores add constraint jugadores_altura_ok check (altura_cm is null or altura_cm between 120 and 230);
alter table public.jugadores add constraint jugadores_peso_ok check (peso_kg is null or peso_kg between 35 and 160);
alter table public.jugadores add constraint jugadores_pie_ok check (pie is null or pie in ('Derecho','Izquierdo'));
