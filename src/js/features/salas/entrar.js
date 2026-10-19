// «ENTRANDO A LA SALA» (19-oct-2026, Fralex: «Hazlo… dinámico, estético, visual, muy animado»; recomendación n.º 1 para Phoenix Link:
// entrar a una sala con un toque desde la web). Ventana paso a paso, animada:
//   1. Reservando tu puesto (aceptar_sala / ver_sala, las RPC de siempre)  2. Abriendo Parsec (enlace directo parsec://)  3. ¡Dentro!
// Si Parsec no se abre en ~2,5 s, aparece el plan B: abrir de nuevo, la invitación web o descargar Parsec. Nunca abre nada sin que lo pidas.
import { escapeHTML, safeUrl, parsecDirecto } from '../../core/sistema/dom.js';
import { textoErrorUnirse } from '../../core/competicion/salas.js';
import { avatarHTML } from '../../core/sistema/avatar.js';

const DESCARGA_PARSEC = 'https://parsec.app/downloads';
const PASOS = [['reserva', 'Reservando tu puesto'], ['parsec', 'Abriendo Parsec'], ['listo', '¡Dentro!']];

/**
 * @param {{ sala: object, rol: 'rival'|'espectador', pedir: () => Promise<object>, alTerminar?: () => void }} op
 *        `pedir` reserva el puesto y devuelve { rol, enlace } (respuesta de aceptar_sala / ver_sala).
 */
export function entrarASala({ sala, rol, pedir, alTerminar = () => {} }) {
  const host = sala?.host ?? {}; const nombreHost = host.nombre ?? 'el anfitrión';
  const dlg = document.createElement('dialog'); dlg.className = 'sve-modal'; dlg.setAttribute('aria-labelledby', 'sve-t');
  dlg.innerHTML = `<div class="sve-caja" tabindex="-1">
    <button type="button" class="sve-x" data-sve-cerrar aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    <div class="sve-escena" aria-hidden="true"><span class="sve-onda"></span><span class="sve-onda sve-onda2"></span>
      <span class="sve-host">${avatarHTML(host.avatar_url, nombreHost, 72)}</span><span class="sve-mando"><i class="fa-solid fa-gamepad"></i></span></div>
    <h2 id="sve-t">Entrando a la sala de ${escapeHTML(nombreHost)}</h2>
    <p class="sve-rol" id="sve-rol">${rol === 'rival' ? '<i class="fa-solid fa-gamepad" aria-hidden="true"></i> Juegas como <b>rival</b> · mando 2' : '<i class="fa-solid fa-eye" aria-hidden="true"></i> Entras como <b>espectador</b>'}</p>
    <ol class="sve-pasos">${PASOS.map(([id, t]) => `<li data-paso="${id}" data-estado="espera"><span class="sve-ic" aria-hidden="true"><i class="sve-giro"></i><i class="fa-solid fa-circle-check sve-ok"></i><i class="fa-solid fa-circle-xmark sve-mal"></i></span><span>${t}</span></li>`).join('')}</ol>
    <p class="sve-msg" id="sve-msg" role="status" aria-live="polite"></p>
    <div class="sve-acciones" id="sve-acciones"></div>
  </div>`;
  document.body.append(dlg); dlg.showModal(); dlg.querySelector(".sve-caja").focus();   // el foco en la caja, no en la X
  const $ = (s) => dlg.querySelector(s);
  const paso = (id, estado) => { const li = $(`[data-paso="${id}"]`); if (li) li.dataset.estado = estado; };
  const msg = (html) => { $('#sve-msg').innerHTML = html; };
  const acciones = (html) => { $('#sve-acciones').innerHTML = html; };
  let vivo = true; let tFallback = 0;
  const cerrar = () => { vivo = false; clearTimeout(tFallback); dlg.close(); dlg.remove(); alTerminar(); };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-sve-cerrar]')) cerrar(); });

  // Intenta abrir Parsec; si la pestaña no pierde el foco en ~2,5 s, asumimos que no se abrió y mostramos el plan B.
  function abrir(directo, respaldo) {
    paso('parsec', 'activo'); paso('listo', 'espera'); dlg.dataset.fase = 'abriendo';
    msg('Si tu navegador pregunta, elige <b>Abrir Parsec</b>.'); acciones('');
    let abierto = false; const marca = () => { abierto = true; };
    window.addEventListener('blur', marca, { once: true }); document.addEventListener('visibilitychange', marca, { once: true });
    try { window.location.href = directo; } catch { /* el navegador lo bloqueó: plan B */ }
    clearTimeout(tFallback);
    tFallback = setTimeout(() => {
      window.removeEventListener('blur', marca); document.removeEventListener('visibilitychange', marca); if (!vivo) return;
      if (abierto) { listo(); return; }
      paso('parsec', 'error'); dlg.dataset.fase = 'planb';
      msg('Parsec no se abrió. ¿Lo tienes instalado?');
      acciones(`<button type="button" class="sve-btn sve-btn-pri" data-sve-otra><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Abrir de nuevo</button>
        ${respaldo ? `<a class="sve-btn" href="${escapeHTML(respaldo)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe" aria-hidden="true"></i> Invitación web</a>` : ''}
        <a class="sve-btn" href="${DESCARGA_PARSEC}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-download" aria-hidden="true"></i> Descargar Parsec</a>`);
      $('[data-sve-otra]')?.addEventListener('click', () => abrir(directo, respaldo));
    }, 2600);
  }
  function listo() {
    paso('parsec', 'ok'); paso('listo', 'ok'); dlg.dataset.fase = 'listo';
    msg(rol === 'rival' ? '¡Listo! En Parsec, el anfitrión te da el <b>mando 2</b>. ¡A jugar!' : '¡Listo! Mira el partido en Parsec. El anfitrión te acepta dentro de la app.');
    acciones('<button type="button" class="sve-btn sve-btn-pri" data-sve-cerrar>Entendido</button>');
  }

  (async () => {
    paso('reserva', 'activo'); dlg.dataset.fase = 'reservando';
    let r;
    try { r = await pedir(); } catch (e) {
      if (!vivo) return; paso('reserva', 'error'); dlg.dataset.fase = 'error';
      msg(escapeHTML(textoErrorUnirse(e?.message))); acciones('<button type="button" class="sve-btn sve-btn-pri" data-sve-cerrar>Cerrar</button>'); return;
    }
    if (!vivo) return;
    paso('reserva', 'ok');
    const rolFinal = r?.rol === 'rival' || r?.rol === 'espectador' ? r.rol : rol;
    if (rolFinal !== rol) $('#sve-rol').innerHTML = rolFinal === 'rival' ? '<i class="fa-solid fa-gamepad" aria-hidden="true"></i> Juegas como <b>rival</b>' : '<i class="fa-solid fa-eye" aria-hidden="true"></i> Entras como <b>espectador</b>';
    const url = safeUrl(r?.enlace, { allowParsec: true });
    if (!url) {
      paso('parsec', 'espera'); dlg.dataset.fase = 'sin-enlace';
      msg(`Tu puesto está reservado. ${escapeHTML(nombreHost)} todavía no compartió el enlace de Parsec: Phoenix Link lo envía solo en cuanto la sala está lista.`);
      acciones('<button type="button" class="sve-btn sve-btn-pri" data-sve-cerrar>Entendido</button>'); return;
    }
    const directo = url.startsWith('parsec://') ? url : parsecDirecto(url);
    const respaldo = url.startsWith('https://') ? url : '';
    if (directo) abrir(directo, respaldo);
    else { window.open(url, '_blank', 'noopener'); listo(); }
  })();
}
