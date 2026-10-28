# Rama `rediseno-web` — laboratorio del rediseño completo (27-oct-2026)

- **Dirección:** https://fralexito.github.io/phoenixevolution/fase-rediseno/ (tu `borrador` sigue en /fase-beta-1-0/ sin cambios).
- **Publicar un cambio de esta rama:** `gh workflow run deploy.yml --ref borrador` (o «Run workflow» en GitHub, rama borrador).
- **Plan e investigación:** documento «Phoenix Evolution · Investigación y plan de reestructuración de la web» (Claude Docs) y Drive.
- **Interruptor:** `FX.rediseno` en `src/data/experimento.js` → `<html data-rediseno>`. Todo el estilo nuevo vive en `styles/sistema.css`
  (sistema base) y `styles/portadaRd.css` (Inicio). Con `false`, esta rama se ve igual que borrador.
- **Inspiración:** la web de la UEFA Champions League (base) + F1, NBA, Linear, Stripe, Netflix, FACEIT, Battlefy, LoL Esports, EA FC.
  Identidad propia: noche Galaxy, Rajdhani, el «corte» a 45° y los iconos propios «Corte» (`data/iconosPhoenix.js` → `node scripts/iconos-phoenix.mjs`).

## 27-oct 15:35 · Vuelve la identidad (pedido de Fralex)
«Le quitaste cosas que le daban mucha identidad» y «también los efectos 3D y el dinamismo». Vuelven: «Bienvenido a la Galaxy» con
Galaxy en degradado, las 4 ventanas que giran (con «Empieza en 3 pasos»), el ambiente galaxia (fondo con luces, brillos neón, estrellas,
vidrio, logo con brillo), la cinta Última hora, el botón flotante En vivo, la moneda dorada de Mi club, la barra lateral (accesos rápidos,
ligas y amigos) y el chat. Lo nuevo se queda: menú de 5 destinos, tira de partidos ARRIBA de la portada y, DEBAJO de las ventanas,
los bloques nuevos (Galaxy League con la carta del líder junto a la tabla, Tu club, Campeones, Jugadores, Lo último, Cierre).
Movimiento: los bloques nuevos se inclinan en 3D con el mouse (clase .rd-p3 en prof3d), aparecen al bajar, la tira entra en cascada,
los botones se llenan de púrpura a cian y las tarjetas suben al pasar el mouse.
**Regla para lo que sigue:** NO quitar efectos, brillos ni piezas de identidad; reordenar y sumar, no restar.

## 27-oct 15:45 · Segunda corrección (Fralex: «le quitaste demasiadas cosas; los iconos se ven aún más genéricos»)
- Iconos propios «Corte» APAGADOS (`FX.iconosPropios = false`): vuelven exactamente los de borrador. Los archivos quedan por si se retoman.
- Inicio: debajo de «Bienvenido a la Galaxy» y las ventanas vuelve TODO el contenido de borrador con sus efectos. El cuerpo nuevo
  (`PortadaRd parte="cuerpo"`) queda guardado pero sin usarse. Lo único nuevo en Inicio: la tira de partidos arriba.
- Medido: en Liga, Duelos y Social el movimiento es idéntico al de borrador (mismas animaciones y transiciones 3D).
- Siguiente: no tocar nada visual sin una muestra aprobada antes.

## Fases
1. **Sistema base** — HECHO: tokens (noche, capas, textos, corte), cabecera estilo Champions con 5 destinos (Inicio · Jugar · Liga ·
   Comunidad · Mi club), sub-menú subrayado, barra de abajo con los mismos 5, iconos propios, fuera brillos/vidrio/texto degradado,
   fuera cinta Última hora, barra lateral y botón flotante «En vivo».
2. **Inicio** — HECHO: `components/rediseno/PortadaRd.astro` (7 bloques). Tira de partidos: `core/portada/tira.js` (+ tests/tira.test.mjs).
3. Liga (pestañas Galaxy/Sudario + Partidos · Tabla · Estadísticas · Jugadores · Palmarés), Torneos, Ranking — PENDIENTE.
4. Jugar (Duelos, En vivo, Mis partidos) y Mi club — PENDIENTE.
5. Comunidad, fichas (perfil, jugador, rivalidad), cuenta y limpieza final — PENDIENTE.

Nada de esto llega a `borrador` ni a `main` hasta que Fralex diga «Súbelo».

## 27-oct · Regla para siempre: «Nunca listas nativas»
- Fralex (captura de la lista gris de Android): «que la página nunca más tenga algo así, tan arcaico y feo».
- Todo `<select>` de la web abre el **Selector Phoenix** (js/features/selectorPhoenix.js + styles/selectorPhoenix.css): panel Galaxy en PC, hoja desde abajo en celular. No hay que tocar cada página: funciona solo, también con los selectores creados por JavaScript.
- Excepciones: `multiple`, `size>1` o `data-nativo` (solo si hay una razón fuerte).
- Pendiente con la misma regla: los selectores de fecha/hora (`type="date"`, `time`, `datetime-local`, `month`; 12 en la web) aún abren el calendario del sistema.
- Liga: vuelve el «Últimos» con flechas ‹ › y contador (5/11), como antes del 19-oct (pedido de Fralex).

## 27-oct (noche) · «Hazlo todo»
- Calendario Phoenix: fecha/hora/mes sin el calendario del sistema (js/features/calendarioPhoenix.js, core/sistema/cuadriculaFechas.js). Ojo: `core/sistema/calendario.js` es OTRO archivo (añadir a mi calendario .ics); no confundir.
- Social: las iniciales de los comentarios y de «Lo más reaccionado» tienen su círculo.
- Jugar (Sala de Duelos): arriba «Por jugar» (fecha actual) y «Salas jugando» (en vivo). components/rediseno/JugarRd.astro
- Mi club: «Los clubes de la Galaxy» (solo sin sesión) + arreglo del texto dorado de «Mi club» en el menú cuando está abierto.
- Jugadores: tira de escudos para filtrar por club (js/features/jugadores/tiraClubes.js).
- Perfil: «Tu rincón» en tu propio perfil: próximo partido, puesto y atajos (js/features/perfil/rincon.js, core/portada/rincon.js).
