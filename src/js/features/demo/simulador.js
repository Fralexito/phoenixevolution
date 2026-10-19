// SIMULADOR del modo demostración (19-oct-2026; ver core/sistema/modoDemo.js). Lo carga SOLO core/sistema/supabase.js con import()
// cuando el modo está encendido: las lecturas de abajo devuelven datos inventados CON ACTIVIDAD (el marcador avanza y hay goles,
// llegan publicaciones nuevas, suben las reacciones, cambia el ping de los conectados). Todo lo demás va a la base real.
// Lo inventado tiene ids ≥ 900 000 000; cualquier acción sobre ellos (reaccionar, responder…) se «acepta» sin escribir nada.
// Las formas copian las de la base: private.tarjeta_sala (mig. 067/134), ticker_comunidad (073), muro_comunidad (032/041), muro_extras_de (133).

const ID0 = 900_000_000;
const T0 = (() => {   // inicio de la «sesión de demostración»: igual en todas las páginas de esta pestaña, así la actividad sigue
  try { const v = Number(sessionStorage.getItem('px-demo-t0')); if (v) return v; const n = Date.now() - 4 * 60e3; sessionStorage.setItem('px-demo-t0', String(n)); return n; } catch { return Date.now() - 4 * 60e3; }
})();
const seg = () => (Date.now() - T0) / 1000;
const hace = (min) => new Date(Date.now() - min * 60e3).toISOString();
const uuid = (n) => `00000000-0000-4000-8000-${String(900000000000 + n).padStart(12, '0')}`;
const azar = (n) => { const x = Math.sin(n * 99.13) * 43758.5453; return x - Math.floor(x); };   // pseudoaleatorio estable

const GENTE = ['Rayo_Peruano', 'ElMatador10', 'Chalaco FC', 'Pibe Valderrama', 'La Pulga Andina', 'Tiki Taka Lima', 'Zurdo Letal', 'Capitán Inca', 'Muralla Azul', 'Bicho Celeste', 'Vikingo PES', 'Toque Fino']
  .map((nombre, i) => ({ id: uuid(i + 1), nombre, username: nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), avatar_url: null }));
const CLUBES = [['AC Milan', 'Inter'], ['Real Madrid', 'Barcelona'], ['Boca Juniors', 'River Plate'], ['Alianza Lima', 'Universitario'], ['Liverpool', 'Manchester City']];

