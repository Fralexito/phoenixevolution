# Plan del sistema de monedas virtuales — Phoenix Evolution Series

> Fecha: 16-oct-2026. Estado verificado hoy en la base «Galaxy League» (solo conteos y estructura, sin datos de personas) y en el código de la copia `pes-liga-automatica` (ronda 274). Complementa `ECONOMIA.md` (lo construido) con **lo que falta, por fases**. No es asesoría legal.

## 1. Diagnóstico: qué hay de verdad

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

## 2. Principios que no se tocan
- Sin retiro de dinero, sin transferencias entre personas, sin cajas sorpresa, nada que cambie quién gana.
- El saldo nunca se edita a mano: solo líneas del libro, idempotentes.
- Las gemas **nunca** se apuestan ni se convierten en ascuas (ni al revés).
- Compras con dinero real solo para mayores de 18, con términos aceptados y la pasarela guardando los datos de pago.
- La economía de la Liga Máster (`lm_clubes.presupuesto`) sigue aparte.

## 3. Decisiones que hay que tomar (con recomendación)
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

## 4. Fases

### Fase 0 — Decidir (1 sesión, sin código)
Cerrar D1–D8 y los números: valor de cada gema en soles, precio en ambas monedas de los 12 objetos, tope diario de ascuas, comisión de pozos. **Salida:** tabla de precios aprobada por Fralex.

### Fase 1 — Cerrar la base (migración 106 en adelante)
- `tienda_items`: añadir `precio_ascuas`, `precio_gemas` (migrar el `precio` actual a ascuas); `comprar_item` elige el precio según la moneda y rechaza si no hay precio en esa moneda.
- `inventario`: guardar `moneda_pagada` y el precio realmente pagado.
- Renombrar textos y paquetes de «tokens» a «gemas» (columna de visualización, sin romper claves).
- Reconciliación: función `economia_auditar()` que compara la suma del libro con cada billetera y avisa de diferencias; vista para el admin.
- Límites de velocidad y de emisión diaria global (cortafuegos si algo se rompe).
- **Pruebas SQL** en `supabase/tests`: idempotencia, saldo insuficiente, doble compra, carrera de dos compras, reembolso a saldo negativo, tope diario, apuesta con y sin revisión.
- **Criterio de salida:** todas las pruebas pasan y la auditoría da 0 diferencias.

### Fase 2 — Interfaz (`tienda.js`, `perfil.js`, `api.js`)
- Cartera con **ascuas y gemas** siempre visibles; precio dual en cada objeto; etiqueta «solo gemas».
- Pestañas: Tienda · Mi inventario · Cómo ganar · **Comprar gemas** · Historial (con filtro por moneda).
- Pantalla de **retos con pozo**: proponer, aceptar, estados, revisión del staff, historial.
- Textos claros: «las ascuas se ganan jugando; las gemas se compran; no se pueden cambiar entre sí».
- **Criterio de salida:** flujo completo probado en móvil y escritorio con una cuenta de prueba.

### Fase 3 — Operación y administración
- Panel admin: emisión y gasto por día, saldo en circulación por moneda, top de compras, alertas de auditoría.
- Ajustes manuales con motivo y auditoría (ya existen; añadir vista de revisión).
- Alertas: picos de ganancia por usuario, cuentas que ganan solo contra la misma persona.

### Fase 4 — Pagos con dinero real (solo después de 1–3 y del criterio legal)
1. Elegir pasarela con la prueba sandbox (D4).
2. Completar `interpretar()` en `pago-webhook` y desplegarla con la firma HMAC (`PAGO_WEBHOOK_SECRET`); el monto lo fija el servidor.
3. Probar en sandbox: pagado, fallido, reembolso, disputa, disputa ganada, pago duplicado, pago tardío.
4. Redactar términos y política de reembolso; subir `version_terminos`.
5. Comprobantes y libro de reclamaciones según la ley.
6. Activar `pagos_activos` con un solo paquete pequeño y tope por persona al día.

### Fase 5 — Ganar desde Phoenix Link y eventos
- Reglas nuevas en `economia_reglas`: partida en sala de Link, horas de host, retos de temporada.
- Pase de temporada (sin ventaja competitiva).
- Misma idempotencia: una recompensa por persona y hecho.

### Fase 6 — Lanzamiento escalonado
1. **Beta cerrada**: 10–20 personas, solo ascuas, 2 semanas. Medir emisión, quejas y fraude.
2. Abrir gemas con compras pequeñas y monitoreo diario.
3. Abrir retos con pozo solo si el abogado lo aprueba.

## 5. Antifraude (transversal)
Ya existen: topes diarios, rivales distintos, antigüedad y partidos mínimos para apostar, comisión que retira ascuas de circulación. Añadir: detección de cuentas múltiples (dispositivo/IP prudente y legal), tope de ganancias por pareja de jugadores al día, revisión del staff por montos altos, bloqueo automático con saldo negativo.

## 6. Pruebas y calidad
Pruebas SQL (Fase 1), pruebas de interfaz con el simulador, ensayo de la pasarela en sandbox, ensayo de carga (muchas compras a la vez sobre el mismo objeto con stock), y revisión de seguridad de las funciones `security definer` (`search_path` fijo, ya aplicado).

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| Normativa de juegos y apuestas | Retos solo en ascuas sin compra ni retiro; revisión legal antes de abrirlos. |
| Fraude y granjas de cuentas | Topes, auditoría, alertas y revisión humana. |
| Inflación de ascuas | Sumideros y meta de emisión (D8). |
| Pasarela con contracargos | Saldo negativo que bloquea compras; términos claros. |
| Que nadie compre gemas | Precio dual y objetos exclusivos (D2), probado en beta. |

## 8. Lo que necesito de Fralex
1. Aprobar o ajustar D1–D8 y la tabla de precios.
2. Elegir la pasarela (o aprobar la comparación en sandbox).
3. Confirmar quién revisa lo legal en Perú.
4. Decidir cuándo pasar la web a `main` (la economía vive en la vista previa `/fase-beta/`).

## Registro
- 2026-10-16: plan creado tras verificar la base en vivo y el código (hallazgos de la sección 1).

- 2026-10-16: **Fase 1 HECHA** (migración 108 aplicada y probada; ver `supabase/tests/108_economia_fase1_test.sql`). Siguiente: Fase 2 (interfaz con las dos monedas) y recargas (`docs/economia/DISENO-RECARGAS.md`). Pendiente de Fralex: aprobar D1–D8 por escrito y elegir pasarela.

- 2026-10-16: **R1 (base) HECHA** — migración 109 aplicada y probada. Siguiente: interfaz (Tienda → «Comprar gemas», cola de pagos en el panel admin) y beta cerrada solo con ascuas.

- 2026-10-16: **Fase 2 HECHA (interfaz).** Tienda con las dos monedas, pestaña «Comprar gemas» y panel de recargas del administrador; precios acordados aplicados (migración 110). Pendiente: beta cerrada solo con ascuas, datos reales de cobro (número de Yape/Plin), tarea de vencimiento con pg_cron, pasarelas (R2) y comprobantes.
