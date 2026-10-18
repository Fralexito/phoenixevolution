// Genera src/data/fichasJuego.js: las estadísticas y datos DEL JUEGO (Player.bin del parche) de los jugadores de la Liga Máster de la web.
// SOLO LECTURA sobre el parche. Los ids salen de la base de la web: «select string_agg(pes_id::text, ',') from lm_jugadores where pes_id is not null»
// (hay una copia en tools/plantillas/ids-liga-master.txt; si el staff importa jugadores nuevos, vuelve a sacar la lista y ejecuta esto).
//   node tools/plantillas/generar-fichas.mjs "D:/Frank/Games_/Conmegol Patch/download/CGP_database.cpk" tools/plantillas/ids-liga-master.txt
// Cada jugador queda como texto hexadecimal: por cada campo de BITS_PLAYER (en el orden de CAMPOS) 2 cifras con el valor crudo, y al final 13 cifras con los
// 52 bits de habilidades (480–531). core/fichaJuego.js lo decodifica. Formato del registro: docs/web-pes-link/MINIFACES.md §3 y base-conocimiento/16-PLAYER-BIN-FICHA-COMPLETA.md.
import fs from 'node:fs';
import { abrirBase } from './lectorCpk.mjs';
import { CAMPOS, BITS_PLAYER, BITS_HABILIDADES } from '../../src/js/core/fichasCampos.js';

const [ruta, archivoIds] = process.argv.slice(2);
if (!ruta || !archivoIds) { console.error('Uso: node generar-fichas.mjs <CGP_database.cpk> <ids.txt>'); process.exit(1); }
const ids = new Set(fs.readFileSync(archivoIds, 'utf8').split(/[,\s]+/).filter(Boolean).map(Number));
const P = abrirBase(ruta).sacar('Player.bin');
const bits = (rec, bit, w) => { let v = 0; for (let i = 0; i < w; i++) { const k = bit + i; v |= ((rec[k >> 3] >> (k & 7)) & 1) << i; } return v; };
const hex2 = (n) => n.toString(16).padStart(2, '0');
const salida = {};
for (let o = 0; o + 312 <= P.length; o += 312) {
  const pid = P.readUInt32LE(o + 8);
  if (!ids.has(pid) || salida[pid]) continue;   // si un id sale repetido, vale el primero (como hace el juego)
  const rec = P.subarray(o, o + 312);
  let texto = CAMPOS.map((c) => hex2(bits(rec, BITS_PLAYER[c.clave][0], BITS_PLAYER[c.clave][1]))).join('');
  let h = 0n; for (let i = 0; i < BITS_HABILIDADES.cuantos; i++) h |= BigInt(bits(rec, BITS_HABILIDADES.desde + i, 1)) << BigInt(i);
  texto += h.toString(16).padStart(13, '0');
  salida[pid] = texto;
}
const faltan = [...ids].filter((id) => !salida[id]);
fs.writeFileSync(new URL('../../src/data/fichasJuego.js', import.meta.url), `// Datos del juego (Player.bin del parche) de ${Object.keys(salida).length} jugadores de la Liga Máster, generados con tools/plantillas/generar-fichas.mjs. Decodifica core/fichaJuego.js.
export const FICHAS_JUEGO = ${JSON.stringify(salida)};
`);
console.log(`Jugadores: ${Object.keys(salida).length}/${ids.size}${faltan.length ? ` · sin ficha en el juego: ${faltan.join(', ')}` : ''}`);
