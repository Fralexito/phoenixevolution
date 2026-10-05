// «Tu espacio»: lo primero que ve cada persona tras la portada. Sin sesión = camino de bienvenida con progreso regalado; con sesión = su panel (nivel, tokens, retos, siguiente paso).
import { escapeHTML } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { onSession } from '../../core/session.js';
import { openAuthModal } from '../auth.js';
import { miEconomia } from '../economia/api.js';
import { misRetos } from '../ranking/api.js';
import { miClan } from '../clanes/api.js';
import { textoFinSemana } from '../../core/rankingComunidad.js';
import { saludo, horaLima, pasosBienvenida, porcentajePasos, siguientePaso, arcoAnillo } from '../../core/inicio.js';
import { activarReveal } from '../reveal.js';

const R = 28;
let req = 0;
const anillo = (pct, centro) => { const a = arcoAnillo(pct, R); return `<div class="anillo" role="img" aria-label="${pct}% completado"><svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgb(255 255 255 / .1)" stroke-width="5"/><circle class="arco" cx="32" cy="32" r="${R}" fill="none" stroke="url(#g-anillo)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${a.total}" stroke-dashoffset="${a.total}" data-falta="${a.falta}"/><defs><linearGradient id="g-anillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8000ff"/><stop offset="1" stop-color="#00e5ff"/></linearGradient></defs></svg><b>${centro}</b></div>`; };
const animarAnillo = (raiz) => requestAnimationFrame(() => requestAnimationFrame(() => raiz.querySelectorAll('.arco[data-falta]').forEach((c) => { c.style.strokeDashoffset = c.dataset.falta; })));
const pasoHTML = (p, sig) => {
  const cuerpo = `<span class="tic"><i class="fa-solid fa-check"></i></span><span class="min-w-0 flex-1"><b class="tp block text-sm text-white font-semibold leading-tight">${escapeHTML(p.titulo)}</b><span class="block text-[11px] text-gray-400">${escapeHTML(p.ayuda)}</span></span>${!p.hecho && sig ? '<i class="fa-solid fa-arrow-right text-galaxy-400 text-xs"></i>' : ''}`;
  const cl = `paso ${p.hecho ? 'hecho' : ''} ${sig ? 'siguiente' : ''}`;
  if (p.hecho) return `<div class="${cl}">${cuerpo}</div>`;
  return p.accion === 'registro' ? `<button type="button" data-registro class="${cl} w-full text-left">${cuerpo}</button>` : `<a href="${href(p.href)}" class="${cl}">${cuerpo}</a>`;
};

function pintarVisita(raiz, total) {
  const pasos = pasosBienvenida({ sesion: false }), pct = porcentajePasos(pasos), sig = siguientePaso(pasos);
  raiz.innerHTML = `<div class="glass-panel rounded-2xl p-4 sm:p-5 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.1fr)] items-center">
    <div class="flex items-center gap-3">${anillo(pct, `${pct}%`)}<div class="md:hidden"><h2 class="font-display font-bold text-white uppercase tracking-wider">Empieza tu camino</h2></div></div>
    <div class="space-y-2"><span class="chip-ahora"><span class="punto"></span>${total ? `${escapeHTML(total)} jugadores ya están dentro` : 'La comunidad te espera'}</span>
      <h2 class="hidden md:block font-display font-extrabold text-2xl text-white uppercase tracking-wider text-shadow-glow">Empieza tu camino en la Galaxy</h2>
      <p class="text-sm text-gray-300">Ya llevas el primer paso. Crea tu cuenta gratis y gana <b class="text-amber-300">tokens y XP</b> jugando: sube de nivel, estrena marcos y títulos y únete a un clan.</p>
      <button type="button" data-registro class="cta-pulso btn btn-primary !min-h-11 !px-6 !text-sm mt-1"><i class="fa-solid fa-rocket"></i> Crear mi cuenta gratis</button></div>
    <div class="space-y-1">${pasos.map((p) => pasoHTML(p, sig && p.id === sig.id)).join('')}</div></div>`;
  raiz.querySelectorAll('[data-registro]').forEach((b) => b.addEventListener('click', () => openAuthModal('register')));
  animarAnillo(raiz);
}

