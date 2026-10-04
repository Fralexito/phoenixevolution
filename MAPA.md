# MAPA del proyecto (tu brújula)

## Flujo en una línea
Tú abres una página → `Layout.astro` pone cabecera/menú/pie → el archivo de la página (`src/pages/X.astro`) pone su contenido → su lógica (`src/js/pages/X.js`) habla con Supabase usando los cimientos (`src/js/core`) y las funciones (`src/js/features`).

```
src/
├─ layouts/Layout.astro      ← cabecera + ticker + menú + pie (UNA sola vez)
├─ components/               ← las piezas de ese layout (Header, Ticker, Sidebar, Footer)
├─ pages/                    ← CÓMO SE VE cada página (index, noticias, database, duelos, palmares, mercado)
├─ js/pages/                 ← QUÉ HACE cada página (mismo nombre que su página)
├─ js/features/              ← funciones reutilizables: login, perfil, campana, tarjeta de jugador…
├─ js/core/                  ← cimientos: conexión a Supabase, sesión, avisos, fechas  (casi nunca se toca)
├─ data/                     ← textos editables: noticias, palmarés, redes, ticker
└─ styles/                   ← colores y estilos (tokens.css = la paleta, un solo lugar)
```

## ¿Dónde toco para…?
| Quiero… | Edito… |
|---|---|
| Cambiar cabecera, menú o pie | `src/components/` |
| Ticker "Última hora" o redes | `src/data/site.js` |
| Añadir/cambiar una noticia | `src/data/noticias.js` |
| Premios del Palmarés | `src/data/palmares.js` |
| Un color o la fuente | `src/styles/tokens.css` |
| Agregar una sección al menú «Mi cuenta» (tras iniciar sesión) | `ACCOUNT_NAV` en `src/data/site.js` (1 línea) |
| Agregar una página pública al menú | `NAV` en `src/data/site.js` (1 línea) |
| Cambiar el límite de jugadores o los minutos de confirmación | `src/js/core/rules.js` **y** la BD (cada valor dice `[BD]`) |
| Probar que la BD sigue bien tras un cambio | pegar `supabase/tests/004_equipos_simulacion.sql` en el SQL Editor |
| Cómo se ve una página | `src/pages/<pagina>.astro` |
| Qué hace una página | `src/js/pages/<pagina>.js` |

## Reglas de oro (para que no se rompa)
1. La cabecera/menú/pie solo existen en `Layout.astro` y `components/`. Nunca se copian a otra página.
2. Los colores solo se definen en `tokens.css`.
3. Lo importante (seguridad, aceptar retos) vive en Supabase, no en el navegador. Así la futura app usa lo mismo.
4. Todo texto que viene de la base de datos pasa por `escapeHTML` antes de mostrarse.
5. Antes de subir cambios: `npm run build` y `npm test` deben terminar sin errores.

## Duelos v2 en una imagen
```
Formulario ──insert──► retos_matchmaking ──trigger──► notificaciones ──Realtime──► campana + holograma
                              ▲                                 ▲
Botones (aceptar, rechazar,   │ RPC (la BD valida TODO)         │ pg_cron cada minuto:
cancelar, finalizar,          │                                 │ recordatorio T-30, aviso T-15,
confirmar, publicar enlace) ──┘                                 └ cancela solo a T-10 si falta confirmar
Radar (Presence): solo muestra quién está libre/ocupado; es cosmético, no da permisos.
```
- Archivos: `src/pages/duelos.astro` (vista) y `src/js/pages/duelos.js` (orquestador, ~140 líneas). La lógica está partida en `src/js/features/duelos/`:
  `data.js` (leer datos) · `cards.js` (tarjetas, equipos y cupos) · `form.js` (formulario) · `actions.js` (llamadas a la BD) · `invite.js` (ventana para invitar).
  Aparte: `features/notifications.js` (campana), `features/holo.js` (holograma), `features/presence.js` (radar), `core/rules.js` (constantes que deben coincidir con la BD), `core/teams.js` y `core/schedule.js` (lógica pura con pruebas).
- Equipos: un reto es Equipo A (líder = retador) vs Equipo B (líder = quien acepta), máx. 8 jugadores. Los demás entran por invitación o por cupo libre (si el reto es público).
- La base de datos ya tiene todo aplicado (`supabase/migrations/003`, `003b` y `004`). **No los vuelvas a ejecutar.**


## Cambios de la ronda "borrador" (cabecera, ticker, estado)
- **Estado unificado en Duelos**: un solo selector `Inactivo · Activo · Radar` (`#seg-estado`). Cada nivel incluye al anterior:
  Inactivo = `perfiles.acepta_retos_azar=false` · Activo = `true` · Radar = Activo + Presence (solo en la sesión).
  Código: `src/js/pages/duelos.js` (`nivelActual`, `setNivel`, `applyRadar`, `paintEstado`).
- **Ticker "Última hora"**: se esconde al bajar y vuelve al subir. Lógica en `src/js/features/ticker.js`; el CSS solo alterna `data-oculto` (`layout.css`).
- **Cabecera**: el menú va pegado a la derecha (`ml-auto`), así que el logo expandido (solo ≥1360px con mouse) no lo mueve.
- **Redes**: `SOCIALS` en `src/data/site.js` (Discord y TikTok con enlace; Kick y YouTube pendientes). Íconos con trazo SVG propio en `SocialIcon.astro`.
- **Registro**: el campo se llama "Nombre de usuario / apodo". La clave interna sigue siendo `gamertag` porque así la lee el trigger `handle_new_user`.

## Ronda "identidad y Duelos compacto"
- **Identidad (perfiles)**: `username` = @ único elegido por la persona (verificación en vivo: `features/handleCheck.js`);
  `nombre_display` = apodo visible. El registro envía `usuario` y `apodo`; el trigger `handle_new_user` los guarda
  (migración `005_perfil_identidad.sql`, ya aplicada). Nombres reservados (admin, staff…) bloqueados en BD y en el cliente.
- **Avatares**: `core/avatar.js` es el ÚNICO lugar que dibuja un avatar. `avatar_url` puede ser foto https, `preset:<id>` (12 avatares
  propios, se añaden con una línea en `PRESETS`) o vacío (inicial). Al iniciar sesión, si el perfil no tiene foto se copia la de Discord/Google
  (`core/session.js → syncProviderAvatar`).
- **Controles**: `features/formControls.js` (interruptor y selector segmentado) para no repetir HTML. Perfil → pestaña "Sistema Host" los usa.
- **Duelos en 2 columnas**: formulario a la izquierda, "Mis partidos / Retos en el radar" a la derecha con pestañas. En móvil se alterna
  "Lanzar reto" / "Partidos" (`#seg-vista`). `duelos/#mis-partidos` abre directo esa pestaña.
