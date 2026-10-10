// Núcleo puro de la API /v1 de Phoenix para Smash Soda (sin red ni BD: se prueba con `npm test`).
// Contrato completo: claude/contrato-v1.md. Si cambias algo aquí que cambie el JSON, actualiza el contrato Y sube CONFIG.version_api.

/** Ajustes que la app lee de GET /v1/config. Cambiarlos aquí y redesplegar = cambiar el comportamiento de la app sin recompilarla. */
export const CONFIG = Object.freeze({
  version_api: '1.10.0',
  version_app_min: '7.0.4',          // por debajo → APP_DESACTUALIZADA
  version_app_recomendada: '7.0.4',
  intervalos: Object.freeze({ latido_seg: 30, latido_min_seg: 10, eventos_lote_max: 50, eventos_envio_seg: 15, ping_vivo_seg: 4, reintento_max_seg: 300, presencia_seg: 60, sondeo_salas_seg: 25, sondeo_amigos_seg: 30, sondeo_buzon_seg: 15, sondeo_sync_seg: 10, sondeo_chat_seg: 5, sondeo_noticias_seg: 60 }),
  interruptores: Object.freeze({ integracion: true, muestras_calidad: true, ping_en_vivo: false, roles_reto: true, buzon_juego: true, sync_compartido: true, chat_global: true, noticias: true }),
  limites: Object.freeze({ invitados_max: 16, nombre_pc_max: 40, enlace_max: 500, datos_evento_bytes: 4096, sync_option_bytes_max: 8388608, sync_resultados_max: 50, chat_texto_max: 300 }),
});

