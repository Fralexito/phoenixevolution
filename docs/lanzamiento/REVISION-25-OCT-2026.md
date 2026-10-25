# Revisión de lanzamiento · 25-oct-2026 (Cuenta 2) · beta 1.26.1

Recorrido automático de las **63 páginas** en celular (390 px) y PC (1440 px), con un navegador real y la base simulada.

## Qué se revisó y resultado
| Revisión | Resultado |
|---|---|
| Errores de JavaScript al abrir | 0 (solo un aviso de consola en Inicio cuando no hay jugadores destacados → **arreglado**: ya no se registra como error) |
| Enlaces internos rotos | 0 |
| Imágenes sin texto alternativo | 0 |
| Scroll horizontal en celular | 0 reales (el único aviso era el menú lateral escondido, que está fuera de pantalla a propósito) |
| Prode y Draft en el menú | **Faltaban** en el menú principal → **añadidos** en Jugar → «Juegos de la comunidad» |
| Descripción al compartir (WhatsApp/Discord/Google) | 29 páginas usaban la descripción genérica → **cada página pública tiene la suya** |
| Páginas de staff/personales en Google | Se podían indexar → **`noindex`** en control, moderación, panel, auditoría, bandeja IA, versiones de Link, usuarios en PES, laboratorio, ajustes, mensajes, guardados, stickers, buscar y ayuda IA (prop `privada` del Layout) |
| Velocidad en 4G lento (1,6 Mb/s, 150 ms) | Inicio: LCP 2,6 s · 660 KB. Prode/Ranking: LCP 2,0 s · 440 KB. Social: LCP 3,7 s · 513 KB |
| Supabase · seguridad | Sin errores. Avisos esperados: funciones `security definer` llamables (es el diseño: todo pasa por funciones con sus propias reglas; las 42 abiertas a visitantes son solo de lectura pública). **Protección de contraseñas filtradas: apagada → la enciende Fralex** (regla: Claude no toca seguridad) |
| Supabase · rendimiento | 107 claves foráneas sin índice y 56 índices sin uso: con el tráfico actual no importa; revisar cuando haya más gente |

## Pendientes recomendados (no se hicieron: podían romper algo)
1. **CSS de 100 KB comprimido en todas las páginas** (`global.css` importa 45 hojas, incluidas las de páginas concretas como Social, Mi club, Cambios oficiales). Pasar las hojas de una sola página a esa página bajaría ~40 % el primer arranque. Requiere revisar página por página que no se pierda ningún estilo compartido.
2. **Social** es la más lenta (LCP 3,7 s en 4G lento): cargar sus extras (historias, clips) después de pintar.
3. Activar en Supabase → Authentication la **protección de contraseñas filtradas** y el **2FA** del staff (lo hace Fralex).
4. Cuando haya tráfico: migración con índices para las claves foráneas más usadas (asesor de rendimiento de Supabase).

## Cómo repetir esta revisión
`npm run build` y luego los scripts de la carpeta de pruebas de la sesión (auditar todas las páginas y medir peso con red lenta);
la versión fija para el repositorio es `npm run test:paginas` (arranque de cada página).

---

## Optimización · 25-oct-2026 14:25 (beta 1.31.1)
| Qué | Resultado |
|---|---|
| Claves foráneas sin índice (asesor de Supabase) | 110 → **0** (migración 158, se genera sola desde el catálogo) |
| Tamaño de la base | 43 MB; la tabla más grande es el registro de tareas programadas (~10 MB) |
| Limpieza automática diaria (159) | **Escrita, falta el permiso de Fralex** (borra filas viejas: ver `docs/sql-pendiente/LEEME.md`) |
| App del celular (service worker) | Antes guardaba sin límite (y también respuestas con error). Ahora: máx. **400 archivos** y **80 páginas**, solo respuestas OK; caché nueva `pes-v3` (las viejas se borran solas) |
| Imágenes de `public/` | Ya estaban optimizadas (la más pesada, el ícono de 512 px, no baja más sin perder calidad) |
| Índices «sin uso» (56) | No se tocan: «sin uso» es porque aún hay poco tráfico; borrarlos podría volver lenta la web cuando crezca |
| CSS global de 100 KB comprimido | No se partió: las hojas que quedan en global se usan en casi todas las páginas; partirlo es una reforma con riesgo de romper estilos (regla de Fralex) |
