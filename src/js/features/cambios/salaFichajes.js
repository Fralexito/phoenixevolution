// SALA DE FICHAJES: un panel a pantalla completa para elegir, mirando escudos y caras, de qué club sale un jugador y a cuál va.
// Primero el jugador (club → plantilla, o buscándolo por nombre) y luego el club destino. Muestra el DT (el usuario) de cada club de la
// Liga Máster: quien pierde al jugador y quien lo recibe. No guarda nada: devuelve la elección y el formulario rellena sus campos.
// Datos: src/data/clubesPes.js (clubes) · plantillasPes.js (plantillas, del parche) · datosSala.js (Liga Máster de la web).
import { CLUBES_PES } from '../../../data/clubesPes.js';
import { buscarClubes, escudoImg, escudoUrl, paisDe, agruparPlantilla, buscarJugadoresPes, lineaDe, ordenarPorPrestigio, logoLigaUrl } from '../../core/pes/clubesPes.js';
import { getState } from '../../core/sistema/session.js';
import { escapeHTML as esc } from '../../core/sistema/dom.js';
import { minifaceUrl, montarFotos } from '../fotoFutbolista.js';
import { cargarPlantillas, cargarLm } from './datosSala.js';

const LIGAS = ['Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const LM = 'Liga Máster';
const iniciales = (n) => { const p = String(n ?? '').split(/\s+/).filter(Boolean); return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const vistaGuardada = () => { try { return localStorage.getItem('sf-vista') === 'bloques' ? 'bloques' : 'lista'; } catch { return 'lista'; } };
const porId = new Map(CLUBES_PES.map((c) => [c.id, c]));

function avatar(j, px = 44) {
  const cara = minifaceUrl(j.pid);
  return `<span class="sf-av" style="--px:${px}px" data-pid="${j.pid ?? ''}">${cara ? `<img src="${cara}" alt="" loading="lazy" decoding="async">` : `<em>${esc(iniciales(j.nombre))}</em>`}</span>`;
}
function insigniaDt(lm) {
  if (!lm) return '';
  if (!lm.dt) return '<span class="sf-dt sf-dt-ia" title="Lo lleva la IA">IA</span>';
  const a = lm.dt.avatar ? `<img src="${esc(lm.dt.avatar)}" alt="" referrerpolicy="no-referrer">` : `<em>${esc(iniciales(lm.dt.nombre))}</em>`;
  return `<span class="sf-dt" title="DT: ${esc(lm.dt.nombre)}">${a}</span>`;
}
/** Etiqueta GRANDE con el usuario que dirige el club (Fralex: «que sea más evidente qué usuario es dueño del club»). Si eres tú: «Tu club». */
function chipDueno(lm, { corto = false } = {}) {
  if (!lm?.dt) return '';
  const tuyo = Boolean(lm.dt.id) && lm.dt.id === getState().session?.user?.id;
  const cara = lm.dt.avatar ? `<img src="${esc(lm.dt.avatar)}" alt="" referrerpolicy="no-referrer">` : `<em>${esc(iniciales(lm.dt.nombre))}</em>`;
  return `<span class="sf-dueno" data-tuyo="${tuyo}" title="DT: ${esc(lm.dt.nombre)}"><span class="sf-dueno-av">${cara}</span><span class="sf-dueno-tx">${corto ? '' : '<small>DT</small>'}<b>${tuyo ? 'Tu club' : esc(lm.dt.nombre)}</b></span></span>`;
}
const logoLiga = (liga, px = 22) => { const u = logoLigaUrl(liga); return u ? `<span class="sf-liga-logo" style="--px:${px}px"><img src="${u}" alt="" loading="lazy" decoding="async"></span>` : ''; };

/** Abre la sala. Devuelve una promesa con { jugador, destino, lm, dtOrigen, dtDestino } o null si se cierra sin elegir.
 *  Opciones: soloLm = el destino tiene que ser un club de la Liga Máster; jugador/etapa = empezar con alguien ya elegido. */
export function abrirSala({ soloLm = false, jugador = null } = {}) {
  return new Promise((resolver) => {
    const previo = document.activeElement;
    const st = { etapa: jugador ? 'destino' : 'jugador', liga: LIGAS[0], clubVer: null, jugador, destino: null, texto: '', posFiltro: 'todos', vista: vistaGuardada(), plantillas: null, lm: { clubes: new Map(), jugadores: new Map() } };
    const raiz = document.createElement('div');
    raiz.className = 'sf'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Sala de fichajes');
    raiz.innerHTML = `
      <div class="sf-fondo" data-cerrar></div>
      <div class="sf-caja">
        <header class="sf-cab">
          <div class="sf-titulo"><h2>Sala de fichajes</h2><p data-sub></p></div>
          <ol class="sf-pasos" aria-label="Pasos"><li data-paso="jugador">Jugador</li><li data-paso="destino">Destino</li></ol>
          <button type="button" class="sf-x" data-cerrar aria-label="Cerrar la sala"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="sf-cuerpo">
          <nav class="sf-riel" aria-label="Ligas">
            <label class="sf-buscar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-buscar autocomplete="off" placeholder="Buscar jugador o club" aria-label="Buscar jugador o club"></label>
            <div class="sf-ligas" data-ligas></div>
          </nav>
          <main class="sf-centro" data-centro aria-live="polite"></main>
          <aside class="sf-lado" data-lado></aside>
        </div>
      </div>`;
    document.body.append(raiz);
    document.documentElement.style.overflow = 'hidden';
    const $ = (s) => raiz.querySelector(s);

    const cerrar = (res) => {
      document.removeEventListener('keydown', teclas, true);
      raiz.classList.add('sf-saliendo');
      document.documentElement.style.overflow = '';
      setTimeout(() => raiz.remove(), 220);
      previo?.focus?.();
      resolver(res);
    };
    const lmDe = (clubId) => st.lm.clubes.get(clubId) ?? null;

    function pintarLigas() {
      const n = (l) => CLUBES_PES.filter((c) => c.liga === l).length;
      const items = [...LIGAS.map((l) => ({ id: l, n: n(l) })), { id: LM, n: st.lm.clubes.size }];
      $('[data-ligas]').innerHTML = items.map((l) => `<button type="button" class="sf-liga" data-liga="${esc(l.id)}" aria-pressed="${l.id === st.liga && !st.texto}">${logoLiga(l.id)}<span class="sf-liga-nombre">${esc(l.id)}</span><em>${l.n}</em></button>`).join('');
    }
    function tarjetaClub(c, i) {
      const lm = lmDe(c.id);
      const bloqueado = st.etapa === 'destino' && (c.id === st.jugador?.clubId || (soloLm && !lm));
      const sel = (st.etapa === 'jugador' && st.clubVer === c.id) || (st.etapa === 'destino' && st.destino === c.id);
      const motivo = c.id === st.jugador?.clubId && st.etapa === 'destino' ? 'Aquí juega ahora' : bloqueado ? 'No está en la Liga Máster' : '';
      return `<button type="button" class="sf-club" data-club="${c.id}"${lm?.dt ? ' data-con-dt' : ''} style="--i:${Math.min(i, 30)}" aria-pressed="${sel}" ${bloqueado ? 'disabled' : ''}${motivo ? ` title="${motivo}"` : ''}>
        <span class="sf-esc">${escudoImg(c, 56)}</span><b>${esc(c.nombre)}</b><small>${esc(c.liga)}</small>${lm?.dt ? chipDueno(lm) : insigniaDt(lm)}${motivo === 'Aquí juega ahora' ? '<span class="sf-aqui">Origen</span>' : ''}</button>`;
    }
    function pintarCentro() {
      const c = $('[data-centro]');
      const texto = st.texto.trim();
      let html = '';
      if (texto.length >= 2) {
        const clubes = buscarClubes(texto, { max: 6 });
        const jugs = st.etapa === 'jugador' ? buscarJugadoresPes(texto, st.plantillas, { max: 18 }) : [];
        html += clubes.length ? `<h3 class="sf-h">Clubes</h3><div class="sf-rejilla">${clubes.map(tarjetaClub).join('')}</div>` : '';
        html += jugs.length ? `<h3 class="sf-h">Jugadores</h3><ul class="sf-lista">${jugs.map((j, i) => { const dl = lmDe(j.clubId); return `<li><button type="button" class="sf-jug" data-linea="${lineaDe(j.pos)}" data-pid="${j.pid}" data-club="${j.clubId}"${dl?.dt ? ' data-con-dt' : ''} style="--i:${i}">${avatar(j, 44)}<span><b>${esc(j.nombre)}</b><small>${esc(j.pos)} · ${esc(porId.get(j.clubId)?.nombre ?? '')}</small></span>${chipDueno(dl)}${escudoImg(porId.get(j.clubId), 26)}</button></li>`; }).join('')}</ul>` : '';
        if (!clubes.length && !jugs.length) html = `<p class="sf-vacio">Nada con «${esc(texto)}». Prueba con otra parte del nombre.</p>`;
      } else {
        const lista = ordenarPorPrestigio(st.liga === LM ? CLUBES_PES.filter((x) => st.lm.clubes.has(x.id)) : CLUBES_PES.filter((x) => x.liga === st.liga));
        html = `<h3 class="sf-h">${st.etapa === 'jugador' ? 'Elige el club del jugador' : 'Elige el club al que va'}</h3>
          ${lista.length ? `<div class="sf-rejilla">${lista.map(tarjetaClub).join('')}</div>` : '<p class="sf-vacio">Ningún club de la Liga Máster cargó todavía.</p>'}
          ${st.liga === 'Bundesliga' ? '<p class="sf-nota">Tu parche solo trae 4 clubes de la Bundesliga: PES no la licencia entera.</p>' : ''}`;
      }
      c.innerHTML = html; c.scrollTop = 0;
    }
    function pintarLado() {
      const l = $('[data-lado]');
      l.dataset.etapa = st.etapa;
      if (st.etapa === 'jugador') {
        const club = porId.get(st.clubVer);
        if (!club) { l.innerHTML = '<div class="sf-hueco"><i class="fa-solid fa-people-group" aria-hidden="true"></i><p>Elige un club para ver su plantilla.</p></div>'; l.dataset.abierto = '0'; return; }
        const lm = lmDe(club.id);
        const grupos = agruparPlantilla(st.plantillas?.[club.id] ?? []);
        if (st.posFiltro !== 'todos' && !grupos.some((g) => g.linea === st.posFiltro)) st.posFiltro = 'todos';
        const total = grupos.reduce((n, g) => n + g.jugadores.length, 0);
        const visibles = st.posFiltro === 'todos' ? grupos : grupos.filter((g) => g.linea === st.posFiltro);
        const fila = (j, i) => st.vista === 'bloques'
          ? `<li><button type="button" class="sf-jug sf-bloque" data-linea="${lineaDe(j.pos)}" data-pid="${j.pid}" data-club="${club.id}" style="--i:${Math.min(i, 14)}">${avatar(j, 64)}<b>${esc(j.nombre)}</b><small>${esc(j.pos)}</small></button></li>`
          : `<li><button type="button" class="sf-jug" data-linea="${lineaDe(j.pos)}" data-pid="${j.pid}" data-club="${club.id}" style="--i:${Math.min(i, 14)}">${avatar(j, 44)}<span><b>${esc(j.nombre)}</b><small>${esc(j.pos)}</small></span><em class="sf-elegir">Elegir</em></button></li>`;
        const filtros = grupos.length > 1 ? `<div class="sf-pl-barra">
            <div class="sf-pos" role="group" aria-label="Filtrar por posición"><button type="button" data-pos="todos" aria-pressed="${st.posFiltro === 'todos'}">Todos <em>${total}</em></button>${grupos.map((g) => `<button type="button" data-pos="${esc(g.linea)}" aria-pressed="${st.posFiltro === g.linea}">${esc(g.nombre)} <em>${g.jugadores.length}</em></button>`).join('')}</div>
            <div class="sf-vista" role="group" aria-label="Forma de ver la plantilla"><button type="button" data-vista="lista" aria-pressed="${st.vista === 'lista'}" aria-label="Ver en lista" title="Lista"><i class="fa-solid fa-list" aria-hidden="true"></i></button><button type="button" data-vista="bloques" aria-pressed="${st.vista === 'bloques'}" aria-label="Ver en bloques" title="Bloques"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i></button></div></div>` : '';
        l.dataset.abierto = '1';
        l.innerHTML = `<div class="sf-plantilla"><div class="sf-pl-cab"><button type="button" class="sf-atras" data-atras aria-label="Volver a los clubes"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>${escudoImg(club, 48)}
          <div><h3>${esc(club.nombre)}</h3><p>${esc(club.liga)} · ${esc(paisDe(club))}${lm && !lm.dt ? ' · lo lleva la IA' : ''}</p></div>${chipDueno(lm)}</div>${filtros}
          <div class="sf-pl-cuerpo" data-vista-actual="${st.vista}">${visibles.map((g) => `<h4 class="sf-h" data-linea="${esc(g.linea)}">${esc(g.nombre)}</h4><ul class="sf-lista ${st.vista === 'bloques' ? 'sf-lista-bloques' : ''}">${g.jugadores.map(fila).join('')}</ul>`).join('') || '<p class="sf-vacio">Este club no tiene plantilla en tu parche.</p>'}</div></div>`;
        return;
      }
      const j = st.jugador, origen = porId.get(j.clubId), dest = porId.get(st.destino);
      const lmO = lmDe(j.clubId), lmD = st.destino ? lmDe(st.destino) : null;
      const usuario = (x, texto) => (x === null || x === undefined ? '' : `<li><span>${texto}</span>${x.dt ? `<b>${insigniaDt(x)} ${esc(x.dt.nombre)}</b>` : '<b>IA (sin DT)</b>'}</li>`);
      l.dataset.abierto = '1';
      l.innerHTML = `<div class="sf-trasp">
        <div class="sf-trasp-jug">${avatar(j, 84)}<div><h3>${esc(j.nombre)}</h3><p>${esc(j.pos)}${origen ? ` · ${esc(origen.nombre)}` : ''}</p></div></div>
        <div class="sf-ruta">
          <div class="sf-ruta-club"><span class="sf-esc">${escudoImg(origen, 64)}</span><b>${esc(origen?.nombre ?? 'Sin club')}</b><small>Sale de</small></div>
          <svg class="sf-flecha" viewBox="0 0 48 12" aria-hidden="true"><path d="M1 6h44M40 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>
          <div class="sf-ruta-club" data-listo="${Boolean(dest)}"><span class="sf-esc">${dest ? escudoImg(dest, 64) : '<i class="fa-solid fa-question" aria-hidden="true"></i>'}</span><b>${esc(dest?.nombre ?? 'Elige el destino')}</b><small>${dest ? `${esc(dest.liga)} · ${esc(paisDe(dest))}` : 'Va a'}</small></div>
        </div>
        ${(lmO !== null || lmD !== null) ? `<ul class="sf-usuarios">${usuario(lmO, 'Pierde al jugador')}${st.destino ? usuario(lmD, 'Lo recibe') : ''}</ul>` : ''}
        ${soloLm && st.destino && !lmD ? '<p class="sf-nota">Este club no está en la Liga Máster.</p>' : ''}
        <div class="sf-acciones"><button type="button" class="sf-confirmar" data-confirmar ${dest && (!soloLm || lmD) ? '' : 'disabled'}>Confirmar fichaje <i class="fa-solid fa-check" aria-hidden="true"></i></button>
          <button type="button" class="sf-cambiar" data-cambiar-jugador>Cambiar jugador</button></div>
      </div>`;
      const cara = $('[data-lado] .sf-av'); if (cara && !minifaceUrl(j.pid)) { cara.dataset.foto = j.nombre; cara.dataset.club = origen?.nombre ?? ''; montarFotos(cara.parentElement); }
    }
    const subtitulo = () => { $('[data-sub]').textContent = st.etapa === 'jugador' ? 'Elige un club y, dentro, al jugador. O búscalo por su nombre.' : `${st.jugador.nombre} se va de ${porId.get(st.jugador.clubId)?.nombre ?? 'su club'}. ¿A cuál?`; for (const p of raiz.querySelectorAll('[data-paso]')) { p.dataset.activo = String(p.dataset.paso === st.etapa); p.dataset.hecho = String(p.dataset.paso === 'jugador' && st.etapa === 'destino'); } };
    const todo = () => { subtitulo(); pintarLigas(); pintarCentro(); pintarLado(); };

    function elegirJugador(pid, clubId) {
      const fila = (st.plantillas?.[clubId] ?? []).find((x) => x[0] === Number(pid)); if (!fila) return;
      st.jugador = { pid: fila[0], nombre: fila[1], pos: fila[2], clubId: Number(clubId) }; st.etapa = 'destino'; st.destino = null; st.texto = ''; raiz.querySelector('[data-buscar]').value = '';
      st.liga = porId.get(Number(clubId))?.liga ?? st.liga; todo();
    }
    function confirmar() {
      const j = st.jugador, o = porId.get(j.clubId), d = porId.get(st.destino); if (!d) return;
      const lmO = lmDe(o?.id), lmD = lmDe(d.id), lmJ = st.lm.jugadores.get(j.pid);
      cerrar({ jugador: { ...j, clubNombre: o?.nombre ?? '' }, destino: { clubId: d.id, nombre: d.nombre },
        lm: { jugadorId: lmJ?.id ?? null, clubId: lmD?.id ?? null }, dtOrigen: lmO?.dt ?? null, dtDestino: lmD?.dt ?? null });
    }

    raiz.addEventListener('click', (e) => {
      const t = e.target.closest('button, [data-cerrar]'); if (!t) return;
      if (t.matches('[data-cerrar]')) return cerrar(null);
      if (t.dataset.liga) { st.liga = t.dataset.liga; st.texto = ''; $('[data-buscar]').value = ''; st.clubVer = null; return todo(); }
      if (t.matches('.sf-club')) {
        const id = Number(t.dataset.club);
        if (st.etapa === 'jugador') { st.clubVer = id; st.posFiltro = 'todos'; pintarCentro(); pintarLado(); } else { st.destino = id; pintarCentro(); pintarLado(); }
        return;
      }
      if (t.matches('.sf-jug')) return elegirJugador(t.dataset.pid, t.dataset.club);
      if (t.dataset.pos) { st.posFiltro = t.dataset.pos; return pintarLado(); }
      if (t.dataset.vista) { st.vista = t.dataset.vista; try { localStorage.setItem('sf-vista', st.vista); } catch { /* sin almacenamiento */ } return pintarLado(); }
      if (t.matches('[data-atras]')) { st.clubVer = null; st.posFiltro = 'todos'; pintarCentro(); return pintarLado(); }
      if (t.matches('[data-cambiar-jugador]')) { st.etapa = 'jugador'; st.destino = null; st.jugador = null; return todo(); }
      if (t.matches('[data-confirmar]') && !t.disabled) confirmar();
    });
    $('[data-buscar]').addEventListener('input', (e) => { st.texto = e.target.value; pintarLigas(); pintarCentro(); });
    const teclas = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(null); return; }
      if (e.key !== 'Tab') return;
      const f = [...raiz.querySelectorAll('button:not([disabled]), input, [href]')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', teclas, true);

    $('[data-centro]').innerHTML = '<p class="sf-vacio">Cargando clubes y plantillas…</p>';
    requestAnimationFrame(() => { raiz.classList.add('sf-visible'); $('[data-buscar]').focus({ preventScroll: true }); });
    Promise.all([cargarPlantillas(), cargarLm()]).then(([p, lm]) => { st.plantillas = p; st.lm = lm; todo(); });
    todo();
  });
}
