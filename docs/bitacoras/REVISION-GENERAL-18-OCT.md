# Revisión general del proyecto · 18 oct 2026 (cuenta ECONOMÍA, 2.ª cuenta)

Pedido de Fralex: «revisa todo mi repositorio y base de datos y todo, y optimiza totalmente todo… no pares hasta que haga una reorganización y optimización completa».
Esto es lo que se revisó, lo que se arregló y lo que se dejó a propósito (con el motivo). Las migraciones y los archivos mencionados están en este repositorio.

## 1. Base de datos (Supabase `fiibiyijojkxqlsrhcil`)

Se leyeron los avisos de seguridad y de rendimiento de Supabase (`get_advisors`).

**Arreglado (migración 129, aplicada y comprobada):**
- `sitio_guardar` y `sitio_mover` (panel del sitio) ya no las puede llamar quien no ha iniciado sesión; dentro ya exigían ser admin.
- Política `ia_chat_uso_propio`: `auth.uid()` ahora va como `(select auth.uid())` (se evalúa una vez por consulta, no por fila).
- `private.vestuario_validar_cambio`: `search_path` fijo (la función no lee tablas, sin riesgo).

**Dejado a propósito:**
| Aviso | Por qué no se toca |
|---|---|
| 329 funciones `SECURITY DEFINER` ejecutables por `authenticated` | Es el diseño: la web habla con la base por RPC y cada función comprueba sesión y rol dentro. Las de dinero ya se cerraron a mano (migraciones 111, 113, 119, 125, 127). |
| 36 funciones de lectura para `anon` | Rankings, perfil público, tienda, ticker, etc.: se ven sin iniciar sesión. Revisado nombre por nombre: ninguna escribe. |
| 64 tablas con RLS y sin política | Solo las usa el servidor o las funciones; sin política = nadie más entra (es lo seguro). |
| 97 claves foráneas sin índice, 50 índices sin uso | La tabla más grande tiene 482 filas. Crear índices ahora solo encarece las escrituras; se revisa cuando una tabla pase de unos miles de filas. |
| 8 tablas con varias políticas de lectura | Mejora mínima y riesgo de cambiar quién ve qué; se hará con pruebas cuando haga falta. |
| Esquema `backup_20261003` (4 tablas sin clave primaria) | Es una copia de seguridad del 3-oct. Se puede borrar cuando Fralex lo decida. |

**Solo lo puede hacer Fralex:** en Supabase → Authentication → Passwords, activar «Leaked password protection» (aviso `auth_leaked_password_protection`). Es un interruptor del panel, no de SQL.

## 2. Repositorio web (Astro + Tailwind + JS)

- 371 archivos JS, 72 páginas, 53 hojas de estilo. `npm audit` (producción): 0 vulnerabilidades. Pruebas: 624 pasan. `npm run build`: sin errores.
- **Archivos que parecían sin uso y NO se borran:** `core/competicion/centroPartido.js` (lo prueba `tests/centroPartido.test.mjs`), `features/carrusel.js` y `styles/mundos.css` (se cargan según `data/experimento.js`), `core/portada/inicio.js` y `features/conexion/prechequeo.js` (apagados por interruptor). Borrar sin saberlo habría roto pruebas o funciones apagadas.
- **Dependencias que parecen sin uso y se quedan:** `@phosphor-icons/web` (lo carga `global.css` para los iconos finos) y `react-dom` (lo exige `@astrojs/react`).
- **Peso:** hoja de estilos principal 760 KB (137 KB comprimida) y supabase 212 KB (53 KB). Es aceptable y se guarda en caché; reducirla pide una auditoría visual página por página (la hace la sesión «Pasada visual premium»), no un borrado a ciegas.
- Sin `console.log` olvidados. 39 marcas TODO/FIXME (pendientes anotados, ninguno bloquea).

## 3. Orden de ramas y carpetas de trabajo

- Ya fusionadas en `borrador` (se pueden retirar sus carpetas de trabajo sin perder nada): `econ-fase-b`, `econ-fase-c`, `econ-fase-d`, `econ-fase-e`, `ws-amistosos-web`, `ws-stats-web`, `liga-automatica`.
- Con trabajo sin fusionar (NO retirar): `rediseno`, `ws-actualizar-web`, `ws-lm-web`.
- Hay 10 carpetas de trabajo de Git abiertas (`git worktree list`).

## 4. Por qué no se movieron ni renombraron archivos

Hay varias sesiones editando el mismo repositorio a la vez (visual, Link, Sync, economía). Mover o renombrar archivos en masa rompe sus cambios sin subir y las rutas que usan los documentos (`MAPA.md`, `REGISTRO.md`). Una reorganización de carpetas pide un momento sin sesiones abiertas, un plan por fases y la prueba de que todo compila después de cada fase.

## 5. Siguientes pasos propuestos (en este orden)

1. ✅ HECHO (18-oct): retiradas las carpetas de trabajo de econ-fase-b/c/d/e, ws-amistosos-web y ws-stats-web (sin cambios pendientes). Las ramas se conservan; se recrean con `git worktree add <ruta> <rama>`.
2. Auditoría de CSS por página (la «Pasada visual premium» ya mira las 4-5 más usadas).
3. Revisar índices y políticas duplicadas cuando alguna tabla supere unos miles de filas.
4. Reorganización de carpetas por fases (con las sesiones paradas).
