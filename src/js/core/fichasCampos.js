// Estadísticas e información de jugadores (migración 126, contrato docs/web-pes-link/CONTRATO-WEB-PES.md §2 «stats» / «info»).
// Lógica pura (sin DOM ni Supabase): catálogo de campos, armar los `datos` del cambio y textos «antes → después».
// El catálogo bueno vive en public.pes_fichas_campos; CAMPOS es la misma lista (para pruebas y si la tabla no responde).
// Las claves y rangos son los de Phoenix Link (SmashSoda/phoenix/link/Fichas.cpp): no cambiar una sin la otra.

export const CAMPOS = [
  ['ataque', 'stats', 'campo', 'Actitud ofensiva', 40, 99], ['control', 'stats', 'campo', 'Control del balón', 40, 99],
  ['regate', 'stats', 'campo', 'Regate', 40, 99], ['regate_ajustado', 'stats', 'campo', 'Conservación del balón', 40, 99],
  ['pase_raso', 'stats', 'campo', 'Pase raso', 40, 99], ['pase_bombeado', 'stats', 'campo', 'Pase bombeado', 40, 99],
  ['finalizacion', 'stats', 'campo', 'Finalización', 40, 99], ['cabezazo', 'stats', 'campo', 'Cabeceo', 40, 99],
  ['balon_parado', 'stats', 'campo', 'Balón parado', 40, 99], ['efecto', 'stats', 'campo', 'Efecto', 40, 99],
  ['velocidad', 'stats', 'campo', 'Velocidad', 40, 99], ['aceleracion', 'stats', 'campo', 'Aceleración', 40, 99],
  ['equilibrio', 'stats', 'campo', 'Equilibrio', 40, 99], ['contacto_fisico', 'stats', 'campo', 'Contacto físico', 40, 99],
  ['salto', 'stats', 'campo', 'Salto', 40, 99], ['resistencia', 'stats', 'campo', 'Resistencia', 40, 99],
  ['defensa', 'stats', 'campo', 'Actitud defensiva', 40, 99], ['recuperacion', 'stats', 'campo', 'Recuperación de balón', 40, 99],
  ['agresividad', 'stats', 'campo', 'Agresividad', 40, 99], ['potencia_tiro', 'stats', 'campo', 'Potencia de tiro', 40, 99],
  ['pt_despejar', 'stats', 'portero', 'Despejar (portero)', 40, 99], ['pt_cobertura', 'stats', 'portero', 'Cobertura (portero)', 40, 99],
  ['pt_reflejos', 'stats', 'portero', 'Reflejos (portero)', 40, 99], ['pt_actitud', 'stats', 'portero', 'Actitud de portero', 40, 99],
  ['pt_atajar', 'stats', 'portero', 'Atajar (portero)', 40, 99],
  ['pie_malo_uso', 'info', 'pie_malo', 'Uso del pie malo', 1, 4], ['pie_malo_precision', 'info', 'pie_malo', 'Precisión del pie malo', 1, 4],
  ['forma', 'info', 'estado', 'Forma (regularidad)', 1, 8], ['resistencia_lesiones', 'info', 'estado', 'Resistencia a lesiones', 1, 3],
  ['pos_pt', 'info', 'posicion', 'Posición PT', 0, 2], ['pos_dfc', 'info', 'posicion', 'Posición DFC', 0, 2],
  ['pos_li', 'info', 'posicion', 'Posición LI', 0, 2], ['pos_ld', 'info', 'posicion', 'Posición LD', 0, 2],
  ['pos_mcd', 'info', 'posicion', 'Posición MCD', 0, 2], ['pos_mc', 'info', 'posicion', 'Posición MC', 0, 2],
  ['pos_mi', 'info', 'posicion', 'Posición MI', 0, 2], ['pos_md', 'info', 'posicion', 'Posición MD', 0, 2],
  ['pos_mo', 'info', 'posicion', 'Posición MO', 0, 2], ['pos_ei', 'info', 'posicion', 'Posición EI', 0, 2],
  ['pos_ed', 'info', 'posicion', 'Posición ED', 0, 2], ['pos_sd', 'info', 'posicion', 'Posición SD', 0, 2],
  ['pos_dc', 'info', 'posicion', 'Posición DC', 0, 2],
  ['altura', 'info', 'basico', 'Altura (cm)', 150, 210], ['peso', 'info', 'basico', 'Peso (kg)', 45, 110],
  ['edad', 'info', 'basico', 'Edad', 15, 45], ['posicion_registrada', 'info', 'basico', 'Posición registrada', 0, 12],
].map(([clave, tipo, grupo, texto, minimo, maximo], orden) => ({ clave, tipo, grupo, texto, minimo, maximo, orden }));

