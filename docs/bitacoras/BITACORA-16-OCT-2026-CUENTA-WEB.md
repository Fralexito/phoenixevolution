# Bitácora del 16-oct-2026 · cuenta WEB (Sonnet) — para que la otra cuenta retome

Complementa `docs/bitacoras/BITACORA-16-OCT-2026-CUENTA-OPUS.md` (migraciones 116–118, IA, caras). Aquí: rondas 340–347 de la cuenta WEB. Rama `borrador` = vista previa privada «FASE BETA 1.0» (`/phoenixevolution/fase-beta-1-0/`); son lo mismo, solo cambia el nombre. `main` (web oficial) NO tiene nada de esto; sale solo con «Súbelo»/«Publícalo».

## Cómo retomar (3 pasos)
1. `git pull --rebase origin borrador`, leer el final de `REGISTRO.md` y `CLAUDE.md`.
2. `npm test` (506 pasan, 0 fallos) y `npm run build` (53 páginas) para confirmar el punto de partida.
3. Elegir pendiente de la lista de abajo. Siguiente ronda libre: **348** (mirar MAPA.md; los números chocan a menudo entre cuentas).

## Qué se hizo hoy
- **R340 · React (isla de prueba):** `src/islas/CentroPartido.jsx` en `/laboratorio/` (sin enlace en el menú, datos inventados). Lógica en `core/competicion/centroPartido.js` + test. Regla fija en `CLAUDE.md`: web = JS puro; React solo como isla en pantallas muy interactivas.
- **R341 · Radar estilo FIFA** en la ficha de jugador de la comunidad (`core/jugadores/radarFifa.js`, `features/radarFifa.js`, bandera `FX.radarFifa`, estilos `.rf*` en `perfilJugador.css`). Los futbolistas de Liga Máster no tienen radar: faltan las 14 stats.
- **R344 · Orden visual** (51 páginas revisadas en PC y celular): cabeceras en tarjeta `glass-panel` en Historial, Jugadores, Noticias y Configuración; en celular se oculta el «Explora» del pie si hay barra inferior; tiras de pestañas con desvanecido y pestaña activa centrada (`features/tirasDeslizables.js`).
- **R346 · Modo ligero automático** para celulares lentos (`core/sistema/rendimiento.js`, `features/modoLigero.js`, `styles/modoLigero.css`): detecta por señales o midiendo tirones; apaga 3D/efectos/blur; dura 14 días; «Ajustes → Animaciones → Siempre activas» lo anula. **No probado en un celular real**: si no se activa, afinar la sensibilidad.
- **R347 · Anti-lag** (pedido: «revisa residuos que causan lag, optimiza sin perder nada»): escudos `.escudo` pausados fuera de pantalla (`features/pausaFueraDePantalla.js`, atributo `data-fuera`); pulso del `.estado-punto` con transform/opacity en `::after` (antes box-shadow); estrellas de la portada ~30 fps y dpr máx 1,5 en celular. Mediciones en el sandbox muy ruidosas (no hay antes/después fiable).
- **Informes:** `docs/bitacoras/INFORME-16-OCT-2026-REACT-HERRAMIENTAS-Y-ORDEN-VISUAL.md`, `docs/economia/INVESTIGACION-DISENO-APUESTAS-Y-GAMING.md`.

## Diagnóstico de rendimiento (para seguir con R348+)
- CSS ≈ 657 KB, solo 22–25 % usado por página. Fuentes de iconos: Phosphor 147 KB + FontAwesome 136 KB, ambas cargadas.
- ~42 animaciones infinitas en inicio/liga (escudos, punto de estado, otras con box-shadow que repintan).
- Ideas pendientes: recortar fuentes de iconos (usar solo los glifos de `data/iconosFinos.js` + usos directos `ph-`; woff2), quitar CSS sin usar con cuidado, `content-visibility:auto` en secciones largas de Liga, revisar otros `@keyframes` que no sean transform/opacity.
- Trampa de build: `backdrop-filter` sin prefijo se pierde si `-webkit-backdrop-filter` no va ANTES en la misma regla.

## Pendientes
- **Consejos que FRALEX pidió recordarle después:** llaves de torneo (brackets-viewer), sonidos (Howler), celebración al ganar (Lottie/Rive), alineación arrastrable (SortableJS), títulos de Social/Comunidad y Legal, radar para Liga Máster, inicio personalizado, franja de aliados.
- **Alquilar:** expirar solicitudes sin respuesta a las 48 h (requiere SQL), valoraciones del anfitrión, horarios, notificaciones con enlace, disputa de no-show. **Duelos:** confeti/ELO animado, sugerencia de rivales.
- Configurar en Supabase Auth la Redirect URL de la vista previa; pruebas con sesión real por FRALEX (el sandbox no llega a Supabase).
- Los pendientes de FRALEX de la bitácora Opus (paso B ANTHROPIC_API_KEY, leaked password protection) siguen vigentes.

## Norma de anotaciones (desde 16-oct-2026)
FRALEX no tiene Drive por ahora: todo se guarda SOLO en GitHub (`docs/`, `MAPA.md`, `REGISTRO.md`); no escribir docs nuevos en el proyecto de claude.ai. **Cuando FRALEX vuelva a tener Drive, subir también a Drive todo lo de `docs/` (incluidos estos informes y bitácoras). No olvidar.**

## Reglas de FRALEX (recordatorio)
Español, respuestas cortas y simples, definir términos desde cero, cerrar con pregunta de confirmación; sin ventanas nativas; texto ≥12 px; parche «Conmegol»; SQL sin comentarios; nunca pedir secretos; no tocar `SmashSoda/` ni `PhoenixSync/`; identidad Galaxy cian+púrpura / Sudario azul+dorado; «nada se mueve solo, todo responde a la persona».