function pintarSocio(raiz, perfil, eco, retos, clan) {
  const nombre = perfil?.nombre_display || perfil?.username || '';
  const pasos = pasosBienvenida({ sesion: true, foto: !!perfil?.avatar_url, club: !!perfil?.club_favorito, jugo: (eco?.xp ?? 0) > 0, clan: !!clan?.clan });
  const pct = porcentajePasos(pasos), sig = siguientePaso(pasos), nuevo = pct < 100;
  const retosHTML = (retos?.retos ?? []).slice(0, 3).map((r) => `<li class="space-y-1"><div class="flex justify-between text-xs"><span class="text-gray-200 truncate">${escapeHTML(r.titulo)}</span><span class="text-gray-400 tabular-nums">${r.progreso}/${r.meta}</span></div><div class="barra-pts"><i style="--w:${r.pct}%;transform:scaleX(1)"></i></div></li>`).join('');
  const izq = nuevo
    ? `${anillo(pct, `${pct}%`)}<div class="min-w-0"><p class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Tu camino</p><p class="text-sm text-white font-semibold">${sig ? escapeHTML(sig.titulo) : '¡Completo!'}</p><p class="text-[11px] text-gray-400">${sig ? escapeHTML(sig.ayuda) : ''}</p></div>`
    : `${anillo(Math.round((eco?.progreso ?? 0) * 100), `Nv ${eco?.nivel ?? 1}`)}<div class="min-w-0"><p class="text-[10px] font-display font-bold text-galaxy-400 uppercase tracking-[0.2em]">Tu nivel</p><p class="text-sm text-white font-semibold">${eco ? `${eco.xp} / ${eco.xpSiguiente} XP` : ''}</p><p class="text-[11px] text-gray-400">al siguiente nivel</p></div>`;
  raiz.innerHTML = `<div class="glass-panel rounded-2xl p-4 sm:p-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] items-center">
    <div><p class="text-xs text-gray-400">${saludo(horaLima())},</p><h2 class="font-display font-extrabold text-2xl text-white uppercase tracking-wider text-shadow-glow truncate">${escapeHTML(nombre)}</h2>
      <div class="flex flex-wrap gap-2 mt-2"><a href="${href('tienda/')}" class="pulse-tile !p-2 !gap-x-2"><i class="fa-solid fa-coins pulse-ico !w-8 !h-8 !text-amber-300"></i><span class="pulse-num !text-lg">${eco ? eco.saldo : '—'}</span><span class="pulse-lbl">tokens</span></a>
      <a href="${href('tienda/')}" class="pulse-tile !p-2 !gap-x-2"><i class="fa-solid fa-bolt pulse-ico !w-8 !h-8"></i><span class="pulse-num !text-lg">${eco?.nivel ?? 1}</span><span class="pulse-lbl">nivel</span></a></div></div>
    <div class="flex items-center gap-3">${izq}</div>
    <div>${nuevo
      ? `<div class="space-y-1">${pasos.map((p) => pasoHTML(p, sig && p.id === sig.id)).join('')}</div>`
      : `<div class="flex items-center justify-between mb-2"><h3 class="font-display font-bold text-sm text-white uppercase tracking-wider">Retos de la semana</h3><span class="text-[10px] text-gray-400">${escapeHTML(textoFinSemana(retos?.semanaFin))}</span></div>${retosHTML ? `<ul class="space-y-2">${retosHTML}</ul><a href="${href('ranking/')}" class="mt-2 inline-flex items-center gap-1.5 text-[11px] font-display font-bold text-galaxy-400 hover:text-white uppercase tracking-wider">Ver todos y cobrar <i class="fa-solid fa-arrow-right"></i></a>` : '<p class="text-xs text-gray-500">Aún no hay retos esta semana.</p>'}`}</div></div>`;
  animarAnillo(raiz);
}

export function iniciarEspacio(totalJugadores = '') {
  const raiz = document.getElementById('inicio-espacio'); if (!raiz) return;
  let respondio = false;
  setTimeout(() => { if (!respondio) { pintarVisita(raiz, totalJugadores); raiz.hidden = false; activarReveal(raiz); } }, 1800);   // sin respuesta de la sesión (red lenta): se muestra la bienvenida de visita
  onSession(async ({ session, profile }) => {
    respondio = true; const mi = ++req;
    if (!session) { pintarVisita(raiz, totalJugadores); raiz.hidden = false; activarReveal(raiz); return; }
    const [eco, retos, clan] = await Promise.allSettled([miEconomia(), misRetos(), miClan()]);
    if (mi !== req) return;
    [eco, retos, clan].forEach((r) => { if (r.status === 'rejected') console.warn('[inicio] espacio:', r.reason?.message ?? r.reason); });
    pintarSocio(raiz, profile, eco.value, retos.value, clan.value); raiz.hidden = false; activarReveal(raiz);
  });
}
