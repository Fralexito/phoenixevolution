// Página /ayuda-ia/ (ronda 345): chat de ayuda. Habla con la función de servidor «ayuda-ia» (la clave de la API vive allí).
// La conversación se guarda solo en esta pestaña (memoria), no en la base.
import { supabase } from '../core/supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from '../core/config.js';
import { openAuthModal } from '../features/auth.js';
import { onSession } from '../core/session.js';
import { textoSeguro } from '../core/bandejaIA.js';
import { SUGERENCIAS, prepararMensajes, mensajeError, MAX_PREGUNTA } from '../core/ayudaIA.js';

const $ = (id) => document.getElementById(id);
const lista = $('aia-mensajes'); const form = $('aia-form'); const input = $('aia-input'); const boton = $('aia-enviar');
const historial = []; let enviando = false; let conSesion = false;

if (lista && form) {
  const burbuja = (rol, html, extra = '') => {
    const d = document.createElement('div'); d.className = `aia-msg ${rol === 'user' ? 'aia-yo' : 'aia-ia'} ${extra}`;
    d.innerHTML = rol === 'user' ? `<div class="aia-burbuja">${html}</div>` : `<span class="aia-av"><i class="fa-solid fa-robot"></i></span><div class="aia-burbuja">${html}</div>`;
    lista.append(d); lista.scrollTop = lista.scrollHeight; return d;
  };
  const pintarSugerencias = () => {
    $('aia-sugerencias').innerHTML = historial.length ? '' : SUGERENCIAS.map((s) => `<button type="button" class="aia-sug">${s}</button>`).join('');
  };
  const crecer = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; };

  async function preguntar(texto) {
    const t = String(texto ?? '').trim().slice(0, MAX_PREGUNTA);
    if (!t || enviando) return;
    if (!conSesion) { burbuja('ia', `<p>${mensajeError('SIN_SESION')}</p>`, 'aia-aviso'); openAuthModal('login'); return; }
    enviando = true; boton.disabled = true; input.value = ''; crecer();
    historial.push({ rol: 'user', texto: t }); burbuja('user', textoSeguro(t)); pintarSugerencias();
    const pensando = burbuja('ia', '<span class="aia-puntos"><i></i><i></i><i></i></span>', 'aia-pensando');
    try {
      const { data: s } = await supabase.auth.getSession();
      const r = await fetch(`${SUPABASE_URL}/functions/v1/ayuda-ia`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: SUPABASE_KEY, authorization: `Bearer ${s?.session?.access_token ?? ''}` },
        body: JSON.stringify({ mensajes: prepararMensajes(historial) }),
      });
      const d = await r.json().catch(() => ({}));
      pensando.remove();
      if (!r.ok || d.error) {
        historial.pop();   // la pregunta no obtuvo respuesta: no se cuenta en la conversación
        burbuja('ia', `<p>${mensajeError(d.error, d)}</p>`, 'aia-aviso');
      } else {
        historial.push({ rol: 'assistant', texto: d.texto });
        burbuja('ia', textoSeguro(d.texto));
        $('aia-pie').textContent = `Te quedan ${d.quedan} pregunta${d.quedan === 1 ? '' : 's'} hoy · La IA puede equivocarse. No compartas contraseñas ni datos de pago.`;
      }
    } catch {
      pensando.remove(); historial.pop(); burbuja('ia', `<p>${mensajeError('RED')}</p>`, 'aia-aviso');
    } finally { enviando = false; boton.disabled = false; input.focus(); }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); preguntar(input.value); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); preguntar(input.value); } });
  input.addEventListener('input', crecer);
  $('aia-pie').addEventListener('click', (e) => { if (e.target.closest('#aia-login')) openAuthModal('login'); });
  $('aia-sugerencias').addEventListener('click', (e) => { const b = e.target.closest('.aia-sug'); if (b) preguntar(b.textContent); });
  pintarSugerencias();
  onSession(({ session }) => {
    conSesion = !!session;
    if (!conSesion) $('aia-pie').innerHTML = 'Para preguntar, <button type="button" id="aia-login" class="underline">inicia sesión</button>. La IA puede equivocarse.';
  });
}
