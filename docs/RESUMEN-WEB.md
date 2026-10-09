# Phoenix Evolution — Estado de la web y la base de datos (8 oct 2026, noche)

> Lo más reciente siempre está al final de `REGISTRO.md`. Este resumen es la foto general.

Pegar al inicio de cualquier chat que toque la web, la base o los programas. **Antes de cambiar algo: leer `docs/REGLAS-ECOSISTEMA.md`.**

## Básico
- Repo `Fralexito/phoenixevolution`, rama de trabajo **`borrador`**, publicada en la vista previa privada **`/phoenixevolution/fase-beta/`** (la URL `/borrador/` se retiró porque se compartía sin permiso). A `main` solo cuando Fralex dice **«Súbelo»** (aún no se ha subido lo de abajo).
- Stack: Astro + Tailwind 4 + JS vanilla + Supabase (proyecto `fiibiyijojkxqlsrhcil`). Hosting: GitHub Pages.
- Funciones experimentales con interruptores en `src/data/experimento.js` (FX).
- Migraciones en `supabase/migrations/` (última: **094**; siguiente libre **095**). Si la aplicación automática falla, Fralex pega el SQL en el SQL Editor. Edge Functions: Fralex pega el archivo y despliega.
- Commits terminan con las líneas de co-autoría de Claude.

## Quién hace qué
| Pieza | Chat dueño | Contrato |
|---|---|---|
| Web + base de datos | chat «Pagina WEB» | este repo |
| Phoenix Link (C++, salas) | chat Smash Soda / Phoenix Link | `docs/contrato-v1.md` |
| Phoenix Mercado (option file) | chat Mercado (se integrará a Phoenix Link) | `docs/mercado-api.md` |
Un chat no toca la pieza de otro: le pasa un prompt. Endpoints publicados no se borran ni cambian; solo se añaden campos.

## Hecho en esta etapa
- **Web:** Noticias con lienzo libre y asistente; menú por pilares; barra de saltos en Central; Mi cuenta ordenada.
- **Rendimiento:** sin fuente fa-brands (−113 KB), fuentes precargadas, menos saltos de página. Celular lento: LCP 0.6–2.3 s, CLS 0. Pendiente: salto en Liga (0.18) en PC.
- **Liga Máster / Modo Mánager** (`/manager/`, solo Galaxy League, opcional por jugador): clubes, presupuesto, ofertas, traspasos atómicos, clubes CPU, tope 40, agente libre, versión de liga + cambios firmados Ed25519, huella de plantillas, Capa 1 (traspasos reales). Centro de control del staff.
- **088 · `lm_club_libro`:** cada cambio de presupuesto de un club se registra solo (saldo antes/después, motivo, quién). Probado.
- **089 · Equivalencias entre parches:** `mercado_equivalencias` y `mercado_equivalencias_clubes`; `POST/GET /mercado/v1/equivalencias` (formato `phoenix-mercado/emparejamiento@0.x`, máx. 3000 filas/llamada, solo staff); pantalla de revisión en Modo Mánager. Lo confirmado por el staff nunca se pisa. Probado y desplegado.
- **Legal:** `/legal/terminos/`, `/legal/privacidad/`, `/legal/reglamento/` (textos en `src/data/legal.js`, base no revisada por abogado); descargo «no afiliados a Konami/EA/Discord» en el pie; casilla obligatoria al registrarse.
- **Privacidad:** Configuración → Cuenta: descargar mis datos y solicitudes (corregir, oponerse, baja, eliminar cuenta). Panel del staff en Moderación. Eliminar cuenta es manual (Supabase → Authentication → Users).
- **Presentación:** manifest, íconos de celular y vista previa Open Graph (`public/og.jpg`).

## Decisiones tomadas (no reabrir sin Fralex)
- Club oficial = `lm_clubes`. `equipos`/`transferencias` son del sistema viejo (vacíos): no usar.
- `jugadores` = **personas de la comunidad**; `lm_jugadores` = **futbolistas del juego** (Phoenix ID).
- Identidad visual Galaxy (cian + púrpura): no cambiar paleta.
- App = PWA más adelante; nada de React/Next.
- Sin banner de cookies (no hay rastreadores). Cabeceras de seguridad solo si se muda el hosting.
- Dinero real y retos con pozo: Fralex prepara la parte legal; solo mayores de 18.
- Liga Sudario fuera de la Liga Máster por ahora.

## Hecho después (8 oct, tarde)
- Menú: Jugadores en Competir; «Modo Mánager» → «Liga Máster»; «Phoenix Soda» → «Phoenix Link» (Mis salas).
- CLS en PC corregido (data-sesion si/no). Sin ventanas nativas (diálogo `elegir()`).
- 092: RLS optimizadas, índices, funciones internas de Liga Máster solo para el servidor. 093: avisos de amistad huérfanos.
- Vista previa movida a `/fase-beta/` con cinta «FASE BETA».

## Pendiente
- Fralex: Redirect URL `https://fralexito.github.io/phoenixevolution/fase-beta/**` en Supabase Auth; protección de contraseñas filtradas; GitHub Pages Source = GitHub Actions; ¿borrar `backup_20261003`?; ¿beta solo para cuentas autorizadas?; probar con 2–3 DTs; «Súbelo».
- Chat Mercado: subir catálogo real (`/catalogo`) **antes** de las equivalencias; luego mandar el informe Conmegol→Sudamerican en lotes ≤3000. Al llegar el catálogo real, borrar los datos demo.
- Web: pantalla del staff para cargar traspasos reales (Capa 1); ordenar el interior de páginas con capturas de Fralex. (Ya hechos: salto de Liga, selector de club CPU, «sin_motivo».)
