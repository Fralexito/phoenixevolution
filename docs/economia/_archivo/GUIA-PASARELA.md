# Guía simple: cobrar con Mercado Pago (tarjeta, Yape y más)

> Para Fralex. Fecha: 16-oct-2026. **Todo esto está construido pero APAGADO**: nadie puede pagar con Mercado Pago hasta que tú lo enciendas. El Yape manual sigue igual.
> Nunca pegues una clave en el chat, en GitHub ni en un archivo del proyecto. Las claves se escriben **solo** en Supabase (paso 4).

## Qué hace por ti (en una frase)
El jugador elige «Tarjeta, Yape y más», paga en la página de Mercado Pago, Mercado Pago avisa a tu servidor con una firma secreta, el servidor comprueba que el monto es el correcto y **las gemas llegan solas**. Si algo no cuadra, no da gemas y te sale una alerta roja en «Vigilancia del dinero».

## Lo que necesitas hacer tú (6 pasos)

### 1. Crear tu cuenta de Mercado Pago
1. Entra a https://www.mercadopago.com.pe y crea una cuenta con tu correo y tu DNI. Verifica tu identidad cuando te lo pida.
2. Ten a mano tu cuenta bancaria o la de Yape donde quieres recibir el dinero.
3. **No pude comprobar** si Mercado Pago Perú te pide RUC para cobrar como persona natural, ni la comisión exacta. Míralo en tu cuenta (Tarifas) antes de abrir al público. Sin RUC, pregunta a Mercado Pago o a un contador qué comprobante corresponde.

### 2. Crear la «aplicación» y sacar las credenciales de PRUEBA
1. Entra a https://www.mercadopago.com.pe/developers/panel/app → **Crear aplicación**.
2. Nombre: `Phoenix Evolution`. Tipo de solución: **Pagos online** → producto **Checkout Pro**.
3. Dentro de la aplicación: **Credenciales de prueba** → copia el **Access Token de prueba** (empieza con `APP_USR-`). Déjalo en el portapapeles, lo usas en el paso 4.
4. En el mismo panel crea dos **cuentas de prueba** (una vendedora y una compradora) en «Cuentas de prueba». Con la compradora vas a «pagar» sin gastar dinero.

### 3. Decirle a Mercado Pago a dónde avisar (el webhook)
1. En tu aplicación: **Webhooks → Configurar notificaciones**.
2. Pestaña **Modo de pruebas**. En la URL pega exactamente:

   `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/pago-webhook`
3. Marca el evento **Pagos** y pulsa **Guardar configuración**.
4. Aparece una **clave secreta** (botón «Revelar»). Cópiala: es la que usas en el paso 4. Esa clave es la que impide que alguien falso nos avise de un pago.
5. Botón **Simular notificación**: envía una de prueba. Debe decir que se envió bien (el servidor responde 200 porque el pago de ejemplo no existe y lo anota como ignorado).

### 4. Guardar los secretos en Supabase
1. Entra a https://supabase.com/dashboard/project/fiibiyijojkxqlsrhcil/functions/secrets (Edge Functions → Secrets).
2. Crea estos tres secretos (nombre → valor):

| Nombre | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | el Access Token de prueba del paso 2 |
| `MP_WEBHOOK_SECRET` | la clave secreta del paso 3 |
| `PAGO_CRON_SECRET` | una frase larga que inventes tú (para la revisión diaria) |

3. Listo. No hay que volver a desplegar nada: las funciones `pago-webhook`, `pago-crear` y `pago-conciliar` ya están publicadas.

### 5. Probar de punta a punta (modo de pruebas)
1. Estado actual: `pasarela_modo = prueba` (solo acepta avisos de pruebas; un aviso real no puede acreditar nada). Compruébalo en el SQL Editor:
   ```sql
   select clave, valor from public.economia_config where clave in ('pasarela_modo', 'pagos_activos');
   ```
