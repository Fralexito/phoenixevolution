// ASISTENTE «Lanzar reto» (19-oct-2026, Fralex: «empecemos con lo que falta» → «Lanzar un reto» por pasos, intuitivo y descriptivo).
// No hay lógica nueva: el formulario de siempre (#form-crear-reto, features/duelos/form.js) se MUEVE a una ventana y se reparte en 4 pasos
//   1 Rival · 2 Equipos · 3 Hora · 4 Sala (+ «boleto» con el resumen y «Emitir reto»).
// Cada paso dice qué decides y por qué; las opciones son tarjetas con su explicación. form.js sigue leyendo los mismos ids y data-*.
// Se abre con cualquier «Lanzar reto» de la página y cuando duelos.js apunta a un rival (radar, enlace ?retar=…).
import { escapeHTML } from '../../core/sistema/dom.js';
import { avatarHTML } from '../../core/sistema/avatar.js';
import { data } from './data.js';

const PASOS = [
  { t: '¿Contra quién?', d: 'Lánzalo a toda la red para que lo acepte cualquiera, o reta a un jugador en concreto.' },
  { t: '¿Cuántos por equipo?', d: '1 contra 1 es lo clásico. En equipos puedes invitar a tus amigos; los cupos libres los llena quien se una.' },
  { t: '¿Cuándo jugamos?', d: '«Ya» espera rival durante 60 minutos. Con hora fija, los dos líderes confirman poco antes de empezar.' },
  { t: 'La sala', d: 'Quién la crea, en qué programa se juega y si otros pueden mirar. Revisa el boleto y emite el reto.' },
];
// Frase bajo cada opción (form.js solo mira data-v / data-p / data-t, así que se les puede añadir texto)
const SUB_DESTINO = { abierto: ['fa-earth-americas', 'Cualquier jugador conectado puede aceptarlo'], directo: ['fa-user', 'Eliges al rival; privado o a la vista de todos'] };
const SUB_HOST = { yo: 'Tú creas la sala y compartes el enlace', otro: 'Avisamos a quienes tienen host; quien acepte la crea' };
const SUB_HORA = { ya: 'Ahora mismo', 15: 'En 15 minutos', 30: 'En 30 minutos', 60: 'En una hora', manual: 'Elige día y hora' };

