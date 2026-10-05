-- 046 · OLA C (5/5) · PUENTE CON DISCORD (webhook, sin bot). Depende de 042 (eventos), 045 (ranking_competitivo), pg_cron y Supabase Vault.
-- Qué hace: (1) RESUMEN DIARIO a las 08:00 de Lima en un canal de Discord (partidos confirmados ayer, top competitivo del mes, eventos de las próximas 24 h);
--           (2) AVISO INMEDIATO cuando se publica un evento nuevo.
-- Seguridad: la URL del webhook es un SECRETO → vive en Vault (nunca en tablas ni en el código). Solo se envía a https://discord.com/api/webhooks/… (anti-SSRF).
--   Los mensajes no pueden mencionar a nadie (allowed_mentions vacío), el texto de usuarios se limpia, y solo salen datos que cualquiera ya podría ver (perfiles públicos).
--   Un fallo de Discord NUNCA bloquea la acción del usuario (todo va envuelto y queda en discord_envios).
-- Sin configurar no hace nada (ni errores). Cómo configurarlo: ver 046b_configurar_discord.sql.

create extension if not exists pg_net with schema extensions;

-- ─── 1) Registro de envíos (cerrado) ────────────────────────────────────────────────────────────────
create table if not exists public.discord_envios (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('resumen', 'evento', 'prueba')),
  clave text not null,                              -- día (Lima) del resumen, id del evento, o marca de la prueba: evita enviar dos veces lo mismo
  estado text not null check (estado in ('ENVIADO', 'ERROR')),
  detalle text,
  created_at timestamptz not null default now(),
  unique (tipo, clave)
);
alter table public.discord_envios enable row level security;
revoke all on public.discord_envios from anon, authenticated;

-- ─── 2) Ayudantes ───────────────────────────────────────────────────────────────────────────────────
create or replace function private.url_sitio() returns text language sql immutable set search_path = '' as $$ select 'https://fralexito.github.io/phoenixevolution/' $$;

-- Texto de usuario → seguro para Discord (sin menciones, formato ni enlaces raros) y con tope.
create or replace function private.discord_limpio(p_texto text, p_max integer default 40) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(regexp_replace(coalesce(p_texto, ''), '[@<>`*_~|\\\[\]]', '', 'g'), '\s+', ' ', 'g')), p_max)
$$;

-- URL del webhook desde Vault; nula si no está configurada o no es de Discord.
create or replace function private.discord_url() returns text
language plpgsql stable security definer set search_path = '' as $$
declare u text;
begin
  select decrypted_secret into u from vault.decrypted_secrets where name = 'discord_webhook' limit 1;
  if u is null or u !~ '^https://(discord|discordapp)\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$' then return null; end if;
  return u;
end $$;

