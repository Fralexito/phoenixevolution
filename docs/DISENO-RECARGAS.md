# Diseño del sistema de recargas con varios métodos de pago — Phoenix Evolution Series

> Fecha: 16-oct-2026. Es el detalle de la **Fase 4** de `PLAN-MONEDAS-VIRTUALES.md`. Una «recarga» = comprar **gemas** con dinero real. No es asesoría legal ni tributaria. Las cifras de comisiones salen de blogs y comparativas (no de documentación oficial) y **se contradicen entre sí**: hay que confirmarlas con cada proveedor antes de decidir.

## 1. Qué hay hoy
- Base lista: `paquetes_tokens` (3 paquetes), `ordenes_pago`, `crear_orden`, `procesar_pago_evento` (acredita gemas de forma idempotente, maneja reembolso y disputa), `aceptaciones_legales` y el interruptor `pagos_activos` (apagado).
- Edge Function `pago-webhook`: solo el esqueleto (verifica firma HMAC; `interpretar()` sin implementar). No está desplegada.
- Falta todo lo demás: elegir proveedor, cobrar de verdad, métodos de pago, panel de gestión, conciliación, comprobantes.

## 2. Métodos de pago que tiene sentido ofrecer en Perú
| Método | Cómo paga la persona | Tipo | Observaciones |
|---|---|---|---|
| Tarjeta crédito/débito | Formulario seguro de la pasarela | Inmediato, automático | Lo más estándar. Comisión variable (≈3,5–4,5 % + IGV según fuentes). |
| Yape / Plin | Desde su app, por QR o número | Inmediato, automático si la pasarela lo integra; si no, manual | Muy usado. Culqi e Izipay lo mencionan; hay que verificar la integración real. |
| PagoEfectivo (CIP) | Código que paga en agente, banco o app | Asíncrono (horas, a veces hasta 48 h) | Llega a quien no usa tarjeta. Tiene vencimiento. |
| Transferencia / Yape manual con comprobante | Paga a tu cuenta y sube la captura | Manual: lo aprueba el staff | Sin pasarela ni comisión; **más trabajo y más riesgo de fraude**. Buena para empezar. |
| PayPal u otros internacionales | Cuenta propia | Automático | Opcional, para jugadores fuera de Perú. |

## 3. Qué se sabe de los proveedores (verificar siempre en su documentación oficial)
- **Culqi:** según comparativas, un solo contrato habilita tarjetas, Yape, PagoEfectivo y Cuotéalo; comisión citada entre 3,49 % y 3,99 % (+ S/ 0,60 en una fuente); primera acreditación a los 7 días y luego 2–3 días. Documentación: docs.culqi.com.
- **Mercado Pago (Perú):** sus webhooks de Checkout Pro están documentados: POST HTTPS en JSON, evento «Pagos», estados pendiente/rechazado/aprobado, **firma en el encabezado `x-signature` (`ts` y `v1`, HMAC) que se compara con la clave secreta de la aplicación**. No pude confirmar la lista de métodos de pago ni Yape.
- **Niubiz e Izipay:** tarjetas; comisiones citadas ≈3,3–4,5 % + IGV; liquidación en 24–48 h. Izipay dice integrar Yape. No encontré su documentación técnica de webhooks.
- **PagoEfectivo:** API directa con credenciales (Service ID, Access Key, Secret Key), pero una fuente indica que exige desarrollo a medida.
- **Stripe:** no lo recomiendo hasta confirmar que atiende comercios peruanos.

