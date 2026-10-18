// Lógica pura del «Centro de partido» (ronda 340). Sin React: la usan la isla y los tests.
export function eventosHasta(eventos, min) {
  return (eventos || []).filter((e) => e.min <= min).sort((a, b) => b.min - a.min);
}
export function marcadorAl(eventos, min) {
  const m = { local: 0, visita: 0 };
  for (const e of eventos || []) if (e.tipo === 'gol' && e.min <= min) m[e.lado] += 1;
  return m;
}
// stats: [{id,nombre,local,visita,sufijo?}] = valores FINALES; se reparten en proporción al minuto jugado.
export function estadisticasAl(stats, min, duracion) {
  const f = duracion > 0 ? Math.max(0, Math.min(1, min / duracion)) : 0;
  return (stats || []).map((s) => {
    const pct = s.sufijo === '%';
    return { ...s, sufijo: s.sufijo || '', local: pct ? s.local : Math.round(s.local * f), visita: pct ? s.visita : Math.round(s.visita * f) };
  });
}
