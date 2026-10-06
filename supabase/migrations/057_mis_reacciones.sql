-- 057 · MIS REACCIONES: dado un grupo de publicaciones, devuelve con qué emoji reaccioné yo en cada una ({ "123": "🔥", ... }).
-- Sirve para que el feed de /social/ marque lo que ya reaccionaste sin pedir cada publicación por separado. Solo lee MIS filas (usuario_id = yo); máx. 60 ids por llamada.
create or replace function public.mis_reacciones(p_ids bigint[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare yo uuid := (select auth.uid()); res jsonb;
begin
  if yo is null or p_ids is null then return '{}'::jsonb; end if;
  select coalesce(jsonb_object_agg(r.publicacion_id::text, r.tipo), '{}'::jsonb) into res
  from public.muro_reacciones r
  where r.usuario_id = yo and r.publicacion_id = any ((p_ids)[1:60]);
  return res;
end $$;

revoke all on function public.mis_reacciones(bigint[]) from public, anon, authenticated;
grant execute on function public.mis_reacciones(bigint[]) to authenticated;
