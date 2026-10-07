-- 065 · Dos monedas (ascuas = se ganan jugando · gemas = se compran) + retos con pozo en ascuas.
-- Reglas: solo se apuestan ASCUAS (nunca gemas, sin conversión entre ellas). Retos 1 vs 1. Mayores de 18 con fecha declarada,
-- cuenta con antigüedad mínima y partidos confirmados. Monto por jugador > tope → revisión del staff antes de que el rival acepte.
-- Comisión escalonada (retira ascuas de circulación, nadie la cobra): ≤ umbral → baja, > umbral → alta. Todo configurable en economia_config.
-- billeteras.saldo sigue siendo el saldo de ASCUAS (compatibilidad con todo lo existente); gemas va en una columna nueva.

-- 1 · Dos monedas -------------------------------------------------------------------------------------------------------
alter table public.billeteras add column if not exists gemas integer not null default 0;
alter table public.movimientos_tokens add column if not exists moneda text not null default 'ascuas';
do $$ begin
  alter table public.movimientos_tokens add constraint movimientos_tokens_moneda_check check (moneda in ('ascuas', 'gemas'));
exception when duplicate_object then null; end $$;
alter table public.movimientos_tokens drop constraint if exists movimientos_tokens_tipo_check;
alter table public.movimientos_tokens add constraint movimientos_tokens_tipo_check check (tipo in
  ('ganado', 'compra_tienda', 'compra_dinero', 'reembolso', 'ajuste_admin', 'devolucion', 'apuesta_garantia', 'apuesta_premio', 'apuesta_devolucion'));

-- Lo comprado con dinero (si hubiera algo) pasa a gemas.
update public.movimientos_tokens set moneda = 'gemas' where tipo = 'compra_dinero' or (tipo in ('reembolso', 'devolucion') and fuente <> 'admin' and referencia ~ '^[0-9a-f-]{36}$');
update public.billeteras b set gemas = g.total, saldo = b.saldo - g.total
  from (select usuario_id, sum(delta)::integer total from public.movimientos_tokens where moneda = 'gemas' group by usuario_id) g
 where g.usuario_id = b.usuario_id and b.gemas = 0;

