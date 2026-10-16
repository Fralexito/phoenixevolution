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
// Highlights (ronda 307): videos REALES de YouTube de PES 2021 como MODELO del tipo de clip que se pondrá (goles y jugadas de ligas online).
// Para cambiarlos, pon el id de YouTube (lo que va después de watch?v=). El primero es el grande; el resto, la lista.
export const DEMO_CLIPS = [
  { id: 'd9815MC-efg', tag: 'TOP GOLES', titulo: 'Mejores goles de la temporada', canal: 'Terry F.C.' },
  { id: '9fLuppybBQE', tag: 'JUGADAS', titulo: 'Goles y skills · Compilación #1', canal: 'MJ7' },
  { id: 'Bi-8fdt5bg8', tag: 'JUGADAS', titulo: 'Goles y skills · Compilación #2', canal: 'PES LEGEND' },
];
