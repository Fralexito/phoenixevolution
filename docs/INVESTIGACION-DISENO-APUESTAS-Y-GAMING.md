# Investigación: cómo organizan sus webs las casas de apuestas y las páginas gaming/esports (16 oct 2026)

Pedido de FRALEX: ver qué ideas de organización, secciones y distribución se pueden aplicar a Phoenix Evolution. Se toman PATRONES (ideas de orden), no se copia diseño, marca ni código de nadie. (Copia desde el proyecto de claude.ai; desde 16-oct las notas viven solo en GitHub.)

Nota de honestidad: las fuentes son artículos de diseño (no las webs oficiales de Bet365, DraftKings, etc.). [fuente] = sale de esos artículos; [general] = conocimiento general del sector, no verificado hoy.

## 1. Casas de apuestas: lo que hacen bien
1. Menú por producto y con pocos botones, lo más usado primero (en vivo, próximos partidos, mi cuenta) [fuente].
2. Inicio tipo tablero: acceso rápido, noticias, tendencias, calendario, favoritos [fuente: Bwin, SBet].
3. Tarjetas «en vivo» que se actualizan solas, con cambio suave de color [fuente].
4. Estadísticas junto al partido, sin salir de la pantalla [fuente].
5. Cupón fijo abajo (bet slip): lo elegido queda pegado mientras navegas; confirmación dentro de la pantalla [fuente].
6. Inicio personalizado: primero tus ligas favoritas; recuerda preferencias [fuente].
7. Cartera/cuenta en un solo lugar: saldo, historial, movimientos [fuente].
8. Navegación abajo, a la altura del pulgar, en celular [fuente].
9. Poca profundidad: todo a 1–2 toques [fuente].
10. Ventanas emergentes de promos [fuente/general]: lo más molesto; mejor discretas.

## 2. Webs gaming / esports: lo que hacen bien
1. Menú típico: plantel/jugadores, calendario o resultados, noticias, tienda, nosotros [fuente].
2. Portada con un solo acento fuerte sobre fondo oscuro; en celular imagen fija en vez de video [fuente].
3. Tarjetas de partido en lista vertical (escudos, hora local, botón «Ver») [fuente].
4. Torneos: llaves, tablas y resultados primero [fuente].
5. Fichas de jugador con efecto al pasar el mouse y botones grandes al tacto [fuente].
6. Calendario de eventos dinámico [fuente: ESL].
7. «Ver» y «Tienda» siempre a mano [fuente].
8. Panel de usuario: la estadística principal arriba, resto en widgets [fuente: FACEIT].
9. Bienvenida según el juego que juegas (+25 % de registros reportado) [fuente: FACEIT].
10. Onboarding guiado para nuevos [fuente: PlayVS].
11. Patrocinadores en una franja de logos [fuente].
12. Tendencias 2026: bento, micro-animaciones inmediatas, modo oscuro cuidado, rapidez antes que decoración [fuente].

## 3. Ideas priorizadas (esfuerzo/valor) y su estado
| # | Idea | Estado (16-oct-2026) |
|---|------|----------------------|
| 1 | Barra fija abajo en celular | HECHO (ronda 329, BarraInferior) |
| 2 | «Tu próximo partido» fijo | HECHO (ronda 329, proximoPartido) |
| 3 | Números que cambian con color suave | HECHO (ronda 331, numerosVivos) |
| 4 | Hora local en cada partido | HECHO parcial (core/proximoPartido `cuando`) |
| 5 | Inicio personalizado | PENDIENTE |
| 6 | Cartera (saldo, historial, logros) | PENDIENTE (la otra cuenta hace economía/gemas) |
| 7 | Bienvenida a nuevos con 3 pasos | HECHO (ronda 330, primerosPasos) |
| 8 | Franja de aliados | PENDIENTE (faltan logos/enlaces del usuario) |
| 9 | Botón «Ver» (clip/stream) | HECHO parcial (clips Twitch/Kick/YouTube, ronda 328) |
| 10 | Estadística principal arriba + widgets en perfil | HECHO (radar «estilo FIFA», ronda 341) |
| 11 | Un solo acento por pantalla | Criterio de diseño |

## 4. Lo que NO conviene copiar
- Promos emergentes que tapan la pantalla (además la regla es «cero ventanas nativas»).
- Cuotas/apuestas con dinero real o bonos de azar: tema legal y de riesgo. Si se quiere «adivinar», con puntos del sitio, sin dinero.
- Videos pesados en autoplay en celular. Presión de «ofertas por tiempo limitado».

## Fuentes
- https://limeup.io/blog/betting-website-design/
- https://ux.bet/sportsbook/
- https://vocal.media/01/mobile-first-sportsbook-design-ux-best-practices-for-higher-retention
- https://muffingroup.com/blog/esports-website-design/
- https://seahawkmedia.com/design/esports-website-design-examples/
- https://ddobs.com/portfolio/ux-design/faceit/
- https://abp.io/community/articles/ui-ux-trends-that-will-shape-2026-bx4c2kow
