// Pegamento entre Mercado Pago y la base: consulta el pago a la API oficial y lo entrega a public.pasarela_procesar.
// Nunca se registra el token ni la firma. Solo se registran ids y resultados.
import { aCentimos, mapearEstado } from "./mp.mjs";

const API = "https://api.mercadopago.com";

/** GET /v1/payments/{id}. Devuelve { estado: 'ok', pago } | { estado: 'no_existe' } | { estado: 'error' }. */
export async function consultarPago(token, id) {
  try {
    const r = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return { estado: "no_existe" };
    if (!r.ok) return { estado: "error", http: r.status };
    return { estado: "ok", pago: await r.json() };
  } catch (_e) {
    return { estado: "error" };
  }
}

/** GET /v1/payments/search?external_reference=… (red de seguridad si un aviso no llegó). */
export async function buscarPagosPorOrden(token, orden) {
  try {
    const r = await fetch(`${API}/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(orden)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { estado: "error", http: r.status };
    const j = await r.json();
    return { estado: "ok", pagos: Array.isArray(j?.results) ? j.results : [] };
  } catch (_e) {
    return { estado: "error" };
  }
}

/** Entrega un pago ya confirmado por la API a la base. Devuelve { resultado } (o { resultado: 'error' }). */
export async function procesarPagoMP(sb, pago, { requestId, live, modo }) {
  const { data, error } = await sb.rpc("pasarela_procesar", {
    p_proveedor: "mercadopago",
    p_pago_ref: pago?.id != null ? String(pago.id) : null,
    p_estado_proveedor: typeof pago?.status === "string" ? pago.status : null,
    p_request_id: requestId ?? null,
    p_orden: typeof pago?.external_reference === "string" ? pago.external_reference : null,
    p_evento: mapearEstado(pago),
    p_monto_centimos: aCentimos(pago?.transaction_amount),
    p_moneda: typeof pago?.currency_id === "string" ? pago.currency_id : null,
    p_live: live === true,
    p_modo: modo,
  });
  if (error) { console.error("[pasarela] rpc:", error.message); return { resultado: "error" }; }
  return data ?? { resultado: "error" };
}

export async function leerModo(sb) {
  const { data } = await sb.from("economia_config").select("valor").eq("clave", "pasarela_modo").maybeSingle();
  return data?.valor === "produccion" ? "produccion" : "prueba";
}
