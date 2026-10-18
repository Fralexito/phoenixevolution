// Chat privado (puro, sin DOM → probable): validación, orden, vista previa y agrupación de mensajes.
export const MAX_TEXTO = 1000;

/** Texto del mensaje → {ok, texto, error}. Recorta espacios; rechaza vacío o > 1000. */
export function validarTexto(t) {
  const texto = String(t ?? '').replace(/\r\n/g, '\n').trim();
  if (!texto) return { ok: false, texto: '', error: 'Escribe algo antes de enviar.' };
  if (texto.length > MAX_TEXTO) return { ok: false, texto, error: `Máximo ${MAX_TEXTO} caracteres (llevas ${texto.length}).` };
  return { ok: true, texto, error: '' };
}

const ts = (x) => { const n = new Date(x ?? '').getTime(); return Number.isNaN(n) ? 0 : n; };

/** Respuesta de `mis_conversaciones()` → lista limpia, más reciente primero. Nunca lanza. */
export function normalizarConversaciones(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c.id === 'string' && (c.tipo === 'DIRECTO' || c.tipo === 'GRUPO'))
    .map((c) => ({ id: c.id, tipo: c.tipo, nombre: c.nombre ?? null, otro_id: c.otro_id ?? null, miembros: Number(c.miembros) || 0, es_admin: !!c.es_admin,
      silenciado: !!c.silenciado, ultimo_at: c.ultimo_at ?? null, ultimo: c.ultimo ?? null, no_leidos: Math.max(0, Number(c.no_leidos) || 0) }))
    .sort((a, b) => ts(b.ultimo_at) - ts(a.ultimo_at));
}

/** Total de no leídos (las conversaciones silenciadas no cuentan). */
export const totalNoLeidos = (lista) => lista.filter((c) => !c.silenciado).reduce((s, c) => s + c.no_leidos, 0);

/** Título de la conversación: nombre del grupo o nombre del otro jugador. */
export const tituloConv = (c, nombreDe) => (c.tipo === 'GRUPO' ? c.nombre || 'Grupo' : nombreDe(c.otro_id));

/** Línea de vista previa: «Tú: hola», «Axel: hola» (en grupos), o «Mensaje eliminado». */
export function vistaPrevia(c, yo, nombreDe) {
  const u = c.ultimo; if (!u) return 'Sin mensajes todavía';
  if (u.texto == null) return 'Mensaje eliminado';
  const quien = u.autor === yo ? 'Tú: ' : c.tipo === 'GRUPO' ? `${nombreDe(u.autor)}: ` : '';
  return quien + u.texto;
}

const diaClave = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/**
 * Mensajes (en cualquier orden) → [{dia, items:[{autor, mios, mensajes:[…]}]}] cronológico.
 * Los mensajes seguidos del mismo autor (< 5 min entre sí) se juntan en un bloque.
 */
export function agruparMensajes(mensajes, yo, tz = 'America/Lima') {
  const orden = [...mensajes].sort((a, b) => ts(a.created_at) - ts(b.created_at) || (a.id ?? 0) - (b.id ?? 0));
  const dias = [];
  for (const m of orden) {
    const dia = diaClave(m.created_at, tz);
    let d = dias[dias.length - 1]; if (!d || d.dia !== dia) { d = { dia, items: [] }; dias.push(d); }
    const ult = d.items[d.items.length - 1]; const prev = ult?.mensajes[ult.mensajes.length - 1];
    if (ult && ult.autor === m.autor_id && ts(m.created_at) - ts(prev.created_at) < 5 * 60 * 1000) ult.mensajes.push(m);
    else d.items.push({ autor: m.autor_id, mios: m.autor_id === yo, mensajes: [m] });
  }
  return dias;
}

/** «2026-10-04» → «Hoy» · «Ayer» · «4 oct» (según `hoy` en la misma zona). */
export function etiquetaDia(dia, hoy) {
  const a = Date.UTC(...dia.split('-').map((n, i) => (i === 1 ? n - 1 : +n))); const b = Date.UTC(...hoy.split('-').map((n, i) => (i === 1 ? n - 1 : +n)));
  const d = Math.round((b - a) / 86400000);
  if (d === 0) return 'Hoy'; if (d === 1) return 'Ayer';
  return new Date(a).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export const hoyClave = (tz = 'America/Lima', ahora = new Date()) => diaClave(ahora.toISOString(), tz);
