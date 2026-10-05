// Esqueleto del webhook de pagos. NO está desplegado ni conectado a ninguna pasarela todavía.
// Variables de entorno (Supabase → Edge Functions → Secrets): PAGO_WEBHOOK_SECRET (clave compartida con la pasarela),
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las inyecta Supabase solas).
// Para activarlo: elegir pasarela, completar `interpretar()` según su documentación y desplegar con verify_jwt = false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Evento = { evento: "pagado" | "fallido" | "reembolsado" | "disputado" | "disputa_ganada"; orden: string; proveedor: string; ref: string | null; monto: number | null; moneda: string | null; comprobante: string | null };

async function firmaValida(cuerpo: string, firmaHex: string, secreto: string): Promise<boolean> {
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperada = new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo)));
  const recibida = Uint8Array.from((firmaHex.match(/../g) ?? []).map((h) => parseInt(h, 16)));
  if (recibida.length !== esperada.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada[i] ^ recibida[i];
  return diff === 0;
}

// ADAPTADOR: traduce el JSON de la pasarela elegida a nuestro formato neutro. Pendiente de completar.
function interpretar(_json: unknown): Evento {
  throw new Error("Adaptador de pasarela sin implementar");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  const secreto = Deno.env.get("PAGO_WEBHOOK_SECRET");
  if (!secreto) { console.error("[pago-webhook] falta PAGO_WEBHOOK_SECRET"); return new Response("No configurado", { status: 503 }); }
  const cuerpo = await req.text();
  const firma = req.headers.get("x-signature") ?? "";
  if (!(await firmaValida(cuerpo, firma, secreto))) { console.warn("[pago-webhook] firma inválida"); return new Response("Firma inválida", { status: 401 }); }
  try {
    const e = interpretar(JSON.parse(cuerpo));
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.rpc("procesar_pago_evento", { p_evento: e.evento, p_orden: e.orden, p_proveedor: e.proveedor, p_proveedor_ref: e.ref, p_monto_centimos: e.monto, p_moneda: e.moneda, p_comprobante: e.comprobante });
    if (error) { console.error("[pago-webhook] rpc:", error.message); return new Response("Error", { status: 500 }); }
    return new Response(JSON.stringify({ ok: true, resultado: data }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    console.error("[pago-webhook]", err);
    return new Response("Error", { status: 500 });
  }
});
