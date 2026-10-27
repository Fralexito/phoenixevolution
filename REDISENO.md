# Rama `rediseno-web` — laboratorio del rediseño completo (27-oct-2026)

- **Dirección:** https://fralexito.github.io/phoenixevolution/fase-rediseno/ (tu `borrador` sigue en /fase-beta-1-0/ sin cambios).
- **Publicar un cambio de esta rama:** `gh workflow run deploy.yml --ref borrador` (o «Run workflow» en GitHub, rama borrador).
- **Plan e investigación:** documento «Phoenix Evolution · Investigación y plan de reestructuración de la web» (Claude Docs) y Drive.
- **Interruptor:** `FX.rediseno` en `src/data/experimento.js` → `<html data-rediseno>`. Todo el estilo nuevo vive en `styles/sistema.css`
  (sistema base) y `styles/portadaRd.css` (Inicio). Con `false`, esta rama se ve igual que borrador.
- **Inspiración:** la web de la UEFA Champions League (base) + F1, NBA, Linear, Stripe, Netflix, FACEIT, Battlefy, LoL Esports, EA FC.
  Identidad propia: noche Galaxy, Rajdhani, el «corte» a 45° y los iconos propios «Corte» (`data/iconosPhoenix.js` → `node scripts/iconos-phoenix.mjs`).

## Fases
1. **Sistema base** — HECHO: tokens (noche, capas, textos, corte), cabecera estilo Champions con 5 destinos (Inicio · Jugar · Liga ·
   Comunidad · Mi club), sub-menú subrayado, barra de abajo con los mismos 5, iconos propios, fuera brillos/vidrio/texto degradado,
   fuera cinta Última hora, barra lateral y botón flotante «En vivo».
2. **Inicio** — HECHO: `components/rediseno/PortadaRd.astro` (7 bloques). Tira de partidos: `core/portada/tira.js` (+ tests/tira.test.mjs).
3. Liga (pestañas Galaxy/Sudario + Partidos · Tabla · Estadísticas · Jugadores · Palmarés), Torneos, Ranking — PENDIENTE.
4. Jugar (Duelos, En vivo, Mis partidos) y Mi club — PENDIENTE.
5. Comunidad, fichas (perfil, jugador, rivalidad), cuenta y limpieza final — PENDIENTE.

Nada de esto llega a `borrador` ni a `main` hasta que Fralex diga «Súbelo».
