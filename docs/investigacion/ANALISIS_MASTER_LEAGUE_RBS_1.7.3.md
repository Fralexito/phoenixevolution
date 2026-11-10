# Análisis de «Master League for eFootball 1.7.3» (RBs GameLab) para Phoenix

Fecha: 10-nov-2026. Objetivo de Frank: entender TODO lo que hace ese programa y construir código PROPIO que imite sus funciones en la web de Phoenix y en una app web.
Regla de este documento: aquí solo se describen funciones e ideas. No se copia código, textos, gráficos ni datos del programa. Todo lo que se construya se escribe desde cero, con textos propios.

Método: se leyó el exe sin ejecutarlo. Se separó su paquete interno (163 archivos) y se estudió la interfaz web (JS/HTML), los textos de traducción (1.767 frases en español), los archivos de reglas y la documentación incluida. El motor de cálculo está compilado (Rust), así que las fórmulas exactas NO se ven; lo que sigue sale de lo que dicen los textos y las pantallas. Donde digo «inferido» es una deducción, no un hecho.

---

## 1. Cómo está construido (arquitectura)

| Capa | Qué es | Para Phoenix |
|---|---|---|
| Exe único | Python 3.12 compilado (Nuitka), 26 MB, se descomprime al abrir | No hace falta |
| Servidor local | Servicio HTTP en el propio PC que sirve la interfaz y una API | Nuestra web ya tiene Supabase: es el equivalente |
| Interfaz | Web normal: HTML + JS puro + GSAP/Flip (animaciones), 6 idiomas, también se maneja con mando (D-pad, A/B, LB/RB) | Igual que phoenixevolution (Astro + JS) |
| Motor de liga | Módulo Rust (`mlcore`) + Python (numpy). Simula partidos, mercado, progresión, directiva | Lo reescribimos en JS puro en `src/js/core/*` con tests |
| Lector de la base del juego | Lee la base de datos del juego (dt200) y escudos/caras | En PES 2021 lo hace Sider/Phoenix Core o el editor de BD |
| Plugin de estadísticas | `dxgi.dll` (Rust) que el juego carga; cada 5 s lee la memoria del juego y escribe un JSON con goles y estadísticas de cada jugador | En PES 2021: un módulo Sider/Phoenix Core (ya tenemos la ruta) |
| Escritura al juego | Copia de la base con los cambios de la carrera; el plugin hace que el juego lea esa copia y la recargue en vivo | Idea clave para el parche propio (ver §8) |
| Motor de tácticas (experimental) | Añade una sección al exe del juego y mueve la línea defensiva, ancho, marcaje, presión | Solo para PES propio; lo más delicado |
| Guardado | Carpeta `saves/` con JSON por carrera + copia de la base al empezar | En la web: tabla en Supabase por liga |

Dato útil: las reglas de tácticas/roles vienen en JSON claros (presets de táctica y roles de jugador). Las reglas del motor llevan un cerrojo de cifrado (no se tocan). Nosotros definimos las nuestras.

---

## 2. Inventario completo de funciones (lo que hace, módulo por módulo)

### 2.1 Crear carrera
- Elegir liga del juego con un clic («Desde una liga») o armar equipos a mano (buscador con escudos). Mínimo 2 equipos, ida y vuelta.
- Opciones: nombre de liga, copa nacional (sí/no), cartas de jugador (como el juego / todas las variantes), segunda división real (sí/no), selección nacional opcional, «reglas del mundo»: Clásico (cantera) o Mundo renacido (sin cantera, los retirados renacen).
- **Calendario real**: las 15 ligas europeas a la vez con el calendario 2026/27, copas nacionales, Champions (formato de 36 equipos, 8 partidos, play-offs, octavos), Europa League, supercopas.
- Varias partidas guardadas, cambiar entre ellas, borrar.

### 2.2 Inicio (panel principal)
- «Próximo partido» (rival, quién es local, probabilidades previas local/empate/visitante) y botón «Ir al juego».
- Resultados de la jornada, tabla, goleadores, asistentes, rachas, «líder a X puntos», análisis del rival.
- Tarjetas con atajos: Próximo partido, Resultados, Tabla, Champions, Europa League, Copas, Ligas, Selecciones, Noticias, Directiva, Logros, Transferencias, Entrenamiento, Calendario.
- Pestañas y buscador de «todas las secciones».
- «Pendientes»: ofertas por responder, ofertas de trabajo, contratos por vencer, promesas de cantera, retiros por decidir.
- «Teléfono» (bandeja de entrada): mensajes que requieren tu decisión (aceptar/rechazar ofertas, renovar, etc.) y un teletipo de noticias.

