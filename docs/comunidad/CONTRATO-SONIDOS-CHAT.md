# Contrato de sonidos de chat (web ⇄ Phoenix Link) — versión 1

Estado: **la web ya lo cumple** (migración 121, Fase C de la economía). **Link todavía no lo usa**: este documento dice cómo lo hará «algún día», sin tocar el código de Link (los repos de Link y overlay son públicos y no se empujan). El contrato general de la API de Link está en `docs/web-pes-link/contrato-v1.md`; este es aparte y solo habla de sonidos.

## 1. Qué hay hoy en Link (solo lectura, `C:\dev\smash-soda-fork\_phoenix-link`)
- No existe una pestaña con el nombre literal «SONIDOS CHAT». Lo más parecido: **Ajustes › Sonidos** (`I18nOriginal.cpp`: «SFX» = «Sonidos») y el aviso de mensaje nuevo.
- **`!sfx <tag>`**: lista en `<carpeta de configuración>\sfx.json` (`AccionesAjustesWeb.cpp`: `rutaSfx`, `listaSfx`). Cada entrada: `{ "tag": "alert", "path": "mg-alert.wav", "cooldown": 5 }` (`SmashSoda\sfx\README.md`, `_sfx-sample.json`). Se reproduce con `PlaySound(..., SND_FILENAME | SND_ASYNC)` (`lists\SFXList.cpp`).
- **Sonidos de evento** (archivos `.wav` junto al exe, carpeta `SFX\`): `new_message.wav` (mensaje de chat, `Main.cpp`, activable con `chat.messageNotification`), `new_guest.wav`, `guest_leave.wav`, `entrada.wav` (aviso de entrada, `AvisoEntrada.h`), y en `SmashSoda\sfx\`: `bonk-hit.wav`, `bonk-dodge.wav`, `mute.wav`.
- Conclusión: Link ya sabe reproducir **un `.wav` por nombre de archivo**, con enfriamiento (cooldown). El contrato se apoya en eso: nada de formatos nuevos.

## 2. La clave de sonido
Una clave `snd_*` identifica un sonido en TODO el sistema. Es la misma en la base de datos (`tienda_items.estilo.sonido`), en el catálogo de la web (`src/js/core/sonidosChat.js`) y será el nombre del archivo en Link (`<clave>.wav`). **Nunca se renombra ni se reutiliza.**

| Clave | Nombre | Rareza (tienda) | Gemas | Duración | Cooldown | Volumen | Archivo |
|---|---|---|---|---|---|---|---|
| `snd_campana_cristal` | Campana de cristal | común | 15 | 740 ms | 3 s | 0,8 | `snd_campana_cristal.wav` |
| `snd_pop_burbuja` | Pop de burbuja | común | 20 | 110 ms | 2 s | 0,9 | `snd_pop_burbuja.wav` |
| `snd_moneda_dorada` | Moneda dorada | raro | 45 | 490 ms | 3 s | 0,7 | `snd_moneda_dorada.wav` |
| `snd_gol_estadio` | Gol de estadio | épico | 120 | 1100 ms | 6 s | 0,6 | `snd_gol_estadio.wav` |

Fuente de verdad de duración/cooldown/volumen: `SONIDOS_CHAT` en `src/js/core/sonidosChat.js` (la tabla es una copia; si difieren, manda el código).

## 3. Metadatos (forma JSON que Link recibiría)
```json
{ "version": 1, "sonidos": [
  { "clave": "snd_pop_burbuja", "etiqueta": "Pop de burbuja", "duracionMs": 110, "cooldownS": 2, "volumen": 0.9, "archivo": "snd_pop_burbuja.wav" }
] }
```
La web la produce con `catalogoSonidos()` (puro, con prueba). Campos fijos: `clave` (texto, lista blanca), `etiqueta` (texto corto), `duracionMs` (1–1500), `cooldownS` (≥ 1), `volumen` (0–1), `archivo` (`<clave>.wav`).

## 4. Cómo sabrá Link qué sonido tiene cada persona (diseño, aún sin construir)
1. La web ya guarda lo equipado: `equipamiento_de(usuario)` devuelve `sonido_chat: { clave, nombre, estilo: { sonido: "snd_…" } }` (solo si la persona deja verse, igual que marcos y títulos).
2. Cuando se construya el lado de Link: una función de lectura por lote, igual que `efectos_carta_de(uuid[])` (migración 121): `sonidos_chat_de(p_usuarios uuid[])` → `{ usuario_id: "snd_…" }`, con `SECURITY DEFINER`, `search_path` vacío, máximo 100 ids, sin permisos para `public`. **No se crea todavía**: no hay quien la llame.
3. Link, al llegar un mensaje de un invitado con cuenta vinculada: busca su clave (con caché de unos minutos), valida que esté en el catálogo y reproduce `SFX\chat\<clave>.wav`. Si no hay clave, no está el archivo o algo falla → vuelve a `new_message.wav` (comportamiento actual). **Nunca** falla el chat por un sonido.

## 5. Reglas obligatorias
- **Solo cosmético.** Un sonido no da ventaja ni cambia resultados.
- **Lista blanca**: Link ignora cualquier clave que no esté en su catálogo (nada de rutas, nada de URLs, nada de `..`). La web y la base ya rechazan todo lo que no sea una clave del catálogo.
- **Anti-molestia**: cooldown por persona (campo `cooldownS`), tope global (p. ej. 1 sonido de chat de tienda cada 2 s en la sala), duración máxima 1500 ms, volumen relativo al sonido de mensajes de Link, y un interruptor «Sonidos de chat de otros» para apagarlos (por defecto encendido).
- **La web nunca suena sola.** La vista previa de la tienda es un botón «Escuchar» (`[data-sonido]`); sin clic no hay audio (política de los navegadores y regla de la casa).
- **Rarezas**: como todo objeto de la tienda; legendarios y limitados solo con gemas (hoy no hay sonidos legendarios).

## 6. Formato de los archivos `.wav`
PCM sin comprimir, 16 bits, mono, 44 100 Hz, ≤ 1,5 s, pico máximo −3 dBFS (sin recortes), ≤ 150 KB, nombre `<clave>.wav` en minúsculas. Carpeta en Link: `SFX\chat\` (nueva, junto a las existentes). Se empaquetan con el instalador de Link, no se descargan de la web (evita bajar archivos ajenos).

## 7. La web hoy: sin archivos
Cada sonido es una **partitura** (lista de tonos: tipo, frecuencia, duración, volumen) que la web sintetiza con WebAudio al pulsar «Escuchar» (`src/js/features/sonidosChat.js`). Ventajas: cero descargas y cero derechos de autor. Esa misma partitura es la referencia para generar los `.wav` de Link idénticos (un script de exportación a `.wav` queda como tarea futura).

## 8. Cómo añadir un sonido nuevo (receta)
1. Añadir la clave y su partitura en `SONIDOS_CHAT` (`src/js/core/sonidosChat.js`).
2. Nueva migración: añadir la clave a la lista de `private.estilo_valido` (caso `sonido`) e insertar el objeto en `tienda_items` con su rareza y precio (`docs/economia/DISENO-ECONOMIA-COMPLETA.md` §5).
3. Ejecutar `node --test tests/*.test.mjs`: la prueba «la lista blanca de la web coincide con la de la migración 121» avisa si algo quedó a medias (si la nueva migración redefine la función, actualizar esa prueba para leer la última).
4. (Cuando Link los use) generar `<clave>.wav` y subir `version` del catálogo.

## 9. Pendiente (no hecho a propósito)
- Función `sonidos_chat_de` y el lado de Link (reproducción y filtro «Sonidos de chat de otros»): esperan a que Fralex decida tocar Link y a que los repos dejen de ser públicos.
- Exportar los 4 `.wav` desde la partitura.
- Copia a Drive: **pendiente copiar a Drive** cuando Fralex tenga Drive (norma del 16-oct-2026).
