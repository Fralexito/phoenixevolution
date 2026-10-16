# Economía · Fase E (migración 123) — informe

Hilo `economia-fase-e` · 16-oct-2026. Diseño completo y preguntas para Fralex: `docs/DISENO-PASS-Y-ORGANIZADORES.md`.

## Estado en una línea
**Hecho y probado:** la migración 123 está aplicada en la base (la aplicó Fralex pegándola en el SQL Editor) y la prueba SQL terminó en `TODO_OK_REVERTIDO` (11 pruebas, 16-oct-2026). Código publicado en `borrador`.

## Qué hay
| Pieza | Dónde |
|---|---|
| Diseño, reglas, propinas (solo riesgos), overlay TikTok (solo contrato) | `docs/DISENO-PASS-Y-ORGANIZADORES.md` |
| Migración 123 | `supabase/migrations/123_economia_fase_e_pase_y_torneo_premium.sql` |
| Prueba SQL (se deshace sola; termina en `TODO_OK_REVERTIDO`) | `supabase/tests/123_fase_e_test.sql` |
| Lógica pura + 12 pruebas | `src/js/core/phoenix-pass.js`, `tests/phoenix-pass.test.mjs` |
| Pestaña «Pase» (demo: `/tienda/?demo`) | `src/js/features/economia/pase.js`, `pase-demo.js`, enganche en `pages/tienda.js` y `tienda.astro` |
| Botón «Hacer premium» (panel «Opciones del organizador») | `src/js/pages/torneo.js`, `features/torneos/api.js`, `styles/torneos.css` |

## La migración, en simple
- **Tablas** (todas con RLS cerrada; nadie escribe desde el navegador): `pase_temporadas`, `pase_recompensas`, `pase_compras`, `pase_reclamos`, `torneo_premium`. (La tabla `temporadas` que ya existía es de las ligas; no se toca.)
- **Libro**: 3 tipos nuevos de movimiento (`compra_pase`, `recompensa_pase`, `torneo_premium`). La migración **lee la lista actual** del check y le añade los suyos, para no pisar a las otras fases. Cada cobro/premio usa clave idempotente por `private.registrar_movimiento`.
- **Funciones para el jugador**: `pase_estado()` (pública), `pase_comprar()`, `pase_reclamar(nivel, pista)`, `torneo_premium_info(torneo)` (pública), `torneo_hacer_premium(torneo)`.
- **Funciones del administrador** (con `admin_seguro` y auditoría): `admin_pase_temporada(...)`, `admin_pase_recompensa(...)`. Reglas: la pista gratis nunca da gemas; las gemas de regreso suman menos que el precio; no se cruzan temporadas; con compras hechas no se cambia inicio/niveles/XP; no se borra un premio ya reclamado.
- **Seguridad**: funciones `SECURITY DEFINER` con `search_path` vacío; `revoke` a `public` y `anon` (solo `pase_estado` y `torneo_premium_info` son públicas); `grant` a `authenticated` donde toca.
- **Temporada 1 «Despegue»** (17-oct → 16-dic-2026, 30 niveles, 100 XP por nivel, 150 gemas): gratis = 2 160 ascuas + 3 objetos comunes que ya existen (`marco_hielo`, `titulo_imparable`, `insignia_rayo`); premium = 6 objetos exclusivos (inactivos en la tienda, solo llegan por el pase), 1 080 ascuas y 60 gemas de regreso. `torneo_premium_gemas = 300`, `pase_gracia_dias = 7` en `economia_config`.
- **Reutilización de otras fases**: los premios apuntan a un objeto de `tienda_items` por clave; los efectos/banners/sonidos de la Fase C (121) y lo que traiga la Fase B se pueden añadir al pase con `admin_pase_recompensa` sin cambiar código.

## Cómo se aplicó
Migración pegada en el SQL Editor, comprobada (1 temporada, 60 premios, 7 funciones, 3 tipos nuevos en el libro) y prueba `supabase/tests/123_fase_e_test.sql` ejecutada. La temporada empieza el 17-oct 00:00 (Lima); antes dirá «la próxima temporada empieza pronto».

## Verificado
- `node --test tests/*.test.mjs`: 530 pruebas, 0 fallos. `npm run build`: 53 páginas.
- Demo (`/tienda/?demo`, `&pase=si`, `&xp=1450`, `&pase=cerrado`): reclamar sube las ascuas; con 85 gemas la compra queda desactivada («No te alcanzan las gemas»); sin desborde horizontal a 375 px.
- Base real: prueba SQL deshecha OK (T1 a T11: compra única, reclamo único, libro idempotente, exclusivos no vendibles, límites del admin, torneo premium, 0 diferencias).

## Riesgos / pendientes
- Si otra fase vuelve a reconstruir el check de tipos del libro con una lista fija, puede quitar los 3 tipos de esta fase: tras aplicar cualquier migración nueva, comprobar `select pg_get_constraintdef(oid) from pg_constraint where conname='movimientos_tokens_tipo_check'`.
- El overlay, las llaves de pantalla completa, las estadísticas y la página propia del torneo premium **no están construidos**: hoy solo existe la marca comprada (y se dice así en la pantalla). Overlay TikTok: solo contrato, ver el diseño.
- Sin devolución automática del torneo premium ni del pase: el administrador corrige con un movimiento de reembolso.
- Propinas y patrocinios: solo diseño (requieren decisión de Fralex; propinas, revisión legal).
- Pendiente copiar este informe y el diseño a Drive cuando vuelva el acceso.
