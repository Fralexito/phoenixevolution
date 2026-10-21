# Informe de seguridad y de cambios sin commit — 21-oct-2026

Hilo «Seguridad y cambios sin commit» (puntos 4 y 7 de la revisión general). Todo lo que se dice aquí se comprobó el 21-oct-2026 entre las 15:30 y las 16:30 (Lima).

## 1. Resumen en 6 líneas

1. **NO hay claves filtradas** en los 4 repos públicos ni en su historial completo.
2. **Supabase está bien protegido**: ningún aviso grave. Se añadió RLS a las 2 tablas de `private` (migración 141).
3. Se quitó el correo personal de Fralex de 2 documentos públicos (queda en el autor de 4 commits antiguos, ver §2.3).
4. **Fralex debe hacer 2 cosas a mano** (son ajustes de seguridad): activar los 2 pasos en sus cuentas y, si el plan lo permite, la protección de contraseñas filtradas (§4).
5. Entorno de pruebas recomendado: **un segundo proyecto Supabase gratis** (0 USD) (§5).
6. Nuevo script `tools/revisar-sin-commit.ps1` para que no se acumulen cambios sin commit (§6).

## 2. Repos públicos de GitHub

Los 4 repos de `Fralexito` son públicos: `phoenixevolution` (675 commits, 11 ramas), `smash-soda-fork` (801 commits, 14 ramas), `phoenix-overlay` (40 commits) y `App-galaxy-` (vacío, 0 commits).

### 2.1 Cómo se revisó
Se clonó una copia espejo de cada repo (todas las ramas) y un script leyó **todos los archivos de todas las versiones del historial** (4.983 + 8.411 + 464 archivos distintos). Buscó: claves JWT de Supabase (y decodificó su rol), `sb_secret_`, `service_role`, tokens de GitHub, claves de Anthropic/OpenAI, Stripe, AWS, Google, Slack, webhooks y tokens de Discord, claves privadas, URLs de Postgres con contraseña, asignaciones `password=`/`token=`, archivos `.env`, `.pem`, `.key`, bases de datos, correos, teléfonos de Perú, DNI, números de cuenta y documentos (PDF, Word, Excel, CSV, ZIP).

### 2.2 Resultado
| Qué | Resultado |
|---|---|
| Claves secretas (service_role, sb_secret, tokens) | **Ninguna** en ningún commit |
| Clave de Supabase en la web | Solo `sb_publishable_…` (pública por diseño, la protege el RLS) |
| La palabra `service_role` | Solo en documentación y migraciones que explican que **no** se debe usar en el cliente |
| `TOKEN = 'aaa.bbb.ccc'` | Valor falso de una prueba (`tests/worker-videos.test.mjs`) |
| `Token="6595b64144ccf1df"` en phoenix-overlay | Es el identificador estándar de Microsoft en el manifiesto de Windows, no un secreto |
| Teléfonos, DNI, cuentas bancarias | Ninguno (el único número parecido es un tamaño de archivo en una huella de PES) |
| Documentos | 3 PDF: `Formatos-Phoenix-Evolution.pdf` y 2 copias de `base-conocimiento-PES21.pdf`. Son documentación del proyecto, no privados |

### 2.3 Correo personal
- Aparecía `frankchoy11` en 3 líneas de 2 documentos de hoy (`BITACORA-21-OCT-2026-CUENTA-GENERAL.md` e `INFORME-REVISION-GENERAL-21-OCT-2026.md`). **Corregido** con un commit nuevo («la cuenta de Google de Fralex»).
- También figura como **autor de 4 commits antiguos** (1 en phoenixevolution y 3 en phoenix-overlay). Quitarlo exige reescribir el historial, que es irreversible y rompe los clones de los otros hilos. **Recomendación: no reescribir**; el riesgo es bajo (es un correo, no una clave). Para el futuro, en GitHub → Settings → Emails, activar «Keep my email addresses private» y «Block command line pushes that expose my email» (ajuste de cuenta: lo hace Fralex).

## 3. Supabase (`fiibiyijojkxqlsrhcil`)

