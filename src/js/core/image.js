// Recorta al centro (cuadrado) y comprime una imagen en el navegador → Blob JPEG.
export async function cropSquareJpeg(file, size = 256, quality = 0.8) {
  if (!file?.type?.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera 8 MB.');
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}
