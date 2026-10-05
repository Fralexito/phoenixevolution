-- 031 · LÍMITES DE RITMO (anti-spam y anti-inundación). Seguridad, fase 2.
-- Depende de: 017 (amistades, seguidores), 018 (chat), 022 (reacciones), 003 (retos), 023 (bucket muro) y 030 (es_moderador).
--
-- IDEA: muchas funciones ya traían su propio límite (mensajes 20/min, muro 10/h, respuestas 20/h, historias 15/día,
-- clips 10/h, solicitudes pendientes ≤ 30). Esta migración cubre los HUECOS con un trigger BEFORE INSERT genérico:
-- si alguien intenta insertar «demasiado rápido», la base de datos lo rechaza con un mensaje claro, sin importar
-- si vino de la web, de una función o de una petición manipulada.
--
-- Exenciones: moderadores/admin (trabajo masivo legítimo) y sesiones sin usuario (SQL Editor, mantenimiento).
-- El mensaje de error llega tal cual al toast de la web (P0001 = excepción de usuario).
-- Idempotente: se puede ejecutar varias veces.

-- ─── 1) Trigger genérico «máximo N filas por persona en una ventana de tiempo» ─────────────────────────────────────────
-- Argumentos (los fija quien crea el trigger, nunca el usuario): columna_autor, máximo, ventana, mensaje.
create or replace function private.limitar_ritmo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  col text := tg_argv[0]; maximo integer := tg_argv[1]::integer; ventana interval := tg_argv[2]::interval; aviso text := tg_argv[3];
  autor uuid; n integer;
begin
  if (select auth.uid()) is null or private.es_moderador() then return new; end if;
  autor := nullif(to_jsonb(new) ->> col, '')::uuid;
  if autor is null then return new; end if;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2', tg_table_schema, tg_table_name, col)
    using autor, ventana into n;
  if n >= maximo then raise exception '%', aviso using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function private.limitar_ritmo() from public, anon, authenticated;

-- ─── 2) Índices para que el conteo sea instantáneo (sin ellos cada inserción recorrería toda la tabla) ──────────────────
create index if not exists muro_reacciones_usuario_idx on public.muro_reacciones (usuario_id, created_at desc);
create index if not exists reportes_chat_reportante_idx on public.reportes_chat (reportante_id, created_at desc);
create index if not exists conversaciones_creador_idx on public.conversaciones (creador_id, created_at desc);
create index if not exists amistades_solicitante_idx on public.amistades (solicitante, created_at desc);
create index if not exists seguidores_seguidor_idx on public.seguidores (seguidor_id, created_at desc);

-- ─── 3) Un trigger por tabla (tabla · columna del autor · máximo · ventana · mensaje) ──────────────────────────────────
do $$
declare r record;
begin
  for r in select * from (values
    ('retos_matchmaking', 'retador_id',    10,  '1 hour', 'Estás creando retos muy rápido: máximo 10 por hora.'),
    ('muro_reacciones',   'usuario_id',   120,  '1 hour', 'Estás reaccionando muy rápido: espera unos minutos.'),
    ('seguidores',        'seguidor_id',   60,  '1 hour', 'Estás siguiendo a demasiada gente muy rápido: espera un rato.'),
    ('reportes_chat',     'reportante_id', 20,  '1 hour', 'Has enviado muchos reportes seguidos: espera un rato.'),
    ('conversaciones',    'creador_id',    10,  '1 hour', 'Estás creando conversaciones muy rápido: máximo 10 por hora.'),
    ('amistades',         'solicitante',   30,  '1 hour', 'Estás enviando solicitudes muy rápido: máximo 30 por hora.'),
    ('mensajes_privados', 'autor_id',     300,  '1 hour', 'Has enviado muchos mensajes en poco tiempo: espera un rato.')
  ) as v(tabla, col, maximo, ventana, aviso)
  loop
    execute format('drop trigger if exists zz_limite_ritmo on public.%I', r.tabla);
    execute format('create trigger zz_limite_ritmo before insert on public.%I for each row execute function private.limitar_ritmo(%L, %L, %L, %L)',
                   r.tabla, r.col, r.maximo::text, r.ventana, r.aviso);
  end loop;
end $$;

-- ─── 4) Retos: además del ritmo, un tope de retos ABIERTOS a la vez (si no, se inunda la lista pública) ─────────────────
create or replace function private.limitar_retos_abiertos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.es_moderador() then return new; end if;
  if (select count(*) from public.retos_matchmaking where retador_id = new.retador_id and estado::text = 'BUSCANDO') >= 5 then
    raise exception 'Ya tienes 5 retos abiertos: cancela alguno o espera a que los acepten.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.limitar_retos_abiertos() from public, anon, authenticated;
drop trigger if exists zz_limite_abiertos on public.retos_matchmaking;
create trigger zz_limite_abiertos before insert on public.retos_matchmaking
  for each row execute function private.limitar_retos_abiertos();

-- ─── 5) Bucket de fotos del muro: ya limitaba el peso por archivo (1,5 MB) y el tipo; faltaba la CANTIDAD por persona ───
-- (el bucket `muro-video` ya tiene su tope de 3 desde la 027; los videos nuevos van a R2 con tope en el Worker).
-- El conteo vive en una función security definer: una política que consulta su PROPIA tabla puede dar «infinite recursion»
-- y además dependería de que exista la política de lectura. OJO (lección de la 029): las políticas se ejecutan con el rol
-- de quien sube, así que esa persona necesita EXECUTE sobre la función.
create or replace function private.cuenta_fotos_muro(p_uid uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from storage.objects o where o.bucket_id = 'muro' and (storage.foldername(o.name))[1] = p_uid::text
$$;
revoke all on function private.cuenta_fotos_muro(uuid) from public, anon;
grant execute on function private.cuenta_fotos_muro(uuid) to authenticated;

drop policy if exists muro_insert_propio on storage.objects;
create policy muro_insert_propio on storage.objects for insert to authenticated
  with check (
    bucket_id = 'muro' and (storage.foldername(name))[1] = ((select auth.uid()))::text
    and private.cuenta_fotos_muro((select auth.uid())) < 300
  );
