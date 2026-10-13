# Phoenix Sync automático (plan · ronda 281)

Pedido de Fralex (13-oct-2026): «quiero que sea automático: así será cuando se hagan los fichajes desde el juego, desde el Sync».
Este documento es el **traspaso** para el chat de Phoenix Sync / Mercado (programa de PC) y para la cuenta WEB.

## Lo que ya está listo en la web
| Dirección | Cómo | Estado |
|---|---|---|
| Web → juego | `GET /mercado/v1/liga/cambios?desde=<version>` (firmado Ed25519). El programa aplica los fichajes hechos en la web. | ✅ listo |
| Juego → web (catálogo) | `POST /mercado/v1/catalogo` (solo token de staff). Sube equipos y jugadores del parche con `pes_id`, `pes_team_id`, `media`, etc. | ✅ listo, hoy es manual |
| Juego → web (cambios) | `POST /mercado/v1/reportes` y `/reportes/lote`: diferencias antes/después de jugar (`jugador_equipo`, `campo`, `dinero_lm`). | ✅ listo, hoy el staff aprueba a mano |

Estado de la base al escribir esto: 12 `lm_clubes` reales (Arsenal, Chelsea, Liverpool, Man City, Man United, Bayern Múnich, FC Barcelona, Real Madrid, Atlético de Madrid, Inter, AC Milan, PSG) **sin `pes_team_id`** y **0** `lm_jugadores`. Los datos Demo se borraron.

## Lo que falta para que sea automático

### 1. Catálogo automático (programa)
- Al abrir Phoenix Sync en la PC de un **staff**, leer el option file / parche «Conmegol», calcular un hash del catálogo y, si cambió desde la última subida, llamar solo a `POST /catalogo` (en lotes si es grande).
- Enviar `pes_team_id` de cada equipo. **Primera subida:** la web debe casar los 12 clubes existentes por nombre (ver punto 3) para no duplicarlos.

### 2. Fichajes del juego automáticos (programa)
- Al terminar una sesión (o al detectar que el option file cambió), calcular los cambios `jugador_equipo` y mandarlos por `/reportes/lote` con `id_cliente` (evita duplicados si se reintenta).
- Mostrar en el programa: «Fichaje enviado a la web ✓».

### 3. Aplicación automática en la web (cuenta WEB · necesita migración, RESERVAR número antes)
- Función `lm_aplicar_reporte_auto(reporte_id)`: si el reporte viene del dispositivo del **DT dueño del club** (o de staff) y la ventana está abierta, mueve el jugador en `lm_jugadores`, anota `lm_movimientos` (tipo `juego`) y `lm_club_libro` si hay monto; si no cumple, queda «pendiente» para el staff como hoy.
- Casar clubes en `lm_importar`: si llega un equipo con `pes_team_id` y ya existe un club con el mismo nombre (normalizado) sin `pes_team_id`, **completar** ese club en vez de crear otro.
- Historial y botón «Revertir» para el staff (antifraude).

## Reglas
- Nunca pedir ni guardar secretos en chats; los tokens viven cifrados en la PC (DPAPI).
- Toda migración con su archivo en `supabase/migrations/` y línea en `REGISTRO.md`.