/* ---------- Salas en vivo (el marcador avanza: un partido de 90' cada 9 minutos reales) ---------- */
const CICLO = 540;
function partido(n) {
  const t = seg() + n * 137; const vuelta = Math.floor(t / CICLO); const k = (t % CICLO) / CICLO;
  const minuto = Math.min(90, Math.floor(k * 95)); let gl = 0; let gv = 0;
  for (let g = 0; g < 6; g += 1) { const cuando = azar(vuelta * 31 + n * 7 + g) * 0.95; if (cuando < k && azar(vuelta * 13 + g + n) > 0.35) { if (azar(g * 5 + vuelta + n) > 0.5) gl += 1; else gv += 1; } }
  const [local, visitante] = CLUBES[(vuelta + n) % CLUBES.length];
  return { local, visitante, goles_local: gl, goles_visita: gv, minuto, fase: minuto >= 90 ? 'final' : minuto >= 45 && minuto < 47 ? 'descanso' : 'juego', actualizado: new Date().toISOString() };
}
const ping = (base, n) => Math.max(4, Math.round(base + Math.sin(seg() / 7 + n) * base * 0.35));
function sala(n, { estado = 'abierta', rival = null, espectadores = 0, region = 'Lima', parche = 'ConmeGOL', modo = 'amistoso' } = {}) {
  const h = GENTE[n]; const r = rival == null ? null : GENTE[rival];
  const quienes = [h, r].filter(Boolean).concat(estado === 'en_partida' ? [GENTE[(n + 5) % GENTE.length]] : []);
  const pingHost = ping(estado === 'en_partida' ? 22 : 34, n);
  return {
    sala_id: uuid(500 + n), mia: false, modo, juego: 'eFootball PES 2021', parche, region, estado, reto_id: null, visibilidad: 'publica',
    host: { id: h.id, nombre: h.nombre, avatar_url: h.avatar_url, amigo: n % 3 === 0 },
    rival: r ? { id: r.id, nombre: r.nombre, avatar_url: r.avatar_url } : null,
    semaforo: { color: pingHost < 40 ? 'verde' : pingHost < 90 ? 'ambar' : 'rojo', fuente: 'host', ping_ms: pingHost, muestras_par: 12, muestras_host: 300 + n * 17 },
    abierta_en: hace(6 + n * 4), en_partida_desde: estado === 'en_partida' ? new Date(Date.now() - ((seg() + n * 137) % CICLO) * 1000).toISOString() : null,
    marcador: estado === 'en_partida' ? partido(n) : null,
    conectados: { total: quienes.length, jugadores: quienes.map((p, i) => ({ nombre: p.nombre, avatar_url: p.avatar_url, ping_ms: ping(18 + i * 21, n + i) })) },
    espectadores, plazas_total: 4, plazas_libres: Math.max(0, 4 - quienes.length), soy_espectador: false, acepta_espectadores: true, limite_espectadores: 8,
  };
}
const salasEnVivo = () => [
  sala(0, { estado: 'en_partida', rival: 1, espectadores: 3 + Math.floor(seg() / 50) % 4 }),
  sala(2, { estado: 'en_partida', rival: 3, espectadores: 1, region: 'Bogotá', parche: 'Gogosz Patch' }),
  sala(4, { rival: 5, region: 'Santiago' }),
  ...(Math.floor(seg() / 75) % 2 ? [sala(6, { region: 'Quito' })] : []),   // una sala que aparece y desaparece
];
const radarSalas = () => [sala(7, { region: 'Lima' }), sala(8, { region: 'Arequipa', parche: 'Gogosz Patch' }), sala(9, { region: 'CDMX' })]
  .map(({ sala_id, mia, host, juego, parche, region, visibilidad, abierta_en, acepta_espectadores, semaforo }) => ({ sala_id, mia, host, juego, parche, region, visibilidad, abierta_en, acepta_espectadores, semaforo }));

/* ---------- Barra de última hora ---------- */
function ticker() {
  const resultados = Array.from({ length: 6 }, (_, i) => ({ a: GENTE[i * 2 % 12].nombre, b: GENTE[(i * 2 + 1) % 12].nombre, ga: Math.floor(azar(i + 3) * 5), gb: Math.floor(azar(i + 9) * 4), cuando: hace(3 + i * 11) }));
  return { resultados, retos_abiertos: 4 + Math.floor(seg() / 40) % 5, en_juego: 2 + Math.floor(seg() / 90) % 3, salas_vivas: salasEnVivo().length + 3,
    creadores_en_vivo: [{ nombre: GENTE[3].nombre, titulo: 'Liga Phoenix en directo · jornada 7', url: '' }] };
}

