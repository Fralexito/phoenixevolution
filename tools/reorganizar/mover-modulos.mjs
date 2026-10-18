// Mueve módulos JS a otras carpetas y REESCRIBE todas las rutas relativas que apuntan a ellos (import, export … from, import(),
// <script>import …</script> de Astro, new URL(…, import.meta.url)) y las de los propios módulos movidos. Después arregla las menciones
// en comentarios y documentos («core/dom.js» → «core/sistema/dom.js»). Hecho para la reorganización del 18-oct-2026 y reutilizable.
//   node tools/reorganizar/mover-modulos.mjs tools/reorganizar/mapa-core.json            → simulación (no cambia nada)
//   node tools/reorganizar/mover-modulos.mjs tools/reorganizar/mapa-core.json --aplicar  → mueve con git mv y reescribe
// El mapa es { "src/js/core/dom.js": "src/js/core/sistema/dom.js", … } (rutas desde la raíz del repositorio).
// Para una rama anterior a la reorganización: --solo-rutas reescribe sus imports/menciones sin mover nada (los archivos ya se movieron al fusionar).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const [archivoMapa, ...banderas] = process.argv.slice(2);
if (!archivoMapa) { console.error('Uso: node mover-modulos.mjs <mapa.json> [--aplicar | --solo-rutas]'); process.exit(1); }
const aplicar = banderas.includes('--aplicar'), soloRutas = banderas.includes('--solo-rutas');
const mapa = JSON.parse(fs.readFileSync(archivoMapa, 'utf8'));
const norm = (p) => p.split(path.sep).join('/');
const destino = (p) => mapa[p] ?? p;

for (const [de, a] of Object.entries(mapa)) {
  if (!soloRutas && !fs.existsSync(de)) throw new Error(`No existe ${de}`);
  if (!soloRutas && fs.existsSync(a)) throw new Error(`Ya existe ${a}`);
}
const CODIGO = /\.(js|mjs|cjs|ts|tsx|jsx|astro)$/;
const SALTAR = (f) => f.startsWith('supabase/migrations/') || f === 'REGISTRO.md' || f.startsWith('tools/reorganizar/') || f.endsWith('MAPA-HISTORIAL.md') || f === 'docs/INDICE.md';
const archivos = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);

// 1) Rutas relativas dentro del código (las de quien importa y las de los módulos que se mueven).
const RE_ESPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g;
const nuevos = new Map();   // ruta vieja → contenido nuevo
let rutas = 0;
for (const f of archivos.filter((x) => CODIGO.test(x) && !SALTAR(x))) {
  const t = fs.readFileSync(f, 'utf8');
  const fNuevo = destino(f);
  const r = t.replace(RE_ESPEC, (m, pre, q, esp) => {
    const objetivo = norm(path.normalize(path.join(path.dirname(f), esp)));
    const objetivoNuevo = destino(objetivo);
    if (objetivoNuevo === objetivo && fNuevo === f) return m;
    let rel = norm(path.relative(path.dirname(fNuevo), objetivoNuevo));
    if (!rel.startsWith('.')) rel = `./${rel}`;
    if (rel === esp) return m;
    rutas++; return `${pre}${q}${rel}${q}`;
  });
  if (r !== t || fNuevo !== f) nuevos.set(f, r);
}

// 2) Menciones en comentarios y documentos: «core/dom.js» (sin carpeta) → «core/sistema/dom.js».
const menciones = Object.entries(mapa).map(([de, a]) => {
  const corto = de.replace(/^src\/js\//, ''), cortoNuevo = a.replace(/^src\/js\//, '');
  return [new RegExp(`(?<![A-Za-z0-9_.-])${corto.split('.').join('[.]')}`, 'g'), cortoNuevo];
});
let textos = 0;
for (const f of archivos.filter((x) => /\.(md|js|mjs|astro|ts|css|sql|json|txt)$/.test(x) && !SALTAR(x))) {
  const t = nuevos.get(f) ?? fs.readFileSync(f, 'utf8');
  let r = t; for (const [re, a] of menciones) r = r.replace(re, a);
  if (r !== t) { textos++; nuevos.set(f, r); }
}
console.log(`${Object.keys(mapa).length} módulos a mover · ${rutas} rutas de import a reescribir · ${textos} archivos con menciones de texto · ${nuevos.size} archivos tocados en total`);
if (!aplicar && !soloRutas) { console.log('Simulación: nada cambió. Repite con --aplicar.'); process.exit(0); }

for (const [f, t] of nuevos) fs.writeFileSync(f, t);
if (!soloRutas) {
  for (const [de, a] of Object.entries(mapa)) { fs.mkdirSync(path.dirname(a), { recursive: true }); execSync(`git mv "${de}" "${a}"`); }
}
console.log(soloRutas ? 'Rutas reescritas (sin mover archivos).' : 'Hecho: archivos movidos con git mv y rutas reescritas.');
