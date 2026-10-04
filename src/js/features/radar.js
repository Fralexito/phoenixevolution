// Estado del "Radar": si está activo, los desafíos nuevos suenan y salen como aviso.
let on = false;
const subs = new Set();
export const isRadarOn = () => on;
export function setRadar(v) { on = !!v; subs.forEach((f) => f(on)); }
export const onRadar = (f) => { subs.add(f); return () => subs.delete(f); };
