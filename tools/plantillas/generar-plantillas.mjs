// Genera src/data/plantillasPes.js: la plantilla de cada club del catálogo (src/data/clubesPes.js) según la base de datos REAL del parche.
// SOLO LECTURA sobre el parche: abre CGP_database.cpk, saca Player.bin y PlayerAssignment.bin en memoria y no escribe nada allí.
//   node tools/plantillas/generar-plantillas.mjs "D:/Frank/Games_/Conmegol Patch/ConmeGOL Extras/ConmeGOL Patch 27/download/CGP_database.cpk"
// Formato (docs/MINIFACES.md §3): Player.bin 312 B/registro (pid u32 en +8, nombre UTF-8 en +251, posición registrada = 4 bits desde el bit 434);
// PlayerAssignment.bin 16 B/fila = (id, pid, equipo, flags). Los .bin llevan cabecera WESYS de 16 B + zlib. Los .cpk: tablas @UTF cifradas con XOR.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { CLUBES_PES } from '../../src/data/clubesPes.js';

const ruta = process.argv[2];
if (!ruta) { console.error('Uso: node generar-plantillas.mjs <CGP_database.cpk>'); process.exit(1); }

const descifrar = (b) => { const o = Buffer.from(b); let m = 0x655f; for (let i = 0; i < o.length; i++) { o[i] ^= m & 0xff; m = Math.imul(m, 0x4115) >>> 0; } return o; };
function leerCelda(b, p, ty, base, so) {
  switch (ty) {
    case 0: return [b[p], p + 1]; case 1: return [b.readInt8(p), p + 1]; case 2: return [b.readUInt16BE(p), p + 2]; case 3: return [b.readInt16BE(p), p + 2];
    case 4: return [b.readUInt32BE(p), p + 4]; case 5: return [b.readInt32BE(p), p + 4]; case 6: return [Number(b.readBigUInt64BE(p)), p + 8]; case 7: return [Number(b.readBigInt64BE(p)), p + 8];
    case 8: return [b.readFloatBE(p), p + 4]; case 0xa: { const s = base + so + b.readUInt32BE(p); return [b.toString('utf8', s, b.indexOf(0, s)), p + 4]; }
    case 0xb: return [null, p + 8];
    default: throw new Error(`tipo @UTF ${ty}`);
  }
}
function utf(b) {
  const base = 8, rowsOff = b.readUInt16BE(10), so = b.readUInt32BE(12), nC = b.readUInt16BE(24), rl = b.readUInt16BE(26), nR = b.readUInt32BE(28);
  const cad = (x) => { const s = base + so + x; return b.toString('utf8', s, b.indexOf(0, s)); };
  let p = 32; const cols = [];
  for (let i = 0; i < nC; i++) { const f = b[p++]; const nm = cad(b.readUInt32BE(p)); p += 4; const st = f >> 4, ty = f & 15; let cv; if (st === 3) [cv, p] = leerCelda(b, p, ty, base, so); cols.push({ nm, st, ty, cv }); }
  const filas = [];
  for (let r = 0; r < nR; r++) { let q = base + rowsOff + r * rl; const fila = {}; for (const c of cols) { if (c.st === 5) { let v; [v, q] = leerCelda(b, q, c.ty, base, so); fila[c.nm] = v; } else fila[c.nm] = c.st === 3 ? c.cv : null; } filas.push(fila); }
  return filas;
}
function tabla(fd, off) {
  let h = Buffer.alloc(8); fs.readSync(fd, h, 0, 8, off + 16);
  const cifrada = h.toString('latin1', 0, 4) !== '@UTF'; if (cifrada) h = descifrar(h);
  const tam = h.readUInt32BE(4); let b = Buffer.alloc(tam + 8); fs.readSync(fd, b, 0, tam + 8, off + 16);
  return utf(cifrada ? descifrar(b) : b);
}
const fd = fs.openSync(ruta, 'r');
const cab = tabla(fd, 0)[0]; const toc = Number(cab.TocOffset), cont = Number(cab.ContentOffset);
const base = Math.min(toc, cont || toc);
const archivos = tabla(fd, toc).map((r) => ({ nombre: r.FileName, size: r.FileSize, off: base + Number(r.FileOffset) }));
const sacar = (nombre) => {
  const f = archivos.find((a) => a.nombre === nombre); if (!f) throw new Error(`falta ${nombre} en el .cpk`);
  const b = Buffer.alloc(f.size); fs.readSync(fd, b, 0, f.size, f.off);
  if (b[0] !== 0xff || b.toString('latin1', 3, 8) !== 'WESYS') throw new Error(`${nombre}: sin cabecera WESYS`);
  return zlib.inflateSync(b.subarray(16));
};
const P = sacar('Player.bin'), A = sacar('PlayerAssignment.bin');
const POS = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MI', 'MD', 'MO', 'EI', 'ED', 'SD', 'DC'];
const bits = (rec, bit, w) => { let v = 0; for (let i = 0; i < w; i++) { const k = bit + i; v |= ((rec[k >> 3] >> (k & 7)) & 1) << i; } return v; };
const jugadores = new Map();
for (let o = 0; o + 312 <= P.length; o += 312) {
  const pid = P.readUInt32LE(o + 8), nb = P.subarray(o + 251, o + 311), fin = nb.indexOf(0);
  jugadores.set(pid, { nombre: nb.subarray(0, fin < 0 ? 60 : fin).toString('utf8'), pos: POS[bits(P.subarray(o, o + 312), 434, 4)] ?? '?' });
}
const ids = new Set(CLUBES_PES.map((c) => c.id));
const plantillas = {};
for (let o = 0; o + 16 <= A.length; o += 16) {
  const pid = A.readUInt32LE(o + 4), equipo = A.readUInt32LE(o + 8);
  if (!ids.has(equipo)) continue;
  const j = jugadores.get(pid); if (!j || !j.nombre) continue;
  (plantillas[equipo] ??= []).push([pid, j.nombre, j.pos]);
}
const orden = Object.fromEntries(POS.map((p, i) => [p, i]));
for (const l of Object.values(plantillas)) { l.sort((a, b) => (orden[a[2]] ?? 99) - (orden[b[2]] ?? 99) || a[1].localeCompare(b[1], 'es')); }
const total = Object.values(plantillas).reduce((n, l) => n + l.length, 0);
const salida = `// Plantillas de los ${Object.keys(plantillas).length} clubes del catálogo (${total} jugadores), sacadas de la base REAL del parche con tools/plantillas/generar-plantillas.mjs.
// { <id PES del club>: [[id PES del jugador, nombre, posición registrada], …] }. Se carga solo al abrir la sala de fichajes (import dinámico).
export const PLANTILLAS = ${JSON.stringify(plantillas)};
`;
fs.writeFileSync(new URL('../../src/data/plantillasPes.js', import.meta.url), salida);
console.log(`Clubes: ${Object.keys(plantillas).length} · jugadores: ${total} · archivo: ${(salida.length / 1024).toFixed(0)} KB`);
