// BANDEJA IA · lógica pura (ronda 345). Sin DOM ni Supabase: se prueba en tests/bandejaIA.test.mjs.
// La IA deja propuestas (noticias para publicar, avisos) y un resumen diario; el staff aprueba o rechaza.

export const PRIORIDAD = Object.freeze({
  1: { etiqueta: 'Urgente', clase: 'urgente', icono: 'fa-bolt' },
  2: { etiqueta: 'Normal', clase: 'normal', icono: 'fa-circle-dot' },
  3: { etiqueta: 'Cuando puedas', clase: 'baja', icono: 'fa-mug-hot' },
});
export const TIPO = Object.freeze({
  noticia: { etiqueta: 'Noticia para publicar', icono: 'fa-newspaper' },
  aviso: { etiqueta: 'Aviso', icono: 'fa-triangle-exclamation' },
});

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Texto simple de la IA → HTML seguro: párrafos (línea en blanco), viñetas («- » o «• ») y **negrita**. Nada más. */
export function textoSeguro(texto) {
  const bloques = String(texto ?? '').replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const negrita = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return bloques.map((b) => {
    const lineas = b.split('\n').map((l) => l.trim());
    if (lineas.every((l) => /^[-•]\s+/.test(l))) return `<ul>${lineas.map((l) => `<li>${negrita(l.replace(/^[-•]\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lineas.map(negrita).join('<br>')}</p>`;
  }).join('');
}

/** Cuenta las propuestas pendientes por prioridad, para el encabezado («2 urgentes · 5 en total»). */
export function contar(propuestas) {
  const c = { total: 0, urgentes: 0, noticias: 0 };
  for (const p of propuestas ?? []) {
    if (p.estado !== 'pendiente') continue;
    c.total += 1; if (Number(p.prioridad) === 1) c.urgentes += 1; if (p.tipo === 'noticia') c.noticias += 1;
  }
  return c;
}

/** Mensaje claro para los errores de las funciones de la base. */
export function mensajeError(e) {
  const m = String(e?.message ?? e ?? '');
  if (m.includes('NO_AUTORIZADO')) return 'Solo un moderador o un admin puede usar la bandeja.';
  if (m.includes('NO_PENDIENTE')) return 'Esa propuesta ya fue revisada (quizá por otra persona).';
  if (/function .* does not exist|Could not find the function|relation .* does not exist/i.test(m)) return 'La bandeja aún no está instalada en la base (falta pegar el SQL de la migración 117).';
  return 'No se pudo completar. Inténtalo otra vez.';
}
