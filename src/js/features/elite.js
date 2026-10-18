// Portada «palco VIP» (FX.elite, ronda 228). Todo lo que necesita internet o la sesión:
//  · sin sesión: pone la foto (y la media) de la ficha del líder si existe;
//  · con sesión: saluda por el nombre y cambia la vitrina por el «pase de miembro» (número, puesto, puntos, próximo partido);
//  · efecto 3D + brillo holográfico del pase (solo con mouse y si no se pidió menos movimiento);
//  · entrada tipo transmisión, una vez al día.
// La lógica pura está en core/portada/pase.js (con pruebas). Si algo falla, el pase del líder que viene en el HTML se queda tal cual.
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML, safeImg } from '../core/sistema/dom.js';
import { escudoHTML } from '../core/sistema/escudos.js';
import { onSession } from '../core/sistema/session.js';
import { hayMovimientoReducido } from './ajustes.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { calcularTabla } from '../core/competicion/tabla.js';
import { liderDe, puestoDe, proximoPartido, nombreEnLiga, numeroMiembro, tocaIntro } from '../core/portada/pase.js';

const CLAVE_INTRO = 'pes-intro-dia';
const ed = EDICIONES.galaxy.find((e) => e.estado === 'en_curso') ?? null;
const fechas = ed?.fechas ?? [];
const tabla = calcularTabla(fechas.flatMap((f) => f.partidos)).tabla;
const nombresLiga = [...new Set([...Object.keys(ed?.clubes ?? {}), ...tabla.map((f) => f.nombre)])];

const fotoHTML = (url, alt, club) => `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt)}" class="pase-img" loading="eager">${club ? `<span class="pase-mini-escudo">${escudoHTML(club, 26)}</span>` : ''}`;
const dato = (t, v) => `<div><dt>${escapeHTML(t)}</dt><dd>${escapeHTML(String(v))}</dd></div>`;

function entrada(header) {
  if (hayMovimientoReducido()) return;
  let ls = null; try { ls = window.localStorage; } catch { /* sin almacenamiento: no hay entrada */ }
  if (!ls) return;
  const hoy = new Date().toLocaleDateString('en-CA');
  try { if (!tocaIntro(ls.getItem(CLAVE_INTRO), hoy)) return; ls.setItem(CLAVE_INTRO, hoy); } catch { return; }
  header.setAttribute('data-intro', '');
  setTimeout(() => header.removeAttribute('data-intro'), 1800);
}

