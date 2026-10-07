// Chat flotante · DATOS compartidos por la columna de contactos y las ventanitas (un solo lugar que habla con Supabase).
// Esquema: contactos.js / ventanas.js (pintan) → este archivo (red + tiempo real) → core/chatFlotante.js y core/chat.js (reglas puras).
// Reglas de quién puede escribir a quién: en la BD (migración 018). Aquí solo se muestran sus errores con texto legible.
import { supabase } from '../../core/supabase.js';
import * as chat from '../chat/api.js';
import { cargarRed } from '../amigos/api.js';
import { iniciarEnLinea, alCambiarEnLinea, detenerEnLinea } from '../enLinea.js';
import { leerEstado, abrirVentana, cerrarVentana, minimizarVentana, ajustarACaben, debeAparecer, noLeidosPorUsuario } from '../../core/chatFlotante.js';
import { validarTexto } from '../../core/chat.js';

const CLAVE = 'pes-chat-ventanas';
const leerSesion = () => { try { return sessionStorage.getItem(CLAVE); } catch { return null; } };
const guardarSesion = (e) => { try { sessionStorage.setItem(CLAVE, JSON.stringify(e)); } catch { /* sin almacenamiento: no se recuerda entre páginas */ } };

/** Estado único. Nadie más lo modifica: se cambia con las funciones de abajo y se avisa con `emitir()`. */
export const S = {
  yo: null, listo: false, amigos: [], convs: [], perfiles: new Map(), enLinea: new Set(),
  ventanas: leerEstado(leerSesion()), caben: 1,
  mensajes: new Map(),      // conv → [{ id, autor_id, texto, eliminado, created_at, pendiente? }] (antiguo → nuevo)
  miembros: new Map(),      // conv → [usuario_id]
  cargando: new Set(),      // convs cargando mensajes
};
const subs = new Set();
export const alCambiar = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emitir = (motivo) => subs.forEach((f) => { try { f(motivo); } catch (e) { console.error('[chat-flotante] listener:', e); } });

export const convDe = (id) => S.convs.find((c) => c.id === id) ?? null;
export const perfil = (id) => S.perfiles.get(id) ?? null;
export const nombre = (id) => perfil(id)?.nombre_display || perfil(id)?.username || 'Jugador';
export const noLeidosPor = () => noLeidosPorUsuario(S.convs);

/** Perfiles que falten (en lotes de 100). Nunca lanza: sin nombre se muestra «Jugador». */
async function asegurarPerfiles(ids) {
  const faltan = [...new Set(ids)].filter((id) => id && !S.perfiles.has(id));
  for (let i = 0; i < faltan.length; i += 100) {
    const { data, error } = await supabase.from('perfiles').select('id, username, nombre_display, avatar_url').in('id', faltan.slice(i, i + 100));
    if (error) { console.warn('[chat-flotante] perfiles:', error.message); return; }
    for (const p of data ?? []) S.perfiles.set(p.id, p);
  }
}

let tRefresco = 0;
/** Recarga la lista de conversaciones (con contadores). Agrupa llamadas seguidas (los mensajes llegan en ráfagas). */
export function refrescarConvs(inmediato = false) {
  clearTimeout(tRefresco);
  const hacer = async () => {
    try { S.convs = await chat.listarConversaciones(); await asegurarPerfiles(S.convs.map((c) => c.otro_id)); emitir('convs'); }
    catch (e) { console.warn('[chat-flotante] conversaciones:', e.message); }
  };
  if (inmediato) return hacer();
  tRefresco = setTimeout(hacer, 400);
  return Promise.resolve();
}

// ── Ventanas ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function fijarVentanas(nuevo, motivo = 'ventanas') { S.ventanas = nuevo; guardarSesion(nuevo); emitir(motivo); }

export function setCaben(n) {
  if (n === S.caben) return;
  S.caben = n; fijarVentanas(ajustarACaben(S.ventanas, n));
}

/** Abre (o trae al frente) la ventana de una conversación y carga sus mensajes. */
export async function abrirConv(conv, { minimizada = false } = {}) {
  fijarVentanas(abrirVentana(S.ventanas, conv, S.caben, { minimizada }));
  if (!convDe(conv)) await refrescarConvs(true);
  await cargarMensajes(conv);
  if (!minimizada) await leido(conv);
}

/** Abre el chat directo con un usuario (la BD decide si se puede; si no, lanza Error con el motivo legible). */
export async function abrirConUsuario(usuario) {
  const conv = await chat.abrirDirecto(usuario);
  await abrirConv(conv);
  return conv;
}

export const cerrar = (conv) => fijarVentanas(cerrarVentana(S.ventanas, conv));
export const minimizar = (conv) => fijarVentanas(minimizarVentana(S.ventanas, conv));
export const desplegar = (conv) => abrirConv(conv);

export async function cargarMensajes(conv) {
  if (S.cargando.has(conv)) return;
  S.cargando.add(conv); emitir('mensajes');
  try {
    const lista = await chat.cargarMensajes(conv);                    // los 60 más nuevos, de nuevo → antiguo
    const pendientes = (S.mensajes.get(conv) ?? []).filter((m) => m.pendiente);
    S.mensajes.set(conv, [...lista.reverse(), ...pendientes]);
    const c = convDe(conv);
    if (c?.tipo === 'GRUPO' && !S.miembros.has(conv)) S.miembros.set(conv, (await chat.cargarMiembros(conv)).map((m) => m.usuario_id));
    await asegurarPerfiles([...S.mensajes.get(conv).map((m) => m.autor_id), ...(S.miembros.get(conv) ?? [])]);
  } catch (e) {
    console.warn('[chat-flotante] mensajes:', e.message);
    if (!S.mensajes.has(conv)) S.mensajes.set(conv, null);           // null = «no se pudo cargar» (la ventana ofrece reintentar)
  } finally { S.cargando.delete(conv); emitir('mensajes'); }
}

