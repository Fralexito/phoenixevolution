// Página /ajustes/: pinta el valor guardado en cada control, guarda cada cambio al instante y ejecuta las acciones (borrar, exportar, importar…).
import { leerAjustes, cambiarAjuste, reemplazarAjustes, borrarDatosLocales } from '../features/ajustes.js';
import { exportarAjustes, importarAjustes, AJUSTES_DEFECTO } from '../core/sistema/ajustes.js';
import { onSession } from '../core/sistema/session.js';
import { openProfileModal } from '../features/profile.js';
import { logout } from '../features/auth.js';
import { escapeHTML } from '../core/sistema/dom.js';
import { href } from '../core/sistema/config.js';
import { toast } from '../core/sistema/toast.js';
import { confirmar, pedirTexto } from '../core/sistema/dialogo.js';
import { iniciarVistas } from '../features/ajustesVista.js';
import { pintarDerechos } from '../features/derechos.js';
import { avatarHTML } from '../core/sistema/avatar.js';

const estado = document.getElementById('aj-estado');
const avisar = (t) => { if (estado) estado.textContent = t; };
const controles = () => [...document.querySelectorAll('[data-clave]')];

function pintar() {
  const a = leerAjustes();
  for (const el of controles()) { const v = a[el.dataset.clave]; if (el.dataset.tipo === 'switch') el.checked = !!v; else if (el.dataset.tipo === 'radio') el.checked = el.value === String(v); else el.value = String(v); }
}
function valorDe(el) {   // las opciones (botones de radio) son texto: se devuelve el tipo original (aquí todos son texto salvo los switches)
  return el.dataset.tipo === 'switch' ? el.checked : el.value;
}
for (const el of controles()) {
  el.addEventListener('change', () => {
    const { guardado } = cambiarAjuste(el.dataset.clave, valorDe(el));
    avisar(guardado ? 'Guardado en este navegador.' : 'Aplicado, pero tu navegador no permite guardarlo (modo privado o bloqueado).');
  });
}

const quitar = (clave) => { try { localStorage.removeItem(clave); return true; } catch (e) { console.warn('[ajustes] no se pudo borrar', clave, e); return false; } };
const descargar = (nombre, texto) => {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const ACCIONES = {
  'borrar-historial-vivo': () => { quitar('pes-live-hist'); toast('Historial de «En vivo» borrado.', 'info'); },
  'restablecer-vivo-pos': () => { quitar('pes-live-dock'); toast('El botón «En vivo» volverá a su sitio al recargar la página.', 'info'); },
  'borrar-zoom': () => { quitar('pes-zoom-pc'); quitar('pes-zoom-movil'); toast('Zoom olvidado: volverá al tamaño predeterminado.', 'info'); },
  exportar: () => { descargar('ajustes-phoenix.json', exportarAjustes(leerAjustes())); avisar('Archivo descargado.'); },
  importar: () => document.getElementById('aj-archivo')?.click(),
  restablecer: () => { reemplazarAjustes(AJUSTES_DEFECTO); pintar(); avisar('Ajustes restablecidos.'); },
  'borrar-local': async () => {
    if (!(await confirmar('Se borrarán tus ajustes, el historial de «En vivo» y el zoom guardado de ESTE navegador. Tu cuenta no se toca. ¿Continuar?', { titulo: 'Borrar datos de este navegador', aceptar: 'Borrar', peligro: true }))) return;
    const n = borrarDatosLocales(); reemplazarAjustes(AJUSTES_DEFECTO); pintar(); avisar(`Listo: ${n} dato(s) local(es) borrados.`);
  },
};
document.addEventListener('click', (e) => { const b = e.target.closest('[data-accion]'); if (!b) return; try { ACCIONES[b.dataset.accion]?.(); } catch (err) { console.error('[ajustes] acción fallida:', err); toast('No se pudo completar la acción.', 'error'); } });
document.getElementById('aj-archivo')?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
  if (f.size > 100_000) { avisar('El archivo es demasiado grande para ser un respaldo de ajustes.'); return; }
  const r = importarAjustes(await f.text());
  if (!r.ok) { avisar(r.error); return; }
  reemplazarAjustes(r.ajustes); pintar(); avisar('Ajustes importados.');
});

// Sección Cuenta: depende de la sesión
const cuenta = document.getElementById('aj-cuenta');
onSession(({ session, profile }) => {
  if (!cuenta) return;
  if (!session) { pintarTarjetaCuenta(null); cuenta.innerHTML = '<p>No has iniciado sesión. Usa el botón «Ingresar» de la cabecera para ver aquí tu perfil.</p>'; return; }
  pintarTarjetaCuenta(profile);
  cuenta.innerHTML = `<p class="mb-3">Sesión iniciada como <b class="text-white">${escapeHTML(profile?.nombre_display || 'Jugador')}</b>${profile?.username ? ` <span class="text-gray-500">@${escapeHTML(profile.username)}</span>` : ''}.</p>
    <div class="flex flex-wrap gap-2"><button type="button" id="aj-perfil" class="btn btn-ghost"><i class="fa-solid fa-user-pen"></i> Editar perfil</button>
    <a class="btn btn-ghost" href="${escapeHTML(href('mis-partidos/'))}"><i class="fa-solid fa-gamepad"></i> Mis partidos</a>
    <button type="button" id="aj-salir" class="btn btn-ghost !text-bad !border-bad/50"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button></div>`;
  cuenta.querySelector('#aj-perfil').addEventListener('click', openProfileModal);
  cuenta.querySelector('#aj-salir').addEventListener('click', logout);
  const der = document.createElement('div'); cuenta.append(der); pintarDerechos(der);
});
pintar();

