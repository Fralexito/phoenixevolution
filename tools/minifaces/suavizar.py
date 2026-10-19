# SUAVIZAR MINIFACES (ronda 340). Pedido de Fralex: las caras se veían «muy retocadas con IA» (Real-ESRGAN: ojos sobreafilados, piel de cera)
# y los contornos del pelo estaban mal recortados.
#
# Qué hace (sin red neuronal): agranda con Lanczos y un afilado leve solo en el color; y rehace el CONTORNO:
#   1. el color de los píxeles de borde (semitransparentes) se sustituye por el del interior opaco más cercano → sin halo blanco/oscuro;
#   2. la transparencia se agranda en bicúbico, se alisa (desenfoque), se afila a un borde corto y se quitan motas sueltas;
#   3. se trabaja al doble de tamaño y se reduce (supermuestreo) → borde con antialiasing, sin escalera.
# Entrada: .dds / .png de la miniface del parche (180 px de livecpk\Logos, o 128 px de dt14). Salida: .webp (320 px por defecto).
#
# Uso:  python3 tools/minifaces/suavizar.py <carpeta_entrada> <carpeta_salida> [--px 320]
# Necesita: pip install pillow numpy opencv-python-headless
import argparse, pathlib, sys
import cv2, numpy as np
from PIL import Image


def sangrar(rgb, al, umbral=0.97, vueltas=24):
    """Color de los píxeles de borde (alpha < umbral) = color del interior opaco más cercano."""
    conocido = (al >= umbral).astype(np.uint8); out = rgb.copy(); k = np.ones((3, 3), np.uint8); cur = conocido.copy()
    for _ in range(vueltas):
        crece = cv2.dilate(cur, k); nuevo = (crece > 0) & (cur == 0)
        if not nuevo.any(): break
        w = cv2.blur((out * cur[..., None]).astype(np.float32), (3, 3)); n = cv2.blur(cur.astype(np.float32), (3, 3))[..., None]
        est = w / np.maximum(n, 1e-6); out[nuevo] = est[nuevo]; cur = crece
    return np.where((conocido == 0)[..., None], out, rgb)


def suavizar(img, px=320, ss=2, afilado=0.35, borde=(0.42, 0.58), min_mota=0.02):
    """img: PIL RGBA/RGB → PIL RGBA de px × px."""
    a0 = np.asarray(img.convert('RGBA'), np.float32) / 255; rgb, al = a0[..., :3], a0[..., 3]
    rgb = sangrar(rgb, al); W = px * ss
    c = cv2.resize(rgb, (W, W), interpolation=cv2.INTER_LANCZOS4).clip(0, 1)
    a = cv2.resize(al, (W, W), interpolation=cv2.INTER_CUBIC).clip(0, 1)
    a = cv2.GaussianBlur(a, (0, 0), 1.1 * ss)
    lo, hi = borde; a = ((a - lo) / (hi - lo)).clip(0, 1); a = a * a * (3 - 2 * a)
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), connectivity=8)
    if n > 2:
        guardar = np.zeros(n, bool); guardar[1:] = st[1:, 4] >= min_mota * W * W; a = a * guardar[lab]
    if afilado: c = (c + (c - cv2.GaussianBlur(c, (0, 0), 1.3 * ss)) * afilado).clip(0, 1)
    out = cv2.resize(np.dstack([c * a[..., None], a]), (px, px), interpolation=cv2.INTER_AREA)
    al2 = out[..., 3:4]; rgb2 = np.where(al2 > 1e-4, out[..., :3] / np.maximum(al2, 1e-4), 0).clip(0, 1)
    return Image.fromarray((np.dstack([rgb2, al2]) * 255 + 0.5).astype(np.uint8), 'RGBA')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('entrada'); ap.add_argument('salida'); ap.add_argument('--px', type=int, default=320)
    a = ap.parse_args(); ent, sal = pathlib.Path(a.entrada), pathlib.Path(a.salida); sal.mkdir(parents=True, exist_ok=True)
    archivos = sorted(p for p in ent.rglob('*') if p.suffix.lower() in ('.dds', '.png', '.jpg', '.jpeg', '.webp'))
    if not archivos: sys.exit(f'No hay imágenes en {ent}')
    for i, p in enumerate(archivos, 1):
        try:
            im = Image.open(p)
            suavizar(im, a.px, afilado=0.35 if im.width >= 180 else 0.5).save(sal / (p.stem + '.webp'), 'WEBP', quality=88, method=6)   # las de 128 px (dt14) llevan algo más de afilado
        except Exception as e:  # una imagen rota no frena las demás
            print(f'  ✗ {p.name}: {e}')
        if i % 25 == 0 or i == len(archivos): print(f'{i}/{len(archivos)}')


if __name__ == '__main__':
    main()
