// Chat flotante estilo red social: columna de contactos (PC) + botón «Chats» (pantallas menores) + ventanitas abajo.
// Interruptor: FX.contactos en data/experimento.js (false = desaparece todo; la sección /mensajes/ no cambia).
// En /mensajes/ no se abren ventanitas (sería duplicar la página): los contactos llevan a la conversación de la página completa.
import { onSession } from '../../core/session.js';
import { montarColumna, montarHoja } from './contactos.js';
import { montarVentanas } from './ventanas.js';
import { iniciarDatos, reiniciarDatos, abrirConUsuario, S } from './datos.js';
import { toast } from '../../core/toast.js';

export function initChatFlotante() {
  try {
    const enPaginaMensajes = /\/mensajes\/?$/.test(location.pathname);
    montarColumna({ enPaginaMensajes });
    montarHoja({ enPaginaMensajes });
    if (!enPaginaMensajes) montarVentanas();
    let actual = null;
    onSession(({ session }) => {
      const uid = session?.user?.id ?? null;
      document.documentElement.dataset.sesion = uid ? 'si' : 'no';
      if (uid === actual) return;
      if (actual) reiniciarDatos();
      actual = uid;
      if (uid) iniciarDatos(uid, { autoAbrir: !enPaginaMensajes }).catch((e) => console.error('[chat-flotante] inicio:', e));
    });
    // Cualquier página puede abrir un chat: window.dispatchEvent(new CustomEvent('chat:abrir', { detail: { usuario } }))
    window.addEventListener('chat:abrir', (e) => {
      const u = e.detail?.usuario; if (!u || !S.yo) return;
      abrirConUsuario(u).catch((err) => toast(err.message || 'No se pudo abrir el chat.', 'error', { key: 'cf-abrir' }));
    });
  } catch (e) { console.error('[chat-flotante] no se pudo montar:', e); }
}
