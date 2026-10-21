# Bitácora: dinero real, apuestas y riesgo legal

Documento único del tema; se **amplía** aquí, no se crean documentos cortos nuevos (regla de Fralex del 21-oct-2026). Reúne lo que antes estaba en `AUDITORIA-DINERO-Y-APUESTAS-21-OCT-2026.md` y `RIESGOS-LEGALES.md`.
Límite fijo del proyecto: **nada de apuestas con dinero real.**
Última entrada: 21-oct-2026 · Ronda 364 · Beta 1.15.2 · migración 140.

---

## Índice
1. Resumen: qué se logró
2. Cómo funciona la economía (lo que hay que saber antes de tocar nada)
3. Paso a paso de la auditoría (replicable)
4. El hueco encontrado
5. La solución aplicada (migración 140) y por qué así
6. Paso a paso de la aplicación y las pruebas (replicable)
7. Errores y tropiezos del camino
8. Cómo mantener la regla en el futuro
9. Riesgos legales y medidas (no es asesoría legal)
10. Pendientes antes de cobrar dinero real

---

## 1. Resumen: qué se logró (21-oct-2026)
- Se revisó toda la economía en la base real (Supabase `fiibiyijojkxqlsrhcil`) y en las migraciones 065, 071, 111–113, 119–123 y 139.
- Se encontró un **puente indirecto entre dinero real y apuestas**: soles → gemas → Phoenix Pass premium → ascuas → reto con pozo.
- Se cerró con la **migración 140 «ascuas solo gratis»**: la pista premium del pase ya no da ascuas, un candado en la base solo deja entrar ascuas por fuentes gratis y el alquiler de host ya no acepta gemas.
- La web se ajustó (Beta 1.15.2). Pasaron las 648 pruebas y la web compila sin errores.
- Se escribieron los riesgos legales con medidas concretas (sección 9).

## 2. Cómo funciona la economía
| Pieza | Migración | Qué es | Estado el 21-oct |
|---|---|---|---|
| **Ascuas** | 065 | Moneda gratis: se gana jugando, con retos, rachas, misiones y logros. Su saldo es `billeteras.saldo`. | En uso |
| **Gemas** | 065 | Se compran con soles; su saldo es `billeteras.gemas`. No hay botón de cambio con las ascuas. | 0 en circulación |
| Libro `movimientos_tokens` | 065/111 | Cada entrada o salida queda registrada (`tipo`, `moneda`, `delta`, `referencia`, `clave`). Es inmutable: los triggers `trg_libro_no_modificar` y `trg_libro_no_truncar` lo protegen. Todo pasa por `private.registrar_movimiento(usuario, delta, tipo, fuente, referencia, clave, moneda)`. | 2 movimientos |
| Pagos (Yape, Plin, transferencia, Mercado Pago) | 111–113, 122 | Las gemas solo se acreditan en `procesar_pago_evento`. Interruptor general: `economia_config.pagos_activos`. | `false`, 0 órdenes, pasarela en `prueba` |
| **Retos con pozo** | 065 | Apuesta 1 vs 1 en ascuas (`apuestas_reto`, `apostar_en_reto`, `aceptar_apuesta`, `liquidar_apuesta`, `devolver_apuesta`). Requisitos: 18+, 7 días de antigüedad y 3 partidos; máximo 3 por pareja al día; mínimo 50 y máximo 20 000. | 0 pozos |
| Comisión de los pozos | 065 | 5 % hasta 500 ascuas y 10 % encima (`private.comision_para`). **Nadie la cobra**: se destruye. | — |
| Phoenix Pass | 123 | Se compra con gemas (150), tiene una pista gratis y una premium. Regla: las gemas que devuelve deben sumar menos que el precio. | 0 compras |
| Torneo premium | 123 | Marca visual por 300 gemas. | — |
| Alquiler de host | 071 | Pago por fuera o con gemas que pasaban del cliente al host. | 0 alquileres |
| Patrocinios | 139 | Se pagan a Fralex fuera de la web. | — |

## 3. Paso a paso de la auditoría
1. Leer `docs/economia/` (diseño, seguridad, pasarela, pase).
2. Buscar en las migraciones todo lo que mueve dinero:
   `grep -rlis "apuesta" --include=*.sql supabase/migrations` y `grep -rniE "retiro|payout|canjear|convertir" supabase/migrations`.
3. Ver el estado real con una sola consulta: `economia_config` (claves `pagos_activos`, `apuesta_*`, `pasarela_modo`), recuentos de `apuestas_reto`, `ordenes_pago`, `movimientos_tokens` por moneda y tipo, `pagos_metodos`, `pase_recompensas` por pista y tipo, `pase_compras`, `alquileres_host` y la suma de `billeteras.gemas`.
4. Listar **todas las llamadas** a `registrar_movimiento` en las funciones vivas, sin fiarse solo de los archivos:
   ```sql
   select p.proname, m[1] from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   cross join lateral regexp_matches(pg_get_functiondef(p.oid), '(registrar_movimiento\([^;]{0,220})', 'g') m
   where n.nspname in ('public','private') and p.prokind = 'f' and p.proname <> 'registrar_movimiento';
   ```
   Así se ve qué tipos **suman ascuas**: `ganado`, `ajuste_admin`, `apuesta_premio`, `apuesta_devolucion` y `recompensa_pase`.
