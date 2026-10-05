// Reglas puras de búsqueda, guardados y autocompletado de @menciones (sin DOM → probable). ESPEJO de la migración 034 y de `private.extraer_menciones` (033).
// La base de datos es la que manda; aquí solo se valida lo obvio antes de enviar y se normalizan las respuestas.

export const BUSQUEDA_MIN = 2;
export const BUSQUEDA_MAX = { personas: 40, publicaciones: 80 };
export const TIPOS_BUSQUEDA = Object.freeze([
  { id: 'personas', etiqueta: 'Personas', icono: 'fa-user-group' },
  { id: 'publicaciones', etiqueta: 'Publicaciones', icono: 'fa-newspaper' },
]);
export const esTipoBusqueda = (t) => TIPOS_BUSQUEDA.some((x) => x.id === t);

/** Texto escrito → { ok, q, error }. En «personas» se admite la @ delante. Espacios repetidos se colapsan. */
export function validarBusqueda(texto, tipo = 'personas') {
  if (!esTipoBusqueda(tipo)) return { ok: false, q: '', error: 'Elige dónde buscar.' };
  let q = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (tipo === 'personas') q = q.replace(/^@/, '');
  if (q.length < BUSQUEDA_MIN) return { ok: false, q, error: `Escribe al menos ${BUSQUEDA_MIN} letras.` };
  if (q.length > BUSQUEDA_MAX[tipo]) return { ok: false, q, error: `La búsqueda admite máximo ${BUSQUEDA_MAX[tipo]} caracteres.` };
  return { ok: true, q, error: '' };
}

/** Si el cursor está justo después de «@algo» (o de una @ sola), devuelve dónde empieza y qué se lleva escrito. Si no, null.
 *  La @ debe ir al inicio o tras un carácter que no sea letra/número/_/@ (así «correo@sitio» no abre el selector). */
export function mencionEnCursor(texto, pos) {
  const t = String(texto ?? ''); const p = Math.max(0, Math.min(Number.isInteger(pos) ? pos : t.length, t.length));
  const m = /(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{0,20})$/.exec(t.slice(0, p));
  return m ? { inicio: p - m[1].length - 1, fin: p, consulta: m[1] } : null;
}

/** Sustituye lo escrito (@abc) por «@usuario » y devuelve el texto nuevo y dónde queda el cursor. El usuario se filtra: solo caracteres válidos. */
export function insertarMencion(texto, mencion, username) {
  const t = String(texto ?? ''); const u = String(username ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
  if (!mencion || !u) return { texto: t, pos: t.length };
  const antes = t.slice(0, mencion.inicio); const despues = t.slice(mencion.fin);
  const ins = `@${u}${despues.startsWith(' ') ? '' : ' '}`;
  return { texto: antes + ins + despues, pos: (antes + ins).length + (despues.startsWith(' ') ? 1 : 0) };
}

const txt = (v, max) => String(v ?? '').slice(0, max);
/** Fila de `buscar_personas` / `sugerencias_seguir` → objeto seguro. null si no trae id/username. */
export function normalizarPersona(p) {
  if (!p || !p.id || !p.username) return null;
  return { id: String(p.id), username: txt(p.username, 40), nombre: txt(p.nombre_display || p.username, 60), avatar: p.avatar_url ?? '', rol: txt(p.rol, 20), club: txt(p.club_favorito, 60), motivo: txt(p.motivo, 120) };
}
