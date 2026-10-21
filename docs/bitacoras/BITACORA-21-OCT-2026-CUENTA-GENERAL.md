# Bitácora e informe · Hilo «Revisión completa» (proyecto Phoenix Evolution Web & APP) · 21 de octubre de 2026

Esta bitácora es para la **otra cuenta**, o para cualquier IA o persona que continúe el trabajo. Está escrita para entender **todo lo que se hizo el 21-oct** sin haber visto el chat.

Complementa `REGISTRO.md` (una línea por cambio) y estos dos documentos del mismo día:
- `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md`: la revisión de Drive, GitHub y Supabase.
- `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md`: la base para continuar.

> **Norma de Fralex (20-oct, repetida el 21-oct):** todo va a GitHub **y** a Drive, «tal cual lo estaba haciendo», para que «cualquier humano o IA pueda replicar todo a la perfección».

---

## 0. Cómo retomar en 5 minutos

1. Lee `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md`. Trae las reglas, los 5 límites, el estado de cada frente y el orden de pasos.
2. La memoria de Claude está en `C:\Users\WinterOS\.claude\projects\D--Frank-IA-CLAUDE\memory\` (37 archivos, índice `MEMORY.md`). Solo se carga sola si la sesión se abre en `D:\Frank\IA\CLAUDE`.
3. El paquete para proyectos de claude.ai está en `D:\Frank\IA\CLAUDE\para-proyecto`. Se regenera con `ACTUALIZAR_PARA_PROYECTO.ps1`. Hay una copia comprimida en la biblioteca del proyecto: `para-proyecto-21-oct-2026.zip`.
4. Drive se sube con **Google Drive para escritorio**. Se abre con `C:\Program Files\Google\Drive File Stream\133.0.2.0\GoogleDriveFS.exe` y monta la unidad `H:` (cuenta frankchoy11). Luego se copian los archivos a `H:\Mi unidad\…`.

---

## 1. Qué se hizo hoy (en orden)

| Hora (Lima) | Qué | Dónde / commit | Estado |
|---|---|---|---|
| 14:20 | **Revisión completa en solo lectura** de Drive, los 4 repos de GitHub (ramas, issues, PRs, releases) y Supabase (tablas, RPC, funciones edge, migraciones, avisos) | `docs/bitacoras/INFORME-REVISION-GENERAL-21-OCT-2026.md` | HECHO |
| 14:30 | **Lectura de todas las memorias** de Claude y de los `CLAUDE.md` de cada repo, más la base para continuar | `docs/guias/GUIA-RETOMAR-PROYECTO-21-OCT-2026.md` | HECHO |
| 14:33 | (otro hilo) **Link 0.3.41–0.3.44 commiteado**: hasta 16 puestos (experimental) y arreglo de «no se podía vincular la cuenta» | `Fralexito/smash-soda-fork` rama `plan-ux`, `06a673d` | HECHO |
| 14:38 | Corregida la norma de informes de la web: ahora van a GitHub **y** a Drive | `CLAUDE.md`, `a7f1aa4` (rama `borrador`) | HECHO |
| 14:40 | **Corregidas 5 memorias**: los 4 repos son públicos, se permite el push, Link va en `plan-ux`, la regla «sin git push» quedó superada y se quitó un duplicado de `MEMORY.md` | carpeta de memoria (fuera de git) | HECHO |
| 14:45 | Corregidos `CONTEXTO_PHOENIX.md` (37 cambios sin commit y copia vieja `C:\dev\pes-rediseno`), `contexto/SUPABASE.md` (406 funciones), `contexto/HILOS.md` (overlay sin release) y los capítulos 02 y 04 del libro (regla de push, `App-galaxy-` vacío) | `D:\Frank\IA\CLAUDE`, `LIBRO_PERSONAL` | HECHO |
| 14:52 | Guías de Link y Sync al día: rama `plan-ux`, Sync en vez de Mercado, y compilar con `cmake`, nunca con `COMPILAR_PHOENIX.bat` | `plan-ux` `8c444f0`; `mercado-fase0` `c522386` → `053eb84` | HECHO (ver §3, error corregido) |
| 14:57 | Paquete `para-proyecto` puesto al día y subido comprimido a la biblioteca del proyecto | `para-proyecto-21-oct-2026.zip` | HECHO |
| 14:46–15:12 | (hilo de la web, en la nube) Beta **1.14.0** (Jugadores con panel lateral y vista Lista), **1.15.0** (patrocinadores, overlay de torneo premium y 8 caras nuevas) y ronda 363: migración **139a aplicada**, **139b entregada** para el SQL Editor | `fe13a15`, `5a12066`, `4632a43` (hilo «Decisiones pendientes de la web»; ya en `borrador`) | HECHO en su hilo |
| 15:15 | Esta bitácora, el informe y la guía en GitHub, y **subida a Drive de todo lo pendiente desde el 15-oct** | este commit y Drive (§4) | HECHO |

---

## 2. Estado de cada frente al cierre (comprobado)

- **Web:**
  - `borrador` está en la **Beta 1.15.0** (ronda 363, patrocinadores y caras nuevas, del hilo «Decisiones pendientes de la web»), más los documentos de hoy.
  - Migración 139 aplicada completa por el hilo de la web (139a, 139b y 139c por MCP) y probada; ya no hay que pegar nada. Luego subió a la **Beta 1.15.1**.
  - `main` sigue en la ronda 275 (13-oct).
- **Link:** 0.3.44 subida (`06a673d`). Ya no depende solo de esta PC.
- **Mandos 9–16 en PES:**
  - Módulo Sider `phoenix_mandos_fase1.lua` v0.9.14, punto seguro (`modulo_sider\RESPALDO_v0.9.14_punto_seguro_20261020.lua`).
  - La pantalla de lados funciona y los mandos 9+ ya tienen ranura y jugador, pero el jugador no se mueve.
  - Hipótesis: falta el «número de usuario local» de la ranura (desplazamiento 0x180).
  - Está preparada la prueba `prueba_usuario7.ps1`, que es reversible con `-Deshacer`. Falta la prueba en vivo de Fralex.
- **Sync:** `mercado-fase0` al día (phoenix.lua v0.18c).
- **Supabase:**
  - Datos: 42 MB, 3 usuarios, 185 tablas con RLS y 10 funciones edge.
  - Migraciones: 125 registradas hasta la 138, más la 139 (en 3 partes: 139a, 139b, 139c) aplicada hoy por el hilo de la web.
  - Avisos: sin novedades frente al 21-oct de `contexto/SUPABASE.md`.

---

## 3. Errores del día y cómo se corrigieron

- **Guía de Sync pisada (14:52):**
  - Qué pasó: se copió la `CLAUDE.md` y la `COORDINACION.md` de Link sobre las de Sync, creyendo que eran iguales. No lo eran: la de Sync tiene secciones propias (nombre Phoenix Sync, buzón de recarga, pedidos a Link). Quedó en el commit `c522386`.
  - Cómo se corrigió: en el siguiente commit (`053eb84`) se restauró la versión de Sync con `git checkout c522386~1 --` y se aplicaron solo los cambios puntuales. No se perdió nada.
  - **Lección:** antes de copiar un archivo entre ramas, comparar con `cmp`. Que tengan el mismo nombre no quiere decir que tengan el mismo contenido.
- **Rutas con barras perdidas:**
  - Qué pasó: al editar con `sed` o `node -e` desde Bash, las `\` de rutas Windows desaparecieron (por ejemplo, `C:devpes-rediseno`).
  - Cómo se corrigió: con el editor de archivos.
  - **Lección:** para rutas de Windows usar la herramienta Edit o Write, no `sed` ni `node -e` desde Bash.
- **El control de permisos** bloqueó primero la edición de las guías de Link (carpeta de otro hilo) y el script `ACTUALIZAR_PARA_PROYECTO.ps1`, que borra y recrea la carpeta. Se resolvió así:
  - Las guías se editaron cuando Fralex dijo «corrige todo».
  - El paquete se actualizó copiando archivo por archivo.

---

## 4. Drive: qué se subió hoy

Unidad `H:\Mi unidad` (Google Drive para escritorio, cuenta frankchoy11). El detalle de carpetas y archivos está en el capítulo `cap_15_diario_21_oct.md` del libro y en `LIBRO_PERSONAL\_estado_subida_drive.md`.

---

## 5. Decisiones pendientes de Fralex

1. **Apuestas y dinero real:**
   - Hay apuestas con comisión y recargas con dinero real (hoy en 0, con `pagos_activos=false`).
   - Antes de encender los pagos hay que separar las monedas de apuesta de las compradas, o apagar las apuestas.
2. **Repos públicos:** decidir si se pasan a privados. Los 4 lo son.
3. **Seguridad del panel (lo cambia él):** «Leaked password protection» y `admin_exige_mfa`.
4. **Mandos 9+:** la prueba en vivo con la fila 13.
5. **Web:** decidir cuándo «Publícalo» (`borrador` → `main`). La 139 ya está aplicada.
