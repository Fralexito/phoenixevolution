// Lógica PURA de «Mi club» (sin DOM → con pruebas): primeros pasos con progreso y próximo partido de liga.
import { campana, coincide } from './perfil.js';

/**
 * Los 5 primeros pasos de una cuenta nueva. ctx = { perfilCompleto, avatar, ficha, pc, jugo } (booleanos).
 * Cada paso dice POR QUÉ importa (el usuario nuevo lo pidió así). `href` es relativo al sitio; `accion` abre algo del sistema.
 */
export function pasosClub(ctx = {}) {
  const c = ctx ?? {};
  return [
    { id: 'cuenta', titulo: 'Cuenta creada', ayuda: 'Ya tienes perfil, reputación y acceso a los retos.', porque: '', hecho: true },
    { id: 'perfil', titulo: 'Completa tu perfil', ayuda: 'Apodo, país y foto. Así te reconocen en la tabla y en los retos.', porque: 'Sin foto ni apodo, los rivales no saben quién les habla.', hecho: !!c.perfilCompleto && !!c.avatar, accion: 'profile', boton: 'Completar' },
    { id: 'ficha', titulo: 'Ten tu ficha de jugador', ayuda: 'Tu carta: posición, estadísticas y una frase. La crea el staff con tus datos.', porque: 'Sin ficha no apareces en «Jugadores» ni en el comparador.', hecho: !!c.ficha, href: 'database/', boton: 'Pedir ficha' },
    { id: 'pc', titulo: 'Vincula tu PC', ayuda: 'Instala Phoenix Link y Parsec. Si vas a ser host, te da el código de sala.', porque: 'Las partidas se juegan en la PC de un host; sin esto no te conectas.', hecho: !!c.pc, href: 'mis-salas/', boton: 'Vincular' },
    { id: 'reto', titulo: 'Juega tu primer reto', ayuda: 'Lanza un reto a toda la red o acepta uno abierto.', porque: 'El primer resultado abre tu historial y tu reputación.', hecho: !!c.jugo, href: 'duelos/', boton: 'Ir a Duelos' },
  ];
}
export const porcentajeClub = (pasos) => { const l = Array.isArray(pasos) ? pasos : []; return l.length ? Math.round((l.filter((p) => p.hecho).length / l.length) * 100) : 0; };
export const siguienteClub = (pasos) => (Array.isArray(pasos) ? pasos : []).find((p) => !p.hecho) ?? null;
export const faltanClub = (pasos) => (Array.isArray(pasos) ? pasos : []).filter((p) => !p.hecho).length;

/** Mi situación en la edición en curso: puesto, fila de tabla y próximo partido. null si no juego esa liga. */
export function miLigaClub(ediciones, nombreDisplay) {
  if (!nombreDisplay || !Array.isArray(ediciones)) return null;
  const ed = ediciones.find((e) => e.estado === 'en_curso') ?? ediciones[0]; if (!ed) return null;
  const nombres = new Set((ed.fechas ?? []).flatMap((f) => (f.partidos ?? []).flatMap((m) => [m.l, m.v])));
  const propio = [...nombres].find((n) => coincide({ nombre: nombreDisplay }, n)); if (!propio) return null;
  const c = campana(ed, propio); if (!c) return null;
  return { edicion: ed, nombre: propio, puesto: c.puesto, total: c.total, fila: c.fila, club: c.club, proximo: c.proximos[0] ?? null, jugados: c.jugados.length };
}

/** Texto corto del saludo del resumen según lo que falte. */
export function tituloClub({ faltan = 0, proximo = null } = {}) {
  if (faltan > 0) return { a: `Te faltan ${faltan} paso${faltan === 1 ? '' : 's'}`, b: faltan === 1 ? 'para estar listo' : 'para tu primer reto' };
  if (proximo) return { a: 'Tu próximo partido', b: `es contra ${proximo.rival}` };
  return { a: 'Todo listo', b: '¿jugamos?' };
}
