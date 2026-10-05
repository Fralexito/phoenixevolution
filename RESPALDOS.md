# Respaldos de la base de datos (Supabase gratuito)

Supabase gratuito **no guarda copias de seguridad**. Este proyecto tiene un flujo propio: `.github/workflows/respaldo.yml`.

## Qué hace
Cada domingo vuelca los esquemas `public` y `auth`, lo **cifra** (AES-256) y lo guarda 90 días como artefacto de GitHub. El repositorio es público, por eso el archivo va cifrado: sin la contraseña no sirve.

## Configuración (una sola vez)
1. Supabase → **Connect** → pestaña **Session pooler** (los servidores de GitHub no tienen IPv6) → copia la URI y reemplaza `[YOUR-PASSWORD]` por la contraseña de la base.
2. GitHub → repositorio → Settings → Secrets and variables → Actions → New repository secret:
   - `SUPABASE_DB_URL` = la URI del paso 1.
   - `BACKUP_PASSPHRASE` = una contraseña larga (mínimo 12 caracteres) **que guardes también fuera de GitHub** (gestor de contraseñas). Si la pierdes, los respaldos son inservibles.
3. Pestaña Actions → «Respaldo semanal de la base de datos» → Run workflow (prueba). Debe terminar en verde y dejar un artefacto `respaldo-AAAA-MM-DD`.
   (Los cron de GitHub solo corren desde `main`: tras publicar, queda programado.)

## Restaurar
1. Descarga el artefacto y descomprime el `.gpg`.
2. `gpg --output respaldo.dump --decrypt respaldo-AAAA-MM-DD.dump.gpg` (pide la contraseña).
3. Sobre un proyecto Supabase NUEVO o vacío: `pg_restore --no-owner --clean --if-exists --dbname "<URI>" respaldo.dump`.
4. Revisa que las migraciones, funciones y trabajos programados (`cron.job`) estén; si falta algo, vuelve a ejecutar las migraciones en orden.

## Qué NO cubre
Archivos subidos al almacenamiento (Storage: avatares, videos), configuración del panel (Auth, redes, correos) ni los secretos de Vault. Esos se rehacen a mano.
