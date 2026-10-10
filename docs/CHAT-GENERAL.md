# Chat general — guía (ronda 217)

**Qué es:** un solo chat para toda la comunidad. Se ve en la web (`/chat-general/`) y dentro del juego con Phoenix Link. Lo de sala (Smash Soda) sigue aparte y local.

**Cómo está hecho:** reutiliza la tabla vieja `mensajes_chat` (estaba vacía y cerrada). Nadie escribe directo: la web llama a `chat_global_enviar` y Link, por la API, a `chat_api_enviar`. Las dos pasan por las mismas reglas (`private.chat_poner`).

**Reglas:** 1–300 caracteres · 1 mensaje por segundo (200 por hora, staff sin tope) · cuentas sancionadas no escriben · menores de 13 no escriben · menores de 18 y mayores se ven entre sí por separado (el staff ve todo).

**Borrar:** un moderador/admin pulsa el tacho. La fila queda con `borrado = true` y el texto vacío; el original se guarda en la auditoría del staff. Link recibe los `id` en `borrados` y lo quita.

**Pendiente de aviso:** no existe filtro de groserías (ni en la web antes de esto). Si quieres uno, se agrega en el servidor y vale para web y Link.

**API:** `docs/contrato-v1.md` §27. **Estado:** BD lista y probada; la Edge Function está en el repo pero NO desplegada (PENDIENTE-DEPLOY; se despliega junto con las rutas de Phoenix Sync).
