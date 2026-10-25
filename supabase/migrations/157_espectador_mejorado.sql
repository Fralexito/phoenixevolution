-- 157 · Modo espectador mejorado (25-oct-2026, Cuenta 2): CHAT DE LA SALA + PREDICCIÓN EN VIVO de un duelo.
-- ESTADO: APLICADA el 25-oct-2026 y probada en seco (supabase/tests/157_espectador_mejorado_test.sql).
-- Quién entra: los jugadores, el host, los espectadores APROBADOS del duelo y el staff (mismo permiso que ver el partido).
-- Chat: mismas reglas que el chat general (099): sancionados y cuentas bloqueadas por edad no escriben; menores y adultos no se leen
--   entre sí (grupo de edad; el staff ve todo); 1 mensaje cada 3 s, máx. 60 por persona y duelo, 300 caracteres; el host o un
--   moderador puede ocultar mensajes (nada se borra). El chat queda abierto mientras el duelo esté ACEPTADO o EN_JUEGO y 2 h después.
-- Predicción: solo los ESPECTADORES (no los jugadores ni el host) eligen quién gana: lado A, lado B o empate; se puede cambiar
--   hasta que haya un marcador propuesto o confirmado. SIN premio (no es apuesta y no se puede «farmear»); al confirmarse se ve quién acertó.
-- Sin DELETE ni DROP TRIGGER.
create table if not exists public.reto_chat (
  id bigint generated always as identity primary key,
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  autor uuid not null references public.perfiles (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 300),
  grupo_edad text not null default 'adulto' check (grupo_edad in ('adulto', 'menor')),
  autor_staff boolean not null default false,
  creado timestamptz not null default now(),
  oculto boolean not null default false
);
create index if not exists reto_chat_reto_idx on public.reto_chat (reto_id, id);
create index if not exists reto_chat_autor_idx on public.reto_chat (autor, creado desc);
create table if not exists public.reto_predicciones (
  reto_id integer not null references public.retos_matchmaking (id) on delete cascade,
  usuario uuid not null references public.perfiles (id) on delete cascade,
  lado text not null check (lado in ('A', 'B', 'E')),
  actualizado timestamptz not null default now(),
  primary key (reto_id, usuario)
);
alter table public.reto_chat enable row level security;
alter table public.reto_predicciones enable row level security;
revoke all on public.reto_chat, public.reto_predicciones from anon, authenticated;