### 2.3 Jugar y simular
- Jugar en el juego (amistoso con los dos equipos), el programa detecta el resultado a los ~5 s y simula el resto de la jornada.
- «Simular» tu partido, «Manual» (poner tú el marcador), «Simular hacia adelante» (5 partidos / hasta fin de mes / hasta fin de temporada) con paradas automáticas si llega una oferta, te despiden, hay un empate de copa por decidir o termina tu temporada.
- Empate en copa: tú marcas quién ganó (prórroga/penales).
- Simulación del resto de la liga con rating tipo **Elo** + ataque/defensa del plantel (inferido de los textos).
- **Hándicap por racha**: si ganas N seguidos, el rival recibe +D en todos los atributos (no en partidos de selección). Es una idea de dificultad dinámica.
- Omitir el informe del partido (modo rápido).

### 2.4 Estadísticas
- Tabla completa (PJ G E P GF GC DG Pts, forma de los últimos partidos), goleadores, asistentes, valoración media.
- Estadísticas por jugador y por partido: ataque, pases, posesión, defensa, arquero, disciplina (tiros, pases completados/intentados, entradas, intercepciones, tarjetas, faltas…).
- Jugador del partido, goles del partido, historial.
- Lesiones y suspensiones con tipo de lesión (golpe, tobillo, isquiotibiales, rodilla, ligamentos, fractura, menisco, cruzado, Aquiles) y duración en semanas; tarjetas amarillas acumuladas y rojas.
- Condición física: baja tras cada partido y se recupera día a día.

### 2.5 Plantel y táctica
- Plantel con filtros; ficha de jugador con pestañas: Resumen, Atributos (6 grupos), Posiciones (dominada/apta/no apta), Habilidades, Estilo de juego, Condición, Estadísticas de liga, Perfil, Contrato, Cartas, Progresión, Entrenamiento, Mentoría, Editar.
- **Tácticas**: formación; alineación automática o manual (arrastrar para intercambiar), titular + banquillo (6) + reservas, avisos de «fuera de posición», «mejor XI automático» que evita lesionados/sancionados, sustitutos automáticos.
- Escribe las alineaciones DENTRO del juego al empezar el partido (los dos equipos).
- Presets de táctica: Gegenpress, Bloque bajo, Juego por bandas, Contraataque (cada uno = varios ajustes: línea de presión, línea defensiva, compacidad, marcaje, qué hacer al perder/ganar balón, solapes).
- Roles de jugador del propio juego (p. ej. «Goal Poacher», «Dummy Runner», «Fox in the Box») traducidos a instrucciones de movimiento.
- «Maximizar XI» (modo truco): 103 en todo y todas las habilidades.

### 2.6 Progresión de jugadores (lo más original)
- **Estatus/Reputación**: Promesa → Regular → Estrella → Superestrella → Leyenda. La reputación baja cada verano y se gana jugando bien.
- **XP**: jugar da XP; cada N XP = +1 punto de atributo. Multiplicador por etapa de edad (años dorados, en desarrollo, madurando, plenitud, plenitud tardía, veterano).
- **Tipo de desarrollo**: precoz / normal / tardío.
- **Potencial** con nota del ojeador S/A/B/C (techo).
- **Saltos** («break»): un gran partido contra un rival fuerte puede subir el potencial.
- **Declive** por edad: bajan primero los atributos físicos.
- **Aprender habilidades** y **nuevas posiciones** con el tiempo.
- **Centro de entrenamiento**: espacios limitados; entrenar una habilidad, una posición o un atributo concreto (+1 cada ~N partidos hasta 99). Jugar y estar en el banco cuentan distinto. Habilidades «especiales» bloqueadas hasta ser Estrella.
- **Mentoría**: junto a un mentor que conoce la habilidad, los jóvenes (≤ cierta edad) ganan XP doble y aprenden más rápido.
- Historial de carrera por jugador («aprendió X», «ascendió a Estrella», «salto de potencial»).
- Cuerpo técnico: **leyendas retiradas** que te dan más espacios de entrenamiento.

