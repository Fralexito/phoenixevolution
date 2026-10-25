# Web Phoenix Evolution · Trabajo con varias cuentas y chats

Cómo trabajan a la vez varias cuentas y chats de Claude sobre la web sin pisarse:
- protocolo multicuenta;
- prompt de cambio de cuenta;
- reorganización del código del 18-oct;
- resumen de la web para quien llega nuevo.

> **Cómo está hecho este documento:** junta, **completos y sin recortar**, 4 documentos que antes estaban sueltos (reorganización del 21-oct-2026, por pedido de Fralex: «cada documento por tema y que tenga absolutamente completo»). Cada parte dice de qué archivo viene. Los originales siguen intactos en la carpeta `_archivo/` y en el historial de git. **Desde ahora, lo nuevo de este tema se AÑADE aquí** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir.

## Índice

- [Parte 1 · Phoenix Evolution — Trabajo con 2 cuentas y 3 chats](#parte-1-phoenix-evolution-trabajo-con-2-cuentas-y-3-chats) — origen `docs/trabajo-en-equipo/PROTOCOLO-MULTICUENTA.md` (01e6efc 2026-10-18)
- [Parte 2 · Prompt para cambiar de cuenta (sirve siempre)](#parte-2-prompt-para-cambiar-de-cuenta-sirve-siempre) — origen `docs/trabajo-en-equipo/PROMPT-CAMBIO-DE-CUENTA.md` (01e6efc 2026-10-18)
- [Parte 3 · Reorganización del código · 18 oct 2026](#parte-3-reorganizacion-del-codigo-18-oct-2026) — origen `docs/trabajo-en-equipo/REORGANIZACION-CODIGO-18-OCT.md` (801bae3 2026-10-18)
- [Parte 4 · Phoenix Evolution — Estado de la web y la base de datos (8 oct 2026, noche)](#parte-4-phoenix-evolution-estado-de-la-web-y-la-base-de-datos-8-oct-2026-noche) — origen `docs/trabajo-en-equipo/RESUMEN-WEB.md` (01e6efc 2026-10-18)
- [Parte 5 · Dos cuentas de Claude a la par: el cuaderno TRASPASO.md (24-oct-2026)](#parte-5-dos-cuentas-de-claude-a-la-par-el-cuaderno-traspasomd-24-oct-2026) — nuevo, ronda 367

---

## Parte 1 · Phoenix Evolution — Trabajo con 2 cuentas y 3 chats

> Origen: `docs/trabajo-en-equipo/PROTOCOLO-MULTICUENTA.md` · último cambio 01e6efc 2026-10-18 · 8598 bytes. Copia íntegra.

Fralex usa **2 cuentas de Claude (A y B)**. Cuando una se queda sin tokens, sigue la otra **en el mismo chat-tema**. Hay **3 frentes**, cada uno con un chat por cuenta:

| Frente | Repo / rama | Chat en Cuenta A | Chat en Cuenta B |
|---|---|---|---|
| **WEB** (página + Supabase) | `Fralexito/phoenixevolution` · `borrador` | WEB-A | WEB-B |
| **LINK** (fork Smash Soda → Phoenix Link + overlay) | `Fralexito/smash-soda-fork` · su rama de trabajo | LINK-A | LINK-B |
| **MERCADO** (Phoenix Mercado, option file ↔ Liga Máster) | `Fralexito/smash-soda-fork` · `mercado-fase0`, carpeta `PhoenixMercado/` | MERCADO-A | MERCADO-B |

### Reglas para TODOS los chats
1. **La memoria es el repo, no el chat.** Cada frente tiene su bitácora: WEB `REGISTRO.md`, LINK `REGISTRO-LINK.md` (rama rediseño-phoenix-portal), MERCADO `PhoenixMercado/REGISTRO.md` (rama mercado-fase0); en el fork, además, `COORDINACION.md` y `CLAUDE.md` (bitácora, **solo se añade**). Al empezar: `git fetch` + `git pull --rebase`, leer el final de `REGISTRO.md`. Si no existe, crearlo.
2. **Una línea por cambio**, empujada enseguida:
   `AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | Frente | Qué cambió | Archivos/migración/commit | HECHO / A MEDIAS / PENDIENTE | Siguiente paso`
   Si algo queda a medias: punto exacto y qué falta. Antes de quedarse sin tokens: commit + push + línea en el registro.
3. **Reservar antes de usar** cualquier número compartido (migración de Supabase, versión de API, número de ronda): escribir «RESERVADO N» en el registro de su repo y empujarlo. Migraciones de Supabase **solo las crea el frente WEB**; siguiente libre: **092** (090–091 reservadas para renumerar 088/089 de otra cuenta).
4. **Nadie toca la pieza de otro frente.** Si LINK o MERCADO necesitan algo de la web/base, escriben un **prompt para WEB** (y lo anotan en su registro como PENDIENTE-WEB). WEB no toca C++.
5. **Contratos:** endpoints publicados no se borran ni cambian de significado; solo se añaden campos opcionales. Fuente de verdad: `docs/web-pes-link/contrato-v1.md` (Phoenix Link) y `docs/web-pes-link/mercado-api.md` (Mercado), en el repo web. Leerlos antes de llamar a la API.
6. **Avisos cruzados solo cuando hace falta** (no constantes): si un cambio afecta a otro frente, una línea en el registro del otro repo o un prompt corto para Fralex.
7. **Principio de Fralex:** «Si algo se rompe o deja de funcionar por un cambio, mejor no lo hagas.» Compilar/probar antes de commitear. Nada a `main`/rama estable sin su permiso («Súbelo»).
8. **Copia en Google Drive (pedido de Fralex, 2026-10-08):** cada cambio importante, avance importante o contexto que otros chats necesiten se sube además como documento a la carpeta del proyecto en Google Drive (la misma donde están la base de conocimiento y los informes de Mercado). Un documento nuevo por cambio, con título «WEB — <qué> (AAAA-MM-DD HH:MM)» y lenguaje simple. Sin claves ni secretos. REGISTRO.md sigue siendo la bitácora oficial; Drive es el resumen para leer rápido.
9. **Fralex:** español, sabe poco de programación, respuestas cortas y claras; nunca pedir secretos en el chat; Windows 10/11; repos locales en `C:\dev\`.

---

### PROMPT para WEB-B (pegar al iniciar en la Cuenta B)
```
Eres WEB-B (Cuenta B) del proyecto Phoenix Evolution Series. Otra cuenta (WEB-A) trabaja el mismo repo y la misma base.
Antes de nada:
1) git fetch && git pull --rebase origin borrador en Fralexito/phoenixevolution.
2) Lee, en este orden: el final de REGISTRO.md, docs/liga-y-torneos/REGLAS-ECOSISTEMA.md (§7 protocolo de dos cuentas), CLAUDE.md, MAPA.md (sección RETOMAR), supabase/migrations/REGISTRO_DESFASES.md. Y docs/trabajo-en-equipo/RESUMEN-WEB.md (en el repo).y claude/PROTOCOLO-MULTICUENTA.md.
3) Si TÚ aplicaste antes por MCP las migraciones 088_endurecer_permisos_tablas, 089_cumplimiento_legal_y_derechos_datos o 089_legal_privacidad: súbelas al repo renumeradas como 090/091, anótalo en REGISTRO_DESFASES.md y compara tu trabajo legal con lo que WEB-A ya publicó en borrador (/legal/*, casilla al registrarse, «Tus datos y derechos» en Configuración, panel en Moderación). No dupliques: fusiona o pregunta a Fralex.
4) Siguiente migración libre: 092. Resérvala en REGISTRO.md antes de usarla.
Reglas: trabajar solo en borrador; a main solo con «Súbelo». Una línea en REGISTRO.md por cambio. Español, respuestas cortas.
Confírmame en 5 líneas el estado actual antes de cambiar algo.
```

### PROMPT para LINK-A y LINK-B (pegar en el chat del fork en cada cuenta)
```
Eres LINK-<A|B> (Cuenta <A|B>) del proyecto Phoenix Evolution. Fralex usa 2 cuentas de Claude; otra cuenta puede haber trabajado este mismo frente. Tu frente: el fork de Smash Soda (Fralexito/smash-soda-fork, local C:\dev\smash-soda-fork) que se llama «Phoenix Link» en todos lados, y su overlay. NO tocas la web, la base de datos ni la carpeta PhoenixMercado/.
Al empezar:
1) git fetch y pull de tu rama de trabajo. Lee COORDINACION.md y el final de REGISTRO-LINK.md (rama rediseño-phoenix-portal). El volcado inicial lo escribió el chat WEB desde git: complétalo debajo con lo que solo tú sabes (qué compila, qué está a medias, lo que Fralex pidió aquí).
2) Lee del proyecto: claude/PROTOCOLO-MULTICUENTA.md, claude/REGLAS-ECOSISTEMA.md y claude/contrato-v1.md (API /phoenix que usa la app; no cambia sin pedírselo a WEB).
Reglas: una línea por cambio en REGISTRO.md:
AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | LINK | Qué cambió | Archivos/commit | HECHO / A MEDIAS / PENDIENTE | Siguiente paso
Compilar sin errores antes de cada commit (VS 2026, Release x64); Windows 10 y 11. «Si algo se rompe, mejor no lo hagas.» Interfaz en español, identidad Galaxy (cian + púrpura), máx. 8 mandos. Si necesitas algo de la web/base: escribe un prompt para WEB y anótalo como PENDIENTE-WEB. Si un cambio tuyo afecta a Phoenix Mercado (que se integrará dentro de Phoenix Link), anótalo en el registro.
Antes de quedarte sin tokens: commit + push + línea en el registro.
Confírmame en 5 líneas el estado actual antes de cambiar algo.
```

### PROMPT para MERCADO-A y MERCADO-B (pegar en el chat del programa en cada cuenta)
```
Eres MERCADO-<A|B> (Cuenta <A|B>) del proyecto Phoenix Evolution. Fralex usa 2 cuentas de Claude; otra cuenta puede haber trabajado este mismo frente. Tu frente: Phoenix Mercado (repo Fralexito/smash-soda-fork, rama mercado-fase0, carpeta PhoenixMercado/, C++20), que lee/escribe el option file de PES 2021 y lo sincroniza con la Liga Máster de la web. Más adelante se integra dentro de Phoenix Link. NO tocas SmashSoda/ ni la web.
Al empezar:
1) git fetch y pull de mercado-fase0. Lee COORDINACION.md y el final de PhoenixMercado/REGISTRO.md. El volcado inicial lo escribió el chat WEB: complétalo debajo con lo que solo tú sabes.
2) Lee del proyecto: claude/PROTOCOLO-MULTICUENTA.md, claude/REGLAS-ECOSISTEMA.md y claude/mercado-api.md (contrato completo; copia de docs/web-pes-link/mercado-api.md del repo web).
Estado de la web que ya puedes usar: /v1/catalogo, /fichajes, /fichajes/aplicados, /huella, /clave-publica (Ed25519 id k67bd032d50), /plantillas, /correcciones, /reportes/lote, /liga/cambios (firmado), /liga/aplicado, /equivalencias (POST informe phoenix-mercado/emparejamiento@0.1, máx. 3000 filas por llamada, solo staff; GET para descargar lo aprobado). Phoenix ID = lm_jugadores.id. Orden: subir el catálogo real ANTES que las equivalencias.
Reglas: una línea por cambio en REGISTRO.md:
AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | MERCADO | Qué cambió | Archivos/commit | HECHO / A MEDIAS / PENDIENTE | Siguiente paso
Nunca sobrescribir el option file original (copia + verificación); modo seguro si option file y base son de parches distintos. Si necesitas algo de la web: prompt para WEB, anotado como PENDIENTE-WEB. Si afecta a Phoenix Link: anótalo para LINK. Pruebas en verde antes de commitear.
Antes de quedarte sin tokens: commit + push + línea en el registro.
Confírmame en 5 líneas el estado actual antes de cambiar algo.
```

### Cuando cambias de cuenta (lo que haces tú, Fralex)
1. En el chat que se queda sin tokens, si alcanza: «guarda todo en el registro y empuja».
2. En la otra cuenta, abre el chat del mismo frente y pega su prompt de arriba (solo la primera vez; después basta «lee el final de REGISTRO.md y sigue»).
3. Si un chat te da un prompt para otro frente, pégalo en ese chat (en la cuenta que estés usando).

---

## Parte 2 · Prompt para cambiar de cuenta (sirve siempre)

> Origen: `docs/trabajo-en-equipo/PROMPT-CAMBIO-DE-CUENTA.md` · último cambio 01e6efc 2026-10-18 · 2039 bytes. Copia íntegra.

El estado vive en las bitácoras de los repos, no en el chat. Frase corta para Fralex: **«continuemos página web phoenix»** = pegar el prompt de abajo.

### WEB — pegar en el chat de la web de la otra cuenta
```
Continuemos página web Phoenix. Eres WEB (Cuenta <A|B>) del proyecto Phoenix Evolution Series; la otra cuenta trabajó hasta ahora en el mismo repo y la misma base y tú sigues donde quedó.
1) En Fralexito/phoenixevolution: git fetch && git pull --rebase origin borrador (la rama se llama borrador; la vista previa se publica en /phoenixevolution/fase-beta-1-0/).
2) Lee: docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md y docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-WEB.md (estado y pendientes al 16-oct), el final de REGISTRO.md (la última línea «TRASPASO» dice qué quedó pendiente), docs/liga-y-torneos/REGLAS-ECOSISTEMA.md (§7), docs/trabajo-en-equipo/PROTOCOLO-MULTICUENTA.md, CLAUDE.md, MAPA.md (RETOMAR) y supabase/migrations/REGISTRO_DESFASES.md. Y docs/trabajo-en-equipo/RESUMEN-WEB.md (en el repo).
3) Antes de usar un número de migración: revisa el último en REGISTRO.md y en Supabase y escribe «RESERVADO N» (al 16-oct: siguiente libre 119; mírala siempre en REGISTRO.md).
Reglas: solo rama borrador; a main solo con «Súbelo». Una línea en REGISTRO.md por cada cambio importante, empujada enseguida:
AAAA-MM-DD HH:MM (Lima) | Cuenta <A|B> | WEB | Qué cambió | Archivos/migración | HECHO / A MEDIAS / PENDIENTE | Siguiente paso
Antes de quedarte sin tokens: commit + push + línea «TRASPASO». No toques Phoenix Link ni Mercado. Español, respuestas cortas; sé poco de programación.
Primero confírmame en 5 líneas el estado y los pendientes. No cambies nada hasta que te responda.
```

### LINK y MERCADO
Ver `claude/PROTOCOLO-MULTICUENTA.md` (bitácoras `REGISTRO-LINK.md` y `PhoenixMercado/REGISTRO.md` en el repo smash-soda-fork).

### Desde la segunda vez en el mismo chat
«Lee el final del registro y sigue.»

---

## Parte 3 · Reorganización del código · 18 oct 2026

> Origen: `docs/trabajo-en-equipo/REORGANIZACION-CODIGO-18-OCT.md` · último cambio 801bae3 2026-10-18 · 4144 bytes. Copia íntegra.

Los 122 módulos de lógica pura que estaban sueltos en `src/js/core/` ahora están en 7 carpetas por tema. Se hizo con `git mv` (el historial se conserva) y con `tools/reorganizar/mover-modulos.mjs`, que reescribió las 1.059 rutas de `import` y las menciones en comentarios y documentos (431 archivos). Comprobado: 624 pruebas, `npm run build` y las 57 páginas cargando sus 437 módulos sin un solo error de ruta.

**No cambió nada de lo que hace la web**: solo dónde vive cada archivo. `src/js/features/`, `src/js/pages/`, `src/data/` y `src/styles/` siguen igual.

### Si trabajas en una rama o carpeta anterior a este cambio

1. Fusiona `borrador` en tu rama (Git reconoce los movimientos).
2. Si alguno de TUS archivos nuevos importa `core/<algo>.js` con la ruta vieja, ejecuta:
   `node tools/reorganizar/mover-modulos.mjs tools/reorganizar/mapa-core.json --solo-rutas`
   (reescribe rutas sin mover nada). Luego `npm test` y `npm run build`.
3. Para módulos nuevos de lógica pura: créalos dentro de la carpeta de su tema (abajo), no sueltos en `core/`.

### Dónde está cada módulo ahora

#### `src/js/core/sistema/` — Base del sitio: conexión con Supabase, sesión, roles, ajustes, diálogos, avisos, buscador, escudos, avatares

`ajustes.js` · `auditoria.js` · `avatar.js` · `avisos.js` · `barraLateral.js` · `buscador.js` · `config.js` · `contador.js` · `crop.js` · `density.js` · `dialogo.js` · `dock.js` · `dom.js` · `edad.js` · `escudos.js` · `fisico.js` · `image.js` · `inclinacion.js` · `modal.js` · `notifs.js` · `pestanas.js` · `rendimiento.js` · `roles.js` · `rules.js` · `session.js` · `sitio.js` · `staffUi.js` · `supabase.js` · `toast.js` · `vacio.js`

#### `src/js/core/jugadores/` — Jugadores: estadísticas, comparar, ranking, búsqueda, perfil, historial, reputación, logros

`compare.js` · `destacados.js` · `estilo.js` · `historial.js` · `logros.js` · `participaciones.js` · `perfil.js` · `radarFifa.js` · `ranking.js` · `replica.js` · `reputacion.js` · `search.js` · `stats.js`

#### `src/js/core/competicion/` — Ligas, torneos, duelos y partidos: formatos, tablas, en vivo, salas, conexión, hosts, retos, premios

`campoVivo.js` · `central.js` · `centroPartido.js` · `conexion.js` · `crearLiga.js` · `diversion.js` · `enganche.js` · `espectadores.js` · `formatos.js` · `golesPartido.js` · `hostCatalogo.js` · `hostExtras.js` · `hostsCatalogo.js` · `ligaStats.js` · `ligaVivo.js` · `live.js` · `liveFiltro.js` · `misPartidos.js` · `partidosGlobal.js` · `premios.js` · `proximoPartido.js` · `pulso.js` · `rankingComunidad.js` · `resultado.js` · `retos.js` · `salas.js` · `schedule.js` · `tabla.js` · `tarjetaResultado.js` · `teams.js` · `temporada.js` · `torneos.js`

#### `src/js/core/comunidad/` — Chat, clanes, muro, historias, clips, red social, encuestas, eventos, moderación, IA de ayuda

`ayudaIA.js` · `bandejaIA.js` · `chat.js` · `chatFlotante.js` · `chatGeneral.js` · `clan.js` · `clips.js` · `compartir.js` · `encuesta.js` · `evento.js` · `feed.js` · `feedSocial.js` · `historias.js` · `moderacion.js` · `muro.js` · `red.js` · `social.js` · `sonidosChat.js` · `videoSubida.js`

#### `src/js/core/portada/` — Portada y noticias: diario, crónicas, plantillas, titulares, ticker, última hora

`afiche.js` · `cronica.js` · `departamentos.js` · `diario.js` · `inicio.js` · `noticias.js` · `noticiasLienzo.js` · `noticiaSocial.js` · `noticiasPlantillas.js` · `pase.js` · `portadas.js` · `tickerVivo.js` · `titulares.js` · `ultimaHora.js` · `ventanas.js`

#### `src/js/core/economia/` — Economía: ascuas/gemas, recompensas, Phoenix Pass

`economia.js` · `ganarAscuas.js` · `phoenix-pass.js`

#### `src/js/core/pes/` — Conexión con el juego (Phoenix Link/Sync): cambios oficiales, fichas, Liga Máster, clubes y plantillas PES, buzón, vestuario

`buzon.js` · `cambiosOficiales.js` · `clubesPes.js` · `fichaJuego.js` · `fichasCampos.js` · `ligaMasterPc.js` · `linkVersiones.js` · `sync.js` · `traspasosReales.js` · `vestuario.js`

---

## Parte 4 · Phoenix Evolution — Estado de la web y la base de datos (8 oct 2026, noche)

> Origen: `docs/trabajo-en-equipo/RESUMEN-WEB.md` · último cambio 01e6efc 2026-10-18 · 4967 bytes. Copia íntegra.

> Lo más reciente siempre está al final de `REGISTRO.md`. Este resumen es la foto general.

Pegar al inicio de cualquier chat que toque la web, la base o los programas. **Antes de cambiar algo: leer `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md`.**

### Básico
- Repo `Fralexito/phoenixevolution`, rama de trabajo **`borrador`**, publicada en la vista previa privada **`/phoenixevolution/fase-beta-1-0/`** (la URL `/borrador/` se retiró porque se compartía sin permiso). A `main` solo cuando Fralex dice **«Súbelo»** (aún no se ha subido lo de abajo).
- Stack: Astro + Tailwind 4 + JS vanilla + Supabase (proyecto `fiibiyijojkxqlsrhcil`). Hosting: GitHub Pages.
- Funciones experimentales con interruptores en `src/data/experimento.js` (FX).
- Migraciones en `supabase/migrations/` (última: **094**; siguiente libre **095**). Si la aplicación automática falla, Fralex pega el SQL en el SQL Editor. Edge Functions: Fralex pega el archivo y despliega.
- Commits terminan con las líneas de co-autoría de Claude.

### Quién hace qué
| Pieza | Chat dueño | Contrato |
|---|---|---|
| Web + base de datos | chat «Pagina WEB» | este repo |
| Phoenix Link (C++, salas) | chat Smash Soda / Phoenix Link | `docs/web-pes-link/contrato-v1.md` |
| Phoenix Mercado (option file) | chat Mercado (se integrará a Phoenix Link) | `docs/web-pes-link/mercado-api.md` |
Un chat no toca la pieza de otro: le pasa un prompt. Endpoints publicados no se borran ni cambian; solo se añaden campos.

### Hecho en esta etapa
- **Web:** Noticias con lienzo libre y asistente; menú por pilares; barra de saltos en Central; Mi cuenta ordenada.
- **Rendimiento:** sin fuente fa-brands (−113 KB), fuentes precargadas, menos saltos de página. Celular lento: LCP 0.6–2.3 s, CLS 0. Pendiente: salto en Liga (0.18) en PC.
- **Liga Máster / Modo Mánager** (`/manager/`, solo Galaxy League, opcional por jugador): clubes, presupuesto, ofertas, traspasos atómicos, clubes CPU, tope 40, agente libre, versión de liga + cambios firmados Ed25519, huella de plantillas, Capa 1 (traspasos reales). Centro de control del staff.
- **088 · `lm_club_libro`:** cada cambio de presupuesto de un club se registra solo (saldo antes/después, motivo, quién). Probado.
- **089 · Equivalencias entre parches:** `mercado_equivalencias` y `mercado_equivalencias_clubes`; `POST/GET /mercado/v1/equivalencias` (formato `phoenix-mercado/emparejamiento@0.x`, máx. 3000 filas/llamada, solo staff); pantalla de revisión en Modo Mánager. Lo confirmado por el staff nunca se pisa. Probado y desplegado.
- **Legal:** `/legal/terminos/`, `/legal/privacidad/`, `/legal/reglamento/` (textos en `src/data/legal.js`, base no revisada por abogado); descargo «no afiliados a Konami/EA/Discord» en el pie; casilla obligatoria al registrarse.
- **Privacidad:** Configuración → Cuenta: descargar mis datos y solicitudes (corregir, oponerse, baja, eliminar cuenta). Panel del staff en Moderación. Eliminar cuenta es manual (Supabase → Authentication → Users).
- **Presentación:** manifest, íconos de celular y vista previa Open Graph (`public/og.jpg`).

### Decisiones tomadas (no reabrir sin Fralex)
- Club oficial = `lm_clubes`. `equipos`/`transferencias` son del sistema viejo (vacíos): no usar.
- `jugadores` = **personas de la comunidad**; `lm_jugadores` = **futbolistas del juego** (Phoenix ID).
- Identidad visual Galaxy (cian + púrpura): no cambiar paleta.
- App = PWA más adelante; nada de React/Next.
- Sin banner de cookies (no hay rastreadores). Cabeceras de seguridad solo si se muda el hosting.
- Dinero real y retos con pozo: Fralex prepara la parte legal; solo mayores de 18.
- Liga Sudario fuera de la Liga Máster por ahora.

### Hecho después (8 oct, tarde)
- Menú: Jugadores en Competir; «Modo Mánager» → «Liga Máster»; «Phoenix Soda» → «Phoenix Link» (Mis salas).
- CLS en PC corregido (data-sesion si/no). Sin ventanas nativas (diálogo `elegir()`).
- 092: RLS optimizadas, índices, funciones internas de Liga Máster solo para el servidor. 093: avisos de amistad huérfanos.
- Vista previa movida a `/fase-beta-1-0/` con cinta «FASE BETA 1.0».

### Pendiente
- Fralex: Redirect URL `https://fralexito.github.io/phoenixevolution/fase-beta-1-0/**` en Supabase Auth; protección de contraseñas filtradas; GitHub Pages Source = GitHub Actions; ¿borrar `backup_20261003`?; ¿beta solo para cuentas autorizadas?; probar con 2–3 DTs; «Súbelo».
- Chat Mercado: subir catálogo real (`/catalogo`) **antes** de las equivalencias; luego mandar el informe Conmegol→Sudamerican en lotes ≤3000. Al llegar el catálogo real, borrar los datos demo.
- Web: pantalla del staff para cargar traspasos reales (Capa 1); ordenar el interior de páginas con capturas de Fralex. (Ya hechos: salto de Liga, selector de club CPU, «sin_motivo».)

---

---

## Parte 5 · Dos cuentas de Claude a la par: el cuaderno TRASPASO.md (24-oct-2026)

**Qué se logró.** Fralex trabaja Phoenix con **dos cuentas de Claude a la vez** (la de siempre, «Cuenta 1», con plan Max y proyecto de Claude Code con hilos; y una segunda, «Cuenta 2», con plan Pro, para cuando a la primera se le acaban los tokens). Ahora las dos se enteran de lo que hizo la otra con un **cuaderno compartido en GitHub**: `TRASPASO.md`, en la raíz del repo de la web, rama `borrador`. Cubre **todo Phoenix** (web, Link, Sync, PES/mandos, Supabase), no solo la web.

**Qué contiene `TRASPASO.md`:** las 4 reglas cortas; cómo saber qué cambió desde la última nota (`git log --since` y el revisor `tools/traspaso-cuentas.ps1`); la plantilla de entrada de cierre; la **tabla de candados** (un frente, una cuenta); el mapa completo de carpetas de la PC de Fralex; dónde está cada documento que manda; cómo montar la Cuenta 2; y las entradas, que solo se AÑADEN.

**Paso a paso (para replicarlo o retomarlo):**
1. Al empezar, en cada repo: `git fetch` y `git pull --rebase` en su rama (web `borrador`, Link `plan-ux`, Sync `mercado-fase0`, overlay `main`).
2. Leer la **última entrada** de la sección 8 de `TRASPASO.md` y la tabla de candados.
3. Mirar qué entró después de esa entrada: `git log --since="AAAA-MM-DD HH:MM" origin/<rama>` por repo. Con la PC conectada, correr `powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\traspaso-cuentas.ps1` (solo LEE: hace `git fetch`, nunca `pull`; lista commits nuevos y archivos cambiados fuera de git en los módulos de Sider, `PRUEBA_CANCHA`, instaladores y el hub).
4. Al terminar, al cambiar de cuenta o con pocos tokens: añadir una entrada con la plantilla (hecho, commits, lo que solo está en la PC, Supabase, a medias, lo que espera a Fralex, siguiente paso, candados) y `git push origin borrador`.
5. Montar la Cuenta 2 (una vez): kit en la PC en `C:\dev\TRASPASO-CUENTAS` y copia en la carpeta del escritorio «PHOENIX - CUENTA 2». En la cuenta Pro **no hay «Proyectos»** (la función de proyectos de Claude Code está en beta y no la tiene): se trabaja con sesiones sueltas de Claude Code web, eligiendo el repo `Fralexito/phoenixevolution` y pegando al empezar el texto corto del archivo «5 - SI NO HAY PROYECTOS…». Claude Code lee solo el `CLAUDE.md` del repo, que ya manda leer `TRASPASO.md`.

**Errores e intentos fallidos:**
- Se intentó crear el proyecto de la Cuenta 2 como «proyecto de chat» normal (la pantalla «Crear un proyecto» con Contexto): no sirve para esto, porque no tiene GitHub ni PC. Se descartó.
- El proyecto de Claude Code («Proyectos Beta») solo aparece en la cuenta Max. No se puede activar desde aquí; si algún día aparece en la Pro, se crea con los archivos 1 a 4 de la carpeta del escritorio.
- Desde la nube no se puede ejecutar `git` ni PowerShell en la PC (el puente es Linux y el `.git` de la web es un worktree con ruta de Windows). Por eso el `.ps1` del revisor **no se probó en Windows**.
- El zip del paquete de contexto (`para-proyecto-24-oct-2026.zip`) **no** se sube a GitHub: el repo es público y trae notas personales y datos de la PC.

**Cosas a tener en cuenta:**
- Un frente, una cuenta. Los frentes del juego (mandos 9–16, modo street) y de Link los lleva la Cuenta 1 con acceso a la PC; web, Link y documentos pueden ir en cualquiera.
- Antes de usar un número de migración o de ronda: revisar `REGISTRO.md`, `MAPA.md` y Supabase. **Siguiente migración libre: 144.**
- Los 5 límites no se flexibilizan (no borrar trabajo ajeno sin commit, no compilar Link con `COMPILAR_PHOENIX.bat`, no tocar ajustes de seguridad, nada de apuestas con dinero real, pedir permiso antes de algo irreversible).
- Si ninguna cuenta escribió su entrada (se acabaron los tokens de golpe), la otra reconstruye con el paso 3.

**Cómo comprobar y revertir:** comprobar con `git log --oneline -- TRASPASO.md` y leyendo la última entrada. Revertir es borrar el archivo y las líneas de «dos cuentas» en `CLAUDE.md` y `REGLAS-ECOSISTEMA.md` §7; no toca código ni base de datos.
