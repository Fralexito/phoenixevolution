# Economía · Fase B — racha diaria, primer partido, misiones semanales y logros

Estado: **HECHO y aplicado** (16-oct-2026, hilo economia-fase-b). Migración **120** aplicada en Supabase (`fiibiyijojkxqlsrhcil`). Los pagos reales siguen **apagados**. Todo esto es **gratis y solo en ascuas**: no toca gemas ni da ventaja en el juego.

## Qué hay ahora (para Fralex, en simple)
| Qué | Cuánto | Cómo se consigue |
|---|---|---|
| Recompensa diaria | **+5 ascuas** cada día | Botón «Reclamar» en Tienda → Cómo ganar |
| Día 3 de la racha | **+10 extra** (total 15) | Igual |
| Día 7 de la racha | **+40 extra** (total 45) | Igual. Después de 7 días el ciclo vuelve a empezar |
| Si falta un día | la racha vuelve a 1 | La mejor racha queda guardada |
| Primer partido del día | **+5 ascuas** (+5 XP) | Solo, al confirmarse tu primer marcador del día |
| Misiones de la semana | **60–100 ascuas** cada una, 3 por semana | Botón «Reclamar» cuando la barra llega a la meta |
| Logros | **20–200 ascuas** cada uno, una sola vez | Botón «Reclamar» cuando la medalla ya es tuya |

- Los días y las semanas se cuentan en **hora de Lima** (America/Lima). La semana empieza el lunes.
- Las 6 misiones posibles rotan: 10 partidos (80) · 3 rivales distintos (60) · valorar a 5 rivales (60) · ganar 4 partidos (90) · 5 rivales distintos (100) · 15 partidos (90). Cada semana salen 3 distintas.
- Los **logros son los que ya existían** (medallas de duelos, muro, social y cuenta de las migraciones 035/036). Solo les puse un premio en ascuas (columna nueva `logros_catalogo.ascuas`): desde 20 (primer duelo, debut en el muro…) hasta 200 (Imparable = 50 victorias, Un año con nosotros). Se pueden cambiar por SQL sin tocar código.
- Tope de logros: **200 ascuas por día** (si ganas varias medallas juntas, reclamas el resto otro día).
- **Ojo:** ya existía una «racha» distinta (`mi_racha`, ronda 201): mide si «jugaste un reto hoy» y no da premio. La de la Fase B es una recompensa que se reclama. Son dos cosas separadas; en la pantalla la nueva se llama «Recompensa diaria». Unirlas queda como idea futura.

## Cómo funciona por dentro (para otra cuenta)
Reutiliza el mecanismo que ya existía (investigado antes de escribir nada):
- **Dar ascuas:** `private.registrar_movimiento(usuario, delta, 'ganado', fuente, referencia, clave)` con clave única ⇒ reintentar nunca duplica. Claves nuevas: `racha:<uid>:<fecha>`, `racha_bono:<uid>:<fecha>`, `mision:<uid>:<lunes>:<clave>`, `logro:<uid>:<id>`, y `ganado:<uid>:primer_partido_dia:<fecha>` (esta última la pone `private.otorgar`).
- **Primer partido del día:** regla nueva `primer_partido_dia` en `economia_reglas` (xp 5, ascuas 5, tope 1/día; el admin la edita en Tienda → Administrar → Reglas de ganancia) + disparador `zz_economia_b` en `resultados_duelo` que llama a `private.otorgar` por cada jugador al confirmarse el marcador (mismo estilo que `zz_economia`: nunca rompe la acción original).
- **Misiones:** catálogo en `private.catalogo_misiones(lunes)` (3 de 6 rotando); el progreso se mide con `private.progreso_reto` (lo que ya usan los retos semanales). Cobros en `misiones_cobros` (clave primaria usuario+semana+misión).
- **Logros:** `logros_usuario` (medalla obtenida, ya existía) + `logros_cobros` (premio ya cobrado). `private.metricas_logros` se reutiliza para mostrar el avance.
- **Funciones públicas (solo `authenticated`, `SECURITY DEFINER`, `search_path` vacío):** `reclamar_racha_diaria()`, `reclamar_mision(text)`, `reclamar_logro(text)`, `mis_ascuas_extra()` (lo que pinta la pestaña).
- **Tablas nuevas** (RLS activa, sin políticas, sin permisos a `anon`/`authenticated`): `racha_diaria`, `misiones_cobros`, `logros_cobros`.
- Dos clics a la vez no cobran doble: cada reclamo toma un bloqueo (`pg_advisory_xact_lock`) y además la clave del libro es única.

## Vigilancia (importante)
La alerta `ganancia_ascuas` mira cuántas ascuas «ganadas» tiene una persona en 24 h. Máximo teórico **en un día de Lima** con todo lo nuevo:
`205 (lo de antes) + 45 (racha 5+40) + 5 (primer partido) + 270 (3 misiones de la peor semana) + 200 (tope de logros) = 725`.
Por eso **`alerta_ascuas_dia` sube de 400 a 800** (la migración solo lo cambia si seguía en 400: si Fralex lo había ajustado, no se toca).
Limitación conocida: la vigilancia usa «24 horas corridas», no «día de Lima». Una persona muy activa que cobre cosas diarias justo antes y después de la medianoche podría pasar de 800 una vez y disparar una alerta **falsa** (se resuelve con una nota). Es mejor ese aviso de más que dejar la barrera floja.

## Pruebas
- **SQL** `supabase/tests/120_fase_b_test.sql` (se deshace sola; terminó con `TODO_OK_REVERTIDO` contra la base real): primera reclamación (+5, racha 1); doble reclamo el mismo día rechazado y sin cobro doble; día 3 (+15); día 7 (+45); falta un día ⇒ vuelve a 1 y la mejor racha se conserva; 3 misiones con 60–100 ascuas; misión sin progreso rechazada, con progreso cobra una vez; logro sin medalla rechazado; logro cobrado una vez; tope de 200 al día; primer partido del día lo recibe cada jugador una sola vez; el libro cuadra (`economia_diferencias` = 0); `alerta_ascuas_dia` ≥ 725; `anon` no puede ejecutar nada ni leer las tablas.
- **JS** `tests/ganarAscuas.test.mjs` (7 pruebas: racha 5/+10/+40, normalización, textos). Suite completa: **516/516** en verde. `npm run build`: 53 páginas, en verde.
- **Pantalla:** revisada en modo demo (`/tienda/?demo` → pestaña «Cómo ganar»): reclamar la racha subió 420 → 435 ascuas (día 3 = +15) y no se desborda en celular (375 px).

## Archivos
- `supabase/migrations/120_economia_fase_b_rachas_misiones_logros.sql` · `supabase/tests/120_fase_b_test.sql`
- `src/js/core/ganarAscuas.js` (lógica pura) · `src/js/features/economia/ganar.js` (pantalla) · cables en `features/economia/api.js`, `features/economia/demo.js`, `pages/tienda.js`
- Prueba: `tests/ganarAscuas.test.mjs`

## Pendientes / ideas
- Premio de temporada en ascuas (idea del diseño, sección 3) no entra en esta fase.
- Unificar la racha de «jugaste un reto» (`mi_racha`) con la recompensa diaria, si Fralex lo quiere.
- Los premios de logros son un primer reparto; ajustarlos con datos reales (columna `logros_catalogo.ascuas`).
- Los logros de medallas sociales (amigos, seguidores, reacciones) se podrían farmear con cuentas falsas; el tope diario de 200 y el ser un premio único lo limitan, pero conviene mirarlo cuando haya usuarios reales.
- Pendiente copiar a Drive (hoy solo GitHub).