function inclinar(vitrina) {
  const pase = vitrina.querySelector('.pase');
  if (!pase || hayMovimientoReducido() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  vitrina.addEventListener('pointermove', (e) => {
    const r = pase.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    pase.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
    pase.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`);
    pase.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    pase.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    pase.dataset.activo = '';
  });
  vitrina.addEventListener('pointerleave', () => { ['--rx', '--ry', '--mx', '--my'].forEach((k) => pase.style.removeProperty(k)); delete pase.dataset.activo; });
}

async function fotoLider(caja) {
  const l = liderDe(tabla); if (!l || !caja) return;
  try {
    const n = l.nombre.replace(/[,()*%]/g, '');
    const { data, error } = await supabase.from('jugadores').select('nombre, apodo, foto_url, foto, ovr').or(`nombre.ilike.${n},apodo.ilike.${n}`).order('ovr', { ascending: false }).limit(1);
    if (error) throw error;
    const j = data?.[0]; const img = j && (safeImg(j.foto_url) || safeImg(j.foto));
    if (!img || document.querySelector('.pase')?.dataset.pase !== 'lider') return;
    caja.innerHTML = fotoHTML(img, l.nombre, ed?.clubes?.[l.nombre]) + (j.ovr ? `<span class="pase-ovr">${escapeHTML(String(j.ovr))}</span>` : '');
    caja.classList.add('con-foto');
  } catch (e) { console.warn('[elite] foto del líder:', e?.message ?? e); }
}

async function pintarMiembro(p, uid, refs) {
  const { pase, saludo, foto, nombre, club, datos, tipo, num, pie, nota } = refs;
  const visible = p.nombre_display || p.username || 'Jugador';
  const candidatos = [p.nombre_display, p.username];
  const enLiga = nombreEnLiga(nombresLiga, candidatos);
  const pos = puestoDe(tabla, candidatos);
  const prox = enLiga ? proximoPartido(fechas, enLiga) : null;
  const clubLiga = enLiga ? (ed?.clubes?.[enLiga] ?? '') : '';

  pase.dataset.pase = 'miembro';
  if (saludo) saludo.textContent = `Bienvenido de vuelta, ${visible}`;
  tipo.innerHTML = '<i class="fa-solid fa-id-badge"></i> Pase de miembro';
  num.textContent = 'N.º …';
  nombre.textContent = visible;
  club.textContent = clubLiga || (p.username ? `@${p.username}` : 'Phoenix Evolution');
  datos.innerHTML = enLiga
    ? dato('Puesto', pos ? `${pos.puesto}.º` : '—') + dato('Puntos', pos ? pos.fila.pts : 0) + dato('Próximo', prox ? prox.rival : 'Libre')
    : dato('Liga', 'Sin inscribir') + dato('Estado', 'Miembro');
  const desde = p.created_at ? new Date(p.created_at).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }) : '';
  pie.textContent = desde ? `Miembro desde ${desde}` : 'Miembro';
  if (nota) nota.hidden = true;
  const avatar = safeImg(p.avatar_url);
  foto.classList.toggle('con-foto', Boolean(avatar));
  foto.innerHTML = avatar ? fotoHTML(avatar, visible, clubLiga) : `<span class="pase-inicial">${escapeHTML(visible.charAt(0).toUpperCase())}</span>`;

  // Número de miembro = cuántas cuentas se crearon hasta la suya (orden de llegada). Ficha propia = mejor foto y su media.
  const [cuenta, ficha] = await Promise.allSettled([
    p.created_at ? supabase.from('perfiles').select('id', { count: 'exact', head: true }).lte('created_at', p.created_at) : Promise.resolve({ count: null }),
    supabase.from('jugadores').select('foto_url, foto, ovr').eq('perfil_id', uid).order('ovr', { ascending: false }).limit(1),
  ]);
  if (pase.dataset.pase !== 'miembro') return;
  num.textContent = numeroMiembro(cuenta.status === 'fulfilled' && !cuenta.value.error ? cuenta.value.count : null);
  const j = ficha.status === 'fulfilled' ? ficha.value.data?.[0] : null;
  const img = j && (safeImg(j.foto_url) || safeImg(j.foto));
  if (img) { foto.innerHTML = fotoHTML(img, visible, clubLiga); foto.classList.add('con-foto'); }
  if (j?.ovr) foto.insertAdjacentHTML('beforeend', `<span class="pase-ovr">${escapeHTML(String(j.ovr))}</span>`);
}

export function montarElite() {
  const header = document.querySelector('[data-portada].portada-elite');
  const vitrina = document.getElementById('vitrina');
  if (!header || !vitrina) return;
  entrada(header);
  inclinar(vitrina);
  const pase = vitrina.querySelector('.pase');
  const q = (s) => vitrina.querySelector(s);
  const refs = { pase, saludo: header.querySelector('[data-saludo]'), foto: q('[data-pase-foto]'), nombre: q('[data-pase-nombre]'), club: q('[data-pase-club]'), datos: q('[data-pase-datos]'), tipo: q('[data-pase-tipo]'), num: q('[data-pase-num]'), pie: q('[data-pase-pie]'), nota: q('[data-vitrina-nota]') };
  // Copia del pase del líder (viene en el HTML) para volver a él si se cierra la sesión.
  const original = { pase: pase.innerHTML, saludo: refs.saludo?.textContent ?? '', nota: refs.nota?.hidden ?? false };
  const volverAlLider = () => {
    if (pase.dataset.pase === 'lider') return;
    pase.innerHTML = original.pase; pase.dataset.pase = 'lider';
    if (refs.saludo) refs.saludo.textContent = original.saludo;
    if (refs.nota) refs.nota.hidden = original.nota;
    Object.assign(refs, { foto: q('[data-pase-foto]'), nombre: q('[data-pase-nombre]'), club: q('[data-pase-club]'), datos: q('[data-pase-datos]'), tipo: q('[data-pase-tipo]'), num: q('[data-pase-num]'), pie: q('[data-pase-pie]') });
  };
  fotoLider(refs.foto);
  let ultimo = null;
  onSession((st) => {
    const uid = st.session?.user?.id ?? null;
    if (uid === ultimo && (uid === null || pase.dataset.pase === 'miembro')) return;
    ultimo = uid;
    if (uid && st.profile) pintarMiembro(st.profile, uid, refs).catch((e) => console.warn('[elite] pase de miembro:', e?.message ?? e));
    else if (!uid) volverAlLider();
  });
}
