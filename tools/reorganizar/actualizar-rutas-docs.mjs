// Reescribe en TU rama las referencias a los documentos que se movieron el 18-oct-2026 (docs/NOMBRE.md → docs/<carpeta>/NOMBRE.md).
// Úsalo si tu rama (creada antes de esa fecha) nombra documentos con la ruta vieja:   node tools/reorganizar/actualizar-rutas-docs.mjs
// Solo cambia texto dentro de archivos de tu rama (md, js, mjs, astro, ts, json, txt, css, sql); no mueve nada. Salta supabase/migrations, REGISTRO.md y docs/INDICE.md.
// El mapa viejo→nuevo está en mapa-docs.json y, en lectura humana, en docs/INDICE.md.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const mapa = JSON.parse(fs.readFileSync(new URL('./mapa-docs.json', import.meta.url), 'utf8'));
const nombres = Object.keys(mapa).sort((a, b) => b.length - a.length);
const esc = (s) => s.split('.').join('[.]');
const reA = new RegExp('docs/(' + nombres.map(esc).join('|') + ')', 'g');
const reB = new RegExp('(?<![A-Za-z0-9_/.-])(' + nombres.map(esc).join('|') + ')', 'g');
const archivos = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
  .filter((f) => /\.(md|js|mjs|astro|json|cjs|ts|txt|sql|css)$/.test(f) && !f.startsWith('supabase/migrations/') && f !== 'REGISTRO.md' && !f.startsWith('tools/reorganizar/') && f !== 'docs/INDICE.md');
let n = 0;
for (const f of archivos) {
  const a = fs.readFileSync(f, 'utf8');
  const b = a.replace(reA, (_, x) => `docs/${mapa[x]}/${x}`).replace(reB, (_, x) => `docs/${mapa[x]}/${x}`);
  if (b !== a) { fs.writeFileSync(f, b); n++; }
}
console.log(`Referencias actualizadas en ${n} archivo(s).`);
