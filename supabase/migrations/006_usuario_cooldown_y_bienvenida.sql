-- 006 · Cambio de @usuario cada 14 días + marca de "perfil completo" (formulario de bienvenida).
-- Aplicada en producción el 2026-10-04. Reglas:
--  · perfil_completo = false  → la persona aún no pasó por el formulario de bienvenida: elegir su @ es GRATIS (no cuenta como cambio).
--  · perfil_completo = true   → cada cambio de @ queda sellado en username_changed_at y bloquea nuevos cambios 14 días.
--  · perfil_completo solo sube (false → true): no se puede volver a false para saltarse el límite.
alter table public.perfiles add column if not exists username_changed_at timestamptz;
alter table public.perfiles add column if not exists perfil_completo boolean not null default false;

-- perfiles usa permisos por columna: las nuevas hay que concederlas expresamente.
grant select (username_changed_at, perfil_completo) on public.perfiles to anon, authenticated;
grant update (perfil_completo) on public.perfiles to authenticated;   -- username_changed_at NO: solo lo escribe el trigger

create or replace function private.perfiles_antes_de_actualizar() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.perfil_completo and not new.perfil_completo then new.perfil_completo := true; end if;   -- solo sube
  if new.username is distinct from old.username and old.perfil_completo then
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '14 days' then
      raise exception 'USERNAME_COOLDOWN:%', (old.username_changed_at + interval '14 days')::text using errcode = 'P0001';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end $$;

create trigger trg_perfiles_antes_actualizar before update on public.perfiles
  for each row execute function private.perfiles_antes_de_actualizar();

-- El alta marca perfil_completo = true solo si la persona eligió su @ en el formulario de registro (clave 'usuario').
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
  v_apodo := nullif(trim(regexp_replace(coalesce(
      nullif(m->>'apodo', ''), nullif(m->>'gamertag', ''), nullif(m #>> '{custom_claims,global_name}', ''),
      nullif(m->>'full_name', ''), nullif(m->>'name', ''), nullif(v_mail, ''), ''), '[<>]', '', 'g')), '');
  v_full := lower(regexp_replace(coalesce(nullif(m->>'usuario', ''), v_apodo, 'jugador'), '[^a-zA-Z0-9_]', '', 'g'));
  if v_full = '' then v_full := 'jugador'; end if;
  v_base := left(v_full, 16);
  v_user := left(v_full, 20);
  if v_user = any (v_reserv) then v_user := v_user || 'x'; v_base := left(v_full, 15) || 'x'; end if;
  v_avatar := coalesce(nullif(m->>'avatar_url', ''), nullif(m->>'picture', ''), '');
  if v_avatar !~ '^https://' or char_length(v_avatar) > 300 then v_avatar := ''; end if;
  loop
    begin
      insert into public.perfiles (id, username, nombre_display, avatar_url, perfil_completo)
      values (new.id, v_user, left(coalesce(v_apodo, v_user), 30), v_avatar, nullif(m->>'usuario', '') is not null);
      exit;
    exception when unique_violation then
      n := n + 1; if n > 50 then raise; end if;
      v_user := v_base || n::text;
    end;
  end loop;
  return new;
end $$;