/** Catálogo cerrado de errores: la app reacciona por `codigo`, nunca por `mensaje`. */
export const ERRORES = Object.freeze({
  JSON_INVALIDO:        { http: 400, reintentable: false, mensaje: 'El cuerpo no es JSON válido.' },
  CAMPO_INVALIDO:       { http: 422, reintentable: false, mensaje: 'Un campo falta o tiene un valor no permitido.' },
  RUTA_NO_EXISTE:       { http: 404, reintentable: false, mensaje: 'Esa ruta no existe en /v1.' },
  METODO_NO_PERMITIDO:  { http: 405, reintentable: false, mensaje: 'Método HTTP no permitido en esta ruta.' },
  TOKEN_FALTANTE:       { http: 401, reintentable: false, mensaje: 'Falta la cabecera Authorization: Bearer <token>.' },
  TOKEN_INVALIDO:       { http: 401, reintentable: false, mensaje: 'Token desconocido: vuelve a vincular la PC.' },
  TOKEN_REVOCADO:       { http: 401, reintentable: false, mensaje: 'Esta PC fue desvinculada desde la web.' },
  HOST_NO_AUTORIZADO:   { http: 403, reintentable: false, mensaje: 'Tu cuenta no está aprobada como host por el staff.' },
  APP_DESACTUALIZADA:   { http: 426, reintentable: false, mensaje: 'Actualiza Smash Soda para seguir usando la integración.' },
  CODIGO_INVALIDO:      { http: 400, reintentable: false, mensaje: 'El código no tiene el formato correcto.' },
  CODIGO_NO_ENCONTRADO: { http: 404, reintentable: false, mensaje: 'Código incorrecto.' },
  CODIGO_VENCIDO:       { http: 410, reintentable: false, mensaje: 'El código venció: genera otro en la web.' },
  CODIGO_USADO:         { http: 410, reintentable: false, mensaje: 'Ese código ya se usó: genera otro en la web.' },
  DEMASIADOS_INTENTOS:  { http: 429, reintentable: true,  mensaje: 'Demasiadas peticiones: espera y reintenta.' },
  SALA_NO_ENCONTRADA:   { http: 404, reintentable: false, mensaje: 'La sala no existe o no es de esta PC.' },
  SALA_CERRADA:         { http: 409, reintentable: false, mensaje: 'La sala ya está cerrada: abre una nueva.' },
  DISPOSITIVO_SUSPENDIDO:{ http: 403, reintentable: false, mensaje: 'El staff suspendió esta PC. Consulta en Discord.' },
  BUILD_NO_OFICIAL:     { http: 403, reintentable: false, mensaje: 'Este Smash Soda no es un build oficial de Phoenix.' },
  BUILD_DESACTIVADO:    { http: 403, reintentable: false, mensaje: 'Este build fue desactivado: descarga el oficial más reciente.' },
  VERSION_DESACTIVADA:  { http: 403, reintentable: false, mensaje: 'Esta versión de Smash Soda fue desactivada: actualiza.' },
  SIN_VERSION_PUBLICADA:{ http: 503, reintentable: false, mensaje: 'Aún no hay una versión de Phoenix Soda publicada.' },
  MODO_NO_VALIDO:       { http: 422, reintentable: false, mensaje: 'Ese modo de sala necesita datos que faltan o no aplican.' },
  TORNEO_NO_VALIDO:     { http: 422, reintentable: false, mensaje: 'El torneo privado no existe o no está en curso.' },
  ORG_NO_AUTORIZADO:    { http: 403, reintentable: false, mensaje: 'No eres host de la organización de ese torneo.' },
  LICENCIA_VENCIDA:     { http: 403, reintentable: false, mensaje: 'La licencia de la organización venció.' },
  HOST_NO_NEUTRAL:      { http: 403, reintentable: false, mensaje: 'En un partido oficial el host no puede ser uno de los jugadores.' },
  NO_SON_AMIGOS:        { http: 403, reintentable: false, mensaje: 'Solo puedes invitar a tus amigos (y sin bloqueos entre ustedes).' },
  RETO_NO_VALIDO:       { http: 422, reintentable: false, mensaje: 'El reto no existe, no está aceptado o no eres su host.' },
  LOTE_DEMASIADO_GRANDE:{ http: 413, reintentable: false, mensaje: 'Demasiados eventos en un lote.' },
  SIN_PERMISO:          { http: 403, reintentable: false, mensaje: 'Tu rol en el grupo no permite esta acción.' },
  GRUPO_NO_ENCONTRADO:  { http: 404, reintentable: false, mensaje: 'El grupo de Phoenix Sync no existe o no eres miembro.' },
  OPERACION_INVALIDA:   { http: 422, reintentable: false, mensaje: 'La operación (fichaje) no es válida.' },
  OPERACION_NO_ENCONTRADA:{ http: 404, reintentable: false, mensaje: 'Esa operación no existe o no es de tu grupo.' },
  OPTION_INVALIDA:      { http: 422, reintentable: false, mensaje: 'El archivo no coincide con lo declarado (tamaño o subida incompleta).' },
  OPTION_NO_ENCONTRADA: { http: 404, reintentable: false, mensaje: 'Aún no hay una versión del archivo para este grupo.' },
  LIMITE_EXCEDIDO:      { http: 429, reintentable: true,  mensaje: 'Límite por hora alcanzado: espera y reintenta.' },
  MENSAJE_INVALIDO:     { http: 400, reintentable: false, mensaje: 'El mensaje está vacío o supera el largo permitido.' },
  CUENTA_SANCIONADA:    { http: 403, reintentable: false, mensaje: 'Tu cuenta está sancionada y no puede escribir ahora.' },
  CHAT_PAUSADO:         { http: 503, reintentable: true,  mensaje: 'El chat general está en pausa por el staff.' },
  SYNC_PAUSADO:         { http: 503, reintentable: true,  mensaje: 'Phoenix Sync está en pausa por el staff.' },
  ERROR_INTERNO:        { http: 500, reintentable: true,  mensaje: 'Error del servidor: reintenta con espera.' },
});

/** Error con código del catálogo; `campo` y `reintentar_en` son opcionales. */
export class ErrorApi extends Error {
  constructor(codigo, extra = {}) {
    const def = ERRORES[codigo] ?? ERRORES.ERROR_INTERNO;
    super(extra.mensaje ?? def.mensaje);
    this.codigo = ERRORES[codigo] ? codigo : 'ERROR_INTERNO';
    this.http = def.http; this.reintentable = def.reintentable;
    this.campo = extra.campo ?? null; this.reintentar_en = extra.reintentar_en ?? null;
  }
}

/** Cuerpo JSON de un error (sobre fijo). */
export function cuerpoError(err, solicitudId) {
  const e = err instanceof ErrorApi ? err : new ErrorApi('ERROR_INTERNO');
  const out = { ok: false, codigo: e.codigo, mensaje: e.message, reintentable: e.reintentable, solicitud_id: solicitudId };
  if (e.campo) out.campo = e.campo;
  if (e.reintentar_en) out.reintentar_en = e.reintentar_en;
  return out;
}

