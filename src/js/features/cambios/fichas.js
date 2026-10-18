// Formulario único (/cambios-oficiales/): tipos «stats» (Estadísticas) e «info» (Información) del jugador — migración 126.
// Enchufe del contrato §6: registrarTipo({ tipo, etiqueta, destinos, pintar(contenedor, ctx), leer() }). Lo importa pages/cambiosOficiales.js.
// Lógica pura en core/fichasCampos.js. Historial y deshacer: features/cambios/historialFichas.js.
import { supabase } from '../../core/supabase.js';
import { escapeHTML } from '../../core/dom.js';
import { registrarTipo } from '../../core/cambiosOficiales.js';
import { camposDe, construirDatos, vigentesPlanos, mostrarValor, GRUPOS, NIVEL_POSICION, POSICIONES } from '../../core/fichasCampos.js';

let catalogo = null;   // filas de pes_fichas_campos (o la lista de core si la tabla no responde)
async function cargarCatalogo() {
  if (catalogo) return catalogo;
  const { data, error } = await supabase.from('pes_fichas_campos').select('clave, tipo, grupo, texto, minimo, maximo, orden').order('orden');
  catalogo = !error && data?.length ? data : [];
  return catalogo;
}

function control(c, vig) {
  const ph = vig === undefined ? 'base' : mostrarValor(c.clave, vig);
  const id = `fx-${c.clave}`;
  if (c.grupo === 'posicion' || c.clave === 'posicion_registrada') {
    const ops = (c.grupo === 'posicion' ? NIVEL_POSICION : POSICIONES).map((t, i) => `<option value="${i}">${t}</option>`).join('');
    return `<label class="fx-campo" for="${id}"><span>${escapeHTML(c.texto)}</span>
      <select id="${id}" data-clave="${c.clave}"><option value="">— (${escapeHTML(ph)})</option>${ops}</select></label>`;
  }
  return `<label class="fx-campo" for="${id}"><span>${escapeHTML(c.texto)}</span>
    <input id="${id}" data-clave="${c.clave}" type="number" inputmode="numeric" min="${c.minimo}" max="${c.maximo}" step="1" placeholder="${escapeHTML(ph)}"></label>`;
}

function crearTipo(tipo, etiqueta) {
  const estado = { jugador: '', jugadorId: '', lmJugadorId: '', vigentes: null, destino: 'base', raiz: null };

  async function pintarCampos() {
    const caja = estado.raiz?.querySelector('[data-fx-campos]');
    if (!caja) return;
    const cat = await cargarCatalogo();
    const vig = vigentesPlanos(estado.vigentes, estado.destino);
    const grupos = new Map();
    for (const c of camposDe(tipo, cat)) { if (!grupos.has(c.grupo)) grupos.set(c.grupo, []); grupos.get(c.grupo).push(c); }
    caja.innerHTML = [...grupos].map(([g, cs], i) => `<details class="glass-panel fx-grupo"${i === 0 ? ' open' : ''}>
        <summary class="text-xs uppercase tracking-widest">${escapeHTML(GRUPOS[g] ?? g)}</summary>
        <div class="fx-rejilla">${cs.map((c) => control(c, Object.prototype.hasOwnProperty.call(vig, c.clave) ? vig[c.clave] : undefined)).join('')}</div>
      </details>`).join('');
  }

  async function elegirJugador(j) {
    estado.jugador = j.nombre; estado.jugadorId = j.pes_id ?? ''; estado.lmJugadorId = j.id ?? '';
    estado.raiz.querySelector('[data-fx-elegido]').textContent =
      `${j.nombre}${j.pes_id ? ` · id PES ${j.pes_id}` : ' · sin id de PES (se aplica por nombre)'}`;
    const { data, error } = await supabase.rpc('pes_fichas_vigentes', { p_jugador_id: j.pes_id || null, p_jugador: j.nombre });
    estado.vigentes = error ? null : data;
    await pintarCampos();
  }

  async function buscar(texto) {
    const lista = estado.raiz.querySelector('[data-fx-resultados]');
    const q = texto.trim();
    if (q.length < 2) { lista.innerHTML = ''; return; }
    const { data } = await supabase.from('lm_jugadores').select('id, pes_id, nombre, posicion, media').ilike('nombre', `%${q.replace(/[%_]/g, '')}%`).limit(12);
    const filas = data ?? [];
    lista.innerHTML = filas.map((j, i) => `<li><button type="button" class="fx-opcion" data-i="${i}">${escapeHTML(j.nombre)}
        <small>${escapeHTML(j.posicion ?? '')} ${j.media ?? ''}${j.pes_id ? ` · ${j.pes_id}` : ''}</small></button></li>`).join('')
      + `<li><button type="button" class="fx-opcion" data-libre="1">Usar «${escapeHTML(q)}» tal cual (por nombre)</button></li>`;
    lista.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      lista.innerHTML = '';
      elegirJugador(b.dataset.libre ? { nombre: q } : filas[Number(b.dataset.i)]);
    };
  }

  registrarTipo({
    tipo, etiqueta, destinos: ['base', 'lm', 'ambos'],
    pintar(contenedor, ctx) {
      estado.raiz = contenedor; estado.destino = ctx?.destino ?? 'base';
      contenedor.innerHTML = `
        <div class="fx-jugador">
          <label class="text-xs uppercase tracking-widest" for="fx-buscar-${tipo}">Jugador</label>
          <input id="fx-buscar-${tipo}" type="search" autocomplete="off" placeholder="Escribe el nombre (mín. 2 letras)">
          <ul class="fx-resultados" data-fx-resultados></ul>
          <p class="text-xs" data-fx-elegido>${estado.jugador ? escapeHTML(estado.jugador) : 'Ningún jugador elegido.'}</p>
        </div>
        <p class="text-xs opacity-80">Deja vacío lo que no quieras cambiar. Entre paréntesis: lo que la web ya tiene puesto («base» = el valor del parche de cada PC).
          ${estado.destino !== 'base' ? 'En Liga Máster, las estadísticas suben o bajan con las barras de crecimiento de la partida.' : ''}</p>
        <div data-fx-campos></div>`;
      let t = null;
      contenedor.querySelector(`#fx-buscar-${tipo}`).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => buscar(e.target.value), 250); });
      pintarCampos();
    },
    leer() {
      const valores = {};
      for (const el of estado.raiz?.querySelectorAll('[data-clave]') ?? []) valores[el.dataset.clave] = el.value;
      return construirDatos({ tipo, jugador: estado.jugador, jugadorId: estado.jugadorId, valores,
        vigentes: vigentesPlanos(estado.vigentes, estado.destino), lmJugadorId: estado.lmJugadorId }, catalogo ?? []);
    },
  });
}

crearTipo('stats', 'Estadísticas del jugador');
crearTipo('info', 'Información del jugador (posiciones, pie malo, forma, lesiones, datos básicos)');
