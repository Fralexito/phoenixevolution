// Chat flotante estilo red social (columna de contactos + ventanitas abajo). Lógica PURA, sin DOM ni red → `npm test`.
// Por qué existe aparte de /mensajes/: aquí solo se decide QUÉ ventanas hay, en qué orden y cuántas caben; las reglas de quién
// puede escribir a quién siguen en la base (RPC abrir_directo / enviar_mensaje). La web es MPA: cada página recarga, así que
// el estado de las ventanas se guarda en sessionStorage y se restaura al llegar a la siguiente página.

export const ANCHO_VENTANA = 328;      // px de una ventana abierta (tarjeta de chat)
export const ANCHO_BURBUJA = 56;       // px de una ventana minimizada (burbuja con avatar)
export const SEPARACION = 12;
export const MAX_VENTANAS = 3;
export const MAX_RECORDADAS = 8;       // abiertas + minimizadas que se recuerdan entre páginas

/** Cuántas ventanas ABIERTAS caben en `ancho` px (mínimo 1; en móvil se muestra una a pantalla completa). */
export function ventanasQueCaben(ancho) {
  if (!Number.isFinite(ancho) || ancho <= 0) return 1;
  return Math.max(1, Math.min(MAX_VENTANAS, Math.floor((ancho + SEPARACION) / (ANCHO_VENTANA + SEPARACION))));
}

/**
 * Estado = lista de { conv, min } (más reciente al final). Abrir:
 *  · si ya está, pasa al final y se despliega;
 *  · si al desplegarla se supera `caben`, la abierta más antigua se MINIMIZA (no se cierra: Facebook hace lo mismo);
 *  · se recuerdan como mucho MAX_RECORDADAS (se descartan las minimizadas más antiguas).
 */
export function abrirVentana(estado, conv, caben = MAX_VENTANAS, { minimizada = false } = {}) {
  if (typeof conv !== 'string' || !conv) return estado ?? [];
  let lista = (estado ?? []).filter((v) => v.conv !== conv);
  lista.push({ conv, min: !!minimizada });
  if (!minimizada) {
    let abiertas = lista.filter((v) => !v.min).length;
    lista = lista.map((v) => {
      if (abiertas > caben && !v.min && v.conv !== conv) { abiertas--; return { ...v, min: true }; }
      return v;
    });
  }
  while (lista.length > MAX_RECORDADAS) {
    const i = lista.findIndex((v) => v.min && v.conv !== conv);
    lista.splice(i === -1 ? 0 : i, 1);
  }
  return lista;
}

export const cerrarVentana = (estado, conv) => (estado ?? []).filter((v) => v.conv !== conv);
export const minimizarVentana = (estado, conv) => (estado ?? []).map((v) => (v.conv === conv ? { ...v, min: true } : v));
/** Desplegar una minimizada = volver a «abrirla» (respeta cuántas caben). */
export const desplegarVentana = (estado, conv, caben) => abrirVentana(estado, conv, caben);

/** Si el ancho de pantalla baja, minimiza las abiertas sobrantes (las más antiguas primero). */
export function ajustarACaben(estado, caben) {
  let sobran = (estado ?? []).filter((v) => !v.min).length - caben;
  return (estado ?? []).map((v) => (sobran > 0 && !v.min ? (sobran--, { ...v, min: true }) : v));
}

/** sessionStorage → estado válido (nunca lanza). */
export function leerEstado(texto) {
  try {
    const x = JSON.parse(texto ?? '[]');
    if (!Array.isArray(x)) return [];
    const vistos = new Set();
    return x.filter((v) => v && typeof v.conv === 'string' && /^[0-9a-f-]{36}$/i.test(v.conv) && !vistos.has(v.conv) && vistos.add(v.conv))
      .slice(-MAX_RECORDADAS).map((v) => ({ conv: v.conv, min: !!v.min }));
  } catch { return []; }
}

/**
 * Contactos para la columna: amigos en línea primero; dentro de cada grupo, con mensajes sin leer primero y luego por nombre.
 * `noLeidosPor`: Map usuario → número (de las conversaciones directas). Devuelve [{ id, nombre, avatar, username, enLinea, noLeidos }].
 */
export function ordenarContactos(amigos, perfiles, enLinea, noLeidosPor = new Map()) {
  return (amigos ?? []).map((id) => {
    const p = perfiles.get(id) ?? {};
    return { id, nombre: p.nombre_display || p.username || 'Jugador', avatar: p.avatar_url ?? null, username: p.username ?? null,
             enLinea: enLinea.has(id), noLeidos: noLeidosPor.get(id) ?? 0 };
  }).sort((a, b) => (b.enLinea - a.enLinea) || ((b.noLeidos > 0) - (a.noLeidos > 0)) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/** Conversaciones → Map usuario → no leídos (solo directas y no silenciadas). */
export function noLeidosPorUsuario(convs) {
  const m = new Map();
  for (const c of convs ?? []) if (c.tipo === 'DIRECTO' && c.otro_id && !c.silenciado && c.no_leidos) m.set(c.otro_id, c.no_leidos);
  return m;
}

/** ¿Este mensaje nuevo debe ABRIR una ventana (minimizada) sola? Solo si es de otro, de un chat no silenciado y no está ya en pantalla. */
export function debeAparecer(msg, yo, conv, estado) {
  if (!msg || msg.autor_id === yo || msg.eliminado) return false;
  if (!conv || conv.silenciado) return false;
  return !(estado ?? []).some((v) => v.conv === msg.conversacion_id);
}

/** Texto corto para el contador (9+). */
export const insignia = (n) => (n > 9 ? '9+' : n > 0 ? String(n) : '');
