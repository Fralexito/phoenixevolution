-- 005 · Identidad del perfil: @usuario elegible + apodo + foto del proveedor + avatares predefinidos.
-- COMPATIBLE hacia atrás: el trigger sigue entendiendo la clave vieja 'gamertag'.
-- Aplicada en producción el 2026-10-04.

-- 1) avatar_url admite, además de https://..., un código de avatar predefinido: "preset:dragon-violeta".
alter table public.perfiles drop constraint perfiles_avatar_ok;
alter table public.perfiles add constraint perfiles_avatar_ok check (
  avatar_url is null or avatar_url = ''
  or (avatar_url ~ '^https://' and char_length(avatar_url) <= 300)
  or avatar_url ~ '^preset:[a-z0-9-]{1,30}$'
);

-- 2) @usuario: no se pueden reclamar nombres que suenen oficiales (lista duplicada en el trigger de abajo).
alter table public.perfiles add constraint perfiles_username_reservado check (
  username <> all (array['admin','administrador','moderador','soporte','staff','comisario','oficial','phoenix','phoenixevolution','galaxyleague','sistema','root'])
);

-- 3) Trigger de alta: lee 'usuario' (el @ elegido), 'apodo' (nombre visible) y la foto del proveedor.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_mail   text  := split_part(coalesce(new.email, ''), '@', 1);
  v_apodo  text;
  v_full   text;
  v_base   text;
  v_user   text;
  v_avatar text;
  v_reserv text[] := array['admin','administrador','moderador','soporte','staff','comisario','oficial','phoenix','phoenixevolution','galaxyleague','sistema','root'];
  n int := 0;
begin
  if exists (select 1 from public.perfiles where id = new.id) then return new; end if;

  -- Apodo = lo que escribió; si no, lo que trae Discord/Google; si no, el inicio del correo.
  v_apodo := nullif(trim(regexp_replace(coalesce(
      nullif(m->>'apodo', ''), nullif(m->>'gamertag', ''), nullif(m #>> '{custom_claims,global_name}', ''),
      nullif(m->>'full_name', ''), nullif(m->>'name', ''), nullif(v_mail, ''), ''), '[<>]', '', 'g')), '');

  -- @usuario = el elegido; si no, se deriva del apodo.
  v_full := lower(regexp_replace(coalesce(nullif(m->>'usuario', ''), v_apodo, 'jugador'), '[^a-zA-Z0-9_]', '', 'g'));
  if v_full = '' then v_full := 'jugador'; end if;
  v_base := left(v_full, 16);
  v_user := left(v_full, 20);
  if v_user = any (v_reserv) then v_user := v_user || 'x'; v_base := left(v_full, 15) || 'x'; end if;

  -- Foto del proveedor (solo https y que quepa en el límite de la columna).
  v_avatar := coalesce(nullif(m->>'avatar_url', ''), nullif(m->>'picture', ''), '');
  if v_avatar !~ '^https://' or char_length(v_avatar) > 300 then v_avatar := ''; end if;

  loop
    begin
      insert into public.perfiles (id, username, nombre_display, avatar_url)
      values (new.id, v_user, left(coalesce(v_apodo, v_user), 30), v_avatar);
      exit;
    exception when unique_violation then
      n := n + 1; if n > 50 then raise; end if;
      v_user := v_base || n::text;
    end;
  end loop;
  return new;
end $$;
