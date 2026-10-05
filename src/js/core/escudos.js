// ESCUDOS reales de los clubes (sin DOM → probable). Una sola fuente: aquí se cambia un escudo o se añade un club.
// Las imágenes se piden a crests.football-data.org por el identificador del club. Si una imagen no carga (sin red, club sin escudo), se muestra el
// escudito genérico de siempre: nunca queda un hueco roto. Para alojarlos en la propia web, copia los PNG a /public/escudos/ y cambia BASE_URL.
import { norm } from './search.js';

const REMOTO = 'https://crests.football-data.org/';
// MODO LOCAL: cuando el flujo «Descargar escudos» (.github/workflows/escudos.yml) baja los PNG a /public/escudos/ y comprueba que están todos, pone esto en true.
// Para VOLVER a pedirlos a internet (reversible): ponlo en false.
export const ESCUDOS_LOCALES = false;
const BASE_URL = ESCUDOS_LOCALES ? `${import.meta.env?.BASE_URL ?? '/'}escudos/` : REMOTO;
/** Identificadores de los escudos conocidos (los usa el flujo que los descarga). */
const ID = {
  arsenal: 57, chelsea: 61, liverpool: 64, 'manchester city': 65, 'manchester united': 66, 'bayern munich': 5, 'fc barcelona': 81, 'real madrid': 86,
  'atletico de madrid': 78, inter: 108, 'ac milan': 98, 'paris saint germain': 524,
};
// Otras formas de escribir el mismo club (tal como aparecen en fichas, ligas y perfiles).
const ALIAS = {
  'bayern': 'bayern munich', 'bayern munchen': 'bayern munich', 'fc bayern munich': 'bayern munich', 'barcelona': 'fc barcelona', 'barca': 'fc barcelona',
  'atletico madrid': 'atletico de madrid', 'atletico': 'atletico de madrid', 'man city': 'manchester city', 'man united': 'manchester united', 'man utd': 'manchester united',
  'psg': 'paris saint germain', 'paris sg': 'paris saint germain', 'inter de milan': 'inter', 'inter milan': 'inter', 'internazionale': 'inter', 'milan': 'ac milan', 'real': 'real madrid',
};
const limpio = (c) => norm(String(c ?? '').replace(/-/g, ' ').replace(/\s+/g, ' '));

/** URL del escudo del club, o null si no lo conocemos. */
export function escudoDe(club) {
  const k = limpio(club); if (!k) return null;
  const id = ID[ALIAS[k] ?? k]; return id ? `${BASE_URL}${id}.png` : null;
}
const FALLBACK = "this.replaceWith(Object.assign(document.createElement('i'),{className:'fa-solid fa-shield-halved text-galaxy-400'}))";
/** <img> del escudo (o el escudito genérico si el club no se conoce o la imagen falla). `px` = lado en píxeles. */
export function escudoHTML(club, px = 18) {
  const u = escudoDe(club);
  if (!u) return '<i class="fa-solid fa-shield-halved text-galaxy-400"></i>';
  return `<img src="${u}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="escudo inline-block object-contain align-middle" style="width:${px}px;height:${px}px" onerror="${FALLBACK}">`;
}

/** Identificadores de los escudos conocidos (los usa el flujo que los descarga). */
export const IDS_ESCUDOS = [...new Set(Object.values(ID))];