/* ---------- Muro (una publicación nueva cada 75 s; las reacciones suben con el tiempo) ---------- */
const TEXTOS = [
  ['¡Qué golazo de chilena en el minuto 89! 🔥 El que me lo empató ya sabe quién es 😎 #Golazo', 'galaxia', 'orgulloso'],
  ['Busco rival para un amistoso con el parche ConmeGOL, ping bajo desde Lima 🇵🇪 #BuscoRival', null, 'motivado'],
  ['Remontada 3–2 con diez jugadores. No me hablen por una semana 💪 #LigaPhoenix #Golazo', 'atardecer', 'emocionado'],
  ['GG a todos los de la liga de anoche, nivelazo. ¿Revancha el sábado?', null, 'agradecido'],
  ['Nuevo récord: 12 partidos sin perder en la Liga Phoenix 🏆 #LigaPhoenix', 'neon', 'feliz'],
  ['¿Alguien más siente que el Milan de este parche está roto? 😂', null, 'picado'],
  ['Primera vez de host con Phoenix Link y salió perfecto, cero lag 👏 #PhoenixLink', 'galaxia', 'feliz'],
  ['Me robaron el Clásico en el 93’. Penal inexistente 😤 #LigaPhoenix', null, 'picado'],
  ['Armé mi once ideal para la temporada: ¿qué le cambiarían?', 'atardecer', 'nervioso'],
];
const REAC = ['🔥', '🤝', '👏', '😂', '❤️'];
function publicacion(i) {
  const [texto, fondo, sentimiento] = TEXTOS[i % TEXTOS.length]; const a = GENTE[(i * 5) % GENTE.length];
  const nueva = i >= 100; const edadMin = nueva ? Math.max(0, (seg() - (i - 100 + 1) * 75) / 60) : 20 + (8 - i) * 37;
  const crece = Math.min(1, (seg() / 600) + 0.3); const reacciones = {};
  REAC.forEach((r, k) => { const v = Math.round(azar(i * 7 + k) * 14 * crece * (k === 0 ? 1.6 : 1)); if (v) reacciones[r] = v; });
  return { id: ID0 + i, texto, imagen_url: null, video_url: null, juego: 'pes', reto: null, created_at: hace(edadMin), respuestas: Math.floor(azar(i + 4) * 6 * crece),
    reacciones, autor: { id: a.id, username: a.username, nombre_display: a.nombre, avatar_url: a.avatar_url }, _extra: fondo || sentimiento ? { ...(fondo ? { fondo } : {}), ...(sentimiento ? { sentimiento } : {}) } : null };
}
function publicaciones() {
  const nuevas = Math.min(20, Math.floor(seg() / 75));
  return [...Array.from({ length: nuevas }, (_, k) => publicacion(100 + nuevas - 1 - k)), ...Array.from({ length: 9 }, (_, i) => publicacion(8 - i))];
}
const sinExtra = ({ _extra, ...p }) => p;
function muro(a = {}, orden = 'recientes') {
  let lista = publicaciones();
  if (orden === 'destacado') lista = [...lista].sort((x, y) => Object.values(y.reacciones).reduce((s, v) => s + v, 0) - Object.values(x.reacciones).reduce((s, v) => s + v, 0));
  if (a.p_antes) lista = lista.filter((p) => p.id < Number(a.p_antes));
  const n = Math.max(1, Math.min(40, Number(a.p_limite) || 20));
  return { hay_mas: false, items: lista.slice(0, n).map(sinExtra) };
}
function extras(a = {}) {
  const r = {}; for (const id of a.p_publicaciones ?? []) { if (Number(id) < ID0) continue; const e = publicacion(Number(id) - ID0)._extra; if (e) r[String(id)] = e; }
  return r;
}

/* ---------- Historias (forma de historias_recientes, mig. 056): solo texto; una persona más cada 2 minutos ---------- */
const FRASES_HIST = ['Calentando para la final de esta noche 🔥', '¿Quién se anima a un amistoso? Sala abierta 🎮', 'Nuevo parche instalado, a probar ⚽', 'GG a todos, qué partidazo 🤝', 'Hoy toca remontada 💪', 'Mi once para el sábado 👀'];
function historias() {
  const cuantas = Math.min(GENTE.length, 4 + Math.floor(seg() / 120));
  return { items: Array.from({ length: cuantas }, (_, k) => {
    const a = GENTE[(k * 7 + 2) % GENTE.length]; const n = 1 + (k % 2);
    return { autor: { id: a.id, username: a.username, nombre_display: a.nombre, avatar_url: a.avatar_url }, ultima: ID0 + 300 + k * 2 + n,
      historias: Array.from({ length: n }, (_, j) => ({ id: ID0 + 300 + k * 2 + j, texto: FRASES_HIST[(k + j) % FRASES_HIST.length], imagen_url: null, video_url: null, created_at: hace(5 + k * 23 + j * 4), expira_at: new Date(Date.now() + 20 * 3600e3).toISOString(), destacada_id: null })) };
  }) };
}

