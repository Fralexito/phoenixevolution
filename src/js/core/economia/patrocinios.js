// Patrocinadores de torneos y clanes (migración 139, ronda 363). Lógica pura: validar el formulario del admin y elegir qué se muestra.
// El patrocinador paga a Fralex fuera de la tienda; la web solo muestra su logo con «Patrocinado por».

export const TIPOS = { torneo: 'Torneo', clan: 'Clan' };
const https = (u) => !u || /^https:\/\/[^\s"'<>]+$/i.test(u);

/** Devuelve el primer problema del formulario en palabras simples, o null si está bien. */
export function validarPatrocinio(d) {
  if (!d || !TIPOS[d.tipo]) return 'Elige si es para un torneo o un clan.';
  if (!Number.isInteger(Number(d.objetivo)) || Number(d.objetivo) <= 0) return `Escribe el número del ${TIPOS[d.tipo].toLowerCase()}.`;
  const nombre = String(d.nombre ?? '').trim();
  if (!nombre || nombre.length > 80) return 'Escribe el nombre del patrocinador (hasta 80 letras).';
  if (!https(String(d.logo ?? '').trim())) return 'El logo debe ser un enlace que empiece con https://';
  if (!https(String(d.enlace ?? '').trim())) return 'La web del patrocinador debe empezar con https://';
  if (d.desde && d.hasta && d.hasta < d.desde) return 'La fecha final no puede ser antes que la de inicio.';
  return null;
}

/** ¿Se muestra hoy? (la base ya filtra, esto sirve para la vista del admin). `hoy` en AAAA-MM-DD. */
export function vigente(p, hoy) {
  return !!p && p.activo !== false && (!p.desde || p.desde <= hoy) && (!p.hasta || p.hasta >= hoy);
}

/** Los patrocinios de un torneo o clan concreto, el más reciente primero (máx. 3 para no saturar). */
export function patrociniosDe(lista, tipo, id) {
  return (Array.isArray(lista) ? lista : []).filter((p) => p.tipo === tipo && Number(p.objetivo_id) === Number(id))
    .sort((a, b) => String(b.desde ?? '').localeCompare(String(a.desde ?? '')) || (b.id ?? 0) - (a.id ?? 0)).slice(0, 3);
}