create or replace function private.registrar_movimiento(p_usuario uuid, p_delta integer, p_tipo text, p_fuente text, p_referencia text, p_clave text, p_moneda text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare s integer; nuevo integer; id bigint;
begin
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Moneda desconocida: %.', p_moneda; end if;
  if p_delta is null or p_delta = 0 then raise exception 'El movimiento no puede ser cero.'; end if;
  insert into public.billeteras (usuario_id) values (p_usuario) on conflict do nothing;
  if p_moneda = 'gemas' then select gemas into s from public.billeteras where usuario_id = p_usuario for update;
  else select saldo into s from public.billeteras where usuario_id = p_usuario for update; end if;
  if exists (select 1 from public.movimientos_tokens where clave = p_clave) then return null; end if;
  nuevo := s + p_delta;
  if nuevo < 0 and p_delta < 0 and p_tipo <> 'reembolso' then raise exception 'Saldo insuficiente.'; end if;
  insert into public.movimientos_tokens (usuario_id, delta, tipo, fuente, referencia, clave, saldo_despues, moneda)
  values (p_usuario, p_delta, p_tipo, p_fuente, p_referencia, p_clave, nuevo, p_moneda) returning movimientos_tokens.id into id;
  if p_moneda = 'gemas' then update public.billeteras set gemas = nuevo, updated_at = now() where usuario_id = p_usuario;
  else update public.billeteras set saldo = nuevo, updated_at = now() where usuario_id = p_usuario; end if;
  return id;
end $$;

-- La firma antigua (6 argumentos) sigue funcionando y siempre mueve ASCUAS: otorgar() y demás no cambian.
create or replace function private.registrar_movimiento(p_usuario uuid, p_delta integer, p_tipo text, p_fuente text, p_referencia text, p_clave text)
returns bigint language sql security definer set search_path = '' as $$
  select private.registrar_movimiento(p_usuario, p_delta, p_tipo, p_fuente, p_referencia, p_clave, 'ascuas')
$$;

-- Pagos con dinero real → GEMAS.
create or replace function public.procesar_pago_evento(p_evento text, p_orden uuid, p_proveedor text, p_proveedor_ref text, p_monto_centimos integer, p_moneda text, p_comprobante text)
returns text language plpgsql security definer set search_path = '' as $$
declare o public.ordenes_pago;
begin
  select * into o from public.ordenes_pago where id = p_orden for update;
  if not found then raise exception 'Orden desconocida.'; end if;
  if p_evento = 'pagado' then
    if o.estado = 'PAGADA' then return 'ya_acreditada'; end if;
    if o.estado not in ('PENDIENTE', 'FALLIDA') then raise exception 'La orden está en estado % y no puede acreditarse.', o.estado; end if;
    if p_monto_centimos is distinct from o.monto_centimos or p_moneda is distinct from o.moneda then raise exception 'El monto o la moneda no coinciden con la orden.'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'compra_dinero', coalesce(p_proveedor, 'pasarela'), o.id::text, 'pago:' || o.id::text, 'gemas');
    update public.ordenes_pago set estado = 'PAGADA', proveedor = p_proveedor, proveedor_ref = p_proveedor_ref, comprobante_ref = p_comprobante, pagada_at = now(), actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra acreditada', 'Se añadieron ' || o.tokens || ' gemas a tu billetera.');
    return 'acreditada';
  elsif p_evento = 'fallido' then
    if o.estado = 'PENDIENTE' then update public.ordenes_pago set estado = 'FALLIDA', actualizada_at = now() where id = o.id; end if;
    return 'fallida';
  elsif p_evento in ('reembolsado', 'disputado') then
    if o.estado not in ('PAGADA') then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, -o.tokens, 'reembolso', coalesce(o.proveedor, 'pasarela'), o.id::text, 'reversa:' || o.id::text, 'gemas');
    update public.ordenes_pago set estado = case p_evento when 'reembolsado' then 'REEMBOLSADA' else 'DISPUTADA' end, actualizada_at = now() where id = o.id;
    perform private.notificar(o.usuario_id, 'LOGRO', 'Compra revertida', 'Se descontaron ' || o.tokens || ' gemas por un reembolso o disputa.');
    return 'revertida';
  elsif p_evento = 'disputa_ganada' then
    if o.estado <> 'DISPUTADA' then return 'sin_cambio'; end if;
    perform private.registrar_movimiento(o.usuario_id, o.tokens, 'devolucion', coalesce(o.proveedor, 'pasarela'), o.id::text, 'disputa_ganada:' || o.id::text, 'gemas');
    update public.ordenes_pago set estado = 'PAGADA', actualizada_at = now() where id = o.id;
    return 'restituida';
  end if;
  raise exception 'Evento desconocido: %', p_evento;
end $$;

-- Tienda: se paga con la moneda que elija el usuario (mismo precio en ambas).
drop function if exists public.comprar_item(bigint);
create or replace function public.comprar_item(p_item bigint, p_moneda text default 'ascuas')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); t public.tienda_items; x bigint; b public.billeteras;
begin
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Elige pagar con ascuas o con gemas.'; end if;
  select * into t from public.tienda_items where id = p_item and activo for update;
  if not found then raise exception 'Ese objeto no está disponible.'; end if;
  if exists (select 1 from public.inventario where usuario_id = yo and item_id = t.id) then raise exception 'Ya tienes este objeto.'; end if;
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = yo;
  if private.nivel_de_xp(coalesce(x, 0)) < t.nivel_min then raise exception 'Necesitas nivel % para comprar esto.', t.nivel_min; end if;
  if t.stock is not null and t.stock <= 0 then raise exception 'Este objeto está agotado.'; end if;
  if t.precio > 0 then perform private.registrar_movimiento(yo, -t.precio, 'compra_tienda', 'tienda', t.clave, 'tienda:' || yo::text || ':' || t.id::text, p_moneda); end if;
  if t.stock is not null then update public.tienda_items set stock = stock - 1 where id = t.id; end if;
  insert into public.inventario (usuario_id, item_id, categoria, precio_pagado) values (yo, t.id, t.categoria, t.precio);
  select * into b from public.billeteras where usuario_id = yo;
  return jsonb_build_object('saldo', coalesce(b.saldo, 0), 'gemas', coalesce(b.gemas, 0), 'moneda', p_moneda, 'objeto', t.nombre);
