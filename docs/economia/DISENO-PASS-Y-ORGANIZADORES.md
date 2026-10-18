# Diseño · Phoenix Pass y herramientas para organizadores y creadores (Fase E, migración 123)

Autor: cuenta ECONOMÍA, hilo `economia-fase-e` · 16-oct-2026 · Parte del plan `docs/economia/DISENO-ECONOMIA-COMPLETA.md` (§C y §D).
Reglas que no se tocan: **solo cosmético y comodidad**, nada de ventaja ni azar de pago, **las gemas no se retiran ni se cambian por ascuas**, el libro de movimientos es de solo lectura. Los pagos reales siguen **apagados** (`pagos_activos = false`).

## Respuesta corta (SÍ / NO)
- ¿El pase es una suscripción que cobra sola? **NO.** Se compra **una vez por temporada**, con gemas. Si no lo compras, no pasa nada.
- ¿El pase da ventaja en el juego? **NO.** Solo marcos, fondos, insignias, títulos, ascuas y algunas gemas.
- ¿Se puede jugar sin pagar? **SÍ.** La pista gratis siempre existe.
- ¿Ya está construido? **SÍ** en el código (pestaña «Pase» en la tienda y botón «Hacer premium» en el torneo). La migración 123 está aplicada y probada (ver docs/economia/ECONOMIA-FASE-E.md). Lo de propinas y overlay para TikTok es **solo papel** (abajo).

---

## 1. Phoenix Pass (pase de temporada)

### Cómo funciona (en simple)
1. Hay una **temporada** con fecha de inicio y fin (la primera dura 60 días).
2. Cada vez que juegas y ganas XP, subes de **nivel del pase** (1 nivel cada 100 XP, 30 niveles). La XP que cuenta es solo la ganada **dentro de la temporada**; la XP vieja no cuenta.
3. En cada nivel hay **dos premios**: uno de la **pista gratis** y otro de la **pista premium**.
4. Todos reclaman la pista gratis. La premium se reclama solo si compraste el pase.
5. Si compras el pase a mitad de temporada, **puedes reclamar los premios premium de los niveles que ya alcanzaste** (no pierdes nada por comprar tarde).
6. Al terminar la temporada hay **7 días de gracia** para reclamar lo ya ganado. Después, la temporada se cierra y los premios que no reclamaste se pierden (si otra temporada empieza antes de que acabe la gracia, la gracia se corta ahí: dejar un hueco de fechas entre temporadas). Lo que reclamaste es tuyo para siempre.

### Precio
| Concepto | Valor propuesto | Equivale a |
|---|---|---|
| Pase de temporada | **150 gemas** | ≈ S/ 13,60 (Brasa = 110 gemas por S/ 10) |
| Gemas de regreso (pista premium) | **60 gemas** repartidas en 6 niveles | el pase cuesta neto **90 gemas ≈ S/ 8,20** si llegas al nivel 28 |
| Rango permitido por la regla | S/ 9,90 – S/ 14,90 → entre **110 y 165 gemas** | el administrador puede cambiarlo por temporada |

Por qué las «gemas de regreso»: es una razón honesta para comprar (el pase «se paga solo» si juegas), sin ser azar ni ventaja. **Gemas en la pista gratis: NO**, porque sería una fuente gratuita de gemas (moneda de dinero real).

### Qué trae la primera temporada («Despegue»)
- **Pista gratis:** ascuas en 27 niveles (40, 80 y 120 por tramo de 10 niveles: 2 160 en total) y 3 objetos ya existentes en la tienda (niveles 10, 20 y 30).
- **Pista premium:** 6 objetos **exclusivos del pase** (marco, fondo, insignia, título, color de clan y un marco legendario final), ascuas extra y 60 gemas de regreso.
- Los objetos exclusivos **no se pueden comprar en la tienda**; solo salen del pase (se esconden de la lista y quedan en tu inventario). Los de otras fases (efectos de carta, banners, sonidos de chat) se pueden añadir al pase sin cambiar nada: el premio apunta a «un objeto de la tienda por su clave».

