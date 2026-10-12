// Portada «4 ventanas» (FX.ventanas, ronda 232).
//  · Llena Zona Social (muro de la comunidad), Duelos (retos abiertos) y Mi Club (mercado de la Liga Máster) desde la base.
//    Competencia ya viene en el HTML con los resultados reales. Si algo falla o no hay datos, se queda el texto «vacío».
//  · Mueve las ventanas UNA A LA VEZ, por turnos (como los tableros de un aeropuerto): nunca cambian todas juntas.
//  · Se pausa con el mouse sobre las ventanas, con el foco del teclado y con la pestaña oculta. Con «menos movimiento» no rota.
//  · Con sesión, el saludo dice «Hola de nuevo, <nombre>».
import { supabase } from '../core/supabase.js';
import { escapeHTML } from '../core/dom.js';
import { avatarHTML } from '../core/avatar.js';
import { onSession } from '../core/session.js';
import { tiempoRelativo } from '../core/muro.js';
import { hayMovimientoReducido } from './ajustes.js';
import { itemDuelo, itemSocial, itemFichaje } from '../core/ventanas.js';

const TURNO_MS = 2800;
// Si el elemento tiene persona, va su foto; si no (un fichaje), el ícono de la ventana.
const itemHTML = (icono) => (it, i) => `<span class="vt-item"${i === 0 ? ' data-on' : ''}>
  ${it.avatar ? `<span class="vt-media"><span class="vt-avatar">${avatarHTML(it.avatar.url ?? null, it.avatar.nombre ?? '?', 32)}</span></span>` : `<span class="vt-media vt-media-ico">${icono}</span>`}
  <span class="vt-txt"><b>${escapeHTML(it.titulo)}</b><small>${escapeHTML(it.meta)}</small></span></span>`;

function pintar(caja, items) {
  if (!caja || !items.length) return;
  const icono = caja.closest('[data-vt-ventana]')?.querySelector('.vt-ico')?.innerHTML ?? '';
  caja.innerHTML = items.map(itemHTML(icono)).join('');
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
    cIds.length ? supabase.from('lm_clubes').select('id, nombre').in('id', cIds) : { data: [] },
  ]);
  const nj = new Map((js.data ?? []).map((x) => [x.id, x.nombre])); const nc = new Map((cs.data ?? []).map((x) => [x.id, x.nombre]));
  return data.map((m) => itemFichaje(m, nj.get(m.jugador_id), nc.get(m.a_club), nc.get(m.de_club)));
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

  if (hayMovimientoReducido()) { root.setAttribute('data-quieto', ''); return; }
  const ventanas = [...root.querySelectorAll('[data-vt-ventana]')];
  const grid = root.querySelector('[data-vt-grid]');
  const motivos = new Set();
  const poner = (m, si) => (si ? motivos.add(m) : motivos.delete(m));
  if (window.matchMedia('(hover: hover)').matches) { grid?.addEventListener('pointerenter', () => poner('mouse', true)); grid?.addEventListener('pointerleave', () => poner('mouse', false)); }
  root.addEventListener('focusin', (e) => { if (e.target.matches?.(':focus-visible')) poner('foco', true); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) poner('foco', false); });
  document.addEventListener('visibilitychange', () => poner('oculta', document.hidden));

  let turno = 0;
  setInterval(() => {
    if (motivos.size) return;
    // Busca la siguiente ventana que tenga más de un elemento (si ninguna tiene, no hace nada).
    for (let k = 0; k < ventanas.length; k += 1) {
      const v = ventanas[(turno + k) % ventanas.length];
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
  }, TURNO_MS);
}
