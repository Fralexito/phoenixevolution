// MI CLUB UNIFICADO (ronda 280, FX.clubUnificado). Pedido de Fralex: Liga Máster y Mi club eran dos páginas para lo mismo (tu club).
// En /manager/ hay dos modos: «Carrera de DT» (manager.js) y «Vestuario del juego» (miClub.js + buzon.js, antes en /mi-club/).
// El modo se recuerda en la dirección: #vestuario abre el vestuario; las pestañas de la carrera usan #plantilla, #mercado…
import { FX } from '../../data/experimento.js';

if (FX.clubUnificado && document.getElementById('cu-vestuario')) {
  import('../pages/miClub.js'); import('./buzon.js');
  const botones = [...document.querySelectorAll('[data-modo]')];
  const poner = (modo, empujar = false) => {
    botones.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modo === modo)));
    document.getElementById('cu-carrera').hidden = modo !== 'carrera';
    document.getElementById('cu-vestuario').hidden = modo !== 'vestuario';
    if (empujar) history.replaceState(null, '', modo === 'vestuario' ? '#vestuario' : location.pathname + location.search);
  };
  poner(location.hash === '#vestuario' ? 'vestuario' : 'carrera');
  botones.forEach((b) => b.addEventListener('click', () => poner(b.dataset.modo, true)));
  addEventListener('hashchange', () => { if (location.hash === '#vestuario') poner('vestuario'); else if (location.hash) poner('carrera'); });
}