### Lo que NO hace el pase
- No cobra en automático. No hay renovación.
- No vende niveles con dinero («saltar niveles»): sería presión de compra. Decisión de diseño: **no**.
- No da gemas gratis, ni ventajas de juego, ni cupos en torneos.

### Reglas técnicas (para quien revise)
- Comprar el pase = un movimiento de **gemas negativo** en el libro con clave `pase:<usuario>:<temporada>` → imposible cobrar dos veces.
- Cada premio reclamado = un movimiento positivo (ascuas o gemas) con clave `pase:r:<usuario>:<temporada>:<nivel>:<pista>` y una fila en `pase_reclamos` con clave primaria `(usuario, temporada, nivel, pista)` → imposible reclamar dos veces, ni con dos pestañas a la vez.
- El nivel se calcula de la XP real (`xp_movimientos`) dentro de las fechas de la temporada: no existe un contador que alguien pueda editar.
- Reembolso: si el administrador devuelve un pase, lo hace con un movimiento nuevo de «reembolso» (el libro nunca se edita).

---

## 2. Torneo premium (organizadores)

### Qué es
Una **marca «Premium»** que el organizador de un torneo compra **una vez por torneo**. Desbloquea las herramientas de presentación (todas cosméticas / de comodidad):
1. **Overlay de transmisión** (marcador, llaves y cartel de campeón listos para OBS/TikTok): la página `torneo/?id=…&overlay=1` (fase siguiente; la marca ya queda guardada).
2. **Llaves bonitas** (versión de pantalla completa para compartir).
3. **Estadísticas del torneo** (goleadores, racha, partidos jugados).
4. **Página propia** con un enlace corto y distintivo «Premium».

### Precio
- **S/ 20 – S/ 50** según el tamaño. Propuesta inicial: **300 gemas (≈ S/ 27)** para cualquier torneo; si Fralex quiere escalones, 220 / 300 / 550 gemas (≈ S/ 20 / 27 / 50) según cupo. Se cambia en `economia_config` (`torneo_premium_gemas`) sin tocar código.
- Lo paga **el organizador (creador del torneo)** con gemas, en el panel «Opciones del organizador» → botón **«Hacer premium»**.
- Solo mientras el torneo está en inscripción o en curso. No se puede comprar para uno cancelado, terminado u oculto por el staff.
- Una sola vez por torneo (clave del libro `torneoprem:<torneo>`).
- Si el staff cancela u oculta el torneo por incumplir normas, **no hay devolución automática**: el administrador decide y, si corresponde, devuelve con un movimiento de reembolso.

### Qué NO es
Un torneo premium **no** tiene mejores premios ni ventajas de juego; no cambia el formato, las reglas ni quién gana.

---

## 3. Patrocinio de clanes y torneos (solo diseño)
- Un patrocinador paga un **precio acordado** directamente a Fralex (Yape/transferencia/factura), **fuera de la tienda**. No pasa por gemas.
- Se muestra su **logo** en la página del torneo o del clan, con la etiqueta «Patrocinado por».
- Cómo se haría: tabla `patrocinios` (tipo clan/torneo, objetivo, nombre, logo, desde, hasta, nota) que **solo el administrador** edita; lectura pública de los vigentes.
- Riesgos: logos de marcas de alcohol, apuestas o contenido no apto para menores (la liga tiene jugadores jóvenes); derechos del logo; que el patrocinador exija «visibilidad garantizada». Regla propuesta: Fralex aprueba cada logo y el acuerdo se anota por escrito (aunque sea un mensaje).
- Pendiente de decisión (ver §6). **No se construye en esta fase.**

## 4. Propinas a creadores (solo diseño y riesgos) — REQUIERE REVISIÓN LEGAL
Idea: un botón «Apoyar» para que alguien dé gemas o dinero a un creador (streamer, organizador).

