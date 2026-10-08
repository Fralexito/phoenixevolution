# Desfases entre las migraciones del repo y las de Supabase

Supabase solo registra (`supabase_migrations.schema_migrations`) lo aplicado por MCP/CLI. Lo que Fralex pega en el SQL Editor **no aparece en esa lista** aunque esté aplicado. Revisado el 2026-10-08 (Cuenta A).

## ⚠️ Choque de numeración 088 / 089 (dos cuentas a la vez)
| Número | En el repo (Cuenta A, pegado a mano por Fralex) | En Supabase por MCP (otra cuenta, sin archivo en el repo) |
|---|---|---|
| 088 | `088_lm_libro_dinero_club.sql` (lm_club_libro + trigger) | `088_endurecer_permisos_tablas` (revoca insert/update/delete a anon) |
| 089 | `089_mercado_equivalencias.sql` (equivalencias por parche) | `089_cumplimiento_legal_y_derechos_datos` y `089_legal_privacidad` (solicitudes_privacidad, aceptaciones_legales con tutor, mi_aceptacion_legal…) |
Todo está aplicado y no se pisa (objetos distintos). **Pendiente:** que la otra cuenta suba sus archivos al repo con números nuevos (p. ej. 090/091) y deje aquí la equivalencia. Siguiente número libre: **092** (reservar en `REGISTRO.md`).

## Aplicadas por SQL Editor (no figuran en la lista de Supabase)
016–019, 023–053, 056–061 (056/057 figuran con otro nombre), 064, 065, 067, 071–074, 078–080, 084–086, 088 y 089 de la Cuenta A. **No verificado una por una**: se deduce porque sus tablas existen en la base (lista de tablas revisada el 8 oct). 088 y 089 de la Cuenta A sí verificadas.

## En Supabase sin archivo en el repo
`001_blindaje_rls`, `002_estructura_ecosistema`, `003a…003k` (el repo tiene `003_duelos_v2.sql` + `003b`), `004a…004d` (el repo tiene `004_equipos_REGISTRO.md`), `068_ticker_comunidad`, `069_tarjetas_sala_detalle`, `070_enganche_rachas_historia_semanal`, `088_endurecer_permisos_tablas`, `089_cumplimiento_legal_y_derechos_datos`, `089_legal_privacidad`.

## Nombres distintos (mismo contenido)
`noticias_012`=012 · `jugadores_perfil_013`=013 · `votos_semana_014`=014 · `participaciones_015`=015 · `torneo_temporada_copa`=016 · `historias_recientes`=056 · `mis_reacciones`=057 · `087b_lm_cpu_sin_presupuesto` (parte de 087 en el repo).

## Edge Functions desplegadas (2026-10-08)
`phoenix` v9 · `mercado` v10 (incluye /v1/equivalencias) · `directos` v4 · `notificar-discord` v5 (verify_jwt=true). `pago-webhook` está en el repo pero **no** desplegada.
