// Portada «viva»: Tu espacio + Pasa ahora + Vitrina. Cada pieza falla en silencio (nunca rompe la portada).
import { iniciarEspacio } from '../features/inicio/espacio.js';
import { iniciarAhora } from '../features/inicio/ahora.js';
import { iniciarVitrina } from '../features/inicio/tienda.js';
import { iniciarHoy } from '../features/inicio/hoy.js';
import { listarEventos } from '../features/eventos/api.js';
import { estadoEvento, cuentaRegresiva } from '../core/evento.js';
import { onSession } from '../core/session.js';
import { openAuthModal } from '../features/auth.js';
import { supabase } from '../core/supabase.js';
import { cifra } from '../core/central.js';

const seguro = (f) => { try { return f(); } catch (e) { console.error('[inicio]', e); } };
(async () => {
  let total = '';
  try { const { count } = await supabase.from('perfiles').select('id', { count: 'exact', head: true }); const c = cifra(count); total = c === '—' ? '' : c; } catch (e) { console.warn('[inicio] total:', e?.message ?? e); }
  seguro(() => iniciarEspacio(total));
})();
seguro(() => iniciarAhora());
seguro(() => iniciarVitrina());
seguro(() => iniciarHoy());
// Avisos vivos en las baldosas del lanzador: retos abiertos y próximo evento. Si no hay dato, la baldosa queda sin aviso.
const aviso = (clave, texto) => { const e = document.querySelector(`[data-bad="${clave}"]`); if (e && texto) { e.textContent = texto; e.hidden = false; } };
supabase.from('retos_matchmaking').select('id', { count: 'exact', head: true }).eq('estado', 'BUSCANDO').then(({ count }) => { if (count > 0) aviso('retos', `${count} esperando`); }).catch((e) => console.warn('[inicio] aviso retos:', e?.message ?? e));
listarEventos(false, 5).then((l) => { const e = l.find((x) => !x.cancelado && ['proximo', 'en_curso'].includes(estadoEvento(x))); if (e) aviso('evento', estadoEvento(e) === 'en_curso' ? 'En curso' : cuentaRegresiva(e.inicia_at)); }).catch((e) => console.warn('[inicio] aviso evento:', e?.message ?? e));
// Un solo botón principal: visita → «Crear cuenta gratis»; con sesión → «Sala de Duelos».
onSession(({ session }) => {
  const r = document.getElementById('hero-cta-registro'), d = document.getElementById('hero-cta-duelos');
  if (r) r.hidden = !!session; if (d) d.hidden = !session;
});
document.getElementById('hero-cta-registro')?.addEventListener('click', () => openAuthModal('register'));
