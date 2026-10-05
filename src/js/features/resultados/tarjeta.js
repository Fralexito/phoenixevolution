// Dibuja la tarjeta de resultado en un <canvas> (1080×1080) y la comparte o descarga. Datos y textos: core/tarjetaResultado.js.
import { TAM } from '../../core/tarjetaResultado.js';
import { toast } from '../../core/toast.js';

function dibujar(d) {
  const c = document.createElement('canvas'); c.width = TAM.ancho; c.height = TAM.alto;
  const x = c.getContext('2d'); if (!x) throw new Error('Tu navegador no puede dibujar la tarjeta.');
  const g = x.createLinearGradient(0, 0, TAM.ancho, TAM.alto); g.addColorStop(0, '#0a0e1f'); g.addColorStop(1, '#1b1140'); x.fillStyle = g; x.fillRect(0, 0, TAM.ancho, TAM.alto);
  const r = x.createRadialGradient(540, 470, 40, 540, 470, 620); r.addColorStop(0, d.acento + '40'); r.addColorStop(1, 'transparent'); x.fillStyle = r; x.fillRect(0, 0, TAM.ancho, TAM.alto);
  x.strokeStyle = d.acento; x.lineWidth = 8; x.strokeRect(36, 36, TAM.ancho - 72, TAM.alto - 72);
  x.textAlign = 'center'; x.textBaseline = 'middle'; const fam = '"Orbitron","Rajdhani","Segoe UI",Arial,sans-serif';
  x.fillStyle = d.acento; x.font = `800 84px ${fam}`; x.fillText(d.titulo, 540, 190);
  x.fillStyle = '#ffffff'; x.font = `900 250px ${fam}`; x.shadowColor = d.acento; x.shadowBlur = 40; x.fillText(d.marcador, 540, 480); x.shadowBlur = 0;
  x.font = `700 46px ${fam}`; x.fillStyle = '#e8ecff'; x.fillText(d.izquierda.nombre, 540, 690); x.fillStyle = d.acento; x.font = `700 34px ${fam}`; x.fillText('VS', 540, 750); x.fillStyle = '#e8ecff'; x.font = `700 46px ${fam}`; x.fillText(d.derecha.nombre, 540, 810);
  x.fillStyle = '#9aa4d4'; x.font = `500 34px ${fam}`; if (d.detalle) x.fillText(d.detalle, 540, 910);
  x.fillStyle = '#ffffff'; x.font = `700 30px ${fam}`; x.fillText(d.sitio.toUpperCase(), 540, 984);
  return c;
}
const aBlob = (c) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('No se pudo crear la imagen.'))), 'image/png'));

/** Genera la imagen y la comparte (menú del sistema) o la descarga. Nunca lanza: avisa con un toast. */
export async function compartirTarjeta(d) {
  if (!d) { toast('Este partido aún no tiene un marcador confirmado.', 'error'); return; }
  try {
    try { await document.fonts?.ready; } catch { /* sin fuentes cargadas se usa la de respaldo */ }
    const blob = await aBlob(dibujar(d)), archivo = new File([blob], d.archivo, { type: 'image/png' });
    if (navigator.canShare?.({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], title: d.titulo, text: `${d.titulo} ${d.marcador} · ${d.sitio}` }); return; }
      catch (e) { if (e?.name === 'AbortError') return; /* otra causa: se descarga */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = d.archivo; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Tarjeta descargada.', 'ok');
  } catch (e) { console.error('[tarjeta] compartir:', e); toast(e?.message || 'No se pudo crear la tarjeta.', 'error'); }
}
