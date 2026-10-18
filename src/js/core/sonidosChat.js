// SONIDOS DE CHAT — catálogo PURO (sin navegador ni audio; se prueba en Node). Contrato completo: docs/comunidad/CONTRATO-SONIDOS-CHAT.md.
// La clave del catálogo es la MISMA que guarda la tienda en tienda_items.estilo.sonido (migración 121) y la que Link usará para elegir el archivo.
// Cada sonido se describe como una «partitura» corta (tonos): la web la sintetiza con WebAudio (sin archivos) y Link podrá generarla como .wav idéntico.
// tipo: 'sine' | 'triangle' | 'square' | 'ruido' · t = inicio (ms) · dur = duración (ms) · f/f2 = frecuencia inicial/final (Hz; en 'ruido' f es el centro del filtro) · vol = 0..1

export const MAX_DURACION_MS = 1500;   // ningún sonido de chat dura más (evita molestar y tapar el juego)
export const VOLUMEN_BASE = 0.5;       // volumen general sugerido (0..1) antes de aplicar el de cada sonido

export const SONIDOS_CHAT = Object.freeze({
  snd_campana_cristal: { etiqueta: 'Campana de cristal', cooldownS: 3, volumen: 0.8, tonos: [
    { t: 0, dur: 450, f: 1318, tipo: 'sine', vol: 0.5 }, { t: 90, dur: 650, f: 1976, tipo: 'sine', vol: 0.35 }] },
  snd_pop_burbuja: { etiqueta: 'Pop de burbuja', cooldownS: 2, volumen: 0.9, tonos: [
    { t: 0, dur: 110, f: 380, f2: 900, tipo: 'sine', vol: 0.6 }] },
  snd_moneda_dorada: { etiqueta: 'Moneda dorada', cooldownS: 3, volumen: 0.7, tonos: [
    { t: 0, dur: 70, f: 988, tipo: 'square', vol: 0.22 }, { t: 70, dur: 420, f: 1319, tipo: 'square', vol: 0.22 }] },
  snd_gol_estadio: { etiqueta: 'Gol de estadio', cooldownS: 6, volumen: 0.6, tonos: [
    { t: 0, dur: 1100, f: 700, tipo: 'ruido', vol: 0.5 }, { t: 0, dur: 900, f: 220, f2: 330, tipo: 'triangle', vol: 0.3 }] },
});
export const CLAVES_SONIDO = Object.freeze(Object.keys(SONIDOS_CHAT));

/** ¿Es una clave del catálogo? (lista blanca: igual que private.estilo_valido en la base) */
export const esSonidoChat = (clave) => typeof clave === 'string' && Object.hasOwn(SONIDOS_CHAT, clave);

/** Duración total de un sonido en ms (lo que termina más tarde). */
export const duracionDe = (clave) => (esSonidoChat(clave) ? Math.max(...SONIDOS_CHAT[clave].tonos.map((n) => n.t + n.dur)) : 0);

/** Metadatos públicos de un sonido (lo que Link recibiría): {clave, etiqueta, duracionMs, cooldownS, volumen, archivo} o null. */
export function metadatosDe(clave) {
  if (!esSonidoChat(clave)) return null;
  const s = SONIDOS_CHAT[clave];
  return { clave, etiqueta: s.etiqueta, duracionMs: duracionDe(clave), cooldownS: s.cooldownS, volumen: s.volumen, archivo: `${clave}.wav` };
}

/** Catálogo completo en forma de lista para publicar (por ejemplo, en un JSON para Link). */
export const catalogoSonidos = () => CLAVES_SONIDO.map(metadatosDe);

/** Partitura validada y recortada a límites seguros (frecuencias 50–8000 Hz, volumen 0–1, nada más largo que MAX_DURACION_MS). [] si la clave no existe. */
export function partituraDe(clave) {
  if (!esSonidoChat(clave)) return [];
  const lim = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
  return SONIDOS_CHAT[clave].tonos.map((n) => {
    const t = lim(n.t, 0, MAX_DURACION_MS), dur = lim(n.dur, 20, MAX_DURACION_MS - t);
    return { t, dur, f: lim(n.f, 50, 8000), f2: lim(n.f2 ?? n.f, 50, 8000), tipo: ['sine', 'triangle', 'square', 'ruido'].includes(n.tipo) ? n.tipo : 'sine', vol: lim(n.vol, 0, 1) * lim(SONIDOS_CHAT[clave].volumen, 0, 1) * VOLUMEN_BASE };
  });
}
