// Portada «4 ventanas» (FX.ventanas, ronda 232).
//  · Llena Zona Social (muro de la comunidad), Duelos (retos abiertos) y Mi Club (mercado de la Liga Máster) desde la base.
//    Competencia ya viene en el HTML con los resultados reales. Si algo falla o no hay datos, se queda el texto «vacío».
//  · Mueve las ventanas UNA A LA VEZ, por turnos (como los tableros de un aeropuerto): nunca cambian todas juntas.
//  · Se pausa con el mouse sobre las ventanas, con el foco del teclado y con la pestaña oculta. Con «menos movimiento» no rota.
//  · Con sesión, el saludo dice «Hola de nuevo, <nombre>».
import { supabase } from '../core/supabase.js';
import { escapeHTML, safeImg } from '../core/dom.js';
import { avatarHTML } from '../core/avatar.js';
import { onSession } from '../core/session.js';
import { tiempoRelativo } from '../core/muro.js';
import { hayMovimientoReducido } from './ajustes.js';
import { itemDuelo, itemSocial, itemFichaje } from '../core/ventanas.js';

const TURNO_MS = 2800;
// Si el elemento tiene persona, va su foto; si no (un fichaje), el ícono de la ventana.
// Con «sin íconos» (FX.sinIconos) no se pone ícono de relleno: si no hay foto ni escudo real, va solo el texto.
const mediaHTML = (it, icono, limpio) => {
  if (it.avatar) return `<span class="vt-media"><span class="vt-avatar">${avatarHTML(it.avatar.url ?? null, it.avatar.nombre ?? '?', 32)}</span></span>`;
  if (it.escudo) return `<span class="vt-media"><img src="${escapeHTML(it.escudo)}" alt="" loading="lazy" width="32" height="32"></span>`;
  return limpio ? '' : `<span class="vt-media vt-media-ico">${icono}</span>`;
};
const itemHTML = (icono, limpio) => (it, i) => `<span class="vt-item"${i === 0 ? ' data-on' : ''}>
  ${mediaHTML(it, icono, limpio)}
  <span class="vt-txt"><b>${escapeHTML(it.titulo)}</b><small>${escapeHTML(it.meta)}</small></span></span>`;

function pintar(caja, items) {
  if (!caja || !items.length) return;
  const icono = caja.closest('[data-vt-ventana]')?.querySelector('.vt-ico')?.innerHTML ?? '';
  const limpio = Boolean(caja.closest('.vt-limpio'));
  caja.innerHTML = items.map(itemHTML(icono, limpio)).join('');
}

async function social() {
  const { data, error } = await supabase.rpc('muro_comunidad', { p_antes: null, p_limite: 6 });
  if (error) throw error;
  return (data?.items ?? []).map((p) => itemSocial(p, tiempoRelativo(p.created_at)));
}

async function duelos() {
  const { data, error } = await supabase.from('retos_matchmaking').select('id, retador_id, modalidad, plataforma, tam_a, tam_b').eq('estado', 'BUSCANDO').order('created_at', { ascending: false }).limit(6);
  if (error) throw error;
  if (!data?.length) return [];
  const ids = [...new Set(data.map((r) => r.retador_id).filter(Boolean))];
  const { data: ps } = await supabase.from('perfiles').select('id, username, nombre_display, avatar_url').in('id', ids);
  const por = new Map((ps ?? []).map((p) => [p.id, p]));
  return data.map((r) => itemDuelo(r, por.get(r.retador_id)));
}

async function mercado() {
  const { data, error } = await supabase.from('lm_movimientos').select('jugador_id, de_club, a_club, tipo').eq('liga', 'galaxy').order('created_at', { ascending: false }).limit(6);
  if (error) throw error;
  if (!data?.length) return [];
  const jIds = [...new Set(data.map((m) => m.jugador_id).filter(Boolean))];
  const cIds = [...new Set(data.flatMap((m) => [m.de_club, m.a_club]).filter(Boolean))];
  const [js, cs] = await Promise.all([
    jIds.length ? supabase.from('lm_jugadores').select('id, nombre').in('id', jIds) : { data: [] },
    cIds.length ? supabase.from('lm_clubes').select('id, nombre, escudo_url').in('id', cIds) : { data: [] },
  ]);
  const nj = new Map((js.data ?? []).map((x) => [x.id, x.nombre])); const nc = new Map((cs.data ?? []).map((x) => [x.id, x.nombre]));
  const esc = new Map((cs.data ?? []).map((x) => [x.id, safeImg(x.escudo_url)]));
  // Si el club de destino tiene escudo real, se muestra (si no, solo el texto).
  return data.map((m) => ({ ...itemFichaje(m, nj.get(m.jugador_id), nc.get(m.a_club), nc.get(m.de_club)), escudo: esc.get(m.a_club) || null }));
}

