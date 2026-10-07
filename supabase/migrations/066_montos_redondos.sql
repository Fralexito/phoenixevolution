-- 066 · Montos redondos: apuestas en saltos de 50 (mínimo 50) y comisión redondeada hacia arriba a múltiplos de 10,
-- así el premio siempre termina en 0 (pozo 600 al 5 % → 570; 1800 al 10 % → 1620; 100 al 5 % → 90).
update public.economia_config set valor = '50' where clave = 'apuesta_minimo';

create or replace function private.comision_monto(p_pozo integer, p_pct integer)
returns integer language sql immutable set search_path = '' as $$
  select (ceil(p_pozo * p_pct / 1000.0) * 10)::integer
$$;
revoke all on function private.comision_monto(integer, integer) from public, anon, authenticated;

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
  if p_monto % 50 <> 0 then raise exception 'El monto va en saltos de 50 (50, 100, 150…).'; end if;
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
    'pozo', p_monto * 2, 'premio', p_monto * 2 - private.comision_monto(p_monto * 2, private.comision_para(p_monto)));
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
  return jsonb_build_object('estado', 'BLOQUEADA', 'pozo', a.monto * 2, 'premio', a.monto * 2 - private.comision_monto(a.monto * 2, a.comision_pct));
end $$;

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
        v_com := private.comision_monto(a.monto * 2, a.comision_pct);
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