### 2.7 Vestuario y ánimo
- Ánimo por jugador: jugar da satisfacción, el banquillo frustra (sobre todo a los titulares/estrellas).
- Roles del plantel: Titular / Rotación / Suplente.
- **Química del equipo**: un titular se adapta del todo tras N partidos con el mismo grupo.
- Un jugador descontento **pide irse** → tú: prometer minutos, dejarlo ir (sale a la venta) o negarte (queda molesto). Si lo ignoras o rompes la promesa, empeora.
- Noticias asociadas («retira su solicitud», «cumpliste tu promesa»…).

### 2.8 Mercado de transferencias
- Ventanas: verano (inicio hasta 1-sep) e invierno; contador de días/jornada.
- Buscar jugadores con muchos filtros (línea, posición exacta, edad, valoración, valor, sueldo, estatus, nacionalidad por continente, liga, contrato por vencer, en venta, cedible) y orden.
- Ofertas: tú compras (club pide precio, jugador pide sueldo), contraofertas, la paciencia del club (pacientes / impacientes / casi sin paciencia) y «se retiran» tras muchas ofertas bajas; periodo de enfriamiento de 30 días.
- Incluir tus jugadores como parte del pago (trueques, máx. N por operación; ellos tasan tus jugadores).
- **Cláusula de rescisión**: pagas y evitas negociar; tú también tienes cláusula al renovar (múltiplo del valor).
- **Préstamos**: media temporada o completa, el club receptor paga parte del sueldo, con opción u obligación de compra; máx. 3 cedidos por temporada; los jugadores clave no se ceden.
- **Lista de transferibles**: con rebaja (×0.8), valor de mercado o prima (×1.2); los clubes IA hacen ofertas.
- Agentes libres (contratos que vencen).
- Ofertas recibidas por tus jugadores (aceptar/rechazar, con trueque o préstamo).
- Reglas: plantel máximo 40, presupuesto salarial, el jugador no acepta ir a un club claramente más débil, el comprador sin dinero anula la oferta.
- Registro de últimas transferencias del mundo; la IA compra y vende entre sí.
- Contratos: renovar (el jugador pide X/año por Y años), dejar ir, liberar (cuesta la mitad de lo que queda).

### 2.9 Finanzas
- Ingresos: día de partido, TV, comercial, premios de liga, premios UEFA, bonificación de la directiva, ventas.
- Gastos: sueldos, compras, cargos de préstamo, pagos por liberación, personal, instalaciones.
- Estado: hasta ahora / estimado fin de temporada / temporada pasada / neto; «costo del plantel» = sueldos + amortización.
- La IA también invierte en instalaciones y puede endeudarse.

### 2.10 Directiva
- Confianza 0-100: victorias suben, derrotas bajan.
- Objetivo de temporada según la fuerza esperada del plantel (ganar liga, top 4, mitad de tabla, evitar descenso; objetivo propio para Champions).
- Fallar el objetivo → advertencia; fallar de nuevo → **despido** (también a mitad de temporada).
- Cumplir con mucha confianza → **bonificación** de dinero y **ofertas de otros clubes** (te «roban»). Si te despiden, te ofrecen trabajo.
- Selecciones nacionales: ofertas cuando una selección cambia de DT; puedes renunciar.

### 2.11 Selecciones y torneos
- Liga de Naciones, clasificatorias Mundial/Euro, torneo de repesca, Euro y Mundial, por confederación.
- Si diriges una selección: convocatoria de 16 a 26 jugadores o «que elija la IA»; los partidos de selección son partidos tuyos.
- Ventanas internacionales en el calendario.

### 2.12 Cantera y retiros
- Cada verano llegan N jóvenes de 16-18 años; ascender al primer equipo (toma el número del que se fue).
- **Mundo renacido** (modo alternativo): sin cantera; cada estrella que se retira reaparece en su país a los 16 años como «reencarnación» (se ve de quién renació).
- Estrellas próximas a retirarse: tú decides (renacer en la cantera, licencia de entrenador, retirarse); si no eliges, valor por defecto.
- Renovación del mundo cada temporada: retirados, salidos, nuevos jugadores (y «joyas» de cantera).

