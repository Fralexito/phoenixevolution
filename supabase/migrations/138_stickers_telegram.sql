-- 138 · Stickers de video de Telegram (19-oct-2026, Fralex: «que sea posible subir stickers… desde las típicas apps que hacen stickers de WhatsApp y Telegram»).
-- Telegram tiene tres tipos de sticker: estáticos .webp (ya se podían), animados .tgs (Lottie; no se admiten todavía) y de VIDEO .webm (este cambio).
-- Solo amplía los tipos permitidos del bucket «stickers» (migración 137); el tamaño sigue en 1 MB (los de Telegram pesan ≤ 256 KB).
-- Deshacer: update storage.buckets set allowed_mime_types = array['image/webp', 'image/png', 'image/gif'] where id = 'stickers';
update storage.buckets set allowed_mime_types = array['image/webp', 'image/png', 'image/gif', 'video/webm'] where id = 'stickers';