2. Enciende el método: web → Tienda → **Administrar → Métodos de pago** → «Tarjeta, Yape y más (Mercado Pago)» → **Activo**. (Mínimo S/ 10: el paquete de S/ 5 no la usa.)
3. Para poder crear órdenes hace falta «Compras con dinero real» encendido (`pagos_activos`). **Ojo:** al encenderlo, también queda abierto el Yape manual si ya lo tienes activo. Haz la prueba cuando estés tú solo.
4. Entra a la web con tu cuenta, **Comprar gemas** → elige un paquete de S/ 10 o más → método Mercado Pago → **Continuar**. Te lleva a la página de pago.
5. Paga con la **cuenta compradora de prueba** y una **tarjeta de prueba** (la lista oficial está en el panel de desarrolladores de Mercado Pago, sección «Tarjetas de prueba»; no copio números aquí para no equivocarme).
6. Vuelve a la web: en pocos segundos debes tener las gemas (y el bono de primera compra si es tu primera). Verifícalo en el SQL Editor:
   ```sql
   select id, proveedor, pago_ref, estado_proveedor, evento, resultado, monto_centimos, created_at
   from public.pagos_eventos order by id desc limit 10;
   ```
   Debe verse `resultado = acreditada`.
7. Prueba de reembolso: en tu panel de Mercado Pago devuelve ese pago de prueba. En unos segundos debe aparecer `revertida` y las gemas se descuentan.
8. Al terminar apaga lo que no quieras abierto: método Mercado Pago **Inactivo** (y `pagos_activos` como lo tenías).

### 6. Pasar a dinero real (más adelante, cuando tú decidas)
1. En el panel de Mercado Pago: **Credenciales de producción** → cambia en Supabase el secreto `MP_ACCESS_TOKEN` por el de producción.
2. Webhooks → pestaña **Modo producción** → misma URL del paso 3 → guarda → cambia `MP_WEBHOOK_SECRET` por la clave nueva.
3. Cambia el modo (esto hace que solo se acepten avisos reales):
   ```sql
   update public.economia_config set valor = 'produccion' where clave = 'pasarela_modo';
   ```
4. Revisa la lista de «Seguridad de la economía» (`docs/economia/SEGURIDAD-ECONOMIA.md`) y haz **un pago real pequeño** contigo mismo antes de abrir.
5. Cada día (o cuando quieras), la **revisión diaria** compara lo que dice Mercado Pago con tus órdenes. Desde PowerShell (pon tu frase en una variable, no en el chat):
   ```powershell
   $env:CRON="tu-frase-larga"; Invoke-RestMethod -Method Post -Uri "https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/pago-conciliar" -Headers @{ "x-cron-secret" = $env:CRON }
   ```
   Si no cuadra, aparece una alerta crítica en «Vigilancia del dinero» y queda una fila en `pagos_conciliaciones`. (Programarlo para que corra solo cada día queda para otra tarea.)

## Qué hacer si pasa algo raro
| Ves | Significa | Qué hacer |
|---|---|---|
| Alerta crítica «pago NO acreditado» | Mercado Pago cobró pero el monto/estado de la orden no coincide | Mira el pago en Mercado Pago. Si no corresponde, **reembólsalo ahí**. No toques gemas a mano. |
| Alerta «orden desconocida» | Llegó un pago sin orden válida | Probablemente una prueba o un error; revisa y reembolsa si es real. |
| Alerta «reembolso parcial» | Devolviste solo una parte | Decide si quitar gemas con un ajuste (queda en el libro). |
| `firma_invalida` repetido en `pagos_eventos` | Alguien intenta enviar avisos falsos | No pasa nada (no acreditan), pero avisa si son muchos. |
| El jugador pagó y no hay gemas | El aviso se retrasó | Espera unos minutos (Mercado Pago reintenta). La revisión diaria también lo rescata. |

## Dónde está cada cosa
- Código: `supabase/functions/pago-webhook`, `pago-crear`, `pago-conciliar` y `supabase/functions/_shared/` (lógica de firma y estados, con pruebas en `tests/pasarelaMercadoPago.test.mjs`).
- Base de datos: migración 122 (`pagos_eventos`, `pagos_conciliaciones`, funciones `pasarela_*`). Informe técnico: `docs/economia/ECONOMIA-FASE-D.md`.
