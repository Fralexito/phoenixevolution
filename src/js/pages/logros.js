// Página /logros/: mi catálogo de insignias con progreso. Esquema: pages/logros → features/logros/api → core/logros (puro).
import { onSession } from '../core/session.js';
import { escapeHTML } from '../core/dom.js';
import { misLogros } from '../features/logros/api.js';
import { nivelDe, CATEGORIAS_LOGRO } from '../core/logros.js';

const $ = (id) => document.getElementById(id);
const S = { yo: null, cargando: false };

const tarjeta = (l) => {
  const n = nivelDe(l.nivel);
  return `<article class="glass-panel rounded-2xl p-3 flex gap-3 ${l.obtenido ? '' : 'opacity-70'}" data-logro="${escapeHTML(l.id)}">
    <div class="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${l.obtenido ? n.clase : 'border-galaxy-border text-gray-600'}"><i class="fa-solid ${l.icono} text-xl" aria-hidden="true"></i></div>
    <div class="min-w-0 flex-1"><p class="font-display font-bold text-white text-sm">${escapeHTML(l.nombre)} <span class="text-[12px] uppercase tracking-wider ${n.clase.split(' ')[0]}">${escapeHTML(n.nombre)}</span></p>
      <p class="text-[12px] text-gray-400">${escapeHTML(l.descripcion)}</p>
      ${l.obtenido ? `<p class="text-[12px] text-ok mt-1"><i class="fa-solid fa-check"></i> Obtenido el ${escapeHTML(new Date(l.obtenido_at).toLocaleDateString('es'))}</p>`
        : `<div class="mt-1.5 h-1.5 rounded-full bg-black/40 overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="${Number(l.objetivo)}" aria-valuenow="${Number(l.progreso)}"><div class="h-full bg-galaxy-400" style="width:${l.pct}%"></div></div>
           <p class="text-[12px] text-gray-500 mt-0.5">${Number(l.progreso)} / ${Number(l.objetivo)}</p>`}</div></article>`;
};
function pintar(d) {
  $('lg-resumen').textContent = `${d.obtenidos} de ${d.total} logros`;
  $('lg-lista').innerHTML = CATEGORIAS_LOGRO.map(([id, nombre]) => {
    const l = d.logros.filter((x) => x.categoria === id); if (!l.length) return '';
    return `<section><h2 class="text-[12px] font-display font-bold uppercase tracking-widest text-gray-400 mb-2">${escapeHTML(nombre)}</h2><div class="grid sm:grid-cols-2 gap-2">${l.map(tarjeta).join('')}</div></section>`;
  }).join('') || '<div class="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">Todavía no hay logros disponibles.</div>';
}
async function cargar() {
  if (S.cargando) return; S.cargando = true;
  try { pintar(await misLogros()); $('lg-error').hidden = true; }
  catch (e) { console.error('[logros] página:', e); $('lg-error-txt').textContent = e?.message || 'Algo salió mal. Inténtalo de nuevo.'; $('lg-error').hidden = false; }
  finally { S.cargando = false; }
}
$('lg-reintentar').addEventListener('click', cargar);
onSession(({ session }) => {
  const id = session?.user?.id ?? null; if (id === S.yo && S.yo !== null) return; S.yo = id;
  $('lg-sinsesion').hidden = !!id; $('lg-app').hidden = !id; if (id) cargar();
});
