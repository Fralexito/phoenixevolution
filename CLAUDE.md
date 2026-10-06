# Phoenix Evolution Series — guía para Claude

Sitio de la liga (Galaxy League y Liga Sudario) de eFootball PES 2021 / SP Football Life 2026. Estado detallado, historial de rondas y pendientes: **`MAPA.md`** (léelo primero; la sección «RETOMAR» resume el estado).

## Entorno
- Astro (estático) + Tailwind 4 + JS vanilla + Supabase JS v2. Node 22.
- `npm test` (node --test, debe quedar en 0 fallos) · `npm run build` (33 páginas).
- Capas: `src/js/core/*` (lógica pura, con test) · `src/js/features/*` · `src/js/pages/*`.
- Proyecto Supabase `fiibiyijojkxqlsrhcil` (plan FREE). DDL pequeño por MCP `apply_migration`; si es grande, entregar el `.sql` al usuario. Las migraciones del repo llevan comentarios; el SQL que se le manda al usuario va **sin** comentarios, código puro.

## Flujo de ramas (regla fija)
- Trabajar SOLO en la rama `borrador` (vista previa en `/borrador/`).
- Pasar a `main` (web oficial) ÚNICAMENTE cuando el usuario diga «Súbelo» o «Publícalo».
- Tras cada cambio: añadir «ronda N» a `MAPA.md`, commit con los trailers de atribución, `git pull --rebase origin borrador`, push a `borrador`.

## Reglas del usuario
- Idioma: español. Respuestas cortas («modo ligero»). Usuario con poca experiencia en programación: explicar claro, sin asumir nada, y cerrar con una pregunta para confirmar que se entendió.
- Nunca pedir secretos en el chat.
- Cero ventanas nativas (`confirm`/`prompt`/`alert`): usar `core/dialogo.js`.
- Evitar scroll excesivo: lo largo o secundario va en `Plegable` cerrado.
- El parche se llama **«Conmegol»**; nunca «corregirlo».
- Texto mínimo 12 px en todo el sitio.

## Identidad visual (no negociable)
Mantener el alma de la página original: Galaxy = cian (#00e5ff) + púrpura; Sudario = azul + dorado (`html[data-tema='sudario']`). Se conservan a propósito el texto con degradado, `glass-panel`, etiquetas en mayúsculas con tracking y los bordes laterales de acento, aunque una guía de diseño genérica los desaconseje.

## Diferido por el usuario
Webhook/bot de Discord, pasarela de pago, pruebas de clanes. El cumplimiento legal de monetización y escudos es responsabilidad del usuario.
