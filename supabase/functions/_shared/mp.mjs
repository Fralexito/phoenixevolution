// Lógica pura del adaptador de Mercado Pago (Checkout Pro, Perú). Sin red ni secretos: se prueba con node --test y la usan las Edge Functions.
// Fuentes oficiales (verificadas 16-oct-2026):
//  · Webhooks y firma: https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/payment-notifications
//  · Crear preferencia: POST https://api.mercadopago.com/checkout/preferences → https://www.mercadopago.com.pe/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post
//  · Consultar pago: GET https://api.mercadopago.com/v1/payments/{id} · buscar: GET /v1/payments/search?external_reference=...

const enc = new TextEncoder();

/** «ts=1742505638683,v1=ced36ab6…» → { ts, v1 } (o null si falta algo). */
export function leerXSignature(cabecera) {
  if (typeof cabecera !== "string" || cabecera.length > 400) return null;
  let ts = null, v1 = null;
  for (const trozo of cabecera.split(",")) {
    const i = trozo.indexOf("=");
    if (i < 0) continue;
    const k = trozo.slice(0, i).trim(), v = trozo.slice(i + 1).trim();
    if (k === "ts") ts = v; else if (k === "v1") v1 = v;
  }
  return ts && v1 && /^\d{6,16}$/.test(ts) && /^[0-9a-f]{64}$/i.test(v1) ? { ts, v1: v1.toLowerCase() } : null;
}

/** Plantilla oficial: «id:[data.id];request-id:[x-request-id];ts:[ts];». Si falta un dato, se quita (así lo indica la documentación).
 *  El id alfanumérico se usa en minúsculas. */
export function construirManifiesto({ dataId, requestId, ts }) {
  let m = "";
  if (dataId) m += `id:${String(dataId).toLowerCase()};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}

async function hmacHex(secreto, mensaje) {
  const clave = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", clave, enc.encode(mensaje)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** ¿La firma del aviso es de Mercado Pago? HMAC-SHA256 en hexadecimal con la clave secreta de la aplicación. */
export async function firmaValida({ xSignature, xRequestId, dataId, secreto }) {
  if (!secreto) return false;
  const f = leerXSignature(xSignature);
  if (!f) return false;
  const esperada = await hmacHex(secreto, construirManifiesto({ dataId, requestId: xRequestId, ts: f.ts }));
  return iguales(esperada, f.v1);
}

/** Solo para pruebas y para la guía: genera la cabecera x-signature de un aviso simulado. */
export async function firmarAviso({ dataId, requestId, ts, secreto }) {
  return `ts=${ts},v1=${await hmacHex(secreto, construirManifiesto({ dataId, requestId, ts }))}`;
}

/** Soles con decimales → céntimos enteros (redondeo seguro). null si el valor no es un número válido. */
export function aCentimos(valor) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Estado del pago en Mercado Pago → evento neutro de procesar_pago_evento.
 *  Estados de la API de pagos: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back.
 *  null = sin efecto (todavía no hay dinero confirmado, o hay una mediación abierta que se revisa a mano). */
export function mapearEstado(pago) {
  const estado = pago?.status;
  const total = aCentimos(pago?.transaction_amount);
  const devuelto = aCentimos(pago?.transaction_amount_refunded ?? 0) ?? 0;
  switch (estado) {
    case "approved":
      return devuelto > 0 && total !== null && devuelto < total ? "reembolso_parcial" : "pagado";
    case "refunded":
      return "reembolsado";
    case "charged_back":
      return "disputado";
    case "rejected":
    case "cancelled":
      return "fallido";
    default:
      return null;
  }
}

/** Cuerpo para crear la preferencia (Checkout Pro). Monto, moneda y referencia salen de la base, nunca del navegador. */
export function construirPreferencia({ orden, titulo, montoCentimos, moneda, urlAviso, urlRetorno, venceIso }) {
  const p = {
    items: [{ id: orden, title: String(titulo).slice(0, 80), quantity: 1, currency_id: moneda, unit_price: montoCentimos / 100 }],
    external_reference: orden,
    notification_url: urlAviso,
    back_urls: { success: `${urlRetorno}?pago=ok`, pending: `${urlRetorno}?pago=pendiente`, failure: `${urlRetorno}?pago=error` },
    auto_return: "approved",
    binary_mode: true,
    statement_descriptor: "PHOENIX",
    metadata: { orden },
  };
  if (venceIso) { p.expires = true; p.expiration_date_to = venceIso; }
  return p;
}

/** ISO con la hora de Lima (-05:00), como el ejemplo de la documentación. */
export function isoLima(fecha) {
  const l = new Date(fecha.getTime() - 5 * 3600 * 1000);
  return l.toISOString().replace("Z", "") + "-05:00";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (s) => typeof s === "string" && UUID.test(s);
