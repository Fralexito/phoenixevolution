# Formatos de torneo (ronda 214)

Página `/formatos/` (menú Competir → Formatos). Todo se calcula en el navegador; **no hay base de datos todavía**.

| Pieza | Archivo |
|---|---|
| Motor de formatos (puro, con tests) | `src/js/core/formatos.js` · `tests/formatos.test.mjs` |
| Retos, ruleta, noche de la semana (puro) | `src/js/core/retos.js` · `tests/retos.test.mjs` |
| Textos editables (modalidades, reglas, retos, noches) | `src/data/modalidades.js` |
| Página y pantalla | `src/pages/formatos.astro` · `src/js/pages/formatos.js` · `src/styles/formatos.css` |
| Guía en PDF con la identidad de la liga | `docs/Formatos-Phoenix-Evolution.pdf` |

## Formatos
`eliminacion`, `doble` (4/8/16/32), `liguilla`, `idavuelta`, `grupos`, `suizo`, `colina`, `escalera`, `circuito`.

- Un «slot» es un nombre, `null` (descanso), `{ganadorDe:id}`, `{perdedorDe:id}` o `{puesto:{grupo,pos}}`: así la llave se arma sin conocer los resultados.
- Sorteo reproducible (`mezclar(lista, semilla)`); siembra clásica (`ordenSemillas`).
- Suizo: `emparejarSuizo` evita repetir rival; si es imposible, repite y avisa (`repetidos: true`).
- Reto del día: cambia a medianoche de Perú (UTC-5).

## Siguiente fase (pendiente)
Tablas en Supabase (torneo, inscritos, partidos), inscripción con cupos, carga de resultados y avance automático de la llave, ascensos/descensos, avisos al juego con el Buzón (migración 097+).
