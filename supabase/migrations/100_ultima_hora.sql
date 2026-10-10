-- 100 · «Última hora» para Phoenix Link (API 1.10.0).
-- Tabla propia (no se mezcla con el chat ni con noticias de la web). Máximo 5 vigentes a la vez.
-- Gestiona moderador/admin desde la página Moderación. Phoenix Link la lee por GET /v1/noticias/ultima-hora.
-- Aplicada en BD como 100a_ultima_hora_tabla y 100b_ultima_hora_rpc.

create table if not exists public.noticias_ultima_hora (
  id int generated always as identity primary key,
  texto text not null check (char_length(texto) between 1 and 200 and texto !~ '[[:cntrl:]]' and texto = btrim(texto)),
  nivel text not null default 'info' check (nivel in ('info', 'importante', 'urgente')),
  enlace text check (enlace is null or (enlace ~ '^https://[^[:space:]]+$' and char_length(enlace) <= 500)),
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '24 hours',
  publicada boolean not null default true,
  autor_id uuid references public.perfiles(id) on delete set null,
  constraint uh_expira_ok check (expira_en > creado_en and expira_en <= creado_en + interval '7 days')
);

create index if not exists uh_vigentes_idx on public.noticias_ultima_hora (publicada, expira_en);

alter table public.noticias_ultima_hora enable row level security;

create policy uh_lectura on public.noticias_ultima_hora for select to authenticated
  using ((publicada and expira_en > now()) or private.es_moderador());

grant select on public.noticias_ultima_hora to authenticated;
revoke insert, update, delete on public.noticias_ultima_hora from anon, authenticated;

-- Crear (solo moderador/admin). Errores con formato 'CODIGO: mensaje'.
create or replace function public.uh_crear(p_texto text, p_nivel text default 'info', p_enlace text default null, p_horas int default 24)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text; e text; v_id int; v_n int; v_h int;
begin
  if (select auth.uid()) is null or not private.es_moderador() then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  t := btrim(regexp_replace(coalesce(p_texto, ''), '[[:space:][:cntrl:]]+', ' ', 'g'));
  if t = '' or char_length(t) > 200 then raise exception 'TEXTO_INVALIDO: el texto va de 1 a 200 caracteres, en una sola línea' using errcode = 'P0001'; end if;
  if p_nivel is null or p_nivel not in ('info', 'importante', 'urgente') then raise exception 'NIVEL_INVALIDO: usa info, importante o urgente' using errcode = 'P0001'; end if;
  e := nullif(btrim(coalesce(p_enlace, '')), '');
  if e is not null and (e !~ '^https://[^[:space:]]+$' or char_length(e) > 500) then raise exception 'ENLACE_INVALIDO: el enlace debe empezar por https://' using errcode = 'P0001'; end if;
  v_h := coalesce(p_horas, 24);
  if v_h < 1 or v_h > 168 then raise exception 'EXPIRA_INVALIDO: la noticia dura de 1 a 168 horas (máximo 7 días)' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(100100);
  select count(*) into v_n from public.noticias_ultima_hora where publicada and expira_en > now();
  if v_n >= 5 then raise exception 'LIMITE_VIGENTES: ya hay 5 noticias vigentes; retira o expira una' using errcode = 'P0001'; end if;
  insert into public.noticias_ultima_hora (texto, nivel, enlace, expira_en, autor_id)
  values (t, p_nivel, e, now() + make_interval(hours => v_h), (select auth.uid())) returning id into v_id;
  perform private.auditar_moderacion('crear', 'noticias_ultima_hora', v_id::text, 'Última hora · noticia publicada', jsonb_build_object('nivel', p_nivel, 'texto', t, 'horas', v_h), null);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Cerrar: 'expirar' (termina ya) o 'retirar' (deja de publicarse).
create or replace function public.uh_cerrar(p_id int, p_accion text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n public.noticias_ultima_hora;
begin
  if (select auth.uid()) is null or not private.es_moderador() then raise exception 'NO_AUTORIZADO' using errcode = 'P0001'; end if;
  if p_accion is null or p_accion not in ('expirar', 'retirar') then raise exception 'ACCION_INVALIDA: usa expirar o retirar' using errcode = 'P0001'; end if;
  select * into n from public.noticias_ultima_hora where id = p_id;
  if not found then raise exception 'NO_ENCONTRADA: esa noticia no existe' using errcode = 'P0001'; end if;
  if p_accion = 'retirar' then
    update public.noticias_ultima_hora set publicada = false where id = p_id;
  else
    update public.noticias_ultima_hora set expira_en = greatest(creado_en + interval '1 second', least(expira_en, now())) where id = p_id;
  end if;
  perform private.auditar_moderacion('ocultar', 'noticias_ultima_hora', p_id::text, 'Última hora · noticia ' || case when p_accion = 'retirar' then 'retirada' else 'expirada' end, jsonb_build_object('texto', n.texto), null);
  return jsonb_build_object('ok', true);
end $$;

-- Lectura para la API (solo service_role): vigentes, urgente > importante > info, más nuevas primero, máx. 5.
create or replace function public.noticias_api_ultima_hora()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'noticias', coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'texto', x.texto, 'nivel', x.nivel, 'enlace', x.enlace, 'creado_en', x.creado_en, 'expira_en', x.expira_en)
    order by case x.nivel when 'urgente' then 0 when 'importante' then 1 else 2 end, x.creado_en desc, x.id desc), '[]'::jsonb))
  from (select * from public.noticias_ultima_hora n where n.publicada and n.expira_en > now()
        order by case n.nivel when 'urgente' then 0 when 'importante' then 1 else 2 end, n.creado_en desc, n.id desc limit 5) x
$$;

revoke all on function public.uh_crear(text, text, text, int) from public, anon;
revoke all on function public.uh_cerrar(int, text) from public, anon;
revoke all on function public.noticias_api_ultima_hora() from public, anon, authenticated;
grant execute on function public.uh_crear(text, text, text, int) to authenticated;
grant execute on function public.uh_cerrar(int, text) to authenticated;
grant execute on function public.noticias_api_ultima_hora() to service_role;
