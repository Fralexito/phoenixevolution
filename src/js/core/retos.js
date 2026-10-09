// Retos diarios, ruleta de reglas y noches temáticas (puro → con test). Los datos están en data/modalidades.js.
import { mezclar } from './formatos.js';

/** Número de día desde 1970 en hora de Perú (UTC-5), para que el reto cambie a medianoche peruana. */
export function diaPeru(fecha = new Date()) { return Math.floor((fecha.getTime() - 5 * 3600 * 1000) / 86400000); }

/** Reto del día: el mismo para todos durante el día. */
export function retoDelDia(retos, fecha = new Date()) {
  if (!Array.isArray(retos) || !retos.length) return null;
  return retos[((diaPeru(fecha) % retos.length) + retos.length) % retos.length];
}

/** Reto semanal: cambia cada lunes (hora Perú). Usa los retos en otro orden fijo para no repetir el del día. */
export function retoSemanal(retos, fecha = new Date()) {
  if (!Array.isArray(retos) || !retos.length) return null;
  const semana = Math.floor((diaPeru(fecha) + 3) / 7);
  return mezclar(retos, 2026)[((semana % retos.length) + retos.length) % retos.length];
}

/** Gira la ruleta: devuelve `cantidad` reglas distintas según la semilla. */
export function girarRuleta(reglas, semilla = Date.now(), cantidad = 1) {
  if (!Array.isArray(reglas) || !reglas.length) return [];
  return mezclar(reglas, semilla).slice(0, Math.max(1, Math.min(cantidad, reglas.length)));
}

/** Noche temática de la semana (rota cada semana). */
export function nocheTematica(noches, fecha = new Date()) {
  if (!Array.isArray(noches) || !noches.length) return null;
  const semana = Math.floor((diaPeru(fecha) + 3) / 7);
  return noches[((semana % noches.length) + noches.length) % noches.length];
}
