// MODO DEMOSTRACIÓN de la economía (SOLO desarrollo: api.js lo carga únicamente con import.meta.env.DEV y «?demo» en la dirección).
// Datos de mentira en memoria para ver la tienda y las recargas sin sesión ni base de datos. Opciones: ?demo&pagos=off (pagos apagados), &terminos=no, &admin=no.
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const ahora = () => new Date().toISOString(), en = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const E = { saldo: 420, gemas: 85, xp: 480, nivel: 3, pagos: q.get('pagos') !== 'off', terminos: q.get('terminos') !== 'no' };
const I = (id, clave, nombre, categoria, precio, nivel, estilo, extra = {}) => ({ id, clave, nombre, descripcion: 'Objeto cosmético de ejemplo.', categoria, precio, precio_ascuas: precio, precio_gemas: Math.max(1, Math.ceil(precio / 5)), nivel_min: nivel, stock: null, agotado: false, estilo, tengo: false, equipado: false, activo: true, ...extra });
const ITEMS = [
  I(1, 'marco_fuego', 'Marco Fuego', 'marco', 120, 1, { color: '#ff5a1f', color2: '#ffc828' }), I(2, 'marco_hielo', 'Marco Hielo', 'marco', 120, 1, { color: '#38bdf8', color2: '#a5f3fc' }),
  I(3, 'marco_dorado', 'Marco Dorado', 'marco', 400, 5, { color: '#f5c451', color2: '#fde68a' }, { descripcion: 'Premium: sube al nivel 5.' }),
  I(4, 'titulo_estratega', 'Estratega', 'titulo', 80, 1, { texto: 'Estratega', color: '#22d3ee' }), I(5, 'titulo_imparable', 'Imparable', 'titulo', 150, 3, { texto: 'Imparable', color: '#f472b6' }),
  I(6, 'fondo_aurora', 'Fondo Aurora', 'fondo', 200, 2, { color: '#0ea5e9', color2: '#8b5cf6' }), I(7, 'insignia_rayo', 'Rayo', 'insignia', 150, 2, { icono: 'fa-bolt', color: '#facc15' }),
  I(8, 'insignia_corona', 'Corona', 'insignia', 250, 4, { icono: 'fa-crown', color: '#fbbf24' }), I(9, 'etiqueta_roja', 'Etiqueta roja', 'color_clan', 60, 1, { color: '#ef4444' }),
  I(10, 'marco_plasma', 'Marco Plasma', 'marco', 0, 1, { color: '#a855f7', color2: '#22d3ee' }, { descripcion: 'Premium: solo con gemas.', precio_ascuas: null, precio_gemas: 150 }),
];
ITEMS[3].tengo = true; ITEMS[3].equipado = true;
ITEMS.push(I(21, 'marco_galaxia', 'Marco Galaxia', 'marco', 1000, 1, { color: '#ff3dc8', color2: '#00e5ff' }, { rareza: 'epico' }), I(22, 'marco_supernova', 'Marco Supernova', 'marco', 0, 1, { color: '#ffffff', color2: '#ffc828' }, { rareza: 'legendario', precio_ascuas: null, precio_gemas: 400 }), I(23, 'marco_halloween', 'Marco Halloween', 'marco', 0, 1, { color: '#ff7a00', color2: '#7a00ff' }, { rareza: 'epico', precio_ascuas: null, precio_gemas: 150, limitada_hasta: en(72) }));
ITEMS.push(
  I(31, 'efecto_holografico', 'Efecto holográfico', 'efecto_carta', 350, 1, { efecto: 'holografico' }, { rareza: 'raro', precio_gemas: 70 }), I(32, 'efecto_dorado', 'Efecto dorado', 'efecto_carta', 800, 1, { efecto: 'dorado' }, { rareza: 'epico', precio_gemas: 160 }),
  I(33, 'efecto_aurora', 'Efecto aurora', 'efecto_carta', 0, 1, { efecto: 'aurora' }, { rareza: 'legendario', precio_ascuas: null, precio_gemas: 320 }),
  I(34, 'banner_atardecer', 'Banner Atardecer', 'banner', 120, 1, { patron: 'degradado', color: '#ff7a18', color2: '#ff3dc8' }, { rareza: 'comun', precio_gemas: 24 }), I(35, 'banner_medianoche', 'Banner Medianoche', 'banner', 250, 1, { patron: 'diagonal', color: '#0b1a4a', color2: '#3a5bff' }, { rareza: 'raro', precio_gemas: 50 }),
  I(36, 'banner_rejilla_neon', 'Banner Rejilla Neón', 'banner', 650, 1, { patron: 'rejilla', color: '#0a0f2c', color2: '#00e5ff' }, { rareza: 'epico', precio_gemas: 130 }), I(37, 'banner_estelar', 'Banner Estelar', 'banner', 0, 1, { patron: 'puntos', color: '#05040f', color2: '#ffc828' }, { rareza: 'legendario', precio_ascuas: null, precio_gemas: 350 }),
  I(38, 'sonido_campana_cristal', 'Sonido Campana de cristal', 'sonido_chat', 75, 1, { sonido: 'snd_campana_cristal' }, { rareza: 'comun', precio_gemas: 15 }), I(39, 'sonido_pop_burbuja', 'Sonido Pop de burbuja', 'sonido_chat', 100, 1, { sonido: 'snd_pop_burbuja' }, { rareza: 'comun', precio_gemas: 20 }),
  I(40, 'sonido_moneda_dorada', 'Sonido Moneda dorada', 'sonido_chat', 225, 1, { sonido: 'snd_moneda_dorada' }, { rareza: 'raro', precio_gemas: 45 }), I(41, 'sonido_gol_estadio', 'Sonido Gol de estadio', 'sonido_chat', 600, 1, { sonido: 'snd_gol_estadio' }, { rareza: 'epico', precio_gemas: 120 }),
);
const PAQ = [{ id: 11, nombre: 'Chispa', tokens: 50, precio_centimos: 500, moneda: 'PEN' }, { id: 12, nombre: 'Brasa', tokens: 110, precio_centimos: 1000, moneda: 'PEN' }, { id: 13, nombre: 'Llama', tokens: 300, precio_centimos: 2500, moneda: 'PEN' }, { id: 14, nombre: 'Fénix', tokens: 650, precio_centimos: 5000, moneda: 'PEN' }];
const METODOS = [
  { clave: 'manual_yape', nombre: 'Yape (pago manual)', tipo: 'manual', proveedor: 'yape', activo: true, orden: 10, minimo_centimos: 500, maximo_centimos: null, instrucciones: 'Yapea el monto exacto, luego sube la captura y escribe el código de operación. Un administrador lo revisa.', datos: { yape: '999 888 777', titular: 'Titular de prueba' } },
  { clave: 'manual_plin', nombre: 'Plin (pago manual)', tipo: 'manual', proveedor: 'plin', activo: false, orden: 20, minimo_centimos: 500, maximo_centimos: null, instrucciones: 'Paga con Plin el monto exacto, luego sube la captura y escribe el código de operación.', datos: {} },
  { clave: 'manual_transferencia', nombre: 'Transferencia bancaria (pago manual)', tipo: 'manual', proveedor: 'banco', activo: false, orden: 30, minimo_centimos: 1000, maximo_centimos: null, instrucciones: 'Transfiere el monto exacto, luego sube el comprobante y escribe el número de operación.', datos: {} },
];
let PAGOS = [
  { orden: 'demo-1', metodo: 'manual_yape', monto_centimos: 1000, gemas: 100, estado_orden: 'PAGADA', expira_at: null, creada: en(-48), comprobante: 'aprobado', nota: null },
  { orden: 'demo-2', metodo: 'manual_yape', monto_centimos: 2700, gemas: 300, estado_orden: 'PENDIENTE', expira_at: en(5), creada: en(-1), comprobante: 'en_revision', nota: null },
  { orden: 'demo-3', metodo: 'manual_yape', monto_centimos: 1000, gemas: 100, estado_orden: 'FALLIDA', expira_at: null, creada: en(-30), comprobante: 'rechazado', nota: 'El pago no llegó a la cuenta.' },
];
let COLA = [
  { orden: 'demo-2', usuario: 'Kaiser', usuario_id: 'u-kaiser', metodo: 'manual_yape', monto_centimos: 2700, moneda: 'PEN', gemas: 300, referencia: 'OP48201733', comprobante_path: 'u-kaiser/demo-2.png', estado: 'en_revision', nota: null, enviado: en(-1) },
  { orden: 'demo-9', usuario: 'ElTigre', usuario_id: 'u-tigre', metodo: 'manual_yape', monto_centimos: 1000, moneda: 'PEN', gemas: 100, referencia: 'OP77120045', comprobante_path: 'u-tigre/demo-9.png', estado: 'en_revision', nota: null, enviado: en(-0.2) },
];
let n = 20;
const eco = () => ({ saldo: E.saldo, gemas: E.gemas, en_garantia: 0, puede_apostar: true, xp: E.xp, nivel: E.nivel, xp_nivel: 300, xp_siguiente: 600 });
const falla = (m) => { throw new Error(m); };

