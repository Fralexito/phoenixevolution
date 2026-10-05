// Pendientes del usuario para el menú del avatar: mensajes sin leer y solicitudes de amistad recibidas.
// Tolerante a fallos: si una consulta falla (o la migración aún no existe) esa cuenta queda en 0 y se registra, sin romper la cabecera.
import { listarConversaciones } from './chat/api.js';
import { cargarRed } from './amigos/api.js';
import { totalNoLeidos } from '../core/chat.js';

/** Devuelve la función para detener el refresco. `onChange({mensajes, solicitudes})` se llama en cada lectura. */
export function iniciarPendientes(onChange) {
  let activo = true;
  const cargar = async () => {
    const [c, r] = await Promise.allSettled([listarConversaciones(), cargarRed()]);
    if (!activo) return;
    if (c.status === 'rejected') console.warn('[pendientes] mensajes:', c.reason?.message);
    if (r.status === 'rejected') console.warn('[pendientes] amigos:', r.reason?.message);
    onChange({ mensajes: c.status === 'fulfilled' ? totalNoLeidos(c.value) : 0, solicitudes: r.status === 'fulfilled' ? r.value.recibidas.length : 0 });
  };
  const alRefrescar = () => cargar();
  window.addEventListener('pendientes:refresh', alRefrescar);
  cargar();
  const t = setInterval(() => { if (!document.hidden) cargar(); }, 60000);
  return () => { activo = false; clearInterval(t); window.removeEventListener('pendientes:refresh', alRefrescar); };
}
