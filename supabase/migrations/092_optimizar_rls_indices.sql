-- 092 · Optimización y endurecimiento (analizador de Supabase, 2026-10-08). No cambia ningún permiso de lectura.
-- 1) Políticas RLS: auth.uid() y es_moderador() evaluados UNA vez por consulta (select …), no por fila.
alter policy mdisp_propios on public.mercado_dispositivos using ((usuario = (select auth.uid())) or (select private.es_moderador()));
alter policy mrep_lectura on public.mercado_reportes using ((usuario = (select auth.uid())) or (select private.es_moderador()));
alter policy majustes_propios on public.mercado_ajustes using (usuario = (select auth.uid()));
alter policy mcorr_lee on public.mercado_correcciones using ((usuario = (select auth.uid())) or (select private.es_moderador()));
alter policy lmap_lee on public.lm_aplicados using ((usuario = (select auth.uid())) or (select private.es_moderador()));
alter policy lmo_lee on public.lm_ofertas using ((select private.es_moderador()) or exists (select 1 from public.lm_clubes c
  where c.dueno = (select auth.uid()) and c.id = any (array[lm_ofertas.club_comprador, lm_ofertas.club_vendedor])));
alter policy lm_libro_lectura on public.lm_club_libro using ((select private.es_moderador()) or exists (select 1 from public.lm_clubes c
  where c.id = lm_club_libro.club_id and c.dueno = (select auth.uid())));

-- 2) Funciones internas de la Liga Máster: solo las usa la Edge Function «mercado» (service_role). Se cierran a anónimos y usuarios.
revoke execute on function public.lm_cambios_desde(text, bigint, integer) from public, anon, authenticated;
revoke execute on function public.lm_huella(text) from public, anon, authenticated;
revoke execute on function public.lm_huella_texto(text) from public, anon, authenticated;
revoke execute on function public.lm_plantillas(text) from public, anon, authenticated;
grant execute on function public.lm_cambios_desde(text, bigint, integer), public.lm_huella(text), public.lm_huella_texto(text), public.lm_plantillas(text) to service_role;
alter function private.eq_tabla(text) set search_path = '';

-- 3) Índices en las claves foráneas que más se consultan.
create index if not exists lm_movimientos_jugador_idx on public.lm_movimientos (jugador_id);
create index if not exists lm_movimientos_de_club_idx on public.lm_movimientos (de_club);
create index if not exists lm_movimientos_a_club_idx on public.lm_movimientos (a_club);
create index if not exists lm_ofertas_jugador_idx on public.lm_ofertas (jugador_id);
create index if not exists mercado_eq_phoenix_idx on public.mercado_equivalencias (phoenix_id);
create index if not exists mercado_eq_clubes_phoenix_idx on public.mercado_equivalencias_clubes (phoenix_id);
create index if not exists mercado_dispositivos_usuario_idx on public.mercado_dispositivos (usuario);
create index if not exists partidos_local_idx on public.partidos (id_local);
create index if not exists partidos_visita_idx on public.partidos (id_visita);
create index if not exists resultados_duelo_propuesto_idx on public.resultados_duelo (propuesto_por);
create index if not exists muro_respuestas_autor_idx on public.muro_respuestas (autor_id);
create index if not exists inventario_item_idx on public.inventario (item_id);
create index if not exists presencia_app_sala_idx on public.presencia_app (sala_id);
create index if not exists salas_rival_idx on public.salas (rival);
create index if not exists votos_semana_jugador_idx on public.votos_semana (jugador_id);
create index if not exists temporadas_liga_idx on public.temporadas (liga_id);

-- 4) Libro de dinero: un cambio sin motivo conocido (p. ej. hecho a mano por SQL) ya no se etiqueta «traspaso».
create or replace function private.lm_registrar_dinero() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_motivo text := nullif(current_setting('lm.motivo', true), '');
begin
  if new.presupuesto is not distinct from old.presupuesto then return new; end if;
  if v_motivo is null then
    v_motivo := case
      when old.dueno is distinct from new.dueno then 'activacion_club'
      when exists (select 1 from lm_movimientos m where m.created_at = now() and (m.de_club = new.id or m.a_club = new.id)) then 'traspaso'
      when private.es_moderador() then 'ajuste_staff'
      else 'sin_motivo' end;
  end if;
  insert into lm_club_libro (club_id, delta, saldo_antes, saldo_despues, motivo, referencia, actor)
  values (new.id, new.presupuesto - old.presupuesto, old.presupuesto, new.presupuesto, v_motivo,
          nullif(current_setting('lm.ref', true), ''), auth.uid());
  return new;
end $$;