### 3.1 Avisos de seguridad
| Aviso | Cantidad | Qué significa | Decisión |
|---|---|---|---|
| RLS activo sin políticas | 69 tablas | Es **a propósito**: nadie las lee directo, todo pasa por funciones RPC | Correcto, no se toca |
| Funciones SECURITY DEFINER que puede llamar `anon` | 41 | Todas son de **solo lectura pública** (rankings, perfiles públicos, muro, tienda, clave pública del mercado) | Revisadas: correcto |
| Funciones SECURITY DEFINER que puede llamar un usuario con sesión | 348 | Es la arquitectura del proyecto (la web solo escribe por RPC) | Revisadas las 46 de `admin_*`/`staff_*`: **todas** comprueban `es_moderador()`/`es_admin()` antes de actuar |
| Protección de contraseñas filtradas apagada | 1 | Supabase no compara las contraseñas con la lista de HaveIBeenPwned | **Ajuste de seguridad: lo hace Fralex** (§4) |

### 3.2 Comprobaciones extra (no salen en los avisos)
- Ninguna función `sistema_*` (las que usan Link y las Edge Functions con la clave de servicio) se puede llamar desde la web. ✅
- Todas las funciones SECURITY DEFINER tienen `search_path` fijo. ✅
- Ninguna tabla de `public` tiene RLS apagado. ✅
- Ninguna política de escritura es `true` (abierta a todos). Las de escritura exigen ser el dueño de la fila o moderador/admin/árbitro. ✅
- `perfiles`: el usuario solo puede editar columnas inofensivas (nombre, bio, avatar…). **`rol` no está entre ellas** y además lo protegen los disparadores `trg_proteger_rol` y `zz_auditoria_rol`. ✅
- Almacenamiento: los buckets públicos solo aceptan imágenes o vídeo con límite de tamaño; `comprobantes-pago`, `option-files`, `sync-option`, `vestuario`, `link-versiones` y `fuente-phoenix` son privados. ✅
- **Las 2 tablas de `private`** (`mercado_claves` y `jugadores_foto_respaldo`) no tenían RLS. No eran accesibles (sin permisos y `private` no está en la API), pero se les puso RLS como segunda barrera → **migración 141** (`supabase/migrations/141_rls_tablas_private.sql`). Comprobado después: `mercado_clave_publica()` sigue funcionando.

### 3.3 Avisos de rendimiento
Solo avisos informativos, ninguno de nivel «WARN»:
- **97 claves foráneas sin índice.** Casi todas son columnas de auditoría (`revisado_por`, `creado_por`…) que no se consultan. Con el tráfico actual no afecta. No se añaden 97 índices a ciegas: se añadirá el índice concreto si una pantalla se vuelve lenta.
- **54 índices sin usar.** La web aún tiene poco uso real, así que la estadística no es fiable. **No se borra ninguno** antes del lanzamiento.

## 4. Lo que tiene que hacer Fralex (ajustes de seguridad, Claude no los toca)

**A. Verificación en dos pasos (gratis, unos 5 minutos cada una). Prioridad alta.**
1. **Supabase**: https://supabase.com/dashboard/account/security → «Multi-Factor Authentication» → «Add new app» → escanea el QR con Google Authenticator (o similar) → escribe el código de 6 cifras.
2. **GitHub**: https://github.com/settings/security → «Two-factor authentication» → «Enable» → app de autenticación → guarda los códigos de recuperación en un lugar seguro (nunca en un repo).
3. **Google** (cuenta de Drive y correo): https://myaccount.google.com/signinoptions/twosv → «Activar».
4. **Cloudflare** (aloja la web): https://dash.cloudflare.com/profile/authentication → «Two-Factor Authentication».

**B. Protección de contraseñas filtradas.**
Supabase → proyecto → **Authentication** → **Sign In / Providers** (en algunas versiones del panel está en **Attack Protection**) → **Email** → activar **«Prevent use of leaked passwords»** → Save.
Ojo: Supabase solo la ofrece en el **plan Pro**. Si el interruptor sale bloqueado, el proyecto está en el plan gratis y no se puede activar sin pagar.

