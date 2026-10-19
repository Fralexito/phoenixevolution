// Recorta las fuentes de iconos a SOLO los iconos que usa la web (antes cada visita bajaba Font Awesome sólido entero, 117 KB,
// y Phosphor Bold entero, 147 KB, para usar unos 300 iconos de 3.500).
//   node tools/iconos/recortar-iconos.mjs
// Vuelve a ejecutarlo (y sube lo que genera) si añades un icono nuevo («fa-…» o un valor nuevo en src/data/iconosFinos.js).
// Si un icono sale en blanco, casi seguro es que se añadió sin volver a ejecutar esto.
// Genera en src/styles/iconos/: fa-solid.css + fa-solid-900.recortado.woff2 y phosphor-bold.css + phosphor-bold.recortado.woff2.
// Iconos que vienen de la base de datos (no aparecen en el código): tools/iconos/extra.txt (uno por línea, p. ej. «fa-trophy»).
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const raiz = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const salida = path.join(raiz, 'src/styles/iconos');
fs.mkdirSync(salida, { recursive: true });
const BARRA = String.fromCharCode(92);
/** Código de un «content» de CSS: "\f091" → 0xF091; "\!" (carácter escapado) → el propio carácter. */
const punto = (v) => { if (!v.startsWith(BARRA)) return v.codePointAt(0); const r = v.slice(1).trim(); return /^[0-9a-f]+$/i.test(r) ? parseInt(r, 16) : r.codePointAt(0); };

// 1) Qué nombres aparecen en el código (y en extra.txt).
const recorrer = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p, out); else if (/\.(js|mjs|jsx|ts|astro|css|html|json)$/.test(e.name)) out.push(p); } return out; };
const codigo = recorrer(path.join(raiz, 'src')).filter((f) => !f.includes(`${path.sep}iconos${path.sep}`)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const extra = fs.existsSync(path.join(raiz, 'tools/iconos/extra.txt')) ? fs.readFileSync(path.join(raiz, 'tools/iconos/extra.txt'), 'utf8') : '';
const texto = `${codigo}\n${extra}`;

// 2) Font Awesome sólido: nombre → código (de fontawesome.css) y recorte de fa-solid-900.woff2.
const faDir = path.join(raiz, 'node_modules/@fortawesome/fontawesome-free');
const faCss = fs.readFileSync(path.join(faDir, 'css/fontawesome.css'), 'utf8');
const faCodigo = new Map();
for (const m of faCss.matchAll(/((?:\.fa-[a-z0-9-]+,?\s*)+)\{\s*--fa:\s*"([^"]+)"/g)) {
  const cp = punto(m[2]);
  for (const n of m[1].matchAll(/\.fa-([a-z0-9-]+)/g)) faCodigo.set(n[1], cp);
}
const faUsados = [...new Set([...texto.matchAll(/fa-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1]))].filter((n) => faCodigo.has(n));
const faTexto = [...new Set(faUsados.map((n) => faCodigo.get(n)))].map((cp) => String.fromCodePoint(cp)).join('');
const faFuente = fs.readFileSync(path.join(faDir, 'webfonts/fa-solid-900.woff2'));
const faRecorte = await subsetFont(faFuente, faTexto, { targetFormat: 'woff2' });
fs.writeFileSync(path.join(salida, 'fa-solid-900.recortado.woff2'), faRecorte);
const solid = fs.readFileSync(path.join(faDir, 'css/solid.min.css'), 'utf8').replace('url(../webfonts/fa-solid-900.woff2)', 'url(./fa-solid-900.recortado.woff2)');
if (!solid.includes('fa-solid-900.recortado.woff2')) throw new Error('No encontré la @font-face de solid.min.css: ¿cambió Font Awesome?');
fs.writeFileSync(path.join(salida, 'fa-solid.css'), `/* GENERADO por tools/iconos/recortar-iconos.mjs — no editar a mano. Font Awesome ${JSON.parse(fs.readFileSync(path.join(faDir, 'package.json'), 'utf8')).version} sólido, recortado a ${faUsados.length} iconos. */\n${solid}\n`);

// 2b) Nombres de Font Awesome: fontawesome.css trae ~2.000 reglas «.fa-x { --fa: código }» (unos 70 KB en CADA página); se dejan solo las usadas.
//     (19-oct-2026, rendimiento.) Si un icono sale en blanco tras añadirlo, vuelve a ejecutar esto; los que vienen de la base van en extra.txt.
const faUsadosSet = new Set(faUsados);
const faNombres = faCss.replace(/((?:\.fa-[a-z0-9-]+,?\s*)+)\{\s*--fa:\s*"[^"]+";?\s*\}\s*/g, (bloque, sels) => ([...sels.matchAll(/\.fa-([a-z0-9-]+)/g)].some((n) => faUsadosSet.has(n[1])) ? bloque : ''));
if (faNombres.length > faCss.length * 0.6) throw new Error('El recorte de fontawesome.css no quitó casi nada: ¿cambió su formato?');
fs.writeFileSync(path.join(salida, 'fontawesome.recortado.css'), `/* GENERADO por tools/iconos/recortar-iconos.mjs — no editar a mano. Reglas base de Font Awesome + solo los ${faUsados.length} nombres que usa la web. */\n${faNombres}`);

// 3) Phosphor Bold: los del mapa de iconosFinos.js + los «ph-…» del código; CSS solo con esos iconos.
const phDir = path.join(raiz, 'node_modules/@phosphor-icons/web/src/bold');
const phCss = fs.readFileSync(path.join(phDir, 'style.css'), 'utf8');
const phCodigo = new Map();
for (const m of phCss.matchAll(/\.ph-bold\.ph-([a-z0-9-]+):before\s*\{\s*content:\s*"([^"]+)"/g)) phCodigo.set(m[1], punto(m[2]));
const mapa = fs.readFileSync(path.join(raiz, 'src/data/iconosFinos.js'), 'utf8');
const phUsados = [...new Set([...[...mapa.matchAll(/:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]), ...[...texto.matchAll(/ph-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1])])].filter((n) => phCodigo.has(n)).sort();
const phTexto = phUsados.map((n) => String.fromCodePoint(phCodigo.get(n))).join('');
const phRecorte = await subsetFont(fs.readFileSync(path.join(phDir, 'Phosphor-Bold.woff2')), phTexto, { targetFormat: 'woff2' });
fs.writeFileSync(path.join(salida, 'phosphor-bold.recortado.woff2'), phRecorte);
const base = phCss.slice(phCss.indexOf('.ph-bold {'), phCss.indexOf('.ph-bold.ph-'));
const hex = (cp) => BARRA + cp.toString(16);
fs.writeFileSync(path.join(salida, 'phosphor-bold.css'), `/* GENERADO por tools/iconos/recortar-iconos.mjs — no editar a mano. Phosphor Bold recortado a ${phUsados.length} iconos. */
@font-face { font-family: "Phosphor-Bold"; src: url("./phosphor-bold.recortado.woff2") format("woff2"); font-weight: normal; font-style: normal; font-display: block; }
${base}
${phUsados.map((n) => `.ph-bold.ph-${n}:before { content: "${hex(phCodigo.get(n))}"; }`).join('\n')}
`);

const kb = (b) => `${Math.round(b.length / 1024)} KB`;
console.log(`Font Awesome sólido: ${faUsados.length} iconos · ${kb(faFuente)} → ${kb(faRecorte)}`);
console.log(`Phosphor Bold: ${phUsados.length} iconos · ${kb(fs.readFileSync(path.join(phDir, 'Phosphor-Bold.woff2')))} → ${kb(phRecorte)}`);
