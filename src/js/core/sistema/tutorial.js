// Tutorial de bienvenida — lógica PURA (sin DOM → `npm test`). La pantalla vive en js/features/tutorial.js.
// Pedido de Fralex (25-oct-2026): «una guía interactiva de 1 minuto para quien entra por primera vez». Solo sale una vez (por
// navegador) y se puede repetir desde Configuración → Datos → «Ver el tutorial otra vez».

/** Clave del navegador donde se recuerda que ya se vio. Cambiar el número = volver a mostrarlo a todos (p. ej. si cambia mucho). */
export const CLAVE_TUTORIAL = 'pes-tutorial-v1';

/**
 * Pasos del recorrido. `donde` = selectores CSS en orden de preferencia (el primero VISIBLE gana: así sirve en PC y en celular).
 * Sin `donde` = tarjeta centrada (bienvenida y cierre). `opcional` = si no hay nada visible, el paso se salta en silencio.
 */
export const PASOS = Object.freeze([
  { id: 'hola', titulo: 'Bienvenido a Phoenix Evolution', texto: 'Te enseñamos lo principal en menos de un minuto. Puedes saltarlo cuando quieras.', icono: 'fa-hand' },
  { id: 'miclub', titulo: 'Mi club', texto: 'Lo más exclusivo: tu club de PES en la web. Ficha jugadores, mira tu plantilla con las caras del juego y llévalo a tu partida.', icono: 'fa-futbol',
    donde: ['.nav-joya', '.barra-inf .bi-joya'], opcional: true },
  { id: 'jugar', titulo: 'Jugar', texto: 'Reta a alguien a un duelo, entra a una sala en vivo por Parsec o alquila un host.', icono: 'fa-gamepad',
    donde: ['[data-pilar="jugar"] .pilar-btn', '.barra-inf a[href$="/duelos/"]'], opcional: true },
  { id: 'comunidad', titulo: 'Comunidad', texto: 'Publica, comenta, mira las Jugadas y chatea con la comunidad.', icono: 'fa-people-group',
    donde: ['[data-pilar="comunidad"] .pilar-btn', '.barra-inf a[href$="/social/"]'], opcional: true },
  { id: 'competir', titulo: 'Competiciones', texto: 'Ligas, torneos, tablas y campeones. También puedes crear tu propio torneo.', icono: 'fa-trophy',
    donde: ['[data-pilar="competir"] .pilar-btn', '#btn-menu'], opcional: true },
  { id: 'buscar', titulo: 'Buscar', texto: 'Encuentra cualquier página o jugador. En PC también con la tecla /.', icono: 'fa-magnifying-glass',
    donde: ['[data-abrir-buscador]'], opcional: true },
  { id: 'avisos', titulo: 'Tus avisos', texto: 'Aquí te llega todo: retos, resultados, respuestas y novedades.', icono: 'fa-bell',
    donde: ['#btn-notif'], opcional: true },
  { id: 'fin', titulo: '¡Listo!', texto: 'Ya conoces lo principal. Puedes repetir este recorrido en Configuración → Datos.', icono: 'fa-flag-checkered' },
]);

/**
 * Pasos que se pueden mostrar ahora: los centrados siempre; los demás solo si hay un elemento visible.
 * @param {typeof PASOS} pasos
 * @param {(selector: string) => boolean} visible  ¿hay un elemento visible con ese selector? (lo da el DOM; en pruebas, una función)
 * @returns {{ paso: object, selector: string|null }[]}
 */
export function pasosDisponibles(pasos, visible) {
  const out = [];
  for (const paso of pasos ?? []) {
    if (!paso?.donde?.length) { out.push({ paso, selector: null }); continue; }
    let elegido = null;
    for (const sel of paso.donde) { try { if (visible(sel)) { elegido = sel; break; } } catch { /* selector raro o DOM roto: se prueba el siguiente */ } }
    if (elegido) out.push({ paso, selector: elegido });
    else if (!paso.opcional) out.push({ paso, selector: null });
  }
  // Si solo quedan los centrados (página sin menú), no vale la pena el recorrido: se deja la bienvenida y el cierre.
  return out;
}

/**
 * Dónde poner la tarjeta junto al elemento iluminado, sin salirse de la pantalla.
 * @param {{ top:number, left:number, width:number, height:number }|null} rect  rectángulo del elemento (null = centrada)
 * @param {{ width:number, height:number }} tarjeta  tamaño de la tarjeta
 * @param {{ width:number, height:number }} vista  tamaño de la ventana
 * @param {number} [margen]
 * @returns {{ top:number, left:number, lado:'abajo'|'arriba'|'centro' }}
 */
export function posicionTarjeta(rect, tarjeta, vista, margen = 12) {
  const tw = Math.min(tarjeta.width, vista.width - 2 * margen); const th = tarjeta.height;
  const centro = { top: Math.max(margen, (vista.height - th) / 2), left: Math.max(margen, (vista.width - tw) / 2), lado: 'centro' };
  if (!rect || !Number.isFinite(rect.top) || rect.width <= 0 || rect.height <= 0) return centro;
  const clampX = (x) => Math.min(Math.max(margen, x), Math.max(margen, vista.width - tw - margen));
  const left = clampX(rect.left + rect.width / 2 - tw / 2);
  const abajo = rect.top + rect.height + margen;
  if (abajo + th + margen <= vista.height) return { top: abajo, left, lado: 'abajo' };
  const arriba = rect.top - margen - th;
  if (arriba >= margen) return { top: arriba, left, lado: 'arriba' };
  return centro;   // no cabe ni arriba ni abajo (pantalla muy baja): centrada, el elemento sigue iluminado detrás
}

/** Lee lo guardado sin romperse: 'visto' | 'saltado' | null. */
export function leerEstado(valor) {
  return valor === 'visto' || valor === 'saltado' ? valor : null;
}

/** ¿Arrancar solo? Solo la primera vez, en la portada, sin otra ventana abierta y con el recorrido con algo que enseñar. */
export function debeArrancar({ estado, esPortada, hayModal, forzado }) {
  if (forzado) return true;
  return !leerEstado(estado) && Boolean(esPortada) && !hayModal;
}

/** Texto de progreso accesible. */
export const progresoTexto = (i, total) => `Paso ${i + 1} de ${total}`;