function saludo(tit) {
  if (!tit) return;
  const original = tit.innerHTML;
  let ultimo;
  onSession((st) => {
    const nombre = st.session && st.profile ? (st.profile.nombre_display || st.profile.username || '') : '';
    if (nombre === ultimo) return; ultimo = nombre;
    if (!nombre) { tit.innerHTML = original; return; }
    const w = (txt, i) => `<span class="esc-w" style="--i:${i}">${escapeHTML(txt)}</span>`;
    tit.innerHTML = `<span class="esc-l1">${w('Hola', 0)} ${w('de', 1)} ${w('nuevo,', 2)}</span><span class="esc-l2 esc-marca">${w(nombre, 3)}</span>`;
  });
}

export function montarVentanas() {
  const root = document.querySelector('[data-vt]');
  if (!root) return;
  saludo(root.querySelector('[data-vt-tit]'));
  const caja = (id) => root.querySelector(`[data-vt-ventana="${id}"] [data-vt-items]`);
  const cargas = [['social', social], ['duelos', duelos], ['club', mercado]];
  cargas.forEach(([id, fn]) => fn().then((items) => pintar(caja(id), items)).catch((e) => console.warn(`[ventanas] ${id}:`, e?.message ?? e)));

  if (root.classList.contains('vt-plus')) caras(root);   // las caras funcionan siempre (también con «menos movimiento»)
  if (hayMovimientoReducido()) { root.setAttribute('data-quieto', ''); return; }
  const ventanas = [...root.querySelectorAll('[data-vt-ventana]')];
  const grid = root.querySelector('[data-vt-grid]');
  const motivos = new Set();
  const poner = (m, si) => (si ? motivos.add(m) : motivos.delete(m));
  if (window.matchMedia('(hover: hover)').matches) { grid?.addEventListener('pointerenter', () => poner('mouse', true)); grid?.addEventListener('pointerleave', () => poner('mouse', false)); }
  root.addEventListener('focusin', (e) => { if (e.target.matches?.(':focus-visible')) poner('foco', true); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) poner('foco', false); });
  document.addEventListener('visibilitychange', () => poner('oculta', document.hidden));

  if (root.classList.contains('vt-3d')) profundidad(root);
  let turno = 0;
  // Con 3D, la primera rotación espera a que termine la entrada por etapas (así nada se pisa).
  const arranque = root.classList.contains('vt-3d') ? 3400 - TURNO_MS : 0;
  setTimeout(() => setInterval(rotar, TURNO_MS), Math.max(0, arranque));
  function rotar() {
    if (motivos.size) return;
    // Busca la siguiente ventana que tenga más de un elemento (si ninguna tiene, no hace nada).
    for (let k = 0; k < ventanas.length; k += 1) {
      const v = ventanas[(turno + k) % ventanas.length];
      if (v.hasAttribute('data-girada')) continue;   // la que está dada vuelta no cambia
      const items = [...v.querySelectorAll('.vt-item')];
      if (items.length < 2) continue;
      const i = items.findIndex((x) => x.hasAttribute('data-on'));
      const sale = items[i]; const entra = items[(i + 1) % items.length];
      sale.removeAttribute('data-on'); sale.setAttribute('data-sale', ''); setTimeout(() => sale.removeAttribute('data-sale'), 700);
      entra.setAttribute('data-on', '');
      v.setAttribute('data-latido', ''); setTimeout(() => v.removeAttribute('data-latido'), 900);
      turno = (turno + k + 1) % ventanas.length;
      return;
    }
  }
}