end $$;
revoke all on function public.comprar_item(bigint, text) from public, anon;
grant execute on function public.comprar_item(bigint, text) to authenticated;

drop function if exists public.admin_ajustar_tokens(uuid, integer, text);
create or replace function public.admin_ajustar_tokens(p_usuario uuid, p_delta integer, p_motivo text, p_moneda text default 'ascuas')
returns integer language plpgsql security definer set search_path = '' as $$
declare mot text := btrim(coalesce(p_motivo, '')); s integer;
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ajustar tokens.'; end if;
  if p_moneda not in ('ascuas', 'gemas') then raise exception 'Moneda desconocida.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then raise exception 'El ajuste debe ser distinto de cero y de máximo 100000.'; end if;
  perform private.registrar_movimiento(p_usuario, p_delta, 'ajuste_admin', 'admin', left(mot, 120), 'ajuste:' || gen_random_uuid()::text, p_moneda);
  select case when p_moneda = 'gemas' then gemas else saldo end into s from public.billeteras where usuario_id = p_usuario;
  perform private.auditar_moderacion('editar', 'billeteras', p_usuario::text, 'Saldo de ' || private.nombre(p_usuario),
    jsonb_build_object('delta', p_delta, 'moneda', p_moneda, 'saldo', s), mot);
  return s;
end $$;
revoke all on function public.admin_ajustar_tokens(uuid, integer, text, text) from public, anon;
grant execute on function public.admin_ajustar_tokens(uuid, integer, text, text) to authenticated;

-- 2 · Configuración de los retos con pozo (cambiable sin tocar código) ---------------------------------------------------
insert into public.economia_config (clave, valor) values
  ('apuesta_minimo', '10'),
  ('apuesta_maximo_absoluto', '20000'),
  ('apuesta_tope_sin_revision', '2000'),
  ('apuesta_umbral_comision', '500'),
  ('apuesta_comision_baja', '5'),
  ('apuesta_comision_alta', '10'),
  ('apuesta_antiguedad_dias', '7'),
  ('apuesta_partidos_min', '3'),
  ('apuesta_max_por_pareja_dia', '3')
on conflict (clave) do nothing;

create or replace function private.cfg_entero(p_clave text, p_defecto integer)
returns integer language plpgsql stable security definer set search_path = '' as $$
begin
  return coalesce(nullif(btrim(private.config(p_clave)), '')::integer, p_defecto);
exception when others then return p_defecto;
end $$;

-- 3 · Tabla de pozos ---------------------------------------------------------------------------------------------------
create table if not exists public.apuestas_reto (
  reto_id        integer primary key references public.retos_matchmaking(id) on delete restrict,
  ronda          smallint not null default 1,
  monto          integer not null check (monto > 0),
  propuesta_por  uuid not null references auth.users(id),
  acepta         uuid references auth.users(id),
  estado         text not null check (estado in ('REVISION', 'PROPUESTA', 'BLOQUEADA', 'CONGELADA', 'PAGADA', 'DEVUELTA')),
  comision_pct   smallint not null check (comision_pct between 0 and 50),
  comision       integer,
  ganador        uuid references auth.users(id),
  pago           integer,
  motivo         text check (motivo is null or char_length(motivo) <= 300),
  revisado_por   uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  actualizada_at timestamptz not null default now(),
  resuelta_at    timestamptz
);
create index if not exists apuestas_reto_estado_idx on public.apuestas_reto (estado) where estado in ('REVISION', 'PROPUESTA', 'BLOQUEADA', 'CONGELADA');
create index if not exists apuestas_reto_propuesta_idx on public.apuestas_reto (propuesta_por, created_at desc);

alter table public.apuestas_reto enable row level security;
drop policy if exists apuestas_reto_leer on public.apuestas_reto;
create policy apuestas_reto_leer on public.apuestas_reto for select to authenticated using (
  (select auth.uid()) in (propuesta_por, acepta)
  or exists (select 1 from public.retos_matchmaking r where r.id = reto_id and (select auth.uid()) in (r.retador_id, r.rival_id))
  or (select private.es_staff())
);
grant select on public.apuestas_reto to authenticated;

