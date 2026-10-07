// Edge Function «directos»: detecta quién está en vivo en Twitch y lo marca en la web (aviso a seguidores + Discord + barra «Última hora»).
// La llama pg_cron cada 5 min con la cabecera x-directos-secreto. Variables (Supabase → Edge Functions → Secrets):
//   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (app de dev.twitch.tv) y DIRECTOS_SECRETO (cualquier texto largo; el mismo va en el cron).
// Desplegar con verify_jwt = false (la protege el secreto). Sin variables de Twitch responde { ok:false, motivo:'SIN_CONFIGURAR' } y no toca nada.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json" } });
let token: { valor: string; vence: number } | null = null;

async function tokenTwitch(id: string, secreto: string): Promise<string> {
  if (token && token.vence > Date.now() + 60_000) return token.valor;
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secreto}&grant_type=client_credentials`, { method: "POST" });
  if (!r.ok) throw new Error(`twitch token ${r.status}`);
  const j = await r.json();
  token = { valor: j.access_token, vence: Date.now() + j.expires_in * 1000 };
  return token.valor;
}

Deno.serve(async (req) => {
  const esperado = Deno.env.get("DIRECTOS_SECRETO");
  if (!esperado || req.headers.get("x-directos-secreto") !== esperado) return json({ ok: false, motivo: "NO_AUTORIZADO" }, 401);
  const id = Deno.env.get("TWITCH_CLIENT_ID"); const secreto = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!id || !secreto) return json({ ok: false, motivo: "SIN_CONFIGURAR" });
  try {
    const { data: lista, error } = await sb.rpc("sistema_creadores_twitch");
    if (error) throw new Error(error.message);
    const creadores = (lista ?? []) as { usuario: string; login: string }[];
    if (!creadores.length) return json({ ok: true, revisados: 0 });
    const tk = await tokenTwitch(id, secreto);
    const vivos: { usuario: string; titulo: string; enlace: string }[] = [];
    for (let i = 0; i < creadores.length; i += 100) {
      const lote = creadores.slice(i, i + 100);
      const r = await fetch(`https://api.twitch.tv/helix/streams?${lote.map((c) => `user_login=${encodeURIComponent(c.login)}`).join("&")}&first=100`,
        { headers: { "Client-Id": id, Authorization: `Bearer ${tk}` } });
      if (r.status === 401) { token = null; throw new Error("twitch 401"); }
      if (!r.ok) throw new Error(`twitch streams ${r.status}`);
      const { data } = await r.json();
      for (const s of data ?? []) {
        const c = lote.find((x) => x.login === String(s.user_login).toLowerCase());
        if (c) vivos.push({ usuario: c.usuario, titulo: String(s.title ?? "").slice(0, 120), enlace: `https://twitch.tv/${c.login}` });
      }
    }
    const { data: res, error: e2 } = await sb.rpc("sistema_aplicar_directos", { p_vivos: vivos });
    if (e2) throw new Error(e2.message);
    console.info(JSON.stringify({ evento: "directos", revisados: creadores.length, vivos: vivos.length, ...res }));
    return json({ ok: true, revisados: creadores.length, vivos: vivos.length, ...res });
  } catch (e) {
    console.error(JSON.stringify({ evento: "directos_error", mensaje: String((e as Error).message) }));
    return json({ ok: false, motivo: "ERROR", mensaje: String((e as Error).message) }, 500);
  }
});
