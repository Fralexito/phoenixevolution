// «Mi club» (vestuario): lógica pura, sin DOM ni red. La pantalla está en js/pages/miClub.js.
// Los rangos son los mismos que valida el servidor (migración 095); aquí solo sirven para avisar antes de guardar.

export const POSICIONES = ['PT', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MI', 'MD', 'MO', 'EI', 'ED', 'SD', 'DC'];
// Posición en el campo (porcentaje: x de izquierda a derecha, y de arriba = ataque a abajo = portería propia).
export const XY = { PT: [50, 92], DFC: [50, 76], LI: [14, 72], LD: [86, 72], MCD: [50, 60], MC: [50, 48], MI: [16, 46], MD: [84, 46], MO: [50, 34], EI: [16, 22], ED: [84, 22], SD: [50, 20], DC: [50, 8] };
export const GRUPOS = [['Porteros', ['PT']], ['Defensas', ['DFC', 'LI', 'LD']], ['Centrocampistas', ['MCD', 'MC', 'MI', 'MD', 'MO']], ['Delanteros', ['EI', 'ED', 'SD', 'DC']]];
export const HABILIDADES = [['ataque', 'Ataque'], ['control', 'Control de balón'], ['regate', 'Regate'], ['regate_ajustado', 'Regate ajustado'], ['finalizacion', 'Finalización'], ['cabezazo', 'Cabezazo'], ['pase_raso', 'Pase raso'], ['pase_bombeado', 'Pase bombeado'], ['balon_parado', 'Balón parado'], ['efecto', 'Efecto'], ['potencia_tiro', 'Potencia de tiro'], ['velocidad', 'Velocidad'], ['aceleracion', 'Aceleración'], ['salto', 'Salto'], ['contacto_fisico', 'Contacto físico'], ['equilibrio', 'Equilibrio'], ['resistencia', 'Resistencia'], ['defensa', 'Defensa'], ['recuperacion', 'Recuperación'], ['agresividad', 'Agresividad']];
export const PORTERO = [['pt_a', 'Portero A'], ['pt_b', 'Portero B'], ['pt_c', 'Portero C'], ['pt_d', 'Portero D'], ['pt_e', 'Portero E']];
export const BASICOS = [['dorsal', 'Dorsal', 1, 99], ['edad', 'Edad', 15, 50], ['altura', 'Altura (cm)', 150, 210], ['peso', 'Peso (kg)', 40, 130]];

const RANGOS = { dorsal: [1, 99], edad: [15, 50], altura: [150, 210], peso: [40, 130], 'liga_master.sueldo': [0, 400000000], 'liga_master.valor': [0, 400000000] };
export function rangoDe(campo) {
  if (RANGOS[campo]) return RANGOS[campo];
  if (/^(habilidades|portero)\./.test(campo)) return [40, 99];
  if (/^posiciones\./.test(campo)) return [0, 2];
  return null;
}

/** Lee un campo con ruta «a.b» de la ficha. */
export const leer = (ficha, campo) => campo.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ficha);

export function bloqueado(ficha, campo) { return Array.isArray(ficha?.bloqueados) && ficha.bloqueados.includes(campo); }

/** → { ok:true, valor } | { ok:false, error } . Los números llegan como texto de los inputs. */
export function validarValor(campo, crudo) {
  if (campo === 'posicion') return POSICIONES.includes(crudo) ? { ok: true, valor: crudo } : { ok: false, error: 'Posición no válida.' };
  const r = rangoDe(campo); if (!r) return { ok: false, error: 'Ese campo no se puede editar.' };
  const n = typeof crudo === 'number' ? crudo : Number(String(crudo).trim());
  if (String(crudo).trim() === '' || !Number.isInteger(n)) return { ok: false, error: 'Escribe un número entero.' };
  if (n < r[0] || n > r[1]) return { ok: false, error: `Debe estar entre ${r[0].toLocaleString('es')} y ${r[1].toLocaleString('es')}.` };
  return { ok: true, valor: n };
}

/** Al tocar una casilla del campo: 0 → 1 → 2 → 0. */
export const siguientePosicion = (v) => (Number(v) + 1) % 3;

/** Valor mostrado: lo pendiente (borrador o ya guardado) pisa lo que dice la ficha. */
export const valorActual = (ficha, borrador, campo) => (campo in borrador ? borrador[campo] : leer(ficha, campo));

/** Campos cuyo valor difiere de la ficha → lista que se manda al servidor. */
export function cambiosDe(ficha, borrador) {
  return Object.entries(borrador).filter(([c, v]) => leer(ficha, c) !== v).map(([campo, valor]) => ({ campo, valor }));
}

/** Pone o quita un campo del borrador (si vuelve al valor original, se quita). */
export function fijar(ficha, borrador, campo, valor) {
  const sig = { ...borrador };
  if (leer(ficha, campo) === valor) delete sig[campo]; else sig[campo] = valor;
  return sig;
}

/** Borrador inicial desde los cambios pendientes ya guardados de un jugador. */
export const borradorDesde = (pendientes) => Object.fromEntries((pendientes ?? []).map((c) => [c.campo, c.valor]));

/** Agrupa la plantilla por línea según la posición principal. Dentro de cada grupo, por dorsal. */
export function agruparPlantilla(jugadores) {
  const g = GRUPOS.map(([titulo, pos]) => ({ titulo, pos, jugadores: [] }));
  for (const j of jugadores) {
    const p = j.ficha?.posicion; const dest = g.find((x) => x.pos.includes(p)) ?? g[2]; dest.jugadores.push(j);
  }
  for (const x of g) x.jugadores.sort((a, b) => (a.ficha?.dorsal ?? 999) - (b.ficha?.dorsal ?? 999) || a.orden - b.orden);
  return g.filter((x) => x.jugadores.length);
}

export const euros = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('es', { maximumFractionDigits: 0 }) + ' €' : '—');
export const colorHab = (v) => (v >= 90 ? '#00e5ff' : v >= 80 ? '#00ff88' : v >= 70 ? '#ffb700' : '#ff6b6b');

const ERRORES = { NO_AUTORIZADO: 'Solo el dueño del club puede cambiar sus jugadores.', CAMPO_BLOQUEADO: 'Ese dato está bloqueado por el juego.', CAMPO_NO_EDITABLE: 'Ese dato no se puede editar.', CAMPO_NO_EXISTE: 'Ese dato no existe en la ficha.', VALOR_INVALIDO: 'Valor fuera de rango.', DEMASIADOS_CAMBIOS: 'Demasiados cambios a la vez.', JUGADOR_NO_EXISTE: 'El jugador ya no está en el club.', DATOS_INVALIDOS: 'Datos no válidos.' };
export function mensajeError(e) {
  const t = String(e?.message ?? ''); const k = Object.keys(ERRORES).find((x) => t.includes(x));
  return k ? ERRORES[k] + (t.includes(':') && k.startsWith('CAMPO') || k === 'VALOR_INVALIDO' ? ` (${t.split(':').pop().trim()})` : '') : 'No se pudo guardar.';
}