/** Compara versiones «7.0.4» (componentes numéricos; lo que no sea número cuenta como 0). */
export function compararVersion(a, b) {
  const pa = String(a ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

// ── Validadores: devuelven el valor limpio o lanzan CAMPO_INVALIDO con el nombre del campo ──
const falla = (campo, mensaje) => { throw new ErrorApi('CAMPO_INVALIDO', { campo, mensaje }); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const v = {
  uuid(x, campo) { if (typeof x !== 'string' || !UUID.test(x)) falla(campo, `${campo} debe ser un UUID.`); return x.toLowerCase(); },
  texto(x, campo, { max = 60, opcional = true } = {}) {
    if (x === undefined || x === null || x === '') { if (opcional) return null; falla(campo, `${campo} es obligatorio.`); }
    if (typeof x !== 'string') falla(campo, `${campo} debe ser texto.`);
    const t = x.trim(); if (!t && !opcional) falla(campo, `${campo} es obligatorio.`);
    if (t.length > max) falla(campo, `${campo} admite hasta ${max} caracteres.`);
    return t || null;
  },
  entero(x, campo, { min = 0, max = 2147483647, opcional = true } = {}) {
    if (x === undefined || x === null) { if (opcional) return null; falla(campo, `${campo} es obligatorio.`); }
    if (!Number.isInteger(x) || x < min || x > max) falla(campo, `${campo} debe ser un entero entre ${min} y ${max}.`);
    return x;
  },
  enumerado(x, campo, opciones, { opcional = true } = {}) {
    if (x === undefined || x === null) { if (opcional) return null; falla(campo, `${campo} es obligatorio.`); }
    if (!opciones.includes(x)) falla(campo, `${campo} debe ser uno de: ${opciones.join(', ')}.`);
    return x;
  },
  numero(x, campo, { min = 0, max = 1e9, opcional = true } = {}) {
    if (x === undefined || x === null) { if (opcional) return null; falla(campo, `${campo} es obligatorio.`); }
    if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) falla(campo, `${campo} debe ser un número entre ${min} y ${max}.`);
    return x;
  },
  booleano(x, campo, porDefecto) {
    if (x === undefined || x === null) return porDefecto;
    if (typeof x !== 'boolean') falla(campo, `${campo} debe ser true o false.`);
    return x;
  },
  huella(x) {
    if (x === undefined || x === null || x === '') return null;
    const t = typeof x === 'string' ? x.trim().toLowerCase() : '';
    if (!/^[0-9a-f]{64}$/.test(t)) falla('x-phoenix-build', 'La huella del build son 64 caracteres hexadecimales (SHA-256).');
    return t;
  },
  enlace(x, campo) {
    const t = v.texto(x, campo, { max: CONFIG.limites.enlace_max });
    if (t && !/^https:\/\/\S+$/.test(t)) falla(campo, `${campo} debe empezar por https://`);
    return t;
  },
  parsecId(x, campo) {
    const t = typeof x === 'number' ? String(x) : x;
    if (typeof t !== 'string' || !/^[0-9]{1,20}$/.test(t)) falla(campo, `${campo} son solo dígitos (ID de Parsec).`);
    return t;
  },
  codigoInstalacion(x) {
    const t = typeof x === 'string' ? x.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(t)) throw new ErrorApi('CODIGO_INVALIDO');
    return `${t.slice(0, 4)}-${t.slice(4)}`;
  },
  codigo(x) {
    const t = typeof x === 'string' ? x.replace(/\D/g, '') : '';
    if (t.length !== 6) throw new ErrorApi('CODIGO_INVALIDO');
    return t;
  },
};

export const ESTADOS_LATIDO = ['abierta', 'en_partida'];
export const VISIBILIDADES_APP = ['publica', 'amigos', 'privada'];
export const MODOS_SALA = ['amistoso', 'torneo_privado', 'oficial'];
export const ESTADOS_PRESENCIA_APP = ['disponible', 'ausente', 'en_sala', 'en_partida'];
export const TIPOS_EVENTO_APP = ['entra', 'sale', 'desconexion', 'reconexion', 'expulsion', 'cambio_mando',
  'partida_inicio', 'partida_fin', 'pausa', 'plazas_ampliadas', 'espera_rechazada'];

/** Lista de invitados del latido → filas limpias (ignora duplicados por parsec_id; corta a invitados_max). */
export function limpiarInvitados(lista) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) falla('invitados', 'invitados debe ser una lista.');
  if (lista.length > CONFIG.limites.invitados_max) falla('invitados', `Máximo ${CONFIG.limites.invitados_max} invitados.`);
  const vistos = new Set(); const out = [];
  lista.forEach((g, i) => {
    if (!g || typeof g !== 'object') falla(`invitados[${i}]`, 'Cada invitado debe ser un objeto.');
    const parsec_id = v.parsecId(g.parsec_id, `invitados[${i}].parsec_id`);
    if (vistos.has(parsec_id)) return; vistos.add(parsec_id);
    out.push({
      parsec_id,
      nombre: v.texto(g.nombre, `invitados[${i}].nombre`, { max: 60 }),
      ping_ms: v.entero(g.ping_ms, `invitados[${i}].ping_ms`, { max: 10000 }),
      fast_rts: v.entero(g.fast_rts, `invitados[${i}].fast_rts`),
      slow_rts: v.entero(g.slow_rts, `invitados[${i}].slow_rts`),
      bitrate_kbps: v.entero(g.bitrate_kbps, `invitados[${i}].bitrate_kbps`),
    });
  });
  return out;
}

