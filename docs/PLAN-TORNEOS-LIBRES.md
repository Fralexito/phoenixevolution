# Informe maestro · «La mejor web para organizar torneos» (informe aparte del de cada ronda)

Pedido de Fralex (9 oct 2026): torneos libres para todos, la web más completa posible, muchas dinámicas divertidas (hasta las más absurdas), guía interna en cada cosa, y este informe de todo lo que se va a implementar. Esta lista es el plan completo; la columna Estado dice qué ya existe.

## A. Base
| Pieza | Estado |
|---|---|
| Tablas y RPC de torneos propios (097) | HECHO (aplicada y probada con transacción revertida) |
| Interruptor y topes del staff, ocultar/cancelar, bitácora | HECHO |
| Lógica pura: planes, tablas, grupos, suizo, circuito, campeón | HECHO (12 pruebas nuevas) |

## B. Pantallas
| Pieza | Estado |
|---|---|
| `/torneos/` lista con filtros + ficha de creación | HECHO |
| `/torneo/?id=` detalle: inscripción, cruces, resultados, tablas | HECHO |
| Panel del staff en Moderación | HECHO |
| Guías «¿Cómo funciona?» por formato y por dinámica, leyenda de estados | HECHO |

## C. Formatos jugables (10)
Eliminatoria, doble, liguilla, ida y vuelta, grupos + playoffs, suizo, rey de la colina, escalera, circuito, libre. HECHO.

## D. Dinámicas (más de 45, 5 familias)
Reglas del partido (13) · Equipos y plantillas (8) · Locuras y bromas (12) · Para ver y transmitir (6) · Puntos, apuestas y premios (6). Con efecto automático: ruleta por partido y castigo al perdedor. El resto se muestra como guía. HECHO. Generadores: nombre épico de torneo, castigos (20), títulos de broma (18).

## E. Siguiente (propuesto, aún NO hecho)
1. Avisos automáticos (Buzón del juego y campana) cuando te toca jugar o cambia tu cruce.
2. Llave visual con líneas (árbol) en vez de columnas.
3. Realtime en el detalle (ahora refresca cada 30 s).
4. Al coronar: palmarés, logros y racha de campeón automáticos.
5. Torneos por clan y de «equipos» con capitán.
6. Quiniela del público con tokens simbólicos.
7. Calendario con recordatorios y hora de cada partido.
8. Plantillas guardadas («clonar mi torneo anterior») y torneos recurrentes semanales.
9. Reglas de desempate configurables y puntos propios (ahora 3/1/0).
10. Exportar el torneo (imagen o PDF) para compartir.
11. Reportes de torneos por la comunidad y reputación de organizadores.
12. Ranking global de organizadores y de campeones.

## F. Límites actuales (conscientes)
Tope de partidos por llamada 2000 · cupo máx. 256 (ajustable) · 50 torneos activos por usuario (ajustable) · quien anota un resultado lo hace bajo palabra: el organizador y el staff pueden corregir y todo queda en la bitácora.

## G. Cómo se prueba
`npm test` (384 pasan) · `npm run build` (43 páginas) · pruebas SQL con transacción revertida · capturas Galaxy y Sudario con datos simulados. Falta probar con cuentas reales en /fase-beta/.
