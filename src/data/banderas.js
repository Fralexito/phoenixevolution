// BANDERAS de los países del perfil (19-oct-2026, Fralex: «que los países estén en una lista desplegable con sus banderas»).
// Dibujadas aquí en SVG (sin descargar imágenes y sin depender de emojis, que Windows no muestra como bandera). Son versiones
// SIMPLIFICADAS: colores y formas de cada bandera, sin escudos ni detalles finos. Para un país nuevo: una entrada en DIBUJOS.
const E = (cx, cy, r, color) => {   // estrella de 5 puntas
  const p = []; for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); }
  return `<polygon points="${p.join(' ')}" fill="${color}"/>`;
};
const H = (...c) => c.map((col, i, a) => `<rect y="${(20 / a.length) * i}" width="30" height="${(20 / a.length) + 0.05}" fill="${col}"/>`).join('');   // franjas horizontales
const V = (...c) => c.map((col, i, a) => `<rect x="${(30 / a.length) * i}" width="${(30 / a.length) + 0.05}" height="20" fill="${col}"/>`).join('');   // franjas verticales
const rayas = (n, a, b) => Array.from({ length: n }, (_, i) => `<rect y="${(20 / n) * i}" width="30" height="${(20 / n) + 0.05}" fill="${i % 2 ? b : a}"/>`).join('');

const DIBUJOS = {
  PE: V('#D91023', '#fff', '#D91023'),
  AR: H('#74ACDF', '#fff', '#74ACDF') + '<circle cx="15" cy="10" r="2.2" fill="#F6B40E"/>',
  BO: H('#D52B1E', '#F9E300', '#007934'),
  BR: '<rect width="30" height="20" fill="#009C3B"/><polygon points="15,2.5 27.5,10 15,17.5 2.5,10" fill="#FFDF00"/><circle cx="15" cy="10" r="4.2" fill="#002776"/><path d="M11 9.3c2.8-.6 5.6-.2 8 1" stroke="#fff" stroke-width=".8" fill="none"/>',
  CL: '<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#D52B1E"/><rect width="10" height="10" fill="#0039A6"/>' + E(5, 5, 2.6, '#fff'),
  CO: '<rect width="30" height="10" fill="#FCD116"/><rect y="10" width="30" height="5" fill="#003893"/><rect y="15" width="30" height="5" fill="#CE1126"/>',
  CR: '<rect width="30" height="20" fill="#002B7F"/><rect y="3.33" width="30" height="13.34" fill="#fff"/><rect y="6.67" width="30" height="6.66" fill="#CE1126"/>',
  CU: rayas(5, '#002A8F', '#fff') + '<polygon points="0,0 13,10 0,20" fill="#CF142B"/>' + E(4.6, 10, 2.4, '#fff'),
  EC: '<rect width="30" height="10" fill="#FFDD00"/><rect y="10" width="30" height="5" fill="#034EA2"/><rect y="15" width="30" height="5" fill="#ED1C24"/><circle cx="15" cy="10" r="2.6" fill="#8a6d3b" opacity=".85"/>',
  SV: H('#0F47AF', '#fff', '#0F47AF') + '<circle cx="15" cy="10" r="1.8" fill="#C1A55B"/>',
  ES: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
  US: rayas(13, '#B22234', '#fff') + '<rect width="13" height="10.77" fill="#3C3B6E"/>' + [2.2, 5.5, 8.8].flatMap((y) => [2.2, 5.3, 8.4, 11].map((x) => `<circle cx="${x}" cy="${y}" r=".55" fill="#fff"/>`)).join(''),
  GT: V('#4997D0', '#fff', '#4997D0') + '<circle cx="15" cy="10" r="2" fill="#6ab04c" opacity=".8"/>',
  HN: H('#0073CF', '#fff', '#0073CF') + [[15, 10], [11.5, 8.6], [18.5, 8.6], [11.5, 11.4], [18.5, 11.4]].map(([x, y]) => E(x, y, 0.9, '#0073CF')).join(''),
  MX: V('#006847', '#fff', '#CE1126') + '<circle cx="15" cy="10" r="2.1" fill="#8B5A2B" opacity=".85"/>',
  NI: H('#0067C6', '#fff', '#0067C6') + '<circle cx="15" cy="10" r="1.9" fill="none" stroke="#C8A44A" stroke-width=".7"/>',
  PA: '<rect width="30" height="20" fill="#fff"/><rect x="15" width="15" height="10" fill="#DA121A"/><rect y="10" width="15" height="10" fill="#072357"/>' + E(7.5, 5, 2.2, '#072357') + E(22.5, 15, 2.2, '#DA121A'),
  PY: H('#D52B1E', '#fff', '#0038A8') + '<circle cx="15" cy="10" r="1.6" fill="none" stroke="#0038A8" stroke-width=".6"/>',
  DO: '<rect width="30" height="20" fill="#fff"/><rect width="13" height="8" fill="#002D62"/><rect x="17" width="13" height="8" fill="#CE1126"/><rect y="12" width="13" height="8" fill="#CE1126"/><rect x="17" y="12" width="13" height="8" fill="#002D62"/>',
  UY: rayas(9, '#fff', '#0038A8') + '<rect width="11.1" height="11.1" fill="#fff"/><circle cx="5.55" cy="5.55" r="2.6" fill="#FCD116"/>',
  VE: H('#FFCC00', '#00247D', '#CF142B') + [8, 10, 12.3, 15, 17.7, 20, 22].map((x, i) => `<circle cx="${x}" cy="${[11.5, 9.6, 8.5, 8.1, 8.5, 9.6, 11.5][i]}" r=".55" fill="#fff"/>`).join(''),
  PR: rayas(5, '#ED0000', '#fff') + '<polygon points="0,0 13,10 0,20" fill="#0050F0"/>' + E(4.6, 10, 2.4, '#fff'),
  XX: '<rect width="30" height="20" fill="#1e1b4b"/><circle cx="15" cy="10" r="6" fill="none" stroke="#7dd3fc" stroke-width="1"/><ellipse cx="15" cy="10" rx="2.6" ry="6" fill="none" stroke="#7dd3fc" stroke-width=".8"/><line x1="9" y1="10" x2="21" y2="10" stroke="#7dd3fc" stroke-width=".8"/>',
};

/** SVG de la bandera (30×20). `clase` se añade al <svg>. País desconocido → la de «Otro». */
export function banderaSVG(codigo, clase = 'bandera') {
  const d = DIBUJOS[String(codigo ?? '').toUpperCase()] ?? DIBUJOS.XX;
  return `<svg class="${clase}" viewBox="0 0 30 20" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><g>${d}</g></svg>`;
}
export const tieneBandera = (codigo) => Object.hasOwn(DIBUJOS, String(codigo ?? '').toUpperCase());