// ── Navegación al estilo de «Configuración y privacidad» de Meta (19-oct-2026) ──
// La dirección dice dónde estás (#apariencia, #cuenta…). En PC se ve la lista y la sección a la vez (sin dirección, la primera);
// en el celular, o la lista o la sección, con flecha para volver. Sin JS se ven todas las secciones.
const raiz = document.querySelector('[data-cfg]');
const tabs = [...document.querySelectorAll('[data-tab]')]; const paneles = [...document.querySelectorAll('[data-panel]')];
const esPC = () => matchMedia('(min-width: 1024px)').matches;
function abrir(id) {
  const existe = paneles.some((p) => p.dataset.seccion === id);
  const ver = existe ? id : (esPC() ? paneles[0]?.dataset.seccion : null);
  paneles.forEach((p) => { p.hidden = p.dataset.seccion !== ver; });
  tabs.forEach((t) => { if (t.dataset.tab === ver) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  const antes = raiz.dataset.cfgVista; raiz.dataset.cfgVista = existe ? 'seccion' : 'indice';
  if (!esPC() && antes !== raiz.dataset.cfgVista) scrollTo({ top: 0 });
}
window.addEventListener('hashchange', () => abrir(location.hash.slice(1)));
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-cfg-volver]')) return;
  e.preventDefault(); history.pushState(null, '', location.pathname + location.search); abrir('');
});
window.addEventListener('popstate', () => abrir(location.hash.slice(1)));
abrir(location.hash.slice(1));

// La tarjeta de tu cuenta (como el «Centro de cuentas»): tu foto, tu nombre y tu usuario.
function pintarTarjetaCuenta(perfil) {
  const av = document.getElementById('cfg-av'); const nom = document.getElementById('cfg-nombre'); const us = document.getElementById('cfg-usuario');
  if (!av || !nom || !us) return;
  if (!perfil) { av.innerHTML = '<i class="fa-solid fa-user"></i>'; nom.textContent = 'Tu cuenta'; us.textContent = 'Inicia sesión para ver tu perfil'; return; }
  const n = perfil.nombre_display || perfil.username || 'Jugador';
  av.innerHTML = avatarHTML(perfil.avatar_url, n, 48); nom.textContent = n; us.textContent = perfil.username ? `@${perfil.username} · perfil, sesión y tus datos` : 'Perfil, sesión y tus datos';
}

// Buscador: encuentra cualquier opción, acción o sección por lo que dice; al tocar un resultado se abre su sección y la opción se ilumina.
const q = document.getElementById('cfg-q'); const res = document.getElementById('cfg-resultados'); const indice = document.querySelector('[data-cfg-indice]');
const titulos = Object.fromEntries(paneles.map((p) => [p.dataset.seccion, p.querySelector('h2')?.textContent ?? '']));
const iconos = Object.fromEntries(paneles.map((p) => [p.dataset.seccion, p.querySelector('.cfg-ic-grande i')?.className ?? 'fa-solid fa-gear']));
const sinTildes = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();   // «notificación» = «notificacion»
q?.addEventListener('input', () => {
  const texto = sinTildes(q.value.trim());
  if (!texto) { res.hidden = true; indice.hidden = false; return; }
  const hallados = [...document.querySelectorAll('[data-busca]')].filter((el) => sinTildes(el.dataset.busca).includes(texto)).slice(0, 12);
  indice.hidden = true; res.hidden = false;
  res.innerHTML = hallados.length
    ? `<p class="cfg-res-n">${hallados.length} resultado${hallados.length === 1 ? '' : 's'}</p>` + hallados.map((el, k) => `<a class="cfg-fila" href="#${el.dataset.buscaS}" data-ir="${k}"><span class="cfg-ic" aria-hidden="true"><i class="${escapeHTML(iconos[el.dataset.buscaS])}"></i></span><span class="cfg-txt"><b>${escapeHTML(el.dataset.buscaT)}</b><small>${escapeHTML(titulos[el.dataset.buscaS])}</small></span><span class="cfg-flecha" aria-hidden="true"></span></a>`).join('')
    : '<p class="cfg-res-vacio">No hay ninguna opción con esas palabras. Prueba con «tema», «notificaciones» o «datos».</p>';
  res.querySelectorAll('[data-ir]').forEach((a) => a.addEventListener('click', () => {
    const el = hallados[Number(a.dataset.ir)];
    requestAnimationFrame(() => { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('cfg-destello'); void el.offsetWidth; el.classList.add('cfg-destello'); });
    q.value = ''; res.hidden = true; indice.hidden = false;
  }));
});
iniciarVistas();
