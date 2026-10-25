# Índice de documentos

**Reorganizado el 21-oct-2026** (Fralex: «cada documento por tema y que tenga absolutamente completo… no borres, solo reorganiza»).
- Hay **un documento por tema**. Junta, completos y sin recortar, los documentos que antes estaban sueltos.
- Los originales siguen intactos en la carpeta `_archivo/` de cada tema y en el historial de git.
- **Lo nuevo de un tema se AÑADE a su documento** como una parte más, con: qué se logró, paso a paso para replicarlo, errores e intentos fallidos, cosas a tener en cuenta, y cómo comprobar y revertir. No se crean documentos sueltos.

Las citas del código se cambiaron a la forma `docs/<tema>/<DOC>.md («NOMBRE-VIEJO»)`: busca esa parte en el índice del documento.
Lo legal (solo local, fuera de git) sigue en `docs/legal/`.
La ordenación anterior, del 18-oct, se hacía con `node tools/reorganizar/actualizar-rutas-docs.mjs` (rutas viejas `docs/X.md` → `docs/<tema>/X.md`).

## Documentos por tema

| Tema | Documento | Junta (nombre viejo, ahora en `_archivo/`) |
|---|---|---|
| **Empieza aquí** · guía | [`guias/GUIA-WEB.md`](guias/GUIA-WEB.md) | GUIA-RETOMAR-PROYECTO-21-OCT-2026 (base para continuar todo el proyecto), GUIA-NOVEDADES-19-OCT-2026, GUIA-NOVEDADES-21-OCT-2026 |
| Historia y bitácora | [`bitacoras/HISTORIA-WEB.md`](bitacoras/HISTORIA-WEB.md) | MAPA-HISTORIAL, BITACORA-16-OCT (ECONOMIA, OPUS, WEB), INFORME-16-OCT-REACT, TRASPASO-NOTICIAS-16-OCT, REVISION-GENERAL-18-OCT, BITACORA-19-OCT-ECONOMIA, BITACORA-21-OCT (DECISIONES-WEB y CUENTA-GENERAL), INFORME-REVISION-GENERAL-21-OCT, INFORME-SEGURIDAD-21-OCT |
| Economía | [`economia/ECONOMIA.md`](economia/ECONOMIA.md) | DISENO-ECONOMIA-COMPLETA, PLAN-MONEDAS-VIRTUALES, DISENO-RECARGAS, INVESTIGACION-DISENO-APUESTAS-Y-GAMING, ECONOMIA-FASE-B/C/D/E, GUIA-PASARELA, DISENO-PASS-Y-ORGANIZADORES, SEGURIDAD-ECONOMIA |
| Dinero real, apuestas y legal | [`economia/BITACORA-DINERO-APUESTAS-Y-LEGAL.md`](economia/BITACORA-DINERO-APUESTAS-Y-LEGAL.md) | (ya era un documento único: auditoría, migración 140 «ascuas solo gratis» y riesgos legales) |
| Liga y torneos | [`liga-y-torneos/LIGA-Y-TORNEOS.md`](liga-y-torneos/LIGA-Y-TORNEOS.md) | FORMATOS, LIGA-AUTOMATICA, PLAN-TORNEOS-LIBRES, TORNEOS-LIBRES |
| Noche de liga real | [`liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md`](liga-y-torneos/NOCHE-DE-LIGA-CON-AMIGOS.md) | (documento único: guía para amigos, guion de la noche y bitácora) |
| Reglas del ecosistema | [`liga-y-torneos/REGLAS-ECOSISTEMA.md`](liga-y-torneos/REGLAS-ECOSISTEMA.md) | (norma viva) |
| Web ↔ PES ↔ Link | [`web-pes-link/WEB-PES-LINK.md`](web-pes-link/WEB-PES-LINK.md) | PROMPT-SISTEMA-DATOS-WEB-PES, SYNC-COMPARTIDO, SYNC-AUTOMATICO, TRASPASOS-EN-VIVO, MINIFACES, TRASPASO-17-OCT-WEB-PES |
| Comunidad | [`comunidad/COMUNIDAD.md`](comunidad/COMUNIDAD.md) | CHAT-GENERAL, PLAN-IA-WEB |
| Trabajo en equipo | [`trabajo-en-equipo/TRABAJO-EN-EQUIPO.md`](trabajo-en-equipo/TRABAJO-EN-EQUIPO.md) | PROTOCOLO-MULTICUENTA, PROMPT-CAMBIO-DE-CUENTA, REORGANIZACION-CODIGO-18-OCT, RESUMEN-WEB, y la parte 5 (24-oct): cuaderno `TRASPASO.md` entre dos cuentas |

Cuaderno vivo entre cuentas (raíz del repo): [`../TRASPASO.md`](../TRASPASO.md) — léelo primero al empezar y escribe tu entrada al terminar.

## Contratos y referencias (se quedan aparte porque el código los cita)

| Documento | Para qué |
|---|---|
| [`web-pes-link/contrato-v1.md`](web-pes-link/contrato-v1.md) | API de Phoenix Link → web (§1…§26) |
| [`web-pes-link/CONTRATO-WEB-PES.md`](web-pes-link/CONTRATO-WEB-PES.md) | Cambios oficiales web → PES |
| [`web-pes-link/mercado-api.md`](web-pes-link/mercado-api.md) | API de Phoenix Sync (antes Mercado) |
| [`comunidad/CONTRATO-SONIDOS-CHAT.md`](comunidad/CONTRATO-SONIDOS-CHAT.md) | Sonidos del chat |
| [`liga-y-torneos/Formatos-Phoenix-Evolution.pdf`](liga-y-torneos/Formatos-Phoenix-Evolution.pdf) | Formatos de torneo en PDF |

## Fuera de `docs/`

- `REGISTRO.md`: una línea por cambio hecho. Lo leen todos los chats al empezar.
- `MAPA.md`: mapa del código por rondas.
- `CLAUDE.md`: reglas del proyecto.
- En la raíz: `ECONOMIA.md`, `GUIA_PASO_A_PASO.md`, `RESPALDOS.md`.
- `supabase/migrations/`: migraciones numeradas. No se editan una vez aplicadas, y sus comentarios pueden nombrar rutas viejas: el nombre viejo es una «Parte» del documento de su tema.
- Mapa de todo el proyecto (web, Link, Sync, libro de PES, memoria): `D:\Frank\IA\CLAUDE\INDICE_MAESTRO.md`.

## Código

La reorganización de `src/js/core/` en carpetas por tema (y cómo adaptar una rama vieja) está en [`trabajo-en-equipo/TRABAJO-EN-EQUIPO.md`](trabajo-en-equipo/TRABAJO-EN-EQUIPO.md), en la parte «REORGANIZACION-CODIGO-18-OCT».
