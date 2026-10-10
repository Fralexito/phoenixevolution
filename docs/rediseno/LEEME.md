# Rama `rediseno` — propuesta de rediseño pensada para el usuario nuevo

**Creada el 10 de octubre de 2026 a partir de `borrador`.** Nada de esta rama toca `borrador` ni `main`.
Se fusiona solo cuando FRALEX apruebe cada sección y diga «Súbelo».

## Qué hay aquí
- `maquetas/` — las propuestas en HTML. `build.py` las injerta dentro de la página real compilada (`dist/`), así usan la misma cabecera, barra lateral, pie y colores. `base.css` son los estilos comunes (prefijo `x-` para no chocar con los del sitio).
- `capturas/` — cómo se ven: `0-inicio-antes` (hoy), `1-inicio-pc`, `5-inicio-movil`, `2-primeros-pasos`, `3-duelos-guiado`, `4-menu`.

## Diagnóstico (lo que ve alguien que entra por primera vez)
1. No entiende qué es la página ni qué puede hacer.
2. No sabe por dónde empezar: cinco botones iguales.
3. La portada depende de la base de datos; si tarda, queda vacía.
4. Palabras sin explicar: host, radar, Parsec, cupo, reputación.
5. Después de registrarse nadie lo guía.

## Propuestas (cada una se aprueba por separado)
| # | Sección | Qué cambia | Estado |
|---|---|---|---|
| 1 | Inicio | Título que explica, un solo botón principal («Empezar en 4 pasos»), tarjeta «Ahora mismo», camino de 4 pasos, «¿Qué es?» en 3 ideas, tabla con leyenda, noticias, comunidad | Esperando aprobación |
| 2 | Primeros pasos | Panel con progreso solo para quien tiene cuenta; «por qué importa» en cada paso; se oculta al terminar | Esperando aprobación |
| 3 | Duelos guiado | 3 preguntas en vez del formulario; el formulario completo sigue disponible; glosario al lado | Esperando aprobación |
| 4 | Menú | Mismos 4 pilares; cada enlace con una línea de explicación; puerta «Empieza aquí» y columna Ayuda | Esperando aprobación |

## Lo que NO se cambia
Barra lateral izquierda, colores, tipografía, paneles de cristal, títulos con degradado, páginas Liga/Noticias/Jugadores y el resto.

## Cómo volver a generar las capturas
```
PES_BASE=/ npm run build
python3 -m http.server 4399 -d dist &
python3 docs/rediseno/maquetas/build.py      # crea dist/_mock_*.html
# captura con Playwright: ver MAPA.md («Entorno de la IA»)
```
