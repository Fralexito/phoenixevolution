# Videos en Cloudflare R2 · guía paso a paso

## Mapa general (qué piezas hay y cómo se hablan)
```
Navegador ──(1) PUT video + token de sesión──▶ Worker «phoenix-videos» ──(2) ¿quién es este token?──▶ Supabase Auth
                                                    │ (3) si es válido y cumple límites
                                                    ▼
                                              Bucket R2 «phoenix-videos»  ◀── (5) el navegador REPRODUCE desde https://pub-…r2.dev
Navegador ──(4) publica el enlace (URL)──▶ Supabase (RPC muro_publicar…, que solo acepta SU host exacto de R2)
```
- **Worker** = el portero. Sin él habría que meter claves de R2 en la web, y cualquiera las vería.
- **Supabase** sigue guardando solo texto (el enlace al video). Los videos viejos de Supabase Storage siguen funcionando.
- Límites: 15 s (lo valida la web), 10 MB y 3 videos por persona (los fuerza el Worker).

## Parte 1 · lo que haces tú en Cloudflare (la interfaz puede cambiar de nombre; busca términos parecidos)
1. Crea una cuenta gratis en https://dash.cloudflare.com/sign-up y confirma tu correo.
2. Menú izquierdo → **R2 Object Storage** → **Activar / Get started**. Cloudflare suele pedir una tarjeta para activarlo; el plan gratis (10 GB) no cobra mientras no lo superes.
3. **Create bucket** → nombre `phoenix-videos` → ubicación *Automatic* → Create.
4. Entra al bucket → pestaña **Settings** → sección **Public Development URL** (r2.dev) → **Enable** → escribe `allow` para confirmar. Copia la dirección que te muestra: `https://pub-XXXXXXXX….r2.dev`. **(DATO 1)**
5. Menú izquierdo → **Workers & Pages** → **Create** → **Create Worker** → nombre `phoenix-videos` → **Deploy** (deja el código de ejemplo por ahora).
6. En el Worker → **Edit code** → borra todo, pega el contenido COMPLETO de `cloudflare/worker-videos.js` → **Deploy**.
7. Worker → **Settings → Bindings → Add → R2 bucket**: *Variable name* = `VIDEOS` (en mayúsculas, exacto) · *Bucket* = `phoenix-videos` → guardar.
8. Worker → **Settings → Variables and Secrets → Add** (tipo **Text**), una por una:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | `https://fiibiyijojkxqlsrhcil.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_siVYbqB8ehtJAkk_tjy2OQ_CuXWX24u` (clave pública, la misma de la web) |
| `PUBLIC_BASE` | la dirección del paso 4 (DATO 1), sin «/» al final: `https://pub-4b6fbf5944a44d8391ccadff7dc09968.r2.dev` |
| `ALLOWED_ORIGINS` | `https://fralexito.github.io` |
| `MAX_MB` | `10` |
| `MAX_VIDEOS` | `3` |

   → **Deploy** otra vez para que apliquen.
9. En la página del Worker copia su dirección: `https://phoenix-videos.<tu-subdominio>.workers.dev`. **(DATO 2)**
10. **Pásame DATO 1 y DATO 2.** (Ninguno es secreto. NO me pases tokens ni claves de API: no se necesitan.)

## Parte 2 · lo que hago yo con esos dos datos
1. Migración **028**: la base de datos acepta enlaces de TU bucket R2 (host exacto, igual que hoy con Supabase) además de los de Supabase.
2. Pongo el DATO 2 como valor por defecto de `VIDEO_WORKER_URL` en `src/js/core/config.js`.
3. Pruebas, MAPA, commit en `borrador`.
4. Tú ejecutas la 028 en Supabase y pruebas subir un video desde la vista previa (`/fase-beta/`).

## Si algo falla
- «Origen no permitido» → `ALLOWED_ORIGINS` no coincide exactamente con `https://fralexito.github.io` (sin «/» final).
- «El servicio de videos no está configurado» → falta alguna variable o el binding `VIDEOS`.
- «Inicia sesión…» → token vencido: recarga la página e inicia sesión de nuevo.
- Mira el registro en Worker → **Logs / Observability**.
