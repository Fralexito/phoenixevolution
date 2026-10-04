// Las 14 estadísticas de una ficha: nombre completo y qué significa, en palabras simples.
// Es la única fuente: la leyenda del formulario de jugador la lee de aquí. Para retocar un texto, edítalo aquí.
export const STAT_INFO = {
  atq: { nombre: 'Ataque', texto: 'Cuánto ataca: llegadas constantes al área rival y presión ofensiva.' },
  fin: { nombre: 'Finalización', texto: 'Sangre fría para convertir el remate en gol, sobre todo mano a mano con el portero.' },
  pot: { nombre: 'Potencia', texto: 'Fuerza del disparo de media y larga distancia, y qué tan bien dosifica la barra.' },
  efe: { nombre: 'Efecto', texto: 'La curva que le da al balón: tiros libres, centros y remates colocados con rosca.' },
  reg: { nombre: 'Regate', texto: 'Gana el uno contra uno con amagues, cambios de ritmo y cancelaciones.' },
  cor: { nombre: 'Control corporal', texto: 'Controla bien al recibir, protege el balón de espaldas y gira sin perderlo.' },
  cre: { nombre: 'Creación', texto: 'Imaginación para romper defensas cerradas: pases filtrados y asistencias.' },
  def: { nombre: 'Defensa', texto: 'Quita el balón limpio, corta pases y mantiene firme su zona.' },
  pre: { nombre: 'Presión', texto: 'Intensidad para recuperar arriba: ahoga al rival cuando sale jugando.' },
  pos: { nombre: 'Posicionamiento', texto: 'Orden táctico: mantiene su línea y cubre espacios sin desarmar al equipo.' },
  ant: { nombre: 'Anticipación', texto: 'Lee lo que hará el rival y corta el pase antes de que salga.' },
  pas: { nombre: 'Pase', texto: 'Precisión y fluidez al distribuir: triangulaciones y juego a un toque.' },
  rit: { nombre: 'Ritmo', texto: 'Maneja los tiempos: acelera en el contraataque o enfría el partido con posesión.' },
  men: { nombre: 'Agilidad mental', texto: 'Decide rápido, mantiene la calma bajo presión (anti-tilt) y se adapta durante el partido.' },
  ovr: { nombre: 'Media general', texto: 'Nivel global del jugador. Se calcula sola (promedio de las 14 estadísticas); si la mueves tú, queda fija hasta que vuelvas a «Automático».' },
};