/**
 * Lote de eventos → { validos, rechazados }. Un evento malo NO tumba el lote: se rechaza solo ese (la app no debe reintentarlo).
 * `ahora` (ms) se inyecta para poder probar. Fechas fuera de [-7 días, +5 min] se reemplazan por la hora del servidor.
 */
export function limpiarEventos(lista, ahora = Date.now()) {
  if (!Array.isArray(lista)) falla('eventos', 'eventos debe ser una lista.');
  if (lista.length > CONFIG.intervalos.eventos_lote_max) throw new ErrorApi('LOTE_DEMASIADO_GRANDE');
  const validos = []; const rechazados = []; const claves = new Set();
  for (const e of lista) {
    const clave = typeof e?.clave === 'string' ? e.clave : null;
    try {
      if (!clave || clave.length < 8 || clave.length > 80) falla('clave', 'clave debe tener entre 8 y 80 caracteres.');
      if (claves.has(clave)) continue; claves.add(clave);
      const tipo = v.enumerado(e.tipo, 'tipo', TIPOS_EVENTO_APP, { opcional: false });
      let ms = Date.parse(e.ocurrido); if (!Number.isFinite(ms) || ms < ahora - 7 * 864e5 || ms > ahora + 5 * 6e4) ms = ahora;
      const datos = e.datos === undefined || e.datos === null ? {} : e.datos;
      if (typeof datos !== 'object' || Array.isArray(datos)) falla('datos', 'datos debe ser un objeto.');
      if (new TextEncoder().encode(JSON.stringify(datos)).length > CONFIG.limites.datos_evento_bytes) falla('datos', 'datos supera 4 KB.');
      const actor_parsec = e.actor_parsec === undefined || e.actor_parsec === null ? null : v.parsecId(e.actor_parsec, 'actor_parsec');
      validos.push({ clave, tipo, ocurrido: new Date(ms).toISOString(), actor_parsec, datos });
    } catch (err) {
      rechazados.push({ clave, codigo: 'CAMPO_INVALIDO', campo: err.campo ?? null, mensaje: err.message });
    }
  }
  return { validos, rechazados };
}

/**
 * Lista de roles de una sala de reto: lado A → mandos 1..n, lado B → siguientes; espectadores sin mando (pad_limit 0).
 * `participantes`: [{ usuario_id, lado: 'A'|'B' }] en orden (retador primero). `parsec`: Map usuario → parsec_id.
 */
/** @param {{ participantes?: Array<{ usuario_id: string, lado: string }>, espectadores?: string[], staff?: string[], parsec?: Map<string, string>, nombres?: Map<string, string|null> }} p */
export function construirRoles({ participantes = [], espectadores = [], staff = [], parsec = new Map(), nombres = new Map() }) {
  const jugadores = []; const usados = new Set();
  const ordenados = [...participantes.filter((p) => p.lado === 'A'), ...participantes.filter((p) => p.lado === 'B')];
  for (const p of ordenados) {
    if (usados.has(p.usuario_id)) continue; usados.add(p.usuario_id);
    jugadores.push({ usuario_id: p.usuario_id, nombre: nombres.get(p.usuario_id) ?? null, parsec_id: parsec.get(p.usuario_id) ?? null, lado: p.lado, mando: jugadores.length + 1 });
  }
  const mirar = (ids, rol) => ids.filter((id) => !usados.has(id) && (usados.add(id), true))
    .map((id) => ({ usuario_id: id, nombre: nombres.get(id) ?? null, parsec_id: parsec.get(id) ?? null, rol, pad_limit: 0 }));
  return { modo: 'reto', jugadores, espectadores: [...mirar(espectadores, 'espectador'), ...mirar(staff, 'staff')] };
}

