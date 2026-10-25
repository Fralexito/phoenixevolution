// Estado de los hosts — lógica PURA (sin DOM → `npm test`). Datos de la RPC hosts_estado (migración 146).
// Blindaje: estados desconocidos → «desconectado»; fechas inválidas → «sin datos»; ping solo si es número; nunca lanza.

export const ESTADOS = {
  sala_abierta: { texto: 'Sala abierta', icono: 'fa-door-open', clase: 'text-ok border-ok/50 bg-ok/10', orden: 0 },
  en_partida: { texto: 'En partida', icono: 'fa-futbol', clase: 'text-amber-300 border-amber-400/40 bg-amber-400/10', orden: 1 },
  conectado: { texto: 'Encendido', icono: 'fa-plug', clase: 'text-galaxy-400 border-galaxy-400/40 bg-galaxy-400/10', orden: 2 },
  desconectado: { texto: 'Apagado', icono: 'fa-power-off', clase: 'text-gray-400 border-galaxy-border', orden: 3 },
};
export const estadoDe = (e) => ESTADOS[e] ?? ESTADOS.desconectado;

/** Ping → semáforo simple (mismos cortes que la guía de Smash Soda: < 60 bien, < 110 regular, más = malo). */
export function nivelPing(ms) {
  if (!Number.isFinite(ms) || ms < 0) return { nivel: 'sin', texto: 'Sin datos de ping' };
  if (ms < 60) return { nivel: 'bien', texto: `${Math.round(ms)} ms · bien` };
  if (ms < 110) return { nivel: 'regular', texto: `${Math.round(ms)} ms · regular` };
  return { nivel: 'malo', texto: `${Math.round(ms)} ms · alto` };
}

/** «hace 10 min», «hace 3 h», «hace 2 días». */
export function haceCuanto(iso, ahora = new Date()) {
  const t = new Date(iso ?? NaN).getTime();
  if (Number.isNaN(t)) return 'sin datos';
  const min = Math.max(0, Math.round((new Date(ahora).getTime() - t) / 60e3));
  if (min < 5) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** Normaliza y ordena la lista; devuelve también el resumen para la cabecera. */
export function prepararHosts(respuesta) {
  const lista = (Array.isArray(respuesta?.hosts) ? respuesta.hosts : [])
    .filter((h) => h && h.host && h.host.id)
    .map((h) => ({ ...h, estado: ESTADOS[h.estado] ? h.estado : 'desconectado', ping_ms: Number.isFinite(h.ping_ms) ? h.ping_ms : null }));
  lista.sort((a, b) => estadoDe(a.estado).orden - estadoDe(b.estado).orden || (new Date(b.visto ?? 0) - new Date(a.visto ?? 0)));
  const encendidos = lista.filter((h) => h.estado !== 'desconectado').length;
  const conSala = lista.filter((h) => h.estado === 'sala_abierta').length;
  return { lista, encendidos, conSala, total: lista.length };
}

export function resumenTexto({ encendidos, conSala, total }) {
  if (!total) return 'Aún no hay hosts con Phoenix Link.';
  if (!encendidos) return `Ningún host encendido ahora (${total} en total).`;
  return `${encendidos} de ${total} encendidos${conSala ? ` · ${conSala} con sala abierta` : ''}.`;
}
