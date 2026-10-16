// CHAT DE AYUDA CON IA · lógica pura (ronda 345). Sin DOM: se prueba en tests/ayudaIA.test.mjs.
// La función de servidor «ayuda-ia» es la que habla con la IA; aquí solo se prepara lo que se le manda y se traducen los errores.

export const MAX_HISTORIAL = 8;      // mensajes que se mandan (la función también recorta)
export const MAX_PREGUNTA = 600;     // caracteres por pregunta

export const SUGERENCIAS = Object.freeze([
  '¿Cómo me inscribo en la liga?',
  '¿Qué es Phoenix Link y para qué sirve?',
  '¿Cómo funciona Mi club?',
  '¿Cómo reto a alguien a un duelo?',
]);

/** Historial de la pantalla [{ rol, texto }] → lo que se manda: solo user/assistant con texto, los últimos 8, empezando por el usuario. */
export function prepararMensajes(historial) {
  const limpios = (historial ?? [])
    .filter((m) => m && (m.rol === 'user' || m.rol === 'assistant') && String(m.texto ?? '').trim())
    .map((m) => ({ rol: m.rol, texto: String(m.texto).trim().slice(0, m.rol === 'user' ? MAX_PREGUNTA : 1500) }))
    .slice(-MAX_HISTORIAL);
  while (limpios.length && limpios[0].rol !== 'user') limpios.shift();
  return limpios;
}

/** Código de error de la función → frase clara para la persona. */
export function mensajeError(codigo, extra = {}) {
  switch (codigo) {
    case 'SIN_SESION': return 'Inicia sesión para usar la ayuda con IA.';
    case 'NO_CONFIGURADO': return 'La ayuda con IA todavía no está activa. Mientras tanto, pregunta en el Chat general.';
    case 'LIMITE_USUARIO': return `Llegaste al máximo de ${extra.max ?? 15} preguntas por hoy. Mañana puedes seguir 🙂`;
    case 'LIMITE_TOTAL': return 'La ayuda con IA llegó a su límite de hoy para toda la comunidad. Vuelve mañana o pregunta en el Chat general.';
    case 'IA_NO_RESPONDE': return 'La IA no respondió esta vez. Inténtalo en un momento.';
    default: return 'No se pudo enviar la pregunta. Revisa tu conexión e inténtalo otra vez.';
  }
}
