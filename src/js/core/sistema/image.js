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

/** Reduce una imagen a `maxAncho` px de ancho (sin recortar) y la comprime a JPEG por debajo de `limite` bytes → Blob. Para portadas de noticias. */
export async function redimensionarJpeg(file, maxAncho = 1200, limite = 900 * 1024) {
  if (!file?.type?.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen supera 12 MB.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxAncho / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
    if (blob && blob.size <= limite) return blob;
  }
  throw new Error('La imagen sigue pesando demasiado; prueba con una más pequeña.');
}
