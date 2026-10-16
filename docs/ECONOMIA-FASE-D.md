# Economía · Fase D · Pasarela de pago (Mercado Pago) — informe

> 16-oct-2026 · hilo `economia-fase-d` · migración **122** (aplicada y probada). Guía para Fralex: `docs/GUIA-PASARELA.md`. **`pagos_activos` sigue en `false`; el método nuevo está inactivo.**

## Resumen (SÍ / NO)
- ¿Hecho y desplegado? **SÍ**: migración 122, Edge Functions `pago-webhook`, `pago-crear`, `pago-conciliar` (publicadas), pruebas y guía.
- ¿Se puede cobrar dinero real ya? **NO**: faltan los 3 secretos (los pone Fralex en Supabase), activar el método y `pagos_activos`. Sin secretos las funciones responden 503.
- ¿Se tocó el flujo manual? **NO** (`crear_orden_metodo`, `enviar_comprobante_manual`, `admin_resolver_pago_manual` intactos). Solo se añadió una rama en la web para métodos de tipo `pasarela`.

## Qué se verificó en la documentación oficial de Mercado Pago (16-oct-2026)
- **Aviso (webhook):** POST HTTPS JSON. Cabeceras `x-signature` (`ts=…,v1=…`) y `x-request-id`; parámetro de URL `data.id`; cuerpo con `action`, `api_version`, `data.id`, `date_created`, `id`, `live_mode`, `type`, `user_id`. Fuente: [Configurar notificaciones](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/payment-notifications).
- **Firma:** plantilla `id:[data.id];request-id:[x-request-id];ts:[ts];` (el id alfanumérico en minúsculas; lo que falte se quita), HMAC-SHA256 en hexadecimal con la clave secreta de la aplicación, comparado con `v1`. Plantilla confirmada en búsqueda sobre la documentación oficial (la página no devuelve ese bloque en texto plano al descargarla); el ejemplo de la documentación encaja con `construirManifiesto` (prueba incluida).
- **Respuesta/reintentos:** hay que responder 200 o 201 en 22 s; reintentos a 0, 15 min, 30 min, 6 h, 48 h y tres veces cada 96 h.
- **Crear preferencia:** `POST https://api.mercadopago.com/checkout/preferences` con `items[{title, quantity, currency_id:"PEN", unit_price}]`, `external_reference`, `notification_url`, `back_urls`, `auto_return`, `expires`/`expiration_date_to`, `statement_descriptor`, `binary_mode`; respuesta con `id`, `init_point`, `sandbox_init_point`. Fuente: [Crear preferencia](https://www.mercadopago.com.pe/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post).
- **Consultar pago:** `GET /v1/payments/{id}` (campos `status`, `transaction_amount`, `transaction_amount_refunded`, `currency_id`, `external_reference`); **buscar:** `GET /v1/payments/search?external_reference=…` (respuesta `{paging, results[]}`).
- **No pude confirmar en la documentación** (y por eso el código es defensivo): la lista completa de valores de `status` (uso `pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back`; cualquier otro se ignora y queda registrado), si los pagos traen el campo `live_mode`, si Perú acepta persona natural sin RUC, las comisiones y el soporte de Yape. 
- ⚠ **Aviso de Mercado Pago:** la API de *Preferencias* está marcada como «legacy»: seguirá funcionando, pero las novedades solo salen en la API de *Orders*. Es una decisión a revisar antes de escalar (migrar solo tocaría `pago-crear`).

## Decisiones de seguridad
1. **El aviso no decide el dinero.** Tras validar la firma, la función consulta el pago a la API oficial con nuestro token y usa SOLO esos datos (estado, monto, moneda, referencia). El cuerpo del aviso no está firmado (la firma cubre id, request-id y ts), por eso no se confía en él.
2. **Firma obligatoria**, comparación en tiempo constante. Sin firma válida: 401 y se registra en `pagos_eventos` (`firma_invalida`). No se rechazan avisos «viejos» (los reintentos llegan hasta 96 h después); la protección contra repetición es la idempotencia.
3. **Idempotencia**: clave `mercadopago:<pago>:<estado>` única en `pagos_eventos`; `procesar_pago_evento` ya es idempotente por orden. Un aviso repetido queda registrado como `duplicado` y no acredita otra vez.
4. **Registro de todos los avisos** (`pagos_eventos`, solo lectura por trigger, RLS cerrada, sin acceso para `anon`/`authenticated`). No guarda cuerpo, firma ni token; solo ids, estado, monto y resultado. No se guardan datos de tarjeta (jamás pasan por nosotros).
5. **Límite de velocidad**: más de 120 avisos por minuto → 429 y no se procesa; el registro de firmas inválidas también se frena.
6. **Modo**: `pasarela_modo` (`prueba` por defecto). En `prueba` solo valen avisos `live_mode=false`; en `produccion`, solo `true`. Un aviso de pruebas jamás acredita en producción (y al revés).
7. **Monto distinto / orden vencida / orden de otro método** → no acredita y deja alerta **crítica** (dinero recibido sin gemas: se reembolsa en Mercado Pago). Orden desconocida con pago aprobado → alerta alta. Reembolso parcial → alerta alta, sin tocar gemas. Reembolso o disputa completos → `procesar_pago_evento` descuenta gemas (y el bono de primera compra); alerta media informativa.
8. **Puente solo servidor**: las funciones `pasarela_*` exigen `service_role` (revocadas a `public`, `anon`, `authenticated`; además comprueban el rol dentro). `SECURITY DEFINER` con `search_path` vacío.
9. **`pago-crear`** exige sesión (JWT) y solo acepta el id de una orden **propia**; monto, moneda y título salen de la base; la vigencia de la preferencia = vigencia de la orden (60 min); guarda solo enlaces de dominios de Mercado Pago.
10. **Secretos**: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PAGO_CRON_SECRET` solo en Supabase Secrets. El código no los imprime ni los registra.

## Qué se creó
- `supabase/migrations/122_economia_fase_d_pasarela.sql` (aplicada; más un ajuste de vigencia aplicado como `economia_fase_d_pasarela_ajuste_vigencia`, ya incluido en el archivo). Contiene: método `mercadopago` (tipo `pasarela`, **inactivo**, mínimo S/ 10), configuración `pasarela_modo` y `pasarela_vence_minutos`, tablas `pagos_eventos` y `pagos_conciliaciones`, funciones `pasarela_rechazo`, `pasarela_procesar`, `pasarela_orden_para_cobro`, `pasarela_guardar_checkout`, `pasarela_ordenes_dia`, `pasarela_pendientes_antiguas`, `pasarela_conciliar`.
- `supabase/functions/_shared/mp.mjs` (firma, estados, preferencia) y `proceso.mjs` (API de Mercado Pago + entrega a la base).
- `supabase/functions/pago-webhook` (reemplaza el esqueleto), `pago-crear`, `pago-conciliar` — **desplegadas** (webhook y conciliar con `verify_jwt=false`; crear con `verify_jwt=true`).
- Web: `api.js` (`enlacePasarela`) y `recargas.js` (si el método es `pasarela`, tras crear la orden redirige a la página de pago; texto del método). Nada más.
- Pruebas: `tests/pasarelaMercadoPago.test.mjs` (13) y `supabase/tests/122_fase_d_test.sql`.

## Pruebas hechas
- **Node (13/13 OK):** manifiesto oficial, firma correcta, firma incorrecta (clave, id, request-id, ts, formato, sin clave), estados, montos, preferencia, entrega a la base con cliente simulado.
- **SQL en la base real (transacción deshecha, `TODO_OK_REVERTIDO`):** método inactivo y pagos apagados; permisos cerrados; firma inválida registrada; pago acreditado; **duplicado** sin gemas dobles; **monto distinto** (no acredita, alerta crítica); **reembolso** (gemas a cero, orden REEMBOLSADA); **orden desconocida**, texto que no es uuid y orden de otro método; modo equivocado; estado pendiente ignorado; reembolso parcial; orden vencida; registro inmutable; cobro de orden manual rechazado; enlace ajeno rechazado; conciliación con diferencia → alerta. Después se comprobó que no quedó ningún dato de prueba.
- **Desplegado:** `pago-webhook` responde 503 sin secretos y 405 a GET (arranca bien, imports resueltos).
- **No probado** (requiere cuenta real de Mercado Pago): el viaje completo con tarjeta de prueba. Se hace con la guía, paso 5. La firma real de Mercado Pago solo se pudo contrastar con el formato oficial, no con su clave.

## Pendiente / siguientes pasos
1. Fralex: crear cuenta y aplicación, poner los 3 secretos y probar (docs/GUIA-PASARELA.md).
2. Programar `pago-conciliar` una vez al día (hoy se lanza a mano).
3. Mensaje en la tienda al volver de Mercado Pago (`?pago=ok|pendiente|error` ya llega en la URL; solo falta mostrarlo).
4. Decidir si migrar a la API de Orders; comprobantes electrónicos y asuntos fiscales (ver `DISENO-RECARGAS.md` §9).
5. Pendiente copiar a Drive (no hay Drive por ahora).
