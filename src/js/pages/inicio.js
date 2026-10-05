// Portada «viva»: Tu espacio + Pasa ahora + Vitrina. Cada pieza falla en silencio (nunca rompe la portada).
import { iniciarEspacio } from '../features/inicio/espacio.js';
import { iniciarAhora } from '../features/inicio/ahora.js';
import { iniciarVitrina } from '../features/inicio/tienda.js';
import { iniciarHoy } from '../features/inicio/hoy.js';
import { iniciarNavegacion } from '../features/inicio/navegacion.js';
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
seguro(() => iniciarNavegacion());
// Un solo botón principal: visita → «Crear cuenta gratis»; con sesión → «Sala de Duelos».
onSession(({ session }) => {
  const r = document.getElementById('hero-cta-registro'), d = document.getElementById('hero-cta-duelos');
  if (r) r.hidden = !!session; if (d) d.hidden = !session;
});
document.getElementById('hero-cta-registro')?.addEventListener('click', () => openAuthModal('register'));
