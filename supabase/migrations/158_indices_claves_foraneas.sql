-- 158 · Optimización: índice para cada clave foránea sin índice (25-oct-2026, Cuenta 2). Pedido de Fralex: «Optimiza todo».
-- ESTADO: APLICADA el 25-oct-2026 (0 claves foráneas sin índice al terminar).
-- Qué arregla: el asesor de rendimiento de Supabase marcaba 110 claves foráneas sin índice. Sin índice, borrar una cuenta o un duelo
-- obliga a recorrer tablas enteras buscando filas relacionadas, y algunas búsquedas «por autor/usuario» también. Con índice, es directo.
-- Seguro: solo AÑADE índices («create index if not exists»), no cambia datos ni funciones. Se genera solo desde el catálogo, así que
-- se puede volver a correr en el futuro para cubrir claves nuevas. Coste: algo de espacio y escrituras un poco más lentas (despreciable aquí).
do $idx$
declare r record; v_n integer := 0;
begin
  for r in
    with fk as (
      select c.conrelid, c.conkey, cl.relname tabla
      from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace
      where c.contype = 'f' and n.nspname = 'public'
    )
    select tabla,
      (select string_agg(a.attname, '_' order by k.ord) from unnest(conkey) with ordinality k(n, ord) join pg_attribute a on a.attrelid = conrelid and a.attnum = k.n) nombres,
      (select string_agg(quote_ident(a.attname), ', ' order by k.ord) from unnest(conkey) with ordinality k(n, ord) join pg_attribute a on a.attrelid = conrelid and a.attnum = k.n) columnas
    from fk
    where not exists (select 1 from pg_index i where i.indrelid = fk.conrelid and (i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1] = fk.conkey)
  loop
    execute format('create index if not exists %I on public.%I (%s)', left(r.tabla || '_' || r.nombres, 55) || '_fk_idx', r.tabla, r.columnas);
    v_n := v_n + 1;
  end loop;
  raise notice '158: % índices creados', v_n;
end $idx$;
