// CAMBIOS OFICIALES web → PES (migración 125, docs/web-pes-link/CONTRATO-WEB-PES.md). Lógica pura: sin DOM ni red (se prueba en tests/cambiosOficiales.test.mjs).
// Enchufes (contrato §6): cada tipo (fichaje, stats, info, dinero, valor…) se registra con registrarTipo() desde src/js/features/cambios/<tipo>.js.

/** Las tres casillas del formulario único. */
export const DESTINOS = [
  { id: 'base', nombre: 'Base normal', ayuda: 'Amistosos: llega solo al PES de todos los que usan Phoenix Link.' },
  { id: 'lm', nombre: 'Liga Máster', ayuda: 'Solo la Liga Máster de la web (lo aplica el motor de Liga Máster).' },
  { id: 'ambos', nombre: 'Las dos', ayuda: 'Un solo cambio con dos resultados: base normal y Liga Máster.' },
];
export const destinoValido = (d) => DESTINOS.some((x) => x.id === d);
export const incluyeBase = (d) => d === 'base' || d === 'ambos';
export const incluyeLm = (d) => d === 'lm' || d === 'ambos';

const tipos = new Map();
/** Registra un tipo de cambio: { tipo, etiqueta, destinos, pintar(contenedor, ctx), leer() → datos (lanza Error con mensaje para Fralex) }. */
export function registrarTipo(def) {
  if (!def || !/^[a-z_]{3,30}$/.test(def.tipo ?? '')) throw new Error('Tipo de cambio sin nombre válido.');
  if (typeof def.pintar !== 'function' || typeof def.leer !== 'function') throw new Error(`El tipo «${def.tipo}» necesita pintar() y leer().`);
  const destinos = (def.destinos ?? ['base', 'lm', 'ambos']).filter(destinoValido);
  tipos.set(def.tipo, { etiqueta: def.tipo, ...def, destinos });
  return tipos.get(def.tipo);
}
export const tipoRegistrado = (t) => tipos.get(t) ?? null;
/** Tipos que se pueden usar: registrados en la web Y encendidos en la base (pes_tipos_cambio.activo). Los destinos, los que permitan los dos. */
export function tiposDisponibles(catalogo) {
  const activos = new Map((catalogo ?? []).filter((c) => c?.activo).map((c) => [c.tipo, c]));
  return [...tipos.values()].filter((t) => activos.has(t.tipo)).map((t) => {
    const c = activos.get(t.tipo);
    const permitidos = Array.isArray(c.destinos) ? c.destinos : t.destinos;
    return { ...t, etiqueta: c.etiqueta || t.etiqueta, destinos: t.destinos.filter((d) => permitidos.includes(d)) };
  });
}

// ─── Fichaje ─────────────────────────────────────────────────────────────────────────────────────
const bytes = (s) => new TextEncoder().encode(s).length;
export const limpiarNombre = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
const idOpcional = (v, campo, min) => {
  const t = String(v ?? '').trim();
  if (t === '') return null;
  if (!/^[0-9]{1,8}$/.test(t) || Number(t) < min) throw new Error(`El ${campo} debe ser un número de PES (o déjalo vacío).`);
  return Number(t);
};
/** Lo mismo que valida la base (private.pes_fichaje_normalizar), para avisar antes de enviar. Nombres ≤ 48 BYTES (Link). */
export function validarFichaje(f) {
  const jugador = limpiarNombre(f?.jugador), desde = limpiarNombre(f?.desde), hasta = limpiarNombre(f?.hasta);
  if (!jugador) throw new Error('Escribe el nombre del jugador tal como sale en el PES.');
  if (!hasta) throw new Error('Escribe el equipo al que va.');
  if (!desde && !f?.libre) throw new Error('Escribe el equipo del que sale (o marca «Agente libre»). Un jugador está en su club y en su selección: hay que decir de cuál sale.');
  for (const [n, v] of [['jugador', jugador], ['equipo de origen', desde], ['equipo de destino', hasta]])
    if (bytes(v) > 48) throw new Error(`El nombre del ${n} es demasiado largo (máx. 48 letras sin tildes; las tildes cuentan doble).`);
  if (desde && !f?.libre && desde.toLowerCase() === hasta.toLowerCase()) throw new Error('El equipo de origen y el de destino son el mismo.');
  const datos = { jugador, desde: f?.libre ? '' : desde, hasta };
  const jid = idOpcional(f?.jugador_id, 'id del jugador', 1); if (jid !== null) datos.jugador_id = jid;
  const did = idOpcional(f?.desde_id, 'id del equipo de origen', 1); if (did !== null && !f?.libre) datos.desde_id = did;
  const hid = idOpcional(f?.hasta_id, 'id del equipo de destino', 1); if (hid !== null) datos.hasta_id = hid;
  if (datos.desde_id !== undefined && datos.desde_id === datos.hasta_id) throw new Error('El equipo de origen y el de destino son el mismo.');
  const lmJ = idOpcional(f?.lm_jugador_id, 'jugador de Liga Máster', 1), lmC = idOpcional(f?.lm_club_id, 'club de Liga Máster', 1);
  if (lmJ !== null || lmC !== null) datos.lm = { ...(lmJ !== null ? { jugador_id: lmJ } : {}), ...(lmC !== null ? { club_id: lmC } : {}) };
  return datos;
}
export const resumenFichaje = (d) => `${d?.jugador ?? '¿?'}: ${d?.desde ? d.desde : 'agente libre'} → ${d?.hasta ?? '¿?'}`;