-- ¿Puede entrar a la sala del duelo? 'jugador' | 'host' | 'espectador' | 'staff' | null
create or replace function private.rol_en_sala_reto(p_reto integer, p_uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when p_uid is null then null
    when private.lado_en_reto(p_reto, p_uid) is not null then 'jugador'
    when exists (select 1 from public.retos_matchmaking r where r.id = p_reto and r.host_id = p_uid) then 'host'
    when exists (select 1 from public.reto_espectadores e where e.reto_id = p_reto and e.usuario_id = p_uid and e.estado = 'APROBADO') then 'espectador'
    when private.es_staff_id(p_uid) then 'staff'
  end
$$;
-- Chat abierto: duelo aceptado o en juego, o terminado hace menos de 2 horas.
create or replace function private.chat_reto_abierto(p_reto integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.retos_matchmaking r where r.id = p_reto
    and (r.estado::text in ('ACEPTADO', 'EN_JUEGO') or (r.estado::text = 'FINALIZADO' and coalesce(r.cerrado_at, now()) > now() - interval '2 hours')))
$$;
revoke all on function private.rol_en_sala_reto(integer, uuid), private.chat_reto_abierto(integer) from public, anon, authenticated;

create or replace function public.sala_chat_enviar(p_reto integer, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); v_rol text := private.rol_en_sala_reto(p_reto, v_yo); t text; s public.sanciones; v_cat text; v_ult timestamptz; v_id bigint;
begin
  if v_rol is null then raise exception 'Solo los jugadores, el host y los espectadores aprobados escriben en esta sala.' using errcode = '42501'; end if;
  if not private.chat_reto_abierto(p_reto) then raise exception 'El chat de este duelo ya cerró.' using errcode = 'P0001'; end if;
  t := btrim(regexp_replace(coalesce(p_texto, ''), '[[:space:][:cntrl:]]+', ' ', 'g'));
  if t = '' then raise exception 'Escribe algo antes de enviar.' using errcode = '22023'; end if;
  if char_length(t) > 300 then raise exception 'El mensaje admite hasta 300 caracteres.' using errcode = '22023'; end if;
  s := private.sancion_vigente(v_yo);
  if s.id is not null then raise exception '%', private.texto_sancion(s) using errcode = '42501'; end if;
  v_cat := private.categoria_edad(v_yo);
  if v_cat = 'bloqueado' then raise exception 'Tu cuenta no puede escribir en chats.' using errcode = '42501'; end if;
  select max(creado) into v_ult from public.reto_chat where autor = v_yo;
  if v_ult is not null and now() - v_ult < interval '3 seconds' then raise exception 'Anti-spam: un mensaje cada 3 segundos.' using errcode = 'P0001'; end if;
  if v_rol <> 'staff' and (select count(*) from public.reto_chat where reto_id = p_reto and autor = v_yo) >= 60 then
    raise exception 'Llegaste al máximo de mensajes en este duelo.' using errcode = 'P0001'; end if;
  insert into public.reto_chat (reto_id, autor, texto, grupo_edad, autor_staff)
  values (p_reto, v_yo, t, case when v_cat = 'menor' then 'menor' else 'adulto' end, v_rol = 'staff' or private.es_staff_id(v_yo)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Mensajes nuevos desde p_desde (0 = los últimos 50) + predicción. Todo en una sola llamada para la pantalla (pregunta cada pocos segundos).
create or replace function public.sala_en_vivo(p_reto integer, p_desde bigint default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := (select auth.uid()); v_rol text := private.rol_en_sala_reto(p_reto, v_yo); v_staff boolean; v_grupo text; r public.retos_matchmaking;
  v_res public.resultados_duelo; v_desde bigint := greatest(coalesce(p_desde, 0), 0); v_ganador text;
begin
  if v_rol is null then return jsonb_build_object('visible', false); end if;
  select * into r from public.retos_matchmaking where id = p_reto;
  v_staff := private.es_staff_id(v_yo);
  v_grupo := case when private.categoria_edad(v_yo) = 'menor' then 'menor' else 'adulto' end;
  select * into v_res from public.resultados_duelo where reto_id = p_reto;
  v_ganador := case when v_res.estado = 'CONFIRMADO' then case when v_res.goles_a > v_res.goles_b then 'A' when v_res.goles_b > v_res.goles_a then 'B' else 'E' end end;
  return jsonb_build_object('visible', true, 'rol', v_rol, 'estado', r.estado::text, 'chat_abierto', private.chat_reto_abierto(p_reto),
    'puedo_moderar', v_staff or coalesce(r.host_id = v_yo, false),
    'a', jsonb_build_object('nombre', private.nombre(r.retador_id), 'tam', r.tam_a),
    'b', jsonb_build_object('nombre', private.nombre(r.rival_id), 'tam', r.tam_b),
    'mensajes', coalesce((select jsonb_agg(x order by (x ->> 'id')::bigint) from (
        select jsonb_build_object('id', c.id, 'nombre', private.nombre(c.autor), 'texto', c.texto, 'creado', c.creado, 'mio', c.autor = v_yo,
          'rol', private.rol_en_sala_reto(p_reto, c.autor)) x
        from public.reto_chat c
        where c.reto_id = p_reto and c.id > v_desde and not c.oculto and (v_staff or c.autor_staff or c.grupo_edad = v_grupo)
        order by case when v_desde = 0 then -c.id else c.id end limit 50) t), '[]'::jsonb),
    'ocultos', coalesce((select jsonb_agg(c.id) from public.reto_chat c where c.reto_id = p_reto and c.oculto and c.id > greatest(v_desde - 200, 0)), '[]'::jsonb),
    'prediccion', jsonb_build_object(
      'abierta', r.estado::text in ('ACEPTADO', 'EN_JUEGO', 'FINALIZADO') and v_res.reto_id is null,
      'puedo', v_rol = 'espectador' and r.estado::text in ('ACEPTADO', 'EN_JUEGO', 'FINALIZADO') and v_res.reto_id is null,
      'mia', (select lado from public.reto_predicciones where reto_id = p_reto and usuario = v_yo),
      'a', (select count(*) from public.reto_predicciones where reto_id = p_reto and lado = 'A'),
      'b', (select count(*) from public.reto_predicciones where reto_id = p_reto and lado = 'B'),
      'e', (select count(*) from public.reto_predicciones where reto_id = p_reto and lado = 'E'),
      'resultado', v_ganador,
      'acertaron', case when v_ganador is null then null else (select count(*) from public.reto_predicciones where reto_id = p_reto and lado = v_ganador) end));
end $$;

create or replace function public.sala_prediccion(p_reto integer, p_lado text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido();
begin
  if coalesce(p_lado, '') not in ('A', 'B', 'E') then raise exception 'Elige A, B o empate.' using errcode = '22023'; end if;
  if private.rol_en_sala_reto(p_reto, v_yo) is distinct from 'espectador' then raise exception 'Solo los espectadores aprobados predicen.' using errcode = '42501'; end if;
  if exists (select 1 from public.resultados_duelo where reto_id = p_reto) then raise exception 'Ya hay marcador: la predicción cerró.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.retos_matchmaking where id = p_reto and estado::text in ('ACEPTADO', 'EN_JUEGO', 'FINALIZADO')) then
    raise exception 'Este duelo no admite predicciones.' using errcode = 'P0001'; end if;
  insert into public.reto_predicciones (reto_id, usuario, lado) values (p_reto, v_yo, p_lado)
    on conflict (reto_id, usuario) do update set lado = excluded.lado, actualizado = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.sala_chat_ocultar(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := private.uid_requerido(); c public.reto_chat;
begin
  select * into c from public.reto_chat where id = p_id;
  if not found then raise exception 'Ese mensaje no existe.' using errcode = 'P0001'; end if;
  if not (c.autor = v_yo or private.es_moderador() or exists (select 1 from public.retos_matchmaking r where r.id = c.reto_id and r.host_id = v_yo)) then
    raise exception 'No puedes ocultar ese mensaje.' using errcode = '42501'; end if;
  update public.reto_chat set oculto = true where id = p_id;
end $$;

revoke all on function public.sala_chat_enviar(integer, text), public.sala_en_vivo(integer, bigint), public.sala_prediccion(integer, text), public.sala_chat_ocultar(bigint) from public, anon;
grant execute on function public.sala_chat_enviar(integer, text), public.sala_en_vivo(integer, bigint), public.sala_prediccion(integer, text), public.sala_chat_ocultar(bigint) to authenticated;