export const GRUPOS = { campo: 'Estadísticas de campo', portero: 'Portero', pie_malo: 'Pie malo', estado: 'Forma y lesiones', posicion: 'Posiciones (A · B · C)', basico: 'Datos básicos' };
export const NIVEL_POSICION = ['C', 'B', 'A'];   // 0 = C (no la juega), 1 = B, 2 = A
export const POSICIONES = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MI', 'MD', 'MO', 'EI', 'ED', 'SD', 'DC'];   // orden del motor (posición registrada)

/** Campos de un tipo, en orden. `catalogo` = filas de pes_fichas_campos (si no hay, la lista de aquí). */
export function camposDe(tipo, catalogo = CAMPOS) {
  return [...(catalogo?.length ? catalogo : CAMPOS)].filter((c) => c.tipo === tipo).sort((a, b) => a.orden - b.orden);
}

/** Cómo se muestra un valor (posiciones con letra, posición registrada con nombre; null = «el de la base»). */
export function mostrarValor(clave, v) {
  if (v === null || v === undefined) return 'el de la base';
  if (clave === 'posicion_registrada') return POSICIONES[v] ?? String(v);
  if (clave.startsWith('pos_')) return NIVEL_POSICION[v] ?? String(v);
  return String(v);
}

const bytesUtf8 = (s) => new TextEncoder().encode(s).length;

/**
 * Arma los `datos` de un cambio stats/info (lo que recibe pes_cambio_crear). Lanza Error con un texto simple si algo está mal.
 * entrada: { tipo, jugador, jugadorId?, valores: {clave: número|''}, vigentes?: {clave: número|null} (lo que la web ya tiene), lmJugadorId? }
 * Solo van los campos rellenados y distintos de lo vigente. `antes` = lo vigente (si la web no tiene nada, no se pone: es el de la base).
 */
export function construirDatos({ tipo, jugador, jugadorId, valores, vigentes = {}, lmJugadorId } = {}, catalogo = CAMPOS) {
  if (tipo !== 'stats' && tipo !== 'info') throw new Error('Tipo de cambio desconocido.');
  const nombre = String(jugador ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!nombre) throw new Error('Elige un jugador.');
  if (bytesUtf8(nombre) > 48) throw new Error('El nombre del jugador es demasiado largo (máximo 48 letras).');
  const datos = { jugador: nombre, valores: {} };
  if (jugadorId !== undefined && jugadorId !== null && jugadorId !== '') {
    const id = Number(jugadorId);
    if (!Number.isInteger(id) || id < 1 || id > 99_999_999) throw new Error('El id de PES del jugador no es válido.');
    datos.jugador_id = id;
  }
  const antes = {};
  for (const c of camposDe(tipo, catalogo)) {
    const crudo = valores?.[c.clave];
    if (crudo === undefined || crudo === null || crudo === '') continue;
    const v = Number(crudo);
    if (!Number.isInteger(v) || v < c.minimo || v > c.maximo) throw new Error(`${c.texto}: tiene que ser un número entero entre ${c.minimo} y ${c.maximo}.`);
    const vig = vigentes?.[c.clave];
    if (vig === v) continue;   // ya está así en la web: no hace falta mandarlo
    datos.valores[c.clave] = v;
    if (vig !== undefined && vig !== null) antes[c.clave] = vig;
  }
  if (!Object.keys(datos.valores).length) throw new Error('No cambiaste ningún valor.');
  if (Object.keys(antes).length) datos.antes = antes;
  const lm = Number(lmJugadorId);
  if (lmJugadorId !== undefined && lmJugadorId !== null && lmJugadorId !== '' && Number.isInteger(lm) && lm > 0) datos.lm = { jugador_id: lm };
  return datos;
}

/** «Velocidad 90 → 95 · Altura (cm) → 181» (para el historial). */
export function textoCambio(datos, catalogo = CAMPOS) {
  const porClave = new Map((catalogo?.length ? catalogo : CAMPOS).map((c) => [c.clave, c]));
  return Object.entries(datos?.valores ?? {}).map(([k, v]) => {
    const c = porClave.get(k);
    const tieneAntes = datos?.antes && Object.prototype.hasOwnProperty.call(datos.antes, k);
    return `${c?.texto ?? k} ${tieneAntes ? `${mostrarValor(k, datos.antes[k])} → ` : '→ '}${mostrarValor(k, v)}`;
  }).join(' · ');
}