Fuentes consultadas (secundarias, de comparación): [kom.pe – pasarelas 2026](https://kom.pe/pasarelas-pago-tienda-virtual-peru-2026/), [kom.pe – comparativa](https://kom.pe/pasarelas-pago-tiendas-online-peru-comparativa/), [guiadesoftware – panorama](https://www.guiadesoftware.com/blog/mejor-pasarela-pago-peru), [kom.pe – Izipay vs Niubiz vs Culqi](https://kom.pe/izipay-vs-niubiz-vs-culqi/), [Mercado Pago – notificaciones](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/payment-notifications).

**Efecto en el negocio:** con una comisión de ~4 % más un fijo de S/ 0,30–0,60, el paquete de S/ 5 pierde entre 10 % y 16 %. Conviene un paquete mínimo de S/ 10 o repartir la comisión en el precio.

## 4. Arquitectura: un adaptador por proveedor, una sola lógica de gemas
```
Jugador ─► Web (tienda · «Comprar gemas») ─► crear_orden(paquete, método)  [servidor fija el monto]
                                                │
                            ┌───────────────────┼────────────────────────────┐
                    Pasarela (tarjeta/Yape)   PagoEfectivo (CIP)      Manual (Yape/transferencia)
                    crear cobro → redirige    genera CIP con venc.    muestra datos → sube comprobante
                            │                   │                            │
                     webhook firmado ──► Edge Function «pago-webhook» (adaptadores)     Staff aprueba/rechaza
                                                │                            │
                                      procesar_pago_evento  ◄────────────────┘
                                                │  (idempotente, una sola lógica)
                                       libro de movimientos → gemas
```
- Cada proveedor es un archivo (`culqi.ts`, `mercadopago.ts`, `pagoefectivo.ts`, `manual`) con dos funciones: `crearCobro(orden)` e `interpretar(webhook)`, que devuelve el mismo evento neutro (`pagado`, `fallido`, `reembolsado`, `disputado`, `disputa_ganada`).
- El **monto lo fija siempre el servidor** a partir del paquete; el navegador nunca manda precios.
- **Gemas solo se acreditan en `procesar_pago_evento`**, y esa función ya es idempotente por orden y referencia del proveedor.

## 5. Modelo de datos nuevo (migración 109, sin crear todavía)
- `pagos_metodos`: clave, nombre, tipo (`pasarela`/`efectivo`/`manual`), proveedor, activo, orden en pantalla, mínimo y máximo, comisión %, comisión fija, instrucciones.
- `ordenes_pago` (añadir): `metodo`, `expira_at`, `checkout_url`, `cip`, `intentos`; índice único (`proveedor`, `proveedor_ref`).
- `pagos_manuales`: orden, referencia de la operación (**única**), ruta del comprobante en un bucket **privado**, estado (`pendiente`/`aprobado`/`rechazado`), revisor, nota, fechas.
- `pagos_eventos`: registro inmutable de cada aviso recibido (cuerpo, firma válida o no, resultado). Idempotencia por (`proveedor`, id del evento).
- `conciliaciones`: una fila por día y proveedor: total cobrado según el proveedor vs. suma de órdenes pagadas; diferencia y estado.

## 6. Flujos
**Pasarela (tarjeta / Yape):** el jugador elige método y paquete → acepta términos (+18) → se crea la orden `PENDIENTE` → el servidor crea el cobro y devuelve la dirección de pago → paga → el proveedor avisa al webhook → se verifica la firma → `procesar_pago_evento('pagado')` → gemas. Si no llega el aviso, una tarea periódica consulta el estado al proveedor (red de seguridad).
**PagoEfectivo:** se genera un CIP con vencimiento (p. ej. 24–48 h); la orden queda `PENDIENTE`; al pagar llega el aviso; si vence, pasa a `EXPIRADA` sin acreditar nada.
**Manual (Yape/Plin/transferencia):** el jugador ve los datos de pago y el monto exacto → paga → sube captura y el **código de operación** → entra a la cola del staff → el staff comprueba en su app que el dinero llegó y aprueba → gemas. Reglas: monto exacto, código de operación único (rechaza repetidos), plazo de 24 h, tope por persona y día, y una segunda aprobación por encima de cierto monto.

## 7. Gestión (panel «Recargas» para el admin)
Cola de pagos manuales; activar o desactivar cada método y cada paquete; límites (mínimo, máximo, tope diario por persona); reembolsos y disputas; conciliación diaria con alertas de diferencia; métricas (intentos, conversión, fallos por método, comisiones pagadas, ingreso neto); y registro de auditoría de cada acción del staff.

## 8. Seguridad
Firma HMAC en cada webhook; secretos solo en Supabase Secrets; la Edge Function sin JWT pero con firma obligatoria; **nunca** guardar datos de tarjeta (lo hace la pasarela); límites de velocidad; comprobantes en bucket privado con URL temporal; registro de todos los avisos; reembolso que descuenta las gemas y bloquea compras si el saldo queda negativo (ya existe); verificación de mayoría de edad (ya existe).

## 9. Lo legal y fiscal (a revisar con un contador y un abogado en Perú)
Vender gemas con dinero real suele requerir **RUC y comprobante de pago electrónico** (boleta o factura), con IGV; política de reembolsos y términos visibles; libro de reclamaciones; reglas de protección al consumidor y de menores; y las condiciones de cada pasarela sobre bienes virtuales. Un facturador electrónico con API (por ejemplo, Nubefact u otro autorizado por SUNAT) puede emitir el comprobante automáticamente al acreditar el pago.

## 10. Fases de implementación
| Fase | Qué se hace | Salida |
|---|---|---|
| R0 | Elegir proveedor y reunir requisitos (RUC o alternativa, cuenta bancaria, cuenta sandbox) | Proveedor elegido y credenciales de prueba |
| R1 | **Pago manual** Yape/Plin/transferencia: tablas, comprobantes, cola del staff, panel | Primer método real, sin pasarela |
| R2 | Pasarela de tarjeta (+ Yape si la incluye): adaptador, webhook, pruebas en sandbox (pagado, fallido, reembolso, disputa, duplicado, tardío) | Compras automáticas |
| R3 | PagoEfectivo con vencimiento | Pago en efectivo |
| R4 | Conciliación diaria, métricas, comprobantes electrónicos | Operación controlada |
| R5 | PayPal u otros, si hace falta | Jugadores fuera de Perú |

**Recomendación:** R1 primero (rápido, sin comisión y sin depender de nadie), mientras se tramita la pasarela; luego R2 con **Culqi o Mercado Pago**, decidiendo con una prueba en sandbox y las tarifas oficiales.

## 11. Lo que necesito de Fralex
1. ¿Vendes como persona o con RUC? (cambia qué pasarelas te aceptan y los comprobantes).
2. ¿Aceptas empezar con el pago manual por Yape/Plin?
3. Elegir pasarela o aprobar la comparación en sandbox.
4. Datos de cobro (número o QR de Yape/Plin, cuenta) que se mostrarán a los jugadores.
5. Paquete mínimo (recomendado: S/ 10).

## Estado (2026-10-16)
- **R1 (base de datos) HECHA:** migración 109 aplicada y probada (15 pruebas). Los métodos `manual_yape`, `manual_plin` y `manual_transferencia` existen pero están inactivos; el admin los activa con `admin_guardar_metodo` (poniendo el número de Yape/Plin o la cuenta en `datos`). Pendiente: interfaz del jugador y del admin, y programar `expirar_ordenes_pendientes()` con pg_cron.
- La sección 5 de este documento describe el modelo; lo implementado en 109 cubre `pagos_metodos`, `pagos_manuales` y las columnas nuevas de `ordenes_pago`. `pagos_eventos` y `conciliaciones` quedan para R2/R4.

- **2026-10-16 · Interfaz hecha:** el jugador compra desde la pestaña «Comprar gemas» y el administrador revisa en Administrar › Pagos por revisar. Para abrir el método: Administrar › Métodos de pago → poner el número de Yape, marcar «Activo» y activar «Compras con dinero real». Mientras no lo actives, todo sigue cerrado.

- **2026-10-16 · R2 (Mercado Pago) HECHA en migración 122:** adaptador, webhook firmado, `pagos_eventos`, `pagos_conciliaciones` y conciliación listos y desplegados, apagados hasta que Fralex ponga los secretos. Ver `docs/GUIA-PASARELA.md` y `docs/ECONOMIA-FASE-D.md`. Culqi/PagoEfectivo siguen sin hacer.
