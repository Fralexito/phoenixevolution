-- 029 · ARREGLO: las políticas RLS de lectura del chat y de los espectadores llaman a funciones de `private` a las que `authenticated` no tenía permiso de EJECUTAR
-- (018 y 019 las crearon con «revoke all … from authenticated»). Resultado: «permission denied for function es_miembro» al abrir cualquier chat
-- (la web se quedaba en «Cargando…») y lo mismo con es_lider_reto al leer los espectadores.
-- Es seguro: son ayudantes security definer que solo devuelven true/false, y el esquema `private` NO está expuesto por la API (solo se usan dentro de las políticas).
-- Es idempotente (se puede ejecutar varias veces).
grant execute on function private.es_miembro(uuid, uuid) to authenticated;
grant execute on function private.es_lider_reto(integer, uuid) to authenticated;
