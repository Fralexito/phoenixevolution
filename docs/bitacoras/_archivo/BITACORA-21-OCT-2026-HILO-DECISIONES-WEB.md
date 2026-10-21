# Bitácora e informe · Hilo «Decisiones pendientes de la web» · 21 de octubre de 2026

Para cualquier persona o IA que continúe. Explica **todo lo que se hizo el 21-oct en la web** sin haber visto el chat.
Complementa `REGISTRO.md` (una línea por cambio, la más nueva al final), `MAPA.md` (rondas 362 y 363) y la guía de uso `docs/guias/GUIA-NOVEDADES-21-OCT-2026.md`.
Bitácora anterior: `docs/bitacoras/BITACORA-19-OCT-2026-CUENTA-ECONOMIA.md`.

> **Norma de Fralex (20 y 21-oct):** todo se anota en GitHub **y** en Drive (carpeta «Phoenix Link — Guías y logros», Google Docs numerados «NN · Título (fecha)»). Resolver todo sin preguntar salvo lo importante.

---

## 0. Cómo retomar en 5 minutos

1. Repo de la web: `Fralexito/phoenixevolution`, rama **`borrador`** (se publica sola en la vista previa **https://fralexito.github.io/phoenixevolution/fase-beta-1-0/**). En la PC: `C:\dev\pes-liga-automatica`.
2. Versión al cierre: **beta 1.15.1** (`src/data/versionWeb.js`). En cada subida se sube `VERSION_BETA`.
3. Comprobaciones antes de cada subida (todas deben pasar):
   ```bash
   npm test               # 648 pruebas, 0 fallos (al cierre del 21-oct)
   npm run build          # 60 páginas
   npm run test:paginas   # abre las 60 páginas en Chrome: 60/60
   ```
   En la nube de Claude: `CHROME_PATH=/opt/pw-browsers/chromium npm run test:paginas`.
4. **Migraciones de hoy:** **139** (patrocinadores), aplicada y probada. La siguiente libre es la **140** (mira antes el final de `REGISTRO.md`).
5. Nada se subió a `main` (web oficial): hace falta que Fralex diga «Súbelo» o «Publícalo».

---

## 1. Qué decidió Fralex

El 21-oct se le presentaron 10 preguntas pendientes de tres hilos (pase = hilo 13, pasada visual = hilo 14, caras = hilo 8). Respondió «SÍ a todo» (lo recomendado) y luego, para el pase, eligió «Las dos cosas».

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿El pase cuesta 150 gemas (≈ S/ 13,60)? | SÍ |
| 2 | ¿Temporada de 60 días y 30 niveles? | SÍ |
| 3 | ¿Torneo premium a 300 gemas? | SÍ |
| 4 | ¿Propinas solo con ascuas? | SÍ |
| 5 | ¿Lista de patrocinadores? | Primero «no por ahora», luego **SÍ** (hecha) |
| 6 | ¿Overlay de TikTok de pago? | Primero «no por ahora», luego **SÍ** (hecho como overlay del torneo premium) |
| 7 | ¿7 días de gracia para reclamar premios? | SÍ |
| 8 | ¿Siguiente página de la pasada visual? | **Jugadores** (hecha) |
| 9 | ¿Quitar las etiquetas pequeñas sobre los títulos? | NO (son parte de la identidad Galaxy) |
| 10 | ¿Qué hacer con los 60 jugadores sin cara? | Subir solo los recortes buenos (subidos 8) |

Las preguntas 1–4 y 7 ya eran lo que hacía la migración 123: no cambió código. Quedó anotado en `docs/economia/DISENO-PASS-Y-ORGANIZADORES.md` §6.

---

## 2. Resumen del día

| Ronda | Commit | Versión | Qué |
|---|---|---|---|
| 362 | `fe13a15` | 1.14.0 | Jugadores con panel lateral (posición y equipo) y vista «Lista» |
| 363 | `5a12066` | 1.15.0 | Patrocinadores, overlay de transmisión para torneos premium, 8 caras nuevas |
| 363 | `4632a43` | 1.15.0 | Registro de la migración 139 (aplicación parcial) |
| 363b | `b770e13` | 1.15.1 | 139 completa; «Quitar» patrocinador = archivar; prueba de páginas sin falsos fallos; esta bitácora y la guía |

---

## 3. Detalle por área

### 3.1 Jugadores con panel lateral (ronda 362, bandera `FX.jugadoresRiel`)
- **Qué se ve:** en PC (≥ 1024 px) una columna fija a la izquierda con «Posición» (Todas, Porteros, Defensas, Medios, Delanteros, cada una con su punto de color: portero dorado, defensa azul, medio verde, delantero rojo, de `data/posiciones.js`) y «Equipo», cada opción con cuántos jugadores tiene. En celular solo las posiciones, como fichas que se deslizan de lado. Vista nueva **«Lista»**: una fila por jugador (número, posición con color, nombre y apodo, club, media y balanza para comparar; tocar la fila abre el perfil).
- **Cómo funciona:** `features/jugadoresRiel.js` arma el panel y mueve `#carrusel-zona` y `#players-container` a una rejilla de dos columnas. No filtra por su cuenta: avisa a `pages/database.js` (`alGrupo`, `alClub`); el equipo usa el mismo desplegable de la barra (`#player-filter-select`), que en PC se oculta pero sigue mandando. Las cuentas salen de `core/jugadores/riel.js` (`contarPorGrupo`, `contarPorClub`, `filtrarGrupo`) con `tests/riel.test.mjs`.
- **Estilos:** `styles/jugadoresRiel.css` (importado en `global.css`). Movimiento 160–280 ms con `cubic-bezier(.22,1,.36,1)`, hover solo con mouse, filas que entran escalonadas solo con animaciones activas.
- **Apagar:** `FX.jugadoresRiel = false` en `src/data/experimento.js`.

### 3.2 Patrocinadores (ronda 363, migración 139)
- **Idea:** un patrocinador paga a Fralex **fuera** de la tienda (Yape, transferencia). La web solo muestra su logo con «Patrocinado por» en un torneo o un clan. No pasa por gemas.
- **Base de datos** (`supabase/migrations/139_patrocinios.sql`): tabla `patrocinios` (tipo torneo/clan, número del torneo o clan, nombre, logo https, web https, desde, hasta, activo, nota privada, archivado). RLS: el público solo lee los vigentes (activo y dentro de las fechas) y **sin la nota** (permiso por columnas); nadie escribe desde el navegador. RPC solo admin (`private.es_admin()`): `patrocinios_admin_listar`, `patrocinio_guardar` (crea o edita; comprueba que el torneo o clan exista), `patrocinio_borrar` (**archiva**: deja de verse, la fila queda como historial del acuerdo).
- **Web:** Moderación → sección «Patrocinadores» (`features/patrociniosAdmin.js`, solo admin). Tira «Patrocinado por» en la cabecera de `/torneo/` y en `/clanes/` (`features/patrocinios.js`: las páginas dejan `<div data-patro="torneo:12">` y `rellenarPatrocinios()` lo llena; si falla, no muestra nada). Validación en `core/economia/patrocinios.js` (`tests/patrocinios.test.mjs`). Estilos `styles/patrocinios.css`.
- **Riesgos anotados en el diseño:** nada de alcohol, apuestas o contenido no apto para menores; Fralex aprueba cada logo y anota el acuerdo en la nota.

### 3.3 Overlay de transmisión para torneos premium (ronda 363)
- **Qué es:** la página `/overlay-torneo/?id=N` (sin menú, fondo transparente, vertical 9:16) para usar como **fuente de navegador** de 1080 × 1920 en OBS o TikTok LIVE Studio. Muestra nombre del torneo, progreso, último resultado en grande (con destello cuando cambia), los 3 próximos partidos, el campeón y el patrocinador. Se actualiza cada 15 s. Opciones: `?tema=sudario` (azul y dorado), `?demo=1` (datos de ejemplo).
- **Quién lo usa:** solo torneos con la marca premium (300 gemas, migración 123). El enlace con botón «Copiar» sale en «Opciones del organizador» del torneo premium. No hay cobro nuevo.
- **Archivos:** `src/pages/overlay-torneo.astro`, `js/pages/overlayTorneo.js`, `styles/overlayTorneo.css`, lógica `core/competicion/overlay.js` (`resumenOverlay`, `marcadorTexto`) con `tests/overlay.test.mjs`.
- **No toca** el experimento de marcador en vivo de Link (`tiktok-experimento`, solo lectura).

### 3.4 Caras de jugadores que no tienen cara en el juego (hilo 8)
- Origen: carpeta de notas de la sesión de caras en la PC de Fralex, `C:\Temp\claude\D--Frank-IA-CLAUDE\195dabc8-c824-4363-8128-9c859256ce4d\scratchpad\caras` (`out\` = 23 recortes PNG 320 px, `lista.json` = jugador de cada índice, `fotos.json` = autor y licencia, `hoja_out.jpg` = hoja de contacto, `recortar.py` = el script del recorte).
- Se eligieron a ojo los 8 recortes de frente y limpios: Alisson Becker (230161), Conor Bradley (146461), Jonas Urbig (174911), Max Dowman (178082), Mika Godts (159204), Myles Lewis-Skelly (159437), Rico Lewis (157391), Rodrigo Mendoza (159248). Los otros 15 se descartaron (de perfil, borrosos o cortados).
- Se guardaron como `public/minifaces/<pes_id>.webp` (calidad 88) y se añadieron a `MINIFACES` en `src/data/minifaces.js`. **Licencias CC BY / CC BY-SA de Wikimedia Commons:** `MINIFACES_FOTO` guarda autor, licencia y página; la carta (título al pasar el mouse) y la ficha `/futbolista/` nombran al autor.

### 3.5 Prueba de páginas sin falsos fallos
- `tools/humo/abrir-paginas.mjs` marcaba como fallo `/mi-club/` y `/comunidad/` de vez en cuando: son redirecciones y el navegador cancela la descarga de una fuente al irse (`net::ERR_ABORTED`). Ahora se ignora ese caso. Resultado: 60/60.

---

## 4. Cómo se probó
- `npm test`: 648 de 648. `npm run build`: 60 páginas. `npm run test:paginas`: 60/60.
- Jugadores y el overlay se vieron con capturas automáticas (Chrome sin pantalla) en 1440 × 900, 390 × 844 y 540 × 960, con datos de prueba (la nube de Claude no llega a Supabase desde el navegador).
- Migración 139 probada dentro de la base con una transacción que se deshace sola: crear, editar, torneo/clan inexistente rechazado, anónimo no puede listar, quitar = desaparece de la lista → **TODO_OK REVERTIDO**. Permisos: anónimo ve `nombre` pero no `nota`; nadie puede insertar directo; anónimo no puede ejecutar las RPC. Avisos de seguridad: solo el informativo de siempre (funciones SECURITY DEFINER que comprueban el rol por dentro).

## 5. Trampas encontradas (para la próxima IA)
- **Conector MCP de Supabase:** una sentencia `DELETE` dentro del SQL hace que el conector pida confirmación y se cuelgue a los 60 s (no queda nada a medias). Solución: aplicar por partes y, si hace falta borrar, archivar con `update` o entregar el SQL a Fralex.
- **Mock de Supabase en capturas:** las respuestas simuladas necesitan cabeceras CORS (`access-control-allow-origin: *`) y responder al `OPTIONS`; si no, la página dice «No se pudo cargar».

## 6. Pendientes
- Que Fralex vea en la vista previa: Jugadores (panel y Lista), el overlay (`/overlay-torneo/?demo=1`) y la sección Patrocinadores.
- Llaves de pantalla completa, estadísticas y página propia del torneo premium: siguientes fases del diseño.
- Pasar a `main` solo con «Súbelo».

## 7. En Drive (subido y comprobado el 21-oct, carpeta «Phoenix Link — Guías y logros»)
- Esta bitácora → «Web · Bitácora 21-oct-2026: decisiones, Jugadores, patrocinadores, overlay y caras» — https://docs.google.com/document/d/1hkB3U7hWIXxgL4EbDSLrvTjrb5_whNREGb1dBKtE-Q4/edit
- La guía → «Web · Guía de novedades (21-oct-2026)» — https://docs.google.com/document/d/1rQFpnipoxhVMoDp2EEBgO7fQl43vaQxEJ4_sIWnhM7g/edit
