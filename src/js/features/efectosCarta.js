// Efectos de carta de la tienda (Fase C). Las cartas que tengan data-dueno-carta="<id de la cuenta del dueño>" reciben data-efecto-carta="holografico|dorado|aurora"
// si esa persona lo tiene equipado (un solo RPC por tanda de cartas). Lo dibuja styles/efectosCarta.css. Falla en silencio: sin efecto la carta se ve igual.
const SEL = '[data-dueno-carta]:not([data-efecto-hecho])';
const conocidos = new Map();   // id → efecto | null (ya preguntado)

/** Olvida lo aprendido (por ejemplo, tras equipar o quitar un efecto en la tienda). */
export const olvidarEfectosCarta = () => conocidos.clear();

function aplicar(els) {
  for (const e of els) { const ef = conocidos.get(String(e.dataset.duenoCarta).toLowerCase()); if (ef) e.dataset.efectoCarta = ef; else delete e.dataset.efectoCarta; }
}

async function pasada() {
  const els = [...document.querySelectorAll(SEL)]; if (!els.length) return;
  els.forEach((e) => { e.dataset.efectoHecho = '1'; });
  const ids = [...new Set(els.map((e) => String(e.dataset.duenoCarta).toLowerCase()))].filter((id) => !conocidos.has(id));
  if (ids.length) {
    const { efectosCartaDe } = await import('./economia/api.js');
    const mapa = await efectosCartaDe(ids);
    for (const id of ids) conocidos.set(id, mapa[id] ?? null);
  }
  aplicar(els);
}

export function initEfectosCarta() {
  try {
    if (!document.body) return;
    let t = 0; const programar = () => { if (!t) t = setTimeout(() => { t = 0; pasada().catch((e) => console.warn('[efectosCarta]', e)); }, 300); };
    new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
    programar();
  } catch (e) { console.warn('[efectosCarta] desactivado:', e); }
}