-- Aviso nuevo
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%RETO_DIRECTO%';
  if c is not null then execute format('alter table public.notificaciones drop constraint %I', c); end if;
end $$;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in
  ('RETO_DIRECTO', 'RETO_HOST', 'RETO_ACEPTADO', 'RETO_RECHAZADO', 'SALA_LISTA', 'CONFIRMAR_PARTIDO', 'AVISO_FINAL', 'PARTIDO_CONFIRMADO',
   'PARTIDO_CANCELADO', 'RETO_EXPIRADO', 'INVITACION_RETO', 'UNION_RETO', 'SALIO_RETO', 'AMISTAD_SOLICITUD', 'AMISTAD_ACEPTADA',
   'SEGUIDOR_NUEVO', 'ESPECTADOR_SOLICITUD', 'ESPECTADOR_APROBADO', 'MURO_RESPUESTA', 'MODERACION', 'MENCION', 'LOGRO',
   'RESULTADO_PROPUESTO', 'RESULTADO_CONFIRMADO', 'RESULTADO_DISPUTADO', 'EVENTO', 'CLAN', 'SALA_ABIERTA', 'INVITACION_SALA', 'APUESTA'));

-- 4 · Reglas ----------------------------------------------------------------------------------------------------------
-- ¿Puede este usuario poner ascuas en un reto? null = sí; texto = motivo para mostrar.
create or replace function private.motivo_no_apostar(p_uid uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare creado timestamptz; jugados integer;
begin
  if private.categoria_edad(p_uid) <> 'adulto' then return 'Los retos con ascuas son solo para mayores de 18 años con fecha de nacimiento declarada.'; end if;
  select created_at into creado from public.perfiles where id = p_uid;
  if creado is null or creado > now() - make_interval(days => private.cfg_entero('apuesta_antiguedad_dias', 7)) then
    return 'Tu cuenta necesita ' || private.cfg_entero('apuesta_antiguedad_dias', 7) || ' días de antigüedad para retar con ascuas.';
  end if;
  select count(*) into jugados from public.resultados_duelo d join public.retos_matchmaking r on r.id = d.reto_id
   where d.estado = 'CONFIRMADO' and p_uid in (r.retador_id, r.rival_id);
  if jugados < private.cfg_entero('apuesta_partidos_min', 3) then
    return 'Necesitas ' || private.cfg_entero('apuesta_partidos_min', 3) || ' partidos confirmados para retar con ascuas (llevas ' || jugados || ').';
  end if;
  return null;
end $$;

create or replace function private.comision_para(p_monto integer)
returns smallint language sql stable security definer set search_path = '' as $$
  select (case when p_monto <= private.cfg_entero('apuesta_umbral_comision', 500)
               then private.cfg_entero('apuesta_comision_baja', 5) else private.cfg_entero('apuesta_comision_alta', 10) end)::smallint
$$;

-- Devuelve lo que cada lado tenga en garantía y cierra el pozo como DEVUELTA.
create or replace function private.devolver_apuesta(p_reto integer, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.apuestas_reto;
begin
  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if not found or a.estado in ('PAGADA', 'DEVUELTA') then return; end if;
  perform private.registrar_movimiento(a.propuesta_por, a.monto, 'apuesta_devolucion', 'apuesta', 'reto' || p_reto,
    'apuesta_dev:' || p_reto || ':' || a.ronda || ':' || a.propuesta_por, 'ascuas');
  if a.acepta is not null then
    perform private.registrar_movimiento(a.acepta, a.monto, 'apuesta_devolucion', 'apuesta', 'reto' || p_reto,
      'apuesta_dev:' || p_reto || ':' || a.ronda || ':' || a.acepta, 'ascuas');
  end if;
  update public.apuestas_reto set estado = 'DEVUELTA', motivo = left(p_motivo, 300), resuelta_at = now(), actualizada_at = now() where reto_id = p_reto;
  perform private.notificar(a.propuesta_por, 'APUESTA', 'Ascuas devueltas', 'Se te devolvieron ' || a.monto || ' ascuas del reto: ' || left(p_motivo, 200), p_reto, null);
  if a.acepta is not null then
    perform private.notificar(a.acepta, 'APUESTA', 'Ascuas devueltas', 'Se te devolvieron ' || a.monto || ' ascuas del reto: ' || left(p_motivo, 200), p_reto, null);
  end if;
end $$;

-- 5 · Acciones del jugador ---------------------------------------------------------------------------------------------
create or replace function public.apostar_en_reto(p_reto integer, p_monto integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; a public.apuestas_reto; v_motivo text; otro uuid;
        tope integer := private.cfg_entero('apuesta_tope_sin_revision', 2000); est text; ron smallint := 1; hoy integer;
begin
  select * into r from public.retos_matchmaking where id = p_reto for update;
  if not found or yo not in (r.retador_id, coalesce(r.rival_id, r.retador_id)) then raise exception 'Solo los jugadores del reto pueden poner ascuas.'; end if;
  if r.estado not in ('BUSCANDO', 'ACEPTADO') then raise exception 'Solo se ponen ascuas antes de que empiece el partido.'; end if;
  if r.tam_a <> 1 or r.tam_b <> 1 then raise exception 'Por ahora los retos con ascuas son solo 1 vs 1.'; end if;
  if p_monto is null or p_monto < private.cfg_entero('apuesta_minimo', 10) or p_monto > private.cfg_entero('apuesta_maximo_absoluto', 20000) then
    raise exception 'El monto debe estar entre % y % ascuas.', private.cfg_entero('apuesta_minimo', 10), private.cfg_entero('apuesta_maximo_absoluto', 20000);
  end if;
  v_motivo := private.motivo_no_apostar(yo);
  if v_motivo is not null then raise exception '%', v_motivo; end if;
  otro := case when yo = r.retador_id then r.rival_id else r.retador_id end;
  if otro is not null then
    select count(*) into hoy from public.apuestas_reto x join public.retos_matchmaking y on y.id = x.reto_id
     where x.created_at >= private.inicio_dia_lima(now()) and x.estado <> 'DEVUELTA'
       and ((y.retador_id = yo and y.rival_id = otro) or (y.retador_id = otro and y.rival_id = yo));
    if hoy >= private.cfg_entero('apuesta_max_por_pareja_dia', 3) then raise exception 'Ya jugaron demasiados retos con ascuas entre ustedes hoy.'; end if;
  end if;

  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if found then
    if a.estado <> 'DEVUELTA' then raise exception 'Este reto ya tiene ascuas en juego.'; end if;
    ron := a.ronda + 1;
  end if;
  est := case when p_monto > tope then 'REVISION' else 'PROPUESTA' end;
  perform private.registrar_movimiento(yo, -p_monto, 'apuesta_garantia', 'apuesta', 'reto' || p_reto,
    'apuesta_gar:' || p_reto || ':' || ron || ':' || yo, 'ascuas');
  insert into public.apuestas_reto (reto_id, ronda, monto, propuesta_por, estado, comision_pct)
  values (p_reto, ron, p_monto, yo, est, private.comision_para(p_monto))
  on conflict (reto_id) do update set ronda = excluded.ronda, monto = excluded.monto, propuesta_por = excluded.propuesta_por, acepta = null,
    estado = excluded.estado, comision_pct = excluded.comision_pct, comision = null, ganador = null, pago = null, motivo = null,
    revisado_por = null, created_at = now(), actualizada_at = now(), resuelta_at = null;
  if otro is not null and est = 'PROPUESTA' then
    perform private.notificar(otro, 'APUESTA', 'Te retan con ascuas', private.nombre(yo) || ' pone ' || p_monto || ' ascuas en su reto. ¿Aceptas?', p_reto, null);
  end if;
  return jsonb_build_object('estado', est, 'monto', p_monto, 'comision_pct', private.comision_para(p_monto),
    'pozo', p_monto * 2, 'premio', p_monto * 2 - floor(p_monto * 2 * private.comision_para(p_monto) / 100.0)::integer);
end $$;

create or replace function public.aceptar_apuesta(p_reto integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; a public.apuestas_reto; v_motivo text;
begin
  select * into r from public.retos_matchmaking where id = p_reto for update;
  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if a.reto_id is null or a.estado <> 'PROPUESTA' then raise exception 'No hay ascuas pendientes de aceptar en este reto.'; end if;
  if yo = a.propuesta_por or yo not in (r.retador_id, coalesce(r.rival_id, r.retador_id)) then raise exception 'Solo el rival puede aceptar.'; end if;
  if r.estado not in ('BUSCANDO', 'ACEPTADO') then raise exception 'El partido ya empezó o terminó.'; end if;
  v_motivo := private.motivo_no_apostar(yo);
  if v_motivo is not null then raise exception '%', v_motivo; end if;
  perform private.registrar_movimiento(yo, -a.monto, 'apuesta_garantia', 'apuesta', 'reto' || p_reto,
    'apuesta_gar:' || p_reto || ':' || a.ronda || ':' || yo, 'ascuas');
  update public.apuestas_reto set acepta = yo, estado = 'BLOQUEADA', actualizada_at = now() where reto_id = p_reto;
  perform private.notificar(a.propuesta_por, 'APUESTA', 'Pozo cerrado', private.nombre(yo) || ' aceptó: hay ' || a.monto * 2 || ' ascuas en juego.', p_reto, null);
  return jsonb_build_object('estado', 'BLOQUEADA', 'pozo', a.monto * 2, 'premio', a.monto * 2 - floor(a.monto * 2 * a.comision_pct / 100.0)::integer);
end $$;

-- El que propuso la retira, o el rival la rechaza. Solo antes de que se cierre el pozo.
create or replace function public.rechazar_apuesta(p_reto integer)
returns void language plpgsql security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); r public.retos_matchmaking; a public.apuestas_reto;
begin
  select * into r from public.retos_matchmaking where id = p_reto;
  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if a.reto_id is null or a.estado not in ('PROPUESTA', 'REVISION') then raise exception 'Ya no se puede retirar: el pozo está cerrado o resuelto.'; end if;
  if yo not in (r.retador_id, coalesce(r.rival_id, r.retador_id)) then raise exception 'No eres jugador de este reto.'; end if;
  perform private.devolver_apuesta(p_reto, case when yo = a.propuesta_por then 'retirada por quien la propuso' else 'el rival no aceptó' end);
end $$;

-- 6 · Liquidación automática con el resultado oficial ------------------------------------------------------------------
create or replace function private.liquidar_apuesta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare a public.apuestas_reto; r public.retos_matchmaking; gana uuid; pierde uuid; v_com integer; v_pago integer;
begin
  select * into a from public.apuestas_reto where reto_id = new.reto_id for update;
  if not found or a.estado in ('PAGADA', 'DEVUELTA') then return new; end if;
  begin
    if new.estado = 'DISPUTADO' then
      if a.estado = 'BLOQUEADA' then
        update public.apuestas_reto set estado = 'CONGELADA', actualizada_at = now() where reto_id = a.reto_id;
      end if;
    elsif new.estado = 'CONFIRMADO' then
      if a.estado in ('PROPUESTA', 'REVISION') then
        perform private.devolver_apuesta(a.reto_id, 'el rival no aceptó antes del partido');
      elsif new.goles_a = new.goles_b then
        perform private.devolver_apuesta(a.reto_id, 'empate');
      else
        select * into r from public.retos_matchmaking where id = new.reto_id;
        gana := case when new.goles_a > new.goles_b then r.retador_id else r.rival_id end;
        pierde := case when gana = r.retador_id then r.rival_id else r.retador_id end;
        if gana not in (a.propuesta_por, a.acepta) then raise exception 'El ganador no es uno de los que pusieron ascuas.'; end if;
        v_com := floor(a.monto * 2 * a.comision_pct / 100.0)::integer;
        v_pago := a.monto * 2 - v_com;
        perform private.registrar_movimiento(gana, v_pago, 'apuesta_premio', 'apuesta', 'reto' || a.reto_id,
          'apuesta_premio:' || a.reto_id || ':' || a.ronda, 'ascuas');
        update public.apuestas_reto set estado = 'PAGADA', ganador = gana, comision = v_com, pago = v_pago, resuelta_at = now(), actualizada_at = now()
         where reto_id = a.reto_id;
        perform private.notificar(gana, 'APUESTA', '¡Ganaste el pozo!', 'Recibiste ' || v_pago || ' ascuas.', a.reto_id, null);
        perform private.notificar(pierde, 'APUESTA', 'Perdiste el pozo', 'Las ' || a.monto || ' ascuas que pusiste fueron para tu rival.', a.reto_id, null);
      end if;
    end if;
  exception when others then
    raise warning '[apuestas] liquidar reto %: %', new.reto_id, sqlerrm;
    update public.apuestas_reto set estado = 'CONGELADA', motivo = left('Error al liquidar, revisar: ' || sqlerrm, 300), actualizada_at = now()
     where reto_id = new.reto_id and estado not in ('PAGADA', 'DEVUELTA');
  end;
  return new;
end $$;
drop trigger if exists zz_apuesta on public.resultados_duelo;
create trigger zz_apuesta after insert or update of estado, goles_a, goles_b on public.resultados_duelo
  for each row execute function private.liquidar_apuesta();

-- Reto cancelado, rechazado o vencido → se devuelve todo.
create or replace function private.apuesta_reto_cerrado()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado in ('CANCELADO', 'EXPIRADO', 'RECHAZADO') and old.estado is distinct from new.estado then
    perform private.devolver_apuesta(new.id, 'el reto se cerró sin jugarse');
  end if;
  return new;
exception when others then
  raise warning '[apuestas] devolver reto %: %', new.id, sqlerrm; return new;
end $$;
drop trigger if exists zz_apuesta_cierre on public.retos_matchmaking;
create trigger zz_apuesta_cierre after update of estado on public.retos_matchmaking
  for each row execute function private.apuesta_reto_cerrado();

-- 7 · Staff ------------------------------------------------------------------------------------------------------------
create or replace function public.staff_apuestas_pendientes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_staff() then raise exception 'Solo el staff.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('reto_id', a.reto_id, 'estado', a.estado, 'monto', a.monto, 'motivo', a.motivo,
    'propone', private.nombre(a.propuesta_por), 'acepta', case when a.acepta is null then null else private.nombre(a.acepta) end, 'creada', a.created_at)
    order by a.created_at)
    from public.apuestas_reto a where a.estado in ('REVISION', 'CONGELADA')), '[]'::jsonb);
