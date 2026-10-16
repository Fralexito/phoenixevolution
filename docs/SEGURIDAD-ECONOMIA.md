# Seguridad de la economía (gemas con dinero real)

Migraciones 111 (integridad), 112 (controles de riesgo) y 113 (vigilancia). Los pagos siguen **apagados** (`pagos_activos = false`) hasta cumplir la lista de abajo.

## Qué se protege y cómo

| Amenaza | Control |
|---|---|
| Alguien reescribe el historial de movimientos | El libro es de solo lectura (trigger; solo se corrige con un movimiento nuevo). Excepción: borrado en cascada al eliminar la cuenta. |
| Cambiar monto, dueño o estado de una orden pagada | Trigger con máquina de estados; las órdenes no se borran. |
| Aprobar dos veces / duplicar gemas | Claves de idempotencia en el libro (`pago:<orden>`). |
| Mismo comprobante o código usado dos veces | Código de operación único y huella (eTag) única de la captura. |
| Capturas falsas / ajenas | Captura obligatoria en bucket privado, nombre de quien pagó, banderas de riesgo en la cola. |
| Error del admin al aprobar un monto grande | Desde S/ 100 hay que escribir los soles recibidos y deben coincidir. |
| Cuentas nuevas o abusivas | Cuenta nueva ≤ S/ 30 por orden 7 días; ≤ 3 pendientes; ≥ 3 rechazos/semana bloquea; límite diario por persona (S/ 200) y global (S/ 2000); perfil completo; solo mayores de 18. |
| Admin comprometido | `admin_seguro` (MFA opcional vía `admin_exige_mfa`), auditoría de cada decisión, bitácora de cambios de configuración. |
| Fallos silenciosos | Vigilancia cada 10 min: libro vs billeteras, orden pagada sin gemas, gemas sin orden, ajustes de gemas, ganancias raras, pagos sin revisar. |
| Incidente en marcha | **Freno de emergencia**: ante una alerta crítica los pagos se apagan solos; no se pueden reactivar con alertas críticas abiertas. |

## Runbook
1. Entra en Tienda → Administrar → «Vigilancia del dinero». Lee la alerta.
2. Si es crítica: no actives pagos. Pulsa «Revisar ahora» y «Revisar que las cuentas cuadran» y busca el origen en `movimientos_tokens` y `ordenes_pago`.
3. Corrige solo con movimientos nuevos (reembolso o ajuste), nunca editando el pasado.
4. Resuelve la alerta con una nota de lo que comprobaste (queda en la auditoría).

## Lista antes de activar pagos reales
- [ ] Activar MFA en la cuenta de administrador y poner `admin_exige_mfa = true`.
- [ ] Activar «Leaked password protection» y MFA en Supabase Auth.
- [ ] Repos públicos de Link/overlay en privado (acción de Fralex).
- [ ] Datos reales de Yape/Plin/banco cargados en el panel (nunca en el código).
- [ ] Términos de compra revisados por un abogado; decidir RUC/comprobantes con un contador.
- [ ] Probar un pago pequeño real de principio a fin con el administrador.
- [ ] Cero alertas críticas abiertas; auditoría con 0 diferencias.

## Pruebas
Las pruebas de las migraciones 111–113 se ejecutaron en transacciones deshechas contra la base real (resultado: todas correctas). La suite de interfaz es `node --test tests/*.test.mjs`.
