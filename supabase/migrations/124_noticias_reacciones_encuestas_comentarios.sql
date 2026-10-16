-- 124 · NOTICIAS SOCIALES (ronda 350): reacciones con emojis, encuestas y comentarios.
-- Copia el patrón del muro (022): tablas cerradas (RLS sin permisos directos) y todo por funciones RPC `security definer`.
-- Reutiliza: private.limitar_ritmo (031), private.bloquear_sancionados (032), private.es_moderador/es_staff (030), ia_propuestas (117).
-- Decisiones de FRALEX (16-oct-2026):
--   · 5 emojis: fuego 🔥, risa 😂, sorpresa 😮, aplauso 👏, calavera 💀. Uno por persona y noticia (tocar el mismo lo quita).
--   · Encuestas: las crea el staff o la Redacción IA. Las de la IA llegan APAGADAS y se encienden al aprobarlas en /bandeja-ia/.
--   · Comentarios: se publican directo, pero también salen en /bandeja-ia/ para que un moderador pueda eliminarlos.
-- Idempotente: se puede ejecutar varias veces.

-- ─── 1) Tablas ──────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.noticias_reacciones (
  noticia_id uuid not null references public.noticias(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('fuego', 'risa', 'sorpresa', 'aplauso', 'calavera')),
  created_at timestamptz not null default now(),
  primary key (noticia_id, usuario_id)
);
create index if not exists noticias_reacciones_usuario_idx on public.noticias_reacciones (usuario_id, created_at desc);

create table if not exists public.noticias_encuestas (
  id bigint generated always as identity primary key,
  noticia_id uuid not null unique references public.noticias(id) on delete cascade,     -- una encuesta por noticia
  pregunta text not null check (char_length(pregunta) between 3 and 140),
  opciones jsonb not null check (jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) between 2 and 4),
  activa boolean not null default false,
  origen text not null default 'staff' check (origen in ('staff', 'ia')),
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists noticias_encuestas_creado_por_idx on public.noticias_encuestas (creado_por);

