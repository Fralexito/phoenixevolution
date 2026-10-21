# Informe de revisión completa — Phoenix Evolution (21-oct-2026)

Solo lectura: no se editó, no se hizo commit, no se ejecutó SQL que escriba y no se tocó ningún ajuste.
Fuentes: GitHub (API pública), git local en `C:\dev`, Supabase (MCP, proyecto `fiibiyijojkxqlsrhcil`), Google Drive (conector) y el paquete `D:\Frank\IA\CLAUDE\para-proyecto`.

**Accesos:** todos los conectores respondieron. No hace falta que des ningún acceso nuevo. La PC no tiene `gh` instalado, así que GitHub se leyó por la API pública. Eso funcionó porque **los 4 repos son públicos**.

---

## 1. Resumen en 6 líneas

1. **Web:** sana. La rama `borrador` está en la Beta 1.13.0 (`abc31fa`), al día con GitHub, con la CI de pruebas y el despliegue a Pages en verde (19-oct).
2. **Link:** sigue sin commit. Hay 37 cambios sin subir en `plan-ux` (29 archivos modificados y 8 nuevos, con `kVersion` = 0.3.44). Ese commit lo lleva otro hilo.
3. **Sync:** al día. La rama `mercado-fase0` (`3305aee`, 18-oct) coincide con GitHub.
4. **Supabase:** sano y pequeño (42 MB, 3 usuarios). Tiene 185 tablas, todas con RLS, 10 funciones edge activas, 125 migraciones registradas (hasta la 138) y 16 tareas cron. No hay avisos nuevos frente a lo que dice el paquete.
5. **Drive:** al día solo hasta el 15-oct. El 21-oct se añadieron 6 respaldos (16–21 oct). Falta todo lo de Link 0.3.41–0.3.44 y el módulo de mandos v0.9.x.
6. **Riesgo principal:** los 4 repos son públicos, no solo 2 como dice la memoria. Además, la economía tiene apuestas con comisión en la base, y eso choca con «nada de apuestas con dinero real» el día que se activen los pagos.

---

## 2. Qué hay en cada sitio

### GitHub (Fralexito)
| Repo | Visibilidad | Rama por defecto | Ramas | Issues / PRs / releases | Último push |
|---|---|---|---|---|---|
| `smash-soda-fork` (Link + Sync) | **Pública** | `master` | 14: `plan-ux` (0.3.40, 19-oct), `mercado-fase0` (18-oct), `rediseño-phoenix-portal` (0.3.20), `experimental-html`, `wip-link-interfaz-web`, 2 respaldos del 08-oct y 5 `respaldo/ws-*` (18-oct) | 0 / 0 / 0. Tags: `antes-plan-ux-0.3.20` y `antes-pasada-visual-0.3.34` | 19-oct |
| `phoenixevolution` (web) | **Pública** | `main` (`f62bffa`, 13-oct) | 10: `borrador` (1.13.0), `main`, `liga-automatica`, `rediseno`, `base-v2`, `central-base-v1` y 4 `respaldo/ws-*` | 0 / 0 / 0. CI de pruebas y Pages en verde | 19-oct |
| `phoenix-overlay` | **Pública** | `main` (`30470fe`, 13-oct) | 1 | 0 / 0 / **0 releases y 0 tags** | 16-oct |
| `App-galaxy-` | **Pública** | `main` | — | **Repo vacío** (sin archivos) | 12-oct |

- `main` de la web va 6 días por detrás de `borrador`. Se publicó por última vez en la ronda 275.
- Las 9 ramas `respaldo/ws-*` son trabajo «a medias» del 18-oct. Siguen en GitHub y nadie las ha integrado ni cerrado.
- El archivo secreto `PhoenixBetaSello.h` está bien ignorado (`.gitignore:403`) y no aparece entre los archivos subidos. La rama local `respaldo-antes-de-quitar-sello` existe solo en local, y así debe seguir.

### Git local (`C:\dev`)
| Carpeta | Rama | Estado |
|---|---|---|
| `pes-liga-automatica` | `borrador` | Al día con origin. Solo `.impeccable/` sin seguimiento |
| `smash-soda-fork` (raíz) | `mercado-fase0` | Al día. Solo logs y carpetas de compilación sin seguimiento |
| `smash-soda-fork\_phoenix-link` | `plan-ux` | Al día con origin, pero con **37 cambios sin commit** (0.3.41–0.3.44) |
| `pes-rediseno` (worktree) | `rediseno` | **2 commits por detrás** de origin y sin uso desde el 10-oct |
| `phoenix-overlay` | `main` | Al día. Solo `icon-viejo.ico.bak` |

