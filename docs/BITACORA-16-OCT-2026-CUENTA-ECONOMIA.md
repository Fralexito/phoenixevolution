# Bitácora e informe · Cuenta ECONOMÍA (chat «D:\Frank\IA\CLAUDE») · 14 al 16 de octubre de 2026

Para la **otra cuenta** (o cualquier IA) que continúe. Escrito para entender el contexto sin haber visto el chat.
Complementa `docs/BITACORA-16-OCT-2026-CUENTA-OPUS.md` (caras, IA en la web, migraciones 116–118). Lo más nuevo siempre está al final de `REGISTRO.md`.

> **Norma de Fralex (16-oct):** todo se anota en GitHub. **No tiene acceso a Drive por ahora**; cuando lo recupere hay que **copiar también a Drive** lo de la sección 7. No olvidar.

---

## 0. Cómo retomar en 5 minutos
1. `git fetch && git pull --rebase origin borrador` en `Fralexito/phoenixevolution` (si falta algún paquete: `npm install`).
2. Lee `CLAUDE.md`, el final de `REGISTRO.md` y este archivo.
3. Vista previa publicada (fase beta): **`https://fralexito.github.io/phoenixevolution/fase-beta-1-0/tienda/`**. (La URL `/fase-beta/` NO existe; es `fase-beta-1-0`.)
4. Estado de la economía en la base (Supabase `fiibiyijojkxqlsrhcil`, Galaxy League):
   ```sql
   select (select valor from economia_config where clave='pagos_activos') pagos_activos,
          (select count(*) from economia_alertas where not resuelta) alertas_abiertas,
          (select count(*) from private.economia_diferencias()) diferencias_libro;
   ```
   Esperado hoy: `false`, `0`, `0`.
5. Pruebas: `node --test tests/*.test.mjs` (485 pasan, 0 fallos) · `npm run build` (49 páginas).
6. **Migraciones:** las de esta cuenta son 108–113 (aplicadas). Otras cuentas usaron 114 (sitio_ajustes), 116–118. Antes de crear una nueva, mira el final de `REGISTRO.md` y escribe «RESERVADO N».

## 1. Quién es Fralex y cómo trabajar con él
- Español muy simple, poco texto, ejemplos sencillos. **SÍ/NO primero**, sin exagerar. Sabe poco de programación.
- **Lo que no pueda ejecutar la IA se le da como SQL listo para pegar en el SQL Editor de Supabase** (pedido explícito del 16-oct).
- **PAUSA de pruebas dentro del juego** (15-oct, «es mucho estrés»): no pedirle partidos ni pruebas en vivo; solo Ghidra, documentos y libro.
- Mejorar Phoenix Link **dentro de su diseño**, nunca rehacerlo (es un fork de Smash Soda; Mandos, puestos grandes y panel del anfitrión son su alma).
- Los repos de Link y overlay **son públicos**: no empujar a GitHub hasta que los ponga en privado (solo commit local).
- Todo debe funcionar en **cualquier PC y parche**, no solo el de Fralex (regla 5c de COORDINACION.md).

## 2. Sistema de monedas virtuales (lo principal de hoy)
Plan de fases: `docs/PLAN-MONEDAS-VIRTUALES.md`. Diseño de recargas: `docs/DISENO-RECARGAS.md`. **Seguridad: `docs/SEGURIDAD-ECONOMIA.md`** (modelo de amenazas, runbook, lista antes de activar pagos).

### Decisiones de Fralex
- Dos monedas **separadas** que no se cambian entre sí: **ascuas** (se ganan jugando; las apuestas son solo en ascuas) y **gemas** (se compran con dinero; 1 gema = S/ 0,10; referencia 1 gema = 5 ascuas).
- Empezar con pago **manual** (Yape / Plin / transferencia con revisión del administrador); pasarelas nacionales e internacionales más adelante. Vende como **persona** (aún no tiene RUC).
- Paquetes: `gemas_100` (S/ 10), `gemas_300` (S/ 27), `gemas_700` (S/ 55). Por ahora **sin números reales** de Yape/Plin ni pagos activos: «solo quiero experimentar y ver qué tal se ve».
- «Se va a manejar dinero real» → construir **todo el sistema de seguridad y verificación**.

