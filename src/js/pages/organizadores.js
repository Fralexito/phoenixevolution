// Página Organizadores: enlaza a cada impulsor con su perfil de jugador (si existe en la base). Es un extra: si falla, la página se ve igual.
import { supabase } from '../core/supabase.js';
import { coincide } from '../core/perfil.js';
import { escapeHTML } from '../core/dom.js';
import { href } from '../core/config.js';

(async () => {
  const tarjetas = [...document.querySelectorAll('[data-org-nombre]')]; if (!tarjetas.length) return;
  try {
    const { data, error } = await supabase.from('jugadores').select('id, nombre, apodo, club, posicion, ovr'); if (error) throw error;
    for (const t of tarjetas) {
      const j = (data ?? []).find((x) => coincide(x, t.dataset.orgNombre)); const caja = t.querySelector('[data-org-jugador]'); if (!j || !caja) continue;
      caja.innerHTML = `<span class="pc-chip"><i class="fa-solid fa-gauge-high"></i>Media ${escapeHTML(String(j.ovr ?? '—'))}</span>${j.club ? `<span class="pc-chip uppercase"><i class="fa-solid fa-shield-halved"></i>${escapeHTML(j.club)}</span>` : ''}
        <a class="pc-chip hover:border-galaxy-400" href="${href(`jugador/?id=${encodeURIComponent(j.id)}`)}"><i class="fa-solid fa-id-card"></i>Ver su perfil</a>`;
    }
  } catch (e) { console.warn('[organizadores] no se pudieron enlazar los perfiles:', e); }
})();
