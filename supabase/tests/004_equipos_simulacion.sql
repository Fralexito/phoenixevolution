-- PRUEBA de equipos, cupos, invitaciones e interruptor "azar".
-- Cómo usarla: pégala completa en Supabase → SQL Editor → Run.
-- Termina a propósito con un error "RESULTADO: ..." para que TODO se revierta (no deja usuarios ni retos de prueba).
-- Léela así: cada paso dice "(esp N)" = lo que DEBE salir. Si algún valor no coincide, hay un bug.
create or replace function pg_temp.as_u(u uuid) returns void language plpgsql as $f$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $f$;

do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  e uuid := gen_random_uuid(); f uuid := gen_random_uuid(); g uuid := gen_random_uuid(); h1 uuid := gen_random_uuid(); h2 uuid := gen_random_uuid();
  o text := ''; r1 int; r2 int; r3 int; r4 int; cnt int; est text;
begin
  insert into auth.users(id, instance_id, aud, role, email, raw_user_meta_data)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', n||'_'||u||'@t.test', json_build_object('gamertag', n)::jsonb
  from (values (a,'AA'),(b,'BB'),(c,'CC'),(d,'DD'),(e,'EE'),(f,'FF'),(g,'GG'),(h1,'H1'),(h2,'H2')) v(u,n);
  update public.perfiles set puede_hostear = true where id in (a, g, h1, h2);
  update public.perfiles set acepta_retos_azar = false where id in (e, h2);          -- E y H2 están Inactivos

  -- T1 tamaños (máx. 8 en total, cada equipo 1..7)
  perform pg_temp.as_u(a);
  begin insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (a, b, false, 'Parsec', 5, 4); o := o||'T1a FALLO; ';
  exception when others then o := o||'T1a ok(5+4>8 rechazado); '; end;
  begin insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b) values (a, b, false, 'Parsec', 0, 1); o := o||'T1b FALLO; ';
  exception when others then o := o||'T1b ok(0 rechazado); '; end;
  insert into public.retos_matchmaking(retador_id, destinatario_id, requiere_host, plataforma, tam_a, tam_b, directo_publico) values (a, b, false, 'Parsec', 2, 3, false) returning id into r1;
  reset role; select count(*) into cnt from public.reto_participantes where reto_id = r1 and usuario_id = a and equipo = 'A' and estado = 'CONFIRMADO'; o := o||'T2 retador_en_A='||cnt||'(esp 1); ';

  -- T3 invitaciones y privacidad
  perform pg_temp.as_u(a); perform public.invitar_a_reto(r1, c, 'A');
  begin perform public.invitar_a_reto(r1, f, 'B'); o := o||'T3a FALLO; '; exception when others then o := o||'T3a ok(B aun sin lider); '; end;
  begin perform public.invitar_a_reto(r1, b, 'A'); o := o||'T3a2 FALLO; '; exception when others then o := o||'T3a2 ok(no invitar al retado); '; end;
  perform pg_temp.as_u(c); select count(*) into cnt from public.retos_matchmaking where id = r1; o := o||'T3b C_invitado_ve_privado='||cnt||'(esp 1); ';
  perform pg_temp.as_u(f); select count(*) into cnt from public.retos_matchmaking where id = r1; o := o||'T3c F_ajeno_ve_privado='||cnt||'(esp 0); ';
  begin perform public.unirse_a_reto(r1, 'A'); o := o||'T3d FALLO; '; exception when others then o := o||'T3d ok(privado); '; end;
  begin perform public.invitar_a_reto(r1, d, 'A'); o := o||'T3z FALLO; '; exception when others then o := o||'T3z ok(ajeno no invita); '; end;
  perform pg_temp.as_u(c); perform public.responder_invitacion(r1, true);
  reset role; select count(*) into cnt from public.reto_participantes where reto_id = r1 and estado='CONFIRMADO' and equipo='A'; o := o||'T3e A_confirmados='||cnt||'(esp 2); ';
  perform pg_temp.as_u(a);
  begin perform public.invitar_a_reto(r1, d, 'A'); o := o||'T3f FALLO; '; exception when others then o := o||'T3f ok(equipo A lleno); '; end;

  -- T4 B acepta y trae a un amigo
  perform pg_temp.as_u(b); perform public.aceptar_reto(r1); perform public.invitar_a_reto(r1, d, 'B');
  begin perform public.invitar_a_reto(r1, f, 'A'); o := o||'T4a FALLO; '; exception when others then o := o||'T4a ok(B no invita a A); '; end;

  -- T5 enlace con cupos incompletos: exige acuerdo de AMBOS líderes
  perform pg_temp.as_u(a);
  begin perform public.publicar_enlace(r1, 'https://parsec.gg/x'); o := o||'T5a FALLO; '; exception when others then o := o||'T5a ok(faltan cupos); '; end;
  perform public.acordar_cupos(r1);
  begin perform public.publicar_enlace(r1, 'https://parsec.gg/x'); o := o||'T5b FALLO; '; exception when others then o := o||'T5b ok(falta acuerdo de B); '; end;
  perform pg_temp.as_u(f);
  begin perform public.acordar_cupos(r1); o := o||'T5c FALLO; '; exception when others then o := o||'T5c ok(ajeno no acuerda); '; end;
  perform pg_temp.as_u(b); perform public.acordar_cupos(r1);
  perform pg_temp.as_u(a); perform public.publicar_enlace(r1, 'https://parsec.gg/x', 'clave 123');
  perform pg_temp.as_u(c); select count(*) into cnt from public.retos_conexion where reto_id = r1; o := o||'T5d C_confirmado_ve_enlace='||cnt||'(esp 1); ';
  perform pg_temp.as_u(d); select count(*) into cnt from public.retos_conexion where reto_id = r1; o := o||'T5e D_solo_invitado_ve_enlace='||cnt||'(esp 0); ';
  perform pg_temp.as_u(f); select count(*) into cnt from public.retos_conexion where reto_id = r1; o := o||'T5f F_ajeno_ve_enlace='||cnt||'(esp 0); ';
  perform pg_temp.as_u(d); perform public.responder_invitacion(r1, true);
  select count(*) into cnt from public.retos_conexion where reto_id = r1; o := o||'T5h D_ya_confirmado_ve_enlace='||cnt||'(esp 1); ';

  -- T6/T7 reto abierto, interruptor Inactivo, unirse / salir / expulsar / cancelar
  perform pg_temp.as_u(a);
  insert into public.retos_matchmaking(retador_id, requiere_host, plataforma, tam_a, tam_b) values (a, false, 'Smash Soda', 2, 2) returning id into r2;
  perform pg_temp.as_u(e);
  begin perform public.aceptar_reto(r2); o := o||'T6a FALLO; '; exception when others then o := o||'T6a ok(inactivo no acepta); '; end;
  begin perform public.unirse_a_reto(r2, 'A'); o := o||'T6b FALLO; '; exception when others then o := o||'T6b ok(inactivo no se une); '; end;
  perform pg_temp.as_u(f);
  begin perform public.unirse_a_reto(r2, 'B'); o := o||'T6c FALLO; '; exception when others then o := o||'T6c ok(B aun sin lider); '; end;
  perform public.unirse_a_reto(r2, 'A');
  perform pg_temp.as_u(g); perform public.aceptar_reto(r2);
  reset role; select count(*) into cnt from public.reto_participantes where reto_id = r2 and estado='CONFIRMADO'; o := o||'T6d participantes='||cnt||'(esp 3); ';
  perform pg_temp.as_u(f);
  begin perform public.cancelar_reto(r2); o := o||'T6e FALLO; '; exception when others then o := o||'T6e ok(F no es lider); '; end;
  perform public.salir_de_reto(r2);
  reset role; select count(*) into cnt from public.reto_participantes where reto_id = r2 and estado='CONFIRMADO' and equipo='A'; o := o||'T7a A_tras_salir='||cnt||'(esp 1); ';
  perform pg_temp.as_u(f); perform public.unirse_a_reto(r2, 'A');
  reset role; select count(*) into cnt from public.reto_participantes where reto_id = r2 and estado='CONFIRMADO' and equipo='A'; o := o||'T7b reingreso='||cnt||'(esp 2); ';
  perform pg_temp.as_u(a);
  begin perform public.salir_de_reto(r2); o := o||'T7c FALLO; '; exception when others then o := o||'T7c ok(lider no sale); '; end;
  perform public.expulsar_de_reto(r2, f);
  perform pg_temp.as_u(g);
  begin perform public.expulsar_de_reto(r2, a); o := o||'T7d FALLO; '; exception when others then o := o||'T7d ok(no expulsa lider); '; end;
  perform pg_temp.as_u(a); perform public.cancelar_reto(r2);
  reset role; select count(*) into cnt from public.notificaciones where reto_id = r2 and tipo='PARTIDO_CANCELADO'; o := o||'T7e cancel_notifs='||cnt||'(esp 1: solo G); ';
  select count(*) into cnt from public.notificaciones where reto_id = r2 and tipo='PARTIDO_CANCELADO' and usuario_id = f; o := o||'T7f F_(ya salio)_notificado='||cnt||'(esp 0); ';

  -- T8 el aviso a hosts respeta el interruptor
  perform pg_temp.as_u(c);
  insert into public.retos_matchmaking(retador_id, requiere_host, plataforma, tam_a, tam_b) values (c, true, 'Parsec', 1, 1) returning id into r3;
  reset role; select count(*) into cnt from public.notificaciones where reto_id = r3 and tipo='RETO_HOST' and usuario_id = h1; o := o||'T8a H1_activo_avisado='||cnt||'(esp 1); ';
  select count(*) into cnt from public.notificaciones where reto_id = r3 and tipo='RETO_HOST' and usuario_id = h2; o := o||'T8b H2_inactivo_avisado='||cnt||'(esp 0); ';
  perform pg_temp.as_u(h2);
  begin perform public.aceptar_reto(r3); o := o||'T8d FALLO; '; exception when others then o := o||'T8d ok(H2 inactivo no acepta); '; end;
  perform pg_temp.as_u(h1); perform public.aceptar_reto(r3);
  reset role; select host_id = h1 into est from public.retos_matchmaking where id = r3; o := o||'T8e host_es_H1='||est||'(esp true); ';

  -- T9 regresión: 1v1 clásico sigue funcionando
  perform pg_temp.as_u(g);
  insert into public.retos_matchmaking(retador_id, requiere_host, plataforma) values (g, false, 'Parsec') returning id into r4;
  perform pg_temp.as_u(h1); perform public.aceptar_reto(r4);
  perform pg_temp.as_u(g); perform public.publicar_enlace(r4, 'https://parsec.gg/1v1');
  reset role; select estado into est from public.retos_matchmaking where id = r4; o := o||'T9 1v1_estado='||est||'(esp EN_JUEGO); ';

  -- T10 visitante sin sesión
  perform set_config('request.jwt.claims', '', true); perform set_config('request.jwt.claim.sub', '', true);
  reset role; execute 'set local role anon';
  select count(*) into cnt from public.reto_participantes where reto_id = r1; o := o||'T10a anon_ve_participantes_de_privado='||cnt||'(esp 0); ';
  begin perform public.unirse_a_reto(r2, 'A'); o := o||'T10b FALLO; '; exception when others then o := o||'T10b ok(anon sin RPC); '; end;
  reset role;
  raise exception 'RESULTADO: %', o;
end $$;