5. Seguir cada camino que empieza en gemas (pase, torneo premium, alquiler) y ver si termina en ascuas.

## 4. El hueco encontrado
`pase_reclamar` daba **ascuas** en la pista premium: 18 premios de 60, es decir 1080, más 100 de compensación por cada objeto repetido. Como el pase premium se paga con gemas y las gemas con soles, esas ascuas eran, en parte, **compradas con dinero** y se podían meter en un pozo. Una apuesta con algo comprado se parece mucho a una apuesta con dinero real.
Riesgo menor: con el alquiler pagado en gemas, una persona podía **ganar gemas** de otra.

## 5. La solución aplicada (migración 140) y por qué así
Archivo: `supabase/migrations/140_ascuas_solo_gratis.sql`. Aprobación de Fralex: «Corrige todito eso» (21-oct, 15:31).
1. **Pista premium sin ascuas.** Los 18 premios en ascuas pasan a ser objetos cosméticos libres (comunes y raros primero, luego épicos; se excluyen los limitados y los que ya estaban en el pase). La restricción `pase_premium_sin_ascuas` impide volver a ponerlos, también desde el panel del admin.
   *Por qué no gemas:* el pase cuesta 150 y ya devuelve 60 gemas; 1080 ascuas serían 216 gemas, y la regla de la 123 exige devolver menos que el precio.
2. **`pase_reclamar` nueva.** Si el objeto premium está repetido, ya no da ascuas: devuelve `repetido: true` y la web muestra «Ya tenías …». En la pista gratis sigue la compensación de 100 ascuas.
3. **Candado del libro** `trg_libro_ascuas_solo_gratis` (antes de insertar en `movimientos_tokens`):
   - ascuas positivas solo con `ganado`, `ajuste_admin`, `apuesta_premio`, `apuesta_devolucion` y `recompensa_pase`, y esta última solo si `referencia` termina en `:gratis`;
   - los tipos `apuesta_*` solo pueden ir en ascuas;
   - `compra_dinero` y `bono_primera_compra` solo pueden ir en gemas.
   Es la garantía de fondo: aunque alguien escriba mañana una función nueva con un error, la base la rechaza.
4. **Alquiler sin gemas.** `trg_oferta_sin_gemas` pone a cero las gemas de las ofertas y `trg_alquiler_sin_gemas` rechaza solicitudes nuevas con `pago = 'gemas'`. Solo actúa al insertar, para que un alquiler antiguo con gemas, si lo hubiera, aún pueda completarse o devolverse.
5. **Web:** `src/js/features/economia/pase.js` (mensaje de repetido), `pase-demo.js` (la demo ya no da ascuas en premium) y `src/js/features/alquiler.js` (sin la casilla de gemas, con aviso de pago por fuera y sin comisión). `src/data/versionWeb.js` pasa a 1.15.2.
No se borró ningún dato: había 0 compras del pase, 0 alquileres y 0 pozos.

## 6. Paso a paso de la aplicación y las pruebas
1. Escribir la migración en el repositorio.
2. **Probarla contra la base real sin cambiar nada:** enviar en un solo `execute_sql` el contenido de la migración y, al final, un bloque `do $$ … raise exception 'RESULTADOS: %' … $$`. La excepción final deshace todo. Los controles que se usaron, con el resultado esperado:
   `premium_ascuas=0` · `premium_items=24` · objetos sin repetir · `ganado` pasa · ascuas por `compra_dinero` se bloquean · ascuas `recompensa_pase` con `:premium` se bloquean · con `:gratis` pasan · `apuesta_garantia` en gemas se bloquea · ascuas por `alquiler_pago` se bloquean · poner un premio premium en ascuas se bloquea · 0 ofertas con gemas. Resultado: **11/11**.
3. Comprobar que no quedó nada: la restricción no existe, siguen 18 premios premium en ascuas y no hay movimientos `test140%`.
4. Aplicar con `apply_migration` (nombre `140_ascuas_solo_gratis`).
5. Verificar: 0 premios premium en ascuas, 24 objetos premium, los 3 triggers creados y `pase_reclamar` con `repetido`.
6. Web: `node --test tests/*.test.mjs` dio 648/648 y `npm run build` terminó bien (61 páginas).
7. Commits en `borrador`: 48e8ef8 (código y migración) y 9a33b2b (MAPA, REGISTRO e índice).

