// Conciliación diaria con Mercado Pago + red de seguridad para avisos que nunca llegaron. verify_jwt = false: se protege con el encabezado x-cron-secret.
// Secretos: PAGO_CRON_SECRET (lo inventas tú: una frase larga), MP_ACCESS_TOKEN.
// Llamada: POST con x-cron-secret; cuerpo opcional {"fecha":"AAAA-MM-DD"} (por defecto, ayer en hora de Lima).
// 1) Cada orden PAGADA ese día se vuelve a consultar a Mercado Pago: debe seguir «approved» con el mismo monto y la misma referencia.
// 2) Las órdenes con enlace de pago que siguen PENDIENTES desde hace más de 10 minutos se buscan en Mercado Pago por referencia; si ya hay un pago, se procesa igual que un aviso.
import { createClient } from "npm:@supabase/supabase-js@2";
import { aCentimos } from "../_shared/mp.mjs";
import { buscarPagosPorOrden, consultarPago, leerModo, procesarPagoMP } from "../_shared/proceso.mjs";

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
function iguales(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const ayerLima = () => new Date(Date.now() - 5 * 3600e3 - 24 * 3600e3).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "metodo_no_permitido" }, 405);
  const cron = Deno.env.get("PAGO_CRON_SECRET"), token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!cron || !token) return json({ error: "no_configurado" }, 503);
  if (!iguales(req.headers.get("x-cron-secret") ?? "", cron)) return json({ error: "no_autorizado" }, 401);

  let fecha = ayerLima();
  try { const f = (await req.json())?.fecha; if (typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)) fecha = f; } catch { /* sin cuerpo */ }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const modo = await leerModo(sb);

  // 2) Avisos perdidos
  const rescatadas: string[] = [];
  const { data: pend } = await sb.rpc("pasarela_pendientes_antiguas", { p_minutos: 10 });
  for (const o of ((pend ?? []) as any[]).slice(0, 50)) {
    const b = await buscarPagosPorOrden(token, o.orden);
    if (b.estado !== "ok") continue;
    for (const pago of b.pagos.filter((p: any) => p?.external_reference === o.orden && p?.status === "approved")) {
      const r = await procesarPagoMP(sb, pago, { requestId: "conciliar", live: pago.live_mode ?? (modo === "produccion"), modo });
      rescatadas.push(`${o.orden}:${r.resultado}`);
    }
  }

  // 1) Cuadre del día
  const { data: ordenes, error } = await sb.rpc("pasarela_ordenes_dia", { p_fecha: fecha });
  if (error) { console.error("[pago-conciliar]", error.message); return json({ error: "sin_datos" }, 500); }
  let total = 0, revisadas = 0, conDif = 0;
  const detalle: Record<string, unknown>[] = [];
  for (const o of ((ordenes ?? []) as any[]).slice(0, 200)) {
    revisadas++;
    const c = o.pago ? await consultarPago(token, o.pago) : { estado: "sin_pago" as const };
    const montoMp = c.estado === "ok" ? aCentimos(c.pago.transaction_amount) : null;
    const bien = c.estado === "ok" && c.pago.status === "approved" && c.pago.external_reference === o.orden && montoMp === o.monto_centimos && c.pago.currency_id === o.moneda;
    if (bien) total += montoMp!;
    else { conDif++; detalle.push({ orden: o.orden, pago: o.pago, estado_mp: c.estado === "ok" ? c.pago.status : c.estado }); }
  }
  const { data, error: e2 } = await sb.rpc("pasarela_conciliar", { p_proveedor: "mercadopago", p_fecha: fecha, p_total_proveedor: total, p_revisadas: revisadas, p_con_diferencia: conDif, p_detalle: { rescatadas, diferencias: detalle.slice(0, 20) } });
  if (e2) { console.error("[pago-conciliar]", e2.message); return json({ error: "no_guardado" }, 500); }
  return json({ ok: true, fecha, revisadas, con_diferencia: conDif, rescatadas: rescatadas.length, resultado: data });
});
