# Diseño completo de la economía de Phoenix Evolution (propuesta para decidir)

Estado: **PROPUESTA** (16-oct-2026, cuenta ECONOMÍA). Nada de esto está aplicado salvo lo que dice «YA EXISTE». Complementa `docs/economia/PLAN-MONEDAS-VIRTUALES.md` (plan técnico), `docs/economia/DISENO-RECARGAS.md` (pagos) y `docs/economia/SEGURIDAD-ECONOMIA.md` (seguridad).
Las cifras de precios son una **propuesta para probar**, no verdades: se ajustan con datos reales. Lo legal y lo tributario es orientación general: confirmarlo con abogado y contador.

---

## 1. Principios (no negociables)
1. **Solo cosmético y comodidad. Nunca ventaja en el juego.** Es una liga competitiva: si el dinero da ventaja, la liga pierde confianza. Gemas compran estilo, identidad y servicios; no puntos, no estadísticas, no resultados.
2. **Dos monedas que no se cambian entre sí.** Ascuas = se ganan jugando (gratis). Gemas = se compran con dinero. Así nadie está obligado a pagar y quien paga compra tiempo y exclusividad.
3. **Nada de azar pagado.** Sin cajas sorpresa, sin ruletas, sin apuestas con gemas. (Riesgo legal en Perú, menores de edad y mala reputación.) Las apuestas siguen siendo solo en ascuas.
4. **Las gemas no se retiran ni se convierten en dinero.** Solo sirven dentro del sitio. (Evita problemas legales y de lavado.)
5. **Precios siempre visibles en soles**, sin trucos (sin «últimas horas» falsas, sin cuenta atrás inventada).
6. **Mayores de 18 para comprar** (YA EXISTE: edad + términos).
7. **La economía se vigila sola** (YA EXISTE: auditoría + vigilancia + freno de emergencia).

## 2. Las dos monedas
| | Ascuas | Gemas |
|---|---|---|
| Cómo se consiguen | Jugando, retos, valorando (YA EXISTE) | Comprando (S/ 0,10 cada una de referencia) |
| Para qué sirven | Objetos comunes y raros, alquilar host, apuestas entre jugadores, cambios pequeños | Objetos premium, ediciones limitadas, comodidad, pase de temporada |
| Se pueden perder | Sí (apuestas) | No |
| Regla de oro | Siempre hay forma gratis de llegar a lo básico | Lo premium solo con gemas |

Referencia fija: **1 gema = 5 ascuas** para fijar precios (YA EXISTE), pero **no hay botón de cambio**.

## 3. Cómo se ganan ascuas (los «grifos») y cuánto
Hoy (YA EXISTE): partido jugado 10 (tope 5/día) · partido ganado 5 (tope 5/día) · valorar a un rival 2 (tope 5/día) · retos diarios 20–40 cada uno.
Máximo teórico de una persona muy activa: **≈ 205 ascuas al día** (50 + 25 + 10 + 120 de retos).

Propuestas para dar ganas de volver (sin romper el equilibrio):
- **Racha diaria:** 3 días +10, 7 días +40 (se reinicia si falta un día).
- **Primer partido del día:** +5.
- **Misiones semanales:** 3 misiones (jugar con 3 rivales distintos, 10 partidos, etc.) con 60–100 ascuas.
- **Logros** (hitos únicos): 20–200 ascuas según dificultad.
- **Temporada:** premio en ascuas al terminar en un tramo del ranking.
- Todo con **tope diario** y vigilado por la alerta `ganancia_ascuas` (YA EXISTE).

## 4. Cómo se gastan ascuas (los «sumideros»)
Si solo hay ganancia, las ascuas se devalúan (inflación). Sumideros:
- Tienda (objetos comunes y raros).
- Alquilar host (YA EXISTE).
- Cambiar nombre de usuario o de club: 50–100 ascuas.
- Reiniciar o mejorar objetos (ej. cambiar el color de una insignia): 20–40.
- Inscripción a torneos «con cuota en ascuas» (la cuota va a un fondo que el sistema reparte como premio).
- Apuestas con comisión escalonada (YA EXISTE).
Regla de salud: **lo que entra por día ≈ lo que sale por semana**. Se mide con `economia_auditar`.

## 5. Precios de los objetos (por rareza)
| Rareza | Gemas | Soles aprox. | Ascuas (solo si se permite) | Tiempo gratis para conseguirlo |
|---|---|---|---|---|
| Común | 12–30 | S/ 1,2–3 | 60–150 | ≈ 1 día |
| Raro | 40–80 | S/ 4–8 | 200–400 | ≈ 2–3 días |
| Épico | 120–250 | S/ 12–25 | solo gemas o 600–1250 | ≈ 1 semana |
| Legendario | 300–600 | S/ 30–60 | **solo gemas** | — |
| Edición limitada (por temporada) | 150–400 | S/ 15–40 | solo gemas | no vuelve a venderse |

**Hoy YA EXISTEN** 12 objetos: de 12 a 80 gemas (60 a 400 ascuas) — son Comunes y Raros. **Falta anclar los precios con Épicos y Legendarios** para que lo barato parezca barato y haya algo que aspirar.
Regla: lo exclusivo (Épico+, limitado) **solo gemas**; lo común, ambas monedas (así los que no pagan también progresan).

