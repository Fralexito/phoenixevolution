-- 009 · Proporción de la foto de la ficha: '5/4' (horizontal, la de siempre), '1/1' (cuadrada) o '4/5' (alta).
-- NULL = '5/4'. La web usa este valor para dar a la foto de la tarjeta el mismo alto con el que se recortó.
alter table public.jugadores add column if not exists foto_aspecto text;
alter table public.jugadores add constraint jugadores_foto_aspecto_ok check (foto_aspecto is null or foto_aspecto in ('5/4', '1/1', '4/5'));