### Supabase («Galaxy League», sa-east-1, Postgres 17, ACTIVE_HEALTHY)
- Hay 185 tablas en `public`, todas con RLS. También hay 406 funciones en `public` (405 `SECURITY DEFINER`) y 12 buckets (6 públicos: avatars, fichas, noticias, muro, muro-video, stickers).
- Las tablas con más filas son `muestras_calidad` (524), `lm_jugadores` (314) y `eventos_sala` (196). Hay solo 3 usuarios.
- **Funciones edge (10, todas ACTIVE):**
  - `phoenix` (v13), `mercado` (v12), `liga` (v9), `notificar-discord` (v5), `directos` (v4), `traspasos` (v2) y `ayuda-ia` (v2).
  - `pago-crear`, `pago-webhook` y `pago-conciliar`, todas en v1.
  - Todas tienen `verify_jwt=false` salvo `notificar-discord` y `pago-crear`. Es lo esperado, porque Link y PES no usan sesión.
- **Migraciones:** hay 125 registradas, de la 001 a la `138_stickers_telegram`, frente a 137 `.sql` en el repo. El desfase ya está documentado (`REGISTRO_DESFASES.md`). La siguiente libre es la 139.
- **Cron (16, todos activos):** retos, clanes, eventos y salas-caídas corren cada minuto. Directos de Twitch, cada 5 min. Economía, cada 10 y cada 15 min. Además hay resúmenes de Discord, purgas y limpiezas.
- **Economía (`economia_config`):**
  - Pagos: `pagos_activos=false` y `pasarela_modo=prueba`. Hay 0 órdenes, 0 pagos manuales y 0 apuestas.
  - Seguridad del panel admin: `admin_exige_mfa=false`.
- **Avisos de seguridad:**
  - WARN: falta activar «Leaked password protection».
  - WARN: 41 funciones `SECURITY DEFINER` ejecutables por `anon` y 345 por `authenticated`.
  - INFO: 69 tablas con RLS pero sin políticas.
  - Todo esto coincide con `contexto/SUPABASE.md §7`. No hay nada nuevo.
- **Avisos de rendimiento (solo INFO):** 96 claves foráneas sin índice y 53 índices sin usar. También coincide con el paquete.

### Google Drive (todo de frankchoy11@gmail.com)
| Carpeta | Contenido | Última modificación |
|---|---|---|
| Phoenix Link — Guías y logros | 39 docs: guías 01–31 (Link, mandos, cancha), guías beta 1 y 2, prompt Gemini y 2 respaldos Link 16–21 oct. Algunas guías están marcadas [VIEJA] o [Resumen antiguo] | 21-oct (respaldos) / 15-oct (contenido) |
| └ LIBRO PERSONAL v1 | 58 elementos: capítulos «LP · cap_…», versión Word y 2 respaldos web 16–21 oct | 21-oct / 15-oct |
| └ Manual PES 2021 | 19 docs (M00–M17 y resumen de una página) | 15-oct |
| Phoenix Mercado — Base de conocimiento PES 2021 | Liga Máster, barras de crecimiento, Sider, ConmeGOL 26/27, notas WEB por ronda (hasta la 242) y 2 respaldos Sync 16–21 oct | 21-oct (respaldos) / 12-oct (contenido) |
| (suelto) | `SiderModMenu-v1.2.zip` | 18-oct |

En Drive no aparece «0.3.44» ni `phoenix_mandos_fase1`. El respaldo de Link llega hasta antes de los mandos 9+.

---

## 3. Estado real de cada frente

| Frente | Estado real (comprobado) | Bloqueo |
|---|---|---|
| Web | Beta 1.13.0 publicada en la vista previa (Pages en verde). `main` sigue en la ronda 275 (13-oct) | Ninguno. Decidir cuándo pasar `borrador` a `main` |
| Link | Hay 0.3.44 en local sin commit (37 cambios). En GitHub está la 0.3.40 | Tu visto bueno al commit (lo lleva otro hilo) |
| Mandos 9–16 (Sider) | v0.9.x en local. Los mandos 9+ se ven pero el jugador no se mueve | Tu prueba en vivo («listo» en su hilo) |
| Sync | `mercado-fase0` al día (phoenix.lua v0.18c) | Prueba real de fichajes (hilo 4) |
| Overlay | Código al día. **No hay ninguna release publicada** | Reempaquetar si se quiere distribuir |
| App Galaxy | Repo vacío | No hay trabajo |
| Economía | Montada (fases A–E) con pagos apagados y en modo prueba | Ver riesgos |