// Fase B (migración 120): recompensa diaria, misiones semanales y logros de mentira. Se puede reclamar y ver subir las ascuas.
const GAN = { racha: 2, mejor: 5, hoy: false, topeLogros: 200, usado: 0,
  misiones: [
    { clave: 'm_partidos10', titulo: 'Diez partidos', descripcion: 'Juega 10 partidos con marcador confirmado esta semana.', meta: 10, progreso: 10, ascuas: 80, cobrado: false },
    { clave: 'm_rivales3', titulo: 'Tres rivales', descripcion: 'Juega con 3 rivales distintos esta semana.', meta: 3, progreso: 2, ascuas: 60, cobrado: false },
    { clave: 'm_ganar4', titulo: 'Cuatro victorias', descripcion: 'Gana 4 partidos con marcador confirmado esta semana.', meta: 4, progreso: 1, ascuas: 90, cobrado: false }],
  logros: [
    { clave: 'primer_duelo', titulo: 'Primer duelo', descripcion: 'Juega y finaliza tu primer duelo.', icono: 'fa-futbol', nivel: 'bronce', meta: 1, progreso: 1, ascuas: 20, obtenido: true, cobrado: false },
    { clave: 'primera_victoria', titulo: 'Primera victoria', descripcion: 'Gana un duelo con marcador confirmado.', icono: 'fa-medal', nivel: 'bronce', meta: 1, progreso: 1, ascuas: 30, obtenido: true, cobrado: false },
    { clave: 'duelista_10', titulo: 'Duelista', descripcion: 'Finaliza 10 duelos.', icono: 'fa-bolt', nivel: 'plata', meta: 10, progreso: 4, ascuas: 40, obtenido: false, cobrado: false },
    { clave: 'ganador_50', titulo: 'Imparable', descripcion: 'Gana 50 duelos con marcador confirmado.', icono: 'fa-ranking-star', nivel: 'oro', meta: 50, progreso: 6, ascuas: 200, obtenido: false, cobrado: false }],
};
const ganDemo = () => {
  const sig = GAN.racha + 1, ciclo = ((sig - 1) % 7) + 1;
  return { racha: { actual: GAN.racha, mejor: GAN.mejor, reclamada_hoy: GAN.hoy, siguiente: sig, ciclo_siguiente: ciclo, ascuas_siguiente: 5 + (({ 3: 10, 7: 40 })[ciclo] ?? 0) },
    primer_partido: { ascuas: 5, ganado_hoy: false },
    misiones: { semana_fin: en(72), items: GAN.misiones.map((m) => ({ ...m, cobrable: !m.cobrado && m.progreso >= m.meta })) },
    logros: { tope_dia: GAN.topeLogros, usado_hoy: GAN.usado, items: GAN.logros.map((l) => ({ ...l, cobrable: l.obtenido && !l.cobrado })) } };
};

