// Pruebas del Worker de videos con un R2 y un Supabase simulados (sin red).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker-videos.js';

const UID = '11111111-1111-1111-1111-111111111111';
const TOKEN = 'aaa.bbb.ccc';
const ORIGEN = 'https://fralexito.github.io';
const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'k', PUBLIC_BASE: 'https://pub-0123456789abcdef0123456789abcdef.r2.dev', ALLOWED_ORIGINS: ORIGEN, MAX_MB: '10', MAX_VIDEOS: '3' };
function r2(existentes = []) {
  const m = new Map(existentes.map((k) => [k, 1]));
  return { m, async list({ prefix }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
    async put(k, _b, o) { if (o?.onlyIf && m.has(k)) return null; m.set(k, 1); return { key: k }; }, async delete(k) { m.delete(k); } };
}
const conSupabase = (id = UID) => { globalThis.fetch = async (url, init) => (String(url).endsWith('/auth/v1/user') && init.headers.Authorization === `Bearer ${TOKEN}` ? new Response(JSON.stringify({ id }), { status: 200 }) : new Response('{}', { status: 401 })); };
const pedir = (metodo, ruta, { headers = {}, env = {}, bucket = r2() } = {}) =>
  worker.fetch(new Request(`https://w.example${ruta}`, { method: metodo, headers: { Origin: ORIGEN, Authorization: `Bearer ${TOKEN}`, ...headers }, body: metodo === 'PUT' ? new Uint8Array(100) : undefined }), { ...base, VIDEOS: bucket, ...env });
const mp4 = { 'Content-Type': 'video/mp4', 'Content-Length': '100' };

test('worker: sube un video propio y devuelve la URL pública', async () => {
  conSupabase(); const b = r2(); const res = await pedir('PUT', '/v/1-ab.mp4', { headers: mp4, bucket: b });
  assert.equal(res.status, 201); assert.equal((await res.json()).url, `${base.PUBLIC_BASE}/${UID}/1-ab.mp4`); assert.ok(b.m.has(`${UID}/1-ab.mp4`));
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGEN);
});
test('worker: rechaza sin sesión, con origen ajeno y con token falso', async () => {
  conSupabase();
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: { ...mp4, Authorization: '' } })).status, 401);
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: { ...mp4, Authorization: 'Bearer zzz.yyy.xxx' } })).status, 401);
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: { ...mp4, Origin: 'https://malo.com' } })).status, 403);
});
test('worker: valida tipo, extensión, tamaño y nombre', async () => {
  conSupabase();
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: { 'Content-Type': 'text/html', 'Content-Length': '100' } })).status, 415);
  assert.equal((await pedir('PUT', '/v/1-ab.webm', { headers: mp4 })).status, 415);                       // extensión ≠ tipo
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: { ...mp4, 'Content-Length': String(11 * 1048576) } })).status, 413);
  assert.equal((await pedir('PUT', '/v/..%2Fx.mp4', { headers: mp4 })).status, 404);                      // sin escapar de la carpeta
});
test('worker: máximo de videos por persona y no pisa archivos', async () => {
  conSupabase();
  const lleno = r2([`${UID}/a.mp4`, `${UID}/b.mp4`, `${UID}/c.mp4`]);
  assert.equal((await pedir('PUT', '/v/d.mp4', { headers: mp4, bucket: lleno })).status, 409);
  const uno = r2([`${UID}/a.mp4`]);
  assert.equal((await pedir('PUT', '/v/a.mp4', { headers: mp4, bucket: uno })).status, 409);
});
test('worker: borrar solo toca la carpeta del usuario autenticado', async () => {
  conSupabase(); const b = r2([`${UID}/a.mp4`, `otro/a.mp4`]);
  assert.equal((await pedir('DELETE', '/v/a.mp4', { bucket: b })).status, 200);
  assert.ok(!b.m.has(`${UID}/a.mp4`)); assert.ok(b.m.has('otro/a.mp4'));
});
test('worker: sin configuración falla cerrado (sin orígenes → 403; sin binding → 500)', async () => {
  conSupabase();
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: mp4, env: { ALLOWED_ORIGINS: '' } })).status, 403);
  assert.equal((await pedir('PUT', '/v/1-ab.mp4', { headers: mp4, env: { VIDEOS: undefined } })).status, 500);
});