-- Envía un mensaje (una sola vez por tipo+clave). → 'ENVIADO' | 'DUPLICADO' | 'SIN_CONFIGURAR' | 'ERROR'. Nunca lanza.
create or replace function private.discord_enviar(p_tipo text, p_clave text, p_payload jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare u text := private.discord_url(); nuevo bigint; req bigint;
begin
  if u is null then return 'SIN_CONFIGURAR'; end if;
  insert into public.discord_envios (tipo, clave, estado) values (p_tipo, p_clave, 'ENVIADO') on conflict (tipo, clave) do nothing returning id into nuevo;
  if nuevo is null then return 'DUPLICADO'; end if;
  begin
    select net.http_post(url := u, body := p_payload || jsonb_build_object('allowed_mentions', jsonb_build_object('parse', '[]'::jsonb), 'username', 'Phoenix Evolution Series'),
                         headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 5000) into req;
    update public.discord_envios set detalle = 'solicitud ' || req where id = nuevo;
    return 'ENVIADO';
  exception when others then
    update public.discord_envios set estado = 'ERROR', detalle = left(sqlerrm, 300) where id = nuevo;
    raise warning '[discord] % %: %', p_tipo, p_clave, sqlerrm;
    return 'ERROR';
  end;
end $$;

-- ─── 3) Resumen diario ──────────────────────────────────────────────────────────────────────────────
create or replace function private.resumen_diario() returns text
language plpgsql security definer set search_path = '' as $$
declare hoy_ini timestamptz := private.inicio_semana_lima(now()); dia_ini timestamptz; ayer_ini timestamptz; n integer; top text; evs text; campos jsonb := '[]'::jsonb; dia date;
begin
  dia_ini := (date_trunc('day', (now() at time zone 'UTC') - interval '5 hours') + interval '5 hours') at time zone 'UTC';
  ayer_ini := dia_ini - interval '1 day'; dia := (dia_ini at time zone 'UTC' - interval '5 hours')::date;
  select count(*) into n from public.resultados_duelo where estado = 'CONFIRMADO' and updated_at >= ayer_ini and updated_at < dia_ini;
  if n > 0 then campos := campos || jsonb_build_array(jsonb_build_object('name', '⚽ Partidos confirmados ayer', 'value', n::text, 'inline', true)); end if;
  select string_agg((r->>'pos') || '. ' || private.discord_limpio(r->>'nombre') || ' — ' || (r->>'puntos') || ' pts', E'\n' order by (r->>'pos')::int) into top
    from jsonb_array_elements(public.ranking_competitivo(null, 3)) r;
  if top is not null then campos := campos || jsonb_build_array(jsonb_build_object('name', '🏆 Top competitivo del mes', 'value', top, 'inline', false)); end if;
  select string_agg('• ' || private.discord_limpio(titulo, 60) || ' — ' || to_char(inicia_at at time zone 'UTC' - interval '5 hours', 'DD/MM HH24:MI') || ' (Lima)', E'\n' order by inicia_at) into evs
    from public.eventos where not cancelado and inicia_at >= now() and inicia_at < now() + interval '24 hours';
  if evs is not null then campos := campos || jsonb_build_array(jsonb_build_object('name', '📅 Eventos de las próximas 24 h', 'value', evs, 'inline', false)); end if;
  if jsonb_array_length(campos) = 0 then return 'OMITIDO'; end if;                      -- nada que contar: no se molesta al canal
  return private.discord_enviar('resumen', dia::text, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
    'title', '📊 Resumen del día · ' || to_char(dia, 'DD/MM/YYYY'), 'url', private.url_sitio() || 'ranking/', 'color', 49407, 'fields', campos,
    'footer', jsonb_build_object('text', 'Phoenix Evolution Series')))));
exception when others then
  raise warning '[discord] resumen_diario: %', sqlerrm; return 'ERROR';
end $$;

-- ─── 4) Aviso de evento nuevo ───────────────────────────────────────────────────────────────────────
create or replace function private.discord_evento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cancelado then return new; end if;
  perform private.discord_enviar('evento', new.id::text, jsonb_build_object('embeds', jsonb_build_array(jsonb_build_object(
    'title', '📅 Nuevo evento: ' || private.discord_limpio(new.titulo, 80), 'url', private.url_sitio() || 'eventos/', 'color', 16761095,
    'description', 'Empieza el ' || to_char(new.inicia_at at time zone 'UTC' - interval '5 hours', 'DD/MM/YYYY "a las" HH24:MI') || ' (hora de Lima).' || case when new.descripcion <> '' then E'\n' || private.discord_limpio(new.descripcion, 300) else '' end))));
  return new;
exception when others then
  raise warning '[discord] evento %: %', new.id, sqlerrm; return new;                   -- jamás impide crear el evento
end $$;
drop trigger if exists zz_discord_evento on public.eventos;
create trigger zz_discord_evento after insert on public.eventos for each row execute function private.discord_evento();

-- ─── 5) Prueba manual (desde el SQL Editor: select private.discord_probar();) ──────────────────────
create or replace function private.discord_probar() returns text
language sql security definer set search_path = '' as $$
  select private.discord_enviar('prueba', to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'), jsonb_build_object('content', '✅ Puente Phoenix ↔ Discord funcionando.'))
$$;

-- ─── 6) Programación y permisos ─────────────────────────────────────────────────────────────────────
revoke all on function private.url_sitio(), private.discord_limpio(text, integer), private.discord_url(), private.discord_enviar(text, text, jsonb), private.resumen_diario(), private.discord_evento(), private.discord_probar() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'resumen-discord';
select cron.schedule('resumen-discord', '0 13 * * *', 'select private.resumen_diario()');
