// Overlay de transmisión (ronda 363). ?id=N obligatorio; ?tema=sudario cambia a azul y dorado; ?demo=1 muestra datos de ejemplo para probar la escena.
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { resumenOverlay, marcadorTexto } from '../core/competicion/overlay.js';
import { leerTorneo, partidosDe } from '../features/torneos/api.js';
import { rellenarPatrocinios } from '../features/patrocinios.js';

const q = new URLSearchParams(location.search);
const id = Number(q.get('id'));
const demo = q.get('demo') === '1';
if (q.get('tema') === 'sudario') document.documentElement.dataset.tema = 'sudario';
const raiz = document.getElementById('ov-raiz');
let antes = '';

const DEMO = {
  t: { id: 0, nombre: 'Copa Phoenix (ejemplo)', estado: 'en_curso', formato: 'eliminacion' },
  partidos: [
    { clave: 'a', orden: 1, a_nombre: 'Fralex', b_nombre: 'Degox', ga: 3, gb: 2, ganador: 'a', jugado: true, jugado_en: new Date().toISOString() },
    { clave: 'b', orden: 2, a_nombre: 'Beto', b_nombre: 'Jeremi', ga: 1, gb: 0, ganador: 'a', jugado: true, jugado_en: new Date(Date.now() - 6e5).toISOString() },
    { clave: 'c', orden: 3, a_nombre: 'Fralex', b_nombre: 'Beto', jugado: false },
  ],
};

const aviso = (txt) => { raiz.innerHTML = `<div class="ov-aviso">${esc(txt)}</div>`; };
const lado = (p, l) => `<span class="ov-j ${p.jugado && p.ganador === l ? 'ov-gana' : ''}">${esc(l === 'a' ? p.a_nombre : p.b_nombre)}</span>`;

function pintar(t, partidos) {
  const r = resumenOverlay(t, partidos);
  const u = r.ultimo;
  const html = `<header class="ov-cab"><span class="ov-marca">Phoenix Evolution</span><h1>${esc(t.nombre)}</h1>
      ${r.fase === 'en_curso' ? `<div class="ov-prog"><span style="transform:scaleX(${r.progreso.pct / 100})"></span></div><p class="ov-sub">${r.progreso.jugados} de ${r.progreso.total} partidos</p>` : ''}
      <div data-patro="torneo:${t.id}"></div></header>
    ${r.campeon ? `<section class="ov-campeon"><span class="ov-et">${r.fase === 'final' ? 'Campeón' : 'Campeón'}</span><b>${esc(r.campeon)}</b></section>` : ''}
    <footer class="ov-pie">
      ${u ? `<section class="ov-ultimo" title="${esc(marcadorTexto(u))}"><span class="ov-et">Último resultado</span>
        <div class="ov-marcador">${lado(u, 'a')}<b>${u.ga}</b><i>–</i><b>${u.gb}</b>${lado(u, 'b')}</div></section>` : ''}
      ${r.proximos.length ? `<section class="ov-prox"><span class="ov-et">Próximos</span><ul>${r.proximos.map((p) => `<li>${esc(p.a_nombre)} <em>vs</em> ${esc(p.b_nombre)}</li>`).join('')}</ul></section>` : ''}
      ${!u && !r.proximos.length && !r.campeon ? `<section class="ov-prox"><span class="ov-et">${r.fase === 'inscripcion' ? 'Inscripción abierta' : 'Pronto'}</span></section>` : ''}
    </footer>`;
  if (html === antes) return;
  const nuevoGol = u && antes && !antes.includes(`title="${esc(marcadorTexto(u))}"`);
  antes = html; raiz.innerHTML = html;
  if (nuevoGol) raiz.querySelector('.ov-ultimo')?.classList.add('ov-nuevo');
  rellenarPatrocinios(raiz);
}

async function esPremium(tid) {
  const { data, error } = await supabase.from('torneo_premium').select('torneo_id').eq('torneo_id', tid).maybeSingle();
  if (error) throw error;
  return !!data;
}

async function ciclo() {
  if (demo) { pintar(DEMO.t, DEMO.partidos); return; }
  try {
    const t = await leerTorneo(id);
    if (!t) { aviso('No encontramos ese torneo (o es privado).'); return; }
    if (!(await esPremium(id))) { aviso('Este overlay es para torneos premium. El organizador lo activa en «Opciones del organizador».'); return; }
    pintar(t, await partidosDe(id));
  } catch (e) { console.warn('[overlay] sin conexión, se reintenta:', e?.message ?? e); }
}

if (!demo && !(Number.isInteger(id) && id > 0)) aviso('Falta el número del torneo: /overlay-torneo/?id=12');
else { ciclo(); if (!demo) setInterval(ciclo, 15000); }
