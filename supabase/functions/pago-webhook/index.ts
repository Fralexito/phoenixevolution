// Webhook de pagos de Mercado Pago (Checkout Pro, Perú). Se despliega con verify_jwt = false: la seguridad es la FIRMA x-signature (obligatoria).
// Secretos (solo en Supabase → Edge Functions → Secrets, nunca en el código): MP_WEBHOOK_SECRET (clave secreta de la aplicación → Webhooks),
// MP_ACCESS_TOKEN (credencial de la aplicación). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase.
// Flujo: firma → (si falla: se registra y 401) → se consulta el pago a la API oficial (no se confía en el cuerpo del aviso) → public.pasarela_procesar
// (idempotente, registra todo en pagos_eventos y acredita con procesar_pago_evento). Guía: docs/economia/ECONOMIA.md («GUIA-PASARELA»)
import { createClient } from "npm:@supabase/supabase-js@2";
import { firmaValida } from "../_shared/mp.mjs";
import { consultarPago, leerModo, procesarPagoMP } from "../_shared/proceso.mjs";

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const secreto = Deno.env.get("MP_WEBHOOK_SECRET");
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!secreto || !token) { console.error("[pago-webhook] faltan secretos de configuración"); return json({ error: "no_configurado" }, 503); }

  const texto = await req.text();
  if (texto.length > 20_000) return json({ error: "demasiado_grande" }, 413);
  const url = new URL(req.url);
  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const idQuery = url.searchParams.get("data.id");
  let cuerpo: Record<string, any> | null = null;
  try { cuerpo = JSON.parse(texto); } catch { /* sin cuerpo válido */ }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1) Firma obligatoria. Sin firma válida no se hace nada más que registrar el intento.
  const ok = await firmaValida({ xSignature, xRequestId, dataId: idQuery, secreto });
  if (!ok) {
    const { data } = await sb.rpc("pasarela_rechazo", { p_proveedor: "mercadopago", p_request_id: xRequestId, p_detalle: "Firma ausente o incorrecta" });
    console.warn("[pago-webhook] firma inválida");
    return json({ error: "firma_invalida" }, data?.resultado === "limite" ? 429 : 401);
  }

  // 2) Qué avisaron. Solo el tema «payment» mueve dinero; el resto se registra y se ignora.
  const tipo = String(url.searchParams.get("type") ?? cuerpo?.type ?? "");
  const idCuerpo = cuerpo?.data?.id != null ? String(cuerpo.data.id) : null;
  const id = idQuery ?? idCuerpo;
  if (idQuery && idCuerpo && idQuery !== idCuerpo) return json({ error: "ids_distintos" }, 400);
  const modo = await leerModo(sb);
  const live = cuerpo?.live_mode === true;
  const idValido = id !== null && /^\d{1,20}$/.test(id);
  if (tipo !== "payment" || !idValido) {
    await sb.rpc("pasarela_procesar", { p_proveedor: "mercadopago", p_pago_ref: idValido ? id : null, p_estado_proveedor: ("tema:" + tipo).slice(0, 40),
      p_request_id: xRequestId, p_orden: null, p_evento: null, p_monto_centimos: null, p_moneda: null, p_live: live, p_modo: modo });
    return json({ ok: true, resultado: "ignorado" });
  }

  // 3) Estado real del pago: se pregunta a la API oficial con nuestro token (el cuerpo del aviso no se usa para decidir dinero).
  const c = await consultarPago(token, id!);
  if (c.estado === "error") { console.error("[pago-webhook] no se pudo consultar el pago", id, c.http ?? ""); return json({ error: "consulta_fallida" }, 502); } // Mercado Pago reintenta
  if (c.estado === "no_existe") {
    // Es lo que ocurre con el «simular notificación» del panel (id de ejemplo). Se registra y se responde 200.
    await sb.rpc("pasarela_procesar", { p_proveedor: "mercadopago", p_pago_ref: id, p_estado_proveedor: "no_existe", p_request_id: xRequestId, p_orden: null, p_evento: null,
      p_monto_centimos: null, p_moneda: null, p_live: live, p_modo: modo });
    return json({ ok: true, resultado: "ignorado" });
  }

  // 4) A la base: idempotente, con alertas si algo no cuadra.
  const r = await procesarPagoMP(sb, c.pago, { requestId: xRequestId, live, modo });
  console.log(JSON.stringify({ evento: "pago-webhook", pago: id, resultado: r.resultado }));
  if (r.resultado === "limite") return json({ error: "limite" }, 429);
  if (r.resultado === "error") return json({ error: "no_procesado" }, 500); // Mercado Pago reintenta: el aviso quedó registrado como «error» sin bloquear el reintento
  return json({ ok: true, resultado: r.resultado });
});