### Migraciones (todas aplicadas y probadas en la base real)
| N.º | Qué hace |
|---|---|
| 108 | Precio por moneda (`precio_ascuas`/`precio_gemas`), `comprar_item(p_item,p_moneda)`, `tienda_lista` con ambos precios, `admin_set_precios_item`, `economia_auditar` / `private.economia_diferencias`. |
| 109 | Recargas manuales: `pagos_metodos`, `pagos_manuales`, funciones de orden/comprobante/revisión, bucket privado `comprobantes-pago`. |
| 110 | Paquetes nuevos (100/300/700) y `admin_metodos_pago`. |
| 111 | Integridad: libro `movimientos_tokens` de solo lectura (trigger), máquina de estados de `ordenes_pago`, historial de comprobantes borrados, bitácora `economia_config_log`, permisos mínimos. |
| 112 | Controles de riesgo: `private.admin_seguro` (MFA opcional con `admin_exige_mfa`), `private.pago_banderas`, `crear_orden_metodo` con límites, `enviar_comprobante_manual(p_orden,p_referencia,p_comprobante_path,p_nombre_pagador)`, `admin_resolver_pago_manual(...,p_monto_confirmado)`. |
| 113 | Vigilancia cada 10 min (`private.economia_revisar`), tabla `economia_alertas`, `admin_alertas`, `admin_resolver_alerta`, `admin_economia_revisar_ya`, **freno de emergencia** (apaga `pagos_activos` ante una alerta crítica), `admin_set_pagos_activos` exige 0 críticas; tareas pg_cron `economia_revisar_cada_10_min` y `economia_expirar_ordenes`. |

### Límites configurados (`economia_config`)
Tope diario por persona S/ 200 · global S/ 2000 · cuenta nueva (7 días) ≤ S/ 30 por orden · ≤ 3 pendientes · ≥ 3 rechazos/semana bloquea · desde S/ 100 el admin escribe el monto recibido · vencimiento manual 24 h · `alerta_ascuas_dia` 400 · `alerta_ordenes_dia` 6 · `pagos_activos=false` · `admin_exige_mfa=false`.

### Interfaz (tienda)
Archivos: `src/pages/tienda.astro`, `src/js/pages/tienda.js`, `src/js/features/economia/{api,demo,recargas}.js`, `src/js/core/economia.js`.
- Jugador: precios en dos monedas, pestaña **Comprar gemas** (método → orden → pagar → subir captura + código + **nombre de quien pagó**).
- Administrador (pestaña **Administrar**, visible con el permiso `administrarTienda`; el rol `admin` en `perfiles`): Vigilancia del dinero (alertas, «Revisar ahora»), Pagos por revisar (con banderas y doble confirmación de monto), Métodos de pago, Precios por moneda, Auditoría.
- Modo demostración (solo desarrollo): `api.esDemo()`; los contratos del demo están en `demo.js`.

### Pruebas
- JS: `tests/economia.test.mjs` (12) dentro de la suite de 485.
- SQL (se deshacen solas, terminan con `TODO_OK_REVERTIDO`): `supabase/tests/111_integridad_test.sql`, `113_vigilancia_test.sql`. `108_...` ok. **`109_...` está OBSOLETA** (la 112 cambió el contrato). **Falta guardar las pruebas de la 112** (se ejecutaron contra la base pero no quedaron como archivo).

## 3. Lo que sigue (pendiente de la economía)
**De Fralex** (todo lo que sea SQL se le da listo para pegar):
- Activar MFA en su cuenta admin y luego `update public.economia_config set valor='true' where clave='admin_exige_mfa';`
- Activar «Leaked password protection» y MFA en Supabase Auth.
- Poner en privado los repos de Link y overlay.
- Cargar su número real de Yape/Plin (desde el panel o `update public.pagos_metodos set datos = jsonb_build_object('yape','NÚMERO','titular','NOMBRE'), activo = true where clave='manual_yape';`) y **probar un pago real pequeño**.
- Abogado (términos de compra) y contador (RUC/comprobantes).
- Encender los pagos **solo desde el panel Administrar** (en el SQL Editor el chequeo de admin no lo reconoce).

**De la IA:**
1. Escribir `supabase/tests/112_riesgo_test.sql` (límites, banderas, nombre de pagador, doble confirmación, captura única) y reescribir o borrar la 109.
2. Fase siguiente del plan: pasarela (Mercado Pago/otras) con `pago-webhook` firmado (HMAC) — ver `docs/DISENO-RECARGAS.md`. El esqueleto `interpretar()` lanza «no implementado» a propósito.
3. Retos con pozo/apuestas con gemas: **no abrir** sin revisión legal (Perú). Los regalos de TikTok no se mezclan con gemas.

