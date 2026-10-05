-- 028 · VIDEOS EN CLOUDFLARE R2. Depende de 027. Solo cambia UNA función: `private.video_propio` ahora acepta, además del bucket «muro-video» de este proyecto de Supabase,
-- los videos de TU bucket R2 (host exacto `pub-4b6fbf5944a44d8391ccadff7dc09968.r2.dev`, carpeta = tu uid). Cualquier otro host sigue rechazado.
-- Los videos ya subidos a Supabase siguen siendo válidos. Es seguro ejecutarla más de una vez.
create or replace function private.video_propio(p_url text, p_uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~ ('^https://(fiibiyijojkxqlsrhcil\.supabase\.co/storage/v1/object/public/muro-video|pub-4b6fbf5944a44d8391ccadff7dc09968\.r2\.dev)/' || p_uid::text || '/[A-Za-z0-9._-]{1,80}$')
$$;
revoke all on function private.video_propio(text, uuid) from public, anon, authenticated;