export function montarAsistenteReto({ alAbrir } = {}) {
  const form = document.getElementById('form-crear-reto'); if (!form || document.getElementById('ar-modal')) return null;
  const $ = (id) => document.getElementById(id);
  const padre = (el) => el?.closest('form > div') ?? el;

  // ── Ventana ──
  const dlg = document.createElement('dialog'); dlg.id = 'ar-modal'; dlg.className = 'ar-modal'; dlg.setAttribute('aria-labelledby', 'ar-titulo');
  dlg.innerHTML = `<div class="ar-caja">
    <header class="ar-cab">
      <div class="ar-cab-fila"><span class="ar-ic" aria-hidden="true"><i class="fa-solid fa-bolt"></i></span><h2 id="ar-titulo">Lanzar reto</h2>
        <button type="button" class="ar-x" data-ar-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
      <ol class="ar-pasos" aria-label="Pasos">${PASOS.map((p, i) => `<li><button type="button" data-ar-ir="${i}"><span>${i + 1}</span><b>${['Rival', 'Equipos', 'Hora', 'Sala'][i]}</b></button></li>`).join('')}</ol>
      <div class="ar-barra" aria-hidden="true"><i></i></div>
    </header>
    <div class="ar-cuerpo">${PASOS.map((p, i) => `<section class="ar-paso" data-ar-paso="${i}" aria-labelledby="ar-t-${i}" hidden><p class="ar-num">Paso ${i + 1} de 4</p><h3 id="ar-t-${i}">${p.t}</h3><p class="ar-desc">${p.d}</p><div class="ar-zona"></div></section>`).join('')}</div>
    <footer class="ar-pie"><button type="button" class="ar-atras" data-ar-atras><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Atrás</button>
      <p class="ar-aviso" role="status" aria-live="polite"></p>
      <button type="button" class="ar-sig" data-ar-sig>Siguiente <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></footer>
  </div>`;
  document.body.append(dlg);
  const zonas = [...dlg.querySelectorAll('.ar-zona')];

  // ── El formulario entra en la ventana y sus bloques se reparten por pasos (mismos nodos, mismos ids) ──
  dlg.querySelector('.ar-cuerpo').append(form); form.classList.add('ar-form');
  form.append(...dlg.querySelectorAll('.ar-paso'));   // los pasos viven dentro del <form>: «Emitir» sigue siendo su submit
  zonas[0].append(padre($('seg-destino')), $('bloque-directo'));
  zonas[1].append(padre($('tam-presets')), $('bloque-amigos'));
  zonas[2].append(padre($('presets')), $('campo-fecha'));
  const detalles = form.querySelector('[aria-labelledby="h-detalles-sala"]'); const envio = $('btn-emitir-reto')?.parentElement;
  zonas[3].append(detalles, envio);
  detalles?.removeAttribute('data-fr-plegado'); detalles?.querySelector('.fr-cambiar')?.remove(); detalles?.querySelector('.fr-res')?.remove();
  // «¿Quién hostea?» (dos tarjetas) y «Plataforma» van uno debajo del otro: en la columna de antes iban lado a lado y en la ventana no caben
  const filaHost = $('seg-host')?.closest('.grid'); if (filaHost) filaHost.style.gridTemplateColumns = 'minmax(0, 1fr)';
  const notaHost = $('hint-host'); if (notaHost) notaHost.style.gridColumn = '1 / -1';   // su «col-span-2» creaba una 2.ª columna invisible
  envio?.insertAdjacentHTML('afterbegin', '<div class="ar-boleto" aria-live="polite"></div>');
  [...form.children].filter((c) => !c.classList.contains('ar-paso')).forEach((c) => { if (!c.textContent.trim() && !c.querySelector('input,select,button')) c.remove(); });

  // ── Opciones con su explicación ──
  form.querySelectorAll('#seg-destino [data-v]').forEach((b) => { const [ic, sub] = SUB_DESTINO[b.dataset.v] ?? []; if (ic) b.innerHTML = `<i class="fa-solid ${ic}" aria-hidden="true"></i><b>${b.textContent.trim()}</b><small>${sub}</small>`; });
  form.querySelectorAll('#seg-host [data-v]').forEach((b) => { const sub = SUB_HOST[b.dataset.v]; if (sub) b.innerHTML = `<b>${b.textContent.trim()}</b><small>${sub}</small>`; });
  form.querySelectorAll('#presets [data-p]').forEach((b) => { const sub = SUB_HORA[b.dataset.p]; if (!sub) return; const txt = b.dataset.p === 'manual' ? '<i class="fa-regular fa-calendar" aria-hidden="true"></i> Otra hora' : escapeHTML(b.textContent.trim()); b.innerHTML = `<b>${txt}</b><small>${sub}</small>`; });

  // ── Rival: tarjetas con cara y «en línea» en lugar de la lista desplegable (el <select> sigue ahí, oculto, y manda) ──
  const sel = $('select-rival');
  const tarjetas = document.createElement('div'); tarjetas.className = 'ar-rivales'; tarjetas.setAttribute('role', 'listbox'); tarjetas.setAttribute('aria-label', 'Elige a tu rival');
  sel?.after(tarjetas); sel?.classList.add('ar-oculto');
  const pintarRivales = () => {
    const ops = [...(sel?.options ?? [])];
    tarjetas.innerHTML = ops.length && !ops[0].disabled ? ops.slice(0, 40).map((o) => {
      const p = data.perfiles.get(o.value); const on = data.online.has(o.value); const host = !!p?.puede_hostear; const nombre = p?.nombre_display ?? o.textContent;
      return `<button type="button" role="option" data-ar-rival="${escapeHTML(o.value)}" aria-selected="${o.selected && o.value === sel.value}"><span class="ar-av">${avatarHTML(p?.avatar_url, nombre, 36)}${on ? '<i class="ar-on" aria-hidden="true"></i>' : ''}</span>
        <span class="ar-rv-tx"><b>${escapeHTML(nombre)}</b><small>${on ? 'En línea' : 'Desconectado'}${host ? ' · tiene host' : ''}</small></span><i class="fa-solid fa-check ar-ok" aria-hidden="true"></i></button>`;
    }).join('') : `<p class="ar-nada">${escapeHTML(ops[0]?.textContent ?? 'Sin resultados')}</p>`;
  };
  if (sel) new MutationObserver(pintarRivales).observe(sel, { childList: true, subtree: true, attributes: true });

  // ── Pasos ──
  let paso = 0;
  const aviso = dlg.querySelector('.ar-aviso');
  const resumen = () => $('resumen')?.textContent.trim() ?? '';
  /** ¿Se puede pasar del paso i? → texto del problema o '' */
  const problema = (i) => {
    if (i === 0 && document.querySelector('#seg-destino [data-v="directo"][aria-pressed="true"]') && !sel?.value) return 'Elige a tu rival para seguir.';
    if (i === 2 && !/ vs /.test(resumen())) return resumen() || 'Elige cuándo jugar.';
    return '';
  };
  const validar = () => { const p = problema(paso); aviso.textContent = p; return !p; };
  tarjetas.addEventListener('click', (e) => { const b = e.target.closest('[data-ar-rival]'); if (!b || !sel) return; sel.value = b.dataset.arRival; sel.dispatchEvent(new Event('change', { bubbles: true })); pintarRivales(); validar(); });
  const pintarBoleto = () => {
    const [eq = '', quien = '', cuando = ''] = resumen().split(' · ');
    const host = document.querySelector('#seg-host [aria-pressed="true"] b')?.textContent ?? '';
    const plat = $('select-plataforma')?.value ?? ''; const esp = $('select-espectadores')?.selectedOptions?.[0]?.textContent ?? '';
    const fila = (ic, k, v) => `<div><i class="fa-solid ${ic}" aria-hidden="true"></i><span>${k}</span><b>${escapeHTML(v || '—')}</b></div>`;
    dlg.querySelector('.ar-boleto').innerHTML = `<p class="ar-boleto-t">Tu reto</p>${fila('fa-user-group', 'Equipos', eq)}${fila('fa-location-crosshairs', 'Contra', quien)}${fila('fa-clock', 'Cuándo', cuando)}${fila('fa-server', 'Sala', [host, plat].filter(Boolean).join(' · '))}${fila('fa-eye', 'Espectadores', esp)}`;
  };
  function mostrar(atras = false) {
    dlg.querySelectorAll('.ar-paso').forEach((s) => { const on = Number(s.dataset.arPaso) === paso; s.hidden = !on; if (on) s.dataset.dir = atras ? 'atras' : 'adelante'; });
    dlg.querySelectorAll('[data-ar-ir]').forEach((b) => { const i = Number(b.dataset.arIr); b.setAttribute('aria-current', i === paso ? 'step' : 'false'); b.dataset.hecho = String(i < paso); });
    dlg.style.setProperty('--ar-avance', String((paso + 1) / 4));
    dlg.querySelector('[data-ar-atras]').style.visibility = paso ? 'visible' : 'hidden';
    dlg.querySelector('[data-ar-sig]').hidden = paso === 3;
    aviso.textContent = '';
    if (paso === 3) pintarBoleto();
    dlg.querySelector('.ar-cuerpo').scrollTop = 0;
  }
  function ir(n) {
    n = Math.max(0, Math.min(3, n));
    for (let i = paso; i < n; i += 1) { if (problema(i)) { const atras = i < paso; paso = i; mostrar(atras); validar(); return; } }   // no se salta un paso incompleto
    const atras = n < paso; paso = n; mostrar(atras);
  }
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-ar-cerrar]')) { cerrar(); return; }
    if (e.target.closest('[data-ar-sig]')) { if (validar()) ir(paso + 1); return; }
    if (e.target.closest('[data-ar-atras]')) { ir(paso - 1); return; }
    const a = e.target.closest('[data-ar-ir]'); if (a) { ir(Number(a.dataset.arIr)); return; }
    setTimeout(() => { if (aviso.textContent) validar(); if (paso === 3) pintarBoleto(); }, 0);   // al elegir algo, el aviso y el boleto se ponen al día
  });
  form.addEventListener('change', () => { if (paso === 3) pintarBoleto(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[type="search"]')) e.preventDefault(); });

  function abrir({ alRival = false } = {}) {
    pintarRivales(); paso = alRival && sel?.value ? 1 : 0; mostrar();
    if (!dlg.open) dlg.showModal();
    alAbrir?.();
  }
  function cerrar() { dlg.close(); }
  window.addEventListener('duelos:creado', () => { if (dlg.open) dlg.close(); paso = 0; });
  return { abrir, cerrar };
}
