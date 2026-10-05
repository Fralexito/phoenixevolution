// Configuración central. Único lugar donde viven la URL y la clave pública de Supabase.
// La clave "publishable/anon" es PÚBLICA por diseño: la seguridad real la dan las
// políticas RLS en la base de datos. NUNCA pongas aquí una clave "service_role".
export const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL || 'https://fiibiyijojkxqlsrhcil.supabase.co';
export const SUPABASE_KEY =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_siVYbqB8ehtJAkk_tjy2OQ_CuXWX24u';

// Videos subidos por usuarios: si VIDEO_WORKER_URL está vacío, se suben al Storage de Supabase (comportamiento anterior).
// Con Cloudflare R2: URL del Worker «phoenix-videos» (sin «/» final) y la dirección pública del bucket. Ambas son públicas por diseño. Ver cloudflare/GUIA.md.
export const VIDEO_WORKER_URL = (import.meta.env.PUBLIC_VIDEO_WORKER_URL || '').replace(/\/+$/, '');

// BASE_URL termina en "/" (p. ej. "/phoenixevolution/").
export const BASE = import.meta.env.BASE_URL;

/** Construye un enlace interno respetando la carpeta base de GitHub Pages. */
export const href = (path = '') => `${BASE}${String(path).replace(/^\/+/, '')}`;

/** URL absoluta de la página actual de inicio (para el retorno de OAuth). */
export const siteHome = () => `${location.origin}${BASE}`;
