// COMPETICIONES de la plataforma. Para sumar una liga nueva, agrega un objeto aquí: Central dibuja su banner sola.
// - estado: 'activa' | 'proxima'  (cambia la etiqueta y el color del sello)
// - titulo: [parte en blanco, parte con degradado]
// - acciones: botones propios de la liga (href relativo al sitio; '#id' = ancla dentro de Central)
// - copafacil: enlace público del torneo en CopaFácil ('' = el botón no aparece). Mientras CopaFácil gestione la liga, ahí viven el fixture y la tabla oficiales.
// - datos: ficha de la competición para la página «Liga». Deja v: '' y se muestra «Por definir» (no se inventa nada).
export const LIGAS = [
  {
    id: 'galaxy',
    estado: 'activa',
    titulo: ['GALAXY', 'LEAGUE'],
    juego: 'Pro Evolution Soccer (Conmebol Patch)',
    icono: 'fa-crown',
    imagen: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1400&auto=format&fit=crop',
    copafacil: 'https://copafacil.com/-2vbqe',
    descripcion: 'La competición oficial de Phoenix Evolution Series. Se organiza en CopaFácil; los partidos se coordinan en la Sala de Duelos y se juegan en remoto con Parsec o Smash Soda.',
    datos: [
      { k: 'Participantes', icono: 'fa-users', v: '12 jugadores' },
      { k: 'Formato', icono: 'fa-diagram-project', v: 'Todos contra todos, a ida y vuelta (1ª Fase)' },
      { k: 'Inscripción', icono: 'fa-pen-to-square', v: '' },
      { k: 'Calendario', icono: 'fa-calendar-days', v: '' },
      { k: 'Reglamento', icono: 'fa-scale-balanced', v: '3 puntos por victoria y 1 por empate. Desempate: enfrentamiento directo, diferencia de goles y goles a favor.' },
    ],
    acciones: [
      { label: 'Partidos y posiciones', href: '#central-partidos', primaria: true },
      { label: 'Ver jugadores', href: 'database/' },
      { label: "Ver liga", href: "liga/" },
    ],
  },
  {
    // LIGA SUDARIO: competición aparte (sus partidos, tabla y clubes viven en EDICIONES.sudario y no se mezclan con la Galaxy).
    // No aparece en Central (enCentral: false). Para volver SOLO a la Galaxy: en la página Liga pulsa «Galaxy League» (o borra este bloque).
    id: 'sudario',
    estado: 'activa',
    enCentral: false,
    titulo: ['LIGA', 'SUDARIO'],
    juego: 'SP Football Life 26',
    icono: 'fa-star',
    imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1400&auto=format&fit=crop',
    copafacil: '',
    descripcion: 'Liga de 12 jugadores, una sola ronda (11 fechas), jugada por Parsec.',
    datos: [
      { k: 'Participantes', icono: 'fa-users', v: '12 jugadores' },
      { k: 'Formato', icono: 'fa-diagram-project', v: 'Todos contra todos, una sola ronda (11 fechas)' },
      { k: 'Inscripción', icono: 'fa-pen-to-square', v: '' },
      { k: 'Calendario', icono: 'fa-calendar-days', v: '' },
      { k: 'Reglamento', icono: 'fa-scale-balanced', v: '' },
    ],
    acciones: [],
  },
];
export const ETIQUETA_ESTADO = { activa: 'Competición activa', proxima: 'Próximamente' };
