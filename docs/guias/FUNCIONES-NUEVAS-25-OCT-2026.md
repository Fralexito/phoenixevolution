# Funciones nuevas del 25-oct-2026 (Cuenta 2) · guía, cómo funcionan y cómo se probaron

Pedido de Fralex: «Hazlo todo, todas las ideas… blinda todos los escenarios posibles». Orden elegido por él («lo más rápido primero»):
1. Tutorial de bienvenida · 2. Calendario personal · 3. Estado de los hosts · 4. MVP del partido · 5. Goleadores automáticos ·
6. Prode (exacto 10, ganador 3, tope 100/semana, solo ascuas gratis) · 7. Clan contra clan · 8. Draft en vivo (Liga Máster y torneos).
Base de datos: se intenta aplicar; si Supabase cancela el permiso, el SQL queda para que Fralex lo pegue (migraciones reservadas 146–152).
Cada parte se AÑADE aquí al terminarla: qué es, cómo se usa, piezas, blindaje (qué puede salir mal y qué se hizo) y cómo se probó.

Herramienta de pruebas visuales (nube): Chromium de `@sparticuz/chromium@131` (npm, trae el navegador dentro; los demás caminos de
descarga están bloqueados por el proxy) en `/tmp/chromium`. `CHROME_PATH=/tmp/chromium npm run test:paginas` funciona con él.

---

## 1. Tutorial de bienvenida (beta 1.19.0 · sin base de datos)

**Qué es:** un recorrido de ~1 minuto (7 pasos: bienvenida, Mi club, Jugar, Comunidad, Competiciones, Buscar, Avisos y cierre) que
ilumina los botones reales de la página. Sale solo **la primera vez** que alguien abre la portada en ese navegador.
**Repetirlo:** Configuración → Datos → «Ver el tutorial otra vez», o `?tutorial=1` en cualquier página.

**Piezas:** `src/js/core/sistema/tutorial.js` (pasos y reglas puras) + `tests/tutorial.test.mjs` · `src/js/features/tutorial.js`
(pantalla) · `src/styles/tutorial.css` · arranque en `src/js/boot.js` (código descargado aparte y después de pintar) ·
acción `tutorial` en `src/data/ajustes.js` y `src/js/pages/ajustes.js`. Clave del navegador: `pes-tutorial-v1` (`visto`/`saltado`).

**Blindaje (qué podía salir mal → qué se hizo):**
- Un botón no existe (sin sesión no hay campana) u está oculto → ese paso se salta; cada paso prueba el selector de PC y el de celular.
- Un selector raro lanza error → se prueba el siguiente; si casi no queda nada, no se abre.
- Hay otra ventana abierta (bienvenida, registro, menú lateral) → espera hasta ~18 s y si sigue, no molesta (sale otro día).
- Cambio de tamaño, giro o scroll → se reacomoda (requestAnimationFrame); la tarjeta nunca se sale de la pantalla (arriba, abajo o centrada).
- El elemento está fuera de la vista → se desplaza hasta él (sin animación con «menos movimiento»).
- «Menos movimiento» → sin transiciones. Teclado: Esc cierra, ← → Enter navegan, el foco no sale de la tarjeta y vuelve a donde estaba.
- Modo privado (no se puede guardar) → funciona igual; solo no recuerda que ya se vio. Dentro de un iframe → nunca arranca.
- Cualquier error al abrir → se cierra limpio y lo registra en la consola.
- La sombra gigante (`box-shadow` de 9999 px) para oscurecer **no se dibujaba** en Chromium: se cambió por una capa SVG con un
  «agujero» (`fill-rule: evenodd`), que funciona en todos.

**Cómo se probó:** `npm test` (4 pruebas nuevas), build, 61/61 páginas, y capturas reales en 390×844 y 1440×900: arranca solo,
avanza con flechas, ilumina el botón correcto en cada tamaño, y Esc lo cierra y guarda `saltado`.

---

## 2. Calendario personal (beta 1.20.0 · sin base de datos)

