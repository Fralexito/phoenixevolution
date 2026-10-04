# 004 — Equipos, cupos e interruptor "azar" (YA APLICADA en Supabase)

Este archivo es el **registro**; no hace falta ejecutarlo. Se aplicó en 4 partes (la herramienta bloquea `delete`/`drop` en bloques grandes):

| Parte | Qué hizo |
|---|---|
| 004a | `perfiles.acepta_retos_azar` (+ permisos por columna), `tam_a`/`tam_b` con tope 8 en total, columnas `acuerdo_*`, tabla `reto_participantes`, ayudantes `es_participante` / `acepta_azar`, nuevos tipos de notificación |
| 004b | Reglas: `invitar_a_reto`, `unirse_a_reto`, `acordar_cupos`; cambios a `aceptar_reto`, `publicar_enlace`, `cancelar_reto`, aviso a hosts; políticas de lectura ampliadas a participantes |
| 004c | Salidas **sin borrar**: quien sale queda con estado `SALIO` (historial + cupo libre); `responder_invitacion`, `salir_de_reto`, `expulsar_de_reto` |
| 004d | Corrección de 2 fallos hallados por la simulación (comparación con `NULL` al invitar; avisos a quien ya salió) |

La fuente de verdad del SQL es la base de datos en vivo (Supabase → Database → Functions). Prueba de regresión: `supabase/tests/004_equipos_simulacion.sql`.

## Reglas en una tabla
| Regla | Dónde vive |
|---|---|
| Máx. 8 jugadores; cada equipo 1..7 | BD (`retos_tam_ok`) + `src/js/core/rules.js` |
| Retador = líder A; quien acepta = líder B | BD (`aceptar_reto`) |
| Solo el líder invita a su equipo | BD (`invitar_a_reto`) |
| Reto privado: solo entran invitados | BD (`unirse_a_reto`, política `retos_select`) |
| Sala con cupos vacíos: ambos líderes deben acordar | BD (`acordar_cupos`, `publicar_enlace`) |
| Inactivo: no recibe ni acepta retos al azar (los directos sí le llegan) | BD (`acepta_azar`) |
