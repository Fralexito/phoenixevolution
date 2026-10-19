// Cliente de Supabase ÚNICO. Todo el sitio importa `supabase` desde aquí.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { demoActivo } from './modoDemo.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Modo demostración (core/sistema/modoDemo.js): las lecturas que muestran actividad devuelven datos simulados.
// El simulador se descarga SOLO si el modo está encendido; apagado, este bloque no hace nada.
if (demoActivo()) {
  const real = supabase.rpc.bind(supabase);
  supabase.rpc = (nombre, args, op) => import('../../features/demo/simulador.js')
    .then((m) => m.rpcDemo(nombre, args, () => real(nombre, args, op)))
    .catch((e) => ({ data: null, error: { message: String(e?.message ?? e) } }));
  // Tablas simuladas (hoy solo la campana): se anotan los pasos de la consulta (.select().eq().order()…) y, al esperarla,
  // decide el simulador; si es algo real, la misma cadena se repite sobre la consulta de verdad. Las demás tablas no pasan por aquí.
  const TABLAS_DEMO = new Set(['notificaciones']);
  const realFrom = supabase.from.bind(supabase);
  supabase.from = (tabla) => {
    if (!TABLAS_DEMO.has(tabla)) return realFrom(tabla);
    const ops = []; const deVerdad = () => ops.reduce((q, [m, a]) => q[m](...a), realFrom(tabla));
    const consulta = new Proxy({}, { get: (_, k) => (k === 'then'
      ? (ok, ko) => import('../../features/demo/simulador.js').then((m) => m.tablaDemo(tabla, ops, deVerdad)).then(ok, ko)
      : (...a) => { ops.push([k, a]); return consulta; }) });
    return consulta;
  };
}
