// Página Liga (ronda 224): la tabla y los resultados se calculan al construir la web (data/ligaResultados.js).
// Aquí, al abrir la página, se piden a la base los resultados CONFIRMADOS de las ediciones en curso (los que el
// staff o el árbitro validaron desde Phoenix Link). Si hay alguno que la web aún no tiene, se recalcula la tabla
// con la MISMA fórmula (core/tabla.js, con enfrentamiento directo) y se actualizan puntos, orden, zonas y el
// marcador del partido. Si la base no responde o no hay nada nuevo, la página queda exactamente como se construyó.
import { supabase } from '../../core/supabase.js';
import { EDICIONES } from '../../../data/ligaResultados.js';
import { SISTEMA, SISTEMAS_LIGA } from '../../../data/temporada.js';
import { calcularTabla } from '../../core/tabla.js';
import { zonasDivision, zonasLiga } from '../../core/temporada.js';
import { fusionarConfirmados } from '../../core/ligaVivo.js';

const PUESTO = ['text-gold-400', 'text-gray-200', 'text-bronze-400'];
const ZONAS = ['tmp-fila', 'tmp-baja', 'tmp-sube', 'tmp-copa'];

// Igual que en pages/liga.astro
function zonasPara(ligaId, nombres) {
  if (SISTEMAS_LIGA[ligaId]) return zonasLiga(nombres, SISTEMAS_LIGA[ligaId]);
  const div = SISTEMA.divisiones.find((d) => d.ligaId === ligaId);
  return div ? zonasDivision(nombres, div.nivel, { ...SISTEMA.inicial, suben: SISTEMA.inicial.suben }) : null;
}

function claseZona(z) {
  if (!z) return [];
  if (z.includes('baja')) return ['tmp-fila', 'tmp-baja'];
  if (z.includes('sube')) return ['tmp-fila', 'tmp-sube'];
  if (z.includes('copa')) return ['tmp-fila', 'tmp-copa'];
  return [];
}

function pintarTabla(bloque, ligaId, tabla) {
  const tbody = bloque.querySelector('table.liga-tabla tbody');
  if (!tbody) return;
  const filas = new Map([...tbody.querySelectorAll('tr[data-jug]')].map((tr) => [tr.dataset.jug, tr]));
  const enTabla = new Set(tabla.map((f) => f.nombre));
  // Los que aún no juegan (ceros) siguen al final, en su orden
  const orden = [...tabla, ...[...filas.keys()].filter((n) => !enTabla.has(n)).map((nombre) => ({ nombre, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }))];
  const hayZonas = [...filas.values()].some((tr) => tr.classList.contains('tmp-fila'));
  const zonas = hayZonas ? zonasPara(ligaId, orden.map((f) => f.nombre)) : null;
  orden.forEach((f, i) => {
    const tr = filas.get(f.nombre);
    if (!tr) return;
    const td = tr.children;
    if (td.length < 10) return;
    td[0].textContent = String(i + 1);
    td[0].classList.remove(...PUESTO, 'text-gray-500');
    td[0].classList.add(PUESTO[i] ?? 'text-gray-500');
    const valores = [f.pts, f.pj, f.g, f.e, f.p, f.gf, f.gc];
    valores.forEach((v, k) => { td[2 + k].textContent = String(v); });
    td[9].textContent = f.dg > 0 ? `+${f.dg}` : String(f.dg);
    td[9].classList.remove('text-emerald-400', 'text-rose-400', 'text-gray-400');
    td[9].classList.add(f.dg > 0 ? 'text-emerald-400' : f.dg < 0 ? 'text-rose-400' : 'text-gray-400');
    tr.classList.toggle('liga-lider', i === 0 && f.pj > 0);
    if (zonas) { tr.classList.remove(...ZONAS); tr.classList.add(...claseZona(zonas.get(f.nombre))); }
    tr.style.setProperty('--i', String(i));
    tbody.appendChild(tr);   // reordena
  });
}

function pintarMarcadores(bloque, fechas, originales) {
  fechas.forEach((f, i) => {
    const panel = bloque.querySelector(`[data-fecha-panel="${f.n}"]`);
    if (!panel) return;
    f.partidos.forEach((m, k) => {
      const antes = originales[i]?.partidos?.[k];
      if (!antes || (antes.gl === m.gl && antes.gv === m.gv)) return;
      const li = [...panel.querySelectorAll('li.liga-partido')].find((x) => x.dataset.mL === m.l && x.dataset.mV === m.v);
      const medio = li?.children?.[1];
      if (!medio) return;
      const chip = document.createElement('span');
      chip.className = 'px-2.5 py-1 rounded-md bg-galaxy-900 border border-galaxy-600/50 font-display font-extrabold text-white tabular-nums';
      chip.textContent = `${m.gl} : ${m.gv}`;
      chip.title = 'Validado desde Phoenix Link';
      medio.replaceWith(chip);
    });
  });
}

/** Revisa cada edición en curso y aplica los resultados confirmados que la web aún no tiene. */
export async function actualizarTablaLiga() {
  for (const [ligaId, ediciones] of Object.entries(EDICIONES)) {
    for (const ed of ediciones ?? []) {
      if (ed.estado !== 'en_curso' || ed.tablaOficial?.length || !ed.fechas?.length) continue;
      const bloque = document.querySelector(`[data-edicion="${ed.id}"][data-liga-ed="${ligaId}"]`);
      if (!bloque) continue;
      try {
        const { data, error } = await supabase.from('liga_partidos')
          .select('fecha, local, visitante, goles_local, goles_visita, estado')
          .eq('edicion_id', `${ligaId}:${ed.id}`).eq('estado', 'confirmado').limit(500);
        if (error) { console.warn('[liga] resultados de la base:', error.message); continue; }
        const { fechas, cambios } = fusionarConfirmados(ed.fechas, data);
        if (!cambios) continue;
        const { tabla } = calcularTabla(fechas.flatMap((f) => f.partidos));
        pintarTabla(bloque, ligaId, tabla);
        pintarMarcadores(bloque, fechas, ed.fechas);
        const aviso = document.createElement('p');
        aviso.className = 'text-xs text-gray-400';
        aviso.innerHTML = `<i class="fa-solid fa-circle-check text-galaxy-400 mr-1"></i>Incluye ${cambios === 1 ? '1 resultado validado' : `${cambios} resultados validados`} desde Phoenix Link.`;
        bloque.querySelector('table.liga-tabla')?.closest('section')?.appendChild(aviso);
      } catch (e) { console.warn('[liga] tabla viva:', e); }
    }
  }
}
