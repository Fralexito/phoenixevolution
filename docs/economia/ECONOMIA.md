# Web Phoenix Evolution · Economía completa: monedas, recargas, fases B–E, pasarela, pase y seguridad

El diseño y la construcción de toda la economía de la web:
- diseño general y monedas virtuales;
- recargas;
- la investigación sobre apuestas y gaming;
- las fases B (rachas y logros), C (efectos y sonidos), D (pasarela) y E (pase y organizadores);
- la guía de la pasarela;
- la seguridad del dinero.

**Estado al 21-oct:** `pagos_activos=false`, pasarela en modo prueba. La migración 140 «ascuas solo gratis» impide que lo comprado llegue a un pozo de apuestas. La auditoría de dinero, apuestas y riesgos legales del 21-oct está en `BITACORA-DINERO-APUESTAS-Y-LEGAL.md`, que se deja aparte porque es el documento vivo de ese tema.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 11 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Diseño completo de la economía de Phoenix Evolution (propuesta para decidir)](#parte-1-diseno-completo-de-la-economia-de-phoenix-evolution-propuesta-para-decidir) — origen `docs/economia/DISENO-ECONOMIA-COMPLETA.md` (01e6efc 2026-10-18)
- [Parte 2 · Plan del sistema de monedas virtuales — Phoenix Evolution Series](#parte-2-plan-del-sistema-de-monedas-virtuales-phoenix-evolution-series) — origen `docs/economia/PLAN-MONEDAS-VIRTUALES.md` (01e6efc 2026-10-18)
- [Parte 3 · Diseño del sistema de recargas con varios métodos de pago — Phoenix Evolution Series](#parte-3-diseno-del-sistema-de-recargas-con-varios-metodos-de-pago-phoenix-evolution-series) — origen `docs/economia/DISENO-RECARGAS.md` (01e6efc 2026-10-18)
- [Parte 4 · Investigación: cómo organizan sus webs las casas de apuestas y las páginas gaming/esports (16 oct 2026)](#parte-4-investigacion-como-organizan-sus-webs-las-casas-de-apuestas-y-las-paginas-gamingesports-16-oct-2026) — origen `docs/economia/INVESTIGACION-DISENO-APUESTAS-Y-GAMING.md` (01e6efc 2026-10-18)
- [Parte 5 · Economía · Fase B — racha diaria, primer partido, misiones semanales y logros](#parte-5-economia-fase-b-racha-diaria-primer-partido-misiones-semanales-y-logros) — origen `docs/economia/ECONOMIA-FASE-B.md` (801bae3 2026-10-18)
- [Parte 6 · Economía · Fase C — efectos de carta, banners de perfil y sonidos de chat (migración 121)](#parte-6-economia-fase-c-efectos-de-carta-banners-de-perfil-y-sonidos-de-chat-migracion-121) — origen `docs/economia/ECONOMIA-FASE-C.md` (801bae3 2026-10-18)
- [Parte 7 · Economía · Fase D · Pasarela de pago (Mercado Pago) — informe](#parte-7-economia-fase-d-pasarela-de-pago-mercado-pago-informe) — origen `docs/economia/ECONOMIA-FASE-D.md` (01e6efc 2026-10-18)
- [Parte 8 · Economía · Fase E (migración 123) — informe](#parte-8-economia-fase-e-migracion-123-informe) — origen `docs/economia/ECONOMIA-FASE-E.md` (801bae3 2026-10-18)
- [Parte 9 · Guía simple: cobrar con Mercado Pago (tarjeta, Yape y más)](#parte-9-guia-simple-cobrar-con-mercado-pago-tarjeta-yape-y-mas) — origen `docs/economia/GUIA-PASARELA.md` (01e6efc 2026-10-18)
- [Parte 10 · Diseño · Phoenix Pass y herramientas para organizadores y creadores (Fase E, migración 123)](#parte-10-diseno-phoenix-pass-y-herramientas-para-organizadores-y-creadores-fase-e-migracion-123) — origen `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` (5a12066 2026-10-21)
- [Parte 11 · Seguridad de la economía (gemas con dinero real)](#parte-11-seguridad-de-la-economia-gemas-con-dinero-real) — origen `docs/economia/SEGURIDAD-ECONOMIA.md` (cfff3d1 2026-10-21)

---

## Parte 1 · Diseño completo de la economía de Phoenix Evolution (propuesta para decidir)

> Origen: `docs/economia/DISENO-ECONOMIA-COMPLETA.md` · último cambio 01e6efc 2026-10-18 · 9522 bytes. Copia íntegra.

Estado: **PROPUESTA** (16-oct-2026, cuenta ECONOMÍA). Nada de esto está aplicado salvo lo que dice «YA EXISTE». Complementa `docs/economia/PLAN-MONEDAS-VIRTUALES.md` (plan técnico), `docs/economia/DISENO-RECARGAS.md` (pagos) y `docs/economia/SEGURIDAD-ECONOMIA.md` (seguridad).
Las cifras de precios son una **propuesta para probar**, no verdades: se ajustan con datos reales. Lo legal y lo tributario es orientación general: confirmarlo con abogado y contador.

---

### 1. Principios (no negociables)
1. **Solo cosmético y comodidad. Nunca ventaja en el juego.** Es una liga competitiva: si el dinero da ventaja, la liga pierde confianza. Gemas compran estilo, identidad y servicios; no puntos, no estadísticas, no resultados.
2. **Dos monedas que no se cambian entre sí.** Ascuas = se ganan jugando (gratis). Gemas = se compran con dinero. Así nadie está obligado a pagar y quien paga compra tiempo y exclusividad.
3. **Nada de azar pagado.** Sin cajas sorpresa, sin ruletas, sin apuestas con gemas. (Riesgo legal en Perú, menores de edad y mala reputación.) Las apuestas siguen siendo solo en ascuas.
4. **Las gemas no se retiran ni se convierten en dinero.** Solo sirven dentro del sitio. (Evita problemas legales y de lavado.)
5. **Precios siempre visibles en soles**, sin trucos (sin «últimas horas» falsas, sin cuenta atrás inventada).
6. **Mayores de 18 para comprar** (YA EXISTE: edad + términos).
7. **La economía se vigila sola** (YA EXISTE: auditoría + vigilancia + freno de emergencia).

### 2. Las dos monedas
| | Ascuas | Gemas |
|---|---|---|
| Cómo se consiguen | Jugando, retos, valorando (YA EXISTE) | Comprando (S/ 0,10 cada una de referencia) |
| Para qué sirven | Objetos comunes y raros, alquilar host, apuestas entre jugadores, cambios pequeños | Objetos premium, ediciones limitadas, comodidad, pase de temporada |
| Se pueden perder | Sí (apuestas) | No |
| Regla de oro | Siempre hay forma gratis de llegar a lo básico | Lo premium solo con gemas |

Referencia fija: **1 gema = 5 ascuas** para fijar precios (YA EXISTE), pero **no hay botón de cambio**.

### 3. Cómo se ganan ascuas (los «grifos») y cuánto
Hoy (YA EXISTE): partido jugado 10 (tope 5/día) · partido ganado 5 (tope 5/día) · valorar a un rival 2 (tope 5/día) · retos diarios 20–40 cada uno.
Máximo teórico de una persona muy activa: **≈ 205 ascuas al día** (50 + 25 + 10 + 120 de retos).

Propuestas para dar ganas de volver (sin romper el equilibrio):
- **Racha diaria:** 3 días +10, 7 días +40 (se reinicia si falta un día).
- **Primer partido del día:** +5.
- **Misiones semanales:** 3 misiones (jugar con 3 rivales distintos, 10 partidos, etc.) con 60–100 ascuas.
- **Logros** (hitos únicos): 20–200 ascuas según dificultad.
- **Temporada:** premio en ascuas al terminar en un tramo del ranking.
- Todo con **tope diario** y vigilado por la alerta `ganancia_ascuas` (YA EXISTE).

### 4. Cómo se gastan ascuas (los «sumideros»)
Si solo hay ganancia, las ascuas se devalúan (inflación). Sumideros:
- Tienda (objetos comunes y raros).
- Alquilar host (YA EXISTE).
- Cambiar nombre de usuario o de club: 50–100 ascuas.
- Reiniciar o mejorar objetos (ej. cambiar el color de una insignia): 20–40.
- Inscripción a torneos «con cuota en ascuas» (la cuota va a un fondo que el sistema reparte como premio).
- Apuestas con comisión escalonada (YA EXISTE).
Regla de salud: **lo que entra por día ≈ lo que sale por semana**. Se mide con `economia_auditar`.

### 5. Precios de los objetos (por rareza)
| Rareza | Gemas | Soles aprox. | Ascuas (solo si se permite) | Tiempo gratis para conseguirlo |
|---|---|---|---|---|
| Común | 12–30 | S/ 1,2–3 | 60–150 | ≈ 1 día |
| Raro | 40–80 | S/ 4–8 | 200–400 | ≈ 2–3 días |
| Épico | 120–250 | S/ 12–25 | solo gemas o 600–1250 | ≈ 1 semana |
| Legendario | 300–600 | S/ 30–60 | **solo gemas** | — |
| Edición limitada (por temporada) | 150–400 | S/ 15–40 | solo gemas | no vuelve a venderse |

**Hoy YA EXISTEN** 12 objetos: de 12 a 80 gemas (60 a 400 ascuas) — son Comunes y Raros. **Falta anclar los precios con Épicos y Legendarios** para que lo barato parezca barato y haya algo que aspirar.
Regla: lo exclusivo (Épico+, limitado) **solo gemas**; lo común, ambas monedas (así los que no pagan también progresan).

### 6. Paquetes de gemas
Hoy (YA EXISTE): 100 = S/ 10 · 300 = S/ 27 · 700 = S/ 55 (0,100 → 0,090 → 0,079 por gema).
Propuesta para probar (más escalones y una entrada pequeña):
| Paquete | Gemas | Precio | Por gema | Nota |
|---|---|---|---|---|
| Chispa | 50 | S/ 5 | 0,100 | entrada barata (Yape lo permite sin comisión) |
| Brasa | 110 | S/ 10 | 0,091 | +10 % |
| Llama | 300 | S/ 25 | 0,083 | el «mejor valor» visible |
| Fénix | 650 | S/ 50 | 0,077 | +30 % |
- **Bono de primera compra:** +50 % de gemas, una sola vez. Es el empujón más efectivo para pasar de «solo miro» a «compré».
- Sin descuentos inventados: los bonos son reales y fijos.
- Pagos manuales por Yape/Plin (YA EXISTE) no cobran comisión; las pasarelas sí (suele ser alrededor de 4–5 %: verificarlo al elegir una) → al pasar a pasarela, ajustar el precio o absorberlo.

### 7. Qué se puede ofrecer (catálogo)
**A. Identidad (lo que más se compra)**
- Marcos, insignias, títulos, fondos, color de clan (YA EXISTE).
- **Efectos de carta de jugador** (holográfica, dorada) — encaja con la Liga Máster y las cartas.
- **Banners de perfil** y **animaciones de entrada** en las salas.
- **Escudos y colores de club** animados (Mi club galáctico).
- **Emotes y sonidos de chat** (Phoenix Link ya tiene la pestaña SONIDOS CHAT).
- **Temas de sala en Phoenix Link** (colores del puesto y del marcador).
- **Celebraciones en la web** (confeti, fuegos) al ganar un reto.

**B. Comodidad (sin ventaja)**
- Cambio de nombre/club, huecos extra de clubes o equipos guardados.
- **Alquilar host** (YA EXISTE) con descuento por pase.
- Historial extendido y estadísticas avanzadas personales.

**C. Para creadores y organizadores (donde puede estar el dinero más estable)**
- **Torneo premium** (S/ 20–50 por torneo): overlay de transmisión, llaves bonitas, estadísticas, página propia.
- **Overlay para streamers/TikTok** (el experimento de marcador vertical) como extra de pago de creador.
- **Patrocinio de clanes/torneos** (logo del patrocinador): precio acordado, factura aparte.
- **Propinas a creadores** («Apoyar»): requiere revisión legal y de comisión antes.

**D. Pase de temporada («Phoenix Pass») — fase posterior**
- Pista **gratis** (con ascuas/XP) y pista **premium** (S/ 9,90–14,90 por temporada) con cosméticos exclusivos y gemas de regreso.
- Se compra una vez por temporada, no es suscripción automática (evita cobros no deseados).

**E. Lo que NO ofrecer**
- Ventajas en partidos (estadísticas, puntos, rival más fácil).
- Cajas/ruletas/azar de pago. Apuestas con gemas. Retirar gemas como dinero.
- Cambiar ascuas ↔ gemas. Vender ascuas por dinero.

### 8. Buenas prácticas (resumen)
- **Transparencia:** mostrar siempre cuánto cuesta en soles y qué recibes; confirmación antes de gastar gemas en objetos caros.
- **Límite de gasto opcional** que la persona pueda poner a su cuenta; aviso cuando gasta mucho en poco tiempo (YA hay topes diarios).
- **Reembolsos:** política clara por escrito (gemas ya gastadas no se reembolsan; pagos duplicados o errores sí). Los reembolsos ya descuentan las gemas (YA EXISTE).
- **Recibo por compra** (correo o pantalla) con orden y monto.
- **Atención:** canal de reclamos visible (en Perú existe el Libro de Reclamaciones para ventas al consumidor, incluida la venta virtual: confirmar con abogado qué te corresponde).
- **Tributario:** vender como persona tiene reglas (RUC, comprobantes, topes). Consultar contador antes de abrir pagos reales.
- **Datos:** no guardar datos de tarjeta (lo hace la pasarela); capturas de comprobantes en bucket privado (YA EXISTE).
- **Medir:** conversión (cuántos activos compran; metas realistas 2–5 %), ingreso por pagador, gemas compradas vs gastadas, inflación de ascuas, devoluciones. Revisar cada mes.
- **Probar con pocos:** abrir primero a un grupo pequeño con Yape manual, mirar 2–4 semanas y recién entonces escalar.

### 9. Hoja de ruta propuesta
1. **Ahora:** decidir esta propuesta (precios, paquetes, bono de primera compra).
2. **Fase A (1 semana):** subir 8–10 objetos Épicos/Legendarios y 2–3 limitados; paquetes nuevos; bono de primera compra (migración 119+ con RESERVADO en REGISTRO.md).
3. **Fase B:** racha diaria, primera partida del día, misiones semanales y logros en ascuas.
4. **Fase C:** efectos de carta, banners y emotes/sonidos (necesita arte y dos o tres creadores).
5. **Fase D:** pasarela (Mercado Pago u otra) con webhook firmado.
6. **Fase E:** Phoenix Pass y paquetes para organizadores/creadores.

### 10. Decisiones que necesito de Fralex
1. ¿Aprueba la regla «**solo cosmético y comodidad, nada de ventaja ni azar**»?
2. ¿Acepta los nuevos paquetes (S/ 5, 10, 25, 50) y el **bono de primera compra +50 %**?
3. ¿Qué rareza quiere primero: **épicos/legendarios** de la tienda, **efectos de carta** o **sonidos de chat**?
4. ¿Quiere abrir **herramientas para organizadores/creadores** (torneo premium, overlay) o dejarlas para después?
5. ¿Cuándo quiere abrir pagos reales a un grupo pequeño (fecha)?

---

## Parte 2 · Plan del sistema de monedas virtuales — Phoenix Evolution Series

> Origen: `docs/economia/PLAN-MONEDAS-VIRTUALES.md` · último cambio 01e6efc 2026-10-18 · 10174 bytes. Copia íntegra.

> Fecha: 16-oct-2026. Estado verificado hoy en la base «Galaxy League» (solo conteos y estructura, sin datos de personas) y en el código de la copia `pes-liga-automatica` (ronda 274). Complementa `ECONOMIA.md` (lo construido) con **lo que falta, por fases**. No es asesoría legal.

### 1. Diagnóstico: qué hay de verdad

**Construido y desplegado en la base (migraciones 049, 050, 051, 065, 071):**
- Libro de movimientos inmutable con clave de idempotencia (`movimientos_tokens`) y billetera como suma (`billeteras.saldo` = **ascuas**, `billeteras.gemas`). XP y niveles. 7 reglas de ganancia con tope diario.
- Tienda: 12 objetos cosméticos (marcos, títulos, fondos, insignias, color de clan). Compra atómica con una de las dos monedas.
- Pagos: 3 paquetes (100/550/1200 por S/ 5, 25, 50), órdenes, aceptación de términos, reembolso/disputa, interruptor `pagos_activos` (**apagado**).
- Retos con pozo 1 contra 1 solo en ascuas, con comisión escalonada, topes y revisión del staff. Alquiler de host con gemas en garantía. Panel de creadores.

**Estado real de uso hoy:** 1 billetera, 2 movimientos, 1 objeto en inventario, 0 órdenes de pago, 0 apuestas. Es decir: está construido, **casi sin usar y sin probar con gente**.

**Brechas encontradas (con evidencia):**
1. **La interfaz no conoce las gemas.** `src/js/pages/tienda.js`, `perfil.js` y `features/economia/api.js` tienen 0 menciones de «gemas»; solo `alquiler.js` las usa. La tienda sigue diciendo «tokens» y «Comprar tokens».
2. **Ninguna pantalla llama a `apostar_en_reto`.** Los retos con pozo existen solo en la base.
3. **Pagar no aporta ventaja.** `comprar_item` cobra el mismo precio en ascuas o en gemas. Con tope de ~85 ascuas/día, un objeto de 400 se consigue en ~5 días jugando; nadie tiene motivo para comprar gemas.
4. **El webhook de pagos es un esqueleto** (`interpretar()` lanza «sin implementar»), sin pasarela elegida ni desplegado.
5. **Sin pruebas automáticas de la economía** (`supabase/tests` solo tiene la 004).
6. **Sin reconciliación**: nada comprueba que la suma de movimientos coincida con la billetera.
7. **`inventario.precio_pagado` no guarda en qué moneda se pagó** (solo el libro lo sabe).
8. **Nombres mezclados:** paquetes y textos hablan de «tokens»; el modelo real es ascuas/gemas.
9. **Fuentes de ganancia limitadas:** solo partidos de la web, valoraciones y retos. Nada viene de Phoenix Link (hosting, partidas en sala) ni de eventos.

### 2. Principios que no se tocan
- Sin retiro de dinero, sin transferencias entre personas, sin cajas sorpresa, nada que cambie quién gana.
- El saldo nunca se edita a mano: solo líneas del libro, idempotentes.
- Las gemas **nunca** se apuestan ni se convierten en ascuas (ni al revés).
- Compras con dinero real solo para mayores de 18, con términos aceptados y la pasarela guardando los datos de pago.
- La economía de la Liga Máster (`lm_clubes.presupuesto`) sigue aparte.

### 3. Decisiones que hay que tomar (con recomendación)
| # | Decisión | Recomendación |
|---|---|---|
| D1 | Papel de cada moneda | **Ascuas** = se ganan jugando, compran cosas «del club» y las apuestas. **Gemas** = se compran, aceleran y desbloquean lo **premium exclusivo**. |
| D2 | Precio por moneda | Dos precios por objeto (`precio_ascuas`, `precio_gemas`, cualquiera puede ser nulo). Ejemplo: Marco Dorado 400 ascuas **o** 80 gemas; Marco Fuego exclusivo de gemas. Así pagar sí ahorra tiempo sin ser obligatorio. |
| D3 | Qué se vende además de cosméticos | Pase de temporada (recompensas por nivel), destacar tu sala, alquiler de host (ya existe). Nada que dé ventaja competitiva. |
| D4 | Pasarela | Comparar **Culqi, Mercado Pago, Niubiz** (con Yape/Plin si lo permiten) y Stripe según soporte en Perú, comisión y comprobantes. Decidir con una prueba sandbox. |
| D5 | Retos con pozo | Mantener solo en ascuas (que no se compran). **Revisar con un abogado en Perú antes de abrirlos** (apuestas a distancia, menores, protección al consumidor). |
| D6 | Ganancias desde Link | Que `partida_fin` (ya existe) y el hosting de salas premien con ascuas, con topes diarios y las mismas protecciones antifraude. |
| D7 | TikTok | **No** mezclar los regalos de TikTok con las gemas (esas monedas son dinero de TikTok). Solo efectos visuales o sonidos en el stream. |
| D8 | Inflación | Definir sumideros (cosméticos, comisión de pozos, temporada) y una meta de emisión diaria máxima por usuario. |

### 4. Fases

#### Fase 0 — Decidir (1 sesión, sin código)
Cerrar D1–D8 y los números: valor de cada gema en soles, precio en ambas monedas de los 12 objetos, tope diario de ascuas, comisión de pozos. **Salida:** tabla de precios aprobada por Fralex.

#### Fase 1 — Cerrar la base (migración 106 en adelante)
- `tienda_items`: añadir `precio_ascuas`, `precio_gemas` (migrar el `precio` actual a ascuas); `comprar_item` elige el precio según la moneda y rechaza si no hay precio en esa moneda.
- `inventario`: guardar `moneda_pagada` y el precio realmente pagado.
- Renombrar textos y paquetes de «tokens» a «gemas» (columna de visualización, sin romper claves).
- Reconciliación: función `economia_auditar()` que compara la suma del libro con cada billetera y avisa de diferencias; vista para el admin.
- Límites de velocidad y de emisión diaria global (cortafuegos si algo se rompe).
- **Pruebas SQL** en `supabase/tests`: idempotencia, saldo insuficiente, doble compra, carrera de dos compras, reembolso a saldo negativo, tope diario, apuesta con y sin revisión.
- **Criterio de salida:** todas las pruebas pasan y la auditoría da 0 diferencias.

#### Fase 2 — Interfaz (`tienda.js`, `perfil.js`, `api.js`)
- Cartera con **ascuas y gemas** siempre visibles; precio dual en cada objeto; etiqueta «solo gemas».
- Pestañas: Tienda · Mi inventario · Cómo ganar · **Comprar gemas** · Historial (con filtro por moneda).
- Pantalla de **retos con pozo**: proponer, aceptar, estados, revisión del staff, historial.
- Textos claros: «las ascuas se ganan jugando; las gemas se compran; no se pueden cambiar entre sí».
- **Criterio de salida:** flujo completo probado en móvil y escritorio con una cuenta de prueba.

#### Fase 3 — Operación y administración
- Panel admin: emisión y gasto por día, saldo en circulación por moneda, top de compras, alertas de auditoría.
- Ajustes manuales con motivo y auditoría (ya existen; añadir vista de revisión).
- Alertas: picos de ganancia por usuario, cuentas que ganan solo contra la misma persona.

#### Fase 4 — Pagos con dinero real (solo después de 1–3 y del criterio legal)
1. Elegir pasarela con la prueba sandbox (D4).
2. Completar `interpretar()` en `pago-webhook` y desplegarla con la firma HMAC (`PAGO_WEBHOOK_SECRET`); el monto lo fija el servidor.
3. Probar en sandbox: pagado, fallido, reembolso, disputa, disputa ganada, pago duplicado, pago tardío.
4. Redactar términos y política de reembolso; subir `version_terminos`.
5. Comprobantes y libro de reclamaciones según la ley.
6. Activar `pagos_activos` con un solo paquete pequeño y tope por persona al día.

#### Fase 5 — Ganar desde Phoenix Link y eventos
- Reglas nuevas en `economia_reglas`: partida en sala de Link, horas de host, retos de temporada.
- Pase de temporada (sin ventaja competitiva).
- Misma idempotencia: una recompensa por persona y hecho.

#### Fase 6 — Lanzamiento escalonado
1. **Beta cerrada**: 10–20 personas, solo ascuas, 2 semanas. Medir emisión, quejas y fraude.
2. Abrir gemas con compras pequeñas y monitoreo diario.
3. Abrir retos con pozo solo si el abogado lo aprueba.

### 5. Antifraude (transversal)
Ya existen: topes diarios, rivales distintos, antigüedad y partidos mínimos para apostar, comisión que retira ascuas de circulación. Añadir: detección de cuentas múltiples (dispositivo/IP prudente y legal), tope de ganancias por pareja de jugadores al día, revisión del staff por montos altos, bloqueo automático con saldo negativo.

### 6. Pruebas y calidad
Pruebas SQL (Fase 1), pruebas de interfaz con el simulador, ensayo de la pasarela en sandbox, ensayo de carga (muchas compras a la vez sobre el mismo objeto con stock), y revisión de seguridad de las funciones `security definer` (`search_path` fijo, ya aplicado).

### 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| Normativa de juegos y apuestas | Retos solo en ascuas sin compra ni retiro; revisión legal antes de abrirlos. |
| Fraude y granjas de cuentas | Topes, auditoría, alertas y revisión humana. |
| Inflación de ascuas | Sumideros y meta de emisión (D8). |
| Pasarela con contracargos | Saldo negativo que bloquea compras; términos claros. |
| Que nadie compre gemas | Precio dual y objetos exclusivos (D2), probado en beta. |

### 8. Lo que necesito de Fralex
1. Aprobar o ajustar D1–D8 y la tabla de precios.
2. Elegir la pasarela (o aprobar la comparación en sandbox).
3. Confirmar quién revisa lo legal en Perú.
4. Decidir cuándo pasar la web a `main` (la economía vive en la vista previa `/fase-beta/`).

### Registro
- 2026-10-16: plan creado tras verificar la base en vivo y el código (hallazgos de la sección 1).

- 2026-10-16: **Fase 1 HECHA** (migración 108 aplicada y probada; ver `supabase/tests/108_economia_fase1_test.sql`). Siguiente: Fase 2 (interfaz con las dos monedas) y recargas (`docs/economia/DISENO-RECARGAS.md`). Pendiente de Fralex: aprobar D1–D8 por escrito y elegir pasarela.

- 2026-10-16: **R1 (base) HECHA** — migración 109 aplicada y probada. Siguiente: interfaz (Tienda → «Comprar gemas», cola de pagos en el panel admin) y beta cerrada solo con ascuas.

- 2026-10-16: **Fase 2 HECHA (interfaz).** Tienda con las dos monedas, pestaña «Comprar gemas» y panel de recargas del administrador; precios acordados aplicados (migración 110). Pendiente: beta cerrada solo con ascuas, datos reales de cobro (número de Yape/Plin), tarea de vencimiento con pg_cron, pasarelas (R2) y comprobantes.

---

## Parte 3 · Diseño del sistema de recargas con varios métodos de pago — Phoenix Evolution Series

> Origen: `docs/economia/DISENO-RECARGAS.md` · último cambio 01e6efc 2026-10-18 · 11316 bytes. Copia íntegra.

> Fecha: 16-oct-2026. Es el detalle de la **Fase 4** de `docs/economia/PLAN-MONEDAS-VIRTUALES.md`. Una «recarga» = comprar **gemas** con dinero real. No es asesoría legal ni tributaria. Las cifras de comisiones salen de blogs y comparativas (no de documentación oficial) y **se contradicen entre sí**: hay que confirmarlas con cada proveedor antes de decidir.

### 1. Qué hay hoy
- Base lista: `paquetes_tokens` (3 paquetes), `ordenes_pago`, `crear_orden`, `procesar_pago_evento` (acredita gemas de forma idempotente, maneja reembolso y disputa), `aceptaciones_legales` y el interruptor `pagos_activos` (apagado).
- Edge Function `pago-webhook`: solo el esqueleto (verifica firma HMAC; `interpretar()` sin implementar). No está desplegada.
- Falta todo lo demás: elegir proveedor, cobrar de verdad, métodos de pago, panel de gestión, conciliación, comprobantes.

### 2. Métodos de pago que tiene sentido ofrecer en Perú
| Método | Cómo paga la persona | Tipo | Observaciones |
|---|---|---|---|
| Tarjeta crédito/débito | Formulario seguro de la pasarela | Inmediato, automático | Lo más estándar. Comisión variable (≈3,5–4,5 % + IGV según fuentes). |
| Yape / Plin | Desde su app, por QR o número | Inmediato, automático si la pasarela lo integra; si no, manual | Muy usado. Culqi e Izipay lo mencionan; hay que verificar la integración real. |
| PagoEfectivo (CIP) | Código que paga en agente, banco o app | Asíncrono (horas, a veces hasta 48 h) | Llega a quien no usa tarjeta. Tiene vencimiento. |
| Transferencia / Yape manual con comprobante | Paga a tu cuenta y sube la captura | Manual: lo aprueba el staff | Sin pasarela ni comisión; **más trabajo y más riesgo de fraude**. Buena para empezar. |
| PayPal u otros internacionales | Cuenta propia | Automático | Opcional, para jugadores fuera de Perú. |

### 3. Qué se sabe de los proveedores (verificar siempre en su documentación oficial)
- **Culqi:** según comparativas, un solo contrato habilita tarjetas, Yape, PagoEfectivo y Cuotéalo; comisión citada entre 3,49 % y 3,99 % (+ S/ 0,60 en una fuente); primera acreditación a los 7 días y luego 2–3 días. Documentación: docs.culqi.com.
- **Mercado Pago (Perú):** sus webhooks de Checkout Pro están documentados: POST HTTPS en JSON, evento «Pagos», estados pendiente/rechazado/aprobado, **firma en el encabezado `x-signature` (`ts` y `v1`, HMAC) que se compara con la clave secreta de la aplicación**. No pude confirmar la lista de métodos de pago ni Yape.
- **Niubiz e Izipay:** tarjetas; comisiones citadas ≈3,3–4,5 % + IGV; liquidación en 24–48 h. Izipay dice integrar Yape. No encontré su documentación técnica de webhooks.
- **PagoEfectivo:** API directa con credenciales (Service ID, Access Key, Secret Key), pero una fuente indica que exige desarrollo a medida.
- **Stripe:** no lo recomiendo hasta confirmar que atiende comercios peruanos.

Fuentes consultadas (secundarias, de comparación): [kom.pe – pasarelas 2026](https://kom.pe/pasarelas-pago-tienda-virtual-peru-2026/), [kom.pe – comparativa](https://kom.pe/pasarelas-pago-tiendas-online-peru-comparativa/), [guiadesoftware – panorama](https://www.guiadesoftware.com/blog/mejor-pasarela-pago-peru), [kom.pe – Izipay vs Niubiz vs Culqi](https://kom.pe/izipay-vs-niubiz-vs-culqi/), [Mercado Pago – notificaciones](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/payment-notifications).

**Efecto en el negocio:** con una comisión de ~4 % más un fijo de S/ 0,30–0,60, el paquete de S/ 5 pierde entre 10 % y 16 %. Conviene un paquete mínimo de S/ 10 o repartir la comisión en el precio.

### 4. Arquitectura: un adaptador por proveedor, una sola lógica de gemas
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

### 5. Modelo de datos nuevo (migración 109, sin crear todavía)
- `pagos_metodos`: clave, nombre, tipo (`pasarela`/`efectivo`/`manual`), proveedor, activo, orden en pantalla, mínimo y máximo, comisión %, comisión fija, instrucciones.
- `ordenes_pago` (añadir): `metodo`, `expira_at`, `checkout_url`, `cip`, `intentos`; índice único (`proveedor`, `proveedor_ref`).
- `pagos_manuales`: orden, referencia de la operación (**única**), ruta del comprobante en un bucket **privado**, estado (`pendiente`/`aprobado`/`rechazado`), revisor, nota, fechas.
- `pagos_eventos`: registro inmutable de cada aviso recibido (cuerpo, firma válida o no, resultado). Idempotencia por (`proveedor`, id del evento).
- `conciliaciones`: una fila por día y proveedor: total cobrado según el proveedor vs. suma de órdenes pagadas; diferencia y estado.

### 6. Flujos
**Pasarela (tarjeta / Yape):** el jugador elige método y paquete → acepta términos (+18) → se crea la orden `PENDIENTE` → el servidor crea el cobro y devuelve la dirección de pago → paga → el proveedor avisa al webhook → se verifica la firma → `procesar_pago_evento('pagado')` → gemas. Si no llega el aviso, una tarea periódica consulta el estado al proveedor (red de seguridad).
**PagoEfectivo:** se genera un CIP con vencimiento (p. ej. 24–48 h); la orden queda `PENDIENTE`; al pagar llega el aviso; si vence, pasa a `EXPIRADA` sin acreditar nada.
**Manual (Yape/Plin/transferencia):** el jugador ve los datos de pago y el monto exacto → paga → sube captura y el **código de operación** → entra a la cola del staff → el staff comprueba en su app que el dinero llegó y aprueba → gemas. Reglas: monto exacto, código de operación único (rechaza repetidos), plazo de 24 h, tope por persona y día, y una segunda aprobación por encima de cierto monto.

### 7. Gestión (panel «Recargas» para el admin)
Cola de pagos manuales; activar o desactivar cada método y cada paquete; límites (mínimo, máximo, tope diario por persona); reembolsos y disputas; conciliación diaria con alertas de diferencia; métricas (intentos, conversión, fallos por método, comisiones pagadas, ingreso neto); y registro de auditoría de cada acción del staff.

### 8. Seguridad
Firma HMAC en cada webhook; secretos solo en Supabase Secrets; la Edge Function sin JWT pero con firma obligatoria; **nunca** guardar datos de tarjeta (lo hace la pasarela); límites de velocidad; comprobantes en bucket privado con URL temporal; registro de todos los avisos; reembolso que descuenta las gemas y bloquea compras si el saldo queda negativo (ya existe); verificación de mayoría de edad (ya existe).

### 9. Lo legal y fiscal (a revisar con un contador y un abogado en Perú)
Vender gemas con dinero real suele requerir **RUC y comprobante de pago electrónico** (boleta o factura), con IGV; política de reembolsos y términos visibles; libro de reclamaciones; reglas de protección al consumidor y de menores; y las condiciones de cada pasarela sobre bienes virtuales. Un facturador electrónico con API (por ejemplo, Nubefact u otro autorizado por SUNAT) puede emitir el comprobante automáticamente al acreditar el pago.

### 10. Fases de implementación
| Fase | Qué se hace | Salida |
|---|---|---|
| R0 | Elegir proveedor y reunir requisitos (RUC o alternativa, cuenta bancaria, cuenta sandbox) | Proveedor elegido y credenciales de prueba |
| R1 | **Pago manual** Yape/Plin/transferencia: tablas, comprobantes, cola del staff, panel | Primer método real, sin pasarela |
| R2 | Pasarela de tarjeta (+ Yape si la incluye): adaptador, webhook, pruebas en sandbox (pagado, fallido, reembolso, disputa, duplicado, tardío) | Compras automáticas |
| R3 | PagoEfectivo con vencimiento | Pago en efectivo |
| R4 | Conciliación diaria, métricas, comprobantes electrónicos | Operación controlada |
| R5 | PayPal u otros, si hace falta | Jugadores fuera de Perú |

**Recomendación:** R1 primero (rápido, sin comisión y sin depender de nadie), mientras se tramita la pasarela; luego R2 con **Culqi o Mercado Pago**, decidiendo con una prueba en sandbox y las tarifas oficiales.

### 11. Lo que necesito de Fralex
1. ¿Vendes como persona o con RUC? (cambia qué pasarelas te aceptan y los comprobantes).
2. ¿Aceptas empezar con el pago manual por Yape/Plin?
3. Elegir pasarela o aprobar la comparación en sandbox.
4. Datos de cobro (número o QR de Yape/Plin, cuenta) que se mostrarán a los jugadores.
5. Paquete mínimo (recomendado: S/ 10).

### Estado (2026-10-16)
- **R1 (base de datos) HECHA:** migración 109 aplicada y probada (15 pruebas). Los métodos `manual_yape`, `manual_plin` y `manual_transferencia` existen pero están inactivos; el admin los activa con `admin_guardar_metodo` (poniendo el número de Yape/Plin o la cuenta en `datos`). Pendiente: interfaz del jugador y del admin, y programar `expirar_ordenes_pendientes()` con pg_cron.
- La sección 5 de este documento describe el modelo; lo implementado en 109 cubre `pagos_metodos`, `pagos_manuales` y las columnas nuevas de `ordenes_pago`. `pagos_eventos` y `conciliaciones` quedan para R2/R4.

- **2026-10-16 · Interfaz hecha:** el jugador compra desde la pestaña «Comprar gemas» y el administrador revisa en Administrar › Pagos por revisar. Para abrir el método: Administrar › Métodos de pago → poner el número de Yape, marcar «Activo» y activar «Compras con dinero real». Mientras no lo actives, todo sigue cerrado.

- **2026-10-16 · R2 (Mercado Pago) HECHA en migración 122:** adaptador, webhook firmado, `pagos_eventos`, `pagos_conciliaciones` y conciliación listos y desplegados, apagados hasta que Fralex ponga los secretos. Ver `docs/economia/GUIA-PASARELA.md` y `docs/economia/ECONOMIA-FASE-D.md`. Culqi/PagoEfectivo siguen sin hacer.

---

## Parte 4 · Investigación: cómo organizan sus webs las casas de apuestas y las páginas gaming/esports (16 oct 2026)

> Origen: `docs/economia/INVESTIGACION-DISENO-APUESTAS-Y-GAMING.md` · último cambio 01e6efc 2026-10-18 · 4310 bytes. Copia íntegra.

Pedido de FRALEX: ver qué ideas de organización, secciones y distribución se pueden aplicar a Phoenix Evolution. Se toman PATRONES (ideas de orden), no se copia diseño, marca ni código de nadie. (Copia desde el proyecto de claude.ai; desde 16-oct las notas viven solo en GitHub.)

Nota de honestidad: las fuentes son artículos de diseño (no las webs oficiales de Bet365, DraftKings, etc.). [fuente] = sale de esos artículos; [general] = conocimiento general del sector, no verificado hoy.

### 1. Casas de apuestas: lo que hacen bien
1. Menú por producto y con pocos botones, lo más usado primero (en vivo, próximos partidos, mi cuenta) [fuente].
2. Inicio tipo tablero: acceso rápido, noticias, tendencias, calendario, favoritos [fuente: Bwin, SBet].
3. Tarjetas «en vivo» que se actualizan solas, con cambio suave de color [fuente].
4. Estadísticas junto al partido, sin salir de la pantalla [fuente].
5. Cupón fijo abajo (bet slip): lo elegido queda pegado mientras navegas; confirmación dentro de la pantalla [fuente].
6. Inicio personalizado: primero tus ligas favoritas; recuerda preferencias [fuente].
7. Cartera/cuenta en un solo lugar: saldo, historial, movimientos [fuente].
8. Navegación abajo, a la altura del pulgar, en celular [fuente].
9. Poca profundidad: todo a 1–2 toques [fuente].
10. Ventanas emergentes de promos [fuente/general]: lo más molesto; mejor discretas.

### 2. Webs gaming / esports: lo que hacen bien
1. Menú típico: plantel/jugadores, calendario o resultados, noticias, tienda, nosotros [fuente].
2. Portada con un solo acento fuerte sobre fondo oscuro; en celular imagen fija en vez de video [fuente].
3. Tarjetas de partido en lista vertical (escudos, hora local, botón «Ver») [fuente].
4. Torneos: llaves, tablas y resultados primero [fuente].
5. Fichas de jugador con efecto al pasar el mouse y botones grandes al tacto [fuente].
6. Calendario de eventos dinámico [fuente: ESL].
7. «Ver» y «Tienda» siempre a mano [fuente].
8. Panel de usuario: la estadística principal arriba, resto en widgets [fuente: FACEIT].
9. Bienvenida según el juego que juegas (+25 % de registros reportado) [fuente: FACEIT].
10. Onboarding guiado para nuevos [fuente: PlayVS].
11. Patrocinadores en una franja de logos [fuente].
12. Tendencias 2026: bento, micro-animaciones inmediatas, modo oscuro cuidado, rapidez antes que decoración [fuente].

### 3. Ideas priorizadas (esfuerzo/valor) y su estado
| # | Idea | Estado (16-oct-2026) |
|---|------|----------------------|
| 1 | Barra fija abajo en celular | HECHO (ronda 329, BarraInferior) |
| 2 | «Tu próximo partido» fijo | HECHO (ronda 329, proximoPartido) |
| 3 | Números que cambian con color suave | HECHO (ronda 331, numerosVivos) |
| 4 | Hora local en cada partido | HECHO parcial (core/proximoPartido `cuando`) |
| 5 | Inicio personalizado | PENDIENTE |
| 6 | Cartera (saldo, historial, logros) | PENDIENTE (la otra cuenta hace economía/gemas) |
| 7 | Bienvenida a nuevos con 3 pasos | HECHO (ronda 330, primerosPasos) |
| 8 | Franja de aliados | PENDIENTE (faltan logos/enlaces del usuario) |
| 9 | Botón «Ver» (clip/stream) | HECHO parcial (clips Twitch/Kick/YouTube, ronda 328) |
| 10 | Estadística principal arriba + widgets en perfil | HECHO (radar «estilo FIFA», ronda 341) |
| 11 | Un solo acento por pantalla | Criterio de diseño |

### 4. Lo que NO conviene copiar
- Promos emergentes que tapan la pantalla (además la regla es «cero ventanas nativas»).
- Cuotas/apuestas con dinero real o bonos de azar: tema legal y de riesgo. Si se quiere «adivinar», con puntos del sitio, sin dinero.
- Videos pesados en autoplay en celular. Presión de «ofertas por tiempo limitado».

### Fuentes
- https://limeup.io/blog/betting-website-design/
- https://ux.bet/sportsbook/
- https://vocal.media/01/mobile-first-sportsbook-design-ux-best-practices-for-higher-retention
- https://muffingroup.com/blog/esports-website-design/
- https://seahawkmedia.com/design/esports-website-design-examples/
- https://ddobs.com/portfolio/ux-design/faceit/
- https://abp.io/community/articles/ui-ux-trends-that-will-shape-2026-bx4c2kow

---

## Parte 5 · Economía · Fase B — racha diaria, primer partido, misiones semanales y logros

> Origen: `docs/economia/ECONOMIA-FASE-B.md` · último cambio 801bae3 2026-10-18 · 6663 bytes. Copia íntegra.

Estado: **HECHO y aplicado** (16-oct-2026, hilo economia-fase-b). Migración **120** aplicada en Supabase (`fiibiyijojkxqlsrhcil`). Los pagos reales siguen **apagados**. Todo esto es **gratis y solo en ascuas**: no toca gemas ni da ventaja en el juego.

### Qué hay ahora (para Fralex, en simple)
| Qué | Cuánto | Cómo se consigue |
|---|---|---|
| Recompensa diaria | **+5 ascuas** cada día | Botón «Reclamar» en Tienda → Cómo ganar |
| Día 3 de la racha | **+10 extra** (total 15) | Igual |
| Día 7 de la racha | **+40 extra** (total 45) | Igual. Después de 7 días el ciclo vuelve a empezar |
| Si falta un día | la racha vuelve a 1 | La mejor racha queda guardada |
| Primer partido del día | **+5 ascuas** (+5 XP) | Solo, al confirmarse tu primer marcador del día |
| Misiones de la semana | **60–100 ascuas** cada una, 3 por semana | Botón «Reclamar» cuando la barra llega a la meta |
| Logros | **20–200 ascuas** cada uno, una sola vez | Botón «Reclamar» cuando la medalla ya es tuya |

- Los días y las semanas se cuentan en **hora de Lima** (America/Lima). La semana empieza el lunes.
- Las 6 misiones posibles rotan: 10 partidos (80) · 3 rivales distintos (60) · valorar a 5 rivales (60) · ganar 4 partidos (90) · 5 rivales distintos (100) · 15 partidos (90). Cada semana salen 3 distintas.
- Los **logros son los que ya existían** (medallas de duelos, muro, social y cuenta de las migraciones 035/036). Solo les puse un premio en ascuas (columna nueva `logros_catalogo.ascuas`): desde 20 (primer duelo, debut en el muro…) hasta 200 (Imparable = 50 victorias, Un año con nosotros). Se pueden cambiar por SQL sin tocar código.
- Tope de logros: **200 ascuas por día** (si ganas varias medallas juntas, reclamas el resto otro día).
- **Ojo:** ya existía una «racha» distinta (`mi_racha`, ronda 201): mide si «jugaste un reto hoy» y no da premio. La de la Fase B es una recompensa que se reclama. Son dos cosas separadas; en la pantalla la nueva se llama «Recompensa diaria». Unirlas queda como idea futura.

### Cómo funciona por dentro (para otra cuenta)
Reutiliza el mecanismo que ya existía (investigado antes de escribir nada):
- **Dar ascuas:** `private.registrar_movimiento(usuario, delta, 'ganado', fuente, referencia, clave)` con clave única ⇒ reintentar nunca duplica. Claves nuevas: `racha:<uid>:<fecha>`, `racha_bono:<uid>:<fecha>`, `mision:<uid>:<lunes>:<clave>`, `logro:<uid>:<id>`, y `ganado:<uid>:primer_partido_dia:<fecha>` (esta última la pone `private.otorgar`).
- **Primer partido del día:** regla nueva `primer_partido_dia` en `economia_reglas` (xp 5, ascuas 5, tope 1/día; el admin la edita en Tienda → Administrar → Reglas de ganancia) + disparador `zz_economia_b` en `resultados_duelo` que llama a `private.otorgar` por cada jugador al confirmarse el marcador (mismo estilo que `zz_economia`: nunca rompe la acción original).
- **Misiones:** catálogo en `private.catalogo_misiones(lunes)` (3 de 6 rotando); el progreso se mide con `private.progreso_reto` (lo que ya usan los retos semanales). Cobros en `misiones_cobros` (clave primaria usuario+semana+misión).
- **Logros:** `logros_usuario` (medalla obtenida, ya existía) + `logros_cobros` (premio ya cobrado). `private.metricas_logros` se reutiliza para mostrar el avance.
- **Funciones públicas (solo `authenticated`, `SECURITY DEFINER`, `search_path` vacío):** `reclamar_racha_diaria()`, `reclamar_mision(text)`, `reclamar_logro(text)`, `mis_ascuas_extra()` (lo que pinta la pestaña).
- **Tablas nuevas** (RLS activa, sin políticas, sin permisos a `anon`/`authenticated`): `racha_diaria`, `misiones_cobros`, `logros_cobros`.
- Dos clics a la vez no cobran doble: cada reclamo toma un bloqueo (`pg_advisory_xact_lock`) y además la clave del libro es única.

### Vigilancia (importante)
La alerta `ganancia_ascuas` mira cuántas ascuas «ganadas» tiene una persona en 24 h. Máximo teórico **en un día de Lima** con todo lo nuevo:
`205 (lo de antes) + 45 (racha 5+40) + 5 (primer partido) + 270 (3 misiones de la peor semana) + 200 (tope de logros) = 725`.
Por eso **`alerta_ascuas_dia` sube de 400 a 800** (la migración solo lo cambia si seguía en 400: si Fralex lo había ajustado, no se toca).
Limitación conocida: la vigilancia usa «24 horas corridas», no «día de Lima». Una persona muy activa que cobre cosas diarias justo antes y después de la medianoche podría pasar de 800 una vez y disparar una alerta **falsa** (se resuelve con una nota). Es mejor ese aviso de más que dejar la barrera floja.

### Pruebas
- **SQL** `supabase/tests/120_fase_b_test.sql` (se deshace sola; terminó con `TODO_OK_REVERTIDO` contra la base real): primera reclamación (+5, racha 1); doble reclamo el mismo día rechazado y sin cobro doble; día 3 (+15); día 7 (+45); falta un día ⇒ vuelve a 1 y la mejor racha se conserva; 3 misiones con 60–100 ascuas; misión sin progreso rechazada, con progreso cobra una vez; logro sin medalla rechazado; logro cobrado una vez; tope de 200 al día; primer partido del día lo recibe cada jugador una sola vez; el libro cuadra (`economia_diferencias` = 0); `alerta_ascuas_dia` ≥ 725; `anon` no puede ejecutar nada ni leer las tablas.
- **JS** `tests/ganarAscuas.test.mjs` (7 pruebas: racha 5/+10/+40, normalización, textos). Suite completa: **516/516** en verde. `npm run build`: 53 páginas, en verde.
- **Pantalla:** revisada en modo demo (`/tienda/?demo` → pestaña «Cómo ganar»): reclamar la racha subió 420 → 435 ascuas (día 3 = +15) y no se desborda en celular (375 px).

### Archivos
- `supabase/migrations/120_economia_fase_b_rachas_misiones_logros.sql` · `supabase/tests/120_fase_b_test.sql`
- `src/js/core/economia/ganarAscuas.js` (lógica pura) · `src/js/features/economia/ganar.js` (pantalla) · cables en `features/economia/api.js`, `features/economia/demo.js`, `pages/tienda.js`
- Prueba: `tests/ganarAscuas.test.mjs`

### Pendientes / ideas
- Premio de temporada en ascuas (idea del diseño, sección 3) no entra en esta fase.
- Unificar la racha de «jugaste un reto» (`mi_racha`) con la recompensa diaria, si Fralex lo quiere.
- Los premios de logros son un primer reparto; ajustarlos con datos reales (columna `logros_catalogo.ascuas`).
- Los logros de medallas sociales (amigos, seguidores, reacciones) se podrían farmear con cuentas falsas; el tope diario de 200 y el ser un premio único lo limitan, pero conviene mirarlo cuando haya usuarios reales.
- Pendiente copiar a Drive (hoy solo GitHub).

---

## Parte 6 · Economía · Fase C — efectos de carta, banners de perfil y sonidos de chat (migración 121)

> Origen: `docs/economia/ECONOMIA-FASE-C.md` · último cambio 801bae3 2026-10-18 · 4690 bytes. Copia íntegra.

**Resumen para Fralex (SÍ/NO primero):** SÍ, la Fase C está hecha y aplicada. Hay 11 objetos nuevos en la tienda (3 efectos de carta, 4 banners, 4 sonidos). Los pagos reales siguen APAGADOS. Nada da ventaja en el juego.

### Qué se hizo
| Parte | Dónde |
|---|---|
| Base de datos (aplicada en `fiibiyijojkxqlsrhcil`) | `supabase/migrations/121_economia_fase_c_efectos_banners_sonidos.sql` |
| Prueba SQL (se deshace sola, termina en `TODO_OK_REVERTIDO`) | `supabase/tests/121_fase_c_test.sql` (y 119 ajustada: 28→39 objetos) |
| Lógica pura con pruebas | `src/js/core/economia/economia.js`, `src/js/core/comunidad/sonidosChat.js`, `tests/economiaFaseC.test.mjs` |
| Efectos de carta (CSS puro) | `src/styles/efectosCarta.css`, `src/js/features/efectosCarta.js` |
| Banner en el perfil | `src/js/pages/perfil.js` (`#pf-banner`) |
| Sonidos: vista previa con botón | `src/js/features/sonidosChat.js` |
| Contrato para Link | `docs/comunidad/CONTRATO-SONIDOS-CHAT.md` |

### Objetos nuevos (precios del diseño §5; ascuas = gemas × 5 salvo legendarios)
| Objeto | Rareza | Gemas | Ascuas |
|---|---|---|---|
| Efecto holográfico | raro | 70 | 350 |
| Efecto dorado | épico | 160 | 800 |
| Efecto aurora | legendario | 320 | solo gemas |
| Banner Atardecer (degradado) | común | 24 | 120 |
| Banner Medianoche (rayas) | raro | 50 | 250 |
| Banner Rejilla Neón | épico | 130 | 650 |
| Banner Estelar (estrellas) | legendario | 350 | solo gemas |
| Sonido Campana de cristal | común | 15 | 75 |
| Sonido Pop de burbuja | común | 20 | 100 |
| Sonido Moneda dorada | raro | 45 | 225 |
| Sonido Gol de estadio | épico | 120 | 600 |

### Seguridad (lo que se decidió)
- **Lista blanca**, no CSS libre: `private.estilo_valido` solo acepta `efecto` ∈ {holografico, dorado, aurora}, `patron` ∈ {degradado, diagonal, rejilla, puntos}, `sonido` ∈ las 4 claves `snd_*`, y colores `#RRGGBB`. Nada de URLs. La web repite la misma lista (`estiloSeguro`) y una prueba comprueba que web y migración coinciden.
- El check de categoría de `tienda_items` ahora admite `efecto_carta`, `banner`, `sonido_chat`. `tienda_lista`, `equipamiento_de`, `comprar_item` y `equipar_item` ya eran genéricos por categoría y **no se tocaron**.
- Función nueva `public.efectos_carta_de(uuid[])` (lee el efecto equipado de varias personas con una sola llamada): `SECURITY DEFINER`, `search_path` vacío, máximo 100 ids, respeta la privacidad del muro (`puede_ver_muro`), revocada a `public`, concedida a `anon` y `authenticated` (igual que `equipamiento_de`, porque las cartas son públicas).
- Legendarios solo con gemas (aurora y banner estelar). El libro sigue cuadrado (prueba T10).

### Cómo se ve
- **Efectos de carta**: una capa `::after` sin eventos sobre la carta (`.pc` de Central/Base de datos/ficha, `.mg-carta` de la Liga Máster y `.fb-carta` de /futbolista). Se activa cuando el DUEÑO la tiene equipada: `.pc` usa `perfil_id` de la ficha; Liga Máster y /futbolista usan el DT dueño del club (`lm_clubes.dueno`). En listas largas solo se mueve al pasar el mouse; en una carta sola y en la vista previa de la tienda se mueve siempre.
- **Modo ligero** (`html[data-rend-ligero='1']`): el efecto se apaga por completo. **Movimiento reducido** (sistema o «Ajustes → Animaciones»): queda quieto, sin animar.
- **Banner**: en el perfil, el banner equipado reemplaza al banner preestablecido; si la persona subió su propia foto, la foto manda.
- **Sonidos**: en la tienda, botón «Escuchar»; nunca suena solo. Se sintetiza con WebAudio (sin archivos).
- La tienda (`?demo` y build) muestra las tres pestañas nuevas. Verificado en el navegador: 3 efectos, 4 banners, 4 botones de sonido sin errores; el modo ligero apaga el efecto.

### Nota sobre «mi-club»
`/mi-club` es un editor de plantilla (vestuario), no tiene componente de carta; por eso no lleva efecto. Si Fralex quiere uno ahí, es un cambio chico aparte.

### Pruebas
`node --test tests/*.test.mjs` → 518 pruebas, 0 fallos (incluye `tests/economiaFaseC.test.mjs`). `npm run build` → 53 páginas. Prueba SQL 121 → `TODO_OK_REVERTIDO`.

### Pendientes
- El lado de Link (función `sonidos_chat_de`, archivos `.wav`, filtro) está solo **diseñado**: ver `docs/comunidad/CONTRATO-SONIDOS-CHAT.md` §4 y §9.
- El formulario de administración antiguo (`admin_guardar_item`) no sabe poner precio en gemas ni rareza: los objetos nuevos se crean por migración, como los de la Fase A.
- **Pendiente copiar a Drive** (este informe y el contrato) cuando Fralex tenga Drive.

---

## Parte 7 · Economía · Fase D · Pasarela de pago (Mercado Pago) — informe

> Origen: `docs/economia/ECONOMIA-FASE-D.md` · último cambio 01e6efc 2026-10-18 · 8469 bytes. Copia íntegra.

> 16-oct-2026 · hilo `economia-fase-d` · migración **122** (aplicada y probada). Guía para Fralex: `docs/economia/GUIA-PASARELA.md`. **`pagos_activos` sigue en `false`; el método nuevo está inactivo.**

### Resumen (SÍ / NO)
- ¿Hecho y desplegado? **SÍ**: migración 122, Edge Functions `pago-webhook`, `pago-crear`, `pago-conciliar` (publicadas), pruebas y guía.
- ¿Se puede cobrar dinero real ya? **NO**: faltan los 3 secretos (los pone Fralex en Supabase), activar el método y `pagos_activos`. Sin secretos las funciones responden 503.
- ¿Se tocó el flujo manual? **NO** (`crear_orden_metodo`, `enviar_comprobante_manual`, `admin_resolver_pago_manual` intactos). Solo se añadió una rama en la web para métodos de tipo `pasarela`.

### Qué se verificó en la documentación oficial de Mercado Pago (16-oct-2026)
- **Aviso (webhook):** POST HTTPS JSON. Cabeceras `x-signature` (`ts=…,v1=…`) y `x-request-id`; parámetro de URL `data.id`; cuerpo con `action`, `api_version`, `data.id`, `date_created`, `id`, `live_mode`, `type`, `user_id`. Fuente: [Configurar notificaciones](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/payment-notifications).
- **Firma:** plantilla `id:[data.id];request-id:[x-request-id];ts:[ts];` (el id alfanumérico en minúsculas; lo que falte se quita), HMAC-SHA256 en hexadecimal con la clave secreta de la aplicación, comparado con `v1`. Plantilla confirmada en búsqueda sobre la documentación oficial (la página no devuelve ese bloque en texto plano al descargarla); el ejemplo de la documentación encaja con `construirManifiesto` (prueba incluida).
- **Respuesta/reintentos:** hay que responder 200 o 201 en 22 s; reintentos a 0, 15 min, 30 min, 6 h, 48 h y tres veces cada 96 h.
- **Crear preferencia:** `POST https://api.mercadopago.com/checkout/preferences` con `items[{title, quantity, currency_id:"PEN", unit_price}]`, `external_reference`, `notification_url`, `back_urls`, `auto_return`, `expires`/`expiration_date_to`, `statement_descriptor`, `binary_mode`; respuesta con `id`, `init_point`, `sandbox_init_point`. Fuente: [Crear preferencia](https://www.mercadopago.com.pe/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post).
- **Consultar pago:** `GET /v1/payments/{id}` (campos `status`, `transaction_amount`, `transaction_amount_refunded`, `currency_id`, `external_reference`); **buscar:** `GET /v1/payments/search?external_reference=…` (respuesta `{paging, results[]}`).
- **No pude confirmar en la documentación** (y por eso el código es defensivo): la lista completa de valores de `status` (uso `pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back`; cualquier otro se ignora y queda registrado), si los pagos traen el campo `live_mode`, si Perú acepta persona natural sin RUC, las comisiones y el soporte de Yape. 
- ⚠ **Aviso de Mercado Pago:** la API de *Preferencias* está marcada como «legacy»: seguirá funcionando, pero las novedades solo salen en la API de *Orders*. Es una decisión a revisar antes de escalar (migrar solo tocaría `pago-crear`).

### Decisiones de seguridad
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

### Qué se creó
- `supabase/migrations/122_economia_fase_d_pasarela.sql` (aplicada; más un ajuste de vigencia aplicado como `economia_fase_d_pasarela_ajuste_vigencia`, ya incluido en el archivo). Contiene: método `mercadopago` (tipo `pasarela`, **inactivo**, mínimo S/ 10), configuración `pasarela_modo` y `pasarela_vence_minutos`, tablas `pagos_eventos` y `pagos_conciliaciones`, funciones `pasarela_rechazo`, `pasarela_procesar`, `pasarela_orden_para_cobro`, `pasarela_guardar_checkout`, `pasarela_ordenes_dia`, `pasarela_pendientes_antiguas`, `pasarela_conciliar`.
- `supabase/functions/_shared/mp.mjs` (firma, estados, preferencia) y `proceso.mjs` (API de Mercado Pago + entrega a la base).
- `supabase/functions/pago-webhook` (reemplaza el esqueleto), `pago-crear`, `pago-conciliar` — **desplegadas** (webhook y conciliar con `verify_jwt=false`; crear con `verify_jwt=true`).
- Web: `api.js` (`enlacePasarela`) y `recargas.js` (si el método es `pasarela`, tras crear la orden redirige a la página de pago; texto del método). Nada más.
- Pruebas: `tests/pasarelaMercadoPago.test.mjs` (13) y `supabase/tests/122_fase_d_test.sql`.

### Pruebas hechas
- **Node (13/13 OK):** manifiesto oficial, firma correcta, firma incorrecta (clave, id, request-id, ts, formato, sin clave), estados, montos, preferencia, entrega a la base con cliente simulado.
- **SQL en la base real (transacción deshecha, `TODO_OK_REVERTIDO`):** método inactivo y pagos apagados; permisos cerrados; firma inválida registrada; pago acreditado; **duplicado** sin gemas dobles; **monto distinto** (no acredita, alerta crítica); **reembolso** (gemas a cero, orden REEMBOLSADA); **orden desconocida**, texto que no es uuid y orden de otro método; modo equivocado; estado pendiente ignorado; reembolso parcial; orden vencida; registro inmutable; cobro de orden manual rechazado; enlace ajeno rechazado; conciliación con diferencia → alerta. Después se comprobó que no quedó ningún dato de prueba.
- **Desplegado:** `pago-webhook` responde 503 sin secretos y 405 a GET (arranca bien, imports resueltos).
- **No probado** (requiere cuenta real de Mercado Pago): el viaje completo con tarjeta de prueba. Se hace con la guía, paso 5. La firma real de Mercado Pago solo se pudo contrastar con el formato oficial, no con su clave.

### Pendiente / siguientes pasos
1. Fralex: crear cuenta y aplicación, poner los 3 secretos y probar (docs/economia/GUIA-PASARELA.md).
2. Programar `pago-conciliar` una vez al día (hoy se lanza a mano).
3. Mensaje en la tienda al volver de Mercado Pago (`?pago=ok|pendiente|error` ya llega en la URL; solo falta mostrarlo).
4. Decidir si migrar a la API de Orders; comprobantes electrónicos y asuntos fiscales (ver `docs/economia/DISENO-RECARGAS.md` §9).
5. Pendiente copiar a Drive (no hay Drive por ahora).

---

## Parte 8 · Economía · Fase E (migración 123) — informe

> Origen: `docs/economia/ECONOMIA-FASE-E.md` · último cambio 801bae3 2026-10-18 · 4722 bytes. Copia íntegra.

Hilo `economia-fase-e` · 16-oct-2026. Diseño completo y preguntas para Fralex: `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md`.

### Estado en una línea
**Hecho y probado:** la migración 123 está aplicada en la base (la aplicó Fralex pegándola en el SQL Editor) y la prueba SQL terminó en `TODO_OK_REVERTIDO` (11 pruebas, 16-oct-2026). Código publicado en `borrador`.

### Qué hay
| Pieza | Dónde |
|---|---|
| Diseño, reglas, propinas (solo riesgos), overlay TikTok (solo contrato) | `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` |
| Migración 123 | `supabase/migrations/123_economia_fase_e_pase_y_torneo_premium.sql` |
| Prueba SQL (se deshace sola; termina en `TODO_OK_REVERTIDO`) | `supabase/tests/123_fase_e_test.sql` |
| Lógica pura + 12 pruebas | `src/js/core/economia/phoenix-pass.js`, `tests/phoenix-pass.test.mjs` |
| Pestaña «Pase» (demo: `/tienda/?demo`) | `src/js/features/economia/pase.js`, `pase-demo.js`, enganche en `pages/tienda.js` y `tienda.astro` |
| Botón «Hacer premium» (panel «Opciones del organizador») | `src/js/pages/torneo.js`, `features/torneos/api.js`, `styles/torneos.css` |

### La migración, en simple
- **Tablas** (todas con RLS cerrada; nadie escribe desde el navegador): `pase_temporadas`, `pase_recompensas`, `pase_compras`, `pase_reclamos`, `torneo_premium`. (La tabla `temporadas` que ya existía es de las ligas; no se toca.)
- **Libro**: 3 tipos nuevos de movimiento (`compra_pase`, `recompensa_pase`, `torneo_premium`). La migración **lee la lista actual** del check y le añade los suyos, para no pisar a las otras fases. Cada cobro/premio usa clave idempotente por `private.registrar_movimiento`.
- **Funciones para el jugador**: `pase_estado()` (pública), `pase_comprar()`, `pase_reclamar(nivel, pista)`, `torneo_premium_info(torneo)` (pública), `torneo_hacer_premium(torneo)`.
- **Funciones del administrador** (con `admin_seguro` y auditoría): `admin_pase_temporada(...)`, `admin_pase_recompensa(...)`. Reglas: la pista gratis nunca da gemas; las gemas de regreso suman menos que el precio; no se cruzan temporadas; con compras hechas no se cambia inicio/niveles/XP; no se borra un premio ya reclamado.
- **Seguridad**: funciones `SECURITY DEFINER` con `search_path` vacío; `revoke` a `public` y `anon` (solo `pase_estado` y `torneo_premium_info` son públicas); `grant` a `authenticated` donde toca.
- **Temporada 1 «Despegue»** (17-oct → 16-dic-2026, 30 niveles, 100 XP por nivel, 150 gemas): gratis = 2 160 ascuas + 3 objetos comunes que ya existen (`marco_hielo`, `titulo_imparable`, `insignia_rayo`); premium = 6 objetos exclusivos (inactivos en la tienda, solo llegan por el pase), 1 080 ascuas y 60 gemas de regreso. `torneo_premium_gemas = 300`, `pase_gracia_dias = 7` en `economia_config`.
- **Reutilización de otras fases**: los premios apuntan a un objeto de `tienda_items` por clave; los efectos/banners/sonidos de la Fase C (121) y lo que traiga la Fase B se pueden añadir al pase con `admin_pase_recompensa` sin cambiar código.

### Cómo se aplicó
Migración pegada en el SQL Editor, comprobada (1 temporada, 60 premios, 7 funciones, 3 tipos nuevos en el libro) y prueba `supabase/tests/123_fase_e_test.sql` ejecutada. La temporada empieza el 17-oct 00:00 (Lima); antes dirá «la próxima temporada empieza pronto».

### Verificado
- `node --test tests/*.test.mjs`: 530 pruebas, 0 fallos. `npm run build`: 53 páginas.
- Demo (`/tienda/?demo`, `&pase=si`, `&xp=1450`, `&pase=cerrado`): reclamar sube las ascuas; con 85 gemas la compra queda desactivada («No te alcanzan las gemas»); sin desborde horizontal a 375 px.
- Base real: prueba SQL deshecha OK (T1 a T11: compra única, reclamo único, libro idempotente, exclusivos no vendibles, límites del admin, torneo premium, 0 diferencias).

### Riesgos / pendientes
- Si otra fase vuelve a reconstruir el check de tipos del libro con una lista fija, puede quitar los 3 tipos de esta fase: tras aplicar cualquier migración nueva, comprobar `select pg_get_constraintdef(oid) from pg_constraint where conname='movimientos_tokens_tipo_check'`.
- El overlay, las llaves de pantalla completa, las estadísticas y la página propia del torneo premium **no están construidos**: hoy solo existe la marca comprada (y se dice así en la pantalla). Overlay TikTok: solo contrato, ver el diseño.
- Sin devolución automática del torneo premium ni del pase: el administrador corrige con un movimiento de reembolso.
- Propinas y patrocinios: solo diseño (requieren decisión de Fralex; propinas, revisión legal).
- Pendiente copiar este informe y el diseño a Drive cuando vuelva el acceso.

---

## Parte 9 · Guía simple: cobrar con Mercado Pago (tarjeta, Yape y más)

> Origen: `docs/economia/GUIA-PASARELA.md` · último cambio 01e6efc 2026-10-18 · 7323 bytes. Copia íntegra.

> Para Fralex. Fecha: 16-oct-2026. **Todo esto está construido pero APAGADO**: nadie puede pagar con Mercado Pago hasta que tú lo enciendas. El Yape manual sigue igual.
> Nunca pegues una clave en el chat, en GitHub ni en un archivo del proyecto. Las claves se escriben **solo** en Supabase (paso 4).

### Qué hace por ti (en una frase)
El jugador elige «Tarjeta, Yape y más», paga en la página de Mercado Pago, Mercado Pago avisa a tu servidor con una firma secreta, el servidor comprueba que el monto es el correcto y **las gemas llegan solas**. Si algo no cuadra, no da gemas y te sale una alerta roja en «Vigilancia del dinero».

### Lo que necesitas hacer tú (6 pasos)

#### 1. Crear tu cuenta de Mercado Pago
1. Entra a https://www.mercadopago.com.pe y crea una cuenta con tu correo y tu DNI. Verifica tu identidad cuando te lo pida.
2. Ten a mano tu cuenta bancaria o la de Yape donde quieres recibir el dinero.
3. **No pude comprobar** si Mercado Pago Perú te pide RUC para cobrar como persona natural, ni la comisión exacta. Míralo en tu cuenta (Tarifas) antes de abrir al público. Sin RUC, pregunta a Mercado Pago o a un contador qué comprobante corresponde.

#### 2. Crear la «aplicación» y sacar las credenciales de PRUEBA
1. Entra a https://www.mercadopago.com.pe/developers/panel/app → **Crear aplicación**.
2. Nombre: `Phoenix Evolution`. Tipo de solución: **Pagos online** → producto **Checkout Pro**.
3. Dentro de la aplicación: **Credenciales de prueba** → copia el **Access Token de prueba** (empieza con `APP_USR-`). Déjalo en el portapapeles, lo usas en el paso 4.
4. En el mismo panel crea dos **cuentas de prueba** (una vendedora y una compradora) en «Cuentas de prueba». Con la compradora vas a «pagar» sin gastar dinero.

#### 3. Decirle a Mercado Pago a dónde avisar (el webhook)
1. En tu aplicación: **Webhooks → Configurar notificaciones**.
2. Pestaña **Modo de pruebas**. En la URL pega exactamente:

   `https://fiibiyijojkxqlsrhcil.supabase.co/functions/v1/pago-webhook`
3. Marca el evento **Pagos** y pulsa **Guardar configuración**.
4. Aparece una **clave secreta** (botón «Revelar»). Cópiala: es la que usas en el paso 4. Esa clave es la que impide que alguien falso nos avise de un pago.
5. Botón **Simular notificación**: envía una de prueba. Debe decir que se envió bien (el servidor responde 200 porque el pago de ejemplo no existe y lo anota como ignorado).

#### 4. Guardar los secretos en Supabase
1. Entra a https://supabase.com/dashboard/project/fiibiyijojkxqlsrhcil/functions/secrets (Edge Functions → Secrets).
2. Crea estos tres secretos (nombre → valor):

| Nombre | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | el Access Token de prueba del paso 2 |
| `MP_WEBHOOK_SECRET` | la clave secreta del paso 3 |
| `PAGO_CRON_SECRET` | una frase larga que inventes tú (para la revisión diaria) |

3. Listo. No hay que volver a desplegar nada: las funciones `pago-webhook`, `pago-crear` y `pago-conciliar` ya están publicadas.

#### 5. Probar de punta a punta (modo de pruebas)
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

#### 6. Pasar a dinero real (más adelante, cuando tú decidas)
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

### Qué hacer si pasa algo raro
| Ves | Significa | Qué hacer |
|---|---|---|
| Alerta crítica «pago NO acreditado» | Mercado Pago cobró pero el monto/estado de la orden no coincide | Mira el pago en Mercado Pago. Si no corresponde, **reembólsalo ahí**. No toques gemas a mano. |
| Alerta «orden desconocida» | Llegó un pago sin orden válida | Probablemente una prueba o un error; revisa y reembolsa si es real. |
| Alerta «reembolso parcial» | Devolviste solo una parte | Decide si quitar gemas con un ajuste (queda en el libro). |
| `firma_invalida` repetido en `pagos_eventos` | Alguien intenta enviar avisos falsos | No pasa nada (no acreditan), pero avisa si son muchos. |
| El jugador pagó y no hay gemas | El aviso se retrasó | Espera unos minutos (Mercado Pago reintenta). La revisión diaria también lo rescata. |

### Dónde está cada cosa
- Código: `supabase/functions/pago-webhook`, `pago-crear`, `pago-conciliar` y `supabase/functions/_shared/` (lógica de firma y estados, con pruebas en `tests/pasarelaMercadoPago.test.mjs`).
- Base de datos: migración 122 (`pagos_eventos`, `pagos_conciliaciones`, funciones `pasarela_*`). Informe técnico: `docs/economia/ECONOMIA-FASE-D.md`.

---

## Parte 10 · Diseño · Phoenix Pass y herramientas para organizadores y creadores (Fase E, migración 123)

> Origen: `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` · último cambio 5a12066 2026-10-21 · 12031 bytes. Copia íntegra.

Autor: cuenta ECONOMÍA, hilo `economia-fase-e` · 16-oct-2026 · Parte del plan `docs/economia/DISENO-ECONOMIA-COMPLETA.md` (§C y §D).
Reglas que no se tocan: **solo cosmético y comodidad**, nada de ventaja ni azar de pago, **las gemas no se retiran ni se cambian por ascuas**, el libro de movimientos es de solo lectura. Los pagos reales siguen **apagados** (`pagos_activos = false`).

### Respuesta corta (SÍ / NO)
- ¿El pase es una suscripción que cobra sola? **NO.** Se compra **una vez por temporada**, con gemas. Si no lo compras, no pasa nada.
- ¿El pase da ventaja en el juego? **NO.** Solo marcos, fondos, insignias, títulos, ascuas y algunas gemas.
- ¿Se puede jugar sin pagar? **SÍ.** La pista gratis siempre existe.
- ¿Ya está construido? **SÍ** en el código (pestaña «Pase» en la tienda y botón «Hacer premium» en el torneo). La migración 123 está aplicada y probada (ver docs/economia/ECONOMIA-FASE-E.md). Lo de propinas y overlay para TikTok es **solo papel** (abajo).

---

### 1. Phoenix Pass (pase de temporada)

#### Cómo funciona (en simple)
1. Hay una **temporada** con fecha de inicio y fin (la primera dura 60 días).
2. Cada vez que juegas y ganas XP, subes de **nivel del pase** (1 nivel cada 100 XP, 30 niveles). La XP que cuenta es solo la ganada **dentro de la temporada**; la XP vieja no cuenta.
3. En cada nivel hay **dos premios**: uno de la **pista gratis** y otro de la **pista premium**.
4. Todos reclaman la pista gratis. La premium se reclama solo si compraste el pase.
5. Si compras el pase a mitad de temporada, **puedes reclamar los premios premium de los niveles que ya alcanzaste** (no pierdes nada por comprar tarde).
6. Al terminar la temporada hay **7 días de gracia** para reclamar lo ya ganado. Después, la temporada se cierra y los premios que no reclamaste se pierden (si otra temporada empieza antes de que acabe la gracia, la gracia se corta ahí: dejar un hueco de fechas entre temporadas). Lo que reclamaste es tuyo para siempre.

#### Precio
| Concepto | Valor propuesto | Equivale a |
|---|---|---|
| Pase de temporada | **150 gemas** | ≈ S/ 13,60 (Brasa = 110 gemas por S/ 10) |
| Gemas de regreso (pista premium) | **60 gemas** repartidas en 6 niveles | el pase cuesta neto **90 gemas ≈ S/ 8,20** si llegas al nivel 28 |
| Rango permitido por la regla | S/ 9,90 – S/ 14,90 → entre **110 y 165 gemas** | el administrador puede cambiarlo por temporada |

Por qué las «gemas de regreso»: es una razón honesta para comprar (el pase «se paga solo» si juegas), sin ser azar ni ventaja. **Gemas en la pista gratis: NO**, porque sería una fuente gratuita de gemas (moneda de dinero real).

#### Qué trae la primera temporada («Despegue»)
- **Pista gratis:** ascuas en 27 niveles (40, 80 y 120 por tramo de 10 niveles: 2 160 en total) y 3 objetos ya existentes en la tienda (niveles 10, 20 y 30).
- **Pista premium:** 6 objetos **exclusivos del pase** (marco, fondo, insignia, título, color de clan y un marco legendario final), ascuas extra y 60 gemas de regreso.
- Los objetos exclusivos **no se pueden comprar en la tienda**; solo salen del pase (se esconden de la lista y quedan en tu inventario). Los de otras fases (efectos de carta, banners, sonidos de chat) se pueden añadir al pase sin cambiar nada: el premio apunta a «un objeto de la tienda por su clave».

#### Lo que NO hace el pase
- No cobra en automático. No hay renovación.
- No vende niveles con dinero («saltar niveles»): sería presión de compra. Decisión de diseño: **no**.
- No da gemas gratis, ni ventajas de juego, ni cupos en torneos.

#### Reglas técnicas (para quien revise)
- Comprar el pase = un movimiento de **gemas negativo** en el libro con clave `pase:<usuario>:<temporada>` → imposible cobrar dos veces.
- Cada premio reclamado = un movimiento positivo (ascuas o gemas) con clave `pase:r:<usuario>:<temporada>:<nivel>:<pista>` y una fila en `pase_reclamos` con clave primaria `(usuario, temporada, nivel, pista)` → imposible reclamar dos veces, ni con dos pestañas a la vez.
- El nivel se calcula de la XP real (`xp_movimientos`) dentro de las fechas de la temporada: no existe un contador que alguien pueda editar.
- Reembolso: si el administrador devuelve un pase, lo hace con un movimiento nuevo de «reembolso» (el libro nunca se edita).

---

### 2. Torneo premium (organizadores)

#### Qué es
Una **marca «Premium»** que el organizador de un torneo compra **una vez por torneo**. Desbloquea las herramientas de presentación (todas cosméticas / de comodidad):
1. **Overlay de transmisión** (marcador, llaves y cartel de campeón listos para OBS/TikTok): la página `torneo/?id=…&overlay=1` (fase siguiente; la marca ya queda guardada).
2. **Llaves bonitas** (versión de pantalla completa para compartir).
3. **Estadísticas del torneo** (goleadores, racha, partidos jugados).
4. **Página propia** con un enlace corto y distintivo «Premium».

#### Precio
- **S/ 20 – S/ 50** según el tamaño. Propuesta inicial: **300 gemas (≈ S/ 27)** para cualquier torneo; si Fralex quiere escalones, 220 / 300 / 550 gemas (≈ S/ 20 / 27 / 50) según cupo. Se cambia en `economia_config` (`torneo_premium_gemas`) sin tocar código.
- Lo paga **el organizador (creador del torneo)** con gemas, en el panel «Opciones del organizador» → botón **«Hacer premium»**.
- Solo mientras el torneo está en inscripción o en curso. No se puede comprar para uno cancelado, terminado u oculto por el staff.
- Una sola vez por torneo (clave del libro `torneoprem:<torneo>`).
- Si el staff cancela u oculta el torneo por incumplir normas, **no hay devolución automática**: el administrador decide y, si corresponde, devuelve con un movimiento de reembolso.

#### Qué NO es
Un torneo premium **no** tiene mejores premios ni ventajas de juego; no cambia el formato, las reglas ni quién gana.

---

### 3. Patrocinio de clanes y torneos (solo diseño)
- Un patrocinador paga un **precio acordado** directamente a Fralex (Yape/transferencia/factura), **fuera de la tienda**. No pasa por gemas.
- Se muestra su **logo** en la página del torneo o del clan, con la etiqueta «Patrocinado por».
- Cómo se haría: tabla `patrocinios` (tipo clan/torneo, objetivo, nombre, logo, desde, hasta, nota) que **solo el administrador** edita; lectura pública de los vigentes.
- Riesgos: logos de marcas de alcohol, apuestas o contenido no apto para menores (la liga tiene jugadores jóvenes); derechos del logo; que el patrocinador exija «visibilidad garantizada». Regla propuesta: Fralex aprueba cada logo y el acuerdo se anota por escrito (aunque sea un mensaje).
- Pendiente de decisión (ver §6). **No se construye en esta fase.**

### 4. Propinas a creadores (solo diseño y riesgos) — REQUIERE REVISIÓN LEGAL
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

### 5. Overlay para streamers / TikTok — solo el contrato (no se construye)
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

### 6. Decisiones para Fralex (preguntas simples)
1. **Precio del pase: ¿150 gemas (≈ S/ 13,60)?** SÍ / NO (si NO: dime un número entre 110 y 165).
2. **¿Temporada de 60 días con 30 niveles?** SÍ / NO (si NO: dime cuántos días).
3. **¿El torneo premium cuesta 300 gemas (≈ S/ 27) para todos?** SÍ / NO (o prefieres 3 escalones por tamaño).
4. **¿Dejamos las propinas solo en ascuas entre jugadores, sin dinero?** SÍ / NO (el dinero real a creadores espera al abogado).
5. **¿Quieres que construya la lista de patrocinadores (solo tú la editas)?** SÍ / NO.
6. **¿Seguimos con el overlay para TikTok como extra de pago?** SÍ / NO. Si SÍ, antes hay que decidir cómo entregarlo sin subirlo a GitHub público.
7. **¿Quieres los 7 días de gracia** para reclamar al terminar la temporada? SÍ / NO.

**Respuestas de Fralex (21-oct-2026, «SÍ a todo» lo recomendado):** 1 SÍ (150 gemas) · 2 SÍ (60 días, 30 niveles) · 3 SÍ (300 gemas para todos) · 4 SÍ (propinas solo en ascuas) · 5 NO por ahora (la lista de patrocinadores espera a que haya más gente) · 6 NO por ahora (el overlay de TikTok de pago queda solo en papel) · 7 SÍ (7 días de gracia). Lo construido en la migración 123 ya era exactamente esto: no cambia nada en el código ni en la base de datos.

**Cambio el mismo día (Fralex: «Las dos cosas»):** 5 y 6 pasan a **SÍ**. Hecho en la ronda 363: lista de patrocinadores (migración 139, panel «Patrocinadores» en Moderación, solo admin; logo «Patrocinado por» en torneo y clan) y el **overlay de transmisión** para torneos premium en la web, `/overlay-torneo/?id=N` (fuente de navegador 1080×1920 en OBS o TikTok LIVE Studio: último resultado, próximos, progreso, campeón y patrocinador; se actualiza cada 15 s). El «pago» es la marca premium que ya existía (300 gemas): no hay cobro nuevo. El marcador en vivo desde el juego (`tiktok-experimento` de Link) sigue sin tocarse.

Pendiente: **copiar este documento a Drive** cuando el usuario vuelva a tener acceso.

---

## Parte 11 · Seguridad de la economía (gemas con dinero real)

> Origen: `docs/economia/SEGURIDAD-ECONOMIA.md` · último cambio cfff3d1 2026-10-21 · 3305 bytes. Copia íntegra.

Migraciones 111 (integridad), 112 (controles de riesgo) y 113 (vigilancia). Los pagos siguen **apagados** (`pagos_activos = false`) hasta cumplir la lista de abajo.

**Migración 140 (21-oct):** las ascuas solo entran por fuentes gratis (trigger `trg_libro_ascuas_solo_gratis`). Así nada comprado con dinero llega a un reto con pozo. Todo el detalle (auditoría, paso a paso, errores y riesgos legales) está en `BITACORA-DINERO-APUESTAS-Y-LEGAL.md`.

### Qué se protege y cómo

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

### Runbook
1. Entra en Tienda → Administrar → «Vigilancia del dinero». Lee la alerta.
2. Si es crítica: no actives pagos. Pulsa «Revisar ahora» y «Revisar que las cuentas cuadran» y busca el origen en `movimientos_tokens` y `ordenes_pago`.
3. Corrige solo con movimientos nuevos (reembolso o ajuste), nunca editando el pasado.
4. Resuelve la alerta con una nota de lo que comprobaste (queda en la auditoría).

### Lista antes de activar pagos reales
- [ ] Activar MFA en la cuenta de administrador desde Tienda → Administrar → «Seguridad de tu cuenta» (QR + código) y, solo después, poner `admin_exige_mfa = true`.
- [ ] Activar «Leaked password protection» y MFA en Supabase Auth.
- [ ] Repos públicos de Link/overlay en privado (acción de Fralex).
- [ ] Datos reales de Yape/Plin/banco cargados en el panel (nunca en el código).
- [ ] Términos de compra revisados por un abogado; decidir RUC/comprobantes con un contador.
- [ ] Probar un pago pequeño real de principio a fin con el administrador.
- [ ] Cero alertas críticas abiertas; auditoría con 0 diferencias.

### Pruebas
Las pruebas de las migraciones 111–113 se ejecutaron en transacciones deshechas contra la base real (resultado: todas correctas). La suite de interfaz es `node --test tests/*.test.mjs`.

---
