// Liga Máster de cada PC (migración 127): lógica pura, sin DOM ni red. Los campos van en el formulario único de
// /cambios-oficiales/ (js/features/cambios/ligaMaster.js). Las reglas son las mismas que valida el servidor (private.lm_pc_traducir).

export const PARTIDA_RE = /^ML[0-9A-Fa-f]{8}:[0-9]{1,9}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_EUROS = 40_000_000_000;

/** Euros escritos por una persona («25 M», «1.500.000», «2,5m», «800k») → número entero, o null si está vacío. Lanza Error si no vale para el juego. */
export function eurosDe(texto, campo = 'importe') {
  const t = String(texto ?? '').trim().toLowerCase().replace(/\s+/g, '').replace(/€/g, '');
  if (!t) return null;
  const m = /^([0-9]+(?:[.,][0-9]+)*)(k|m|mill|millones)?$/.exec(t);
  if (!m) throw new Error(`${campo}: escribe solo números (por ejemplo 25 M o 1.500.000).`);
  let num = m[1];
  if (m[2]) num = num.replace(',', '.');                                   // «2,5m» → 2.5
  else num = num.replace(/[.,]/g, '');                                     // «1.500.000» → 1500000
  const n = Math.round(Number(num) * (m[2] === 'k' ? 1e3 : m[2] ? 1e6 : 1));
  if (!Number.isFinite(n) || n < 100) throw new Error(`${campo}: mínimo 100 €.`);
  if (n > MAX_EUROS) throw new Error(`${campo}: máximo 40.000 millones.`);
  if (n % 100 !== 0) throw new Error(`${campo}: el juego guarda el dinero en múltiplos de 100 €.`);
  return n;
}

/** «25.000.000 €» */
export function textoEuros(n) {
  if (n == null || n === '') return '—';
  return `${Number(n).toLocaleString('es-ES')} €`;
}

/** A quién va: { usuario, partida } (los dos opcionales; partida exige usuario). */
export function destinoLm({ usuario, partida } = {}) {
  const u = String(usuario ?? '').trim(); const p = String(partida ?? '').trim();
  const out = {};
  if (u) { if (!UUID_RE.test(u)) throw new Error('Usuario no válido.'); out.usuario = u.toLowerCase(); }
  if (p) {
    if (!PARTIDA_RE.test(p)) throw new Error('Partida no válida.');
    if (!out.usuario) throw new Error('Para elegir una partida, elige primero el usuario.');
    out.partida = p;
  }
  return out;
}

/** datos del tipo «dinero» (destino lm): usuario obligatorio y al menos uno de los dos importes. */
export function datosDinero({ usuario, partida, presupuesto, tope } = {}) {
  const d = destinoLm({ usuario, partida });
  if (!d.usuario) throw new Error('Elige a qué usuario le cambias el dinero.');
  const p = eurosDe(presupuesto, 'Presupuesto de fichajes'); const t = eurosDe(tope, 'Tope salarial');
  if (p == null && t == null) throw new Error('Escribe el presupuesto, el tope salarial o los dos.');
  if (p != null) d.presupuesto = p;
  if (t != null) d.tope_salarial = t;
  return d;
}

/** datos del tipo «valor» (destino lm): jugador con id de PES real y el valor nuevo; usuario/partida opcionales (vacío = todas). */
export function datosValor({ jugador, jugadorId, valor, usuario, partida } = {}) {
  const nombre = String(jugador ?? '').trim();
  const id = Number(String(jugadorId ?? '').trim());
  if (!Number.isInteger(id) || id < 1 || id >= 90_000_000) throw new Error('Falta el id de PES del jugador.');
  const v = eurosDe(valor, 'Valor');
  if (v == null) throw new Error('Escribe el valor nuevo.');
  return { ...destinoLm({ usuario, partida }), jugador: nombre.slice(0, 48), jugador_id: id, valor: v };
}

/** Bloque «lm» opcional de un fichaje (destino lm o ambos): a quién y con qué condiciones. Vacío = null. */
export function lmDeFichaje({ usuario, partida, monto, sueldo, clausula, finContrato, dorsal } = {}) {
  const lm = destinoLm({ usuario, partida });
  const m = eurosDe(monto, 'Monto'); if (m != null) lm.monto = m;
  const s = eurosDe(sueldo, 'Sueldo anual'); if (s != null) lm.sueldo = s;
  const c = eurosDe(clausula, 'Cláusula'); if (c != null) lm.clausula = c;
  const f = String(finContrato ?? '').trim();
  if (f) { if (!/^20[0-9]{2}-[01][0-9]-[0-3][0-9]$/.test(f)) throw new Error('Fin de contrato: AAAA-MM-DD.'); lm.fin_contrato = f; }
  const dr = String(dorsal ?? '').trim();
  if (dr) { const n = Number(dr); if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('Dorsal: de 1 a 99.'); lm.dorsal = n; }
  return Object.keys(lm).length ? lm : null;
}

const ESTADOS = { aplicado: 'Aplicado', rechazado: 'No se pudo', pendiente: 'Pendiente', sin_efecto: 'Ya estaba' };
/** Texto corto de una fila del historial (public.lm_pc_historial). */
export function textoResultado(f) {
  const c = f?.cambio ?? {}; const d = c.datos ?? {};
  let que;
  if (f?.tipo_lm === 'deshacer') que = `Deshacer: ${c.tipo ?? 'cambio'} #${c.seq ?? '?'}`;
  else if (c.tipo === 'fichaje') que = `${d.jugador ?? 'Jugador'}: ${d.desde || 'libre'} → ${d.hasta ?? '?'}`;
  else if (c.tipo === 'dinero') que = `Dinero: ${[d.presupuesto != null && `fichajes ${textoEuros(d.presupuesto)}`, d.tope_salarial != null && `tope ${textoEuros(d.tope_salarial)}`].filter(Boolean).join(' · ')}`;
  else if (c.tipo === 'valor') que = `Valor de ${d.jugador || 'jugador'}: ${textoEuros(d.valor)}`;
  else que = c.tipo ?? 'Cambio';
  return { que, estado: ESTADOS[f?.estado] ?? f?.estado ?? '', motivo: f?.motivo ?? '', partida: `${f?.club_nombre || '?'} (${f?.partida ?? ''})`, quien: f?.usuario_nombre ?? '' };
}
