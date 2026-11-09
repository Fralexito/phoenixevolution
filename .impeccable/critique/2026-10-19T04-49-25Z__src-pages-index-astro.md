---
target: pagina web completa (portada)
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\dev\\pes-liga-automatica\\src\\pages\\index.astro"
target_fingerprint: "sha256:32d90f68ba668cd1b5fcc3e65040fd1d73be218efb1afe580103fe57b37e33f6"
target_path: "C:\\dev\\pes-liga-automatica\\src\\pages\\index.astro"
timestamp: 2026-10-19T04-49-25Z
slug: src-pages-index-astro
---
# Crítica · Phoenix Evolution (portada y sitio) · 19-oct-2026

## Puntuación (8 heurísticas; 7 y 10 n/a por ser portada de persuasión)
1 Visibilidad 3 · 2 Lenguaje 3 · 3 Control 3 · 4 Consistencia 1 · 5 Prevención 2 · 6 Reconocimiento 2 · 7 n/a · 8 Estética 2 · 9 Errores 2 · 10 n/a → 18/32 (56 %, Aceptable).

## Especificidad
A medias. Propio: cartas FUT con stats de PES, escudos y DT, campeones, duelos con host/Parsec, ascuas/gemas. Genérico: hero «Bienvenido a la Galaxy» (no dice liga / PES 2021 / Perú). Detector: 8 avisos en código (gradient-text ×6, side-tab ×2) = identidad de marca, falsos positivos. En vivo: contraste gris 4.28:1 (texto pequeño, tienda 49), cinta beta 2.4:1, 49 zonas táctiles < 44 px en móvil, texto 10.7 px en frases de cartas, escudo sin foto a opacidad .14, salto de nivel de título en Torneos.

## Problemas prioritarios
- [P1] La portada no dice qué es ni invita a unirse en la primera pantalla → clarify + onboard.
- [P1] Inconsistencia entre secciones: 4 cabeceras, 3 navegaciones, 3 vs 5 pasos → audit, layout/polish.
- [P2] Móvil: 5 capas fijas, dock tapa texto, ticker sobre tabla, 49 objetivos < 44 px → adapt.
- [P2] Portada con partes sin terminar: tarjetas medio vacías, hueco junto a Posiciones, cartas sin foto con iniciales, frase de usuario sin moderar → layout + polish + harden.
- [P2] Sobrecarga de controles (Jugadores 11, Tienda 15 chips) y gris de bajo contraste → distill + quieter.

## Personas
Jordan: Galaxy/PES/Phoenix confuso, jerga sin explicar, estados vacíos = sitio muerto. Casey: dock tapa texto, ticker sobre tabla, columna «Últimos» cortada, tienda con 15 chips, botones pequeños. Riley: «Fecha 11 · Final» con temporada en fecha 8, texto sin moderar, 50 textos < 12 px, botones de clip sin nombre, H3 antes del H1, «Lanzar reto» sin sesión.

## Menores
Línea «Es el único partido que falta…» torpe; pie de carta parece cita; franja «Inicia sesión… tokens» sin botón; «[ABC]» en tienda; Supercopa sin escudo; cinta beta ilegible.

## Preguntas
¿Primera pantalla con «12 DT · fecha 8 de 22 · próximo partido hoy»? ¿Tabla en vivo como protagonista? ¿Tres navegaciones = arquitectura sin decidir?
