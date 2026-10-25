// MVP del partido — lógica PURA (sin DOM → `npm test`). Datos de mvp_de / mvp_pendientes (migración 147).
// La BD decide quién vota y cuándo; aquí solo se arma lo que se muestra. Nunca lanza.

/** «Cierra en 5 h», «cierra en 40 min», «cerrada». */
export function cierreTexto(iso, ahora = new Date()) {
  const t = new Date(iso ?? NaN).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.round((t - new Date(ahora).getTime()) / 60e3);
  if (min <= 0) return 'Votación cerrada';
  if (min < 60) return `Cierra en ${min} min`;
  return `Cierra en ${Math.round(min / 60)} h`;
}

/** Vista de una votación: qué mostrar y qué se puede hacer. */
export function vistaMvp(v, yo) {
  if (!v || !Array.isArray(v.candidatos)) return { tipo: 'nada' };
  const candidatos = v.candidatos.filter((c) => c && c.id).map((c) => ({ ...c, soyYo: c.id === yo, elegido: c.id === v.mi_voto }));
  if (v.abierta) {
    return { tipo: v.puedo_votar ? 'votar' : 'mirar', candidatos, yaVote: !!v.mi_voto,
      progreso: `${Number(v.votos_total) || 0} de ${Number(v.votantes_total) || 0} votaron` };
  }
  if (v.mvp?.id) return { tipo: 'ganador', candidatos, mvp: v.mvp, soyMvp: v.mvp.id === yo };
  return { tipo: Number(v.votos_total) ? 'empate' : 'sin_votos', candidatos };
}

/** Texto para el perfil. */
export const mvpPerfil = (n) => (Number.isInteger(n) && n > 0 ? `MVP ×${n}` : '');
