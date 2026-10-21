-- 141 · RLS en las 2 tablas del esquema private (21-oct-2026, revisión de seguridad)
-- Aplicada en remoto con apply_migration el 21-oct-2026 con el nombre 140_rls_tablas_private (se renumeró a 141 en el repo porque otro hilo usó el 140 a la vez).
--
-- Defensa en profundidad: private.mercado_claves y private.jugadores_foto_respaldo no tenían RLS.
-- Ya no tenían permisos para anon/authenticated y private no se expone en la API,
-- pero si algún día alguien les da un GRANT por error, RLS sin políticas lo bloquea.
-- Las funciones que las usan (mercado_clave_publica, sistema_mercado_clave, sistema_mercado_guardar_clave)
-- son SECURITY DEFINER con dueño postgres, que es también dueño de las tablas: siguen funcionando igual.
alter table private.mercado_claves enable row level security;
alter table private.jugadores_foto_respaldo enable row level security;
revoke all on private.mercado_claves from anon, authenticated;
revoke all on private.jugadores_foto_respaldo from anon, authenticated;
