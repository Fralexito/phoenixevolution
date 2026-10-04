// COMPETICIONES de la plataforma. Para sumar una liga nueva, agrega un objeto aquí: Central dibuja su banner sola.
// - estado: 'activa' | 'proxima'  (cambia la etiqueta y el color del sello)
// - titulo: [parte en blanco, parte con degradado]
// - acciones: botones propios de la liga (href relativo al sitio; '#id' = ancla dentro de Central)
export const LIGAS = [
  {
    id: 'galaxy',
    estado: 'activa',
    titulo: ['GALAXY', 'LEAGUE'],
    juego: 'Pro Evolution Soccer',
    icono: 'fa-crown',
    imagen: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1400&auto=format&fit=crop',
    acciones: [
      { label: 'Partidos y posiciones', href: '#central-partidos', primaria: true },
      { label: 'Ver jugadores', href: 'database/' },
    ],
  },
];
export const ETIQUETA_ESTADO = { activa: 'Competición activa', proxima: 'Próximamente' };
