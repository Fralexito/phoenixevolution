// Pre-chequeo del jugador en el navegador + historial del par host↔jugador (módulo 2 · justicia).
// Esquema: este archivo (red) → core/conexion.js (cálculos puros). SIN interfaz a propósito: la pantalla se conecta tras el rediseño.
//
// Por qué es una ESTIMACIÓN: un navegador no puede hacer ping a la PC del host (no hay ICMP ni UDP crudo). Medimos ida y vuelta
// HTTP contra GET /v1/eco (Edge Function de Supabase): refleja la calidad de TU internet (latencia base y estabilidad), no el
// camino exacto hasta el host. Lo exacto llega después con la «prueba en sala» que hace la app por Parsec.
import { supabase } from '../../core/supabase.js';
import { SUPABASE_URL } from '../../core/config.js';
import { estadisticas, semaforo, umbralesDe } from '../../core/conexion.js';

export const URL_ECO = `${SUPABASE_URL}/functions/v1/phoenix/v1/eco`;
const REFERENCIA = 'supabase-edge:/v1/eco';

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una medición de ida y vuelta en ms (o null si superó el tiempo límite o falló). Prefiere Resource Timing (no cuenta la cola del navegador). */
async function medirUna(url, limiteMs) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), limiteMs);
  const marca = `${url}?m=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const t0 = performance.now();
  try {
    const r = await fetch(marca, { cache: 'no-store', signal: ctl.signal, credentials: 'omit' });
    await r.arrayBuffer();
    const bruto = performance.now() - t0;
    if (!r.ok) return null;
    const e = performance.getEntriesByName(marca).pop();
    // requestStart→responseStart = ida y vuelta de red sin DNS/TLS/cola (solo si el servidor manda Timing-Allow-Origin).
    const fino = e && e.responseStart > 0 && e.requestStart > 0 ? e.responseStart - e.requestStart : null;
    return Math.max(0, fino ?? bruto);
  } catch {
    return null;                                   // timeout o red caída = muestra perdida
  } finally { clearTimeout(t); }
}

/**
 * Mide latencia y jitter. `alAvanzar({ hechas, total, ultima })` permite pintar progreso en vivo.
 * Descarta las primeras `calentamiento` (abren la conexión y arrancan la función en frío).
 */
export async function medirPrechequeo({ muestras = 12, calentamiento = 2, intervaloMs = 200, limiteMs = 2500, reglas = null, alAvanzar } = {}) {
  const valores = [];
  try {
    for (let i = 0; i < calentamiento; i++) await medirUna(URL_ECO, limiteMs);
    for (let i = 0; i < muestras; i++) {
      const ms = await medirUna(URL_ECO, limiteMs);
      valores.push(ms === null ? null : Math.round(ms * 10) / 10);
      try { alAvanzar?.({ hechas: i + 1, total: muestras, ultima: ms }); } catch (e) { console.warn('[prechequeo] alAvanzar:', e); }
      if (i < muestras - 1) await pausa(intervaloMs);
    }
  } finally {
    try { performance.clearResourceTimings(); } catch { /* no pasa nada */ }
  }
  const est = estadisticas(valores);
  return { ...est, valores, referencia: REFERENCIA,
           semaforo_local: semaforo(umbralesDe(reglas), { ping: est.mediana_ms, jitter: est.jitter_ms, perdida: est.perdida_pct }) };
}

/** Guarda el resultado (requiere sesión). Devuelve { id, semaforo, umbrales } calculados por la base: ese es el semáforo que vale. */
export async function guardarPrechequeo(res, salaId = null) {
  const { data, error } = await supabase.rpc('guardar_prechequeo', {
    p_latencia: res.mediana_ms, p_jitter: res.jitter_ms, p_perdida: res.perdida_pct, p_muestras: Math.max(1, res.enviadas || 1),
    p_referencia: res.referencia, p_sala: salaId, p_detalles: { p95_ms: res.p95_ms, valores: res.valores?.slice(0, 50) ?? [] },
  });
  if (error) { console.warn('[prechequeo] guardar:', error.message); throw error; }
  return data;
}

/** Historial real del par host↔jugador (mediana/p95/pérdida de muestras de la app + pruebas en sala) y su semáforo. */
export async function historialPar(hostId, jugadorId = null, perfil = 'amistoso') {
  const { data, error } = await supabase.rpc('historial_ping_par', { p_host: hostId, p_jugador: jugadorId, p_perfil: perfil });
  if (error) { console.warn('[prechequeo] historial:', error.message); throw error; }
  return data;
}

/** Pruebas en sala que llegan en vivo para este jugador (Realtime). Devuelve una función para dejar de escuchar. */
export function escucharPruebasSala(usuarioId, alLlegar) {
  try {
    const canal = supabase.channel(`pruebas-${usuarioId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pruebas_conexion', filter: `usuario=eq.${usuarioId}` }, (p) => {
        if (p.new?.tipo === 'prueba_sala') { try { alLlegar(p.new); } catch (e) { console.warn('[prechequeo] alLlegar:', e); } }
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  } catch (e) {
    console.warn('[prechequeo] realtime:', e);
    return () => {};
  }
}