### 2.13 Logros y ceremonia
- Carrera por el **Jugador del Año** (puntuación en vivo: forma = (nota media − 6)×10, goles y asistencias, vallas invictas, trofeos, poder de estrella) y por el Europeo, Bota de Oro, Guante de Oro, máximo asistente, Joven del Año, Equipo de la Temporada, premios de Champions y de selecciones.
- Historial de campeones por temporada, palmarés por equipo, **Salón de la Fama** (entran al retirarse o irse, según puntos), **Récords** (goleadores históricos, más apariciones, goles en una temporada, tabla de trofeos, temporadas invictas).
- **Ceremonia de fin de temporada** (animada, con «Siguiente / Omitir»): campeón, tu temporada, directiva, ascensos/descensos, premios, nuevos del Salón de la Fama, destino de las leyendas.
- Etiquetas de racha: «5 victorias seguidas», «invicto en N», «temporada invicta».

### 2.14 Cartas y apariencia
- Cartas de jugador del juego (base, estándar, legendaria, POTW/POTM/POTS, evento, Big Time, Show Time, selección…); elegir qué variante usa tu jugador. Cartas animadas hechas por capas (fondo, efecto, marco, jugador, destellos) mezcladas con CSS.
- Editor de jugadores propios: atributos, potencial, edad, posición, altura, peso, nacionalidad, pie, estilo, contrato; apariencia (cuerpo, cara, ojos, cejas, nariz, boca, orejas, pelo, vello facial) y movimientos (regate, postura de tiros libres/penales/córners, carrera, celebración). Si el jugador tiene cara real, la cara no se edita.

### 2.15 Modo desarrollador (muy útil para equilibrar)
- Simula N temporadas seguidas en una copia de la partida, con piloto automático para tu equipo y un **informe de salud del mundo**: goles por partido, victorias de local/empate/visitante, % de favoritos que ganan la liga, sorpresas, lesiones por partido, población, edad y valoración media, cuántas estrellas/leyendas, transferencias y dinero, clubes endeudados, desfase de fuerza, tiempos de cálculo. Cada métrica con un «objetivo» y marca de «fuera de objetivo».

### 2.16 Extras de interfaz
- Sonidos, ayudas de botones en pantalla, manejo completo con mando, 6 idiomas, plantilla para que otros traduzcan, globo terráqueo 3D de puntos (canvas 2D) para elegir país, animaciones (GSAP), actualización automática firmada.

---

## 3. Reglas de juego que se deducen (para copiar como IDEA y ajustar con nuestras cifras)

1. La liga IA se simula con Elo + ataque/defensa; el favorito gana más pero hay sorpresas controladas (se miden en el modo desarrollador).
2. Hándicap por racha de victorias para mantener la dificultad.
3. XP por partidos jugados × multiplicador por edad × (doble con mentor). Estancamiento si la valoración ya supera el techo.
4. Declive físico antes que técnico.
5. Reputación decae cada verano; sube con premios y partidos importantes.
6. El jugador pide irse si juega poco para su nivel; hay que responderle.
7. Directiva = confianza que sube/baja por resultado; objetivo ligado a la fuerza esperada.
8. Mercado con tope de plantel, presupuesto de sueldos, cooldown tras negociaciones rotas, límite de cesiones.
9. Retiros con decisión del usuario y reaparición opcional.
10. Todo lo largo y aburrido (simular) se puede saltar y se detiene solo cuando necesitas decidir.

---

## 4. Qué NO es replicable en una web (y cómo se resuelve)

| Función de ellos | Por qué no es web pura | Solución Phoenix |
|---|---|---|
| Leer resultado y estadísticas del partido | Requiere leer la memoria del juego | Módulo Sider / Phoenix Core de PES 2021 que escriba un JSON; la web lo recibe por Phoenix Link/sync, o el jugador lo sube a mano |
| Escribir la carrera dentro del juego (plantillas, fichajes) | Requiere copia de la BD y recargarla en vivo | Mismo módulo: parche con base de datos propia (plan «BD propia») |
| Cambiar la táctica de la IA del juego en vivo | Parchea el exe | Fase tardía en Phoenix Core; no es necesario para la web |
| Cartas animadas leídas del juego | Archivos del juego | Nuestras propias cartas (sección Gráficos), ya planeadas |

