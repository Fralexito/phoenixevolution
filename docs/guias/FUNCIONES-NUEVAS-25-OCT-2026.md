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