/** Mezcla la config fija con las filas de phoenix_config (clave → valor). Valores con tipo incorrecto se ignoran. */
export function fusionarConfig(base, filas = []) {
  const out = { version_app_min: base.version_app_min, version_app_recomendada: base.version_app_recomendada, exigir_build: false,
                intervalos: { ...base.intervalos }, interruptores: { ...base.interruptores } };
  const VER = /^[0-9]+(\.[0-9]+){1,3}$/;
  for (const { clave, valor } of filas) {
    if ((clave === 'version_app_min' || clave === 'version_app_recomendada') && typeof valor === 'string' && VER.test(valor)) out[clave] = valor;
    else if (clave === 'exigir_build' && typeof valor === 'boolean') out.exigir_build = valor;
    else if ((clave === 'intervalos' || clave === 'interruptores') && valor && typeof valor === 'object' && !Array.isArray(valor)) {
      for (const [k, x] of Object.entries(valor)) {
        if (!(k in base[clave])) continue;                                  // claves desconocidas: fuera
        if (typeof x === typeof base[clave][k]) out[clave][k] = x;
      }
    }
  }
  if (out.intervalos.latido_seg < 10) out.intervalos.latido_seg = 10;      // frenos de seguridad: un error de staff no puede saturar el plan FREE
  if (out.intervalos.latido_min_seg < 5) out.intervalos.latido_min_seg = 5;
  if (out.intervalos.sondeo_buzon_seg < 5) out.intervalos.sondeo_buzon_seg = 5;
  if (out.intervalos.sondeo_sync_seg < 5) out.intervalos.sondeo_sync_seg = 5;
  if (out.intervalos.sondeo_chat_seg < 3) out.intervalos.sondeo_chat_seg = 3;
  if (out.intervalos.sondeo_noticias_seg < 60) out.intervalos.sondeo_noticias_seg = 60;   // Última hora: nunca más seguido que cada 60 s
  return out;
}

/**
 * ¿Este build puede hablar con /v1? → null (sí) o un código de error.
 * `builds`: filas { huella_sha256, version, activo } (todas). Orden: build desactivado > versión desactivada > exigencia de build oficial.
 */
/** @param {{ huella?: string|null, version?: string|null, builds?: Array<{ huella_sha256: string, version: string, activo: boolean }>, exigir?: boolean }} p */
export function evaluarBuild({ huella, version, builds = [], exigir = false }) {
  const propio = huella ? builds.find((b) => b.huella_sha256 === huella) : null;
  if (propio && !propio.activo) return 'BUILD_DESACTIVADO';
  if (version) {
    const deEsa = builds.filter((b) => b.version === version);
    if (deEsa.length && deEsa.every((b) => !b.activo)) return 'VERSION_DESACTIVADA';
  }
  if (exigir && !propio) return 'BUILD_NO_OFICIAL';
  return null;
}

/**
 * Marca que la app debe pintar en Phoenix Glass según las reglas: phoenix | organizacion | liga.
 * `org`: { nombre, logo_url, color_primario, color_secundario } o null. Si las reglas piden la de la organización y no hay, cae a Phoenix.
 */
export function marcaDe(reglas, org) {
  const phoenix = { tipo: 'phoenix', nombre: 'Phoenix Evolution Series', logo_url: null, color_primario: '#00e5ff', color_secundario: '#7c3aed' };
  if (reglas?.marca === 'organizacion' && org) {
    return { tipo: 'organizacion', nombre: org.nombre, logo_url: org.logo_url ?? null, color_primario: org.color_primario, color_secundario: org.color_secundario };
  }
  if (reglas?.marca === 'liga') return { ...phoenix, tipo: 'liga', tema: 'galaxy' };
  return phoenix;
}