/* ---------- Chat general (forma de private.chat_listar, mig. 099): un mensaje cada 12 s; lo que escribes queda solo aquí ---------- */
const FRASES_CHAT = ['buenas a todos 👋', 'alguien para un amistoso? tengo sala abierta en Lima', 'qué golazo el de anoche en la liga', 'el Milan de este parche está roto jaja', 'GG @Zurdo_Letal, revancha mañana', 'quién hostea hoy?', 'ya salió la jornada 7?', 'ping de 18 ms con Phoenix Link, una maravilla', 'voy con el Liverpool esta temporada', 'alguien sabe cómo activar el modo espectador?', 'jajaja ese penal no era', 'me sumo al torneo del sábado'];
const MIOS = [];
function chatListar(a = {}) {
  const ahora = Math.floor(seg() / 12); const desde = Number(a.p_desde) || 0;
  const todos = Array.from({ length: 40 }, (_, k) => { const i = ahora - 39 + k; const p = GENTE[((i % 12) + 12) % 12];
    return { id: ID0 + 1000 + i * 2, usuario_id: p.id, nombre: p.nombre, texto: FRASES_CHAT[((i % FRASES_CHAT.length) + FRASES_CHAT.length) % FRASES_CHAT.length], creado_en: new Date(T0 + i * 12000).toISOString(), rol: i % 9 === 0 ? 'moderador' : 'jugador' }; })
    .concat(MIOS).sort((x, y) => x.id - y.id);
  return { ok: true, mensajes: todos.filter((m) => m.id > desde).slice(-Math.max(1, Math.min(100, Number(a.p_limite) || 50))), borrados: [], espera_seg: 0 };
}
async function chatEnviar(a = {}) {
  let yo = null; try { const { supabase } = await import('../../core/sistema/supabase.js'); yo = (await supabase.auth.getSession()).data.session?.user?.id ?? null; } catch { /* sin sesión: se ve igual */ }
  MIOS.push({ id: ID0 + 1000 + Math.floor(seg() / 12) * 2 + 1, usuario_id: yo, nombre: 'Tú', texto: String(a.p_texto ?? '').slice(0, 500), creado_en: new Date().toISOString(), rol: 'jugador' });
  return { ok: true };
}

/* ---------- Notificaciones (tabla «notificaciones»; la campana la consulta con .from()): una nueva cada 90 s ---------- */
const AVISOS = [
  ['RETO_DIRECTO', 'Te retaron a un duelo', '{a} te retó a un amistoso 1v1. Tienes 10 minutos para aceptar.'],
  ['SALA_LISTA', 'Tu sala está lista', 'La sala de {a} ya está abierta en Phoenix Link. Entra cuando quieras.'],
  ['MURO_RESPUESTA', 'Nueva respuesta', '{a} respondió a tu publicación: «¡qué golazo!»'],
  ['SEGUIDOR_NUEVO', 'Nuevo seguidor', '{a} empezó a seguirte.'],
  ['RESULTADO_CONFIRMADO', 'Resultado confirmado', 'Tu partido contra {a} quedó 3–2. Sumaste 18 puntos de ELO.'],
  ['LOGRO', '¡Logro desbloqueado!', 'Conseguiste «Racha de 5». Míralo en tus logros.'],
  ['AMISTAD_SOLICITUD', 'Solicitud de amistad', '{a} quiere ser tu amigo.'],
  ['EVENTO', 'Evento por empezar', 'El torneo relámpago de los sábados empieza en 30 minutos.'],
];
const leidas = new Set(); const quitadas = new Set();
function notificaciones() {
  const nuevas = Math.min(AVISOS.length, 3 + Math.floor(seg() / 90));
  return Array.from({ length: nuevas }, (_, k) => { const [tipo, titulo, msj] = AVISOS[k]; const id = ID0 + 2000 + k;
    return { id, tipo, titulo, mensaje: msj.replace('{a}', GENTE[(k * 3 + 1) % GENTE.length].nombre), reto_id: null, fecha_ref: null, enlace: null, leida: k < nuevas - 3 || leidas.has(id), created_at: new Date(T0 + k * 90000 - 20 * 60e3).toISOString() }; })
    .filter((n) => !quitadas.has(n.id)).reverse();
}
/** Sustituto de una consulta .from(tabla) en modo demostración (hoy solo «notificaciones»). `ops` = [[método, args], …]; `real()` la hace de verdad. */
export async function tablaDemo(tabla, ops, real) {
  if (tabla !== 'notificaciones') return real();
  const op = (m) => ops.find(([k]) => k === m);
  const ids = (op('in')?.[1]?.[1] ?? []).map(Number);
  if (op('update') || op('delete')) {
    if (!ids.length || ids.some((x) => x < ID0)) return real();   // algo real: lo hace la base
    for (const id of ids) (op('delete') ? quitadas : leidas).add(id);
    if (op('update') && op('update')[1]?.[0]?.leida === false) ids.forEach((id) => leidas.delete(id));
    return { data: null, error: null };
  }
  const antes = op('lt')?.[1]?.[1]; let data = notificaciones(); if (antes) data = data.filter((n) => n.created_at < antes);
  return { data, error: null, count: data.length };
}

