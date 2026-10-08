# Registro de movimientos (solo se AÑADE; nunca editar ni borrar)

Formato de cada línea:
`AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | Ronda N | Qué cambió | Archivos o migración | HECHO / A MEDIAS / PENDIENTE | Siguiente paso`

Protocolo de dos cuentas: ver `docs/REGLAS-ECOSISTEMA.md` §7.

---

## 2026-10-08 08:30 (Lima) · Cuenta A · VOLCADO DE CONTEXTO
(La «Cuenta A» es el chat del proyecto «Pagina WEB» que trabajó Liga Máster/Mercado/legal. No usó números de ronda de MAPA.md: sus cambios van por commit.)

**Ramas.** `main` = ronda 170 (334574f). `borrador` = todo lo de MAPA (171–205 según su título) + lo de abajo, sin publicar. Nada de esta cuenta está en `main`. Todo está commiteado y empujado; no hay cambios locales sin subir.

**Commits de la Cuenta A en `borrador` (orden):** 61e7e34 Mercado beta (078) · 4b74bd9 Modo Mánager (079) · d23b21d rediseño Mánager · 484b0d7 token Phoenix Link en /mercado (080) · 7962872 /catalogo, /fichajes (081) · fb81f0d campos opcionales (082) · e0d424a centro de control staff + campos extra (083) · 4dd3f64 traspasos atómicos, Capa 1, huella (084) · 6768d15 firma Ed25519, /correcciones, /reportes/lote (085) · 39c6dc0 version_liga, /liga/cambios, /liga/aplicado (086) · 744ec35 clubes CPU, tope 40 (087) · ae5a2d2 rendimiento (sin fa-brands, precarga, CLS) · cffa1ff libro de dinero de clubes (088) + REGLAS-ECOSISTEMA · f906a39 equivalencias (089) · 7291b55 legal + privacidad + manifest/OG. Antes: Noticias lienzo (075–077), pilares, Central con barra de saltos, Mi cuenta.

**Base de datos.** Aplicado y verificado: 078–089 de la Cuenta A (088/089 pegados por Fralex en el SQL Editor; 081–083 y 087/087b por MCP). Edge Function `mercado` v10 desplegada por Fralex (incluye /v1/equivalencias, probado: 401 sin token). `phoenix` v9 con version_liga. Clave Ed25519 en `private.mercado_claves` (pública `emHq6k0YsiAANBET5YCgehooR0O4MvpdpOSAbnlxDAQ=`, id `k67bd032d50`). SQL entregado y NO aplicado: ninguno. Datos demo en lm_clubes/lm_jugadores (38 jugadores, clubes «Demo …»): borrar cuando llegue el catálogo real.

**⚠️ Hallazgo al hacer este volcado:** otra cuenta aplicó por MCP `088_endurecer_permisos_tablas`, `089_cumplimiento_legal_y_derechos_datos` y `089_legal_privacidad` (solicitudes_privacidad, aceptaciones con autorización de tutor, `mi_aceptacion_legal`, `solicitar_derecho`, `exportar_mis_datos`…) **sin subir archivos ni código al repo**. La Cuenta A construyó encima (sin saberlo) páginas `/legal/*`, casilla en el registro, «Tus datos y derechos» en Configuración y panel en Moderación usando esas funciones. **Riesgo de trabajo duplicado** si la otra cuenta también hizo páginas legales: comparar antes de que empuje. Detalle en `supabase/migrations/REGISTRO_DESFASES.md`.

**Decisiones (Fralex):** Liga Máster solo Galaxy League (Sudario quizá después), opcional por jugador. Phoenix Mercado se prueba aparte y luego entra en Phoenix Link; «Exigir código manager» como seguridad extra. Club oficial = `lm_clubes` (`equipos`/`transferencias` vacíos, no usar). `jugadores` = personas; `lm_jugadores` = futbolistas (Phoenix ID). Clave privada Ed25519 solo en el servidor. Lo confirmado por el staff en equivalencias nunca lo pisa un informe. Descartado del prompt de «auditoría integral»: banner de cookies (no hay rastreadores), paleta naranja (identidad Galaxy), guía de vibe coding, React/Next, Zod/DOMPurify, cabeceras (GitHub Pages no las permite). Fralex hace su parte legal; los textos de `src/data/legal.js` son una base, no asesoría.

**Fralex hizo fuera del chat:** pegó SQL 078–080, 084–086, 088, 089 en el SQL Editor; desplegó `mercado` y `phoenix`; conectó la carpeta save de PES; borró el dispositivo de prueba PRUEBA-CLAUDE.

**Pendientes:** probar Mánager con 2–3 DTs; «Súbelo». Chat Mercado: subir catálogo real antes de equivalencias, informe en lotes ≤3000. Web opcional: salto CLS en Liga (0.18 en PC); selector de club CPU al vender (hoy un prompt numérico… usa diálogo propio); pantalla staff para Capa 1; en `lm_club_libro` los cambios a mano por SQL salen como «traspaso» (cambiar a «sin_motivo»).