/**
 * Sugerencias automáticas a partir de la SUBIDA medida del host (autodiagnóstico).
 * Regla: usar como máximo el 70 % de la subida (margen para picos y para el resto de la casa); cada jugador necesita ~8 Mbps
 * para buena imagen y cada espectador ~3 Mbps. Son SUGERENCIAS: la app puede ajustarlas y el host decide.
 */
export function sugerenciasHost(subidaKbps, jugadores = 2) {
  if (!Number.isFinite(subidaKbps) || subidaKbps <= 0) return { bitrate_total_kbps: null, limite_espectadores: null, alcanza_para_jugadores: false };
  const util = Math.floor(subidaKbps * 0.7);
  const bitrate = Math.min(util, 50000);
  const sobra = bitrate - jugadores * 8000;
  return { bitrate_total_kbps: bitrate, limite_espectadores: Math.max(0, Math.min(16, Math.floor(sobra / 3000))), alcanza_para_jugadores: sobra >= 0 };
}

/**
 * Retraso al host sugerido para igualar al rival: la mitad de su ida y vuelta (lo que tarda su mando en llegar).
 * `maximoMs` = reglas.retraso_host_ms (lo que el perfil permite; 0 = no se aplica). Tope absoluto 250 ms.
 */
export function retrasoSugerido(latenciaMs, maximoMs = 0) {
  if (!Number.isFinite(latenciaMs) || latenciaMs <= 0) return { sugerido_ms: 0, permitido_ms: Math.max(0, maximoMs || 0), aplicar_ms: 0 };
  const sugerido = Math.min(250, Math.round(latenciaMs / 2));
  const permitido = Math.max(0, Math.min(500, maximoMs || 0));
  return { sugerido_ms: sugerido, permitido_ms: permitido, aplicar_ms: Math.min(sugerido, permitido) };
}

/**
 * Huella de contenido para ETag (FNV-1a de 64 bits, en hex). No es criptográfica: solo detecta «¿cambió algo?».
 * `sinCampos`: claves que cambian a cada rato sin importar (p. ej. «desde») y no deben invalidar la caché del cliente.
 */
export function huellaContenido(datos, sinCampos = []) {
  const quitar = new Set(sinCampos);
  const texto = JSON.stringify(datos, (k, v) => (quitar.has(k) ? undefined : v));
  let h = 0xcbf29ce484222325n; const P = 0x100000001b3n; const M = (1n << 64n) - 1n;
  for (const b of new TextEncoder().encode(texto)) { h ^= BigInt(b); h = (h * P) & M; }
  return `W/"${h.toString(16).padStart(16, '0')}"`;
}

