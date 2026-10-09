# Phoenix Evolution — Trabajo con 2 cuentas y 3 chats

Fralex usa **2 cuentas de Claude (A y B)**. Cuando una se queda sin tokens, sigue la otra **en el mismo chat-tema**. Hay **3 frentes**, cada uno con un chat por cuenta:

| Frente | Repo / rama | Chat en Cuenta A | Chat en Cuenta B |
|---|---|---|---|
| **WEB** (página + Supabase) | `Fralexito/phoenixevolution` · `borrador` | WEB-A | WEB-B |
| **LINK** (fork Smash Soda → Phoenix Link + overlay) | `Fralexito/smash-soda-fork` · su rama de trabajo | LINK-A | LINK-B |
| **MERCADO** (Phoenix Mercado, option file ↔ Liga Máster) | `Fralexito/smash-soda-fork` · `mercado-fase0`, carpeta `PhoenixMercado/` | MERCADO-A | MERCADO-B |

## Reglas para TODOS los chats
1. **La memoria es el repo, no el chat.** Cada frente tiene su bitácora: WEB `REGISTRO.md`, LINK `REGISTRO-LINK.md` (rama rediseño-phoenix-portal), MERCADO `PhoenixMercado/REGISTRO.md` (rama mercado-fase0); en el fork, además, `COORDINACION.md` y `CLAUDE.md` (bitácora, **solo se añade**). Al empezar: `git fetch` + `git pull --rebase`, leer el final de `REGISTRO.md`. Si no existe, crearlo.
2. **Una línea por cambio**, empujada enseguida:
   `AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | Frente | Qué cambió | Archivos/migración/commit | HECHO / A MEDIAS / PENDIENTE | Siguiente paso`
   Si algo queda a medias: punto exacto y qué falta. Antes de quedarse sin tokens: commit + push + línea en el registro.
3. **Reservar antes de usar** cualquier número compartido (migración de Supabase, versión de API, número de ronda): escribir «RESERVADO N» en el registro de su repo y empujarlo. Migraciones de Supabase **solo las crea el frente WEB**; siguiente libre: **092** (090–091 reservadas para renumerar 088/089 de otra cuenta).
4. **Nadie toca la pieza de otro frente.** Si LINK o MERCADO necesitan algo de la web/base, escriben un **prompt para WEB** (y lo anotan en su registro como PENDIENTE-WEB). WEB no toca C++.
5. **Contratos:** endpoints publicados no se borran ni cambian de significado; solo se añaden campos opcionales. Fuente de verdad: `docs/contrato-v1.md` (Phoenix Link) y `docs/mercado-api.md` (Mercado), en el repo web. Leerlos antes de llamar a la API.
6. **Avisos cruzados solo cuando hace falta** (no constantes): si un cambio afecta a otro frente, una línea en el registro del otro repo o un prompt corto para Fralex.
7. **Principio de Fralex:** «Si algo se rompe o deja de funcionar por un cambio, mejor no lo hagas.» Compilar/probar antes de commitear. Nada a `main`/rama estable sin su permiso («Súbelo»).
8. **Fralex:** español, sabe poco de programación, respuestas cortas y claras; nunca pedir secretos en el chat; Windows 10/11; repos locales en `C:\dev\`.

---

## PROMPT para WEB-B (pegar al iniciar en la Cuenta B)
```
Eres WEB-B (Cuenta B) del proyecto Phoenix Evolution Series. Otra cuenta (WEB-A) trabaja el mismo repo y la misma base.
Antes de nada:
1) git fetch && git pull --rebase origin borrador en Fralexito/phoenixevolution.
2) Lee, en este orden: el final de REGISTRO.md, docs/REGLAS-ECOSISTEMA.md (§7 protocolo de dos cuentas), CLAUDE.md, MAPA.md (sección RETOMAR), supabase/migrations/REGISTRO_DESFASES.md. Y docs/RESUMEN-WEB.md (en el repo).y claude/PROTOCOLO-MULTICUENTA.md.
3) Si TÚ aplicaste antes por MCP las migraciones 088_endurecer_permisos_tablas, 089_cumplimiento_legal_y_derechos_datos o 089_legal_privacidad: súbelas al repo renumeradas como 090/091, anótalo en REGISTRO_DESFASES.md y compara tu trabajo legal con lo que WEB-A ya publicó en borrador (/legal/*, casilla al registrarse, «Tus datos y derechos» en Configuración, panel en Moderación). No dupliques: fusiona o pregunta a Fralex.
4) Siguiente migración libre: 092. Resérvala en REGISTRO.md antes de usarla.
Reglas: trabajar solo en borrador; a main solo con «Súbelo». Una línea en REGISTRO.md por cambio. Español, respuestas cortas.
Confírmame en 5 líneas el estado actual antes de cambiar algo.
```

## PROMPT para LINK-A y LINK-B (pegar en el chat del fork en cada cuenta)
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

## PROMPT para MERCADO-A y MERCADO-B (pegar en el chat del programa en cada cuenta)
```
Eres MERCADO-<A|B> (Cuenta <A|B>) del proyecto Phoenix Evolution. Fralex usa 2 cuentas de Claude; otra cuenta puede haber trabajado este mismo frente. Tu frente: Phoenix Mercado (repo Fralexito/smash-soda-fork, rama mercado-fase0, carpeta PhoenixMercado/, C++20), que lee/escribe el option file de PES 2021 y lo sincroniza con la Liga Máster de la web. Más adelante se integra dentro de Phoenix Link. NO tocas SmashSoda/ ni la web.
Al empezar:
1) git fetch y pull de mercado-fase0. Lee COORDINACION.md y el final de PhoenixMercado/REGISTRO.md. El volcado inicial lo escribió el chat WEB: complétalo debajo con lo que solo tú sabes.
2) Lee del proyecto: claude/PROTOCOLO-MULTICUENTA.md, claude/REGLAS-ECOSISTEMA.md y claude/mercado-api.md (contrato completo; copia de docs/mercado-api.md del repo web).
Estado de la web que ya puedes usar: /v1/catalogo, /fichajes, /fichajes/aplicados, /huella, /clave-publica (Ed25519 id k67bd032d50), /plantillas, /correcciones, /reportes/lote, /liga/cambios (firmado), /liga/aplicado, /equivalencias (POST informe phoenix-mercado/emparejamiento@0.1, máx. 3000 filas por llamada, solo staff; GET para descargar lo aprobado). Phoenix ID = lm_jugadores.id. Orden: subir el catálogo real ANTES que las equivalencias.
Reglas: una línea por cambio en REGISTRO.md:
AAAA-MM-DD HH:MM (Lima) | Cuenta A/B | MERCADO | Qué cambió | Archivos/commit | HECHO / A MEDIAS / PENDIENTE | Siguiente paso
Nunca sobrescribir el option file original (copia + verificación); modo seguro si option file y base son de parches distintos. Si necesitas algo de la web: prompt para WEB, anotado como PENDIENTE-WEB. Si afecta a Phoenix Link: anótalo para LINK. Pruebas en verde antes de commitear.
Antes de quedarte sin tokens: commit + push + línea en el registro.
Confírmame en 5 líneas el estado actual antes de cambiar algo.
```

## Cuando cambias de cuenta (lo que haces tú, Fralex)
1. En el chat que se queda sin tokens, si alcanza: «guarda todo en el registro y empuja».
2. En la otra cuenta, abre el chat del mismo frente y pega su prompt de arriba (solo la primera vez; después basta «lee el final de REGISTRO.md y sigue»).
3. Si un chat te da un prompt para otro frente, pégalo en ese chat (en la cuenta que estés usando).
