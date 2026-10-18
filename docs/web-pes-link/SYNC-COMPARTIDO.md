# Phoenix Sync compartido — guía (ronda 216)

**Qué es:** dos o más PCs comparten sus fichajes. La web es el buzón: guarda cada fichaje (no el archivo entero) y qué PC lo aplicó.

**Camino de un fichaje:** PC que ficha → Phoenix Sync publica (`POST /v1/sync/operaciones`) → las otras PCs lo bajan (`GET /v1/sync/operaciones?desde=`) → lo aplican con respaldo → informan (`POST …/aplicada`) → Phoenix Link avisa en el juego (Buzón).

**Interruptor (solo admin del grupo):** `automatico` = se aplica solo; `autorizacion` = cada PC pulsa Aplicar. Un grupo nuevo nace en `autorizacion`. Si un cliente no puede leerlo, asume `autorizacion`. Cada cambio queda en `sync_config_historial` (quién, cuándo, de → a). Se cambia desde `/phoenix-sync/` o con `PUT /v1/sync/config`.

**Cómo empezar (FRALEX):** 1) entra a `/phoenix-sync/` con tu cuenta admin del sitio → «Crear grupo» (quedas como admin del grupo). 2) añade a tu amigo por su usuario de la web. 3) deja el modo en «Con autorización» o pásalo a «Automático» para pruebas. 4) cada PC necesita su token `phx_…` (emparejar con código desde la web).

**Tablas (RLS activa, solo lectura desde el navegador; se escribe por RPC):** `sync_grupos`, `sync_miembros`, `sync_config`, `sync_config_historial`, `sync_operaciones`, `sync_aplicaciones`, `sync_option_versiones` + bucket privado `sync-option`.

**Límites (plan FREE):** 60 operaciones/hora por usuario, 6 archivos/hora, 8 MB por archivo, 3 versiones guardadas, 1 llamada cada 5 s por ruta.

**Nota para el emparejado:** emparejar una PC (`/v1/emparejar`) todavía exige que la cuenta esté aprobada como host. Si el amigo no es host aprobado, el staff debe aprobarlo en la web para que pueda vincular su PC.

**Estado:** BD lista y probada. La Edge Function con las rutas `/v1/sync/*` está en el repo pero **no desplegada** (PENDIENTE-DEPLOY).
