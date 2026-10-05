// Buscador global — parte PURA: índice de páginas y puntuación (sin DOM → probable). La ventana vive en features/buscadorGlobal.js.
import { SECCIONES, ACCOUNT_NAV } from '../../data/site.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Palabras que la gente usaría para pedir cada página aunque no se llame así.
const SINONIMOS = {
  duelos: 'jugar partida reto rival matchmaking host parsec', partidos: 'resultados historial valorar', envivo: 'streaming transmitir directo kick',
  eventos: 'torneo quedada calendario', liga: 'tabla posiciones clasificacion calendario fixture', palmares: 'campeones titulos historia',
  mercado: 'fichajes transferencias traspasos', database: 'jugadores fichas cartas comparar stats', comunidad: 'muro social radar',
  noticias: 'novedades prensa articulos', clanes: 'equipo grupo tag', ranking: 'mejores top temporada retos semanales', amigos: 'solicitudes seguir bloquear',
  mensajes: 'chat privado grupos dm', buscar: 'encontrar personas publicaciones', tienda: 'tokens comprar cosmeticos marcos titulos xp nivel',
  logros: 'medallas insignias', guardados: 'favoritos marcadores', ajustes: 'configuracion preferencias tema zoom', muro: 'perfil publicaciones', perfil: 'cuenta avatar foto',
  moderacion: 'reportes sanciones staff', auditoria: 'registro cambios staff',
};

/** Todas las páginas buscables: de las secciones, de «Mi cuenta» (solo enlaces) y la portada. */
export function indicePaginas() {
  const l = [{ id: 'central', label: 'Inicio', path: '', icon: 'fa-house', info: 'La portada', seccion: 'Inicio' }];
  for (const s of SECCIONES) {
    if (s.id === 'tienda') l.push({ id: 'tienda', label: 'Tienda', path: s.path, icon: s.icon, info: 'Cosméticos que se compran con tokens', seccion: 'Tienda' });
    for (const i of s.items) l.push({ ...i, seccion: s.label });
  }
  for (const a of ACCOUNT_NAV) if (a.path) l.push({ id: a.id, label: a.label, path: a.path, icon: a.icon, info: a.staff ? 'Solo para el equipo' : 'Tu cuenta', seccion: 'Mi cuenta', staff: a.staff });
  return l.map((p) => ({ ...p, _t: norm(`${p.label} ${p.info ?? ''} ${p.seccion} ${SINONIMOS[p.id] ?? ''}`), _l: norm(p.label) }));
}

/** Páginas que coinciden con `q`, mejores primero. Consulta vacía → []. Cada palabra de la consulta debe aparecer (en cualquier orden). */
export function buscarPaginas(q, indice = indicePaginas(), max = 8) {
  const ps = norm(q).split(/\s+/).filter(Boolean); if (!ps.length) return [];
  return indice.map((p) => {
    if (!ps.every((w) => p._t.includes(w))) return null;
    let pts = 0; for (const w of ps) pts += p._l === w ? 10 : p._l.startsWith(w) ? 7 : p._l.includes(w) ? 5 : 2;
    return { p, pts };
  }).filter(Boolean).sort((a, b) => b.pts - a.pts || a.p.label.localeCompare(b.p.label)).slice(0, max).map((x) => x.p);
}
