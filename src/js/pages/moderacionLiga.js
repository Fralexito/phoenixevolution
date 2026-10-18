// Moderación › Liga (ronda 224): resultados que manda Phoenix Link, por validar (staff), y designar árbitros.
// Mismo permiso que el resto de Moderación (verReportes = ayudante, moderador, admin), que es la regla de la base
// (private.es_staff en liga_resolver_resultado y liga_designar_arbitro).
import { onSession, can } from '../core/sistema/session.js';
import { montarPanelStaff } from '../features/liga/validar.js';

let montado = false;
onSession(({ session }) => {
  if (montado || !session || !can('verReportes')) return;
  montado = true;
  montarPanelStaff(document.getElementById('mod-liga'));
});
