// Enganche · lógica PURA (se prueba en Node): textos de racha, forma reciente y ranking semanal.
export function textoRacha(r) {
  const dias = Math.max(0, Math.trunc(Number(r?.dias) || 0));
  if (r?.jugo_hoy) return { titulo: `🔥 Racha de ${dias} día${dias === 1 ? '' : 's'}`, meta: '✅ Meta de hoy cumplida', hecho: true };
  if (dias) return { titulo: `🔥 Racha de ${dias} día${dias === 1 ? '' : 's'}`, meta: 'Juega 1 reto hoy para no perderla', hecho: false };
  return { titulo: 'Empieza tu racha', meta: 'Juega 1 reto hoy y suma tu primer día', hecho: false };
}
export const CLASE_FORMA = Object.freeze({ G: 'bg-emerald-500 text-black', E: 'bg-gray-400 text-black', P: 'bg-rose-500 text-white' });
export const formaValida = (f) => (Array.isArray(f) ? f.filter((x) => x in CLASE_FORMA).slice(0, 10) : []);
/** Segundos hasta el reinicio del ranking (lunes 00:00 Lima, lo trae el servidor como «hasta»). */
export const faltaReinicio = (hasta, ahora = Date.now()) => Math.max(0, Math.floor((Date.parse(hasta) - ahora) / 1000));
export function textoFalta(s) {
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}