## 4. Gotchas técnicos (ahorran horas)
- Patrón seguro de prueba: migración + bloque `DO` que termina en `RAISE EXCEPTION 'TODO_OK_REVERTIDO'` (todo se deshace). `execute_sql` y `apply_migration` funcionan en esta cuenta (necesitan `project_id`).
- plpgsql: `IF x > CASE … END THEN` falla (usar variable); `texto[] || 'x'` falla (usar `array_append`); evita nombres de variable iguales a columnas.
- `auditoria_staff_accion_check` solo admite `crear/editar/borrar/ocultar/rol/sancion/sistema`.
- El libro es inmutable: para probar, todo dentro de transacción deshecha.
- Si dos cuentas trabajan a la vez, `git pull --rebase` antes de empujar; `REGISTRO.md` solo se añade (en un conflicto se conservan ambos lados).

## 5. Otros frentes de este chat (resumen; el detalle está en el libro local, ver sección 7)
### PES 2021 · cancha, 4v4 y N contra N (ingeniería inversa)
- Objetivo de Fralex: descifrar todo PES 2021; campo de tamaño arbitrario y partidos **N contra N elegibles** (2v2…6v6, 4v4 estilo FIFA Street con portero).
- Hallado: control de tamaño de campo (estructura de floats en memoria; el «fuera» y la posición del portero la leen), máquina de estados `SetState` (+0x6EEBB0) = `match::anime::ActionManager` con estados con nombre, Ghidra con análisis completo del exe recortado.
- Pruebas de **tarjetas rojas** (5 partidos) para hallar el contador de jugadores en campo. Regla clave: **con menos de 7 jugadores un equipo termina el partido** → hay que desactivarla para N<7 (buscar la comparación contra 7).
- Lectura de `Judge`, `InplayDemoContact`, `Injury`: resultado negativo para el 4v4 (aún no se encontró el sitio exacto).
- **Pausa de pruebas en el juego** desde el 15-oct. Siguiente (solo estático): localizar el contador de jugadores y la comparación contra 7 con Ghidra/xrefs; módulo Sider con eventos personalizados.

### Phoenix Link (C++, repo `smash-soda-fork`, carpeta `_phoenix-link`)
- Versión actual **0.2.90** (`SmashSoda/phoenix/PhoenixBuild.h`, `kVersion`; se sube en cada cambio). Compilar con `cmake --build`, **nunca** `COMPILAR_PHOENIX.bat --force` (borra lo no commiteado).
- Cambio de hoy: pestaña **«SONIDOS CHAT»** (cambio mínimo; se decidió NO simplificar la interfaz sin saber qué confunde: se pidieron 3 cosas concretas).
- Sync es un pilar con sección propia en la UI (nunca dentro de Ajustes). `sider.ini` solo se toca con el instalador. Base de datos Phoenix-DB = copia **provisional**; cambio con `sync-publicar-oficial --base`.

### Experimento TikTok (solo experimento, reversible)
- `_phoenix-link/tools/tiktok-experimento/` (sin git): marcador/capa vertical de directo. No está conectado a gemas ni a dinero.

### Pendiente del libro
- Los avances del 15-16 oct (rojas, regla de 7, pausa, economía) están en `LIBRO_PERSONAL` local (`00_BITACORA_VIVA.md` y `cap_13_diario_15_a_16_oct.md`).

## 6. Estado de los demás hilos (otras sesiones de este chat)
- «Caras de jugadores PES: continuar»: se buscó rastro de un trabajo de caras previo y **no existe** (último cambio de `Faces` el 28-ago-2026, jugador 1631). El trabajo real de caras lo hizo la cuenta Opus (ver su bitácora y `docs/MINIFACES.md`). Falta que Fralex diga qué quiere hacer con las caras.

