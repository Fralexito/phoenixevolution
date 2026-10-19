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
  ['¡Qué golazo de chilena en el minuto 89! 🔥 El que me lo empató ya sabe quién es 😎', 'galaxia', 'orgulloso'],
  ['Busco rival para un amistoso con el parche ConmeGOL, ping bajo desde Lima 🇵🇪', null, 'motivado'],
  ['Remontada 3–2 con diez jugadores. No me hablen por una semana 💪', 'atardecer', 'emocionado'],
  ['GG a todos los de la liga de anoche, nivelazo. ¿Revancha el sábado?', null, 'agradecido'],
  ['Nuevo récord: 12 partidos sin perder en la Liga Phoenix 🏆', 'neon', 'feliz'],
  ['¿Alguien más siente que el Milan de este parche está roto? 😂', null, 'picado'],
  ['Primera vez de host con Phoenix Link y salió perfecto, cero lag 👏', 'galaxia', 'feliz'],
  ['Me robaron el Clásico en el 93’. Penal inexistente 😤', null, 'picado'],
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

/* ---------- Estadísticas de cualquier perfil (si la base no tiene, se inventan) ---------- */
const estadisticas = () => ({ visible: true, jugados: 48, victorias: 29, empates: 8, derrotas: 11, gf: 97, gc: 61, efectividad: 69 });
const elo = () => ({ visible: true, elo: 1386, jugados: 31, delta: 12 });

const SIMULADAS = {
  salas_en_vivo: salasEnVivo, radar_salas: radarSalas, ticker_comunidad: ticker,
  muro_comunidad: (a) => muro(a), muro_siguiendo: (a) => muro(a), muro_destacado: (a) => muro(a, 'destacado'),
};
const SI_FALTA = { estadisticas_de: estadisticas, elo_de: elo };   // primero la base; si no hay datos visibles, lo simulado

/** Sustituto de supabase.rpc en modo demostración. `real()` hace la llamada de verdad. → { data, error } */
export async function rpcDemo(nombre, args, real) {
  if (SIMULADAS[nombre]) return { data: SIMULADAS[nombre](args ?? {}), error: null };
  if (nombre === 'muro_extras_de') {
    const r = await real(); return { data: { ...(r.data ?? {}), ...extras(args) }, error: null };
  }
  if (Object.values(args ?? {}).some((v) => Number(v) >= ID0 && Number(v) < ID0 + 1e6)) return { data: null, error: null };   // acción sobre algo inventado
  const r = await real();
  if (SI_FALTA[nombre] && (r.error || !r.data || r.data.visible !== true)) return { data: SI_FALTA[nombre](), error: null };
  return r;
}
