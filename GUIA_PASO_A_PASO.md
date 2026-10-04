# Guía: subir la web nueva a GitHub (sin instalar nada)

## Cómo está armada (mapa general)
- `src/pages/` → cada página (Central, Noticias, Jugadores (base de datos), Duelos, Palmarés, Mercado).
- `src/layouts/Layout.astro` → la ÚNICA cabecera/ticker/menú/pie. Se edita aquí y cambia en todas las páginas.
- `src/js/core/` → cimientos (conexión a Supabase, sesión, avisos). `src/js/features/` → funciones (login, perfil…). `src/js/pages/` → lógica de cada página.
- `src/data/` → textos editables: noticias, palmarés, enlaces de redes (`site.js`).
- `.github/workflows/deploy.yml` → GitHub compila y publica solo cada vez que subes cambios.

## Paso 1 · Reemplazar los archivos en GitHub
1. Entra a tu repositorio `phoenixevolution` en github.com.
2. Borra los archivos viejos (index.html, database.html, duelos.html, noticias.html, palmares.html, styles.css, supabaseClient.js, duelos.js…): abre cada uno → ícono de papelera → "Commit changes". (Si prefieres, déjalos; no estorban, pero lo ideal es borrarlos.)
3. Descomprime el ZIP en tu computador.
4. En el repositorio: **Add file → Upload files** y arrastra TODO el contenido de la carpeta descomprimida (incluida la carpeta oculta `.github`; si tu sistema la oculta, activa "mostrar archivos ocultos").
5. Abajo, **Commit changes**.

## Paso 2 · Activar GitHub Pages con Actions (una sola vez)
Repositorio → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.

## Paso 3 · Esperar el despliegue
Pestaña **Actions**: verás "Desplegar a GitHub Pages" en amarillo (trabajando) y luego verde (listo, ~1-2 min). La web queda en https://fralexito.github.io/phoenixevolution/
Si sale en rojo, abre esa ejecución y pásame una captura.

## Paso 4 · Configurar el login con Discord y Google (en Supabase)
Supabase → Authentication → **URL Configuration**: Site URL = `https://fralexito.github.io/phoenixevolution/` y añade esa misma URL en Redirect URLs.
Authentication → **Providers**: activa Discord y Google con sus Client ID/Secret (te guío cuando quieras).
Authentication → **Settings/Passwords**: activa "Leaked password protection".

## Paso 5 · Completar tus enlaces de redes
Edita `src/data/site.js` (ícono de lápiz en GitHub) y cambia los `#` por tus enlaces de Discord, Kick, YouTube y TikTok.

## Nota sobre Supabase
Las migraciones 001, 002, 003, 003b y 004 **ya están aplicadas** en tu proyecto. Los archivos de `supabase/migrations/` son solo el registro; no necesitas ejecutarlos.

## Probarlo en tu computadora antes de subirlo (opcional pero recomendado)
1. Instala **Node.js 22 LTS** (o más nuevo) desde https://nodejs.org . Cierra y vuelve a abrir la terminal después.
2. Descomprime el ZIP. Abre una terminal **dentro** de la carpeta `phoenix-evolution-series` (en Windows: clic derecho en la carpeta → "Abrir en Terminal").
3. Escribe `npm install` y espera (solo la primera vez; descarga las piezas del proyecto).
4. Escribe `npm run dev`.
5. Abre en el navegador: **http://localhost:4321/phoenixevolution/** (la parte `/phoenixevolution/` es obligatoria).
6. Para cerrar: `Ctrl + C` en la terminal. Para revisar que todo está bien antes de subir: `npm test` y luego `npm run build`.

**Para que el login (Discord/Google) funcione en local:** en Supabase → Authentication → URL Configuration → Redirect URLs, agrega `http://localhost:4321/phoenixevolution/`.
