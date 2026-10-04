// Página /ajustes/: pinta el valor guardado en cada control, guarda cada cambio al instante y ejecuta las acciones (borrar, exportar, importar…).
import { leerAjustes, cambiarAjuste, reemplazarAjustes, borrarDatosLocales } from '../features/ajustes.js';
import { exportarAjustes, importarAjustes, AJUSTES_DEFECTO } from '../core/ajustes.js';
import { onSession } from '../core/session.js';
import { openProfileModal } from '../features/profile.js';
import { logout } from '../features/auth.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';
import { toast } from '../core/toast.js';
import { iniciarVistas } from '../features/ajustesVista.js';

const estado = document.getElementById('aj-estado');
const avisar = (t) => { if (estado) estado.textContent = t; };
const controles = () => [...document.querySelectorAll('[data-clave]')];

function pintar() {
  const a = leerAjustes();
  for (const el of controles()) { const v = a[el.dataset.clave]; if (el.dataset.tipo === 'switch') el.checked = !!v; else el.value = String(v); }
}
function valorDe(el) {   // los valores de los <select> son texto: se devuelve el tipo original (aquí todos son texto salvo los switches)
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
  'borrar-zoom': () => { quitar('pes-zoom-pc'); quitar('pes-zoom-movil'); toast('Zoom olvidado: volverá al tamaño predeterminado.', 'info'); },
  exportar: () => { descargar('ajustes-phoenix.json', exportarAjustes(leerAjustes())); avisar('Archivo descargado.'); },
  importar: () => document.getElementById('aj-archivo')?.click(),
  restablecer: () => { reemplazarAjustes(AJUSTES_DEFECTO); pintar(); avisar('Ajustes restablecidos.'); },
  'borrar-local': () => {
    if (!window.confirm('Se borrarán tus ajustes, el historial de «En vivo» y el zoom guardado de ESTE navegador. Tu cuenta no se toca. ¿Continuar?')) return;
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
  if (!session) { cuenta.innerHTML = '<p>No has iniciado sesión. Usa el botón «Ingresar» de la cabecera para ver aquí tu perfil.</p>'; return; }
  cuenta.innerHTML = `<p class="mb-3">Sesión iniciada como <b class="text-white">${escapeHTML(profile?.nombre_display || 'Jugador')}</b>${profile?.username ? ` <span class="text-gray-500">@${escapeHTML(profile.username)}</span>` : ''}.</p>
    <div class="flex flex-wrap gap-2"><button type="button" id="aj-perfil" class="btn btn-ghost"><i class="fa-solid fa-user-pen"></i> Editar perfil</button>
    <a class="btn btn-ghost" href="${escapeHTML(href('duelos/#mis-partidos'))}"><i class="fa-solid fa-gamepad"></i> Mis partidos</a>
    <button type="button" id="aj-salir" class="btn btn-ghost !text-bad !border-bad/50"><i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</button></div>`;
  cuenta.querySelector('#aj-perfil').addEventListener('click', openProfileModal);
  cuenta.querySelector('#aj-salir').addEventListener('click', logout);
});
pintar();

// Pestañas: una sección a la vez (la de la URL #seccion, o la primera). Sin JS se ven todas.
const tabs = [...document.querySelectorAll('[data-tab]')]; const paneles = [...document.querySelectorAll('[data-panel]')];
function abrir(id) {
  const ok = paneles.some((p) => p.id === `panel-${id}`) ? id : paneles[0]?.id.replace('panel-', '');
  paneles.forEach((p) => { p.hidden = p.id !== `panel-${ok}`; }); tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === ok)));
}
tabs.forEach((t) => t.addEventListener('click', () => { abrir(t.dataset.tab); history.replaceState(null, '', `#${t.dataset.tab}`); }));
window.addEventListener('hashchange', () => abrir(location.hash.slice(1)));
abrir(location.hash.slice(1));
iniciarVistas();
