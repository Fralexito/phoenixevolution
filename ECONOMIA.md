# Economía de Phoenix Evolution Series

## Resumen
- **XP** → sube tu **nivel** (`nivel = floor((1+√(1+xp/12.5))/2)`; el nivel N empieza en 50·N·(N−1) XP). El nivel desbloquea objetos.
- **Tokens** → moneda virtual. Se ganan jugando; se pueden **comprar con dinero real** (solo mayores de 18); se gastan en **cosméticos**.
- Sin retiro de dinero, sin transferencias entre personas, sin cajas sorpresa, nada que cambie quién gana.

## Cómo se gana (tabla `economia_reglas`, editable por el admin)
Partido confirmado, victoria, valoración enviada (con tope diario) y los 4 retos semanales. Cada premio es idempotente (una vez por persona y hecho) y nunca rompe la acción original.

## Piezas
| Migración | Qué hace |
|---|---|
| 049 | XP, niveles, billetera, libro de movimientos, reglas, disparadores |
| 050 | Catálogo cosmético, inventario, compra atómica, equipar, admin |
| 051 | Paquetes, órdenes, términos, acreditación idempotente, reembolso/disputa, interruptor `pagos_activos` |
| `supabase/functions/pago-webhook` | Esqueleto (firma HMAC). Falta el adaptador de la pasarela |

## Puesta en marcha de pagos (pendiente)
1. Elegir pasarela con soporte en Perú y comprobantes (p. ej. Culqi, Niubiz, Mercado Pago, Stripe).
2. Completar `interpretar()` en la Edge Function y desplegarla (sin verificación JWT; la firma es la autenticación). Secreto `PAGO_WEBHOOK_SECRET`.
3. Que el botón de pago envíe a la pasarela el id de la orden (`crear_orden`) y el monto lo fije el servidor.
4. Probar con modo sandbox: pagado, fallido, reembolso, disputa.
5. Redactar términos y política de reembolsos; subir `version_terminos` si cambian.
6. Activar `pagos_activos` desde Tienda → Administrar.

## Lista neutral de puntos legales a revisar (responsabilidad del titular)
Mayoría de edad para comprar; términos y reembolsos; comprobantes y tributación; protección al consumidor (libro de reclamaciones, información de precios); privacidad y datos de pago (nunca guardar tarjetas: lo hace la pasarela); reglas de la pasarela; propiedad de las marcas y parches usados.

## Operación
- Saldo negativo por reembolso: bloquea compras en la tienda hasta compensar.
- Auditoría: ajustes, reglas, catálogo, paquetes y el interruptor de pagos quedan en la auditoría del staff.
- Riesgo conocido: amigos que fabrican partidos confirmados; mitigado con topes diarios y rivales distintos.

## Actualización (2026-10-08, Cuenta A)
- **Dos monedas (065):** **ascuas** = se ganan jugando (columna histórica `billeteras.saldo`); **gemas** = se compran con dinero real (`billeteras.gemas`). Sin conversión entre ellas. `movimientos_tokens.moneda` indica cuál.
- **Retos con pozo (065, 066):** apuestas 1 vs 1 **solo en ascuas** (nunca gemas), solo mayores de 18 con fecha declarada, antigüedad y partidos confirmados mínimos; montos en saltos de 50; comisión escalonada redondeada a 10 que se retira de circulación (nadie la cobra); montos altos pasan por revisión del staff.
- **Alquiler de host verificado (071):** pago por fuera o con gemas en garantía.
- **Liga Máster:** el dinero de cada club es una economía aparte (`lm_clubes.presupuesto`), sin relación con ascuas/gemas; cada cambio queda en `lm_club_libro` (088 de la Cuenta A).
- **Pasarela:** sigue pendiente; `pagos_activos` apagado.

> ⚠️ **Antes de activar dinero real o los retos con pozo: revisar con un abogado en Perú** (juegos y apuestas, protección al consumidor, comprobantes y tributación, menores de edad).
