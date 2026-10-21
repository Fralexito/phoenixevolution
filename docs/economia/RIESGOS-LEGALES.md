# Riesgos legales de Phoenix Evolution (resumen práctico)

> **No es asesoría legal.** Es una lista de riesgos y medidas razonables escrita por Claude el 21-oct-2026 con información general. Antes de cobrar dinero real, un abogado peruano debe revisarla. Las leyes cambian: confirmar que lo citado sigue vigente.

## 1. Apuestas en Perú
**Qué dice la ley (en general):** las apuestas deportivas y los juegos a distancia por internet están regulados por la Ley 31557 (modificada por la Ley 31806) y su reglamento. Quien las ofrece necesita **autorización del MINCETUR**; operar sin ella expone a multas, bloqueo del sitio y otras sanciones. La ley apunta a apuestas con **dinero o con algo que tiene valor económico**.

**Nuestro riesgo:** los retos con pozo usan ascuas. Si las ascuas se pudieran comprar (aunque sea indirectamente) o cambiar por dinero, gemas o productos, podrían considerarse apuestas con valor económico. Hoy existe un camino indirecto (pase premium → ascuas); ver `AUDITORIA-DINERO-Y-APUESTAS-21-OCT-2026.md`.

**Medidas:**
- Ascuas **solo gratis**, con candado en la base de datos que impida cualquier otra fuente.
- Ninguna salida: ascuas, gemas y premios **nunca** se cambian por soles, saldo, productos ni regalos físicos.
- La comisión de los pozos **no la cobra nadie** (se destruye): mantenerlo así; si la casa ganara con los pozos, se parecería a un operador de apuestas.
- Mantener 18+, límites por día y por pareja, y el freno de emergencia.
- En la web, decir «reto con pozo de ascuas», no «apuesta»; y aclarar en los términos que las ascuas no tienen valor monetario.
- Prohibir en los términos la compraventa de cuentas, ascuas o resultados entre usuarios, y sancionarla.

## 2. Venta de gemas (cuando se activen los pagos)
- **Consumidor** (Código de Protección y Defensa del Consumidor, Ley 29571): precio final claro en soles, qué se compra, política de reembolso y **Libro de Reclamaciones virtual**.
- **Impuestos:** RUC y comprobantes ante SUNAT. Decidir con un contador antes del primer cobro.
- **Datos personales** (Ley 29733): informar qué se guarda (capturas de pago, nombre del pagador) y por cuánto tiempo.
- La lista técnica previa a activar pagos ya está en `SEGURIDAD-ECONOMIA.md`.

## 3. Konami, PES y eFootball
**Riesgo:** «PES», «Pro Evolution Soccer», «eFootball» y los archivos del juego son de Konami. Distribuir archivos del juego, o cobrar por algo que dependa de ellos, es lo más expuesto.

**Medidas:**
- No distribuir el juego, su ejecutable ni archivos originales de Konami. Cada usuario debe tener su copia legal.
- No cobrar por el parche ni por acceso a él. Lo que se vende (gemas) debe ser de la web, no del juego.
- No usar logos de Konami/PES en la marca; usar «Phoenix Evolution» y una nota visible: «Proyecto de la comunidad, sin relación con Konami».
- Tener un correo de contacto y responder rápido si Konami pide retirar algo.

## 4. Caras, parches y licencias de terceros
**Riesgo:** las caras y kits los hacen modders con sus propios derechos; las caras reales y los nombres de jugadores tienen derechos de imagen; escudos y camisetas son marcas de clubes y ligas.

**Medidas:**
- Usar solo trabajos con **permiso** del autor y dar crédito visible (lista de créditos en el parche y en la web).
- Nunca vender caras, kits ni el parche, ni ponerlos detrás de gemas.
- Proceso simple para retirar contenido si el autor, un jugador o un club lo pide.
- Guardar de dónde salió cada recurso (autor, fecha, permiso).

## 5. Parsec y alquiler de host
**Riesgo:** el alquiler de host es un servicio de pago entre personas. Los términos de Parsec y los del juego o de la tienda donde se compró (por ejemplo Steam) pueden limitar el uso comercial, la reventa o «prestar» el acceso al juego. Phoenix podría verse como intermediario.

**Medidas:**
- Revisar los términos vigentes de Parsec y de la plataforma del juego antes de promover el alquiler.
- Dejar claro en los términos que el acuerdo es entre las dos personas, que Phoenix no cobra comisión por él y que cada jugador necesita su propia copia del juego.
- Preferir pago por fuera (sin gemas) para no tener dinero de terceros dentro de la web.
- Si los términos lo prohíben, cambiar «alquiler» por «host voluntario» sin pago.

## 6. Menores de edad
Ya existe: fecha de nacimiento, 18+ para comprar y para pozos. Mantenerlo, y no mostrar ofertas de gemas a menores.

## 7. Lista corta antes de cobrar dinero real
- [ ] Candado de ascuas gratis aplicado y probado.
- [ ] Términos de uso y de compra revisados por un abogado (incluir: ascuas sin valor, sin reventa, sin relación con Konami).
- [ ] RUC, comprobantes y Libro de Reclamaciones.
- [ ] Créditos y permisos de caras/kits documentados.
- [ ] Decisión sobre el alquiler de host tras leer los términos de Parsec y del juego.
