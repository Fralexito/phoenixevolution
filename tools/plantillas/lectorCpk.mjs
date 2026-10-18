// Lector SOLO LECTURA de un .cpk de PES 2021 (tablas @UTF cifradas con XOR + archivos .bin con cabecera WESYS y zlib). Lo usan los generadores de src/data.
import fs from 'node:fs';
import zlib from 'node:zlib';

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
/** Abre el .cpk y devuelve { sacar(nombreDelBin) → Buffer descomprimido }. No escribe nada. */
export function abrirBase(ruta) {
  const fd = fs.openSync(ruta, 'r');
  const cab = tabla(fd, 0)[0]; const toc = Number(cab.TocOffset), cont = Number(cab.ContentOffset);
  const base = Math.min(toc, cont || toc);
  const archivos = tabla(fd, toc).map((r) => ({ nombre: r.FileName, size: r.FileSize, off: base + Number(r.FileOffset) }));
  return {
    sacar(nombre) {
      const f = archivos.find((x) => x.nombre === nombre); if (!f) throw new Error('falta ' + nombre + ' en el .cpk');
      const b = Buffer.alloc(f.size); fs.readSync(fd, b, 0, f.size, f.off);
      if (b[0] !== 0xff || b.toString('latin1', 3, 8) !== 'WESYS') throw new Error(nombre + ': sin cabecera WESYS');
      return zlib.inflateSync(b.subarray(16));
    },
  };
}
