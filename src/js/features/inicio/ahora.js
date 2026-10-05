// Carrusel «Pasa ahora en la Galaxy»: tarjetas con lo vivo (evento, noticia, retos abiertos) más dos invitaciones fijas, para que nunca esté vacío.
import { supabase } from '../../core/supabase.js';
import { escapeHTML, safeImg } from '../../core/dom.js';
import { href } from '../../core/config.js';
import { listarEventos } from '../eventos/api.js';
import { estadoEvento, cuentaRegresiva, formatoLima, nombreJuego } from '../../core/evento.js';
import { montarCarrusel } from '../carrusel.js';
import { activarReveal } from '../reveal.js';

const tarjeta = ({ chip, titulo, texto, enlace, imagen, icono, pulso = true }) => `<div class="car-slide"><a href="${href(enlace)}" class="slide-card glass-panel">
  ${imagen ? `<span class="fondo" style="background-image:url('${escapeHTML(imagen)}')"></span>` : `<span class="fondo" style="background:radial-gradient(circle at 80% 20%, rgb(128 0 255 / .55), transparent 60%)"></span>`}<span class="vel"></span>
  ${icono ? `<i class="fa-solid ${icono} absolute top-4 right-4 text-3xl text-galaxy-400/60"></i>` : ''}
  <span class="chip-ahora">${pulso ? '<span class="punto"></span>' : ''}${escapeHTML(chip)}</span><b class="font-display font-bold text-white text-lg leading-tight">${escapeHTML(titulo)}</b><span class="text-xs text-gray-300 mt-1">${escapeHTML(texto)}</span></a></div>`;

export async function iniciarAhora() {
  const raiz = document.getElementById('inicio-ahora'); if (!raiz) return;
  const tope = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('tiempo agotado')), 4000))]);   // si la red tarda, se muestran las invitaciones fijas
  const [ev, nt, rt] = await Promise.allSettled([
    tope(listarEventos(false, 5)),
    tope(supabase.from('noticias').select('titulo,resumen,imagen,publicada_en').eq('publicada', true).order('publicada_en', { ascending: false }).limit(1)),
    tope(supabase.from('retos_matchmaking').select('id', { count: 'exact', head: true }).eq('estado', 'BUSCANDO')),
  ]);
  const t = [];
  const evento = ev.status === 'fulfilled' ? ev.value.find((e) => !e.cancelado && ['proximo', 'en_curso'].includes(estadoEvento(e))) ?? ev.value.find((e) => !e.cancelado) : null;
  if (evento) t.push(tarjeta({ chip: estadoEvento(evento) === 'en_curso' ? 'En curso ahora' : `Próximo evento · ${cuentaRegresiva(evento.inicia_at)}`, titulo: evento.titulo, texto: `${formatoLima(evento.inicia_at)}${evento.juego ? ` · ${nombreJuego(evento.juego)}` : ''} · ${evento.interesados} interesados`, enlace: 'eventos/', icono: 'fa-calendar-day' }));
  const n = nt.status === 'fulfilled' ? nt.value.data?.[0] : null;
  if (n) t.push(tarjeta({ chip: 'Última noticia', titulo: n.titulo, texto: String(n.resumen ?? '').slice(0, 110), enlace: 'noticias/', imagen: safeImg(n.imagen), pulso: false }));
  const retos = rt.status === 'fulfilled' ? rt.value.count : null;
  if (Number.isFinite(retos) && retos > 0) t.push(tarjeta({ chip: 'Sala de duelos', titulo: `${retos} ${retos === 1 ? 'reto espera' : 'retos esperan'} rival`, texto: 'Entra, acepta uno y juega ahora mismo.', enlace: 'duelos/', icono: 'fa-gamepad' }));
  t.push(tarjeta({ chip: 'Retos semanales', titulo: 'Cumple retos y gana tokens', texto: 'Cada semana hay nuevos. Cobra tus premios en el Ranking.', enlace: 'ranking/', icono: 'fa-bolt', pulso: false }));
  t.push(tarjeta({ chip: 'Tienda', titulo: 'Estrena marcos, títulos y más', texto: 'Cosméticos para destacar tu perfil. Se compran con tokens.', enlace: 'tienda/', icono: 'fa-store', pulso: false }));
  raiz.innerHTML = `<div class="car multi3" data-auto="5500"><div class="car-track">${t.join('')}</div></div>`;
  montarCarrusel(raiz.querySelector('.car')); raiz.closest('section').hidden = false; raiz.hidden = false; activarReveal(raiz.closest('section'));
}
