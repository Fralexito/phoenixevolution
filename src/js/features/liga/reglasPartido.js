// Moderación › Liga › «Reglas del partido por edición» (ronda 386, migración 160).
// El staff fija qué configuración del juego exige cada edición (duración, dificultad, cambios, prórroga, penales).
// Cuando Phoenix Link 0.3.51 manda la ficha del partido, la base la compara y, si no coincide, el resultado aparece con
// «Revisar» para el staff. NUNCA se rechaza solo: el staff decide. Campo vacío = no se controla.
// Guarda con public.staff_liga_reglas_partido (la base vuelve a validar todo y exige ser moderador).
import { supabase } from '../../core/sistema/supabase.js';
import { escapeHTML } from '../../core/sistema/dom.js';
import { toast } from '../../core/sistema/toast.js';
import { leerReglas, reglasAFormulario } from '../../core/competicion/fichaPartido.js';

const opciones = (v) => [['', 'Cualquiera'], ['si', 'Sí'], ['no', 'No']]
  .map(([x, t]) => `<option value="${x}"${x === v ? ' selected' : ''}>${t}</option>`).join('');

export function montarReglasPartido(details) {
  if (!details) return;
  const cuerpo = details.querySelector('[data-reglas-cuerpo]');
  let ediciones = [];
  let cargado = false;

  function formulario(ed) {
    const f = reglasAFormulario(ed?.reglas_partido);
    return `<form data-rp-form class="space-y-2">
      <div><label class="label" for="rp-edicion">Edición</label>
        <select id="rp-edicion" class="field" data-rp-edicion>${ediciones.map((e) => `<option value="${escapeHTML(e.id)}"${e.id === ed?.id ? ' selected' : ''}>${escapeHTML(e.nombre)}</option>`).join('')}</select></div>
      <div class="lv-reglas">
        <label>Duración (min)<input class="field" name="duracion" inputmode="numeric" maxlength="2" placeholder="Cualquiera" value="${escapeHTML(f.duracion)}"></label>
        <label>Dificultad (código)<input class="field" name="dificultad" inputmode="numeric" maxlength="2" placeholder="Cualquiera" value="${escapeHTML(f.dificultad)}"></label>
        <label>Cambios<input class="field" name="cambios" inputmode="numeric" maxlength="2" placeholder="Cualquiera" value="${escapeHTML(f.cambios)}"></label>
        <label>Prórroga<select class="field" name="prorroga">${opciones(f.prorroga)}</select></label>
        <label>Penales<select class="field" name="penales">${opciones(f.penales)}</select></label>
      </div>
      <p class="text-[12px] text-gray-400">Vacío = no se controla. Si el juego se configuró distinto, el resultado llega con «Revisar» (no se rechaza). La dificultad es el número que da Sider.</p>
      <button type="submit" class="btn btn-primary !min-h-8 !text-xs">Guardar reglas</button>
    </form>`;
  }

  function pintar(id) {
    if (!ediciones.length) { cuerpo.innerHTML = '<p class="text-[12px] text-gray-400">No hay ediciones en curso.</p>'; return; }
    cuerpo.innerHTML = formulario(ediciones.find((e) => e.id === id) ?? ediciones[0]);
  }

  async function cargar() {
    cuerpo.innerHTML = '<p class="text-[12px] text-gray-400">Cargando…</p>';
    try {
      const { data, error } = await supabase.from('liga_ediciones').select('id, nombre, reglas_partido').eq('estado', 'en_curso').order('creado', { ascending: false });
      if (error) throw error;
      ediciones = data ?? [];
      pintar();
    } catch (e) {
      console.warn('[liga reglas] carga:', e.message);
      cuerpo.innerHTML = '<p class="text-[12px] text-red-300">No se pudieron cargar las ediciones. Recarga la página.</p>';
    }
  }

  details.addEventListener('toggle', () => { if (details.open && !cargado) { cargado = true; cargar(); } });
  cuerpo.addEventListener('change', (ev) => { if (ev.target.matches('[data-rp-edicion]')) pintar(ev.target.value); });
  cuerpo.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const id = form.querySelector('[data-rp-edicion]')?.value;
    const v = Object.fromEntries(new FormData(form));
    const r = leerReglas(v);
    if (!r.ok) { toast(r.error, 'error'); return; }
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const { error } = await supabase.rpc('staff_liga_reglas_partido', { p_edicion: id, p_reglas: r.reglas });
      if (error) throw new Error(error.message);
      const ed = ediciones.find((e) => e.id === id);
      if (ed) ed.reglas_partido = r.reglas;
      toast('Reglas guardadas.', 'ok');
    } catch (e) {
      toast(e.message || 'No se pudieron guardar las reglas.', 'error');
    } finally { boton.disabled = false; }
  });
}
