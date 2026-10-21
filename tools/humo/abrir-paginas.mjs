// PRUEBA DE HUMO: abre TODAS las páginas de la web compilada (dist/) en un navegador de verdad y falla si alguna da un error de JavaScript,
// no encuentra un módulo o se queda en blanco. Las pruebas de tests/ revisan la lógica; esta revisa que cada página ARRANQUE (19-oct-2026).
//   npm run build && npm run test:paginas
// Navegador: CHROME_PATH (si no, busca Chrome/Edge en los sitios de siempre; en GitHub Actions, google-chrome ya viene instalado).
// No inicia sesión ni toca la base: las páginas que piden sesión deben mostrar su aviso, no romperse.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const raiz = path.resolve('dist');
const BASE = (process.env.PES_BASE || '/phoenixevolution').replace(/\/$/, '');
if (!fs.existsSync(path.join(raiz, 'index.html'))) { console.error('No hay dist/: ejecuta antes «npm run build».'); process.exit(1); }

const CANDIDATOS = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const navegador = CANDIDATOS.find((x) => x && fs.existsSync(x));
if (!navegador) { console.error('No encontré Chrome ni Edge. Pon su ruta en CHROME_PATH.'); process.exit(1); }

// Páginas: cada index.html de dist (menos los de _astro).
const paginas = [];
const recorrer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && e.name !== '_astro') recorrer(p); else if (e.name === 'index.html') paginas.push(path.relative(raiz, path.dirname(p)).split(path.sep).join('/')); } };
recorrer(raiz);
paginas.sort();
const solo = process.env.SOLO ? process.env.SOLO.split(',').map((x) => x.replace(/^\/+|\/+$/g, '')) : null;   // SOLO=noticias,tienda → solo esas («» = inicio)
if (solo) paginas.splice(0, paginas.length, ...paginas.filter((x) => solo.includes(x)));

// Servidor estático mínimo con la misma base que GitHub Pages.
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const servidor = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith(BASE)) { r.writeHead(404); r.end(); return; }
  u = u.slice(BASE.length) || '/';
  let f = path.join(raiz, u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith(raiz)) { r.writeHead(403); r.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const origen = `http://127.0.0.1:${servidor.address().port}`;

// Qué cuenta como fallo: errores de JS sin capturar y módulos/archivos propios que no cargan. Los fallos de red de servicios de fuera
// (Supabase sin sesión, imágenes externas) NO cuentan: esta prueba mira que la web arranque, no los datos.
const esPropio = (url) => url.startsWith(origen);
const b = await puppeteer.launch({ executablePath: navegador, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const fallos = [];
for (const ruta of paginas) {
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 });
  const errores = [];
  p.on('pageerror', (e) => errores.push(`error JS: ${String(e.message).split('\n')[0]}`));
  // net::ERR_ABORTED = el navegador canceló la descarga porque la página se fue (redirecciones de /mi-club/ y /comunidad/): no es un fallo
  p.on('requestfailed', (q) => { if (esPropio(q.url()) && q.failure()?.errorText !== 'net::ERR_ABORTED') errores.push(`no cargó: ${q.url().slice(origen.length)}`); });
  p.on('response', (r) => { if (esPropio(r.url()) && r.status() >= 400 && !/favicon|\.map$/.test(r.url())) errores.push(`${r.status()}: ${r.url().slice(origen.length)}`); });
  p.on('console', (m) => { if (m.type() === 'error' && /Failed to fetch dynamically imported module|Importing a module script failed|is not defined|Cannot read properties of (undefined|null)/.test(m.text())) errores.push(`consola: ${m.text().split('\n')[0].slice(0, 160)}`); });
  try {
    await p.goto(`${origen}${BASE}/${ruta ? `${ruta}/` : ''}`, { waitUntil: 'load', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));   // deja correr lo que arranca después de cargar (boot.js: requestIdleCallback)
    const texto = await p.evaluate(() => (document.querySelector('main')?.innerText ?? '').trim().length);
    if (texto < 20) errores.push('la página quedó en blanco (main sin texto)');
  } catch (e) { errores.push(`no abrió: ${e.message}`); }
  await p.close();
  const unicos = [...new Set(errores)];
  console.log(`${unicos.length ? '✗' : '✓'} /${ruta}${unicos.length ? `\n    ${unicos.slice(0, 6).join('\n    ')}` : ''}`);
  if (unicos.length) fallos.push(ruta);
}
await b.close(); servidor.close();
console.log(`\n${paginas.length - fallos.length}/${paginas.length} páginas arrancan bien.`);
if (fallos.length) { console.error(`Fallan: ${fallos.map((x) => `/${x}`).join(', ')}`); process.exit(1); }
