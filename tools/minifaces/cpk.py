# Lector mínimo de archivos .cpk (CRI) de PES 2021 — SOLO LECTURA (ronda 338).
# Sirve para listar y sacar archivos sueltos (minifaces, Player.bin) sin descomprimir el .cpk entero ni modificarlo.
#   python3 cpk.py listar <archivo.cpk> [filtro]
#   python3 cpk.py sacar  <archivo.cpk> <ruta/dentro> <salida>
import struct, sys


def _descifrar(b):
    m, t = 0x655F, 0x4115; o = bytearray(len(b))
    for i, c in enumerate(b):
        o[i] = c ^ (m & 0xFF); m = (m * t) & 0xFFFFFFFF
    return bytes(o)


def utf(b):
    """Tabla @UTF → lista de dicts."""
    if b[:4] != b'@UTF': b = _descifrar(b)
    assert b[:4] == b'@UTF', 'tabla @UTF no encontrada'
    rows_off, str_off, data_off, _name, ncol, rowlen, nrows = struct.unpack('>xxHIIIHHI', b[8:32])
    rows_off += 8; str_off += 8; data_off += 8
    def cadena(o):
        e = b.index(b'\0', str_off + o); return b[str_off + o:e].decode('utf-8', 'replace')
    def leer(tipo, p):
        if tipo in (0, 1): return struct.unpack_from('>B' if tipo == 0 else '>b', b, p)[0], 1
        if tipo in (2, 3): return struct.unpack_from('>H' if tipo == 2 else '>h', b, p)[0], 2
        if tipo in (4, 5): return struct.unpack_from('>I' if tipo == 4 else '>i', b, p)[0], 4
        if tipo in (6, 7): return struct.unpack_from('>Q' if tipo == 6 else '>q', b, p)[0], 8
        if tipo == 8: return struct.unpack_from('>f', b, p)[0], 4
        if tipo == 0xA: return cadena(struct.unpack_from('>I', b, p)[0]), 4
        if tipo == 0xB:
            o, n = struct.unpack_from('>II', b, p); return b[data_off + o:data_off + o + n], 8
        raise ValueError(f'tipo {tipo}')
    cols = []; p = 32
    for _ in range(ncol):
        fl = b[p]; nombre = cadena(struct.unpack_from('>I', b, p + 1)[0]); p += 5
        alm, tipo = fl & 0xF0, fl & 0x0F; const = None
        if alm == 0x30: const, n = leer(tipo, p); p += n
        cols.append((nombre, alm, tipo, const))
    filas = []
    for r in range(nrows):
        p = rows_off + r * rowlen; fila = {}
        for nombre, alm, tipo, const in cols:
            if alm == 0x50: fila[nombre], n = leer(tipo, p); p += n
            elif alm == 0x30: fila[nombre] = const
            else: fila[nombre] = None
        filas.append(fila)
    return filas


def _tabla(f, off):
    f.seek(off + 0x10); cab = f.read(8)
    if cab[:4] != b'@UTF': cab = _descifrar(cab)  # el tamaño está dentro de la cabecera cifrada
    tam = struct.unpack('>I', cab[4:8])[0]
    f.seek(off + 0x10); return utf(f.read(tam + 8))


def indice(ruta):
    """Lista de archivos: (dir/archivo, offset_real, tamaño_guardado, tamaño_real)."""
    with open(ruta, 'rb') as f:
        assert f.read(4) == b'CPK ', 'no es un .cpk'
        h = _tabla(f, 0)[0]
        toc, cont = h.get('TocOffset') or 0, h.get('ContentOffset') or 0
        add = cont if (cont and (not toc or cont < toc)) else toc
        out = []
        for e in _tabla(f, toc):
            nombre = f"{e.get('DirName') or ''}/{e['FileName']}".lstrip('/')
            out.append((nombre, e['FileOffset'] + add, e['FileSize'], e.get('ExtractSize') or e['FileSize']))
        return out


def _crilayla(b, tam_real):
    """Descompresión CRILAYLA (formato de CRI)."""
    assert b[:8] == b'CRILAYLA'
    usize, hoff = struct.unpack_from('<II', b, 8)
    pre = b[hoff + 16:hoff + 16 + 0x100]
    salida = bytearray(usize + 0x100); salida[:0x100] = pre
    datos = b[16:16 + hoff]
    pos = len(datos) - 1; bits_rest = 0; actual = 0
    def bits(n):
        nonlocal pos, bits_rest, actual
        r = 0
        while n:
            if bits_rest == 0:
                actual = datos[pos]; pos -= 1; bits_rest = 8
            t = min(bits_rest, n)
            r = (r << t) | ((actual >> (bits_rest - t)) & ((1 << t) - 1))
            bits_rest -= t; n -= t
        return r
    escrito = 0; fin = usize + 0x100 - 1
    while escrito < usize:
        if bits(1):
            ref = fin - escrito + bits(13) + 3; largo = 3
            niveles = [2, 3, 5, 8]; i = 0
            while True:
                v = bits(niveles[min(i, 3)]); largo += v
                if v != (1 << niveles[min(i, 3)]) - 1: break
                i += 1
            for _ in range(largo):
                salida[fin - escrito] = salida[ref]; ref -= 1; escrito += 1
        else:
            salida[fin - escrito] = bits(8); escrito += 1
    return bytes(salida)


def sacar(ruta, entrada):
    nombre, off, tam, real = entrada
    with open(ruta, 'rb') as f:
        f.seek(off); b = f.read(tam)
    return _crilayla(b, real) if b[:8] == b'CRILAYLA' else b


if __name__ == '__main__':
    acc, cpk = sys.argv[1], sys.argv[2]
    idx = indice(cpk)
    if acc == 'listar':
        filtro = sys.argv[3] if len(sys.argv) > 3 else ''
        for e in idx:
            if filtro in e[0]: print(e[0], e[2], e[3])
    elif acc == 'sacar':
        e = next(x for x in idx if x[0] == sys.argv[3])
        open(sys.argv[4], 'wb').write(sacar(cpk, e))
