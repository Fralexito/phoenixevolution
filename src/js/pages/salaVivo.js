// Página /sala-vivo/?reto=ID: chat + predicción en vivo de un duelo (migración 157; lógica pura en core/competicion/salaVivo.js).
// Blindaje: la BD decide quién entra, escribe y predice; la pantalla pregunta cada 3 s solo lo NUEVO (desde el último id);
// textos escapados; anti-spam y límites en la BD; sin pedidos encimados; al volver a la pestaña se actualiza al toque.
import { onSession } from '../core/sistema/session.js';
import { supabase } from '../core/sistema/supabase.js';
import { escapeHTML as esc } from '../core/sistema/dom.js';
import { toast } from '../core/sistema/toast.js';
import { cargarFichaDuelo } from '../features/resultados/fichaDuelo.js';
import { porcentajes, unirMensajes, ultimoId, ETIQUETA_ROL } from '../core/competicion/salaVivo.js';

const $ = (id) => document.getElementById(id);
const RETO = Number(new URLSearchParams(location.search).get('reto')) || null;
const S = { msgs: [], d: null, cargando: false, enviando: false, timer: null, sesion: false };

function aviso(t) { $('sv-aviso').hidden = !t; $('sv-aviso').innerHTML = t || ''; if (t) { $('sv-chat').hidden = true; $('sv-pred').hidden = true; } }
const hora = (iso) => { try { return new Date(iso).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function pintarPred() {
  const d = S.d; const p = d.prediccion ?? {}; const sec = $('sv-pred');
  const pc = porcentajes(p); sec.hidden = false;
  const btn = (lado, txt) => `<button type="button" data-sv-pred="${lado}" aria-pressed="${p.mia === lado}" class="btn ${p.mia === lado ? 'btn-primary' : 'btn-ghost'} !min-h-10 !text-xs flex-1" ${p.puedo ? '' : 'disabled'}>${esc(txt)}</button>`;
  const res = p.resultado ? `<p class="text-sm text-amber-300"><i class="fa-solid fa-flag-checkered mr-1"></i>Ganó ${p.resultado === 'A' ? esc(d.a.nombre) : p.resultado === 'B' ? esc(d.b.nombre) : 'nadie (empate)'} · acertaron ${Number(p.acertaron) || 0} de ${pc.total}${p.mia ? (p.mia === p.resultado ? ' · ¡tú también!' : ' · tú no') : ''}</p>` : '';
  sec.innerHTML = `<h2 id="sv-pred-t" class="font-display font-bold text-white text-sm uppercase tracking-wider">¿Quién gana?</h2>
    <div class="flex gap-2">${btn('A', d.a.nombre ?? 'Lado A')}${btn('E', 'Empate')}${btn('B', d.b.nombre ?? 'Lado B')}</div>
    <div class="flex h-3 rounded-full overflow-hidden bg-white/10" role="img" aria-label="${pc.a}% ${esc(d.a.nombre ?? 'A')}, ${pc.e}% empate, ${pc.b}% ${esc(d.b.nombre ?? 'B')}">
      <i class="block bg-galaxy-400" style="width:${pc.a}%"></i><i class="block bg-gray-500" style="width:${pc.e}%"></i><i class="block bg-amber-300" style="width:${pc.b}%"></i></div>
    <p class="text-[12px] text-gray-400">${pc.total ? `${pc.a}% · ${pc.e}% · ${pc.b}% (${pc.total} predicción${pc.total === 1 ? '' : 'es'})` : 'Nadie predijo todavía.'} ${p.puedo ? '' : p.abierta ? '· Solo predicen los espectadores.' : '· Cerrada.'}</p>${res}`;
}

function pintarChat(nuevos) {
  const ol = $('sv-msgs'); const abajo = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
  ol.innerHTML = S.msgs.length ? S.msgs.map((m) => `<li class="text-sm leading-snug ${m.mio ? 'text-right' : ''}"><span class="text-[12px] ${m.rol === 'jugador' ? 'text-amber-300' : m.rol === 'staff' ? 'text-bad' : 'text-galaxy-400'} font-bold">${esc(m.nombre ?? '')}${ETIQUETA_ROL[m.rol] ? ` · ${ETIQUETA_ROL[m.rol]}` : ''}</span>
      <span class="text-[12px] text-gray-500 ml-1">${esc(hora(m.creado))}</span>${S.d?.puedo_moderar || m.mio ? `<button type="button" data-sv-ocultar="${Number(m.id)}" class="text-gray-500 hover:text-bad ml-1" aria-label="Ocultar mensaje"><i class="fa-solid fa-eye-slash text-[12px]"></i></button>` : ''}
      <span class="block text-gray-100 break-words">${esc(m.texto)}</span></li>`).join('') : '<li class="text-center text-[12px] text-gray-500 py-6">Aún no hay mensajes. ¡Saluda!</li>';
  if (abajo || nuevos) ol.scrollTop = ol.scrollHeight;
  const f = $('sv-form'); f.hidden = !S.d?.chat_abierto;
  if (!S.d?.chat_abierto && !document.getElementById('sv-cerrado')) f.insertAdjacentHTML('afterend', '<p id="sv-cerrado" class="text-[12px] text-gray-500 px-1">El chat de este duelo ya cerró.</p>');
}

async function cargar(inicial = false) {
  if (S.cargando || !RETO || !S.sesion) return; S.cargando = true;
  try {
    const { data, error } = await supabase.rpc('sala_en_vivo', { p_reto: RETO, p_desde: inicial ? 0 : ultimoId(S.msgs) });
    if (error) { aviso(error.code === 'PGRST202' ? 'La sala en vivo llega muy pronto.' : 'No se pudo cargar la sala.'); return; }
    if (!data?.visible) { aviso('<i class="fa-solid fa-lock mr-1"></i>Solo los jugadores, el host y los espectadores aprobados entran a esta sala. Pide verla desde «Salas en vivo».'); return; }
    aviso(''); S.d = data;
    const antes = ultimoId(S.msgs);
    S.msgs = unirMensajes(inicial ? [] : S.msgs, data.mensajes, data.ocultos);
    $('sv-titulo').innerHTML = `<i class="fa-solid fa-comments text-galaxy-400 mr-2"></i>${esc(data.a?.nombre ?? '—')} vs ${esc(data.b?.nombre ?? '—')}`;
    if (data.estado === 'FINALIZADO' && !S.fichaPedida) {   // ficha del partido (Link 0.3.51): una sola vez, al terminar
      S.fichaPedida = true;
      cargarFichaDuelo(RETO).then((html) => { if (html && !$('sv-ficha')) $('sv-pred').insertAdjacentHTML('beforebegin', `<div id="sv-ficha">${html}</div>`); });
    }
    $('sv-chat').hidden = false; pintarPred(); pintarChat(ultimoId(S.msgs) > antes);
  } catch (e) { console.error('[sala vivo]', e); }
  finally { S.cargando = false; }
}
function programar() { clearTimeout(S.timer); S.timer = setTimeout(async () => { if (!document.hidden) await cargar(); programar(); }, 3000); }

$('sv-form').addEventListener('submit', async (e) => {
  e.preventDefault(); if (S.enviando) return;
  const t = $('sv-texto').value.trim(); if (!t) return;
  if (t.length > 300) { toast('Máximo 300 caracteres.', 'error'); return; }
  S.enviando = true;
  try { const { error } = await supabase.rpc('sala_chat_enviar', { p_reto: RETO, p_texto: t }); if (error) throw error; $('sv-texto').value = ''; await cargar(); }
  catch (err) { toast(err?.message || 'No se pudo enviar.', 'error'); }
  finally { S.enviando = false; }
});
document.addEventListener('click', async (e) => {
  const p = e.target.closest('[data-sv-pred]');
  if (p && !p.disabled) {
    try { const { error } = await supabase.rpc('sala_prediccion', { p_reto: RETO, p_lado: p.dataset.svPred }); if (error) throw error; await cargar(); }
    catch (err) { toast(err?.message || 'No se pudo guardar.', 'error'); }
    return;
  }
  const o = e.target.closest('[data-sv-ocultar]');
  if (o) {
    try { const { error } = await supabase.rpc('sala_chat_ocultar', { p_id: Number(o.dataset.svOcultar) }); if (error) throw error; S.msgs = S.msgs.filter((m) => Number(m.id) !== Number(o.dataset.svOcultar)); pintarChat(false); }
    catch (err) { toast(err?.message || 'No se pudo ocultar.', 'error'); }
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
onSession(({ session }) => {
  S.sesion = Boolean(session);
  if (!RETO) { aviso('Falta el duelo. Entra desde «Salas en vivo» o desde tus partidos agendados.'); return; }
  if (!session) { aviso('<i class="fa-solid fa-right-to-bracket mr-1"></i>Entra con tu cuenta para ver la sala.'); return; }
  cargar(true); programar();
});
