-- 129 · Limpieza menor de seguridad y rendimiento tras la revisión con los avisos de Supabase (18-oct-2026).
-- Lo que NO se toca a propósito (ver docs/REVISION-GENERAL-18-OCT.md):
--   · 329 funciones SECURITY DEFINER ejecutables por «authenticated»: es el diseño (la web llama a la base por RPC y cada función comprueba la sesión y el rol dentro).
--   · 36 funciones de LECTURA pública para «anon» (rankings, perfil público, tienda, ticker…): se ven sin iniciar sesión a propósito.
--   · 64 tablas con RLS y sin política: solo las toca el servidor / funciones; sin política = nadie más entra (valor seguro).
--   · Índices de claves foráneas: las tablas son diminutas (la mayor tiene 482 filas); crearlos ahora solo encarece las escrituras.
-- Qué sí: (1) cerrar al rol anónimo las dos funciones que ESCRIBEN y ya exigían ser admin; (2) política de ia_chat_uso con (select auth.uid());
-- (3) fijar search_path en private.vestuario_validar_cambio (solo usa funciones del sistema: sin riesgo).

-- 1. Panel del sitio: guardar y deshacer/rehacer exigen admin dentro; además ya no las puede llamar quien no ha iniciado sesión.
revoke execute on function public.sitio_guardar(jsonb, text), public.sitio_mover(integer) from public, anon;
grant execute on function public.sitio_guardar(jsonb, text), public.sitio_mover(integer) to authenticated, service_role;

-- 2. Uso del chat de IA: auth.uid() se evaluaba una vez por fila; con (select …) se evalúa una sola vez por consulta.
drop policy if exists ia_chat_uso_propio on public.ia_chat_uso;
create policy ia_chat_uso_propio on public.ia_chat_uso for select to authenticated using (usuario = (select auth.uid()));

-- 3. Función de validación del vestuario: no lee tablas, así que search_path vacío no cambia nada.
alter function private.vestuario_validar_cambio(jsonb, text, jsonb) set search_path = '';
