// Portada «4 ventanas» (FX.ventanas): qué mostrar en cada ventana. Lógica pura, sin DOM ni Supabase. Pruebas: tests/ventanas.test.mjs
// Cada elemento: { titulo, meta, escudos?: [clubA, clubB], avatar?: { url, nombre } }

const jugado = (m) => Number.isInteger(m?.gl) && Number.isInteger(m?.gv);

/** Recorta un texto a `n` caracteres sin cortar palabras (añade «…»). */
export function recortar(texto, n = 90) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const corte = t.slice(0, n + 1).lastIndexOf(' ');
  return `${t.slice(0, corte > n * 0.6 ? corte : n).trim()}…`;
}

/** Competencia: TODOS los resultados de la última fecha jugada + lo que falta de la fecha en curso (máx. `max`). */
export function itemsCompetencia(fechas, clubes = {}, max = 8) {
  const fs = (fechas ?? []).filter((f) => Array.isArray(f?.partidos));
  const ultima = [...fs].reverse().find((f) => f.partidos.some(jugado));
  const prox = fs.find((f) => f.partidos.some((m) => !jugado(m)));
  const out = [];
  for (const m of ultima?.partidos ?? []) {
    if (jugado(m)) out.push({ titulo: `${m.l} ${m.gl} – ${m.gv} ${m.v}`, meta: `Fecha ${ultima.n} · Final`, escudos: [clubes[m.l] ?? '', clubes[m.v] ?? ''] });
  }
  for (const m of prox?.partidos ?? []) {
    if (!jugado(m)) out.push({ titulo: `${m.l} vs ${m.v}`, meta: `Fecha ${prox.n} · Por jugar`, escudos: [clubes[m.l] ?? '', clubes[m.v] ?? ''] });
  }
  return out.slice(0, max);
}

const MODALIDAD = { amistoso: 'Amistoso', ranked: 'Ranked', '1v1': '1 vs 1' };
/** Duelos: un reto abierto («Fralex busca rival»). */
export function itemDuelo(reto, perfil) {
  const nombre = perfil?.nombre_display || perfil?.username || 'Alguien';
  const tam = reto?.tam_a && reto?.tam_b && (reto.tam_a > 1 || reto.tam_b > 1) ? `${reto.tam_a} vs ${reto.tam_b}` : null;
  const meta = [MODALIDAD[reto?.modalidad] ?? (reto?.modalidad ? String(reto.modalidad) : null), tam, reto?.plataforma].filter(Boolean).join(' · ') || 'Reto abierto';
  return { titulo: `${nombre} busca rival`, meta, avatar: { url: perfil?.avatar_url ?? null, nombre } };
}

/** Zona Social: una publicación del muro de la comunidad. */
export function itemSocial(post, hace = '') {
  const a = post?.autor ?? {};
  const nombre = a.nombre_display || a.username || 'Alguien';
  const texto = recortar(post?.texto, 80) || (post?.imagen_url ? 'Compartió una foto' : post?.video_url ? 'Compartió un video' : post?.reto ? 'Compartió un partido' : 'Publicó algo nuevo');
  return { titulo: texto, meta: [nombre, hace].filter(Boolean).join(' · '), avatar: { url: a.avatar_url ?? null, nombre } };
}

const TIPO = { compra: 'Traspaso', libre: 'Fichaje libre', liberado: 'Liberado', staff: 'Movimiento' };
/** Mi Club: un movimiento del mercado de la Liga Máster. */
export function itemFichaje(mov, jugador, clubDestino, clubOrigen) {
  const j = jugador || 'Jugador';
  const titulo = mov?.tipo === 'liberado' ? `${j} queda libre` : `${j} → ${clubDestino || 'nuevo club'}`;
  return { titulo, meta: [TIPO[mov?.tipo] ?? 'Movimiento', clubOrigen && mov?.tipo !== 'libre' ? `desde ${clubOrigen}` : null].filter(Boolean).join(' · ') };
}