## 6. Paquetes de gemas
Hoy (YA EXISTE): 100 = S/ 10 · 300 = S/ 27 · 700 = S/ 55 (0,100 → 0,090 → 0,079 por gema).
Propuesta para probar (más escalones y una entrada pequeña):
| Paquete | Gemas | Precio | Por gema | Nota |
|---|---|---|---|---|
| Chispa | 50 | S/ 5 | 0,100 | entrada barata (Yape lo permite sin comisión) |
| Brasa | 110 | S/ 10 | 0,091 | +10 % |
| Llama | 300 | S/ 25 | 0,083 | el «mejor valor» visible |
| Fénix | 650 | S/ 50 | 0,077 | +30 % |
- **Bono de primera compra:** +50 % de gemas, una sola vez. Es el empujón más efectivo para pasar de «solo miro» a «compré».
- Sin descuentos inventados: los bonos son reales y fijos.
- Pagos manuales por Yape/Plin (YA EXISTE) no cobran comisión; las pasarelas sí (suele ser alrededor de 4–5 %: verificarlo al elegir una) → al pasar a pasarela, ajustar el precio o absorberlo.

## 7. Qué se puede ofrecer (catálogo)
**A. Identidad (lo que más se compra)**
- Marcos, insignias, títulos, fondos, color de clan (YA EXISTE).
- **Efectos de carta de jugador** (holográfica, dorada) — encaja con la Liga Máster y las cartas.
- **Banners de perfil** y **animaciones de entrada** en las salas.
- **Escudos y colores de club** animados (Mi club galáctico).
- **Emotes y sonidos de chat** (Phoenix Link ya tiene la pestaña SONIDOS CHAT).
- **Temas de sala en Phoenix Link** (colores del puesto y del marcador).
- **Celebraciones en la web** (confeti, fuegos) al ganar un reto.

**B. Comodidad (sin ventaja)**
- Cambio de nombre/club, huecos extra de clubes o equipos guardados.
- **Alquilar host** (YA EXISTE) con descuento por pase.
- Historial extendido y estadísticas avanzadas personales.

**C. Para creadores y organizadores (donde puede estar el dinero más estable)**
- **Torneo premium** (S/ 20–50 por torneo): overlay de transmisión, llaves bonitas, estadísticas, página propia.
- **Overlay para streamers/TikTok** (el experimento de marcador vertical) como extra de pago de creador.
- **Patrocinio de clanes/torneos** (logo del patrocinador): precio acordado, factura aparte.
- **Propinas a creadores** («Apoyar»): requiere revisión legal y de comisión antes.

**D. Pase de temporada («Phoenix Pass») — fase posterior**
- Pista **gratis** (con ascuas/XP) y pista **premium** (S/ 9,90–14,90 por temporada) con cosméticos exclusivos y gemas de regreso.
- Se compra una vez por temporada, no es suscripción automática (evita cobros no deseados).

**E. Lo que NO ofrecer**
- Ventajas en partidos (estadísticas, puntos, rival más fácil).
- Cajas/ruletas/azar de pago. Apuestas con gemas. Retirar gemas como dinero.
- Cambiar ascuas ↔ gemas. Vender ascuas por dinero.

## 8. Buenas prácticas (resumen)
- **Transparencia:** mostrar siempre cuánto cuesta en soles y qué recibes; confirmación antes de gastar gemas en objetos caros.
- **Límite de gasto opcional** que la persona pueda poner a su cuenta; aviso cuando gasta mucho en poco tiempo (YA hay topes diarios).
- **Reembolsos:** política clara por escrito (gemas ya gastadas no se reembolsan; pagos duplicados o errores sí). Los reembolsos ya descuentan las gemas (YA EXISTE).
- **Recibo por compra** (correo o pantalla) con orden y monto.
- **Atención:** canal de reclamos visible (en Perú existe el Libro de Reclamaciones para ventas al consumidor, incluida la venta virtual: confirmar con abogado qué te corresponde).
- **Tributario:** vender como persona tiene reglas (RUC, comprobantes, topes). Consultar contador antes de abrir pagos reales.
- **Datos:** no guardar datos de tarjeta (lo hace la pasarela); capturas de comprobantes en bucket privado (YA EXISTE).
- **Medir:** conversión (cuántos activos compran; metas realistas 2–5 %), ingreso por pagador, gemas compradas vs gastadas, inflación de ascuas, devoluciones. Revisar cada mes.
- **Probar con pocos:** abrir primero a un grupo pequeño con Yape manual, mirar 2–4 semanas y recién entonces escalar.

## 9. Hoja de ruta propuesta
1. **Ahora:** decidir esta propuesta (precios, paquetes, bono de primera compra).
2. **Fase A (1 semana):** subir 8–10 objetos Épicos/Legendarios y 2–3 limitados; paquetes nuevos; bono de primera compra (migración 119+ con RESERVADO en REGISTRO.md).
3. **Fase B:** racha diaria, primera partida del día, misiones semanales y logros en ascuas.
4. **Fase C:** efectos de carta, banners y emotes/sonidos (necesita arte y dos o tres creadores).
5. **Fase D:** pasarela (Mercado Pago u otra) con webhook firmado.
6. **Fase E:** Phoenix Pass y paquetes para organizadores/creadores.

## 10. Decisiones que necesito de Fralex
1. ¿Aprueba la regla «**solo cosmético y comodidad, nada de ventaja ni azar**»?
2. ¿Acepta los nuevos paquetes (S/ 5, 10, 25, 50) y el **bono de primera compra +50 %**?
3. ¿Qué rareza quiere primero: **épicos/legendarios** de la tienda, **efectos de carta** o **sonidos de chat**?
4. ¿Quiere abrir **herramientas para organizadores/creadores** (torneo premium, overlay) o dejarlas para después?
5. ¿Cuándo quiere abrir pagos reales a un grupo pequeño (fecha)?
