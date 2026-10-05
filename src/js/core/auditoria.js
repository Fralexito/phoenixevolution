// Registro de auditoría (puro, sin DOM → probable): convierte lo que devuelve la BD (`auditoria_listar` / `auditoria_resumen`)
// en frases claras en español, resúmenes «antes → después» y agrupaciones por día. Nunca lanza con datos raros.
import { normalizarRol, etiquetaRol } from './roles.js';

const TZ = 'America/Lima';

/** Tipos de acción: verbo, icono y tono (el tono lo traduce a colores la pantalla). */
export const ACCIONES = Object.freeze({
  crear:   { verbo: 'creó',                etiqueta: 'Creó',     icono: 'fa-plus',        tono: 'ok' },
  editar:  { verbo: 'editó',               etiqueta: 'Editó',    icono: 'fa-pen',         tono: 'warn' },
  ocultar: { verbo: 'ocultó',              etiqueta: 'Ocultó',   icono: 'fa-eye-slash',   tono: 'oculto' },
  borrar:  { verbo: 'borró',               etiqueta: 'Borró',    icono: 'fa-trash',       tono: 'bad' },
  rol:     { verbo: 'cambió el rol de',    etiqueta: 'Rol',      icono: 'fa-user-shield', tono: 'rol' },
  sancion: { verbo: 'sancionó a',          etiqueta: 'Sanción',  icono: 'fa-ban',         tono: 'bad' },
  sistema: { verbo: 'hizo un cambio en',   etiqueta: 'Sistema',  icono: 'fa-gear',        tono: 'neutro' },
});

/** Cómo se llama cada tabla en una frase («creó LA FICHA DEL JUGADOR «Messi»») y en el filtro de secciones. */
export const TABLAS = Object.freeze({
  jugadores:           { objeto: 'la ficha del jugador',        seccion: 'Jugadores',     icono: 'fa-user' },
  equipos:             { objeto: 'el equipo',                   seccion: 'Equipos',       icono: 'fa-shield' },
  partidos:            { objeto: 'un partido',                  seccion: 'Partidos',      icono: 'fa-futbol' },
  partidos_torneo:     { objeto: 'un partido del torneo',       seccion: 'Torneo',        icono: 'fa-trophy' },
  eventos_partido:     { objeto: 'un evento de partido',        seccion: 'Partidos',      icono: 'fa-futbol' },
  copa_resultados:     { objeto: 'el resultado de copa',        seccion: 'Copa',          icono: 'fa-trophy' },
  grupos_divisiones:   { objeto: 'la división',                 seccion: 'Divisiones',    icono: 'fa-layer-group' },
  participaciones:     { objeto: 'una participación del historial', seccion: 'Historial', icono: 'fa-clock-rotate-left' },
  transferencias:      { objeto: 'una transferencia',           seccion: 'Mercado',       icono: 'fa-arrow-right-arrow-left' },
  contratos_plantilla: { objeto: 'un contrato de plantilla',    seccion: 'Plantillas',    icono: 'fa-file-signature' },
  clanes:              { objeto: 'el clan',                  seccion: 'Clanes',       icono: 'fa-shield-halved' },
  clan_miembros:       { objeto: 'un miembro de clan',        seccion: 'Clanes',       icono: 'fa-shield-halved' },
  eventos:             { objeto: 'el evento',                 seccion: 'Eventos',      icono: 'fa-calendar-day' },
  noticias:            { objeto: 'la noticia',                  seccion: 'Noticias',      icono: 'fa-newspaper' },
  ligas:               { objeto: 'la liga',                     seccion: 'Ligas',         icono: 'fa-flag' },
  temporadas:          { objeto: 'la temporada',                seccion: 'Temporadas',    icono: 'fa-calendar' },
  perfiles:            { objeto: 'la cuenta de',                seccion: 'Cuentas y roles', icono: 'fa-id-card' },
  sanciones:           { objeto: 'la cuenta de',                seccion: 'Sanciones',     icono: 'fa-ban' },
  reportes:            { objeto: 'el reporte',                  seccion: 'Reportes',      icono: 'fa-flag' },
  muro_publicaciones:  { objeto: 'una publicación del muro',    seccion: 'Muro · publicaciones',          icono: 'fa-comments' },
  muro_respuestas:     { objeto: 'una respuesta del muro',      seccion: 'Muro · respuestas',          icono: 'fa-comments' },
  muro_clips:          { objeto: 'un clip',                     seccion: 'Muro · clips',          icono: 'fa-film' },
  muro_historias:      { objeto: 'una historia',                seccion: 'Muro · historias',          icono: 'fa-circle-play' },
});

