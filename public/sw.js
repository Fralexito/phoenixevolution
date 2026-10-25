// Service worker de Phoenix Evolution: hace la web instalable y la deja abrir sin internet (solo lo ya visto).
// Páginas: primero la red (siempre lo más nuevo), si falla, la copia guardada. Archivos con huella (/_astro/, imágenes): primero la copia guardada.
const VERSION = 'pes-v3';
// 25-oct-2026 (optimización): imágenes y archivos con huella van a su propia caché con TOPE de entradas (antes crecía sin límite en el celular).
const ARCHIVOS = 'pes-archivos-v1';
const TOPE_ARCHIVOS = 400;
const TOPE_PAGINAS = 80;   // páginas guardadas para abrir sin internet (cada ?u=… de perfil cuenta como una)
let recortando = false;
async function recortar() {
  if (recortando) return; recortando = true;
  try {
    const c = await caches.open(ARCHIVOS); const ks = await c.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - TOPE_ARCHIVOS))) await c.delete(k);
    const p = await caches.open(VERSION); const fijas = new Set([new URL('./', self.registration.scope).href, new URL('./offline.html', self.registration.scope).href]);
    const ps = (await p.keys()).filter((k) => !fijas.has(k.url)); for (const k of ps.slice(0, Math.max(0, ps.length - TOPE_PAGINAS))) await p.delete(k);
  }
  catch { /* sin espacio o sin permiso: no pasa nada, solo no se recorta */ }
  finally { recortando = false; }
}
// Stickers compartidos desde otras apps (19-oct-2026): con la web instalada como app (Android), Phoenix sale en «Compartir» de las apps de stickers
// (share_target en site.webmanifest). El sistema hace un POST a ./stickers-recibir/ con los archivos: aquí se guardan un momento en la caché
// «px-compartidos» y se abre esa página, que los sube a «Mis stickers» (js/pages/stickersRecibir.js) y vacía la caché.
const COMPARTIDOS = 'px-compartidos';
async function recibirCompartidos(r) {
  const destino = (n) => Response.redirect(new URL(`stickers-recibir/?compartidos=${n}`, self.registration.scope).href, 303);
  try {
    const datos = await r.formData(); const archivos = datos.getAll('stickers').filter((f) => f && typeof f === 'object' && 'size' in f).slice(0, 120);
    await caches.delete(COMPARTIDOS); const c = await caches.open(COMPARTIDOS);
    await Promise.all(archivos.map((f, i) => c.put(new URL(`__compartido/${i}`, self.registration.scope).href, new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-nombre': encodeURIComponent(f.name || `sticker-${i}`) } }))));
    return destino(archivos.length);
  } catch { return destino(0); }
}
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', './offline.html']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== COMPARTIDOS && k !== ARCHIVOS).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method === 'POST' && u.origin === location.origin && u.pathname.endsWith('/stickers-recibir/')) { e.respondWith(recibirCompartidos(r)); return; }
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Supabase y demás: siempre directo
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then((k) => k.put(r, c)).then(recortar).catch(() => {}); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match('./offline.html'))));
    return;
  }
  if (/\/_astro\/|\.(png|jpe?g|webp|svg|woff2?|ico)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(ARCHIVOS).then((k) => k.put(r, c)).then(recortar).catch(() => {}); } return res; })));
  }
});
