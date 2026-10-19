// SALA DE FICHAJES · MODO MERCADO (Modo Mánager). Fralex, 19-oct-2026: «ese panel estaría mucho mejor en la zona de fichajes, donde los mismos
// jugadores busquen al jugador que quieran fichar» — «por ahora con límites».
// Límites a propósito: solo LEE (clubes y jugadores de la Liga Máster) y NO decide nada. Los botones «Fichar» / «Ofertar» son los mismos del
// mercado de manager.js (data-ofertar…): los atiende su manejador con las reglas de siempre (RPC lm_ofertar: ventana, presupuesto, valor, máx. 40).
// Mismo aspecto que la sala del staff (clases .sf-* de salaFichajes.css). Cuando manager.js termina una operación avisa con «mg:refrescado».
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML as esc, safeUrl } from '../../core/sistema/dom.js';
import { minifaceUrl } from '../fotoFutbolista.js';
import { CLUBES_PES } from '../../../data/clubesPes.js';
import { emparejarClubesLm, escudoImg, ordenarPorPrestigio } from '../../core/pes/clubesPes.js';

const LINEA = { PT: 'por', DEC: 'def', LD: 'def', LI: 'def', MCD: 'med', MC: 'med', MO: 'med', MD: 'med', MI: 'med', ED: 'del', EI: 'del', SD: 'del', DC: 'del' };
const GRUPOS = [['por', 'Porteros'], ['def', 'Defensas'], ['med', 'Mediocampo'], ['del', 'Delanteros'], ['otros', 'Otros']];
const LINEA_SALA = { por: 'porteros', def: 'defensas', med: 'medios', del: 'delanteros', otros: 'otros' };   // colores de línea de salaFichajes.css
const linea = (pos) => LINEA[String(pos ?? '').toUpperCase()] ?? 'otros';
const plata = (n) => { const v = Number(n || 0) / 1e6; return v >= 1 ? `€${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : `€ ${Number(n || 0).toLocaleString('es-PE')}`; };
const iniciales = (n) => { const p = String(n ?? '').split(/\s+/).filter(Boolean); return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const LIBRES = 'libres';

/** Abre la sala. `clubes`: Map id → fila de lm_clubes; `dts`: Map id de perfil → perfil; `miClub`: fila del club del usuario (o null); `cfg`: lm_config. */
export function abrirSalaMercado({ clubes, dts, miClub, cfg }) {
  const previo = document.activeElement;
  const st = { ver: null, texto: '', jugadores: [] };
  // Escudo y orden: cada club de la Liga Máster se empareja (por nombre) con el catálogo de clubes del parche.
  const lista = [...clubes.values()].filter((c) => c.aprobado !== false);
  const cat = new Map([...emparejarClubesLm(lista.map((c) => ({ id: c.id, nombre: c.nombre })), CLUBES_PES)].map(([idCat, lm]) => [lm.id, CLUBES_PES.find((x) => x.id === idCat)]));
  const ordenados = ordenarPorPrestigio(lista.map((c) => ({ nombre: c.nombre, id: cat.get(c.id)?.id ?? -c.id, lmId: c.id }))).map((x) => clubes.get(x.lmId));
  const escudo = (c, px) => (c && cat.get(c.id) ? escudoImg(cat.get(c.id), px) : c && safeUrl(c.escudo_url) ? `<img src="${esc(safeUrl(c.escudo_url))}" alt="" width="${px}" height="${px}" style="width:${px}px;height:${px}px;object-fit:contain">` : `<i class="fa-solid fa-shield-halved" style="font-size:${Math.round(px * 0.7)}px;color:#7d839a" aria-hidden="true"></i>`);
  const dtDe = (c) => (c?.dueno ? dts.get(c.dueno) ?? { id: c.dueno } : null);
  const chipDueno = (c) => {
    const p = dtDe(c); if (!p) return '';
    const tuyo = c.id === miClub?.id; const nom = p.nombre_display || p.username || 'DT';
    const cara = p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer">` : `<em>${esc(iniciales(nom))}</em>`;
    return `<span class="sf-dueno" data-tuyo="${tuyo}" title="DT: ${esc(nom)}"><span class="sf-dueno-av">${cara}</span><span class="sf-dueno-tx"><small>DT</small><b>${tuyo ? 'Tu club' : esc(nom)}</b></span></span>`;
  };
  const avatar = (j, px) => { const u = minifaceUrl(j.pes_id); return `<span class="sf-av" style="--px:${px}px">${u ? `<img src="${u}" alt="" loading="lazy" decoding="async">` : `<em>${esc(iniciales(j.nombre))}</em>`}</span>`; };
  /** Botón de compra: el MISMO que el mercado de manager.js (su manejador hace la operación). */
  const boton = (j) => {
    if (!miClub) return '<em class="sf-mk-nota">Elige tu club para fichar</em>';
    if (j.club_id === miClub.id) return '<em class="sf-mk-nota">Es tuyo</em>';
    const vend = clubes.get(j.club_id); const directo = !vend || !vend.dueno;
    return `<button type="button" class="sf-mk-btn" data-directo="${directo ? 1 : 0}" data-ofertar="${j.id}" data-valor="${j.valor ?? 0}" data-nombre="${esc(j.nombre)}" ${cfg?.ventana_abierta ? '' : 'disabled title="La ventana de fichajes está cerrada"'} aria-label="${directo ? 'Fichar a' : 'Hacer una oferta por'} ${esc(j.nombre)}">${directo ? '<i class="fa-solid fa-signature" aria-hidden="true"></i><span class="sf-mk-btn-tx">Fichar</span>' : '<i class="fa-solid fa-hand-holding-dollar" aria-hidden="true"></i><span class="sf-mk-btn-tx">Ofertar</span>'}</button>`;
  };
  const filaJugador = (j, i, conClub) => `<li><div class="sf-jug sf-mk-jug" data-linea="${LINEA_SALA[linea(j.posicion)]}"${conClub && clubes.get(j.club_id)?.dueno ? ' data-con-dt' : ''} style="--i:${Math.min(i, 14)}">
      ${avatar(j, 44)}<span><b>${esc(j.nombre)}</b><small>${esc(j.posicion ?? '—')} · ${j.media ?? '—'}${conClub ? ` · ${esc(clubes.get(j.club_id)?.nombre ?? 'Agente libre')}` : ''}</small></span>
      <span class="sf-mk-valor">${plata(j.valor)}</span>${boton(j)}</div></li>`;

  const raiz = document.createElement('div');
  raiz.className = 'sf sf-mercado'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Sala de fichajes');
  raiz.innerHTML = `
    <div class="sf-fondo" data-cerrar></div>
    <div class="sf-caja">
      <header class="sf-cab">
        <div class="sf-titulo"><h2>Sala de fichajes</h2><p data-sub></p></div>
        <div class="sf-mk-cifras" data-cifras></div>
        <button type="button" class="sf-x" data-cerrar aria-label="Cerrar la sala"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </header>
      <div class="sf-cuerpo">
        <nav class="sf-riel" aria-label="Clubes">
          <label class="sf-buscar"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" data-buscar autocomplete="off" placeholder="Buscar jugador" aria-label="Buscar jugador"></label>
          <div class="sf-ligas" data-clubes></div>
        </nav>
        <main class="sf-centro" data-centro aria-live="polite"></main>
        <aside class="sf-lado" data-lado></aside>
      </div>
    </div>`;
  document.body.append(raiz);
  document.documentElement.style.overflow = 'hidden';
  const $ = (s) => raiz.querySelector(s);

  const de = (id) => st.jugadores.filter((j) => (id === LIBRES ? j.club_id == null : j.club_id === id));
  function cabecera() {
    $('[data-sub]').textContent = miClub ? `Diriges ${miClub.nombre}. Elige un club y mira su plantilla, o busca al jugador por su nombre.` : 'Mira las plantillas de la Liga Máster. Para fichar, primero elige tu club.';
    $('[data-cifras]').innerHTML = `${miClub ? `<span class="sf-mk-cifra"><small>Presupuesto</small><b>${plata(miClub.presupuesto)}</b></span>` : ''}
      <span class="sf-mk-cifra" data-abierta="${Boolean(cfg?.ventana_abierta)}"><small>Ventana</small><b>${cfg?.ventana_abierta ? 'Abierta' : 'Cerrada'}</b></span>`;
  }
  function riel() {
    const item = (id, nombre, n, icono) => `<button type="button" class="sf-liga" data-ver="${id}" aria-pressed="${st.ver === id && !st.texto}"><span class="sf-mk-esc">${icono}</span><span class="sf-liga-nombre">${esc(nombre)}</span><em>${n}</em></button>`;
    $('[data-clubes]').innerHTML = ordenados.map((c) => item(c.id, c.id === miClub?.id ? `${c.nombre} (tú)` : c.nombre, de(c.id).length, escudo(c, 22))).join('')
      + item(LIBRES, 'Agentes libres', de(LIBRES).length, '<i class="fa-solid fa-unlock" style="color:#34d399" aria-hidden="true"></i>');
  }
  function centro() {
    const c = $('[data-centro]'); const t = st.texto.trim().toLowerCase();
    if (t.length >= 2) {
      const r = st.jugadores.filter((j) => String(j.nombre).toLowerCase().includes(t)).sort((a, b) => (b.media ?? 0) - (a.media ?? 0)).slice(0, 40);
      c.innerHTML = r.length ? `<h3 class="sf-h">Jugadores</h3><ul class="sf-lista">${r.map((j, i) => filaJugador(j, i, true)).join('')}</ul>` : `<p class="sf-vacio">Nadie con «${esc(st.texto.trim())}» en la Liga Máster.</p>`;
      return;
    }
    c.innerHTML = `<h3 class="sf-h">Clubes de la Liga Máster</h3><div class="sf-rejilla">${ordenados.map((x, i) => `<button type="button" class="sf-club" data-ver="${x.id}"${x.dueno ? ' data-con-dt' : ''} style="--i:${Math.min(i, 30)}" aria-pressed="${st.ver === x.id}">
        <span class="sf-esc">${escudo(x, 56)}</span><b>${esc(x.nombre)}</b><small>${de(x.id).length} jugadores</small>${x.dueno ? chipDueno(x) : '<span class="sf-dt sf-dt-ia" title="Lo lleva la IA: se ficha al momento">IA</span>'}</button>`).join('')}</div>
      ${st.jugadores.length ? '' : '<p class="sf-vacio">Cargando jugadores…</p>'}`;
  }
  function lado() {
    const l = $('[data-lado]');
    if (st.ver == null) { l.dataset.abierto = '0'; l.innerHTML = '<div class="sf-hueco"><i class="fa-solid fa-people-group" aria-hidden="true"></i><p>Elige un club para ver su plantilla, su valor y cómo se ficha.</p></div>'; return; }
    const c = st.ver === LIBRES ? null : clubes.get(st.ver);
    const js = de(st.ver).sort((a, b) => (b.media ?? 0) - (a.media ?? 0));
    const grupos = GRUPOS.map(([id, nombre]) => [nombre, js.filter((j) => linea(j.posicion) === id)]).filter(([, g]) => g.length);
    const como = !c ? 'sin club: se fichan al momento' : c.dueno ? 'tiene DT: se le hace una oferta' : 'lo lleva la IA: se ficha al momento';
    l.dataset.abierto = '1';
    l.innerHTML = `<div class="sf-plantilla"><div class="sf-pl-cab"><button type="button" class="sf-atras" data-atras aria-label="Volver a los clubes"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>${c ? escudo(c, 48) : '<i class="fa-solid fa-unlock" style="font-size:28px;color:#34d399" aria-hidden="true"></i>'}
        <div><h3>${esc(c?.nombre ?? 'Agentes libres')}</h3><p>${js.length} jugadores · ${como}</p></div>${chipDueno(c)}</div>
      <div class="sf-pl-cuerpo">${grupos.map(([n, g]) => `<h4 class="sf-h">${esc(n)}</h4><ul class="sf-lista">${g.map((j, i) => filaJugador(j, i, false)).join('')}</ul>`).join('') || '<p class="sf-vacio">Sin jugadores.</p>'}</div></div>`;
  }
  const todo = () => { cabecera(); riel(); centro(); lado(); };

  async function cargar() {
    const { data, error } = await supabase.from('lm_jugadores').select('id, nombre, posicion, media, edad, valor, club_id, pes_id').eq('liga', 'galaxy').limit(3000);
    if (error) { $('[data-centro]').innerHTML = '<p class="sf-vacio">No se pudieron cargar los jugadores. Cierra y vuelve a abrir.</p>'; return; }
    st.jugadores = data ?? []; todo();
  }
  // manager.js repinta tras fichar u ofertar y avisa con el club del usuario y la configuración al día: se recargan jugadores y presupuesto.
  const alRefrescar = (e) => { if (e.detail && 'miClub' in e.detail) miClub = e.detail.miClub; if (e.detail?.cfg) cfg = e.detail.cfg; cargar(); };
  window.addEventListener('mg:refrescado', alRefrescar);

  const dialogoAbierto = () => Boolean(document.getElementById('dialogo-modal'));   // el diálogo (core/sistema/dialogo.js) solo existe mientras está abierto
  const cerrar = () => {
    document.removeEventListener('keydown', teclas, true); window.removeEventListener('mg:refrescado', alRefrescar);
    raiz.classList.add('sf-saliendo'); document.documentElement.style.overflow = '';
    setTimeout(() => raiz.remove(), 220); previo?.focus?.();
  };
  raiz.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-cerrar]'); if (!t) return;
    if (t.matches('[data-cerrar]')) return cerrar();
    if (t.dataset.ver) { st.ver = t.dataset.ver === LIBRES ? LIBRES : Number(t.dataset.ver); st.texto = ''; $('[data-buscar]').value = ''; riel(); centro(); lado(); return; }
    if (t.matches('[data-atras]')) { st.ver = null; riel(); centro(); lado(); }
    // [data-ofertar]: lo atiende manager.js (el clic sube hasta document).
  });
  $('[data-buscar]').addEventListener('input', (e) => { st.texto = e.target.value; riel(); centro(); });
  const teclas = (e) => {
    if (dialogoAbierto()) return;   // con «¿Fichar a…?» abierto, Escape y Tab son del diálogo
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    const f = [...raiz.querySelectorAll('button:not([disabled]), input')].filter((x) => x.offsetParent !== null); if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  document.addEventListener('keydown', teclas, true);
  requestAnimationFrame(() => { raiz.classList.add('sf-visible'); $('[data-buscar]').focus({ preventScroll: true }); });
  todo(); cargar();
}
