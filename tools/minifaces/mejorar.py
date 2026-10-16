# MEJORAR MINIFACES (ronda 338). Pedido de Fralex: «que las minifaces del parche Conmegol salgan en las cartas de Mi club,
# pero mejoradas porque están en mala calidad».
#
# Qué hace: lee cada miniface (.dds / .png del parche), la agranda x4 con Real-ESRGAN (red neuronal que reconstruye detalle
# en vez de solo estirar) y la guarda como .webp liviana para la web. La transparencia (alpha) se agranda aparte con Lanczos.
#
# Uso:  python3 tools/minifaces/mejorar.py <carpeta_entrada> <carpeta_salida> [--pesos RealESRGAN_x4plus.pth] [--px 256]
# Pesos: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth (BSD-3, libre).
# Necesita: pip install torch pillow
import argparse, pathlib, sys, time
import torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image
import numpy as np


# --- Arquitectura RRDBNet (la de Real-ESRGAN x4plus), copiada en forma mínima para no depender de basicsr ---
class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1); self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1); self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1); self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x)); x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1))); x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        return self.conv5(torch.cat((x, x1, x2, x3, x4), 1)) * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__(); self.rdb1 = RDB(nf, gc); self.rdb2 = RDB(nf, gc); self.rdb3 = RDB(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1); self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1); self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        feat = self.conv_first(x); feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def cargar(pesos):
    m = RRDBNet(); d = torch.load(pesos, map_location='cpu', weights_only=True)
    m.load_state_dict(d.get('params_ema', d.get('params', d)), strict=True)
    return m.eval()


@torch.no_grad()
def agrandar(modelo, img):
    """img: PIL RGBA o RGB → PIL RGBA x4 (el color con la red, la transparencia con Lanczos)."""
    rgba = img.convert('RGBA'); w, h = rgba.size
    rgb = np.asarray(rgba.convert('RGB'), dtype=np.float32) / 255.0
    t = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0)
    # relleno espejo para que los bordes no salgan raros
    t = F.pad(t, (8, 8, 8, 8), mode='reflect')
    out = modelo(t).clamp_(0, 1)[:, :, 32:32 + h * 4, 32:32 + w * 4]
    arr = (out.squeeze(0).permute(1, 2, 0).numpy() * 255.0).round().astype(np.uint8)
    res = Image.fromarray(arr, 'RGB').convert('RGBA')
    res.putalpha(rgba.getchannel('A').resize((w * 4, h * 4), Image.LANCZOS))
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada'); ap.add_argument('salida')
    ap.add_argument('--pesos', default='RealESRGAN_x4plus.pth'); ap.add_argument('--px', type=int, default=256)
    a = ap.parse_args()
    ent, sal = pathlib.Path(a.entrada), pathlib.Path(a.salida); sal.mkdir(parents=True, exist_ok=True)
    archivos = sorted([p for p in ent.rglob('*') if p.suffix.lower() in ('.dds', '.png', '.jpg', '.jpeg', '.webp')])
    if not archivos: sys.exit(f'No hay imágenes en {ent}')
    modelo = cargar(a.pesos); t0 = time.time()
    for i, p in enumerate(archivos, 1):
        destino = sal / (p.stem + '.webp')
        if destino.exists(): continue
        try:
            big = agrandar(modelo, Image.open(p))
            big.resize((a.px, round(a.px * big.height / big.width)), Image.LANCZOS).save(destino, 'WEBP', quality=86, method=6)
        except Exception as e:  # una imagen rota no frena las demás
            print(f'  ✗ {p.name}: {e}')
        if i % 10 == 0 or i == len(archivos): print(f'{i}/{len(archivos)}  ({time.time() - t0:.0f} s)')


if __name__ == '__main__':
    main()
