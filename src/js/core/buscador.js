// Buscador global — parte PURA: índice de páginas y puntuación (sin DOM → probable). La ventana vive en features/buscadorGlobal.js.
import { NAV, NAV_EXTRA, ACCOUNT_NAV } from '../../data/site.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Palabras que la gente usaría para pedir cada página aunque no se llame así.
const SINONIMOS = {
  central: 'inicio portada principal home', duelos: 'jugar partida reto rival matchmaking host parsec', partidos: 'resultados historial valorar', envivo: 'streaming transmitir directo kick',
  eventos: 'torneo quedada calendario', liga: 'tabla posiciones clasificacion calendario fixture', palmares: 'campeones titulos historia',
  mercado: 'fichajes transferencias traspasos', database: 'jugadores fichas cartas comparar stats', comunidad: 'muro social radar',
  noticias: 'novedades prensa articulos', clanes: 'equipo grupo tag', ranking: 'mejores top temporada retos semanales', amigos: 'solicitudes seguir bloquear',
  mensajes: 'chat privado grupos dm', buscar: 'encontrar personas publicaciones', tienda: 'tokens comprar cosmeticos marcos titulos xp nivel',
  logros: 'medallas insignias', guardados: 'favoritos marcadores', ajustes: 'configuracion preferencias tema zoom', muro: 'perfil publicaciones', perfil: 'cuenta avatar foto',
  competiciones: 'ligas modos copas divisiones', historial: 'partidos resultados pasados archivo goles', unirme: 'entrar registrarme empezar guia parsec',
  moderacion: 'reportes sanciones staff', auditoria: 'registro cambios staff',
};

/** Todas las páginas buscables: las del menú, las secundarias y las de «Mi cuenta» (solo enlaces). Sin repetir. */
export function indicePaginas() {
  const vistos = new Set(), l = [];
  const meter = (p, seccion, info) => { if (!p.path && p.id !== 'central') return; if (vistos.has(p.id)) return; vistos.add(p.id); l.push({ id: p.id, label: p.label, path: p.path, icon: p.icon, staff: p.staff, seccion, info: p.staff ? 'Solo para el equipo' : info }); };
  for (const p of NAV) meter(p, 'Menú', 'Página principal');
  for (const p of NAV_EXTRA) meter(p, 'Más', 'Sección de la comunidad');
  for (const p of ACCOUNT_NAV) meter(p, 'Mi cuenta', 'Tu cuenta');
  return l.map((p) => ({ ...p, _t: norm(`${p.label} ${p.info ?? ''} ${SINONIMOS[p.id] ?? ''}`), _l: norm(p.label) }));
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
