// Números que cambian: destello suave verde (sube) o rojo (baja), como las cuotas en vivo. Marca el elemento con data-vivo-num.
const num = (t) => { const n = parseFloat(String(t).replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? null : n; };
export function montarNumerosVivos(raiz = document) {
  const previo = new WeakMap();
  const ver = (el) => {
    const nuevo = num(el.textContent), viejo = previo.get(el);
    previo.set(el, nuevo);
    if (nuevo === null || viejo === undefined || viejo === null || nuevo === viejo) return;
    el.classList.remove('num-sube', 'num-baja'); void el.offsetWidth;
    el.classList.add(nuevo > viejo ? 'num-sube' : 'num-baja');
    setTimeout(() => el.classList.remove('num-sube', 'num-baja'), 1200);
  };
  const mo = new MutationObserver((ms) => { for (const m of ms) { const el = (m.target.nodeType === 3 ? m.target.parentElement : m.target)?.closest?.('[data-vivo-num]'); if (el) ver(el); } });
  raiz.querySelectorAll('[data-vivo-num]').forEach((el) => { previo.set(el, num(el.textContent)); mo.observe(el, { childList: true, characterData: true, subtree: true }); });
  return mo;
}
