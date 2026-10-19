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
}
