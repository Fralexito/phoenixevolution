// Pruebas del adaptador de Mercado Pago con avisos SIMULADOS (sin red, sin claves reales). Lo que pasa después de la firma (duplicado, monto distinto,
// reembolso, orden desconocida) se prueba contra la base en supabase/tests/122_fase_d_test.sql.
import test from "node:test";
import assert from "node:assert/strict";
import { aCentimos, construirManifiesto, construirPreferencia, esUuid, firmaValida, firmarAviso, isoLima, leerXSignature, mapearEstado } from "../supabase/functions/_shared/mp.mjs";
import { procesarPagoMP } from "../supabase/functions/_shared/proceso.mjs";

const SECRETO = "clave-secreta-solo-para-pruebas"; // inventada: nunca una clave real
const base = { dataId: "123456", requestId: "bb56a2f1-6aae-46ac-982e-9dcd3581d08e", ts: "1742505638683" };

test("el manifiesto sigue la plantilla oficial id;request-id;ts (ejemplo de la documentación)", () => {
  assert.equal(construirManifiesto(base), "id:123456;request-id:bb56a2f1-6aae-46ac-982e-9dcd3581d08e;ts:1742505638683;");
});

test("el id alfanumérico se usa en minúsculas y lo que falta se quita de la plantilla", () => {
  assert.equal(construirManifiesto({ dataId: "ABC123", requestId: "r", ts: "1" }), "id:abc123;request-id:r;ts:1;");
  assert.equal(construirManifiesto({ dataId: null, requestId: "r", ts: "1" }), "request-id:r;ts:1;");
  assert.equal(construirManifiesto({ dataId: "1", requestId: "", ts: "1" }), "id:1;ts:1;");
});

test("firma correcta: se acepta", async () => {
  const xSignature = await firmarAviso({ ...base, secreto: SECRETO });
  assert.equal(await firmaValida({ xSignature, xRequestId: base.requestId, dataId: base.dataId, secreto: SECRETO }), true);
});

test("firma incorrecta: clave distinta, id, request-id o ts alterados, formato roto, sin clave", async () => {
  const xSignature = await firmarAviso({ ...base, secreto: SECRETO });
  const v = (o) => firmaValida({ xSignature, xRequestId: base.requestId, dataId: base.dataId, secreto: SECRETO, ...o });
  assert.equal(await v({ secreto: "otra-clave" }), false);
  assert.equal(await v({ dataId: "123457" }), false);
  assert.equal(await v({ xRequestId: "otro-request" }), false);
  assert.equal(await v({ xSignature: xSignature.replace(/ts=\d+/, "ts=1742505638684") }), false);
  assert.equal(await v({ xSignature: "" }), false);
  assert.equal(await v({ xSignature: "ts=1742505638683" }), false);
  assert.equal(await v({ xSignature: "ts=1742505638683,v1=zz" }), false);
  assert.equal(await v({ xSignature: undefined }), false);
  assert.equal(await v({ secreto: "" }), false);
  assert.equal(await v({ secreto: undefined }), false);
});

test("leerXSignature extrae ts y v1 y rechaza cabeceras absurdas", () => {
  const v1 = "a".repeat(64);
  assert.deepEqual(leerXSignature(`ts=1742505638683,v1=${v1}`), { ts: "1742505638683", v1 });
  assert.deepEqual(leerXSignature(` v1=${v1.toUpperCase()} , ts=1742505638683 `), { ts: "1742505638683", v1 });
  assert.equal(leerXSignature("x".repeat(500)), null);
  assert.equal(leerXSignature(null), null);
});

test("estados de Mercado Pago → eventos neutros", () => {
  const m = (status, extra = {}) => mapearEstado({ status, transaction_amount: 10, ...extra });
  assert.equal(m("approved"), "pagado");
  assert.equal(m("refunded"), "reembolsado");
  assert.equal(m("charged_back"), "disputado");
  assert.equal(m("rejected"), "fallido");
  assert.equal(m("cancelled"), "fallido");
  for (const s of ["pending", "in_process", "authorized", "in_mediation", "algo_nuevo", undefined]) assert.equal(m(s), null, String(s));
  assert.equal(m("approved", { transaction_amount_refunded: 4 }), "reembolso_parcial");
  assert.equal(m("approved", { transaction_amount_refunded: 0 }), "pagado");
});

