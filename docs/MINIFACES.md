# Minifaces del juego en la web (rondas 338–339 · 16-oct-2026)

Guía para humanos y para otra IA que quiera repetirlo. Qué se hizo, con qué archivos y cómo volver a hacerlo cuando el parche cambie.

## 1. Qué se logró
- Las cartas de **Mi club** (Plantilla y Mercado) muestran la **misma cara que el jugador tiene en el PES** (parche Conmegol), agrandada y mejorada.
- En la **ficha del futbolista** (`/futbolista/?id=`) esa cara es la **1.ª foto del carrusel**; las de Wikipedia van detrás.
- Cada jugador de la web quedó **conectado con su número del juego** (`lm_jugadores.pes_id`, 308 de 314). Es el «DNI común» web ↔ juego que usarán Phoenix Sync y el catálogo.

## 2. De dónde salen las caras (orden de prioridad del juego)
Carpeta del juego: `D:\Frank\Games_\Conmegol Patch\`. Ruta interna de una miniface: `common/render/symbol/player/<pid>.dds`.
1. **livecpk de Sider** `SiderAddons\livecpk\Logos\common\render\symbol\player\` (3.704 caras, 180×180). Es la que manda (Sider carga las carpetas sueltas antes que los .cpk).
2. `download\dt80_700E … dt80_100E_x64.cpk` (parche; mayor número = más prioridad).
3. `Data\dt14_all.cpk` (base de Konami, 14.672 caras de 128×128).
- `livecpk\Leyendas` tiene caras pero **no** está en `sider.ini`: no se usa.
- `content\miniface_server\MiniFaces\National` son versiones de selección: no se usan para clubes.

## 3. Cómo se sabe qué número es de quién
Base de datos del juego: `download\CGP_database.cpk` → `common/etc/pesdb/`.
- Todos los `.bin`: cabecera WESYS de 16 B + zlib.
- **Player.bin**: 29.997 registros × 312 B; pid (u32 LE) en +8; nombre UTF-8 en +251.
- **Team.bin**: 1.532 B por equipo; id en +0; nombre en +368.
- **PlayerAssignment.bin**: 16 B por fila = (id, pid, equipo, flags).
- Cruce por nombre normalizado (sin tildes; «-» = espacio). Si falla: mismas palabras en otro orden («Min-Jae Kim»), apellido + inicial («K. Tsimikas»), nombre corto en un club de la web («Gabriel»).
- Si un nombre aparece repetido (versión de club, de selección, clásica…), gana el que tiene **cara 3D** en `livecpk\Faces\…\face\real\<pid>` + equipo de club + miniface.
- Descartados a mano por cruce dudoso: Tynan Thompson, Cassiano Kiala. Sin jugador en el juego: Marli Salmon, Andre Harriman-Annous, Filip Pavić, David Santos Daiber.

## 4. Herramientas (en el repo)
- `tools/minifaces/cpk.py`: lector **de solo lectura** de .cpk de CRI (tablas @UTF, cifrado XOR, CRILAYLA). `python3 cpk.py listar <cpk> [filtro]` / `sacar <cpk> <ruta> <salida>`.
- `tools/minifaces/mejorar.py`: agranda con **Real-ESRGAN** (pesos BSD-3 de github.com/xinntao/Real-ESRGAN/releases). Con `RealESRGAN_x2plus.pth` tarda ~3 s por cara en CPU; con x4plus ~25 s. Rellena el color de los bordes transparentes (quita el halo blanco) y la transparencia se agranda con Lanczos. Salida `.webp` de 320 px.
  `python3 tools/minifaces/mejorar.py <entrada> <salida> --pesos RealESRGAN_x2plus.pth --px 320` (necesita `torch` y `pillow`).

## 5. En la web
- Caras: `public/minifaces/<pes_id>.webp` (254 archivos, 4,9 MB; las sirve GitHub Pages, no gastan Supabase).
- Lista de las que existen: `src/data/minifaces.js` (`MINIFACES`, un Set de pes_id).
- `minifaceUrl(pesId)` en `src/js/features/fotoFutbolista.js`: si hay cara del juego, manda sobre Wikipedia.
  - Cartas: `<span class="mg-foto" data-pes="…">` → `.con-miniface` (fondo del color de la línea).
  - Ficha: `img.es-mini` (contain sobre degradado), crédito «Cara del juego · parche Conmegol».
- Test: `tests/fotoFutbolista.test.mjs` («minifaces del juego…»).

## 6. Cómo repetirlo cuando el parche cambie
1. Enlazar el chat con la PC y dar acceso a `D:\Frank\Games_\Conmegol Patch` (solo lectura).
2. Listar caras de las 3 fuentes con `cpk.py` y la carpeta Logos.
3. Sacar Player/Team/PlayerAssignment de `CGP_database.cpk` y cruzar (los jugadores con `pes_id` ya están cruzados: usar ese número directo).
4. Empaquetar las .dds en un zip, pasarlo a la nube, correr `mejorar.py`, copiar a `public/minifaces/<pid>.webp` y regenerar `src/data/minifaces.js`.
5. `npm test`, build, ronda en MAPA.md, push a `borrador`.

## 7. Pendiente
- 56 jugadores sin cara (canteranos y fichajes nuevos que el parche no trae): siguen con foto de Wikipedia.
- Copia de trabajo en la PC: `Conmegol Patch\_phoenix_web_minifaces\minifaces.zip` (se puede borrar).
- Cuando Fralex vuelva a tener Drive: copiar esta guía y el prompt `docs/PROMPT-SISTEMA-DATOS-WEB-PES.md` a Drive.
