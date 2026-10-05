-- 046b · CONFIGURAR EL WEBHOOK DE DISCORD (lo ejecutas TÚ, una sola vez, en el SQL Editor de Supabase). Es un SECRETO: no lo pegues en el chat ni en el código.
-- 1) En Discord: Ajustes del canal → Integraciones → Webhooks → Nuevo webhook → «Copiar URL del webhook».
-- 2) Reemplaza el texto entre comillas por tu URL (empieza con https://discord.com/api/webhooks/) y ejecuta SOLO esta línea:
select vault.create_secret('PEGA_AQUI_LA_URL_DEL_WEBHOOK', 'discord_webhook');
-- 3) Prueba (debe devolver ENVIADO y llegar un mensaje al canal):
-- select private.discord_probar();
-- Para cambiar la URL más adelante: select vault.update_secret((select id from vault.secrets where name = 'discord_webhook'), 'NUEVA_URL');
-- Para apagar el puente: delete from vault.secrets where name = 'discord_webhook';
