-- Prueba en seco de la migración 161 (se revierte sola al terminar con «TODO_OK_REVERTIDO»).
create or replace function pg_temp.as_u(u uuid) returns void language plpgsql as $f$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $f$;

do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  r5 int; r8 int; o text := '';
begin
  insert into auth.users(id, instance_id, aud, role, email, raw_user_meta_data)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a_'||a||'@t.test', '{"gamertag":"A16"}'::jsonb),
         (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b_'||b||'@t.test', '{"gamertag":"B16"}'::jsonb);

  perform pg_temp.as_u(a);
  -- 1) 5v5 y 8v8 ahora pasan
  insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (a, b, false, 'Parsec', 5, 5) returning id into r5;
  delete from public.retos_matchmaking where id = r5;
  insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (a, b, false, 'Parsec', 8, 8) returning id into r8;
  o := o || '5v5_y_8v8=ok; ';

  -- 2) 9+8=17 (>16) y 16+1=17 (>15 por lado) se bloquean
  begin
    insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (b, a, false, 'Parsec', 9, 8);
    raise exception 'FALLO: 9+8 pasó';
  exception when check_violation then o := o || '9v8_rechazado=ok; ';
  end;
  begin
    insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (b, a, false, 'Parsec', 16, 1);
    raise exception 'FALLO: 16+1 pasó';
  exception when check_violation then o := o || '16v1_rechazado=ok; ';
  end;

  reset role;
  raise exception 'TODO_OK_REVERTIDO: %', o;
end $$;