**Por qué es delicado:**
1. Las gemas **no se retiran** (regla de oro). Si un creador recibe gemas y las pudiera convertir en dinero, la plataforma pasa a ser un **sistema de pagos/cobro** (licencias, SBS/UIF, impuestos, KYC) y se acerca a una casa de cambio de moneda virtual.
2. Si la propina es solo con ascuas (sin valor de dinero) no hay riesgo legal, pero tampoco motiva al creador.
3. Impuestos: el creador que cobra debe declarar; la plataforma, si cobra comisión, debe emitir comprobante.
4. Fraude: lavado con cuentas propias, propinas con tarjetas robadas (reembolsos y disputas que dejan saldos negativos).
5. Menores: no deben enviar ni recibir dinero.
6. Política de las plataformas (Apple/Google/TikTok) sobre «regalos virtuales» y monedas.

**Opciones, de menos a más riesgo:** (a) propina en **ascuas** entre jugadores (sin dinero; se puede construir cuando Fralex diga); (b) **enlace externo** del creador (Ko-fi, Yape personal) sin pasar por la plataforma: cero riesgo para la liga; (c) gemas que el creador solo **gasta dentro de la tienda** (no se retira): riesgo medio, mejor con abogado; (d) pago al creador en soles: **NO hasta tener abogado, RUC y proveedor de pagos**.
**Decisión de esta fase: no se construye nada.**

## 5. Overlay para streamers / TikTok — solo el contrato (no se construye)
Existe un experimento en `C:\dev\smash-soda-fork\_phoenix-link\tools\tiktok-experimento` (**solo lectura**: no se modifica ni se sube a GitHub; los repos de Link y overlay son públicos). Contrato que habría que respetar:

| Pieza | Qué es |
|---|---|
| Entrada | El archivo `estado.json` que escribe `phoenix_referee.lua` en `SiderAddons\content\phoenix\`. El servidor lo **solo lee**. Si no cambia en 6 s, la capa se oculta (como Link: «sin datos del juego»). |
| Servidor local | `servidor.js` (Node, solo `127.0.0.1`, puerto 8790). Rutas: `/` (la página) y `/datos` (JSON, sin caché). `--demo` simula un partido de ~60 s. |
| Datos (`/datos`) | `{ v, fase: en_juego/descanso/final/sin_datos/sin_ruta, minuto, periodo, nombre_local, nombre_visita, goles_local, goles_visita, goles:[{m, l:'l'/'v', j, pp?}], completo }` |
| Capa | `marcador.html` 1080×1920 (9:16), fondo transparente, marcador, minuto, lista de goles y cartel «¡GOOOL!» con goleador. Se usa como **fuente de navegador** en OBS o TikTok LIVE Studio. |
| No hace | No lee chat, regalos ni «me gusta» de TikTok (no hay vía oficial; la no oficial puede ir contra sus términos). No graba clips. |

**Para venderlo como extra de creador** haría falta: (1) empaquetarlo fuera del repo público (entrega por descarga con caducidad, como la beta de Link); (2) que el permiso lo dé la marca «Premium» del creador/torneo (la web comprueba la marca y entrega el enlace); (3) revisar términos de TikTok. Mientras tanto, la marca «torneo premium» ya deja anotado quién lo compró.

---

## 6. Decisiones para Fralex (preguntas simples)
1. **Precio del pase: ¿150 gemas (≈ S/ 13,60)?** SÍ / NO (si NO: dime un número entre 110 y 165).
2. **¿Temporada de 60 días con 30 niveles?** SÍ / NO (si NO: dime cuántos días).
3. **¿El torneo premium cuesta 300 gemas (≈ S/ 27) para todos?** SÍ / NO (o prefieres 3 escalones por tamaño).
4. **¿Dejamos las propinas solo en ascuas entre jugadores, sin dinero?** SÍ / NO (el dinero real a creadores espera al abogado).
5. **¿Quieres que construya la lista de patrocinadores (solo tú la editas)?** SÍ / NO.
6. **¿Seguimos con el overlay para TikTok como extra de pago?** SÍ / NO. Si SÍ, antes hay que decidir cómo entregarlo sin subirlo a GitHub público.
7. **¿Quieres los 7 días de gracia** para reclamar al terminar la temporada? SÍ / NO.

Pendiente: **copiar este documento a Drive** cuando el usuario vuelva a tener acceso.