---

## 4. Lo desactualizado en el paquete `para-proyecto`

1. **`memoria/no-subir-a-github-publico.md`** dice que solo Link y overlay son públicos. En realidad **también lo son `phoenixevolution` (web) y `App-galaxy-`**.
2. **`pes/cap_02_reglas_trampas_y_lecciones.md` regla 10** dice «No `git push` mientras sean públicos». Eso contradice la memoria del 16-oct, que ya autorizó el push. También nombra el archivo `phoenix-dueno.flag`, que ya se cambió por estar filtrado.
3. **`CONTEXTO_PHOENIX.md` §3** dice «13 archivos sin commit en Link». Ahora son **37** (29 modificados y 8 nuevos).
4. **`contexto/HILOS.md` línea 287** dice que `phoenix-overlay` tiene el tag `v1.0.0-beta1` con un zip. En GitHub **no hay tags ni releases** en ese repo.
5. **`CONTEXTO_PHOENIX.md` §1** no lista `C:\dev\phoenix-overlay` ni el worktree `C:\dev\pes-rediseno`, que está 2 commits atrasado. Tampoco lo marca como copia vieja.
6. **`contexto/SUPABASE.md` §1** habla de «≈396 RPC públicas». Hoy hay **406 funciones** en `public`. Es un cambio menor.
7. **`pes/cap_04_mapa_de_rutas_y_servicios.md`** cita `App-galaxy-` como repo sin aclarar que está vacío.
8. Lo demás coincide: versiones (1.13.0 y 0.3.44), ramas, la migración 138, los avisos de Supabase y la lista de Drive en `INFORMES.md`.

---

## 5. Riesgos

1. **Apuestas y dinero real (límite que no se flexibiliza).**
   - La base tiene apuestas entre jugadores con comisión del 5–10 % (`apuestas_reto`, `apostar_en_reto`, `aceptar_apuesta`, `apuesta_*` en `economia_config`).
   - También tiene recargas que compran monedas con dinero real (`recarga_*` en céntimos, pasarela `pago-*`).
   - Hoy no pasa nada, porque los pagos están apagados y hay 0 apuestas. Pero si se activan los pagos con las apuestas encendidas, se estaría apostando con algo comprado con dinero real. Conviene decidir antes: o se separan las monedas de apuesta de las compradas, o se apagan las apuestas.
2. **Los 4 repos son públicos.** Cualquier `.md` con datos de la economía, la seguridad o la llave de la beta queda a la vista. Hasta ahora el sello está bien protegido.
3. **Link 0.3.41–0.3.44 solo existe en esta PC.** Son 37 cambios sin commit. Si el disco falla, se pierden. Hay que hacer el commit y el push cuanto antes, desde el hilo que lo lleva.
4. **Seguridad del panel (decides tú):**
   - «Leaked password protection» está desactivada.
   - `admin_exige_mfa=false`: el panel admin no exige verificación en dos pasos.
5. **Ramas viejas acumuladas:** 9 `respaldo/ws-*`, `wip-link-interfaz-web`, `experimental-html` y otras. Hay riesgo de confundirse al retomar trabajo.
6. **Drive va 6 días por detrás** en todo lo de mandos y Link UX.

---

## 6. Siguientes pasos recomendados (en orden)

1. Dar el visto bueno al commit y push de Link 0.3.44 en su hilo. Es lo que más protege el trabajo.
2. Decidir qué pasa con las apuestas antes de poner `pagos_activos=true`.
3. Decidir si quieres hacer privados los repos. Si es así, se hace en GitHub → Settings → General → Danger Zone → Change visibility. Si no, al menos `App-galaxy-`, que está vacío, se puede borrar o hacer privado.
4. Activar «Leaked password protection» en Supabase → Authentication y, si quieres, poner `admin_exige_mfa`. Son cambios tuyos.
5. Corregir los 7 puntos de la sección 4 con `ACTUALIZAR_PARA_PROYECTO.ps1` y retocar a mano la memoria y `cap_02`.
6. Cuando termine lo de los mandos, subir a Drive Link 0.3.41–0.3.44, el módulo de mandos v0.9.x y los docs de la web posteriores al 15-oct.
7. Más adelante: limpiar las ramas `respaldo/*` ya integradas y pasar la web de `borrador` a `main` cuando des la orden de «Publícalo».
