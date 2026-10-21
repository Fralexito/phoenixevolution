# Web Phoenix Evolution · Comunidad: chat general y ayuda con IA

El chat general compartido con Phoenix Link y el plan de la ayuda con IA de la web. El contrato de los sonidos del chat queda aparte (`CONTRATO-SONIDOS-CHAT.md`), porque el código lo cita.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 2 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Chat general — guía (ronda 217)](#parte-1-chat-general-guia-ronda-217) — origen `docs/comunidad/CHAT-GENERAL.md` (01e6efc 2026-10-18)
- [Parte 2 · Plan · La IA trabajando dentro de la web (ronda 345 · 16-oct-2026)](#parte-2-plan-la-ia-trabajando-dentro-de-la-web-ronda-345-16-oct-2026) — origen `docs/comunidad/PLAN-IA-WEB.md` (01e6efc 2026-10-18)

---

## Parte 1 · Chat general — guía (ronda 217)

> Origen: `docs/comunidad/CHAT-GENERAL.md` · último cambio 01e6efc 2026-10-18 · 1576 bytes. Copia íntegra.

**Qué es:** un solo chat para toda la comunidad. Se ve en la web (`/chat-general/`) y dentro del juego con Phoenix Link. Lo de sala (Smash Soda) sigue aparte y local.

**Cómo está hecho:** reutiliza la tabla vieja `mensajes_chat` (estaba vacía y cerrada). Nadie escribe directo: la web llama a `chat_global_enviar` y Link, por la API, a `chat_api_enviar`. Las dos pasan por las mismas reglas (`private.chat_poner`).

**Reglas:** 1–300 caracteres · espera anti-spam entre mensajes (el admin la ajusta en la página, de 0 a 60 s; por defecto 3 s) (200 por hora, staff sin tope) · cuentas sancionadas no escriben · menores de 13 no escriben · menores de 18 y mayores se ven entre sí por separado (el staff ve todo).

**Borrar:** un moderador/admin pulsa el tacho. La fila queda con `borrado = true` y el texto vacío; el original se guarda en la auditoría del staff. Link recibe los `id` en `borrados` y lo quita.

**Pendiente de aviso:** no existe filtro de groserías (ni en la web antes de esto). Si quieres uno, se agrega en el servidor y vale para web y Link.

**API:** `docs/web-pes-link/contrato-v1.md` §27. **Estado:** BD lista y probada; la Edge Function está en el repo pero NO desplegada (PENDIENTE-DEPLOY; se despliega junto con las rutas de Phoenix Sync).


**Ajuste anti-spam (ronda 219):** tabla `chat_ajustes` (una fila, `espera_seg`). Solo el admin la cambia (botón «Ajustes del chat» en /chat-general/, RPC `chat_global_ajustar`; queda en auditoría). Vale para web y Link. 0 = sin espera.

---

## Parte 2 · Plan · La IA trabajando dentro de la web (ronda 345 · 16-oct-2026)

> Origen: `docs/comunidad/PLAN-IA-WEB.md` · último cambio 01e6efc 2026-10-18 · 5411 bytes. Copia íntegra.

Pedido de FRALEX: «que la IA haga las noticias de manera creativa y pícara, actualice los fichajes, haya un chat de ayuda con IA, que gestione la web y solo me dé el resumen o consultas rápidas de aprobación… con la respectiva seguridad y precaución».

### Idea central
La IA **prepara**, FRALEX (o un moderador) **aprueba**. Nada importante se publica ni se cambia sin un ✅ humano.

| Lo que hace la IA | ¿Sola? |
|---|---|
| Revisar datos, detectar errores, escribir borradores, preparar el resumen del día | Sí |
| Publicar noticias, avisos importantes | **No: pasa por la bandeja** |
| Dinero/gemas, castigos o baneos, borrar cosas | **Nunca** (ni siquiera los propone para aplicar solos) |

### Parte 1 · Bandeja de aprobación + resumen diario
- Tablas nuevas (migración 117): `ia_propuestas` (lo que la IA deja para aprobar) e `ia_resumenes` (un resumen por día).
- Seguridad: con RLS solo el **staff** puede verlas; **nadie** puede escribirlas desde la página (solo la tarea programada, que entra con permisos de servidor). Aprobar o rechazar solo con la función `ia_revisar`, que exige **moderador o admin** y deja anotado quién y cuándo.
- Aprobar una noticia = la publica. Rechazarla = se queda como borrador (no se borra nada).
- Página nueva **«Bandeja IA»** (`/bandeja-ia/`, grupo Staff): arriba el resumen del día; luego las propuestas con ✅ Aprobar / ❌ Rechazar; el historial va plegado.

### Parte 2 · Noticias pícaras + noticias de fichajes
- Se actualiza la tarea programada **«Redacción IA Phoenix»** (todos los días 9:54 a. m., hora de Lima).
- Tono: picardía futbolera (como la prensa deportiva), **nunca** ofensiva ni personal: los jugadores son personas reales; nada de frases inventadas, nada sobre su vida, su físico, su origen o su familia.
- Nuevo: lee los fichajes del día (`lm_movimientos`) y escribe la noticia («¡BOMBAZO!…»), solo con datos reales.
- Todo lo que escribe queda como borrador **y** como propuesta en la bandeja.
- Al final escribe el **resumen del día** (qué pasó en la liga, qué hay pendiente, alertas).

### Parte 3 · Chat de ayuda con IA
- Función en Supabase (`ayuda-ia`) que habla con la API de Claude. La **clave secreta** la guarda FRALEX en los secretos de Supabase (`ANTHROPIC_API_KEY`); **nunca** va en la página, en GitHub ni en el chat.
- **Sin poderes**: solo responde dudas (inscripción, parche, reglas, cómo usar la web). No toca la base, no da gemas, no cambia nada. Si alguien intenta engañarlo («soy admin…»), no puede hacer nada porque no tiene herramientas.
- **Límites para cuidar el dinero**: solo usuarios con sesión, máximo 15 preguntas por persona al día y 300 en total por día; respuestas cortas; modelo económico.
- Si la clave no está puesta, el chat dice amablemente «todavía no está activo» (no se rompe nada).
- Página **«Ayuda IA»** (`/ayuda-ia/`), detrás de la bandera `FX.ayudaIA`.

### Lo que FRALEX tiene que hacer a mano
1. Pegar el SQL de la migración 117 (si la herramienta no deja aplicarla).
2. Para el chat: crear una clave en console.anthropic.com y guardarla en Supabase → Edge Functions → Secrets como `ANTHROPIC_API_KEY`. Nunca mandarla por chat.

### Riesgos y cómo se cuidan
| Riesgo | Cuidado |
|---|---|
| La IA publica algo feo | No puede publicar: todo pasa por la bandeja |
| Bromas que ofenden | Reglas estrictas en el encargo + aprobación humana |
| Gasto descontrolado del chat | Límite por persona y por día, respuestas cortas |
| Alguien engaña al chat | El chat no tiene ningún poder |
| Fuga de la clave | Solo vive en los secretos de Supabase |

### Estado al terminar (16-oct-2026)
- Hecho y subido a `borrador`: página `/bandeja-ia/`, página `/ayuda-ia/`, migraciones 116-118, tarea programada actualizada (v2), función `ayuda-ia` **desplegada** (versión 2).
- Revisión de seguridad independiente: sin fallas altas ni medias. Arreglados 2 detalles bajos (permisos sobrantes en 117; un ajuste mal escrito ya no apaga el chat). Aceptados a propósito: el chat confía en el historial que manda la página (sin herramientas, el peor caso es una respuesta fuera de tema); varias cuentas pueden gastar el tope diario común (el tope protege el dinero).

### Cómo activarlo (FRALEX)
1. **SQL:** Supabase → SQL Editor → pegar el bloque de las migraciones 116 + 117 + 118 (sin comentarios) → Run. Comprobar: `select to_regclass('public.ia_propuestas'), to_regclass('public.ia_chat_uso');` debe devolver los dos nombres.
2. **Bandeja:** desde el día siguiente a las 9:54 a. m. aparece el resumen y las propuestas en Staff → Bandeja IA.
3. **Chat (opcional, cuesta dinero):** crear una clave en console.anthropic.com (con un límite de gasto mensual en Billing) → Supabase → Edge Functions → Secrets → `ANTHROPIC_API_KEY`. Opcionales: `IA_MAX_USUARIO` (15), `IA_MAX_TOTAL` (300), `IA_MODELO`. Nunca pegar la clave en un chat ni en GitHub.
4. Para apagar el chat: `FX.ayudaIA = false` en `src/data/experimento.js` o borrar el secreto.

### Recordatorio
- Fralex pidió que se le recuerde el paso 3 (clave del chat) más adelante: tarea programada `trig_01U25BkMjL7LVdWejUJhYgSg` para el lunes 19-oct-2026, 10:00 a. m. (Lima). Si otra sesión retoma esto, también puede recordárselo.

---
