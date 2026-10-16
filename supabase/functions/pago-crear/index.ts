// Crea el enlace de pago de Mercado Pago (Checkout Pro) para una orden del jugador. Se despliega con verify_jwt = true (hace falta sesión).
// El jugador solo manda el id de SU orden (creada antes con crear_orden_metodo(paquete, 'mercadopago')). Monto, moneda y título salen de la base.
// Secretos: MP_ACCESS_TOKEN. Opcional: PAGO_RETORNO_URL (a dónde vuelve el jugador tras pagar), PAGO_ORIGENES (orígenes web permitidos, separados por coma).
import { createClient } from "npm:@supabase/supabase-js@2";
import { construirPreferencia, esUuid, isoLima } from "../_shared/mp.mjs";
import { leerModo } from "../_shared/proceso.mjs";

const RETORNO = Deno.env.get("PAGO_RETORNO_URL") ?? "https://fralexito.github.io/phoenixevolution/fase-beta-1-0/tienda/";
const ORIGENES = (Deno.env.get("PAGO_ORIGENES") ?? "https://fralexito.github.io,http://localhost:4321").split(",").map((s) => s.trim());

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return { "access-control-allow-origin": ORIGENES.includes(o) ? o : ORIGENES[0], "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" };
}
const json = (req: Request, o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...cors(req) } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "metodo_no_permitido" }, 405);
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) { console.error("[pago-crear] falta MP_ACCESS_TOKEN"); return json(req, { error: "no_configurado" }, 503); }

  // Quién es: se valida la sesión con Supabase (nunca se confía en un id enviado por el navegador).
  const auth = req.headers.get("authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const sbUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await sbUser.auth.getUser();
  if (!u?.user) return json(req, { error: "sin_sesion" }, 401);

  let orden: unknown;
  try { orden = (await req.json())?.orden; } catch { /* vacío */ }
  if (!esUuid(orden)) return json(req, { error: "orden_invalida" }, 400);

  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: o, error } = await sb.rpc("pasarela_orden_para_cobro", { p_orden: orden, p_usuario: u.user.id });
  if (error) return json(req, { error: "orden_no_cobrable", detalle: error.message.slice(0, 120) }, 409);

  const modo = await leerModo(sb);
  // Si ya hay enlace para esta orden (misma vigencia), se devuelve el mismo: no se crean preferencias de más.
  if (o.checkout_url) return json(req, { checkout_url: o.checkout_url, orden: o.orden, modo });

  const cuerpo = construirPreferencia({
    orden: o.orden, titulo: `Phoenix Evolution · ${o.titulo} (${o.gemas} gemas)`, montoCentimos: o.monto_centimos, moneda: o.moneda,
    urlAviso: `${url}/functions/v1/pago-webhook`, urlRetorno: RETORNO, venceIso: o.expira_at ? isoLima(new Date(o.expira_at)) : null,
  });
  let r: Response;
  try {
    r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", "X-Idempotency-Key": o.orden },
      body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(12000),
    });
  } catch { return json(req, { error: "pasarela_no_responde" }, 502); }
  if (!r.ok) { console.error("[pago-crear] Mercado Pago respondió", r.status); return json(req, { error: "pasarela_rechazo", http: r.status }, 502); }
  const pref = await r.json();
  const enlace: string | undefined = modo === "prueba" ? (pref.sandbox_init_point ?? pref.init_point) : pref.init_point;
  if (!enlace) return json(req, { error: "sin_enlace" }, 502);
  const { error: e2 } = await sb.rpc("pasarela_guardar_checkout", { p_orden: o.orden, p_url: enlace, p_preferencia: String(pref.id ?? "") });
  if (e2) { console.error("[pago-crear] guardar enlace:", e2.message); return json(req, { error: "no_guardado" }, 500); }
  return json(req, { checkout_url: enlace, orden: o.orden, modo });
});
