# Torneos propios (ronda 215 · migración 097)

Cualquier usuario con sesión crea su torneo en `/torneos/` (botón «Crear mi torneo») y lo juega en `/torneo/?id=N`.
Casi sin límites: el staff los vigila desde Moderación → «Torneos propios».

## Qué puede hacer el organizador
- **Ficha** (5 bloques): nombre (botón «Sorpréndeme» inventa uno), formato (10), gente y fechas (cupo, visibilidad, inicio, ¿juego yo?, ¿anotan los jugadores?, ¿sorteo?), dinámicas divertidas (más de 45, cada una con «¿Cómo funciona?») y extras (premio, reglas propias, enlace de sala/transmisión).
- **Formatos**: eliminatoria, doble, liguilla, ida y vuelta, grupos + playoffs, suizo, rey de la colina, escalera, circuito y **Libre** (el organizador añade los partidos que quiera).
- **Inscripción**: los usuarios se apuntan solos; el organizador añade nombres a mano (sin cuenta) y quita gente, hasta que empiece.
- **Empezar**: la web arma los cruces con `core/formatos.js` y los guarda con `torneo_iniciar`. «Permitir más jugadores de lo recomendado» quita los topes del formato (máx. 2000 partidos por llamada).
- **Resultados**: el organizador o los dos jugadores del cruce (si está marcado). En eliminatorias, si hay empate se elige quién pasa. El avance (ganador/perdedor al siguiente cruce) lo hace la base de datos sola. No se puede corregir un resultado si el siguiente partido ya se jugó.
- **Grupos**: cuando un grupo termina, «Cerrar grupos» llena los cruces de playoffs con los puestos.
- **Suizo**: «Armar ronda N» empareja por puntos sin repetir rival; el descanso cuenta como victoria.
- **Colina / escalera / circuito**: el estado vive en `estado_juego` (JSON) y se guarda con `torneo_estado_guardar` (en colina y escalera también pueden los inscritos).
- **Cerrar**: «Cerrar torneo y coronar» (campeón sugerido editable) o «Cancelar».

## Dinámicas con efecto en pantalla
- `ruleta-partido`: cada cruce muestra una regla distinta (determinista por torneo y cruce; `core/diversion.js`).
- `castigo`: tras jugarse, se muestra un castigo sano para el perdedor.
- El resto de dinámicas se muestran con su guía en el torneo («Dinámicas de este torneo»); las reglas las cumplen y vigilan los jugadores.

## Base de datos (097)
Tablas: `torneos_libres_config` (fila única: `habilitado`, `max_activos_por_usuario` 50, `max_jugadores` 256), `torneos_libres`, `torneos_libres_inscritos`, `torneos_libres_partidos`, `torneos_libres_eventos` (bitácora).
Lectura por RLS (público sin sesión si no está oculto ni privado); escritura solo por RPC: `torneo_crear`, `torneo_editar`, `torneo_inscribirse`, `torneo_salir`, `torneo_agregar_jugador`, `torneo_quitar_jugador`, `torneo_iniciar`, `torneo_agregar_partidos`, `torneo_fijar_cruces`, `torneo_resultado`, `torneo_resultado_quitar`, `torneo_estado_guardar`, `torneo_cerrar`, `torneo_cancelar`, `staff_torneo_moderar`, `staff_torneos_config`.
No hay borrados: «retirado», «oculto» y «cancelado» conservan la evidencia. Cuentas sancionadas no pueden crear ni inscribirse.

## Cómo apretar o quitar límites (Fralex)
- Moderación → Torneos propios: pausar la creación, tope de torneos activos por usuario y de jugadores por torneo.
- Ocultar (con motivo), mostrar o cancelar cualquier torneo.
- Para quitar la función entera: sacar `torneos` de `NAV` en `src/data/site.js` (la tabla puede quedarse).

## Archivos
`src/js/core/torneos.js` (lógica pura) · `src/js/core/diversion.js` · `src/data/dinamicas.js` (catálogo y guías, editable) · `src/js/features/torneos/{api,guia,staff}.js` · `src/pages/{torneos,torneo}.astro` · `src/js/pages/{torneos,torneo}.js` · `src/styles/torneos.css` · `tests/torneos.test.mjs`.

## Pendiente / ideas
Avisos al Buzón del juego cuando te toca jugar · Realtime en el detalle (hoy refresca cada 30 s) · llave visual con líneas · palmarés y logros automáticos al coronar · torneos por clanes · apuestas con tokens (requiere decisión legal).
