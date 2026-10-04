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
