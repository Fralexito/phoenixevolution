// INICIO · banda «Tu club» (19-oct-2026). Fralex: gestionar a los jugadores de tu PES desde la web es «lo más exclusivo que tengo».
// Por eso va a la vista nada más entrar, distinta para cada persona:
//   · con club: escudo, nombre, presupuesto, ofertas recibidas, ventana y atajos a Resumen · Fichajes · Vestuario;
//   · con sesión y sin club: invitación a elegir uno (la carrera de DT es opcional);
//   · sin sesión: qué puedes hacer con tu club de PES aquí, y crear la cuenta.
// Solo LEE (lm_clubes, lm_config, lm_ofertas, lm_jugadores); todo lo demás vive en Mi club (/manager/).
import { supabase } from '../../core/sistema/supabase.js';
import { onSession } from '../../core/sistema/session.js';
import { escapeHTML as esc, safeUrl } from '../../core/sistema/dom.js';
import { href } from '../../core/sistema/config.js';
import { CLUBES_PES } from '../../../data/clubesPes.js';
import { emparejarClubesLm, escudoUrl } from '../../core/pes/clubesPes.js';

const LIGA = 'galaxy';
const millones = (n) => { const v = Number(n || 0) / 1e6; return v >= 1 ? `€${v.toLocaleString('es-PE', { maximumFractionDigits: 1 })} M` : `€ ${Number(n || 0).toLocaleString('es-PE')}`; };
const escudoDe = (c) => {
  const [idCat] = [...emparejarClubesLm([{ id: c.id, nombre: c.nombre }], CLUBES_PES).keys()];
  const cat = CLUBES_PES.find((x) => x.id === idCat);
  return cat ? escudoUrl(cat) : safeUrl(c.escudo_url) || null;
};

const VISITANTE = () => `
  <div class="tuclub-caja tuclub-pitch">
    <div class="tuclub-pitch-txt">
      <p class="tuclub-kicker">Solo en Phoenix</p>
      <h2>Tu club de PES, <span>en la web</span></h2>
      <p>Elige tu club, ficha mirando escudos y plantillas, y edita a tus jugadores desde cualquier lado: Phoenix Sync lo lleva a tu partida de PES 2021.</p>
      <div class="tuclub-acciones"><button type="button" class="tuclub-btn" data-tuclub-registro>Crear cuenta y traer mi club</button><a class="tuclub-link" href="${href('manager/')}">Ver Mi club</a></div>
    </div>
    <ul class="tuclub-puntos">
      <li><b>Sala de fichajes</b><span>Clubes, plantillas y el DT de cada club, a un clic.</span></li>
      <li><b>Mi partida de PES</b><span>Dorsales, posiciones y habilidades de tu partida, desde el celular.</span></li>
      <li><b>Carrera de DT</b><span>Presupuesto, ofertas y la ventana de fichajes.</span></li>
    </ul>
  </div>`;

const SIN_CLUB = () => `
  <a class="tuclub-caja tuclub-sin" href="${href('manager/')}">
    <span class="tuclub-escudo tuclub-escudo-vacio" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></span>
    <span class="tuclub-txt"><span class="tuclub-kicker">Mi club</span><b>Aún no diriges un club</b><small>Elige uno de la Liga Máster y empieza tu carrera de DT. Es opcional y lo dejas cuando quieras.</small></span>
    <span class="tuclub-btn">Elegir mi club</span>
  </a>`;

function conClub({ club, ventana, ofertas, plantilla, max }) {
  const esc0 = escudoDe(club);
  const atajo = (h, t) => `<a class="tuclub-atajo" href="${href(`manager/${h}`)}">${t}</a>`;
  return `
  <div class="tuclub-caja tuclub-con">
    <a class="tuclub-id" href="${href('manager/#resumen')}">
      <span class="tuclub-escudo">${esc0 ? `<img src="${esc(esc0)}" alt="" width="64" height="64" loading="lazy" decoding="async">` : '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>'}</span>
      <span class="tuclub-txt"><span class="tuclub-kicker">Tu club</span><b>${esc(club.nombre)}</b><small>Eres el DT · ${plantilla}/${max} jugadores</small></span>
    </a>
    <dl class="tuclub-cifras">
      <div><dt>Presupuesto</dt><dd>${millones(club.presupuesto)}</dd></div>
      <div><dt>Ofertas recibidas</dt><dd class="${ofertas ? 'tuclub-alerta' : ''}">${ofertas}</dd></div>
      <div><dt>Ventana</dt><dd class="${ventana ? 'tuclub-ok' : 'tuclub-no'}">${ventana ? 'Abierta' : 'Cerrada'}</dd></div>
    </dl>
    <nav class="tuclub-atajos" aria-label="Ir a tu club">${atajo('#resumen', 'Resumen')}${atajo('#mercado', 'Fichajes')}${atajo('#vestuario', 'Mi partida de PES')}${ofertas ? atajo('#oficina', 'Responder ofertas') : ''}</nav>
  </div>`;
}

export function montarTuClub() {
  const raiz = document.querySelector('[data-tuclub]'); if (!raiz) return;
  let ultimo = undefined;
  raiz.addEventListener('click', (e) => { if (e.target.closest('[data-tuclub-registro]')) import('../auth.js').then((m) => m.openAuthModal('register')); });
  onSession(async (st) => {
    const yo = st?.session?.user?.id ?? null;
    if (yo === ultimo) return; ultimo = yo;
    if (!yo) { raiz.innerHTML = VISITANTE(); raiz.dataset.estado = 'visitante'; return; }
    try {
      const { data: club } = await supabase.from('lm_clubes').select('id, nombre, escudo_url, presupuesto').eq('liga', LIGA).eq('dueno', yo).maybeSingle();
      if (yo !== ultimo) return;
      if (!club) { raiz.innerHTML = SIN_CLUB(); raiz.dataset.estado = 'sin-club'; return; }
      const [cfg, of, pl] = await Promise.all([
        supabase.from('lm_config').select('ventana_abierta, max_plantilla').eq('liga', LIGA).maybeSingle(),
        supabase.from('lm_ofertas').select('id', { count: 'exact', head: true }).eq('club_vendedor', club.id).eq('estado', 'pendiente'),
        supabase.from('lm_jugadores').select('id', { count: 'exact', head: true }).eq('club_id', club.id),
      ]);
      if (yo !== ultimo) return;
      raiz.innerHTML = conClub({ club, ventana: !!cfg.data?.ventana_abierta, ofertas: of.count ?? 0, plantilla: pl.count ?? 0, max: cfg.data?.max_plantilla ?? 40 });
      raiz.dataset.estado = 'con-club';
    } catch (e) { console.warn('[tu club]', e?.message ?? e); raiz.innerHTML = SIN_CLUB(); }
  });
}