/* ---------- Estadísticas de cualquier perfil (si la base no tiene, se inventan) ---------- */
const estadisticas = () => ({ visible: true, jugados: 48, victorias: 29, empates: 8, derrotas: 11, gf: 97, gc: 61, efectividad: 69 });
const elo = () => ({ visible: true, elo: 1386, jugados: 31, delta: 12 });

const SIMULADAS = {
  salas_en_vivo: salasEnVivo, radar_salas: radarSalas, ticker_comunidad: ticker,
  muro_comunidad: (a) => muro(a), muro_siguiendo: (a) => muro(a), muro_destacado: (a) => muro(a, 'destacado'),
  historias_recientes: historias, chat_global_listar: chatListar, chat_global_enviar: chatEnviar,
  buscar_publicaciones: (a) => { const q = String(a.p_q ?? '').toLowerCase(); const r = publicaciones().filter((p) => p.texto.toLowerCase().includes(q)); const d = Number(a.p_desplazamiento) || 0; return { items: r.slice(d, d + (Number(a.p_limite) || 20)).map(sinExtra), hay_mas: false }; },
};
const SI_FALTA = { estadisticas_de: estadisticas, elo_de: elo };   // primero la base; si no hay datos visibles, lo simulado

/** Sustituto de supabase.rpc en modo demostración. `real()` hace la llamada de verdad. → { data, error } */
export async function rpcDemo(nombre, args, real) {
  if (SIMULADAS[nombre]) return { data: await SIMULADAS[nombre](args ?? {}), error: null };
  if (nombre === 'muro_extras_de') {
    const r = await real(); return { data: { ...(r.data ?? {}), ...extras(args) }, error: null };
  }
  if (nombre === 'muro_reaccionar' && Number(args?.p_publicacion) >= ID0) return { data: args?.p_tipo ?? null, error: null };   // reaccionar a algo inventado: se ve marcado, no se guarda
  if (Object.values(args ?? {}).some((v) => Number(v) >= ID0 && Number(v) < ID0 + 1e6)) return { data: null, error: null };   // acción sobre algo inventado
  // Entrar a una sala inventada: se reserva el puesto pero sin enlace (así no se abre Parsec hacia ningún equipo real).
  if ((nombre === 'ver_sala' || nombre === 'aceptar_sala') && String(args?.p_sala ?? '').startsWith('00000000-0000-4000-8000-9000')) return { data: { rol: nombre === 'ver_sala' ? 'espectador' : 'rival', enlace: null }, error: null };
  const r = await real();
  if (SI_FALTA[nombre] && (r.error || !r.data || r.data.visible !== true)) return { data: SI_FALTA[nombre](), error: null };
  return r;
}
