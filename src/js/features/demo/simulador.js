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
// Juego de cada publicación simulada (antes todas eran PES 2021 y filtrar por juego no cambiaba nada). Mayoría PES, como la comunidad real.
const JUEGOS_DEMO = ['pes', 'pes', 'efootball', 'sp', 'pes', 'eafc', 'fifa', 'pes', 'sp', 'efootball'];
function publicacion(i) {
  const [texto, fondo, sentimiento] = TEXTOS[i % TEXTOS.length]; const a = GENTE[(i * 5) % GENTE.length];
  const nueva = i >= 100; const edadMin = nueva ? Math.max(0, (seg() - (i - 100 + 1) * 75) / 60) : 20 + (8 - i) * 37;
  const crece = Math.min(1, (seg() / 600) + 0.3); const reacciones = {};
  REAC.forEach((r, k) => { const v = Math.round(azar(i * 7 + k) * 14 * crece * (k === 0 ? 1.6 : 1)); if (v) reacciones[r] = v; });
  return { id: ID0 + i, texto, imagen_url: null, video_url: null, juego: JUEGOS_DEMO[i % JUEGOS_DEMO.length], reto: null, created_at: hace(edadMin), respuestas: Math.floor(azar(i + 4) * 6 * crece),
    reacciones, autor: { id: a.id, username: a.username, nombre_display: a.nombre, avatar_url: a.avatar_url }, _extra: fondo || sentimiento ? { ...(fondo ? { fondo } : {}), ...(sentimiento ? { sentimiento } : {}) } : null };
}
const MIS_COMPARTIDAS = [];   // lo que compartes en tu muro estando en demo (solo en esta pestaña)
function publicaciones() {
  const nuevas = Math.min(20, Math.floor(seg() / 75));
  return [...MIS_COMPARTIDAS, ...Array.from({ length: nuevas }, (_, k) => publicacion(100 + nuevas - 1 - k)), ...Array.from({ length: 9 }, (_, i) => publicacion(8 - i))];
}
const sinExtra = ({ _extra, _original, ...p }) => p;