create table if not exists public.noticias_votos (
  encuesta_id bigint not null references public.noticias_encuestas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  opcion smallint not null check (opcion between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (encuesta_id, usuario_id)                                                   -- un voto por persona
);
create index if not exists noticias_votos_usuario_idx on public.noticias_votos (usuario_id, created_at desc);

create table if not exists public.noticias_comentarios (
  id bigint generated always as identity primary key,
  noticia_id uuid not null references public.noticias(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  oculto boolean not null default false,                                                  -- «eliminar» = ocultar (queda rastro para moderación)
  oculto_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists noticias_comentarios_noticia_idx on public.noticias_comentarios (noticia_id, id desc) where not oculto;
create index if not exists noticias_comentarios_autor_idx on public.noticias_comentarios (autor_id, created_at desc);
create index if not exists noticias_comentarios_recientes_idx on public.noticias_comentarios (created_at desc);
create index if not exists noticias_comentarios_oculto_por_idx on public.noticias_comentarios (oculto_por);

alter table public.noticias_reacciones enable row level security;
alter table public.noticias_encuestas enable row level security;
alter table public.noticias_votos enable row level security;
alter table public.noticias_comentarios enable row level security;
revoke all on public.noticias_reacciones, public.noticias_encuestas, public.noticias_votos, public.noticias_comentarios from anon, authenticated;

-- ─── 2) Sancionados no participan (zy_…) y límites de ritmo (zz_…) ──────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select * from (values
    ('noticias_reacciones',  'usuario_id', 120, '1 hour',     'Estás reaccionando muy rápido: espera unos minutos.'),
    ('noticias_votos',       'usuario_id',  60, '1 hour',     'Estás votando muy rápido: espera unos minutos.'),
    ('noticias_comentarios', 'autor_id',     5, '2 minutes',  'Estás comentando muy rápido: espera un momento.')
  ) as v(tabla, col, maximo, ventana, aviso)
  loop
    execute format('drop trigger if exists zy_bloqueo_sancion on public.%I', r.tabla);
    execute format('create trigger zy_bloqueo_sancion before insert on public.%I for each row execute function private.bloquear_sancionados(%L)', r.tabla, r.col);
    execute format('drop trigger if exists zz_limite_ritmo on public.%I', r.tabla);
    execute format('create trigger zz_limite_ritmo before insert on public.%I for each row execute function private.limitar_ritmo(%L, %L, %L, %L)',
                   r.tabla, r.col, r.maximo::text, r.ventana, r.aviso);
  end loop;
end $$;
-- Tope extra de comentarios: 40 por hora por persona.
drop trigger if exists zz_limite_ritmo_hora on public.noticias_comentarios;
create trigger zz_limite_ritmo_hora before insert on public.noticias_comentarios
  for each row execute function private.limitar_ritmo('autor_id', '40', '1 hour', 'Has comentado mucho en poco tiempo: vuelve en un rato.');

-- ─── 3) ¿Se puede ver/participar en esta noticia? (publicada, o borrador visto por un admin) ─────────────────────────
create or replace function private.noticia_visible(p_noticia uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.noticias n where n.id = p_noticia and (n.publicada or private.es_admin()));
$$;
revoke all on function private.noticia_visible(uuid) from public, anon, authenticated;

-- ─── 4) Lectura: todo lo social de una noticia en una sola llamada ───────────────────────────────────────────────────
-- Los % de la encuesta solo se entregan a quien ya votó (o al staff), para no influir en el voto.
create or replace function public.noticia_social(p_noticia uuid, p_limite integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); staff boolean := private.es_staff(); enc public.noticias_encuestas; mi_voto smallint; res jsonb;
begin
  if not private.noticia_visible(p_noticia) then raise exception 'Esa noticia no existe.'; end if;
  select * into enc from public.noticias_encuestas e where e.noticia_id = p_noticia and (e.activa or staff);
  if enc.id is not null and yo is not null then
    select v.opcion into mi_voto from public.noticias_votos v where v.encuesta_id = enc.id and v.usuario_id = yo;
  end if;
  select jsonb_build_object(
    'reacciones', coalesce((select jsonb_object_agg(r.tipo, r.n) from (select tipo, count(*) as n from public.noticias_reacciones where noticia_id = p_noticia group by tipo) r), '{}'::jsonb),
    'mi_reaccion', (select r.tipo from public.noticias_reacciones r where r.noticia_id = p_noticia and r.usuario_id = yo),
    'encuesta', case when enc.id is null then null else jsonb_build_object(
        'id', enc.id, 'pregunta', enc.pregunta, 'opciones', enc.opciones, 'activa', enc.activa, 'origen', enc.origen,
        'mi_voto', mi_voto,
        'total', (select count(*) from public.noticias_votos v where v.encuesta_id = enc.id),
        'votos', case when mi_voto is not null or staff then
                   (select coalesce(jsonb_agg(coalesce(c.n, 0) order by g.i), '[]'::jsonb)
                      from generate_series(0, jsonb_array_length(enc.opciones) - 1) g(i)
                      left join (select opcion, count(*) as n from public.noticias_votos where encuesta_id = enc.id group by opcion) c on c.opcion = g.i)
                 else null end) end,
    'comentarios_total', (select count(*) from public.noticias_comentarios c where c.noticia_id = p_noticia and not c.oculto),
    'comentarios', coalesce((select jsonb_agg(x order by x.id desc) from (
        select c.id, c.texto, c.created_at, c.autor_id = yo as mio,
               p.username, coalesce(p.nombre_display, p.username) as nombre, p.avatar_url
          from public.noticias_comentarios c left join public.perfiles p on p.id = c.autor_id
         where c.noticia_id = p_noticia and not c.oculto
         order by c.id desc limit least(greatest(coalesce(p_limite, 50), 1), 100)) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- ─── 5) Escritura (solo con sesión) ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.noticia_reaccionar(p_noticia uuid, p_tipo text) returns text
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); previa text;
begin
  if not private.noticia_visible(p_noticia) then raise exception 'Esa noticia ya no existe.'; end if;
  select tipo into previa from public.noticias_reacciones where noticia_id = p_noticia and usuario_id = yo;
  if previa = p_tipo then delete from public.noticias_reacciones where noticia_id = p_noticia and usuario_id = yo; return null; end if;
  if previa is not null then
    update public.noticias_reacciones set tipo = p_tipo where noticia_id = p_noticia and usuario_id = yo;   -- cambiar no cuenta para el límite de ritmo
  else
    insert into public.noticias_reacciones (noticia_id, usuario_id, tipo) values (p_noticia, yo, p_tipo);
  end if;
  return p_tipo;
end $$;

create or replace function public.noticia_votar(p_encuesta bigint, p_opcion smallint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); enc public.noticias_encuestas;
begin
  select * into enc from public.noticias_encuestas where id = p_encuesta;
  if enc.id is null or not enc.activa or not private.noticia_visible(enc.noticia_id) then raise exception 'Esa encuesta no está abierta.'; end if;
  if p_opcion is null or p_opcion < 0 or p_opcion >= jsonb_array_length(enc.opciones) then raise exception 'Elige una opción válida.'; end if;
  insert into public.noticias_votos (encuesta_id, usuario_id, opcion) values (p_encuesta, yo, p_opcion)
  on conflict (encuesta_id, usuario_id) do nothing;
  if not found then raise exception 'Ya votaste en esta encuesta.'; end if;
end $$;

create or replace function public.noticia_comentar(p_noticia uuid, p_texto text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t text := btrim(coalesce(p_texto, '')); nuevo bigint;
begin
  if not private.noticia_visible(p_noticia) then raise exception 'Esa noticia ya no existe.'; end if;
  if char_length(t) = 0 then raise exception 'Escribe algo antes de enviar.'; end if;
  if char_length(t) > 500 then raise exception 'El comentario admite máximo 500 caracteres.'; end if;
  insert into public.noticias_comentarios (noticia_id, autor_id, texto) values (p_noticia, yo, t) returning id into nuevo;
  return nuevo;
end $$;

-- Eliminar = ocultar. Puede hacerlo el autor o un moderador/admin (queda anotado quién).
create or replace function public.noticia_borrar_comentario(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); c public.noticias_comentarios;
begin
  select * into c from public.noticias_comentarios where id = p_id;
  if c.id is null or c.oculto then raise exception 'Ese comentario ya no existe.'; end if;
  if c.autor_id <> yo and not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update public.noticias_comentarios set oculto = true, oculto_por = yo where id = p_id;
end $$;

-- ─── 6) Staff: crear/editar/apagar la encuesta de una noticia ───────────────────────────────────────────────────────
-- Si ya tiene votos, no se pueden cambiar la pregunta ni las opciones (solo encender/apagar), para no falsear resultados.
create or replace function public.noticia_encuesta_guardar(p_noticia uuid, p_pregunta text, p_opciones jsonb, p_activa boolean) returns bigint
language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); preg text := btrim(coalesce(p_pregunta, '')); ops jsonb; enc public.noticias_encuestas; nvotos integer;
begin
  if not private.es_staff() then raise exception 'NO_AUTORIZADO'; end if;
  if not exists (select 1 from public.noticias where id = p_noticia) then raise exception 'Esa noticia no existe.'; end if;
  select coalesce(jsonb_agg(to_jsonb(left(btrim(o), 60))), '[]'::jsonb) into ops
    from jsonb_array_elements_text(case when jsonb_typeof(p_opciones) = 'array' then p_opciones else '[]'::jsonb end) o where btrim(o) <> '';
  if char_length(preg) < 3 or char_length(preg) > 140 then raise exception 'La pregunta debe tener entre 3 y 140 letras.'; end if;
  if jsonb_array_length(ops) not between 2 and 4 then raise exception 'La encuesta necesita entre 2 y 4 opciones.'; end if;
  select * into enc from public.noticias_encuestas where noticia_id = p_noticia;
  if enc.id is null then
    insert into public.noticias_encuestas (noticia_id, pregunta, opciones, activa, origen, creado_por)
    values (p_noticia, preg, ops, coalesce(p_activa, true), 'staff', yo) returning * into enc;
    return enc.id;
  end if;
  select count(*) into nvotos from public.noticias_votos where encuesta_id = enc.id;
  if nvotos > 0 and (enc.pregunta <> preg or enc.opciones <> ops) then raise exception 'Ya tiene votos: solo puedes abrirla o cerrarla.'; end if;
  update public.noticias_encuestas set pregunta = preg, opciones = ops, activa = coalesce(p_activa, activa) where id = enc.id;
  return enc.id;