// 3D (FX.ventanas3d): la escena se inclina un poco hacia el mouse; la ventana bajo el mouse se inclina más, su brillo sigue al mouse
// y sus capas se separan. Solo con mouse de verdad. Un solo requestAnimationFrame por cuadro (no se recalcula de más).
function profundidad(root) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const header = root.closest('[data-portada]') ?? root;
  const grid = root.querySelector('[data-vt-grid]');
  const galaxy = root.querySelector('[data-vt-galaxy]');
  let pend = null; let activa = null;
  const aplicar = () => {
    const e = pend; pend = null; if (!e || !grid) return;
    const r = header.getBoundingClientRect();
    const gx = ((e.clientY - r.top) / r.height - 0.5) * -4;   // escena: máx. ±2°
    const gy = ((e.clientX - r.left) / r.width - 0.5) * 6;    // escena: máx. ±3°
    grid.style.setProperty('--gx', `${gx.toFixed(2)}deg`); grid.style.setProperty('--gy', `${gy.toFixed(2)}deg`);
    galaxy?.style.setProperty('--gtx', `${(gx * 3).toFixed(2)}deg`); galaxy?.style.setProperty('--gty', `${(gy * 3).toFixed(2)}deg`);
    const v = e.target.closest?.('[data-vt-ventana]');
    if (activa && activa !== v) soltar(activa);
    if (!v) { activa = null; return; }
    activa = v;
    const b = v.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)); const y = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
    v.setAttribute('data-hover', '');
    v.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`);
    v.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
    v.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); v.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    v.style.setProperty('--px', `${((x - 0.5) * 8).toFixed(2)}px`); v.style.setProperty('--py', `${((y - 0.5) * 8).toFixed(2)}px`);
  };
  const soltar = (v) => { v.removeAttribute('data-hover'); ['--rx', '--ry', '--mx', '--my', '--px', '--py'].forEach((k) => v.style.removeProperty(k)); };
  header.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; root.setAttribute('data-mouse', ''); if (!pend) requestAnimationFrame(aplicar); pend = e; });
  header.addEventListener('pointerleave', () => {
    root.removeAttribute('data-mouse'); pend = null;
    grid?.style.removeProperty('--gx'); grid?.style.removeProperty('--gy');
    galaxy?.style.removeProperty('--gtx'); galaxy?.style.removeProperty('--gty');
    if (activa) { soltar(activa); activa = null; }
  });
}

// Caras (FX.interactivo): tocar una ventana la da vuelta y muestra qué puedes hacer en ese mundo. Solo una dada vuelta a la vez.
// Escape, «×» o tocar fuera la vuelven. Con teclado, el foco va al primer enlace del dorso y regresa al volver.
function caras(root) {
  const vs = [...root.querySelectorAll('[data-vt-ventana]')];
  let abierta = null;
  const poner = (v, si, foco) => {
    const btn = v.querySelector('[data-vt-girar]'); const dorso = v.querySelector('.vt-dorso'); const frente = v.querySelector('.vt-frente');
    v.toggleAttribute('data-girada', si);
    btn?.setAttribute('aria-expanded', String(si));
    if (dorso) dorso.inert = !si;
    if (frente) frente.inert = si;
    if (foco) (si ? dorso?.querySelector('a') : btn)?.focus({ preventScroll: true });
  };
  const cerrar = (foco = false) => { if (!abierta) return; const v = abierta; abierta = null; poner(v, false, foco); };
  vs.forEach((v) => {
    v.querySelector('[data-vt-girar]')?.addEventListener('click', (e) => {
      destello(v, e);
      if (abierta && abierta !== v) cerrar();
      abierta = v; poner(v, true, e.detail === 0);
    });
    v.querySelector('[data-vt-volver]')?.addEventListener('click', () => cerrar(true));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(true); });
  document.addEventListener('pointerdown', (e) => { if (abierta && !abierta.contains(e.target)) cerrar(); });
}

// Destello de luz desde el punto donde se tocó (del color del mundo).
function destello(v, e) {
  if (hayMovimientoReducido()) return;
  const cara = v.querySelector('.vt-frente'); if (!cara) return;
  const r = cara.getBoundingClientRect();
  const x = e.clientX ? e.clientX - r.left : r.width / 2; const y = e.clientY ? e.clientY - r.top : r.height / 2;
  const s = document.createElement('span'); s.className = 'vt-destello'; s.style.left = `${x}px`; s.style.top = `${y}px`;
  cara.append(s); s.addEventListener('animationend', () => s.remove());
}