## 7. Pendiente de copiar a Drive (cuando Fralex vuelva a tener acceso)
Carpeta «Phoenix Link — Guías y logros» (y la del libro, id `1t5Cg5sc1gdP7ege8nVc07Oyma0lJqmwJ`):
- `docs/PLAN-MONEDAS-VIRTUALES.md`, `docs/DISENO-RECARGAS.md`, `docs/SEGURIDAD-ECONOMIA.md`, este archivo.
- Libro personal local: `D:\Frank\Games_\PRUEBA_CANCHA\informes\LIBRO_PERSONAL\` (`00_BITACORA_VIVA.md` actualizada y `cap_13_diario_15_a_16_oct.md` nuevo). Estado de la subida anterior: `_estado_subida_drive.md` (unidad `H:` no montada).
- Borrar a mano en Drive los 4 documentos «[TRUNCADO — NO USAR]» (ver `_estado_subida_drive.md`).

---

## 8. ACTUALIZACIÓN (16-oct, tarde): estado al cerrar esta cuenta

### Hecho desde la sección 7
- **Economía Fase A** (migración 119): rarezas, 16 objetos, paquetes Chispa 50/S5 · Brasa 110/S10 · Llama 300/S25 · Fénix 650/S50, bono de primera compra +50 %.
- **Fase B** (120): racha diaria, primer partido, misiones semanales, logros (todo en ascuas). Informe: `docs/ECONOMIA-FASE-B.md`.
- **Fase C** (121): efectos de carta, banners, sonidos de chat. Informe: `docs/ECONOMIA-FASE-C.md`.
- **Fase D** (122): pasarela Mercado Pago (webhook firmado, `pago-crear`, `pago-conciliar`), método `mercadopago` INACTIVO. Informe: `docs/ECONOMIA-FASE-D.md`; guía simple para Fralex: `docs/GUIA-PASARELA.md`.
- **Fase E** (123): Phoenix Pass (Temporada 1 «Despegue», empieza el 17-oct) y marca «torneo premium». Informe: `docs/ECONOMIA-FASE-E.md`; diseño y 7 preguntas: `docs/DISENO-PASS-Y-ORGANIZADORES.md`.
- **MFA:** pantalla en Tienda → Administrar → «Seguridad de tu cuenta». Fralex pidió quitar la exigencia: `admin_exige_mfa` debe quedar en `false` (verificar con una consulta; la pantalla sigue disponible).
- Estado verificado: `pagos_activos=false`, 0 alertas, 0 diferencias, 550 pruebas, 53 páginas.
- Plan completo y precios propuestos: `docs/DISENO-ECONOMIA-COMPLETA.md`.

### Decisiones de Fralex (16-oct)
- Solo cosmético y comodidad; sin ventaja en el juego ni azar de pago. Las gemas NO se retiran ni se cambian por ascuas.
- Apuestas entre jugadores: **solo con ascuas** (sin dinero). Las apuestas con dinero real NO se construyen (requieren licencia de Mincetur con garantía de millones de soles; cifras sin confirmar, ver abogado). Se evaluó: ser afiliado de una casa autorizada (futuro, sin prisa) y torneos con cuota fija y premio prefijado (competencia de habilidad; falta confirmar con abogado).
- Pagos reales a un grupo pequeño: «dentro de un mes más o menos», PERO antes hace falta empresa y RUC (ver abajo).
- Lo que la IA no pueda ejecutar se entrega como SQL listo para pegar en el SQL Editor.
- Anotar todo en GitHub; sin Drive por ahora (copiar a Drive cuando vuelva).

### Prerrequisitos legales antes de cobrar dinero real (resumen de una investigación con Gemini, SIN verificar por un abogado)
1. Constituir una empresa (S.A.C. o E.I.R.L.) y sacar RUC; régimen MYPE Tributario (el contador decide). Cobrar muchas ventas en un Yape personal sin RUC es riesgo.
2. Libro de Reclamaciones virtual visible en la portada, sin iniciar sesión.
3. Casilla obligatoria antes de pagar: entrega inmediata de gemas y pérdida del derecho de retracto.
4. Precios en soles con IGV incluido; boletas electrónicas.
5. Consentimiento (casilla no premarcada) para datos personales, política de privacidad, aviso de que el chat se modera; inscribir el banco de datos ante la autoridad de protección de datos; conservar comprobantes 5 años.
6. Aviso de que las ascuas no tienen valor en dinero y no se transfieren.
7. Revisar el uso de escudos, nombres y fotos de clubes y jugadores reales (cartas, Liga Máster) y el riesgo de PES 2021 (Konami) y del parche de comunidad.
8. Las pasarelas prohíben apuestas sin licencia: no mezclar.
Los cambios 2, 3, 4, 5 y 6 se pueden construir ya en la web.

### Pendiente (para la cuenta que continúe)
- Fralex debe responder las 7 preguntas de `docs/DISENO-PASS-Y-ORGANIZADORES.md` (pase 150 gemas, temporada 60 días/30 niveles, torneo premium 300 gemas, propinas solo en ascuas, patrocinios, overlay TikTok, 7 días de gracia). Si no responde, queda lo propuesto.
- Construir los cambios legales de la web (puntos 2–6 de arriba) y revisar imágenes de clubes.
- Pruebas SQL de la migración 112 (`supabase/tests/112_riesgo_test.sql`) y reescribir/borrar la 109.
- Diseñar el «torneo con inscripción» (cuota fija, premio prefijado) para llevar al abogado.
- Fralex: abogado, contador, empresa/RUC, secretos de Mercado Pago (guía), leaked password protection, repos de Link/overlay en privado, Drive.
- Siguiente migración libre: **124**. Antes de usarla, mirar el final de `REGISTRO.md` y escribir «RESERVADO 124».
