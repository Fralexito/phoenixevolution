// Genera src/data/plantillasPes.js: la plantilla de cada club del catálogo (src/data/clubesPes.js) según la base de datos REAL del parche.
// SOLO LECTURA sobre el parche: abre CGP_database.cpk, saca Player.bin y PlayerAssignment.bin en memoria y no escribe nada allí.
//   node tools/plantillas/generar-plantillas.mjs "D:/Frank/Games_/Conmegol Patch/ConmeGOL Extras/ConmeGOL Patch 27/download/CGP_database.cpk"
// Formato (docs/MINIFACES.md §3): Player.bin 312 B/registro (pid u32 en +8, nombre UTF-8 en +251, posición registrada = 4 bits desde el bit 434);
// PlayerAssignment.bin 16 B/fila = (id, pid, equipo, flags). Los .bin llevan cabecera WESYS de 16 B + zlib. Los .cpk: tablas @UTF cifradas con XOR.
import fs from 'node:fs';
import { abrirBase } from './lectorCpk.mjs';
import { CLUBES_PES } from '../../src/data/clubesPes.js';

const ruta = process.argv[2];
if (!ruta) { console.error('Uso: node generar-plantillas.mjs <CGP_database.cpk>'); process.exit(1); }

const base = abrirBase(ruta);
const P = base.sacar('Player.bin'), A = base.sacar('PlayerAssignment.bin');
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