/** ¿El ETag que trae el cliente (If-None-Match o ?etag=) coincide? Acepta lista separada por comas, con o sin «W/», y «*». */
export function coincideEtag(delCliente, actual) {
  if (!delCliente || !actual) return false;
  const limpio = (x) => x.trim().replace(/^W\//, '');
  return delCliente.split(',').some((x) => x.trim() === '*' || limpio(x) === limpio(actual));
}

// ── Phoenix Sync compartido (1.8.0 · migración 098) ─────────────────────────────────────────────────────────────────
export const MODOS_SYNC = ['automatico', 'autorizacion'];
export const ESTADOS_APLICACION = ['aplicada', 'conflicto', 'omitida', 'rechazada', 'incompatible'];

/** Regla del contrato: lo que no sea un modo conocido se trata como `autorizacion` (lo más seguro). */
export function modoSeguro(m) { return MODOS_SYNC.includes(m) ? m : 'autorizacion'; }

const HEX64 = /^[0-9a-f]{64}$/;
const ID_MAX = 2147483647;

/** POST /v1/sync/operaciones → { grupo_id, op } con todo validado (enteros razonables, textos con largo máximo). */
export function limpiarOperacion(b) {
  const grupo_id = v.uuid(b.grupo_id, 'grupo_id');
  const tipo = v.enumerado(b.tipo, 'tipo', ['fichaje']) ?? 'fichaje';
  const sha = v.texto(b.sha256_resultado, 'sha256_resultado', { max: 64 });
  if (sha && !HEX64.test(sha.toLowerCase())) falla('sha256_resultado', 'sha256_resultado son 64 caracteres hexadecimales.');
  const base_seq = b.base_seq === undefined || b.base_seq === null ? 0 : b.base_seq;
  if (!Number.isInteger(base_seq) || base_seq < 0 || base_seq > Number.MAX_SAFE_INTEGER) falla('base_seq', 'base_seq debe ser un entero mayor o igual a 0.');
  const op = {
    op_id: v.uuid(b.op_id, 'op_id'), tipo,
    jugador_id: v.entero(b.jugador_id, 'jugador_id', { min: 0, max: ID_MAX, opcional: false }),
    equipo_origen: v.entero(b.equipo_origen, 'equipo_origen', { min: 0, max: ID_MAX, opcional: false }),
    equipo_destino: v.entero(b.equipo_destino, 'equipo_destino', { min: 0, max: ID_MAX, opcional: false }),
    base_seq, sha256_resultado: sha ? sha.toLowerCase() : null,
    resumen: v.texto(b.resumen, 'resumen', { max: 200 }), parche: v.texto(b.parche, 'parche', { max: 60 }),
    huella_bd: v.texto(b.huella_bd, 'huella_bd', { max: 128 }), formato: v.entero(b.formato, 'formato', { min: 0, max: 1000 }),
  };
  return { grupo_id, op };
}

/** POST /v1/sync/operaciones/aplicada: acepta un resultado suelto { op_id, estado, motivo? } o un lote { resultados: [...] }. */
export function limpiarResultados(b) {
  const lista = Array.isArray(b.resultados) ? b.resultados : (b.resultados === undefined ? [b] : falla('resultados', 'resultados debe ser una lista.'));
  if (!lista.length || lista.length > CONFIG.limites.sync_resultados_max) falla('resultados', `Envía de 1 a ${CONFIG.limites.sync_resultados_max} resultados.`);
  return { unico: !Array.isArray(b.resultados), resultados: lista.map((e, i) => {
    if (!e || typeof e !== 'object') falla(`resultados[${i}]`, 'Cada resultado debe ser un objeto.');
    return { op_id: v.uuid(e.op_id, `resultados[${i}].op_id`), estado: v.enumerado(e.estado, `resultados[${i}].estado`, ESTADOS_APLICACION, { opcional: false }),
             motivo: v.texto(e.motivo, `resultados[${i}].motivo`, { max: 300 }) };
  }) };
}

/** POST /v1/sync/option: datos del archivo entero (EDIT00000000) antes de subirlo. */
export function limpiarOption(b) {
  const sha = v.texto(b.sha256, 'sha256', { max: 64, opcional: false }).toLowerCase();
  if (!HEX64.test(sha)) falla('sha256', 'sha256 son 64 caracteres hexadecimales.');
  return { grupo_id: v.uuid(b.grupo_id, 'grupo_id'), d: { sha256: sha,
    tamano: v.entero(b.tamano, 'tamano', { min: 1, max: CONFIG.limites.sync_option_bytes_max, opcional: false }),
    resumen: v.texto(b.resumen, 'resumen', { max: 200 }), parche: v.texto(b.parche, 'parche', { max: 60 }), huella_bd: v.texto(b.huella_bd, 'huella_bd', { max: 128 }) } };
}

// ── Chat general compartido con Phoenix Link (1.9.0 · migración 099) ───────────────────────────────────────────────────
/** POST /v1/chat/global { texto } → texto limpio (espacios y saltos de línea juntos en uno). Vacío o > 300 → MENSAJE_INVALIDO (400). */
export function limpiarMensajeChat(b) {
  const max = CONFIG.limites.chat_texto_max;
  const t = typeof b?.texto === 'string' ? b.texto.replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim() : '';
  if (!t) throw new ErrorApi('MENSAJE_INVALIDO', { campo: 'texto', mensaje: 'Escribe algo antes de enviar.' });
  if ([...t].length > max) throw new ErrorApi('MENSAJE_INVALIDO', { campo: 'texto', mensaje: `El mensaje admite hasta ${max} caracteres.` });
  return t;
}

/** GET /v1/chat/global?desde=<id>&limite=50 → { desde, limite }. Sin `desde` (o 0) = los últimos `limite` mensajes. */
export function limpiarConsultaChat(q) {
  const crudo = q.get('desde');
  const desde = crudo === null || crudo === '' ? 0 : Number(crudo);
  if (!Number.isInteger(desde) || desde < 0) falla('desde', 'desde debe ser el id (entero ≥ 0) del último mensaje que ya tienes.');
  const lim = q.get('limite');
  const limite = lim === null || lim === '' ? 50 : Number(lim);
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) falla('limite', 'limite debe ser un entero entre 1 y 100.');
  return { desde, limite };
}
