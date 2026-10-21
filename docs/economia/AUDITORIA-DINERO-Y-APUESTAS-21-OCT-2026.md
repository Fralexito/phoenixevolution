# Auditoría: dinero real, apuestas y comisiones (21-oct-2026)

Revisión de la base real (Supabase `fiibiyijojkxqlsrhcil`) y de las migraciones 065, 071, 111–113, 119–123 y 139.
Límite fijo del proyecto: **nada de apuestas con dinero real.**

## 1. Qué hay hoy

| Pieza | Dónde | Estado real (21-oct) |
|---|---|---|
| Dos monedas: **ascuas** (gratis, jugando) y **gemas** (se compran) | 065 | Sin botón de cambio entre ellas. 0 gemas en circulación. |
| Compra de gemas con soles (Yape manual, Plin, transferencia, Mercado Pago) | 065, 111–113, 122 | `pagos_activos = false`. Solo Yape manual marcado activo, pero apagado por el interruptor general. 0 órdenes de pago. Pasarela en modo `prueba`. |
| **Retos con pozo** (apuestas 1 vs 1) | 065 (`apuestas_reto`, `liquidar_apuesta`) | Solo con **ascuas**. 18+, 7 días de antigüedad, 3 partidos, máx. 3 por pareja/día, mínimo 50, máximo 20 000. 0 retos con pozo hasta hoy. |
| **Comisión** de los retos con pozo | 065 (`private.comision_para`) | 5 % hasta 500 ascuas, 10 % encima. **Nadie la cobra**: se retira de circulación (sumidero). |
| Phoenix Pass (pase de temporada) | 123 | Se compra con gemas. 0 compras. **La pista premium entrega 1080 ascuas** (18 premios) + compensa con 100 ascuas si ya tienes el objeto. |
| Torneo premium | 123 | Cuesta 300 gemas, es solo una marca visual. No da premio en ascuas. |
| Alquiler de host | 071 | Pago por fuera (soles entre personas) o con gemas: las gemas pasan del cliente al host (`completar_alquiler`). 0 alquileres. |
| Patrocinios | 139 | Se pagan a Fralex fuera de la web; aquí solo se guarda el logo. |
| Movimientos totales en el libro | — | 2 (un ajuste y una compra en tienda, ambos en ascuas). |

## 2. El hueco encontrado

Hoy no hay dinero real moviéndose, pero el diseño tiene un **puente indirecto**:

**soles → gemas → Phoenix Pass premium → ascuas → reto con pozo.**

Quien paga el pase recibe hasta 1080 ascuas (y 100 más por cada objeto repetido), y esas ascuas se pueden poner en un pozo. Eso convierte las ascuas, en parte, en algo que **se compra con dinero**, y una apuesta con algo comprado con dinero se parece mucho a una apuesta con dinero real.

Riesgo menor, aparte: el alquiler con gemas deja que una persona **gane gemas** de otra. No toca las apuestas, pero las gemas dejan de ser «solo lo que compraste».

## 3. Modelo propuesto (pendiente del SÍ de Fralex)

1. **Gemas = solo cosmético y pase.** Nunca dan ascuas, nunca se apuestan, nunca se retiran.
2. **Ascuas = solo gratis.** Únicas fuentes permitidas: jugar, retos, rachas, misiones, logros, pista **gratis** del pase, premio o devolución de un pozo, ajuste del administrador.
3. **Pista premium del pase:** sus 18 premios de 60 ascuas pasan a ser objetos cosméticos comunes y raros de la tienda. No pueden ser gemas: el pase cuesta 150 gemas, ya devuelve 60, y la regla de la migración 123 exige que lo devuelto en gemas sea menor que el precio. Si el objeto ya se tiene, en premium no se compensa con ascuas.
4. **Candado en la base de datos** (lo que impide mezclar aunque alguien se equivoque en el futuro): un trigger en `movimientos_tokens` rechaza cualquier entrada de ascuas cuyo tipo no esté en la lista de fuentes gratis, y rechaza `recompensa_pase` en ascuas si no viene de la pista gratis. Si un día se añade una forma nueva de ganar ascuas, hay que añadirla a la lista a propósito.
5. **Premios sin dinero:** los pozos y torneos solo reparten ascuas u objetos. Nada se cambia por soles, gemas ni productos.
6. **Opcional:** alquiler de host solo con pago por fuera (quitar el pago con gemas), para que nadie gane gemas de otra persona.

Nada de esto borra datos: hoy no hay compras de pase, pozos ni alquileres.
