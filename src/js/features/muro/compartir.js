// Compartir un enlace: menú nativo del sistema si existe (celular: WhatsApp, Telegram, Instagram, X…), si no, copiar al portapapeles; último recurso: mostrarlo para copiarlo a mano.
import { toast } from '../../core/toast.js';
import { confirmar, pedirTexto } from '../../core/dialogo.js';

export async function compartir({ url, titulo = 'Phoenix Evolution Series', texto = '' }) {
  try {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: titulo, text: texto, url }); return 'nativo'; }
      catch (e) { if (e?.name === 'AbortError') return 'cancelado'; /* si falla por otra causa, se prueba copiar */ }
    }
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); toast('Enlace copiado. Pégalo donde quieras compartirlo.', 'ok', { key: 'compartir' }); return 'copiado'; }
  } catch (e) { console.warn('[compartir]', e?.message); }
  await pedirTexto('Copia este enlace para compartirlo:', { titulo: 'Compartir', valor: url, maximo: 500, obligatorio: false, aceptar: 'Listo' }); return 'manual';
}