// ─── Estados y resultados ────────────────────────────────────────────────────────────────────────
export const ESTADO_LADO = {
  no_aplica: { texto: '—', tono: 'apagado' },
  pendiente: { texto: 'Pendiente', tono: 'aviso' },
  tomado: { texto: 'En proceso', tono: 'aviso' },
  publicado: { texto: 'Enviado a los PCs', tono: 'bien' },
  error: { texto: 'Error', tono: 'mal' },
};
export const RESULTADO = {
  aplicado: { texto: 'Aplicado', tono: 'bien' },
  ya_estaba: { texto: 'Ya estaba', tono: 'bien' },
  reemplazado: { texto: 'Reemplazado por otro posterior', tono: 'bien' },
  parcial: { texto: 'Parcial', tono: 'aviso' },
  pendiente: { texto: 'Esperando (PES abierto o sin juego)', tono: 'aviso' },
  por_aprobar: { texto: 'Esperando que el usuario lo apruebe', tono: 'aviso' },
  saltado: { texto: 'Saltado', tono: 'mal' },
  error: { texto: 'Error', tono: 'mal' },
  deshecho: { texto: 'Deshecho por el usuario', tono: 'apagado' },
};
/** {«base:aplicado»: 3, «lm:saltado»: 1} → { base: [{resultado, n, texto, tono}], lm: [...] } ordenado bien → mal. */
export function resumenResultados(mapa) {
  const orden = Object.keys(RESULTADO);
  const out = { base: [], lm: [] };
  for (const [k, n] of Object.entries(mapa ?? {})) {
    const [lado, res] = k.split(':');
    if (!out[lado] || !RESULTADO[res] || !(Number(n) > 0)) continue;
    out[lado].push({ resultado: res, n: Number(n), ...RESULTADO[res] });
  }
  for (const l of Object.values(out)) l.sort((a, b) => orden.indexOf(a.resultado) - orden.indexOf(b.resultado));
  return out;
}

/** Cómo de reciente es el último contacto de un PC. */
export function frescura(iso, ahora = Date.now()) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return { texto: 'Nunca', tono: 'apagado' };
  const min = Math.max(0, Math.round((ahora - t) / 60000));
  if (min < 20) return { texto: 'Conectado ahora', tono: 'bien' };
  if (min < 60) return { texto: `Hace ${min} min`, tono: 'bien' };
  const h = Math.round(min / 60);
  if (h < 24) return { texto: `Hace ${h} h`, tono: 'aviso' };
  const d = Math.round(h / 24);
  return { texto: d === 1 ? 'Hace 1 día' : `Hace ${d} días`, tono: d > 7 ? 'mal' : 'apagado' };
}

/** Versión más nueva entre PCs («0.3.17» > «0.3.9»), para marcar los PCs desactualizados. */
export function compararVersion(a, b) {
  const pa = String(a ?? '').split('.').map((x) => parseInt(x, 10) || 0), pb = String(b ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return Math.sign(d); }
  return 0;
}
export const versionMasNueva = (pcs) => (pcs ?? []).map((p) => p?.link_version).filter(Boolean).sort(compararVersion).pop() ?? '';

/** Una línea del historial de un PC. */
export function lineaEvento(e) {
  if (e?.tipo === 'contacto') {
    const d = e.detalle ?? {};
    const a = d.antes;
    if (!a) return `Primer contacto · Link ${d.link_version || '¿?'}${d.parche ? ` · ${d.parche}` : ''}`;
    const cambios = [];
    if (a.link_version !== d.link_version) cambios.push(`Link ${a.link_version || '¿?'} → ${d.link_version || '¿?'}`);
    if (a.parche !== d.parche) cambios.push(`parche «${a.parche || '¿?'}» → «${d.parche || '¿?'}»`);
    if (a.base_huella !== d.base_huella) cambios.push('cambió su base');
    return cambios.length ? `Cambio en el PC: ${cambios.join(' · ')}` : 'Contacto';
  }
  const r = RESULTADO[e?.resultado] ?? { texto: e?.resultado ?? '¿?' };
  const lado = e?.destino === 'lm' ? 'Liga Máster' : 'Base normal';
  const que = e?.cambio?.tipo === 'fichaje' ? resumenFichaje(e.cambio.datos) : `${e?.cambio?.tipo ?? 'cambio'} #${e?.cambio?.seq ?? '?'}`;
  return `${r.texto} · ${lado} · ${que}${e?.motivo ? ` — ${e.motivo}` : ''}`;
}

const MENSAJES = {
  NO_AUTORIZADO: 'Solo el admin puede hacer cambios oficiales.',
  TIPO_NO_VALIDO: 'Ese tipo de cambio aún no está encendido en la base.',
  DESTINO_NO_PERMITIDO: 'Ese tipo de cambio no se puede mandar a ese destino.',
  CAMBIO_NO_ENCONTRADO: 'Ese cambio ya no existe o ya estaba anulado.',
  'DATOS_NO_VALIDOS:mismo_equipo': 'El equipo de origen y el de destino son el mismo.',
  'DATOS_NO_VALIDOS:jugador': 'Revisa el nombre del jugador (1 a 48 letras).',
  'DATOS_NO_VALIDOS:hasta': 'Revisa el equipo de destino (1 a 48 letras).',
  'DATOS_NO_VALIDOS:desde': 'Revisa el equipo de origen (máx. 48 letras).',
  DATOS_NO_VALIDOS: 'Algún dato no es válido.',
};
export function mensajeError(e) {
  const t = String(e?.message ?? e ?? '');
  if (/(function|relation) .*(pes_|does not exist)|schema cache/i.test(t)) return 'La base aún no tiene la migración 125 (pega el SQL en Supabase).';
  const c = (t.match(/DATOS_NO_VALIDOS:[a-z_]+|[A-Z_]{6,}/) ?? [])[0];
  return MENSAJES[c] ?? MENSAJES[(c ?? '').split(':')[0]] ?? (t || 'Algo salió mal. Inténtalo otra vez.');
}