/* ---------- Social fase 2 (migración 135): vistas, compartidas, quién reaccionó, respuestas con «me gusta», racha ---------- */
const pubDe = (id) => publicaciones().find((p) => p.id === Number(id)) ?? (Number(id) >= ID0 && Number(id) < ID0 + 200 ? publicacion(Number(id) - ID0) : null);
const origDe = (p) => { if (!p) return null; const { _extra, _original, ...o } = p; return { id: o.id, texto: o.texto, imagen_url: null, video_url: null, juego: o.juego, created_at: o.created_at, extra: _extra, autor: o.autor }; };
function socialDe(a = {}) {
  const r = {};
  for (const raw of a.p_publicaciones ?? []) {
    const id = Number(raw); if (id < ID0) continue; const i = id - ID0; const p = pubDe(id);
    const original = p?._original ? origDe(pubDe(p._original)) : i === 5 ? origDe(publicacion(2)) : null;   // la n.º 5 «compartió» la n.º 2 (para verlo en demo)
    r[String(id)] = { vistas: Math.floor(18 + azar(i + 11) * 120 + seg() / 8), compartidas: Math.floor(azar(i + 21) * 6), original };
  }
  return r;
}
function reaccionesDeDemo(a = {}) {
  const p = pubDe(a.p_publicacion); if (!p) return [];
  const out = []; let k = 0;
  for (const [tipo, n] of Object.entries(p.reacciones ?? {})) for (let j = 0; j < n; j += 1) { const g = GENTE[(k * 5 + j) % GENTE.length]; out.push({ tipo, cuando: hace(3 + k * 7), usuario: { id: g.id, username: g.username, nombre_display: g.nombre, avatar_url: null } }); k += 1; }
  return out.slice(0, 60);
}
const FRASES_RESP = ['Golazo, sin duda 🔥', 'Jajaja te pasaste', 'GG, revancha cuando quieras', 'Ese penal no era 😤', 'Nivelazo hermano'];
const likesDemo = new Map();
// Respuestas que escribes o borras en publicaciones inventadas (solo en esta pestaña; auditoría 19-oct: antes la tuya no aparecía y la borrada volvía).
const MIS_RESP = new Map(); const RESP_BORRADAS = new Set(); const MIS_RX = new Map();
function respuestasDeDemo(a = {}) {
  const id = Number(a.p_publicacion); const i = id - ID0; const n = 2 + Math.floor(azar(i + 4) * 3);
  return [...Array.from({ length: n }, (_, k) => { const g = GENTE[(i + k * 3 + 1) % GENTE.length]; return { id: ID0 + 5000 + i * 10 + k, autor_id: g.id, texto: FRASES_RESP[(i + k) % FRASES_RESP.length], created_at: hace(30 - k * 6), nombre_display: g.nombre, username: g.username, avatar_url: null, puedo_borrar: false }; }), ...(MIS_RESP.get(id) ?? [])].filter((r) => !RESP_BORRADAS.has(r.id));
}
const likeDe = (id) => likesDemo.get(id) ?? { n: Math.floor(azar(id) * 9), mio: false };
function likesRespuestasDemo(a = {}) { const r = {}; for (const raw of a.p_respuestas ?? []) { const id = Number(raw); if (id >= ID0) r[String(id)] = likeDe(id); } return r; }
function likeRespuestaDemo(a = {}) { const id = Number(a.p_respuesta); const l = likeDe(id); const nuevo = { n: l.n + (l.mio ? -1 : 1), mio: !l.mio }; likesDemo.set(id, nuevo); return { mio: nuevo.mio, total: nuevo.n }; }
function compartirDemo(a = {}) {
  const orig = pubDe(a.p_publicacion); const raiz = orig?._original ?? orig?.id ?? null;
  const id = ID0 + 800 + MIS_COMPARTIDAS.length;
  MIS_COMPARTIDAS.unshift({ id, texto: String(a.p_texto ?? '').slice(0, 1000), imagen_url: null, video_url: null, juego: 'pes', reto: null, created_at: new Date().toISOString(), respuestas: 0, reacciones: {},
    autor: { id: '00000000-0000-4000-8000-0000000000aa', username: 'tu', nombre_display: 'Tú', avatar_url: null }, _extra: null, _original: raiz });
  return id;
}
function muro(a = {}, orden = 'recientes') {
  let lista = publicaciones();
  if (orden === 'destacado') lista = [...lista].sort((x, y) => Object.values(y.reacciones).reduce((s, v) => s + v, 0) - Object.values(x.reacciones).reduce((s, v) => s + v, 0));
  if (a.p_juego) lista = lista.filter((p) => p.juego === a.p_juego);   // el filtro por juego de Social
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

/* ---------- Jugadas (migración 136): el feed vertical. 24 clips inventados; las reacciones y vistas suben con el tiempo ---------- */
const VIDEOS_DEMO = ['d9815MC-efg', '9fLuppybBQE', 'Bi-8fdt5bg8'];   // los mismos videos de data/demo.js
const JUGADAS_DEMO = [['golazo', 'Chilena al ángulo en el 89′ 🚀'], ['atajada', 'Le gané el mano a mano al Matador'], ['skill', 'Elástica + caño: el defensa sigue buscando el balón'],
  ['remontada', 'De 0-3 a 4-3 en veinte minutos'], ['fail', 'Autogol de taco. Sí, de taco 😂'], ['golazo', 'Tiro libre con una comba imposible'], ['atajada', 'Triple atajada en la misma jugada'],
  ['skill', 'Ruleta en el área chica y a guardarla'], ['golazo', 'Gol olímpico en la final del sábado'], ['remontada', 'Perdíamos 2-0 en penales… y ganamos'], ['fail', 'Fallé sin arquero. Sin. Arquero.'], ['skill', 'Sombrero al portero y gol de cabeza']];
const MIS_JUGADAS = [];   // lo que «publicas» en demo (solo en esta pestaña; no se sube nada)
const rxJugadas = new Map();
function jugada(k) {
  const [categoria, titulo] = JUGADAS_DEMO[k % JUGADAS_DEMO.length]; const g = GENTE[(k * 5 + 2) % GENTE.length]; const sube = Math.floor(seg() / 25);
  const r = { '🔥': 4 + Math.floor(azar(k + 11) * 60) + (k < 6 ? sube : 0), '⚽': Math.floor(azar(k + 12) * 18), '🐐': Math.floor(azar(k + 13) * 10), '😂': categoria === 'fail' ? 25 + Math.floor(azar(k) * 30) : Math.floor(azar(k + 14) * 4) };
  return conMia({ id: ID0 + 3000 + (99 - k), titulo, video_url: `https://www.youtube.com/watch?v=${VIDEOS_DEMO[k % VIDEOS_DEMO.length]}`, juego: 'pes', categoria, created_at: hace(9 + k * 53),
    autor: { id: g.id, username: g.username, nombre_display: g.nombre, avatar_url: null }, reacciones: r, vistas: 180 + Math.floor(azar(k + 20) * 3200) + Math.floor(seg() / 4) });
}
function conMia(it) {
  const mia = rxJugadas.get(it.id) ?? null; const r = { ...it.reacciones }; if (mia) r[mia] = (r[mia] || 0) + 1;
  for (const e of Object.keys(r)) if (!r[e]) delete r[e];
  return { ...it, reacciones: r, mia, total: Object.values(r).reduce((s, n) => s + n, 0) };
}
function jugadasFeedDemo(a = {}) {
  const top = a.p_orden === 'top'; const n = Math.min(Math.max(Number(a.p_limite) || 12, 1), 30);
  let todas = [...MIS_JUGADAS.map(conMia), ...Array.from({ length: 24 }, (_, k) => jugada(k))].filter((x) => !a.p_categoria || x.categoria === a.p_categoria);
  if (top) todas.sort((x, y) => y.total - x.total || y.id - x.id); else todas.sort((x, y) => y.id - x.id);
  if (!top && a.p_antes) todas = todas.filter((x) => x.id < Number(a.p_antes));
  const d = top ? Number(a.p_desplazamiento) || 0 : 0;
  return { items: todas.slice(d, d + n), hay_mas: todas.length > d + n };
}
function jugadaReaccionarDemo(a = {}) { const id = Number(a.p_clip); const t = String(a.p_tipo ?? ''); if (rxJugadas.get(id) === t) { rxJugadas.delete(id); return null; } rxJugadas.set(id, t); return t; }
function jugadaPublicarDemo(a = {}) {
  const id = ID0 + 3100 + MIS_JUGADAS.length;
  MIS_JUGADAS.push({ id, titulo: String(a.p_titulo ?? '').slice(0, 80), video_url: String(a.p_video ?? ''), juego: a.p_juego ?? null, categoria: a.p_categoria ?? null, created_at: new Date().toISOString(),
    autor: { id: 'yo', username: 'tu_usuario', nombre_display: 'Tú', avatar_url: null }, reacciones: {}, vistas: 0 });
  return id;
}

const SIMULADAS = {
  salas_en_vivo: salasEnVivo, radar_salas: radarSalas, ticker_comunidad: ticker,
  muro_comunidad: (a) => muro(a), muro_siguiendo: (a) => muro(a), muro_destacado: (a) => muro(a, 'destacado'),
  historias_recientes: historias, chat_global_listar: chatListar, chat_global_enviar: chatEnviar,
  jugadas_feed: jugadasFeedDemo, jugada_publicar: jugadaPublicarDemo,
  buscar_publicaciones: (a) => { const q = String(a.p_q ?? '').toLowerCase(); const r = publicaciones().filter((p) => p.texto.toLowerCase().includes(q)); const d = Number(a.p_desplazamiento) || 0; return { items: r.slice(d, d + (Number(a.p_limite) || 20)).map(sinExtra), hay_mas: false }; },
};
const SI_FALTA = { estadisticas_de: estadisticas, elo_de: elo };   // primero la base; si no hay datos visibles, lo simulado

/** Sustituto de supabase.rpc en modo demostración. `real()` hace la llamada de verdad. → { data, error } */
export async function rpcDemo(nombre, args, real) {
  if (SIMULADAS[nombre]) return { data: await SIMULADAS[nombre](args ?? {}), error: null };
  // Fase 2 (migración 135): lo inventado se simula; lo real (ids menores) va a la base
  const esDemo = (v) => Number(v) >= ID0 && Number(v) < ID0 + 1e6;
  if (nombre === 'muro_social_de') { const ids = args?.p_publicaciones ?? []; const r = ids.some((x) => !esDemo(x)) ? (await real()).data ?? {} : {}; return { data: { ...r, ...socialDe(args) }, error: null }; }
  if (nombre === 'muro_reacciones_de' && esDemo(args?.p_publicacion)) return { data: reaccionesDeDemo(args), error: null };
  if (nombre === 'muro_respuestas_de' && esDemo(args?.p_publicacion)) return { data: respuestasDeDemo(args), error: null };
  if (nombre === 'muro_likes_respuestas') { const ids = args?.p_respuestas ?? []; const r = ids.some((x) => !esDemo(x)) ? (await real()).data ?? {} : {}; return { data: { ...r, ...likesRespuestasDemo(args) }, error: null }; }
  if (nombre === 'muro_like_respuesta' && esDemo(args?.p_respuesta)) return { data: likeRespuestaDemo(args), error: null };
  if (nombre === 'muro_compartir' && esDemo(args?.p_publicacion)) return { data: compartirDemo(args), error: null };
  if (nombre === 'muro_registrar_vistas' && (args?.p_publicaciones ?? []).every(esDemo)) return { data: null, error: null };
  if (nombre === 'perfil_publico') { const g = GENTE.find((x) => x.username === String(args?.p_usuario ?? '')); if (g) { const k = GENTE.indexOf(g);
    return { data: { id: g.id, username: g.username, nombre_display: g.nombre, avatar_url: null, pais_codigo: ['PE', 'AR', 'CO', 'MX', 'CL', 'EC'][k % 6], club_favorito: ['AC Milan', 'Real Madrid', 'Boca Juniors', 'Liverpool', 'Barcelona', 'Inter'][k % 6], puede_hostear: k % 2 === 0, muro_lema: ['Juego para ganar', 'El toque fino nunca falla', 'Del barrio a la Galaxy'][k % 3], soy_yo: false, puede_ver_muro: true, visible: true, items: [], hay_mas: false }, error: null }; } }
  if (nombre === 'mi_racha_social') { const r = await real(); return { data: (r.data?.dias ?? 0) > 0 ? r.data : { dias: 4, hoy: true }, error: null }; }
  if (nombre === 'muro_extras_de') {
    const r = await real(); return { data: { ...(r.data ?? {}), ...extras(args) }, error: null };
  }
  if (nombre === 'jugada_reaccionar' && esDemo(args?.p_clip)) return { data: jugadaReaccionarDemo(args), error: null };
  // Reaccionar a algo inventado: se ve marcado, no se guarda; el mismo emoji otra vez la quita (como en la base)
  if (nombre === 'muro_reaccionar' && esDemo(args?.p_publicacion)) { const id = Number(args.p_publicacion); const t = args?.p_tipo ?? null; if (MIS_RX.get(id) === t) { MIS_RX.delete(id); return { data: null, error: null }; } MIS_RX.set(id, t); return { data: t, error: null }; }
  // Responder y borrar respuestas en publicaciones inventadas: se ven en esta pestaña
  if (nombre === 'muro_responder' && esDemo(args?.p_publicacion)) { const id = Number(args.p_publicacion); const l = MIS_RESP.get(id) ?? []; const r = { id: ID0 + 7000 + l.length + MIS_RESP.size * 50, autor_id: null, texto: String(args?.p_texto ?? '').slice(0, 600), created_at: new Date().toISOString(), nombre_display: 'Tú', username: '', avatar_url: null, puedo_borrar: true }; MIS_RESP.set(id, [...l, r]); return { data: r.id, error: null }; }
  if (nombre === 'muro_borrar_respuesta' && esDemo(args?.p_id)) { RESP_BORRADAS.add(Number(args.p_id)); return { data: null, error: null }; }
  if (Object.values(args ?? {}).some((v) => Number(v) >= ID0 && Number(v) < ID0 + 1e6)) return { data: null, error: null };   // acción sobre algo inventado
  // Entrar a una sala inventada: se reserva el puesto pero sin enlace (así no se abre Parsec hacia ningún equipo real).
  if ((nombre === 'ver_sala' || nombre === 'aceptar_sala') && String(args?.p_sala ?? '').startsWith('00000000-0000-4000-8000-9000')) return { data: { rol: nombre === 'ver_sala' ? 'espectador' : 'rival', enlace: null }, error: null };
  // Acciones sobre las personas inventadas (seguir, bloquear…): se aceptan sin ir a la base (sus uuid empiezan por 00000000-0000-4000-8000-9000)
  if (Object.values(args ?? {}).some((v) => typeof v === 'string' && v.startsWith('00000000-0000-4000-8000-9000'))) return { data: null, error: null };
  const r = await real();
  if (SI_FALTA[nombre] && (r.error || !r.data || r.data.visible !== true)) return { data: SI_FALTA[nombre](), error: null };
  return r;
}
