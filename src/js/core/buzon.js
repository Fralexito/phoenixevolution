// «Buzón del juego» (puro, sin DOM → con test). Avisos web → PES 2021 vía Phoenix Link. BD: migración 096; API: docs/contrato-v1.md §25.
export const MAX_TEXTO = 600;
export const MAX_LINEAS = 8;
export const TIPOS = Object.freeze(['aviso', 'partido', 'liga', 'sistema']);
export const ICONO_TIPO = Object.freeze({ aviso: 'fa-bell', partido: 'fa-futbol', liga: 'fa-trophy', sistema: 'fa-gear' });

/** Texto del formulario → { ok, texto } o { ok:false, motivo }. Quita caracteres de control (salvo salto de línea) y espacios sobrantes. */
export function validarTexto(crudo) {
  const t = String(crudo ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
  if (!t) return { ok: false, motivo: 'Escribe algo antes de enviar.' };
  if (t.length > MAX_TEXTO) return { ok: false, motivo: `Máximo ${MAX_TEXTO} caracteres.` };
  if (t.split('\n').length > MAX_LINEAS) return { ok: false, motivo: `Máximo ${MAX_LINEAS} líneas.` };
  return { ok: true, texto: t };
}

/** Estado visible de un aviso: 'entregado' | 'expirado' | 'esperando'. */
export function estadoAviso(a, ahora = Date.now()) {
  if (a?.entregado_en) return 'entregado';
  if (a?.expira_en && Date.parse(a.expira_en) <= ahora) return 'expirado';
  return 'esperando';
}

export function etiquetaEstado(a, ahora = Date.now()) {
  const e = estadoAviso(a, ahora);
  if (e === 'entregado') {
    const d = new Date(a.entregado_en); const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0');
    return { clave: e, icono: '✅', texto: `entregado al juego ${hh}:${mm}` };
  }
  if (e === 'expirado') return { clave: e, icono: '⌛', texto: 'expirado' };
  return { clave: e, icono: '⏳', texto: 'esperando que el juego esté abierto' };
}

/** Traduce los errores del servidor a un mensaje claro. */
export function mensajeError(err) {
  const m = String(err?.message ?? '');
  if (/DEMASIADOS_AVISOS/.test(m)) return 'Llegaste al máximo de 20 avisos por hora. Espera un rato.';
  if (/DISPOSITIVO_NO_ENCONTRADO/.test(m)) return 'Esa PC ya no está vinculada. Elige otra.';
  if (/AVISO_INVALIDO/.test(m)) return 'El aviso no es válido (revisa el texto).';
  if (/NO_AUTORIZADO/.test(m)) return 'No tienes permiso para esto.';
  return 'No se pudo enviar el aviso.';
}
