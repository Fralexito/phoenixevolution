// RESULTADOS de la Galaxy League, copiados de CopaFácil fecha por fecha (l = local, v = visitante, gl/gv = goles).
// Partido AÚN NO JUGADO: gl y gv en null (la tabla lo ignora hasta que se escriba el marcador).
// Es la base del «espejo»: la tabla se calcula con core/tabla.js y se compara con la de CopaFácil.
export const CLUBES = {
  Hugo: 'Arsenal', Arens: 'Manchester City', Degox: 'Atlético de Madrid', Beto: 'Liverpool', Jack: 'Manchester United', Morgado: 'AC Milan',
  Victor: 'Bayern Múnich', Fralex: 'FC Barcelona', Camilo: 'PSG', Jeremi: 'Chelsea', Roberto: 'Inter', Axel: 'Real Madrid',
};
export const FECHAS = [
  { n: 1, partidos: [
    { l: 'Hugo', v: 'Arens', gl: 2, gv: 3 }, { l: 'Degox', v: 'Beto', gl: 7, gv: 1 }, { l: 'Jack', v: 'Morgado', gl: 2, gv: 5 },
    { l: 'Victor', v: 'Fralex', gl: 9, gv: 0 }, { l: 'Camilo', v: 'Jeremi', gl: 0, gv: 4 }, { l: 'Roberto', v: 'Axel', gl: 0, gv: 3 },
  ] },
  { n: 2, partidos: [
    { l: 'Beto', v: 'Hugo', gl: 4, gv: 0 }, { l: 'Morgado', v: 'Arens', gl: 1, gv: 0 }, { l: 'Fralex', v: 'Degox', gl: 2, gv: 5 },
    { l: 'Jeremi', v: 'Jack', gl: 0, gv: 0 }, { l: 'Axel', v: 'Victor', gl: 1, gv: 6 }, { l: 'Roberto', v: 'Camilo', gl: 1, gv: 0 },
  ] },
  { n: 3, partidos: [
    { l: 'Hugo', v: 'Morgado', gl: 3, gv: 1 }, { l: 'Beto', v: 'Fralex', gl: 5, gv: 1 }, { l: 'Arens', v: 'Jeremi', gl: 3, gv: 1 },
    { l: 'Degox', v: 'Axel', gl: 3, gv: 1 }, { l: 'Jack', v: 'Roberto', gl: 1, gv: 0 }, { l: 'Victor', v: 'Camilo', gl: 10, gv: 0 },
  ] },
  { n: 4, partidos: [
    { l: 'Fralex', v: 'Hugo', gl: 5, gv: 1 }, { l: 'Jeremi', v: 'Morgado', gl: 4, gv: 3 }, { l: 'Axel', v: 'Beto', gl: 2, gv: 6 },
    { l: 'Roberto', v: 'Arens', gl: 4, gv: 3 }, { l: 'Camilo', v: 'Degox', gl: 0, gv: 9 }, { l: 'Victor', v: 'Jack', gl: 9, gv: 0 },
  ] },
  { n: 5, partidos: [
    { l: 'Hugo', v: 'Jeremi', gl: 2, gv: 2 }, { l: 'Fralex', v: 'Axel', gl: 4, gv: 5 }, { l: 'Morgado', v: 'Roberto', gl: 3, gv: 0 },
    { l: 'Beto', v: 'Camilo', gl: 9, gv: 1 }, { l: 'Arens', v: 'Victor', gl: 1, gv: 5 }, { l: 'Degox', v: 'Jack', gl: 5, gv: 0 },
  ] },
  { n: 6, partidos: [
    { l: 'Axel', v: 'Hugo', gl: 2, gv: 2 }, { l: 'Roberto', v: 'Jeremi', gl: 3, gv: 2 }, { l: 'Camilo', v: 'Fralex', gl: 4, gv: 3 },
    { l: 'Victor', v: 'Morgado', gl: 4, gv: 1 }, { l: 'Jack', v: 'Beto', gl: 2, gv: 6 }, { l: 'Degox', v: 'Arens', gl: 6, gv: 2 },
  ] },
  { n: 7, partidos: [
    { l: 'Axel', v: 'Camilo', gl: 2, gv: 1 }, { l: 'Jeremi', v: 'Victor', gl: 1, gv: 5 }, { l: 'Fralex', v: 'Jack', gl: 3, gv: 0 },
    { l: 'Morgado', v: 'Degox', gl: 0, gv: 1 }, { l: 'Beto', v: 'Arens', gl: 6, gv: 1 }, { l: 'Hugo', v: 'Roberto', gl: 1, gv: 1 },
  ] },
  { n: 8, partidos: [
    { l: 'Camilo', v: 'Hugo', gl: 1, gv: 0 }, { l: 'Victor', v: 'Roberto', gl: 9, gv: 0 }, { l: 'Jack', v: 'Axel', gl: 3, gv: 6 },
    { l: 'Degox', v: 'Jeremi', gl: null, gv: null }, { l: 'Arens', v: 'Fralex', gl: 4, gv: 2 }, { l: 'Beto', v: 'Morgado', gl: null, gv: null },
  ] },
  // Fecha 9 INCOMPLETA: el 6.º partido (Morgado – Fralex, por deducción) no se vio en las capturas; falta confirmar quién es local y su marcador.
  { n: 9, partidos: [
    { l: 'Hugo', v: 'Victor', gl: null, gv: null }, { l: 'Camilo', v: 'Jack', gl: 4, gv: 1 }, { l: 'Roberto', v: 'Degox', gl: null, gv: null },
    { l: 'Axel', v: 'Arens', gl: null, gv: null }, { l: 'Jeremi', v: 'Beto', gl: null, gv: null },
  ] },
];

// ---- HISTORIAL: todas las ediciones de cada liga, por id de liga (data/ligas.js). ----
// Para archivar una edición: cambia su `estado` a 'finalizada' y añade `campeon`. Para abrir otra: agrega un objeto nuevo (su propio archivo de fechas si crece).
//  estado: 'en_curso' | 'finalizada'    ·  fecha1Incompleta: avisa que falta cargar algún partido
export const EDICIONES = {
  galaxy: [
    {
      id: 'apertura-2026', nombre: 'Apertura 2026', estado: 'en_curso', fase: '1ª Fase',
      formato: 'Todos contra todos, a ida y vuelta', participantes: 12,
      clubes: CLUBES, fechas: FECHAS,
      aviso: 'Fecha 9 incompleta: falta cargar un partido (Morgado – Fralex, por descarte).',
    },
  ],
};
