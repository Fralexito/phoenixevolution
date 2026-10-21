# Traspaso · Noticias como diario (16-oct-2026, cuenta Opus)

Para la IA que continúe la charla. Todo esto ya está hecho y empujado a la rama `borrador`.

## 1. Qué se construyó (ronda 349 + dos arreglos)

La página de Noticias pasó a ser **un diario con departamentos**. Bandera: `FX.diario` en `src/data/experimento.js` (ponla en `false` y vuelve la grilla de antes).

| Archivo | Qué hace |
|---|---|
| `src/js/core/portada/departamentos.js` | Catálogo de **24 departamentos** (color, firma, voz, de qué parte de la web se alimenta) + `departamentoDe()`. Detecta **primero por la etiqueta** y recién después por el título. |
| `src/js/core/portada/diario.js` | `ordenDelDia()` baraja la portada con semilla de la fecha + 5 reglas; `armarPortada()` arma afiche, primera plana, últimas, resto y joda. Si hay orden manual del staff, ese manda. |
| `src/js/core/portada/afiche.js` | Decide **qué** va en el afiche del día: tipo, color del día, grito corto, palabra resaltada, marcador, inicial. |
| `src/js/features/noticias/afiche.js` | Dibuja el afiche en HTML y lo exporta a **PNG con canvas** (3:4 y 9:16) + `navigator.share` en celular. |
| `src/js/features/noticias/diario.js` | Pinta la portada corta y conecta los botones de descarga. |
| `src/styles/diario.css` | Estilos (`.af-*`, `.dia-*`). Ojo: dentro del afiche se anula `main[data-sia] h2`, que ponía los títulos en fila. |
| `tests/diario.test.mjs` | 15 pruebas del núcleo. |

**Las 5 reglas del orden** (en `diario.js`): manda lo más fuerte del día · la joda siempre va después de lo serio · nada repetido al lado · lo urgente (Tribunal/En vivo) nunca al final · el orden manual del staff gana al azar.

Se conserva TODO lo anterior: Acomodar (GridStack), catálogo de diseños, lienzo libre y editor.

Estado: **565 pruebas en verde**, build de 53 páginas, probado en PC (1394 px de alto, poco scroll) y celular, y descargando las dos portadas.

## 2. Contenido publicado hoy

Se publicaron **8 noticias** (las primeras del diario): crónicas de las fechas 10 y 11, El Analista, Ranking de poder, Previa de la fecha 12, aviso del Tribunal, El Archivo y una de La Tribuna. Las 8 propuestas quedaron `aprobada` en `ia_propuestas`.

La historia: la liga pasó de **5,4 goles por partido** (hasta la F9) a **1,9** en las fechas 10 y 11, con seis 0-0. Victor 29 pts, Beto 26, Degox 23 con dos partidos menos; Victor y Degox son los únicos invictos.

## 3. Regla nueva de FRALEX

**Las noticias son semanales.** El paquete sale los lunes, o cualquier día en que FRALEX cargue datos nuevos (resultados, fichajes) o lo pida. Ya está metida en la tarea programada «Redacción IA Phoenix» (versión 3), que sigue corriendo todos los días a las 9:54 de Lima para vigilar y dejar el resumen.

## 4. Lo que falta (en orden)

1. **Reacciones, encuestas y comentarios** en las noticias. Necesita migración nueva (reservar el número en `REGISTRO.md` primero) con sus tablas y RLS, y el front.
2. **Página propia de cada noticia** (`/noticia/<slug>`) para compartir por WhatsApp con vista previa.
3. **El taller del staff**: plantillas de contenido por departamento al crear una noticia nueva, y «Sorpréndeme» para toda la portada.
4. Probar el afiche en un celular real y revisar el vertical 9:16 (queda bastante aire en el medio cuando la nota es corta).
5. Aviso pendiente en la bandeja: los borradores viejos de la fecha 8 nombran a «Roberto», que ya no está en la lista de clubes (ese club ahora es de Maurisgame).

## 5. Pregunta abierta para FRALEX

¿Los lunes la Redacción publica directo, o sigue dejando todo como borrador en la Bandeja IA para que él o un moderador aprueben? Hoy publicó porque él lo pidió en el chat.

## 6. Boceto aprobado

El diseño se aprobó en un lienzo de Claude (10 pantallas: portada, afiche y su descarga, zona de joda, los 24 departamentos, el taller del staff, el azar con reglas, otro día, las 3 formas de leer, las portadas que se dibujan solas e interactivo). Si hace falta volver a verlo, pídeselo a FRALEX: está en sus Artifacts como «Noticias Phoenix — boceto diario».
