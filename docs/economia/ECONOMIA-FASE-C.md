# Economía · Fase C — efectos de carta, banners de perfil y sonidos de chat (migración 121)

**Resumen para Fralex (SÍ/NO primero):** SÍ, la Fase C está hecha y aplicada. Hay 11 objetos nuevos en la tienda (3 efectos de carta, 4 banners, 4 sonidos). Los pagos reales siguen APAGADOS. Nada da ventaja en el juego.

## Qué se hizo
| Parte | Dónde |
|---|---|
| Base de datos (aplicada en `fiibiyijojkxqlsrhcil`) | `supabase/migrations/121_economia_fase_c_efectos_banners_sonidos.sql` |
| Prueba SQL (se deshace sola, termina en `TODO_OK_REVERTIDO`) | `supabase/tests/121_fase_c_test.sql` (y 119 ajustada: 28→39 objetos) |
| Lógica pura con pruebas | `src/js/core/economia/economia.js`, `src/js/core/comunidad/sonidosChat.js`, `tests/economiaFaseC.test.mjs` |
| Efectos de carta (CSS puro) | `src/styles/efectosCarta.css`, `src/js/features/efectosCarta.js` |
| Banner en el perfil | `src/js/pages/perfil.js` (`#pf-banner`) |
| Sonidos: vista previa con botón | `src/js/features/sonidosChat.js` |
| Contrato para Link | `docs/comunidad/CONTRATO-SONIDOS-CHAT.md` |

## Objetos nuevos (precios del diseño §5; ascuas = gemas × 5 salvo legendarios)
| Objeto | Rareza | Gemas | Ascuas |
|---|---|---|---|
| Efecto holográfico | raro | 70 | 350 |
| Efecto dorado | épico | 160 | 800 |
| Efecto aurora | legendario | 320 | solo gemas |
| Banner Atardecer (degradado) | común | 24 | 120 |
| Banner Medianoche (rayas) | raro | 50 | 250 |
| Banner Rejilla Neón | épico | 130 | 650 |
| Banner Estelar (estrellas) | legendario | 350 | solo gemas |
| Sonido Campana de cristal | común | 15 | 75 |
| Sonido Pop de burbuja | común | 20 | 100 |
| Sonido Moneda dorada | raro | 45 | 225 |
| Sonido Gol de estadio | épico | 120 | 600 |

## Seguridad (lo que se decidió)
- **Lista blanca**, no CSS libre: `private.estilo_valido` solo acepta `efecto` ∈ {holografico, dorado, aurora}, `patron` ∈ {degradado, diagonal, rejilla, puntos}, `sonido` ∈ las 4 claves `snd_*`, y colores `#RRGGBB`. Nada de URLs. La web repite la misma lista (`estiloSeguro`) y una prueba comprueba que web y migración coinciden.
- El check de categoría de `tienda_items` ahora admite `efecto_carta`, `banner`, `sonido_chat`. `tienda_lista`, `equipamiento_de`, `comprar_item` y `equipar_item` ya eran genéricos por categoría y **no se tocaron**.
- Función nueva `public.efectos_carta_de(uuid[])` (lee el efecto equipado de varias personas con una sola llamada): `SECURITY DEFINER`, `search_path` vacío, máximo 100 ids, respeta la privacidad del muro (`puede_ver_muro`), revocada a `public`, concedida a `anon` y `authenticated` (igual que `equipamiento_de`, porque las cartas son públicas).
- Legendarios solo con gemas (aurora y banner estelar). El libro sigue cuadrado (prueba T10).

## Cómo se ve
- **Efectos de carta**: una capa `::after` sin eventos sobre la carta (`.pc` de Central/Base de datos/ficha, `.mg-carta` de la Liga Máster y `.fb-carta` de /futbolista). Se activa cuando el DUEÑO la tiene equipada: `.pc` usa `perfil_id` de la ficha; Liga Máster y /futbolista usan el DT dueño del club (`lm_clubes.dueno`). En listas largas solo se mueve al pasar el mouse; en una carta sola y en la vista previa de la tienda se mueve siempre.
- **Modo ligero** (`html[data-rend-ligero='1']`): el efecto se apaga por completo. **Movimiento reducido** (sistema o «Ajustes → Animaciones»): queda quieto, sin animar.
- **Banner**: en el perfil, el banner equipado reemplaza al banner preestablecido; si la persona subió su propia foto, la foto manda.
- **Sonidos**: en la tienda, botón «Escuchar»; nunca suena solo. Se sintetiza con WebAudio (sin archivos).
- La tienda (`?demo` y build) muestra las tres pestañas nuevas. Verificado en el navegador: 3 efectos, 4 banners, 4 botones de sonido sin errores; el modo ligero apaga el efecto.

## Nota sobre «mi-club»
`/mi-club` es un editor de plantilla (vestuario), no tiene componente de carta; por eso no lleva efecto. Si Fralex quiere uno ahí, es un cambio chico aparte.

## Pruebas
`node --test tests/*.test.mjs` → 518 pruebas, 0 fallos (incluye `tests/economiaFaseC.test.mjs`). `npm run build` → 53 páginas. Prueba SQL 121 → `TODO_OK_REVERTIDO`.

## Pendientes
- El lado de Link (función `sonidos_chat_de`, archivos `.wav`, filtro) está solo **diseñado**: ver `docs/comunidad/CONTRATO-SONIDOS-CHAT.md` §4 y §9.
- El formulario de administración antiguo (`admin_guardar_item`) no sabe poner precio en gemas ni rareza: los objetos nuevos se crean por migración, como los de la Fase A.
- **Pendiente copiar a Drive** (este informe y el contrato) cuando Fralex tenga Drive.
