// Formulario único (/cambios-oficiales/): tipos «stats» (Estadísticas) e «info» (Información) del jugador — migración 126.
// Enchufe del contrato §6: registrarTipo({ tipo, etiqueta, destinos, pintar(contenedor, ctx), leer(), vista(caja, st) }). Lo importa pages/cambiosOficiales.js.
// Lógica pura en core/fichasCampos.js. Pantalla (barras, puntos, campo de fútbol, resumen en vivo): features/cambios/fichasUI.js.
// Historial y deshacer: features/cambios/historialFichas.js.
import { supabase } from '../../core/supabase.js';
import { escapeHTML } from '../../core/dom.js';
import { registrarTipo } from '../../core/cambiosOficiales.js';
import { camposDe, construirDatos, vigentesPlanos } from '../../core/fichasCampos.js';
import { minifaceUrl } from '../fotoFutbolista.js';
import { pintarFicha, enlazarFicha, valoresEscritos, restaurarValores, vistaFicha } from './fichasUI.js';

let catalogo = null;   // filas de pes_fichas_campos (vacío = se usa la misma lista de core/fichasCampos.js)
async function cargarCatalogo() {
  if (catalogo) return catalogo;
  const { data, error } = await supabase.from('pes_fichas_campos').select('clave, tipo, grupo, texto, minimo, maximo, orden').order('orden');
  catalogo = !error && data?.length ? data : [];
  return catalogo;
}

function crearTipo(tipo, etiqueta) {
  const estado = { jugador: '', jugadorId: '', lmJugadorId: '', club: '', vigentes: null, destino: 'base', raiz: null };
  const caja = () => estado.raiz?.querySelector('[data-fx-campos]');

  /** Dibuja los campos del tipo con los valores vigentes del destino; conserva lo ya escrito y la pestaña abierta. */
  async function pintarCampos() {
    const c = caja(); if (!c) return;
    const cat = await cargarCatalogo();
    const escritos = valoresEscritos(c), grupo = c.dataset.grupo || null;
    pintarFicha(c, camposDe(tipo, cat), vigentesPlanos(estado.vigentes, estado.destino), grupo);
    enlazarFicha(c); restaurarValores(c, escritos);
    estado.raiz.dispatchEvent(new Event('change', { bubbles: true }));   // la vista previa de la página se vuelve a pintar
  }

  async function elegirJugador(j) {
    estado.jugador = j.nombre; estado.jugadorId = j.pes_id ?? ''; estado.lmJugadorId = j.id ?? ''; estado.club = j.lm_clubes?.nombre ?? '';
    estado.raiz.querySelector('[data-fx-elegido]').textContent = j.pes_id ? `id PES ${j.pes_id}` : 'Sin id de PES: se aplica por nombre.';
    const { data, error } = await supabase.rpc('pes_fichas_vigentes', { p_jugador_id: j.pes_id || null, p_jugador: j.nombre });
    estado.vigentes = error ? null : data;
    await pintarCampos();
  }

  async function buscar(texto) {
    const lista = estado.raiz.querySelector('[data-fx-resultados]');
    const q = texto.trim();
    if (q.length < 2) { lista.innerHTML = ''; return; }
    const { data } = await supabase.from('lm_jugadores').select('id, pes_id, nombre, posicion, media, lm_clubes(nombre)').ilike('nombre', `%${q.replace(/[%_,()]/g, ' ')}%`).limit(8);
    const filas = data ?? [];
    lista.innerHTML = filas.map((j, i) => {
      const cara = minifaceUrl(j.pes_id);
      return `<li><button type="button" class="cf-sug cf-sug-club" data-i="${i}"><span class="ft-avatar">${cara ? `<img src="${cara}" alt="" loading="lazy">` : '<i class="fa-solid fa-user" aria-hidden="true"></i>'}</span>
        <span><b>${escapeHTML(j.nombre)}</b><small>${escapeHTML([j.posicion, j.media ? `media ${j.media}` : '', j.lm_clubes?.nombre, j.pes_id ? `id PES ${j.pes_id}` : ''].filter(Boolean).join(' · '))}</small></span></button></li>`;
    }).join('') + `<li><button type="button" class="cf-sug cf-sug-club" data-libre="1"><span class="ft-avatar"><i class="fa-solid fa-pen" aria-hidden="true"></i></span><span><b>Usar «${escapeHTML(q)}» tal cual</b><small>Se aplica buscándolo por nombre en cada PC</small></span></button></li>`;
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
        <div class="cf-campo cf-ancho"><label for="fx-buscar-${tipo}"><span>Jugador</span></label>
          <div class="cf-ent"><input id="fx-buscar-${tipo}" class="field" type="search" autocomplete="off" placeholder="Escribe el nombre (mín. 2 letras)" value="${escapeHTML(estado.jugador)}">
            <ul class="cf-sugerencias" data-fx-resultados aria-live="polite"></ul></div>
          <small data-fx-elegido>${estado.jugador ? (estado.jugadorId ? `id PES ${escapeHTML(String(estado.jugadorId))}` : 'Sin id de PES: se aplica por nombre.') : 'Elígelo de la lista para ver sus valores actuales.'}</small></div>
        <p class="cfx-pista">Toca solo lo que quieras cambiar: lo demás queda como está. «base» = el valor del parche de cada PC.${estado.destino !== 'base' ? ' En Liga Máster, las estadísticas suben o bajan con las barras de crecimiento de la partida.' : ''}</p>
        <div data-fx-campos></div>`;
      let t = null;
      contenedor.querySelector(`#fx-buscar-${tipo}`).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => buscar(e.target.value), 250); });
      pintarCampos();
    },
    cambiarDestino(destino) { estado.destino = destino; pintarCampos(); },
    vista(cajaVista, st) {
      const c = caja(); if (!c) return;
      vistaFicha(cajaVista, { jugador: estado.jugador, pes: estado.jugadorId, club: estado.club, destino: st?.destino ?? estado.destino, campo: c,
        catalogo: camposDe(tipo, catalogo ?? []), vig: vigentesPlanos(estado.vigentes, estado.destino) });
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
