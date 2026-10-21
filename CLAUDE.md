# Phoenix Evolution Series — guía para Claude

Sitio de la liga (Galaxy League y Liga Sudario) de eFootball PES 2021 / SP Football Life 2026. Estado detallado, historial de rondas y pendientes: **`MAPA.md`** (léelo primero; la sección «RETOMAR» resume el estado). **Dos cuentas trabajan a la vez:** lee también el final de `REGISTRO.md` y `docs/liga-y-torneos/REGLAS-ECOSISTEMA.md` §7 antes de tocar nada.

## Entorno
- Astro (estático) + Tailwind 4 + JS vanilla + Supabase JS v2. Node 22.
- `npm test` (node --test, debe quedar en 0 fallos) · `npm run build` (33 páginas).
- Capas: `src/js/core/*` (lógica pura, con test) · `src/js/features/*` · `src/js/pages/*`.
- Proyecto Supabase `fiibiyijojkxqlsrhcil` (plan FREE). DDL pequeño por MCP `apply_migration`; si es grande, entregar el `.sql` al usuario. Las migraciones del repo llevan comentarios; el SQL que se le manda al usuario va **sin** comentarios, código puro.

## Flujo de ramas (regla fija)
- Trabajar SOLO en la rama `borrador` (vista previa privada «FASE BETA 1.0» en `/fase-beta-1-0/`; la antigua `/borrador/` ya no existe).
- Pasar a `main` (web oficial) ÚNICAMENTE cuando el usuario diga «Súbelo» o «Publícalo».
- Tras cada cambio: añadir «ronda N» a `MAPA.md`, commit con los trailers de atribución, `git pull --rebase origin borrador`, push a `borrador`.

## Reglas del usuario
- Idioma: español. Respuestas cortas («modo ligero»). Usuario con poca experiencia en programación: explicar claro, sin asumir nada, y cerrar con una pregunta para confirmar que se entendió.
- Nunca pedir secretos en el chat.
- Cero ventanas nativas (`confirm`/`prompt`/`alert`): usar `core/sistema/dialogo.js`.
- Evitar scroll excesivo: lo largo o secundario va en `Plegable` cerrado.
- El parche se llama **«Conmegol»**; nunca «corregirlo».
- Texto mínimo 12 px en todo el sitio.

## Identidad visual (no negociable)
Mantener el alma de la página original: Galaxy = cian (#00e5ff) + púrpura; Sudario = azul + dorado (`html[data-tema='sudario']`). Se conservan a propósito el texto con degradado, `glass-panel`, etiquetas en mayúsculas con tracking y los bordes laterales de acento, aunque una guía de diseño genérica los desaconseje.

## Movimiento (estándares)
- Lo que se toca mucho: corto y firme (100–220 ms, `ease-out` con `cubic-bezier(.22,1,.36,1)`), solo `transform`/`opacity`, nunca `transition: all`.
- Lo raro o celebratorio (reaccionar, publicar, ganar) puede ser más juguetón (`--ease-pop`, ráfagas). El usuario quiere la web lo más «dopamínica» posible, mientras no pierda la identidad.
- Los efectos de hover con movimiento solo con mouse (`@media (hover: hover)`); `prefers-reduced-motion` siempre respetado.
- **Quien manda es «Ajustes → Animaciones»** (Según el sistema / Siempre activas / Reducidas), ronda 243. En CSS se puede seguir escribiendo `@media (prefers-reduced-motion: reduce | no-preference)`: al construir, `tools/movimiento-postcss.mjs` lo convierte en `html[data-aj-mov-efectivo]`. En JS **no** usar `matchMedia('(prefers-reduced-motion…)')`: usar `hayMovimientoReducido()` o el atributo `data-aj-mov-efectivo` de `<html>`.
- La capa vive tras la bandera `FX.dopamina` (`styles/dopamina.css`, `js/features/dopamina.js`); si algo no gusta, se apaga ahí.
- Capa 3D de toda la web tras `FX.prof3d` (`styles/prof3d.css`, `js/features/prof3d.js`, ronda 242): aparición 3D al bajar, inclinación al salir, tarjetas que se inclinan hacia el mouse (lo grande, menos), presión y cambio de página en 3D. Regla de Fralex: **fuerte pero ordenado — nada se mueve solo, todo responde a la persona**. Solo actúa dentro de `<main>`; para excluir algo, `data-no3d`. Prioridades permanentes: dinamismo, suavidad, animaciones visuales y cero desorden.

## Cuándo React y cuándo JavaScript (ronda 340, regla fija para las dos cuentas)
- La web sigue siendo JavaScript puro. React SOLO como «isla» (`src/islas/*.jsx`, con `client:load`/`client:visible`) en pantallas MUY interactivas o en vivo (centro de partido, editor de alineación, draft). Páginas de lectura/listas/formularios: JS como siempre.
- Una pieza es de uno u otro, nunca mezclada por dentro. La lógica (cálculos, reglas) va en `src/js/core/*` SIN React y con test; la isla solo la llama.
- Mismos colores/tema (Galaxy/Sudario), mismas clases (`glass-panel`, `btn-primary`), texto ≥12 px y las reglas de movimiento de este archivo.
- No reescribir páginas existentes a React sin que el usuario lo pida. Primera isla de prueba: `src/islas/CentroPartido.jsx` en `/laboratorio/` (datos inventados; sin enlace en el menú).

## Anotaciones e informes (norma desde 20-oct-2026)
- Subir las anotaciones y avances importantes a GitHub (`docs/`, `MAPA.md`, `REGISTRO.md`) **y también a Drive** (Fralex, 20-oct-2026). Del 16 al 19-oct no hubo Drive y solo se subía a GitHub.
- **Desde el 21-oct, GitHub es la fuente y Drive solo un respaldo.** No se sube nada a Drive a mano ni por el conector. Al cerrar el día se ejecuta `D:\Frank\IA\CLAUDE\RESPALDAR_A_DRIVE.ps1`, que copia `docs/`, `MAPA.md`, `REGISTRO.md` y las migraciones. Índice de todo el proyecto: `D:\Frank\IA\CLAUDE\INDICE_MAESTRO.md`.

## Diferido por el usuario
Webhook/bot de Discord, pasarela de pago, pruebas de clanes. El cumplimiento legal de monetización y escudos es responsabilidad del usuario.

- **Documentos:** están agrupados por tema en `docs/<carpeta>/`; el índice con el «antes estaba en» es `docs/INDICE.md`. Si tu rama usa rutas viejas: `node tools/reorganizar/actualizar-rutas-docs.mjs`.
