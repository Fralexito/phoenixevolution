// DEMO del Phoenix Pass (SOLO desarrollo, con «?demo»): datos de mentira en memoria que imitan las RPC de la migración 123 (pase_estado, pase_comprar, pase_reclamar).
// Opciones: ?demo&xp=1450 (XP de la temporada), &pase=si (ya con el pase premium), &pase=cerrado (sin temporada abierta).
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const XP_NIVEL = 100, NIVELES = 30, PRECIO = 150;
const ITEM = (id, clave, nombre, categoria, rareza, estilo) => ({ id, clave, nombre, categoria, rareza, estilo });
const OBJ = { 10: ITEM(2, 'marco_hielo', 'Marco Hielo', 'marco', 'comun', { color: '#38bdf8', color2: '#a5f3fc' }), 20: ITEM(5, 'titulo_imparable', 'Imparable', 'titulo', 'comun', { texto: 'Imparable', color: '#f472b6' }), 30: ITEM(7, 'insignia_rayo', 'Rayo', 'insignia', 'comun', { icono: 'fa-bolt', color: '#facc15' }) };
const PREM = { 5: ITEM(101, 'marco_pase_despegue', 'Marco Despegue', 'marco', 'epico', { color: '#00e5ff', color2: '#ffc828' }), 10: ITEM(102, 'fondo_pase_despegue', 'Fondo Despegue', 'fondo', 'epico', { color: '#0b1a3a', color2: '#00e5ff' }),
  15: ITEM(103, 'insignia_pase_despegue', 'Insignia Cohete', 'insignia', 'epico', { icono: 'fa-rocket', color: '#00e5ff' }), 20: ITEM(104, 'titulo_pase_piloto', 'Piloto T1', 'titulo', 'epico', { texto: 'Piloto T1', color: '#00e5ff' }),
  25: ITEM(105, 'clan_pase_despegue', 'Etiqueta Despegue', 'color_clan', 'epico', { color: '#00e5ff' }), 30: ITEM(106, 'marco_pase_fenix', 'Marco Fénix del Pase', 'marco', 'legendario', { color: '#ffc828', color2: '#ff3dc8' }) };
const GEMAS = new Set([3, 8, 13, 18, 23, 28]);

const P = { xp: Number(q.get('xp') ?? 1450), premium: q.get('pase') === 'si', reclamados: new Set() };
const dias = (d) => new Date(Date.now() + d * 86400e3).toISOString();

function recompensas() {
  const out = [];
  for (let n = 1; n <= NIVELES; n++) {
    const g = OBJ[n] ? { tipo: 'item', cantidad: null, item: OBJ[n] } : { tipo: 'ascuas', cantidad: 40 * (1 + Math.floor((n - 1) / 10)), item: null };
    const pr = PREM[n] ? { tipo: 'item', cantidad: null, item: PREM[n] } : GEMAS.has(n) ? { tipo: 'gemas', cantidad: 10, item: null } : { tipo: 'item', cantidad: null, item: ITEM(200 + n, 'demo_premium_' + n, 'Título nivel ' + n, 'titulo', 'comun', { texto: 'Nivel ' + n, color: '#00e5ff' }) }; // la pista premium nunca da ascuas (migración 140)
    out.push({ nivel: n, pista: 'gratis', ...g, reclamada: P.reclamados.has(n + ':gratis') }, { nivel: n, pista: 'premium', ...pr, reclamada: P.reclamados.has(n + ':premium') });
  }
  return out;
}

export function rpcPase(nombre, a, E, falla) {
  const nivel = Math.min(NIVELES, Math.floor(P.xp / XP_NIVEL));
  if (nombre === 'pase_estado') {
    if (q.get('pase') === 'cerrado') return { temporada: null, proxima: { nombre: 'Temporada 2', inicia: dias(10) } };
    return { temporada: { id: 'demo-t1', clave: 'despegue', nombre: 'Temporada 1 · Despegue', inicia: dias(-20), termina: dias(40), niveles: NIVELES, xp_por_nivel: XP_NIVEL, precio_gemas: PRECIO, en_gracia: false, gracia_dias: 7 },
      recompensas: recompensas(), proxima: null, yo: { xp: P.xp, nivel, xp_en_nivel: nivel >= NIVELES ? 0 : P.xp - nivel * XP_NIVEL, tengo_premium: P.premium } };
  }
  if (nombre === 'pase_comprar') {
    if (P.premium) falla('Ya tienes el pase de esta temporada.'); if (E.gemas < PRECIO) falla('Saldo insuficiente.');
    E.gemas -= PRECIO; P.premium = true; return { temporada: 'Temporada 1 · Despegue', precio: PRECIO, gemas: E.gemas };
  }
  // pase_reclamar
  const n = Number(a.p_nivel), pista = a.p_pista, clave = n + ':' + pista;
  if (n > nivel) falla('Todavía no llegas al nivel ' + n + '.'); if (pista === 'premium' && !P.premium) falla('Necesitas el pase premium para este premio.');
  if (P.reclamados.has(clave)) falla('Ya reclamaste este premio.');
  const r = recompensas().find((x) => x.nivel === n && x.pista === pista); P.reclamados.add(clave);
  if (r.tipo === 'ascuas') E.saldo += r.cantidad; else if (r.tipo === 'gemas') E.gemas += r.cantidad;
  return { tipo: r.tipo, cantidad: r.cantidad, objeto: r.item?.nombre ?? null, compensado: false };
}
