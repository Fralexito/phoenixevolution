// Mis partidos › Liga (ronda 224): partidos que me designaron para arbitrar y mis partidos oficiales que llegaron
// por Phoenix Link (con «Reclamar»). Cada bloque se oculta solo si no hay nada.
import { onSession } from '../core/session.js';
import { montarPanelArbitro, montarMisOficiales } from '../features/liga/validar.js';

let montadoPara = null;
onSession(({ session }) => {
  const id = session?.user?.id ?? null;
  if (!id || montadoPara === id) return;
  montadoPara = id;
  montarPanelArbitro(document.getElementById('bloque-arbitro'), id);
  montarMisOficiales(document.getElementById('bloque-oficiales'), id);
});