**Qué es:** botón «Añadir a mi calendario» en **Mis partidos** (duelos agendados con hora), en cada **evento** próximo y en la
**ficha de un torneo** con fecha de inicio. Abre una ventana con un botón de **Google Calendar** por cada partido y
**«Descargar (.ics)»**: un archivo que abre el calendario del celular o de la PC. Cada uno trae un **aviso 30 minutos antes**.

**Piezas:** `src/js/core/sistema/calendario.js` (archivo .ics y enlace de Google, puro) + `tests/calendario.test.mjs` (6 pruebas) ·
`src/js/features/calendario.js` (ventana y descarga) · `src/styles/calendario.css` · botones en `src/pages/mis-partidos.astro` +
`src/js/pages/misPartidos.js`, `src/js/pages/eventos.js` y `src/js/pages/torneo.js`.

**Blindaje:**
- Horas en UTC (`Z`) → sirven en cualquier zona horaria; el calendario de cada uno las muestra en su hora.
- Identificador fijo por partido (`duelo-7@phoenixevolution`) → añadirlo dos veces actualiza el mismo evento, no lo duplica.
- Textos con comas, punto y coma, saltos de línea, comillas o emojis → escapados; líneas plegadas a 75 bytes sin partir caracteres.
- Partidos sin hora fija o que ya pasaron → no se añaden y se dice cuántos («No se añadieron: 1 sin hora fija y 1 ya pasó.»).
- Nada válido → aviso, no ventana vacía. Solo enlaces `https` en el archivo.
- iPhone: se comparte el archivo (abre Calendario); si el navegador no deja descargar, plan B con un enlace `data:` y, si
  tampoco, aviso de usar Google. Cancelar el menú de compartir no muestra error.
- Mis partidos: la variable con los agendados se declara arriba (antes podía usarse antes de existir y romper la página).

**Cómo se probó:** 6 pruebas puras; en el navegador real, la página Eventos con un evento simulado (título con «», comas y
punto y coma, descripción con salto de línea): la ventana sale, el enlace de Google es correcto y el `.ics` descargado tiene
`UID`, `DTSTART`/`DTEND` en UTC, el texto escapado y el `VALARM` de 30 min.

---

## 3. Estado de los hosts (beta 1.21.0 · migración 146 APLICADA)

**Qué es:** nueva sección en **Salas en vivo** con cada host aprobado que tiene Phoenix Link: **Sala abierta**, **En partida**,
**Encendido** o **Apagado (visto hace X)**, su región y su **ping típico** (mediana de los últimos 7 días, con semáforo:
menos de 60 ms bien, menos de 110 regular, más = alto). Se actualiza sola cada minuto.

**Piezas:** `supabase/migrations/146_estado_hosts.sql` (función `hosts_estado()`, solo lectura, sin tablas nuevas) ·
`src/js/core/comunidad/estadoHosts.js` + `tests/estadoHosts.test.mjs` (4 pruebas) · `src/js/features/salas/estadoHosts.js` ·
sección `#bloque-hosts` en `src/pages/en-vivo.astro`, conectada en `src/js/pages/enVivo.js`.

**Cómo sabe si está encendido:** Phoenix Link actualiza `dispositivos_host.ultimo_uso` en cada llamada → encendido si fue
hace menos de 5 min; la sala cuenta si su latido tiene menos de 3 min (igual que el resto de Salas en vivo).

**Blindaje / privacidad:** solo hosts aprobados o staff; nunca sale el token ni el nombre de la PC; «visto» redondeado a 5 min;
apagados hace más de 30 días no salen; ping solo con 5 muestras o más; si hay bloqueo entre tú y el host, no te sale;
sesión obligatoria; tope 100. En la web: sin sesión no pide nada; si la base no tuviera la 146, la sección se oculta sola;
otros fallos → mensaje con «Reintentar»; no se encima un pedido sobre otro.

**Cómo se probó:** 4 pruebas puras; la función se ejecutó en la base real como admin (devolvió el host de Hugo, apagado,
visto redondeado, sin ping por falta de muestras); la página carga sin errores y sin sesión la sección queda oculta.
