// Service worker de Phoenix Evolution: hace la web instalable y la deja abrir sin internet (solo lo ya visto).
// Páginas: primero la red (siempre lo más nuevo), si falla, la copia guardada. Archivos con huella (/_astro/, imágenes): primero la copia guardada.
const VERSION = 'pes-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', './offline.html']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Supabase y demás: siempre directo
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(VERSION).then((k) => k.put(r, c)); return res; }).catch(() => caches.match(r).then((m) => m || caches.match('./offline.html'))));
    return;
  }
  if (/\/_astro\/|\.(png|jpe?g|webp|svg|woff2?|ico)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { const c = res.clone(); caches.open(VERSION).then((k) => k.put(r, c)); return res; })));
  }
});