## 5. Entorno de pruebas antes de producción (lo más barato)

Hoy todo lo que se aplica en Supabase va directo a producción (no hay rama de pruebas).

| Opción | Coste | Ventajas | Inconvenientes |
|---|---|---|---|
| **A. 2.º proyecto Supabase gratis (recomendada)** | **0 USD** | El plan gratis permite 2 proyectos activos. Se le aplican las mismas migraciones y la vista previa (`/fase-beta-1-0/`) puede apuntar a él | Se pausa tras 7 días sin uso (se reactiva con un clic). Hay que aplicarle las migraciones también |
| B. Supabase en local con la CLI y Docker | 0 USD | Copia completa en la PC, sin internet | Docker pesa (2-4 GB de RAM); exige instalar Docker Desktop y la CLI |
| C. Ramas de Supabase (Branching) | Plan Pro (~25 USD/mes) + ~0,32 USD/día por rama | Cada cambio se prueba en una copia automática | Es de pago |

**Recomendación: A.** Pasos cuando Fralex lo apruebe (crear el proyecto es una acción que él debe autorizar):
1. Crear el proyecto `phoenix-pruebas` en el plan gratis, en la misma organización y región que producción.
2. Aplicarle las migraciones del repo en orden (Claude puede hacerlo con la herramienta de Supabase).
3. Poner su URL y su clave publicable en las variables de la vista previa de Cloudflare (`PUBLIC_SUPABASE_URL` y la clave), no en el código.
4. Costumbre: toda migración nueva se prueba primero en `phoenix-pruebas`; si va bien, se aplica a producción.

## 6. Costumbre contra los cambios sin commit

Script nuevo: `tools/revisar-sin-commit.ps1` (solo **lee**; no hace commit, no borra, no cambia de rama ni permisos).

```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\pes-liga-automatica\tools\revisar-sin-commit.ps1
```

- Recorre los 6 clones: `pes-liga-automatica`, `pes-rediseno`, `smash-soda-fork`, `phoenix-overlay` y las 2 copias de `D:\Frank\IA\CLAUDE`.
- Por cada uno dice: rama, cambios sin commit **reales**, cambios de **ruido** (logs de compilación, `build-*`, `.bak`, `.claude/`, `COMPILAR_PHOENIX.bat`), commits sin subir y la antigüedad del cambio más viejo.
- Verde = todo en orden; amarillo = hay algo pendiente de hoy; **rojo** = hay cambios reales de 1 día o más (sale con código 1).
- Opción `-Respaldar`: guarda una **foto** de los cambios en una rama **local** `respaldo/sin-commit-AAAA-MM-DD` usando `git stash create` (no toca la carpeta de trabajo ni la pila de stash, y no sube nada a GitHub).

**Costumbre:** cada hilo lo ejecuta **al empezar y al cerrar** cada avance. Si sale en rojo algo de otro hilo, no se toca: se avisa a ese hilo. Queda escrito en `CLAUDE.md` (web) y en `D:\Frank\IA\CLAUDE\CLAUDE.md`.

Estado al 21-oct-2026 16:30: ningún repo en rojo. `smash-soda-fork` tiene 13 archivos de ruido (logs de compilación de Link y carpetas `build-*`). **Sugerencia para el hilo de Link**: añadir `log_*.txt`, `build-mercado/`, `build-sync/` y `_mis_cambios/` a su `.gitignore`.

## 7. Qué se cambió (para replicarlo)
- Supabase: migración 141 (en remoto se llama `140_rls_tablas_private`; archivo `141_rls_tablas_private.sql`).
- `docs/bitacoras/BITACORA-21-OCT-2026-CUENTA-GENERAL.md` e `INFORME-REVISION-GENERAL-21-OCT-2026.md`: correo sustituido.
- `tools/revisar-sin-commit.ps1`: nuevo.
- `CLAUDE.md` (web) y `D:\Frank\IA\CLAUDE\CLAUDE.md`: costumbre del script.
- No se reescribió historial ni se cambió la visibilidad de ningún repo.