/** Opciones del filtro «sección» (sin repetidos, con la tabla real que se envía a la BD). */
export const FILTRO_SECCIONES = Object.freeze(Object.entries(TABLAS).map(([tabla, t]) => ({ tabla, etiqueta: t.seccion })));
export const FILTRO_ACCIONES = Object.freeze(Object.entries(ACCIONES).filter(([k]) => k !== 'sistema').map(([accion, a]) => ({ accion, etiqueta: a.etiqueta, icono: a.icono, tono: a.tono })));

const NOMBRE_CAMPO = Object.freeze({
  nombre: 'Nombre', club: 'Club', ovr: 'Media (OVR)', posicion: 'Posición', pac: 'Ritmo', dri: 'Regate', sho: 'Tiro', def: 'Defensa', pas: 'Pase', phy: 'Físico',
  atq: 'Ataque', fin: 'Finalización', pot: 'Potencia', efe: 'Efecto', reg: 'Regate fino', cor: 'Corte', cre: 'Creatividad', pre: 'Presión', pos: 'Posicionamiento', ant: 'Anticipación', rit: 'Ritmo', men: 'Mentalidad',
  quote: 'Frase', foto: 'Foto', foto_url: 'Foto', descripcion: 'Descripción', apodo: 'Apodo', altura_cm: 'Altura (cm)', peso_kg: 'Peso (kg)', pie: 'Pie', biografia: 'Biografía', ciudad: 'Ciudad',
  estilo_juego: 'Estilo de juego', logros: 'Logros', redes: 'Redes', perfil_id: 'Cuenta vinculada',
  titulo: 'Título', resumen: 'Resumen', cuerpo: 'Texto', categoria: 'Categoría', tag: 'Etiqueta', imagen: 'Imagen', liga: 'Liga', destacada: 'Destacada', publicada: 'Publicada', slug: 'Enlace',
  goles_local: 'Goles del local', goles_visita: 'Goles de la visita', estado: 'Estado', modalidad: 'Modalidad', fecha_programada: 'Fecha programada', jornada: 'Jornada',
  ga: 'Goles A', gb: 'Goles B', pa: 'Penales A', pb: 'Penales B', cruce: 'Cruce', temporada: 'Temporada', activa: 'Activa', siglas: 'Siglas', logo_url: 'Escudo',
  monto_operacion: 'Monto', tipo_evento: 'Tipo', minuto: 'Minuto', puesto: 'Puesto', premios: 'Premios', torneo: 'Torneo', edicion: 'Edición', rol: 'Rol', rol_plantilla: 'Rol en la plantilla',
  oculto: 'Oculto', tipo: 'Tipo de sanción', hasta: 'Hasta', reportes_cerrados: 'Reportes cerrados',
});

const capitalizar = (s) => { const t = String(s).replace(/_/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
export const nombreCampo = (campo) => NOMBRE_CAMPO[campo] ?? capitalizar(campo);

/** Valor de la BD → texto corto y legible. */
export function formatearValor(valor, campo = '') {
  if (valor === null || valor === undefined) return '—';
  if (campo === 'rol') return etiquetaRol(valor);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'number') return String(valor);
  const t = typeof valor === 'string' ? valor.trim() : JSON.stringify(valor);
  if (t === '') return '(vacío)';
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

/** `cambios` de la BD ({campo: [antes, después]}) → lista ordenada para pintar. Tolera basura. */
export function resumenCambios(cambios) {
  if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios)) return [];
  const orden = ['nombre', 'titulo', 'rol', 'publicada'];
  return Object.entries(cambios)
    .filter(([, par]) => Array.isArray(par) && par.length === 2)
    .map(([campo, [antes, despues]]) => ({
      campo, etiqueta: nombreCampo(campo), antes: formatearValor(antes, campo), despues: formatearValor(despues, campo),
      tipo: antes == null && despues != null ? 'nuevo' : despues == null && antes != null ? 'quitado' : 'cambio',
    }))
    .sort((a, b) => (orden.indexOf(a.campo) + 1 || 99) - (orden.indexOf(b.campo) + 1 || 99));
}

const aMs = (t) => { const n = typeof t === 'number' ? t : Date.parse(t); return Number.isFinite(n) ? n : 0; };

/** Fila cruda de `auditoria_listar` → entrada segura (o null si no es una fila). */
export function normalizarEntrada(raw) {
  if (!raw || typeof raw !== 'object' || raw.id == null) return null;
  return {
    id: Number(raw.id), momento: aMs(raw.momento), actorId: raw.actor_id ?? null,
    actorNombre: String(raw.actor_nombre || raw.actor_username || '').trim(), actorUsuario: raw.actor_username ?? '', actorAvatar: raw.actor_avatar ?? '',
    actorRol: raw.actor_rol ? normalizarRol(raw.actor_rol) : null,
    accion: ACCIONES[raw.accion] ? raw.accion : 'sistema', tabla: String(raw.tabla ?? ''), registroId: raw.registro_id ?? null,
    titulo: String(raw.titulo ?? '').trim(), cambios: raw.cambios && typeof raw.cambios === 'object' ? raw.cambios : {}, motivo: String(raw.motivo ?? '').trim(),
  };
}

