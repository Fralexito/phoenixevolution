// Lector MÍNIMO de archivos ZIP en el navegador (19-oct-2026): sirve para los paquetes de stickers «.wastickers» que exportan las apps de stickers
// para WhatsApp (Sticker.ly, Sticker Maker, Personal Stickers…), que son un ZIP con los .webp dentro. Sin librerías: usa DecompressionStream
// ('deflate-raw'), que traen Chrome 103+, Edge, Safari 16.4+ y Firefox 113+. Solo lectura; admite «guardado» (0) y «deflate» (8), que es lo que usan esas apps.
const FIRMA_FIN = 0x06054b50; const FIRMA_CENTRAL = 0x02014b50; const FIRMA_LOCAL = 0x04034b50;
const MAX_ENTRADAS = 300; const MAX_TOTAL = 60 * 1024 * 1024;

/** ¿Este navegador puede descomprimir? (si no, se avisa en vez de fallar a medias) */
export const puedeLeerZip = () => typeof DecompressionStream === 'function';

/** Archivo ZIP (Blob/File) → [{ nombre, blob }] con los archivos (no las carpetas). Lanza Error con un mensaje en español si no es un ZIP válido. */
export async function leerZip(archivo) {
  if (!puedeLeerZip()) throw new Error('Este navegador no puede abrir paquetes de stickers. Actualízalo o sube los stickers uno por uno.');
  const buf = new Uint8Array(await archivo.arrayBuffer()); const v = new DataView(buf.buffer);
  // Fin del directorio central: está en los últimos 64 KB (puede haber un comentario al final)
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) { if (v.getUint32(i, true) === FIRMA_FIN) { fin = i; break; } }
  if (fin < 0) throw new Error('Ese archivo no es un paquete de stickers válido.');
  const cuantos = Math.min(v.getUint16(fin + 10, true), MAX_ENTRADAS); let p = v.getUint32(fin + 16, true);
  const salida = []; let total = 0;
  for (let k = 0; k < cuantos; k += 1) {
    if (p + 46 > buf.length || v.getUint32(p, true) !== FIRMA_CENTRAL) break;
    const metodo = v.getUint16(p + 10, true); const comprimido = v.getUint32(p + 20, true); const tam = v.getUint32(p + 24, true);
    const n = v.getUint16(p + 28, true); const extra = v.getUint16(p + 30, true); const coment = v.getUint16(p + 32, true); const local = v.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + n));
    p += 46 + n + extra + coment;
    if (nombre.endsWith('/') || (metodo !== 0 && metodo !== 8)) continue;
    total += tam; if (total > MAX_TOTAL) throw new Error('El paquete es demasiado grande.');
    if (local + 30 > buf.length || v.getUint32(local, true) !== FIRMA_LOCAL) continue;
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const datos = new Blob([buf.subarray(inicio, inicio + comprimido)]);
    const blob = metodo === 0 ? datos : await new Response(datos.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    salida.push({ nombre: nombre.split('/').pop(), blob });
  }
  return salida;
}
