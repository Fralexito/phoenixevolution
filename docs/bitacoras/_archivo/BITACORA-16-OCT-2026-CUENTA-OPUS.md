# Bitácora e informe · Cuenta Opus · 13 al 16 de octubre de 2026

Para la **otra cuenta** (o cualquier IA) que continúe el trabajo. Está escrito para entender el contexto sin haber visto el chat.
Lo más nuevo siempre está al final de `REGISTRO.md`. El detalle técnico de cada ronda está en `MAPA.md` (busca «Ronda 3xx (cuenta Opus»).

---

## 0. Cómo retomar en 5 minutos
1. `git fetch && git pull --rebase origin borrador` en `Fralexito/phoenixevolution` (si dice «cannot find @astrojs/react» o «@phosphor-icons»: `npm install`).
2. Lee `CLAUDE.md`, el final de `REGISTRO.md` (busca la línea **TRASPASO** del 16-oct) y este archivo.
3. Comprueba en Supabase si FRALEX ya pegó el SQL pendiente (sección 3):
   `select to_regclass('public.ia_propuestas') bandeja, to_regclass('public.ia_chat_uso') chat, (select count(*) from cron.job where jobname='limpiar-registro-cron') limpieza;`
4. **Siguiente número libre:** migración **119** · ronda **347** (antes de usarlos, mira el final de `REGISTRO.md` y escribe «RESERVADO N»: las dos cuentas trabajan a la vez y ya chocamos 3 veces de numeración).
5. Pruebas: `npm test` (≈500 pasan, 0 fallos) · `PES_BASE=/ npm run build` (≈53 páginas).

## 1. Quién es FRALEX y cómo trabajar con él
- Se le llama **FRALEX** (nunca su nombre oficial). Español, muy simple, espaciado, ejemplos sencillos, sin dar nada por sentado, cerrar con una pregunta.
- Le cuesta la terminología nueva; si hay números o símbolos seguidos se marea. Mejor pocas cosas por mensaje.
- Nunca pedirle secretos en el chat (claves, contraseñas).
- **Si Supabase no deja aplicar algo (`apply_migration` sale «cancelled»), pasarle el SQL sin comentarios** y él lo pega en el SQL Editor. En esta sesión `apply_migration` se canceló SIEMPRE; `execute_sql` sí funciona para consultas y `update` pequeños; `deploy_edge_function` sí funciona.
- **Anotaciones (norma 16-oct):** todo lo importante va a GitHub (`docs/`, `MAPA.md`, `REGISTRO.md`). No tiene Drive por ahora; cuando vuelva, copiar también a Drive (lista en la sección 6).
- **Anotar SIEMPRE** para que la otra cuenta entienda el contexto: bitácora, informe y línea en el registro (pedido explícito del 16-oct).
- Le gusta avanzar en pasos pequeños donde vea un logro. Para cosas grandes quiere un **informe aparte del plan** antes (ver `docs/comunidad/PLAN-IA-WEB.md` como ejemplo).

## 2. Qué se hizo (en orden)

### 13-oct · Liga Máster y fotos (rondas 265–293, resumen)
- Premios, perfil de jugador premium (275), Mi club galáctico (278), Liga Máster unificada con Mi club (280), sincronización automática juego→web del lado de la web (migración 106).
- 314 jugadores **temporales** reales en los 12 clubes (`lm_jugadores`), con valores de mercado reales y medias por jerarquía (81 élite a mano + fórmula). Ficha `/futbolista/?id=` para todos.
- Fotos de Wikipedia/Commons con carrusel automático en loop (284–289; arreglo clave: Wikipedia sirve desde `thumb.wikimedia.org`).
- Vista Grandes/Compactas, filtros por línea, orden y lupas de tamaño en las cartas (290–292). «2da división» junto a Liga Sudario (293). Contactos separados En línea/Desconectados (286).

### 16-oct · Caras del juego (rondas 338–339) → guía completa en `docs/web-pes-link/MINIFACES.md`
- Con la PC de FRALEX enlazada (solo lectura) se sacaron las **minifaces del parche Conmegol** (orden del juego: livecpk `Logos` > `dt80_*` > `dt14_all`), se cruzaron con `Player.bin` y se **mejoraron con Real-ESRGAN x2**.
- 254 caras en `public/minifaces/<pes_id>.webp`; lista en `src/data/minifaces.js`; mandan sobre Wikipedia en las cartas y son la 1.ª foto de la ficha.
- **Se guardó `pes_id` en 308 jugadores** de `lm_jugadores`. ⚠️ Ya **no** borrar los jugadores con `pes_id is null` antes de importar el catálogo: el import (`sistema_lm_importar`) los actualiza por `(liga, pes_id)` sin cambiarles el club.
- Herramientas: `tools/minifaces/cpk.py` (lector de .cpk, solo lectura) y `tools/minifaces/mejorar.py`.
- Copia de trabajo que quedó en la PC: `D:\Frank\Games_\Conmegol Patch\_phoenix_web_minifaces\minifaces.zip` (se puede borrar).

### 16-oct · Prompt del sistema de datos web ↔ PES (ronda 343)
- `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md`: encargo en 6 fases (F0–F5) para que el chat de Phoenix Sync haga que estadísticas/datos viajen juego→web y web→juego (con aprobación del staff, copias, hash igual en todas las PCs). FRALEX lo iba a pegar en Claude Code del programa.

### 16-oct · Base de datos: limpieza del registro de cron (ronda 342, migración 116)
- `cron.job_run_details` crecía ~5.600 filas/día (~30 MB/mes; ya 12 MB = lo más pesado de la base) porque 4 tareas corren cada minuto. La migración 116 borra lo de más de 7 días y agenda `limpiar-registro-cron` (04:23 Lima). **Pendiente que FRALEX pegue el SQL.**
- Estado de la base al revisar: 39 MB de 500 MB, 0,65 MB de storage, 3 usuarios. Advisors de seguridad: sin errores; avisos: activar «leaked password protection» (lo hace FRALEX en el panel) y revisar 33 funciones SECURITY DEFINER ejecutables por anon.

### 16-oct · IA en la web (ronda 345) → plan y guía en `docs/comunidad/PLAN-IA-WEB.md`
Principio: **la IA prepara, FRALEX o un moderador aprueba**. La IA nunca toca dinero/gemas, sanciones ni borra.
1. **Bandeja de aprobación** `/bandeja-ia/` (grupo Staff, permiso `bandejaIA` = moderador/admin). Migración **117**: `ia_propuestas`, `ia_resumenes`, `ia_bandeja()`, `ia_revisar()` (aprobar noticia = publicarla; rechazar = queda borrador). Nadie escribe propuestas desde la web.
2. **Redacción IA v2**: la tarea programada «Redacción IA Phoenix» (`trig_015J8uKVSgYhWkSXE1P8FRZx`, 9:54 a. m. Lima) ahora escribe con picardía SOLO deportiva, hace noticias de fichajes (`lm_movimientos` 48 h), deja cada borrador en la bandeja, hasta 3 avisos/día y un resumen diario. Si la bandeja no existe aún, solo hace borradores y avisa.
3. **Chat de ayuda** `/ayuda-ia/` (FX.ayudaIA): Edge Function `ayuda-ia` **desplegada** (v2, verify_jwt=false, comprueba la sesión dentro). Sin herramientas, límites 15/persona/día y 300/día (migración **118**: `ia_chat_uso`, `ia_chat_turno` solo service_role). Sin la clave `ANTHROPIC_API_KEY` en Secrets dice «todavía no está activa».
- Revisión de seguridad independiente: nada alto ni medio; 2 detalles bajos arreglados.

## 3. Pendientes de FRALEX (lo que él tiene que hacer)
| # | Qué | Dónde | Estado |
|---|---|---|---|
| 1 | Pegar el SQL de las migraciones **116 + 117 + 118** (sin comentarios) | Supabase → SQL Editor → Run | ✅ **HECHO 16-oct 08:46** (verificado: tablas, 3 funciones y 2 tareas nuevas; registro de cron bajó de 67.252 a 42.802 filas) |
| 2 | **Paso B:** clave del chat (`ANTHROPIC_API_KEY`) con límite de gasto mensual | console.anthropic.com → Supabase → Edge Functions → Secrets | Pidió que se le recuerde: tarea programada `trig_01U25BkMjL7LVdWejUJhYgSg` el **lunes 19-oct 10:00 Lima** |
| 3 | Activar «leaked password protection» | Supabase → Authentication | Pendiente desde antes |
| 4 | Pegar el prompt `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` en el chat de Phoenix Sync | Claude Code del programa | Lo iba a hacer |
| 5 | Copiar a Drive los docs del 16-oct cuando vuelva a tener Drive | Drive | Ver sección 6 |
| 6 | Al terminar de iniciar sesión en Supabase: tenía 2 cuentas (GitHub vs correo); la buena es la que muestra la organización «Phoenix Evolution Series» | supabase.com | Resuelto («ya está») |

## 4. Pendientes técnicos (para la cuenta que siga)
- Cuando FRALEX pegue el SQL: comprobar la bandeja (`select * from ia_propuestas`), mirar el primer resumen tras las 9:54 y revisar la ejecución de la tarea programada.
- Catálogo real del parche (F1 del prompt de datos): reemplazará los datos temporales de `lm_jugadores` actualizando por `pes_id`.
- 56 jugadores sin miniface (canteranos/fichajes que el parche no trae) y 6 sin cruce (Marli Salmon, Andre Harriman-Annous, Filip Pavić, David Santos Daiber, Tynan Thompson, Cassiano Kiala).
- Ideas recomendadas a FRALEX y aún no hechas: copias de seguridad semanales de la base (el plan FREE no tiene backups y se pausa a la semana sin actividad), resultados automáticos desde el juego, «huella» del parche antes de cada partido, instalador de 1 clic, una sola cuenta para web/Link/Sync.
- Ofrecido y no confirmado: interruptor de admin entre fichajes automáticos y autorizados (necesitaría migración nueva).

## 5. Datos técnicos útiles
- Supabase `fiibiyijojkxqlsrhcil` (org «Phoenix Evolution Series», proyecto «Galaxy League», sa-east-1).
- Permisos SQL: `private.es_moderador()` (moderador/admin), `private.es_staff()` (ayudante+), `private.es_admin()`. Borradores de `noticias` solo los lee un admin por RLS.
- Tareas pg_cron: 14 (+2 nuevas con 116/118). Cuatro corren cada minuto (procesar-retos, recordar-eventos, procesar-clanes, salas-caidas).
- Formatos del juego (Conmegol 27): `.bin` = WESYS 16 B + zlib; Player.bin 312 B/registro (pid +8, nombre +251); Team.bin 1.532 B (id +0, nombre +368); PlayerAssignment 16 B (id, pid, equipo, flags). Detalle en `docs/web-pes-link/MINIFACES.md` y `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md`.
- El sandbox de la nube NO llega a `*.supabase.co` ni a `github.io` por red (usar el conector MCP de Supabase; las capturas con Playwright se hacen con datos simulados).

## 6. Lista para copiar a Drive (cuando FRALEX vuelva a tenerlo)
`docs/web-pes-link/MINIFACES.md` · `docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md` · `docs/comunidad/PLAN-IA-WEB.md` · este archivo · `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md` (de la otra cuenta).
