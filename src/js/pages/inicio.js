// Portada «viva»: Tu espacio + Pasa ahora + Vitrina. Cada pieza falla en silencio (nunca rompe la portada).
import { iniciarEspacio } from '../features/inicio/espacio.js';
import { iniciarAhora } from '../features/inicio/ahora.js';
import { iniciarVitrina } from '../features/inicio/tienda.js';
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