end $$;

create or replace function public.staff_revisar_apuesta(p_reto integer, p_aprobar boolean, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.apuestas_reto; r public.retos_matchmaking; otro uuid; mot text := btrim(coalesce(p_motivo, ''));
begin
  if not private.es_staff() then raise exception 'Solo el staff.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if a.reto_id is null or a.estado <> 'REVISION' then raise exception 'Este pozo no está en revisión.'; end if;
  if p_aprobar then
    update public.apuestas_reto set estado = 'PROPUESTA', revisado_por = (select auth.uid()), motivo = left(mot, 300), actualizada_at = now() where reto_id = p_reto;
    select * into r from public.retos_matchmaking where id = p_reto;
    otro := case when a.propuesta_por = r.retador_id then r.rival_id else r.retador_id end;
    perform private.notificar(a.propuesta_por, 'APUESTA', 'Pozo aprobado', 'El staff aprobó tus ' || a.monto || ' ascuas.', p_reto, null);
    if otro is not null then
      perform private.notificar(otro, 'APUESTA', 'Te retan con ascuas', private.nombre(a.propuesta_por) || ' pone ' || a.monto || ' ascuas en su reto. ¿Aceptas?', p_reto, null);
    end if;
  else
    update public.apuestas_reto set revisado_por = (select auth.uid()) where reto_id = p_reto;
    perform private.devolver_apuesta(p_reto, 'el staff no aprobó el monto: ' || mot);
  end if;
  perform private.auditar_moderacion('editar', 'apuestas_reto', p_reto::text, 'Pozo del reto ' || p_reto,
    jsonb_build_object('aprobado', p_aprobar, 'monto', a.monto), mot);
end $$;

-- Anular un pozo (cerrado o congelado): devuelve todo. Para resultados arreglados o errores.
create or replace function public.staff_anular_apuesta(p_reto integer, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.apuestas_reto; mot text := btrim(coalesce(p_motivo, ''));
begin
  if not private.es_staff() then raise exception 'Solo el staff.'; end if;
  if char_length(mot) < 5 then raise exception 'Escribe el motivo (mínimo 5 letras).'; end if;
  select * into a from public.apuestas_reto where reto_id = p_reto for update;
  if a.reto_id is null or a.estado in ('PAGADA', 'DEVUELTA') then raise exception 'Este pozo ya está resuelto.'; end if;
  update public.apuestas_reto set revisado_por = (select auth.uid()) where reto_id = p_reto;
  perform private.devolver_apuesta(p_reto, 'anulado por el staff: ' || mot);
  perform private.auditar_moderacion('editar', 'apuestas_reto', p_reto::text, 'Pozo del reto ' || p_reto, jsonb_build_object('anulado', true, 'monto', a.monto), mot);
end $$;

revoke all on function public.apostar_en_reto(integer, integer), public.aceptar_apuesta(integer), public.rechazar_apuesta(integer),
  public.staff_apuestas_pendientes(), public.staff_revisar_apuesta(integer, boolean, text), public.staff_anular_apuesta(integer, text) from public, anon;
grant execute on function public.apostar_en_reto(integer, integer), public.aceptar_apuesta(integer), public.rechazar_apuesta(integer),
  public.staff_apuestas_pendientes(), public.staff_revisar_apuesta(integer, boolean, text), public.staff_anular_apuesta(integer, text) to authenticated;
revoke all on function private.registrar_movimiento(uuid, integer, text, text, text, text, text), private.devolver_apuesta(integer, text),
  private.motivo_no_apostar(uuid), private.comision_para(integer), private.cfg_entero(text, integer) from public, anon, authenticated;

-- 8 · Lecturas ---------------------------------------------------------------------------------------------------------
create or replace function public.mi_economia()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := private.uid_requerido(); x bigint; n integer; b public.billeteras; gar integer;
begin
  select coalesce(xp, 0) into x from public.xp_totales where usuario_id = yo; x := coalesce(x, 0); n := private.nivel_de_xp(x);
  select * into b from public.billeteras where usuario_id = yo;
  select coalesce(sum(monto), 0) into gar from public.apuestas_reto
   where estado in ('REVISION', 'PROPUESTA', 'BLOQUEADA', 'CONGELADA') and (propuesta_por = yo or acepta = yo);
  return jsonb_build_object('saldo', coalesce(b.saldo, 0), 'gemas', coalesce(b.gemas, 0), 'en_garantia', gar,
    'puede_apostar', private.motivo_no_apostar(yo) is null, 'motivo_no_apostar', private.motivo_no_apostar(yo),
    'xp', x, 'nivel', n, 'xp_nivel', private.xp_para_nivel(n), 'xp_siguiente', private.xp_para_nivel(n + 1));
end $$;

create or replace function public.admin_economia_resumen()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.es_admin() then raise exception 'Solo el administrador puede ver el resumen económico.'; end if;
  return jsonb_build_object(
    'pagos_activos', coalesce(private.config('pagos_activos'), 'false') = 'true',
    'tokens_en_circulacion', coalesce((select sum(saldo) from public.billeteras), 0),
    'gemas_en_circulacion', coalesce((select sum(gemas) from public.billeteras), 0),
    'ascuas_en_garantia', coalesce((select sum(monto * case when acepta is null then 1 else 2 end) from public.apuestas_reto
                                     where estado in ('REVISION', 'PROPUESTA', 'BLOQUEADA', 'CONGELADA')), 0),
    'ascuas_retiradas_por_comision', coalesce((select sum(comision) from public.apuestas_reto where estado = 'PAGADA'), 0),
    'pozos_por_estado', coalesce((select jsonb_object_agg(estado, n) from (select estado, count(*) n from public.apuestas_reto group by estado) z), '{}'::jsonb),
    'billeteras_negativas', (select count(*) from public.billeteras where saldo < 0 or gemas < 0),
    'ordenes', coalesce((select jsonb_object_agg(estado, n) from (select estado, count(*) n from public.ordenes_pago group by estado) x), '{}'::jsonb),
    'ingresos_centimos', coalesce((select sum(monto_centimos) from public.ordenes_pago where estado = 'PAGADA'), 0),
    'ultimas', coalesce((select jsonb_agg(to_jsonb(u)) from (select o.id, private.nombre(o.usuario_id) as usuario, o.tokens, o.monto_centimos, o.moneda, o.estado, o.created_at
                                                              from public.ordenes_pago o order by o.created_at desc limit 20) u), '[]'::jsonb));
end $$;
