// Datos de EJEMPLO para Central. Se reemplazarán cuando se conecte CopaFácil/Supabase (tablas partidos_torneo, etc.).
export const DEMO_MATCHES = [
  { local: 'Fralex (Barcelona)', gl: '3', visita: 'Axel (Real Madrid)', gv: '2' },
  { local: 'Roberto (Inter)', gl: '1', visita: 'Morgado (Milan)', gv: '1' },
  { local: 'Arens (Man. City)', gl: '-', visita: 'Jack (Man. United)', gv: '-', nota: 'HOY 22:00' },
];
export const DEMO_TABLE = [
  { nombre: 'Fralex (Barcelona)', pts: 9 },
  { nombre: 'Axel (Real Madrid)', pts: 7 },
  { nombre: 'Arens (Man. City)', pts: 6 },
];
export const DEMO_XI = [
  { pos: 'DC', nombre: 'FRALEX', cls: 'bg-red-600 text-white' },
  { pos: 'EI', nombre: 'MORGADO', cls: 'bg-blue-500 text-white' },
  { pos: 'MCO', nombre: 'AXEL', cls: 'bg-white text-black' },
  { pos: 'ED', nombre: 'ARENS', cls: 'bg-cyan-500 text-white' },
  { pos: 'MCD', nombre: 'ROBERTO', cls: 'bg-yellow-500 text-black' },
];
// Clips de ejemplo para «Highlights» (se reemplazarán por los videos reales del canal).
export const DEMO_CLIPS = [
  { tag: 'TOP 5', titulo: 'Mejores atajadas: Jornada 3', dur: '4:12' },
  { tag: 'RESUMEN', titulo: 'Fralex 3-2 Axel: el partidazo', dur: '6:40' },
  { tag: 'TOP 5', titulo: 'Mejores goles: Jornada 2', dur: '3:55' },
];
