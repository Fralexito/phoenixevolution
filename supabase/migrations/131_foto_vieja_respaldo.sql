-- 131 · Foto antigua de jugadores guardada como texto (revisión del 19-oct-2026, Fralex: «corrige todo»).
-- La columna jugadores.foto guardaba la foto como texto base64 (1 jugador, ~269 KB). Hoy las fichas suben la foto a Storage y usan foto_url,
-- que la web muestra primero (playerCard: foto_url || foto). Esa fila YA tiene foto_url, así que el texto nunca se veía.
-- Se guarda una COPIA en private.jugadores_foto_respaldo y solo entonces se vacía. Se puede deshacer:
--   update public.jugadores j set foto = r.foto from private.jugadores_foto_respaldo r where r.id = j.id;
create table if not exists private.jugadores_foto_respaldo (
  id uuid primary key,
  foto text not null,
  guardado timestamptz not null default now()
);
revoke all on private.jugadores_foto_respaldo from public, anon, authenticated;

insert into private.jugadores_foto_respaldo (id, foto)
select id, foto from public.jugadores
where coalesce(foto, '') <> '' and coalesce(foto_url, '') <> ''
on conflict (id) do nothing;

update public.jugadores j set foto = null
where coalesce(j.foto, '') <> '' and coalesce(j.foto_url, '') <> ''
  and exists (select 1 from private.jugadores_foto_respaldo r where r.id = j.id);
