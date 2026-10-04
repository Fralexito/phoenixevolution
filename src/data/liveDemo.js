// SIMULACIÓN del «Pulso en vivo» mientras no hay actividad real: los NOMBRES son los jugadores reales de la liga (se leen de data/ligaResultados.js,
// así que se actualizan solos), pero los eventos son inventados y salen siempre rotulados «demo».
// Cuando haya actividad real, se apaga con LIVE_DEMO = false en features/liveFeed.js (esta lista deja de usarse).
import { CLUBES } from './ligaResultados.js';
export const DEMO_NOMBRES = Object.keys(CLUBES);   // Hugo, Arens, Degox, Beto, Jack, Morgado, Victor, Fralex, Camilo, Jeremi, Roberto, Axel
export const DEMO_FORMATOS = ['1v1', '1v1', '2v2', '3v3'];
export const DEMO_JUEGOS = [
  { juego: 'PES 2021', parche: 'Dream Patch' }, { juego: 'PES 2021', parche: 'Conmebol Patch' }, { juego: 'PES 2021', parche: 'VirtuaRED' },
  { juego: 'PES 2021', parche: 'Sudamerican Patch' }, { juego: 'PES 2021', parche: 'Gogosz Patch' },
  { juego: 'SP Football Life', version: '25' }, { juego: 'SP Football Life', version: '26' }, { juego: 'SP Football Life', version: '27' },
];
