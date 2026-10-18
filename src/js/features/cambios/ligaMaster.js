// Formulario único (/cambios-oficiales/, contrato docs/CONTRATO-WEB-PES.md §6) · parte LIGA MÁSTER (migración 127).
//  · Registra los tipos «dinero» y «valor» (solo destino Liga Máster).
//  · camposLmFichaje: campos extra del fichaje cuando la casilla Liga Máster está marcada (a quién, monto, sueldo…).
//    El formulario de fichaje (125) los pinta con camposLmFichaje.pintar(cont) y añade datos.lm = camposLmFichaje.leer().
//  · pintarHistorialLM: qué pasó en la Liga Máster de cada PC (por usuario y partida). Deshacer = anular el cambio.
// La página que monta el formulario importa este archivo: import './features/cambios/ligaMaster.js' (en js/pages/cambiosOficiales.js).
import { registrarTipo } from '../../core/cambiosOficiales.js';
import { supabase } from '../../core/supabase.js';
import { escapeHTML as e } from '../../core/dom.js';
import { datosDinero, datosValor, lmDeFichaje, textoResultado } from '../../core/ligaMasterPc.js';

const CSS_IN = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[14px]';
const CSS_LB = 'block text-[12px] text-white/70 mb-1';

let partidasCache = null;
async function partidas() {
  if (partidasCache) return partidasCache;
  const { data, error } = await supabase.rpc('lm_pc_partidas_lista');
  partidasCache = error ? [] : (data ?? []);
  return partidasCache;
}

/** Selector «A quién» (usuario + partida) con las partidas que ya informaron los PCs. `todas` = permite «Todas las Ligas Máster». */
function pintarDestino(cont, { todas = true, ayuda = '' } = {}) {
  cont.insertAdjacentHTML('beforeend', `
    <div class="grid gap-3 sm:grid-cols-2" data-lm-destino>
      <label><span class="${CSS_LB}">Usuario</span>
        <select class="${CSS_IN}" data-lm-usuario>${todas ? '<option value="">Todas las Ligas Máster de todos</option>' : '<option value="">Elige un usuario…</option>'}</select></label>
      <label><span class="${CSS_LB}">Partida</span>
        <select class="${CSS_IN}" data-lm-partida disabled><option value="">Todas sus partidas</option></select></label>
      ${ayuda ? `<p class="sm:col-span-2 text-[12px] text-white/60">${e(ayuda)}</p>` : ''}
    </div>`);
  const selU = cont.querySelector('[data-lm-usuario]'); const selP = cont.querySelector('[data-lm-partida]');
  partidas().then((lista) => {
    const usuarios = new Map();
    for (const p of lista) if (!usuarios.has(p.usuario)) usuarios.set(p.usuario, p.usuario_nombre);
    for (const [id, nombre] of usuarios) selU.insertAdjacentHTML('beforeend', `<option value="${e(id)}">${e(nombre)}</option>`);
    if (!lista.length) selU.insertAdjacentHTML('afterend', '<p class="text-[12px] text-amber-300 mt-1">Ningún PC ha informado todavía sus Ligas Máster.</p>');
  });
  selU.addEventListener('change', async () => {
    const lista = await partidas();
    selP.innerHTML = '<option value="">Todas sus partidas</option>' + lista.filter((p) => p.usuario === selU.value)
      .map((p) => `<option value="${e(p.partida)}">${e(p.club_nombre || '?')} · ${e(p.fecha_partida || '')} (${e(p.partida)})</option>`).join('');
    selP.disabled = !selU.value;
  });
  return () => ({ usuario: selU.value, partida: selP.disabled ? '' : selP.value });
}

const campo = (nombre, etiqueta, ph = '') => `<label><span class="${CSS_LB}">${e(etiqueta)}</span><input class="${CSS_IN}" data-lm="${nombre}" placeholder="${e(ph)}" autocomplete="off"></label>`;
const valorDe = (cont, nombre) => cont.querySelector(`[data-lm="${nombre}"]`)?.value ?? '';

// ─── dinero ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let leerDestinoDinero = null; let contDinero = null;
registrarTipo({
  tipo: 'dinero', etiqueta: 'Dinero de un club (Liga Máster)', destinos: ['lm'],
  pintar(cont) {
    contDinero = cont; cont.innerHTML = '';
    leerDestinoDinero = pintarDestino(cont, { todas: false, ayuda: 'Cambia el dinero del club del usuario en su Liga Máster. Vacío = no se toca.' });
    cont.insertAdjacentHTML('beforeend', `<div class="grid gap-3 sm:grid-cols-2 mt-3">
      ${campo('presupuesto', 'Presupuesto de fichajes', 'Ej.: 250 M')}${campo('tope', 'Tope salarial', 'Ej.: 90 M')}</div>`);
  },
  leer() { return datosDinero({ ...leerDestinoDinero(), presupuesto: valorDe(contDinero, 'presupuesto'), tope: valorDe(contDinero, 'tope') }); },
});

