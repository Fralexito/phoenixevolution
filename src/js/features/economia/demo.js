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
const PAQ = [{ id: 11, nombre: '100 gemas', tokens: 100, precio_centimos: 1000, moneda: 'PEN' }, { id: 12, nombre: '300 gemas', tokens: 300, precio_centimos: 2700, moneda: 'PEN' }, { id: 13, nombre: '700 gemas', tokens: 700, precio_centimos: 5500, moneda: 'PEN' }];
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

export async function rpcDemo(nombre, a = {}) {
  await new Promise((r) => setTimeout(r, 60));
  switch (nombre) {
    case 'mi_economia': return eco();
    case 'tienda_lista': return ITEMS.filter((i) => i.activo).map((i) => ({ ...i }));
    case 'admin_tienda_items': return ITEMS.map((i) => ({ ...i }));
    case 'mi_inventario': return ITEMS.filter((i) => i.tengo).map((i) => ({ id: i.id, clave: i.clave, nombre: i.nombre, categoria: i.categoria, estilo: i.estilo, equipado: i.equipado, comprado: ahora() }));
    case 'mis_movimientos': return [{ id: 3, delta: -80, tipo: 'compra_tienda', fuente: 'tienda', saldo: 420, cuando: en(-5) }, { id: 2, delta: 100, tipo: 'compra_dinero', fuente: 'manual', saldo: 85, cuando: en(-48) }, { id: 1, delta: 10, tipo: 'ganado', fuente: 'partido', saldo: 500, cuando: en(-70) }];
    case 'reglas_economia': return [{ fuente: 'partido_jugado', descripcion: 'Jugar un partido confirmado', xp: 20, tokens: 10, tope_diario: 5, activa: true }, { fuente: 'partido_ganado', descripcion: 'Ganar un partido', xp: 15, tokens: 5, tope_diario: 5, activa: true }, { fuente: 'valoracion_enviada', descripcion: 'Valorar a un rival', xp: 5, tokens: 2, tope_diario: 5, activa: true }];
    case 'paquetes_lista': return { pagos_activos: E.pagos, version_terminos: '1', terminos_aceptados: E.terminos, edad: 'adulto', paquetes: PAQ };
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
    default: return null;
  }
}