## 7. Errores y tropiezos del camino
- **Primera propuesta equivocada:** propuse cambiar las ascuas premium por gemas «al mismo valor». Al leer la 123 vi que rompía la regla «gemas devueltas < precio del pase». Lo corregí a objetos antes de aplicar. *Lección:* leer las restricciones de la tabla y de las funciones de admin antes de proponer cifras.
- `string_agg(... regexp_matches(...))` falla («array_agg is an aggregate»). Se usa `cross join lateral regexp_matches(...)`.
- Un trigger «antes de actualizar» en `alquileres_host` habría bloqueado completar o devolver alquileres antiguos con gemas. Se dejó solo «antes de insertar».
- En Windows no hay `python`; las ediciones se hacen con la herramienta Edit o `sed`.
- El hook GateGuard pide justificar cada archivo nuevo o editado antes de tocarlo. No es un error: hay que responder sus preguntas y reintentar.
- `git pull --rebase` falla si otros hilos tienen cambios sin commit en la misma carpeta (aquí, liga de amigos y `site.js`). **No usar stash.** Primero `git fetch` y `git rev-list --left-right --count HEAD...origin/borrador`; si el remoto no va por delante, se hace `push` directamente.
- Un enlace a GitHub mal puesto en el chat (al perfil, no al archivo). Remoto correcto: `https://github.com/Fralexito/phoenixevolution`.

## 8. Cómo mantener la regla en el futuro
- Toda forma nueva de ganar ascuas debe ser **gratis**. Usa un tipo ya permitido o añade el tipo nuevo a la lista de `private.libro_ascuas_solo_gratis()` en una migración, explicando por qué no viene del dinero.
- Nunca: cambio de gemas a ascuas, pozos con gemas, retiro de ninguna moneda a soles, ni premios que sean dinero, saldo o productos físicos.
- Si una función nueva falla con «Las ascuas solo se ganan gratis…», es el candado haciendo su trabajo: revisa el diseño, no quites el candado.

## 9. Riesgos legales y medidas
> **No es asesoría legal.** Es información general con medidas razonables; un abogado peruano debe revisarla antes de cobrar dinero real. Confirmar que las normas citadas siguen vigentes.

**9.1 Apuestas en Perú.** Las apuestas deportivas y los juegos a distancia por internet están regulados por la Ley 31557 (modificada por la Ley 31806) y su reglamento. Quien los ofrece necesita **autorización del MINCETUR**, y operar sin ella expone a multas y al bloqueo del sitio. La ley apunta a apuestas con dinero o con algo de valor económico.
*Medidas:* ascuas solo gratis (hecho, migración 140); ninguna moneda ni premio se cambia por soles, saldo, productos o regalos; la comisión de los pozos no la cobra nadie (mantenerlo así, porque si la casa ganara se parecería a un operador); 18+ con límites y freno de emergencia; en la web decir «reto con pozo de ascuas» y no «apuesta»; en los términos, que las ascuas no tienen valor monetario y que está prohibido comprar y vender cuentas, ascuas o resultados.

**9.2 Venta de gemas.** Protección al consumidor (Ley 29571): precio final en soles, qué se compra, política de reembolso y **Libro de Reclamaciones virtual**. Impuestos: RUC y comprobantes ante SUNAT, a decidir con un contador. Datos personales (Ley 29733): informar qué se guarda (capturas, nombre del pagador) y por cuánto tiempo. La lista técnica está en `SEGURIDAD-ECONOMIA.md`.

**9.3 Konami, PES y eFootball.** Las marcas y los archivos del juego son de Konami.
*Medidas:* no distribuir el juego ni archivos originales, ya que cada usuario necesita su copia legal; no cobrar por el parche ni por el acceso a él; no usar logos de Konami ni de PES en la marca y añadir la nota «Proyecto de la comunidad, sin relación con Konami»; tener un contacto y responder rápido si piden retirar algo.

**9.4 Caras, kits y parches de terceros.** Los modders tienen derechos sobre su trabajo, los jugadores sobre su imagen y los clubes sobre sus escudos.
*Medidas:* usar solo trabajos con permiso del autor y con créditos visibles; nunca venderlos ni ponerlos detrás de gemas; tener un proceso para retirarlos si alguien lo pide; registrar de dónde sale cada recurso (autor, fecha y permiso).

**9.5 Parsec y alquiler de host.** Los términos de Parsec y de la plataforma del juego (por ejemplo, Steam) pueden limitar el uso comercial o «prestar» el acceso al juego.
*Medidas:* leer esos términos antes de promover el alquiler; dejar claro que el acuerdo es entre las dos personas, que Phoenix no cobra comisión y que cada jugador necesita su copia; el pago va solo por fuera (hecho, migración 140); si los términos lo prohíben, convertirlo en «host voluntario» sin pago.

**9.6 Menores.** Ya existe la fecha de nacimiento y el límite de 18+ para comprar y para los pozos. No mostrar ofertas de gemas a menores.

## 10. Pendientes antes de cobrar dinero real (los hace Fralex)
- [x] Candado de ascuas gratis aplicado y probado (migración 140).
- [ ] Términos de uso y de compra revisados por un abogado (ascuas sin valor, sin reventa, sin relación con Konami).
- [ ] RUC, comprobantes y Libro de Reclamaciones.
- [ ] Créditos y permisos de caras y kits documentados.
- [ ] Decidir sobre el alquiler de host después de leer los términos de Parsec y del juego.
- [ ] El resto de la lista de `SEGURIDAD-ECONOMIA.md` (MFA, pago de prueba, cero alertas).