/** Marca leída (solo si la pestaña está a la vista) y avisa al contador del menú. */
export async function leido(conv) {
  const c = convDe(conv);
  if (document.hidden || !c?.no_leidos) return;
  try {
    await chat.marcarLeido(conv); c.no_leidos = 0; emitir('convs');
    window.dispatchEvent(new CustomEvent('pendientes:refresh'));
  } catch (e) { console.warn('[chat-flotante] leído:', e.message); }
}

/**
 * Envía con respuesta inmediata: el mensaje aparece al instante como «enviando…» y se confirma cuando llega por tiempo real
 * (o al recargar). Si falla, se marca con error y se devuelve el texto para no perder lo escrito.
 */
export async function enviar(conv, texto) {
  const v = validarTexto(texto);
  if (!v.ok) throw new Error(v.error);
  const tmp = { id: `tmp-${Date.now()}`, autor_id: S.yo, texto: v.texto, eliminado: false, created_at: new Date().toISOString(), pendiente: true };
  S.mensajes.set(conv, [...(S.mensajes.get(conv) ?? []), tmp]); emitir('mensajes');
  try {
    await chat.enviar(conv, v.texto);
    S.mensajes.set(conv, (S.mensajes.get(conv) ?? []).filter((m) => m.id !== tmp.id));
    await cargarMensajes(conv); refrescarConvs();
  } catch (e) {
    S.mensajes.set(conv, (S.mensajes.get(conv) ?? []).map((m) => (m.id === tmp.id ? { ...m, pendiente: false, error: e.message } : m)));
    emitir('mensajes'); throw e;
  }
}

/** Quita un mensaje que no se pudo enviar (el usuario decide reintentar o descartarlo). */
export function descartar(conv, idTmp) { S.mensajes.set(conv, (S.mensajes.get(conv) ?? []).filter((m) => m.id !== idTmp)); emitir('mensajes'); }

// ── Tiempo real ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let canal = null; let vigilando = false;
function escucharMensajes({ autoAbrir }) {
  if (canal) return;
  try {
    canal = supabase.channel('chat-flotante')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_privados' }, async ({ new: m }) => {
        const conv = m.conversacion_id;
        if (S.mensajes.has(conv) && S.mensajes.get(conv)) {
          const lista = S.mensajes.get(conv).filter((x) => !(x.pendiente && x.autor_id === m.autor_id && x.texto === m.texto));
          if (!lista.some((x) => x.id === m.id)) lista.push({ id: m.id, autor_id: m.autor_id, texto: m.texto, eliminado: m.eliminado, created_at: m.created_at });
          S.mensajes.set(conv, lista); await asegurarPerfiles([m.autor_id]); emitir('mensajes');
        }
        if (!convDe(conv)) await refrescarConvs(true); else refrescarConvs();
        const abierta = S.ventanas.find((v) => v.conv === conv);
        if (abierta && !abierta.min && m.autor_id !== S.yo) leido(conv);
        if (autoAbrir && debeAparecer(m, S.yo, convDe(conv), S.ventanas)) abrirConv(conv, { minimizada: true });
        if (m.autor_id !== S.yo) emitir('nuevo:' + conv);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes_privados' }, ({ new: m }) => {
        const lista = S.mensajes.get(m.conversacion_id);
        if (lista) { S.mensajes.set(m.conversacion_id, lista.map((x) => (x.id === m.id ? { ...x, eliminado: m.eliminado, texto: m.texto } : x))); emitir('mensajes'); }
      })
      .subscribe((estado) => { if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') console.warn('[chat-flotante] tiempo real:', estado); });
  } catch (e) { console.error('[chat-flotante] canal:', e); }
}

/** Arranca todo para el usuario conectado. `autoAbrir` = abrir burbuja sola al recibir un mensaje (no en /mensajes/). */
export async function iniciarDatos(usuario, { autoAbrir = true } = {}) {
  S.yo = usuario;
  let red = null;
  try { red = await cargarRed(); S.amigos = red.amigos; } catch (e) { console.warn('[chat-flotante] amigos:', e.message); }
  iniciarEnLinea(usuario, { anunciarme: red?.privacidad?.mostrar_conexion !== false });
  if (!vigilando) alCambiarEnLinea((set) => { S.enLinea = set; emitir('enLinea'); });
  await asegurarPerfiles(S.amigos);
  await refrescarConvs(true);
  S.listo = true; emitir('listo');
  escucharMensajes({ autoAbrir });
  for (const v of S.ventanas) cargarMensajes(v.conv);                // restaurar las ventanas de la página anterior
  if (vigilando) return;
  vigilando = true;                                                  // estos vigilantes se ponen UNA vez aunque la sesión cambie
  setInterval(() => { if (!document.hidden && S.yo) refrescarConvs(); }, 60_000);   // red de seguridad si el tiempo real se corta
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !S.yo) return;
    for (const v of S.ventanas) if (!v.min) leido(v.conv);
  });
}

/** Al cerrar sesión: limpia todo (incluidas las ventanas recordadas). */
export function reiniciarDatos() {
  if (canal) { try { supabase.removeChannel(canal); } catch { /* ya cerrado */ } canal = null; }
  detenerEnLinea();
  Object.assign(S, { yo: null, listo: false, amigos: [], convs: [], enLinea: new Set(), ventanas: [], mensajes: new Map(), miembros: new Map() });
  guardarSesion([]); emitir('reinicio');
}