Conclusión: la mayor parte (≈85 %) es lógica de liga que sí va en la web.

---

## 5. Comparación con lo que ya tiene Phoenix (a verificar con MAPA.md antes de construir)

Ya tenemos (según el repo): liga con partidos, tablas, jugadores, economía, palmarés, animaciones fuertes, perfiles. Falta (ideas nuevas del programa):
- Progresión de jugadores con XP/etapas/mentoría/centro de entrenamiento.
- Ánimo y vestuario (peticiones de salida, promesas de minutos).
- Mercado profundo: cláusulas, préstamos, trueques, lista de transferibles, contraofertas con paciencia.
- Directiva con objetivos y despido.
- Cantera y modo «mundo renacido».
- Premios con carrera en vivo, Salón de la Fama, récords, ceremonia de fin de temporada.
- Finanzas por conceptos.
- Simular hacia adelante con paradas inteligentes.
- Modo desarrollador / informe de equilibrio (muy útil para ajustar nuestras reglas).
- Lesiones y suspensiones detalladas y condición física.
- Selecciones y torneos internacionales.

---

## 6. Propuesta de hoja de ruta (de más valor y menos riesgo a menos)

Cada bloque = módulo puro `src/js/core/*` con tests + pantalla en `features`. Todo con interruptor encender/apagar.

1. **Progresión** (XP, etapas, potencial, estatus, mentoría) — da vida al plantel.
2. **Directiva + objetivos + despido/ofertas**.
3. **Mercado avanzado**: ventanas, contraofertas, cláusulas, préstamos, trueques, lista de transferibles.
4. **Ánimo/vestuario + peticiones de salida**.
5. **Lesiones y suspensiones + condición física**.
6. **Logros**: carrera por Jugador del Año, Bota/Guante de Oro, Salón de la Fama, récords, ceremonia de fin de temporada.
7. **Finanzas por conceptos**.
8. **Cantera + retiros + mundo renacido**.
9. **Simular hacia adelante + «Pendientes» + bandeja/teléfono**.
10. **Modo desarrollador / informe de salud** (se hace junto al paso 1 para equilibrar).
11. **Selecciones/torneos** (al final, es grande).
12. **App web (PWA)**: instalable, manejo con mando, modo táctil, notificaciones de ofertas.

El «motor de liga» debe ser el mismo código para la web y la app (un solo paquete de reglas), y el módulo de PES 2021 solo aporta/recibe datos.

---

## 7. Qué necesito de Frank para empezar (orden sugerido)

1. Confirmar la hoja de ruta (SÍ/NO o cambiar el orden).
2. Dejar claro si la web seguirá siendo «liga de jugadores humanos» con partidos reales entre ellos, o si añadimos también el modo «carrera individual contra IA» (el programa es solo carrera individual). La mayoría de las ideas sirven para ambos, pero cambia cómo se guardan.
3. Si quieres que investigue cómo leer el marcador y las estadísticas desde PES 2021 con Sider (equivalente a su plugin), sería el siguiente hilo de ingeniería inversa: usar REA primero.

---

## 8. Hallazgos laterales para el catálogo de PES (ideas para el parche propio)

- Patrón «base de datos copiada + recarga en vivo»: el plugin hace que el juego lea una copia de la BD y la recarga sin reiniciar. Es justo lo que necesita el plan «BD propia» (pes-db). A estudiar en PES 2021 con REA.
- Estadísticas por jugador leídas cada 5 s de memoria (9 contadores por id). El equivalente en PES 2021 serviría para el informe de partido de Phoenix.
- Detectar fin de partido sin depender del silbato (el contador sigue subiendo en el resumen): usar «el objeto del partido pasa a nulo».
- Los penales no mueven las estadísticas normales: se leen de contadores de equipo.
- Presets y roles de táctica expresados como valores simples (línea defensiva, compacidad, marcaje, solape): un buen modelo para el panel «Táctica Street».
- Hándicap por racha y modo desarrollador como herramientas de equilibrio.

Ningún dato de este análisis requiere saltar ninguna protección: todo salió de archivos que el propio programa incluye.