/** Entrada → todo lo que la pantalla necesita para contarlo en lenguaje humano. */
export function describirEntrada(raw) {
  const e = normalizarEntrada(raw); if (!e) return null;
  const acc = ACCIONES[e.accion]; const tab = TABLAS[e.tabla];
  const cambios = resumenCambios(e.cambios);
  const actor = e.actorNombre || (e.actorId ? 'Una cuenta eliminada' : 'Sistema (cambio hecho desde Supabase)');
  const objeto = tab?.objeto ?? `un registro de «${e.tabla || 'desconocido'}»`;
  let corto = '';
  if (e.accion === 'editar' || e.accion === 'ocultar') corto = cambios.length <= 2 ? cambios.map((c) => `${c.etiqueta}: ${c.antes} → ${c.despues}`).join(' · ') : `${cambios.length} datos modificados`;
  else if (e.accion === 'crear') corto = `${cambios.length} dato${cambios.length === 1 ? '' : 's'} guardado${cambios.length === 1 ? '' : 's'}`;
  else if (e.accion === 'borrar') corto = 'Se conserva una copia de sus datos en este registro';
  else if (e.accion === 'rol') corto = cambios[0] ? `${cambios[0].antes} → ${cambios[0].despues}` : '';
  return {
    ...e, actor, rolActor: e.actorRol ? etiquetaRol(e.actorRol) : '', verbo: acc.verbo, icono: acc.icono, tono: acc.tono, etiquetaAccion: acc.etiqueta,
    objeto, seccion: tab?.seccion ?? 'Otros', iconoTabla: tab?.icono ?? 'fa-database', cambios, corto,
  };
}

/** Frase completa en texto plano (para pruebas y lectores de pantalla). */
export const frase = (d) => `${d.actor}${d.rolActor ? ` (${d.rolActor})` : ''} ${d.verbo} ${d.objeto}${d.titulo ? ` «${d.titulo}»` : ''}`;

const claveDia = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
const etiquetaDia = (clave, hoy) => {
  if (clave === claveDia(hoy)) return 'Hoy';
  if (clave === claveDia(hoy - 86400000)) return 'Ayer';
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(Date.parse(`${clave}T12:00:00-05:00`));
};

/** Filtro de fecha de la pantalla → instante ISO desde el que pedir (o null = todo). «Hoy» empieza a las 00:00 de Lima (UTC−5, sin horario de verano). */
export function desdeRango(rango, ahora = Date.now()) {
  if (rango === 'hoy') return new Date(`${claveDia(ahora)}T00:00:00-05:00`).toISOString();
  const dias = { 7: 7, 30: 30 }[String(rango)];
  return dias ? new Date(ahora - dias * 86400000).toISOString() : null;
}

/** Entradas (ya descritas, más nuevas primero) → [{clave, etiqueta, entradas}] por día de Lima. */
export function agruparPorDia(entradas, ahora = Date.now()) {
  const grupos = []; const idx = new Map();
  for (const e of entradas) {
    const clave = claveDia(e.momento || 0);
    if (!idx.has(clave)) { const g = { clave, etiqueta: etiquetaDia(clave, ahora), entradas: [] }; idx.set(clave, g); grupos.push(g); }
    idx.get(clave).entradas.push(e);
  }
  return grupos;
}

/** `auditoria_resumen` cruda → objeto seguro con cada persona y su serie diaria completa (días sin actividad = 0). */
export function normalizarResumen(raw, ahora = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const dias = Math.min(Math.max(Number(r.dias) || 7, 1), 90);
  const num = (x) => Number(x) || 0;
  const personas = (Array.isArray(r.personas) ? r.personas : []).map((p) => ({
    actorId: p?.actor_id ?? null, nombre: String(p?.nombre_display || p?.username || (p?.actor_id ? 'Cuenta eliminada' : 'Sistema')),
    usuario: p?.username ?? '', avatar: p?.avatar_url ?? '', rol: p?.rol ? normalizarRol(p.rol) : null,
    total: num(p?.total), creadas: num(p?.creadas), editadas: num(p?.editadas), ocultadas: num(p?.ocultadas), borradas: num(p?.borradas), roles: num(p?.sanciones_o_roles), ultima: aMs(p?.ultima),
  }));
  const porClave = new Map((Array.isArray(r.por_dia) ? r.por_dia : []).map((d) => [String(d?.dia), num(d?.total)]));
  const serie = [];
  for (let i = dias - 1; i >= 0; i -= 1) { const clave = claveDia(ahora - i * 86400000); serie.push({ clave, total: porClave.get(clave) ?? 0 }); }
  return { dias, personas, serie, maximo: Math.max(1, ...serie.map((s) => s.total)), total: personas.reduce((s, p) => s + p.total, 0) };
}
