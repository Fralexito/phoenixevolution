// Lógica pura de la portada «viva» (sin DOM → probable). Saludo, pasos de bienvenida con progreso y textos cortos.

/** Saludo según la hora de Lima (0-23). */
export const saludo = (hora) => { const h = Number(hora); return h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 19 ? 'Buenas tardes' : 'Buenas noches'; };
export const horaLima = (ahora = Date.now()) => new Date(ahora - 5 * 3600 * 1000).getUTCHours();

/**
 * Pasos de bienvenida. El primero («Llegaste a la Galaxy») ya viene hecho: es el truco del progreso regalado (empezar en 1/N motiva más que en 0/N).
 * ctx: { sesion:boolean, foto:boolean, club:boolean, clan:boolean, jugo:boolean }
 */
export function pasosBienvenida(ctx = {}) {
  const c = ctx ?? {};
  return [
    { id: 'llegar', titulo: 'Llegaste a la Galaxy', ayuda: 'Primer paso hecho.', hecho: true },
    { id: 'cuenta', titulo: 'Crea tu cuenta', ayuda: 'Gratis, en 1 minuto.', hecho: !!c.sesion, href: null, accion: 'registro' },
    { id: 'foto', titulo: 'Elige tu foto', ayuda: 'Que te reconozcan.', hecho: !!c.sesion && !!c.foto, href: 'perfil/' },
    { id: 'club', titulo: 'Ficha tu club favorito', ayuda: 'Aparece en tu perfil.', hecho: !!c.sesion && !!c.club, href: 'perfil/' },
    { id: 'duelo', titulo: 'Juega tu primer duelo', ayuda: 'Gana tus primeros tokens.', hecho: !!c.jugo, href: 'duelos/' },
    { id: 'clan', titulo: 'Únete a un clan', ayuda: 'Juega en equipo.', hecho: !!c.clan, href: 'clanes/' },
  ];
}
export const porcentajePasos = (pasos) => { const l = Array.isArray(pasos) ? pasos : []; return l.length ? Math.round((l.filter((p) => p.hecho).length / l.length) * 100) : 0; };
export const siguientePaso = (pasos) => (Array.isArray(pasos) ? pasos : []).find((p) => !p.hecho) ?? null;

/** Largo del arco de un anillo de progreso (SVG): circunferencia · (1 − pct). */
export const arcoAnillo = (pct, radio = 28) => { const c = 2 * Math.PI * radio, p = Math.min(100, Math.max(0, Number(pct) || 0)); return { total: Math.round(c * 100) / 100, falta: Math.round(c * (1 - p / 100) * 100) / 100 }; };