end $$;

create or replace function public.noticia_encuesta_borrar(p_noticia uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'NO_AUTORIZADO'; end if;
  delete from public.noticias_encuestas where noticia_id = p_noticia;
end $$;

-- ─── 7) Bandeja IA: la Redacción IA también propone encuestas ───────────────────────────────────────────────────────
-- La IA (service_role) inserta la encuesta con activa=false y origen='ia', y una propuesta tipo 'encuesta' con encuesta_id.
-- Aprobarla = encenderla. Rechazarla = sigue apagada (no se borra).
alter table public.ia_propuestas add column if not exists encuesta_id bigint references public.noticias_encuestas(id) on delete cascade;
create index if not exists ia_propuestas_encuesta_idx on public.ia_propuestas (encuesta_id);
alter table public.ia_propuestas drop constraint if exists ia_propuestas_tipo_check;
alter table public.ia_propuestas add constraint ia_propuestas_tipo_check check (tipo in ('noticia', 'aviso', 'encuesta'));

-- Igual que en la 117, más el caso «encuesta».
create or replace function public.ia_revisar(p_id bigint, p_aprobar boolean, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.ia_propuestas;
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  update public.ia_propuestas
     set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         motivo = nullif(left(coalesce(p_motivo, ''), 500), ''), revisado_por = auth.uid(), revisado_en = now()
   where id = p_id and estado = 'pendiente'
  returning * into v;
  if v.id is null then raise exception 'NO_PENDIENTE'; end if;
  if p_aprobar and v.tipo = 'noticia' and v.noticia_id is not null then
    update public.noticias set publicada = true, publicada_en = now() where id = v.noticia_id and not publicada;
  end if;
  if p_aprobar and v.tipo = 'encuesta' and v.encuesta_id is not null then
    update public.noticias_encuestas set activa = true where id = v.encuesta_id;
  end if;
  return jsonb_build_object('ok', true, 'estado', v.estado);
end $$;

-- Moderación de comentarios: los últimos comentarios de todas las noticias (incluye los ya eliminados, marcados).
create or replace function public.noticias_comentarios_recientes(p_limite integer default 50)
returns table (id bigint, texto text, oculto boolean, created_at timestamptz, autor text, autor_username text, noticia_slug text, noticia_titulo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_moderador() then raise exception 'NO_AUTORIZADO'; end if;
  return query
    select c.id, c.texto, c.oculto, c.created_at, coalesce(p.nombre_display, p.username), p.username, n.slug, n.titulo
      from public.noticias_comentarios c
      join public.noticias n on n.id = c.noticia_id
      left join public.perfiles p on p.id = c.autor_id
     order by c.created_at desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

-- ─── 8) Permisos de las funciones ───────────────────────────────────────────────────────────────────────────────────
do $$ declare f text; begin
  execute 'revoke all on function public.noticia_social(uuid,integer) from public';
  execute 'grant execute on function public.noticia_social(uuid,integer) to anon, authenticated';
  foreach f in array array['noticia_reaccionar(uuid,text)', 'noticia_votar(bigint,smallint)', 'noticia_comentar(uuid,text)',
                           'noticia_borrar_comentario(bigint)', 'noticia_encuesta_guardar(uuid,text,jsonb,boolean)',
                           'noticia_encuesta_borrar(uuid)', 'noticias_comentarios_recientes(integer)', 'ia_revisar(bigint,boolean,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