// ─── valor ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let leerDestinoValor = null; let contValor = null;
registrarTipo({
  tipo: 'valor', etiqueta: 'Valor de un jugador (Liga Máster)', destinos: ['lm'],
  pintar(cont) {
    contValor = cont; cont.innerHTML = '';
    cont.insertAdjacentHTML('beforeend', `<div class="grid gap-3 sm:grid-cols-3 mb-3">
      ${campo('jugador', 'Jugador', 'Ej.: Lamine Yamal')}${campo('jugador_id', 'Id de PES', 'Ej.: 162114')}${campo('valor', 'Valor nuevo', 'Ej.: 180 M')}</div>`);
    leerDestinoValor = pintarDestino(cont, { ayuda: 'Vacío = en todas las Ligas Máster.' });
  },
  leer() { return datosValor({ ...leerDestinoValor(), jugador: valorDe(contValor, 'jugador'), jugadorId: valorDe(contValor, 'jugador_id'), valor: valorDe(contValor, 'valor') }); },
});

// ─── campos LM del fichaje (los usa el formulario de fichaje de la 125) ────────────────────────────────────────────
export const camposLmFichaje = {
  _cont: null, _destino: null,
  pintar(cont) {
    this._cont = cont; cont.innerHTML = '<p class="text-[12px] text-white/70 mb-2">Liga Máster (opcional): a quién va y con qué condiciones. Vacío = en todas, como el juego.</p>';
    this._destino = pintarDestino(cont);
    cont.insertAdjacentHTML('beforeend', `<div class="grid gap-3 sm:grid-cols-3 mt-3">
      ${campo('monto', 'Monto del traspaso', 'Ej.: 25 M')}${campo('sueldo', 'Sueldo anual', 'Ej.: 3 M')}${campo('clausula', 'Cláusula', 'Ej.: 100 M')}
      ${campo('fin', 'Fin de contrato', 'AAAA-MM-DD')}${campo('dorsal', 'Dorsal', '1-99')}</div>`);
  },
  leer() {
    if (!this._cont) return null;
    const c = this._cont;
    return lmDeFichaje({ ...this._destino(), monto: valorDe(c, 'monto'), sueldo: valorDe(c, 'sueldo'), clausula: valorDe(c, 'clausula'), finContrato: valorDe(c, 'fin'), dorsal: valorDe(c, 'dorsal') });
  },
};

// ─── historial ──────────────────────────────────────────────────────────────────────────────────────────────────────
const COLOR = { Aplicado: 'text-emerald-300', 'Ya estaba': 'text-sky-300', Pendiente: 'text-amber-300', 'No se pudo': 'text-rose-300' };
/** Qué pasó en la Liga Máster de cada PC. `usuario` = solo ese usuario (staff); vacío = todos los que puedes ver. */
export async function pintarHistorialLM(cont, { usuario = null, limite = 100 } = {}) {
  cont.innerHTML = '<p class="text-[12px] text-white/60">Cargando Liga Máster…</p>';
  const { data, error } = await supabase.rpc('lm_pc_historial', { p_usuario: usuario, p_limite: limite });
  if (error) { cont.innerHTML = '<p class="text-[12px] text-rose-300">No se pudo cargar el historial de Liga Máster.</p>'; return; }
  if (!data?.length) { cont.innerHTML = '<p class="text-[12px] text-white/60">Todavía ningún PC ha aplicado cambios de Liga Máster.</p>'; return; }
  cont.innerHTML = `<ul class="divide-y divide-white/5">${data.map((f) => {
    const t = textoResultado(f);
    return `<li class="py-2 text-[13px]"><div class="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
      <span class="font-semibold ${COLOR[t.estado] ?? ''}">${e(t.estado)}</span><span>${e(t.que)}</span>
      <span class="text-white/60 text-[12px]">${e(t.quien)} · ${e(t.partida)} · ${e(new Date(f.creado).toLocaleString('es-PE'))}</span></div>
      ${t.motivo ? `<div class="text-[12px] text-white/60">${e(t.motivo)}</div>` : ''}</li>`;
  }).join('')}</ul>`;
}