**Trampas conocidas:** `apply_migration`/SQL grande por MCP se cancela → entregar .sql. Las migraciones pegadas a mano no aparecen en la lista de Supabase. `dispositivos_host.suspendido/revocado` son fechas, no booleanos. Upsert con índice único parcial falla: usar UNIQUE completo. Cambiar firma de una función exige `drop function`. Un commit de otra cuenta (d9c742e HeroPodio) rompió Central y se revirtió. Sandbox sin Supabase: los números de rendimiento no incluyen datos reales.

**No verificado / no recuerdo:** qué hizo exactamente la otra cuenta en la web; si existen `claude/ESTADO-ACTUAL.md` y `claude/smash-soda-producto.md` (no están en el repo); el contenido de las rondas 183–205 de MAPA (no las hizo esta cuenta).

---
2026-10-08 08:40 (Lima) | Cuenta A | — | Registro creado, protocolo de dos cuentas, desfases de migraciones, ECONOMIA actualizada | REGISTRO.md, docs/REGLAS-ECOSISTEMA.md, supabase/migrations/REGISTRO_DESFASES.md, ECONOMIA.md, MAPA.md, CLAUDE.md | HECHO | La otra cuenta: leer este registro, subir sus 088/089 renumerados (090/091) y comparar su trabajo legal con /legal/*
2026-10-08 08:40 (Lima) | Cuenta A | — | RESERVADO migración 092 en adelante libre; 090–091 reservadas para renumerar las de la otra cuenta | — | PENDIENTE | —
2026-10-08 08:22 (Lima) | Cuenta A | WEB | Protocolo de 2 cuentas × 3 frentes (WEB, LINK, MERCADO) con prompts para cada chat | docs/PROTOCOLO-MULTICUENTA.md; proyecto claude/PROTOCOLO-MULTICUENTA.md y claude/mercado-api.md | HECHO | Fralex pega los prompts en WEB-B, LINK-A/B y MERCADO-A/B
2026-10-08 08:25 (Lima) | Cuenta A | WEB | Protocolo instalado en el fork: COORDINACION.md + CLAUDE.md + bitácoras REGISTRO-LINK.md (rediseño-phoenix-portal a79383c) y PhoenixMercado/REGISTRO.md (mercado-fase0 3fa36dc) | repo smash-soda-fork | HECHO | Chats LINK y MERCADO completan sus volcados
2026-10-08 08:48 (Lima) | Cuenta A | WEB | Salto de página (CLS) en PC: data-sesion unificado a 'si'/'no' (navbar ponía 'no' y el CSS de contactos lo tomaba como sesión → 271 px de relleno un instante; además ocultaba .solo-invitado sin sesión). Liga 0.18→0.01, resto ~0 | chatFlotante.css, components.css, Layout.astro, chatFlotante/index.js | HECHO | Siguiente web: selector de club CPU al vender, pantalla Capa 1, motivo «sin_motivo» en lm_club_libro
2026-10-08 08:49 (Lima) | Cuenta A | WEB | Fuera ventanas nativas: nuevo diálogo elegir() (lista con buscador) para vender a la CPU; ofertas y rechazo de reportes con pedirTexto | core/dialogo.js, pages/manager.js, pages/mercado.js | HECHO | Siguiente: pantalla staff Capa 1 (traspasos reales) y motivo «sin_motivo» en lm_club_libro (SQL)
2026-10-08 08:54 (Lima) | Cuenta A | WEB | Menú: Jugadores pasa a Competir; Mis salas sale de Jugar (sigue en Mi cuenta, renombrada «Phoenix Link»); «Modo Mánager» → «Liga Máster» (menú, título y textos); Tienda sin cambios por decisión de Fralex | data/site.js, pages/manager.astro, pages/mis-salas.astro, mercado.astro/js, manager.js | HECHO | Ordenar el interior de páginas con capturas de Fralex
2026-10-08 09:01 (Lima) | Cuenta A | WEB | RESERVADO 092 (optimización BD: RLS initplan, índices FK, revocar lm_* a anon) | — | PENDIENTE | —
2026-10-08 09:02 (Lima) | Cuenta A | WEB | 092 aplicada por MCP: 7 políticas RLS con (select auth.uid()) (aviso del analizador: 7→0), 16 índices en FK (87→71 avisos, el resto son tablas vacías/viejas), lm_cambios_desde/lm_huella/lm_huella_texto/lm_plantillas cerradas a anon y usuarios (solo service_role), eq_tabla con search_path, libro de dinero: cambio sin motivo = 'sin_motivo' | supabase/migrations/092_optimizar_rls_indices.sql | HECHO | Fralex: activar protección de contraseñas filtradas en Supabase Auth; decidir si borrar el esquema backup_20261003
2026-10-08 10:18 (Lima) | Cuenta A | WEB | RESERVADO 093 (aviso de amistad huérfano) | — | PENDIENTE | —
2026-10-08 10:18 (Lima) | Cuenta A | WEB | 093: aviso «quiere ser tu amigo» se borra si la solicitud desaparece (trigger after delete en amistades) + limpieza de huérfanos. Causa del reporte de Fralex: la solicitud de Cataclysmo se canceló y el aviso quedó | supabase/migrations/093_amistad_notif_huerfana.sql | A MEDIAS | MCP canceló: Fralex debe pegar 093 en SQL Editor; luego verificar que la notif 124 desapareció