export async function rpcDemo(nombre, a = {}) {
  await new Promise((r) => setTimeout(r, 60));
  switch (nombre) {
    case 'mi_economia': return eco();
    case 'tienda_lista': return ITEMS.filter((i) => i.activo).map((i) => ({ ...i }));
    case 'admin_tienda_items': return ITEMS.map((i) => ({ ...i }));
    case 'mi_inventario': return ITEMS.filter((i) => i.tengo).map((i) => ({ id: i.id, clave: i.clave, nombre: i.nombre, categoria: i.categoria, estilo: i.estilo, equipado: i.equipado, comprado: ahora() }));
    case 'mis_movimientos': return [{ id: 3, delta: -80, tipo: 'compra_tienda', fuente: 'tienda', saldo: 420, cuando: en(-5) }, { id: 2, delta: 100, tipo: 'compra_dinero', fuente: 'manual', saldo: 85, cuando: en(-48) }, { id: 1, delta: 10, tipo: 'ganado', fuente: 'partido', saldo: 500, cuando: en(-70) }];
    case 'reglas_economia': return [{ fuente: 'partido_jugado', descripcion: 'Jugar un partido confirmado', xp: 20, tokens: 10, tope_diario: 5, activa: true }, { fuente: 'partido_ganado', descripcion: 'Ganar un partido', xp: 15, tokens: 5, tope_diario: 5, activa: true }, { fuente: 'valoracion_enviada', descripcion: 'Valorar a un rival', xp: 5, tokens: 2, tope_diario: 5, activa: true }];
    case 'paquetes_lista': return { pagos_activos: E.pagos, version_terminos: '1', terminos_aceptados: E.terminos, edad: 'adulto', bono_primera_pct: 50, bono_disponible: true, paquetes: PAQ };
    case 'aceptar_terminos_compra': E.terminos = true; return null;
    case 'mis_ordenes': return [];
    case 'pagos_metodos_lista': return METODOS.filter((m) => m.activo);
    case 'mis_pagos_manuales': return PAGOS.map((p) => ({ ...p }));
    case 'crear_orden_metodo': {
      const k = PAQ.find((p) => p.id === a.p_paquete), m = METODOS.find((x) => x.clave === a.p_metodo && x.activo); if (!k || !m) falla('Ese método de pago no está disponible.');
      const o = { orden: 'demo-' + (++n), metodo: m.clave, monto_centimos: k.precio_centimos, gemas: k.tokens, estado_orden: 'PENDIENTE', expira_at: en(24), creada: ahora(), comprobante: null, nota: null }; PAGOS = [o, ...PAGOS];
      return { orden: o.orden, monto_centimos: o.monto_centimos, moneda: 'PEN', gemas: o.gemas, metodo: m.clave, tipo: m.tipo, instrucciones: m.instrucciones, datos: m.datos, expira_at: o.expira_at };
    }
    case 'enviar_comprobante_manual': {
      const o = PAGOS.find((p) => p.orden === a.p_orden); if (!o) falla('Esa orden no existe.');
      if (!/^[A-Za-z0-9-]{4,40}$/.test(String(a.p_referencia ?? '').trim())) falla('El código de operación solo lleva letras, números y guiones (4 a 40 caracteres).');
      if (String(a.p_nombre_pagador ?? '').trim().length < 3) falla('Escribe el nombre de quien hizo el pago.');
      o.comprobante = 'en_revision'; COLA = [{ orden: o.orden, usuario: 'Tú (demo)', usuario_id: 'demo', metodo: o.metodo, monto_centimos: o.monto_centimos, moneda: 'PEN', gemas: o.gemas, referencia: a.p_referencia, nombre_pagador: String(a.p_nombre_pagador).trim(), banderas: ['Cuenta nueva (demo)'], confirmar_monto: o.monto_centimos >= 10000, comprobante_path: a.p_comprobante_path, estado: 'en_revision', nota: null, enviado: ahora() }, ...COLA]; return null;
    }
    case 'comprar_item': {
      const i = ITEMS.find((x) => x.id === a.p_item), gem = a.p_moneda === 'gemas', precio = gem ? i?.precio_gemas : i?.precio_ascuas;
      if (!i || precio == null) falla('Este objeto no se vende con ' + a.p_moneda + '.'); if ((gem ? E.gemas : E.saldo) < precio) falla('Saldo insuficiente.');
      if (gem) E.gemas -= precio; else E.saldo -= precio; i.tengo = true; return { saldo: E.saldo, gemas: E.gemas, moneda: a.p_moneda, precio, objeto: i.nombre };
    }
    case 'equipar_item': { const i = ITEMS.find((x) => x.id === a.p_item); if (i) { for (const o of ITEMS) if (o.categoria === i.categoria) o.equipado = false; i.equipado = !!a.p_equipar; } return null; }
    case 'pase_estado': case 'pase_comprar': case 'pase_reclamar': return (await import('./pase-demo.js')).rpcPase(nombre, a, E, falla);
    case 'admin_economia_resumen': return { tokens_en_circulacion: E.saldo + E.gemas, billeteras_negativas: 0, ingresos_centimos: 1000, ordenes: { PAGADA: 1, PENDIENTE: 1, FALLIDA: 1 }, pagos_activos: E.pagos };
    case 'admin_set_pagos_activos': E.pagos = !!a.p_activo; return null;
    case 'admin_pagos_manuales': return COLA.filter((c) => c.estado === (a.p_estado ?? 'en_revision')).map((c) => ({ ...c }));
    case 'admin_resolver_pago_manual': {
      const c = COLA.find((x) => x.orden === a.p_orden); if (!c) falla('Ese pago no existe.');
      if (!a.p_aprobar && String(a.p_nota ?? '').trim().length < 5) falla('Escribe el motivo del rechazo (mínimo 5 letras).');
      if (a.p_aprobar && c.confirmar_monto && a.p_monto_confirmado !== c.monto_centimos) falla('El monto que escribiste no coincide con la orden. Revisa tu app de pagos.');
      c.estado = a.p_aprobar ? 'aprobado' : 'rechazado'; c.nota = a.p_nota; const p = PAGOS.find((x) => x.orden === c.orden);
      if (p) { p.comprobante = c.estado; p.nota = a.p_nota; p.estado_orden = a.p_aprobar ? 'PAGADA' : 'FALLIDA'; if (a.p_aprobar && c.usuario_id === 'demo') E.gemas += c.gemas; }
      return a.p_aprobar ? 'acreditada' : 'fallida';
    }
    case 'admin_alertas': return [];
    case 'admin_resolver_alerta': return null;
    case 'admin_economia_revisar_ya': return { criticas: 0, ordenes_expiradas: 0, revisado: ahora() };
    case 'admin_metodos_pago': return METODOS.map((m) => ({ ...m }));
    case 'admin_guardar_metodo': { const m = METODOS.find((x) => x.clave === a.p_clave); if (m) Object.assign(m, { nombre: a.p_nombre, activo: !!a.p_activo, minimo_centimos: a.p_minimo, instrucciones: a.p_instrucciones, datos: a.p_datos ?? {} }); return null; }
    case 'admin_set_precios_item': { const i = ITEMS.find((x) => x.id === a.p_id); if (i) { i.precio_ascuas = a.p_precio_ascuas; i.precio_gemas = a.p_precio_gemas; i.precio = a.p_precio_ascuas ?? i.precio; } return null; }
    case 'economia_auditar': return { ok: true, diferencias: 0, detalle: [], ascuas_en_circulacion: E.saldo, gemas_en_circulacion: E.gemas, revisado: ahora() };
    case 'mis_ascuas_extra': return ganDemo();
    case 'reclamar_racha_diaria': {
      if (GAN.hoy) falla('Ya reclamaste tu racha de hoy. Vuelve mañana.');
      const n = GAN.racha + 1, bono = ({ 3: 10, 7: 40 })[((n - 1) % 7) + 1] ?? 0;
      GAN.racha = n; GAN.mejor = Math.max(GAN.mejor, n); GAN.hoy = true; E.saldo += 5 + bono; return { racha: n, ciclo: ((n - 1) % 7) + 1, ascuas: 5 + bono, bono };
    }
    case 'reclamar_mision': {
      const m = GAN.misiones.find((x) => x.clave === a.p_clave); if (!m) falla('Esa misión no está activa esta semana.');
      if (m.cobrado) falla('Ya reclamaste esta misión esta semana.'); if (m.progreso < m.meta) falla(`Aún no cumples esta misión (${m.progreso} de ${m.meta}).`);
      m.cobrado = true; E.saldo += m.ascuas; return m.ascuas;
    }
    case 'reclamar_logro': {
      const l = GAN.logros.find((x) => x.clave === a.p_id); if (!l) falla('Ese logro no tiene premio.');
      if (l.cobrado) falla('Ya reclamaste este logro.'); if (!l.obtenido) falla('Aún no consigues este logro.');
      if (GAN.usado + l.ascuas > GAN.topeLogros) falla(`Hoy ya reclamaste muchos logros (máximo ${GAN.topeLogros} ascuas al día). Vuelve mañana.`);
      l.cobrado = true; GAN.usado += l.ascuas; E.saldo += l.ascuas; return l.ascuas;
    }
    default: return null;
  }
}