test("los montos se convierten a céntimos sin errores de coma flotante", () => {
  assert.equal(aCentimos("24.50"), 2450);
  assert.equal(aCentimos(10), 1000);
  assert.equal(aCentimos(0.1 + 0.2), 30);
  assert.equal(aCentimos("abc"), null);
  assert.equal(aCentimos(-1), null);
  assert.equal(aCentimos(NaN), null);
});

test("la preferencia usa monto y referencia de la orden, aviso HTTPS, vencimiento y no incluye datos personales", () => {
  const orden = "11111111-2222-4333-8444-555555555555";
  const p = construirPreferencia({ orden, titulo: "Phoenix Evolution · Brasa (110 gemas)", montoCentimos: 1000, moneda: "PEN",
    urlAviso: "https://x.supabase.co/functions/v1/pago-webhook", urlRetorno: "https://sitio.example/tienda/", venceIso: isoLima(new Date("2026-10-16T20:00:00Z")) });
  assert.equal(p.external_reference, orden);
  assert.equal(p.items[0].unit_price, 10);
  assert.equal(p.items[0].currency_id, "PEN");
  assert.equal(p.items[0].quantity, 1);
  assert.equal(p.notification_url, "https://x.supabase.co/functions/v1/pago-webhook");
  assert.equal(p.expires, true);
  assert.equal(p.expiration_date_to, "2026-10-16T15:00:00.000-05:00");
  assert.equal(p.payer, undefined);
  assert.ok(!JSON.stringify(p).includes("card"));
});

test("esUuid", () => {
  assert.equal(esUuid("11111111-2222-4333-8444-555555555555"), true);
  assert.equal(esUuid("no-es-uuid"), false);
  assert.equal(esUuid(null), false);
});

// --- Entrega a la base con un cliente simulado ---
function sbFalso(respuesta) {
  const llamadas = [];
  return { llamadas, rpc: async (nombre, args) => { llamadas.push({ nombre, args }); return respuesta; } };
}

test("un pago aprobado se entrega como «pagado» con monto en céntimos y la orden como referencia", async () => {
  const sb = sbFalso({ data: { resultado: "acreditada" }, error: null });
  const orden = "11111111-2222-4333-8444-555555555555";
  const r = await procesarPagoMP(sb, { id: 987, status: "approved", transaction_amount: 10, currency_id: "PEN", external_reference: orden }, { requestId: "req", live: false, modo: "prueba" });
  assert.equal(r.resultado, "acreditada");
  const a = sb.llamadas[0];
  assert.equal(a.nombre, "pasarela_procesar");
  assert.deepEqual(a.args, { p_proveedor: "mercadopago", p_pago_ref: "987", p_estado_proveedor: "approved", p_request_id: "req", p_orden: orden, p_evento: "pagado",
    p_monto_centimos: 1000, p_moneda: "PEN", p_live: false, p_modo: "prueba" });
});

test("reembolso, disputa y estados pendientes se entregan con el evento correcto", async () => {
  const sb = sbFalso({ data: { resultado: "x" }, error: null });
  const o = "11111111-2222-4333-8444-555555555555";
  for (const [status, evento] of [["refunded", "reembolsado"], ["charged_back", "disputado"], ["pending", null], ["rejected", "fallido"]]) {
    await procesarPagoMP(sb, { id: 1, status, transaction_amount: 10, currency_id: "PEN", external_reference: o }, { requestId: "r", live: true, modo: "produccion" });
    assert.equal(sb.llamadas.at(-1).args.p_evento, evento, status);
    assert.equal(sb.llamadas.at(-1).args.p_live, true);
  }
});

test("un pago sin referencia de orden o con monto raro no inventa datos", async () => {
  const sb = sbFalso({ data: { resultado: "orden_desconocida" }, error: null });
  await procesarPagoMP(sb, { id: 5, status: "approved", transaction_amount: "no-numero", currency_id: "PEN" }, { requestId: "r", live: false, modo: "prueba" });
  assert.equal(sb.llamadas[0].args.p_orden, null);
  assert.equal(sb.llamadas[0].args.p_monto_centimos, null);
});

test("si la base falla, se devuelve «error» (el webhook responde 500 y Mercado Pago reintenta)", async () => {
  const sb = sbFalso({ data: null, error: { message: "boom" } });
  const origError = console.error; console.error = () => {};
  try { assert.equal((await procesarPagoMP(sb, { id: 1, status: "approved" }, { requestId: "r", live: false, modo: "prueba" })).resultado, "error"); }
  finally { console.error = origError; }
});
