// MI CLUB · «EL ESTADIO» (19-oct-2026). Fralex: «Mi club es lo más exclusivo que tengo… merece todo un ecosistema diferente… que se disfrute entrar».
// Lo que hace (solo presentación; la lógica sigue en manager.js y clubUnificado.js):
//   · la barra propia de Mi club marca la sección activa según la dirección (#resumen, #vestuario, #plantilla…);
//   · las pestañas que necesitan club (Plantilla, Fichajes, Diario) solo salen si ya diriges uno;
//   · número de ofertas recibidas pendientes en «Fichajes» (#oficina, de enlaces viejos, abre Fichajes);
//   · la guía «Cómo funciona Mi club» y su botón «?»;
//   · la pastilla dorada que se desliza bajo la pestaña activa y las tarjetas que se inclinan hacia el mouse;
//   · «Administrar la liga» (#admin) solo para el staff;
//   · el estadio se tiñe con el color del escudo de tu club (se calcula del propio escudo, sin datos nuevos);
//   · la tarjeta «Tu PES» del Resumen sigue en vivo el estado de Phoenix Sync.
const raiz = document.querySelector('[data-mcx]');
const dock = document.querySelector('[data-mcx-dock]');

if (raiz && dock) {
  const enlaces = [...dock.querySelectorAll('[data-mcx]')];
  const ALIAS = { oficina: 'mercado' };   // las ofertas viven dentro de Fichajes
  const activo = () => { const h = ALIAS[location.hash.slice(1)] ?? location.hash.slice(1); return enlaces.some((a) => a.dataset.mcx === h) ? h : 'resumen'; };
  // Indicador dorado que se DESLIZA hasta la pestaña activa (19-oct-2026, Fralex: «todo interactivo y muy visual»).
  const pastilla = document.createElement('span'); pastilla.className = 'mcx-dock-pastilla'; pastilla.setAttribute('aria-hidden', 'true'); dock.prepend(pastilla);
  const moverPastilla = () => {
    const a = dock.querySelector('[aria-current="page"]');
    if (!a || !a.offsetWidth) { pastilla.style.opacity = '0'; return; }
    pastilla.style.opacity = '1'; pastilla.style.width = `${a.offsetWidth}px`; pastilla.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const marcar = () => {
    const id = activo();
    for (const a of enlaces) { if (a.dataset.mcx === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    const antes = raiz.dataset.seccion; raiz.dataset.seccion = id;
    if (antes && antes !== id) { raiz.removeAttribute('data-entra'); void raiz.offsetWidth; raiz.dataset.entra = ''; }   // la sección nueva entra con un desliz corto
    moverPastilla();
    // La pestaña activa a la vista dentro de la barra (en celular la barra se desliza de lado).
    dock.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };
  new ResizeObserver(moverPastilla).observe(dock);
  document.fonts?.ready.then(moverPastilla);
  marcar();
  addEventListener('hashchange', marcar);
  // clubUnificado.js cambia a #vestuario con replaceState (no avisa con hashchange): se vuelve a marcar tras cada clic en la barra.
  dock.addEventListener('click', () => setTimeout(marcar, 0));

  // Con o sin club (manager.js avisa al terminar de cargar).
  addEventListener('mg:refrescado', (e) => {
    const conClub = !!e.detail?.miClub; raiz.dataset.conClub = String(conClub); raiz.dataset.staff = String(!!e.detail?.staff);
    if (!conClub && enlaces.some((a) => a.hasAttribute('data-mcx-club') && a.dataset.mcx === activo())) history.replaceState(null, '', '#resumen');
    if (!e.detail?.staff && activo() === 'admin') history.replaceState(null, '', '#resumen');
    marcar();
    teñir();
  });

  // Guía «Cómo funciona Mi club»: «Entendido» la oculta (se recuerda en este navegador); el «?» de la barra la vuelve a abrir.
  const KEY_GUIA = 'pes-mcx-guia';
  try { if (localStorage.getItem(KEY_GUIA) === 'oculta') raiz.dataset.guia = 'oculta'; } catch { /* sin almacenamiento: se ve */ }
  raiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-mcx-guia-cerrar]')) { raiz.dataset.guia = 'oculta'; try { localStorage.setItem(KEY_GUIA, 'oculta'); } catch { /* no se recuerda */ } }
    if (e.target.closest('[data-mcx-guia-abrir]')) {
      delete raiz.dataset.guia; try { localStorage.removeItem(KEY_GUIA); } catch { /* nada */ }
      if (raiz.dataset.conClub === 'true' && activo() !== 'resumen') location.hash = '#resumen';
      requestAnimationFrame(() => document.querySelector('[data-mcx-guia]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  });

  // Ofertas recibidas pendientes (las cuenta el Resumen).
  addEventListener('mcx:ofertas', (e) => {
    const b = dock.querySelector('[data-mcx-ofertas]'); const n = Number(e.detail?.recibidas) || 0;
    if (b) { b.hidden = !n; b.textContent = String(n); }
  });

  // Color del club: promedio de los píxeles con color del escudo (los grises y transparentes no cuentan).
  let ultimo = '';
  function teñir() {
    const img = document.querySelector('[data-mcx-escudo]'); if (!img) { raiz.style.removeProperty('--club'); ultimo = ''; return; }
    if (img.src === ultimo) return;
    const leer = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data;
        let r = 0, v = 0, a = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 200) continue; const max = Math.max(d[i], d[i + 1], d[i + 2]); const min = Math.min(d[i], d[i + 1], d[i + 2]);
          if (max - min < 40 || max < 60) continue;   // grises, blancos y negros fuera: queremos el color del club
          r += d[i]; v += d[i + 1]; a += d[i + 2]; n += 1;
        }
        if (!n) return;
        raiz.style.setProperty('--club', `rgb(${Math.round(r / n)} ${Math.round(v / n)} ${Math.round(a / n)})`); ultimo = img.src;
      } catch { /* escudo de otro origen: el estadio se queda con su color de siempre */ }
    };
    if (img.complete && img.naturalWidth) leer(); else img.addEventListener('load', leer, { once: true });
  }
  new MutationObserver(teñir).observe(document.getElementById('mg-club') ?? raiz, { childList: true, subtree: true });

  // Tarjetas que responden al mouse: se inclinan hacia el puntero con un poco de inercia y se hunden al pulsar.
  // Solo con mouse (en el celular el dedo no «pasa por encima») y sin «menos movimiento». Se toca solo el transform de esa tarjeta.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const SEL = '.mcx-b, .mg-carta, .mcx-ficha, .mg-club-op';
    let el = null; let obj = { x: 0, y: 0, s: 1 }; let act = { x: 0, y: 0, s: 1 }; let raf = 0;
    const paso = () => {
      act = { x: act.x + (obj.x - act.x) * 0.18, y: act.y + (obj.y - act.y) * 0.18, s: act.s + (obj.s - act.s) * 0.3 };
      if (el) el.style.transform = `perspective(700px) rotateX(${act.y.toFixed(2)}deg) rotateY(${act.x.toFixed(2)}deg) scale(${act.s.toFixed(3)})`;
      const quieto = Math.abs(obj.x - act.x) < 0.02 && Math.abs(obj.y - act.y) < 0.02 && Math.abs(obj.s - act.s) < 0.001;
      if (!quieto) raf = requestAnimationFrame(paso); else { raf = 0; if (el && !obj.x && !obj.y && obj.s === 1) { el.style.transform = ''; el.classList.remove('mcx-inclina'); el = null; } }
    };
    const correr = () => { if (!raf) raf = requestAnimationFrame(paso); };
    raiz.addEventListener('pointermove', (e) => {
      const t = e.target.closest(SEL);
      if (t !== el) { if (!t) { obj = { x: 0, y: 0, s: 1 }; correr(); return; } if (el) { el.style.transform = ''; el.classList.remove('mcx-inclina'); } el = t; act = { x: 0, y: 0, s: 1 }; obj = { x: 0, y: 0, s: 1 }; if (!el) return; el.classList.add('mcx-inclina'); }
      const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
      const fuerza = el.matches('.mcx-b') ? 4 : 8;   // las tarjetas grandes del Resumen, más sutiles
      obj.x = (px - 0.5) * fuerza; obj.y = (0.5 - py) * fuerza;
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`); el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      correr();
    });
    raiz.addEventListener('pointerleave', () => { obj = { x: 0, y: 0, s: 1 }; correr(); });
    raiz.addEventListener('pointerout', (e) => { if (el && !el.contains(e.relatedTarget)) { obj = { x: 0, y: 0, s: 1 }; correr(); } });
    raiz.addEventListener('pointerdown', (e) => { if (el && e.target.closest(SEL) === el) { obj.s = 0.97; correr(); } });
    addEventListener('pointerup', () => { if (el) { obj.s = 1; correr(); } });
  }

  // «Tu PES» en el Resumen sigue a Phoenix Sync (clubUnificado/miClub cambian data-estado de #mc-estado).
  const estado = document.getElementById('mc-estado');
  const TXT = { on: ['Juego conectado', 'Phoenix Sync aplica tus cambios en tu partida.'], off: ['Juego sin conectar', 'Abre Phoenix Sync en tu PC para llevar tus cambios al PES.'], out: ['Conecta tu PES', 'Con Phoenix Sync, lo que hagas aquí llega a tu partida.'] };
  if (estado) new MutationObserver(() => {
    const s = estado.dataset.estado ?? 'out'; const card = document.querySelector('.mcx-b-juego'); if (!card) return;
    const [t, sub] = TXT[s] ?? TXT.out; card.dataset.sync = s;
    const g = card.querySelector('.mcx-b-estado'); if (g) g.innerHTML = `<i class="mcx-punto" aria-hidden="true"></i>${t}`;
    const p = card.querySelector('.mcx-b-sub'); if (p) p.textContent = sub;
  }).observe(estado, { attributes: true, attributeFilter: ['data-estado'] });
}
