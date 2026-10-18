-- 130 · Políticas RLS sin duplicar (aviso «multiple_permissive_policies» de Supabase, revisión del 18-oct-2026).
-- Antes: en 6 tablas una política «FOR ALL» de escritura se sumaba a la de lectura, así que cada SELECT evaluaba las dos.
-- Ahora la escritura se separa en INSERT / UPDATE / DELETE con la MISMA condición, y la lectura queda en una sola política.
-- Quién puede ver o cambiar qué NO cambia (comprobado tabla por tabla):
--   · auditoria_tribunal: leer = staff o árbitro (ya incluía al árbitro); escribir = árbitro.
--   · lm_traspasos_reales, lm_ventanas_reales, partido_destacado, partido_goles: leer = todos; escribir = moderador.
--   · retos_matchmaking: leer = la política retos_select (ya incluía al admin); crear = el propio retador (mismas condiciones de antes) o el admin;
--     cambiar y borrar = solo admin (la política «retos_update_retador» era «false»: no daba permiso a nadie).

-- auditoria_tribunal
drop policy if exists auditoria_arbitro_escritura on public.auditoria_tribunal;
create policy auditoria_arbitro_crear on public.auditoria_tribunal for insert to authenticated with check (private.es_arbitro());
create policy auditoria_arbitro_cambiar on public.auditoria_tribunal for update to authenticated using (private.es_arbitro()) with check (private.es_arbitro());
create policy auditoria_arbitro_borrar on public.auditoria_tribunal for delete to authenticated using (private.es_arbitro());

-- lm_traspasos_reales y lm_ventanas_reales
drop policy if exists lm_traspasos_reales_staff on public.lm_traspasos_reales;
create policy lm_traspasos_reales_crear on public.lm_traspasos_reales for insert to authenticated with check (private.es_moderador());
create policy lm_traspasos_reales_cambiar on public.lm_traspasos_reales for update to authenticated using (private.es_moderador()) with check (private.es_moderador());
create policy lm_traspasos_reales_borrar on public.lm_traspasos_reales for delete to authenticated using (private.es_moderador());
drop policy if exists lm_ventanas_reales_staff on public.lm_ventanas_reales;
create policy lm_ventanas_reales_crear on public.lm_ventanas_reales for insert to authenticated with check (private.es_moderador());
create policy lm_ventanas_reales_cambiar on public.lm_ventanas_reales for update to authenticated using (private.es_moderador()) with check (private.es_moderador());
create policy lm_ventanas_reales_borrar on public.lm_ventanas_reales for delete to authenticated using (private.es_moderador());

-- partido_destacado y partido_goles
drop policy if exists partido_destacado_escritura on public.partido_destacado;
create policy partido_destacado_crear on public.partido_destacado for insert to authenticated with check (private.es_moderador());
create policy partido_destacado_cambiar on public.partido_destacado for update to authenticated using (private.es_moderador()) with check (private.es_moderador());
create policy partido_destacado_borrar on public.partido_destacado for delete to authenticated using (private.es_moderador());
drop policy if exists partido_goles_escritura on public.partido_goles;
create policy partido_goles_crear on public.partido_goles for insert to authenticated with check (private.es_moderador());
create policy partido_goles_cambiar on public.partido_goles for update to authenticated using (private.es_moderador()) with check (private.es_moderador());
create policy partido_goles_borrar on public.partido_goles for delete to authenticated using (private.es_moderador());

-- retos_matchmaking
drop policy if exists retos_admin_todo on public.retos_matchmaking;
drop policy if exists retos_update_retador on public.retos_matchmaking;
drop policy if exists retos_insert_propio on public.retos_matchmaking;
create policy retos_crear on public.retos_matchmaking for insert to authenticated with check (
  private.es_admin() or (
    retador_id = (select auth.uid()) and rival_id is null and (estado)::text = 'BUSCANDO' and host_id is null and aceptado_at is null and cerrado_at is null
    and confirmo_retador_at is null and confirmo_rival_at is null and recordatorio_at is null and aviso_final_at is null and motivo_cierre is null));
create policy retos_cambiar_admin on public.retos_matchmaking for update to authenticated using (private.es_admin()) with check (private.es_admin());
create policy retos_borrar_admin on public.retos_matchmaking for delete to authenticated using (private.es_admin());