/** Vigentes de pes_fichas_vigentes (por lado) → { clave: valor } para un destino (base, lm; ambos = base). */
export function vigentesPlanos(vigentes, destino = 'base') {
  const lado = destino === 'lm' ? 'lm' : 'base';
  const r = {};
  for (const [k, x] of Object.entries(vigentes?.[lado] ?? {})) r[k] = x?.valor ?? null;
  return r;
}

/** Resumen de los PCs de un cambio del historial: { aplicado: 3, saltado: 1, … }. */
export function resumenPcs(pcs = []) {
  const r = {};
  for (const p of pcs) r[p.resultado] = (r[p.resultado] ?? 0) + 1;
  return r;
}

// ── Para la pantalla de edición (features/cambios/fichasUI.js): sin DOM, se prueba en tests/fichasCampos.test.mjs ──
/** Nivel de una estadística (40–99) para el color: flojo < 60 ≤ bajo < 70 ≤ medio < 80 ≤ alto < 90 ≤ elite. */
export const nivelStat = (v) => (v >= 90 ? 'elite' : v >= 80 ? 'alto' : v >= 70 ? 'medio' : v >= 60 ? 'bajo' : 'flojo');
/** Posición de cada puesto en el campo dibujado (en %: [izquierda, arriba]; la portería abajo). */
export const POS_CAMPO = {
  pos_pt: [50, 91], pos_dfc: [50, 79], pos_li: [13, 72], pos_ld: [87, 72], pos_mcd: [50, 63], pos_mc: [50, 50],
  pos_mi: [12, 46], pos_md: [88, 46], pos_mo: [50, 36], pos_ei: [15, 22], pos_ed: [85, 22], pos_sd: [50, 23], pos_dc: [50, 10],
};
/** Siguiente nivel al pulsar un puesto: sin cambio → A → B → C → sin cambio. Devuelve '' o '2' | '1' | '0'. */
export const siguienteNivelPos = (actual) => ({ '': '2', 2: '1', 1: '0', 0: '' }[actual === '' || actual == null ? '' : Number(actual)] ?? '');
/** Diferencia «nuevo − anterior» con signo, o '' si no hay con qué comparar. */
export const deltaTexto = (antes, despues) => (Number.isFinite(antes) && Number.isFinite(despues) && antes !== despues ? `${despues > antes ? '+' : '−'}${Math.abs(despues - antes)}` : '');

/** Dónde vive cada campo dentro del registro de Player.bin: [bit de inicio, ancho en bits, suma que da el valor que muestra el juego]. Mismos números que Link (Fichas.cpp)
 *  y que docs/web-pes-link/PROMPT-SISTEMA-DATOS-WEB-PES.md. Lo usan tools/plantillas/generar-fichas.mjs (leer) y core/fichaJuego.js (decodificar). */
export const BITS_PLAYER = {
  ataque: [370, 6, 40], control: [281, 6, 40], regate: [352, 6, 40], regate_ajustado: [416, 6, 40], pase_raso: [263, 6, 40], pase_bombeado: [402, 6, 40],
  finalizacion: [396, 6, 40], cabezazo: [288, 6, 40], balon_parado: [250, 6, 40], efecto: [332, 6, 40], velocidad: [306, 6, 40], aceleracion: [344, 6, 40],
  equilibrio: [376, 6, 40], contacto_fisico: [390, 6, 40], salto: [294, 6, 40], resistencia: [338, 6, 40], defensa: [275, 6, 40], recuperacion: [312, 6, 40],
  agresividad: [384, 6, 40], potencia_tiro: [358, 6, 40],
  pt_despejar: [269, 6, 40], pt_cobertura: [300, 6, 40], pt_reflejos: [320, 6, 40], pt_actitud: [326, 6, 40], pt_atajar: [364, 6, 40],
  pie_malo_uso: [454, 2, 1], pie_malo_precision: [462, 2, 1], forma: [438, 3, 1], resistencia_lesiones: [458, 2, 1],
  pos_pt: [350, 2, 0], pos_dfc: [468, 2, 0], pos_li: [318, 2, 0], pos_ld: [474, 2, 0], pos_mcd: [414, 2, 0], pos_mc: [456, 2, 0], pos_mi: [466, 2, 0],
  pos_md: [460, 2, 0], pos_mo: [464, 2, 0], pos_ei: [472, 2, 0], pos_ed: [476, 2, 0], pos_sd: [478, 2, 0], pos_dc: [470, 2, 0],
  altura: [216, 8, 100], peso: [256, 7, 30], edad: [408, 6, 15], posicion_registrada: [434, 4, 0],
};
/** Primer bit de las habilidades especiales y estilos COM (1 bit cada una) y cuántos son: 480 … 531. */
export const BITS_HABILIDADES = { desde: 480, cuantos: 52 };
