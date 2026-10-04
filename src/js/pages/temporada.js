// Página Temporada (beta): lee las tablas que Astro dejó en data-temporada, y con js/core/temporada.js calcula y pinta zonas, ascensos y copa.
// Cada cambio en un control vuelve a calcular TODO desde cero (sin estado oculto): es más simple de razonar y no puede quedar a medias.
import { zonasDivision, resolverAscensos, clasificadosCopa, construirCopa, normalizarConfig } from '../core/temporada.js';
import { escapeHTML } from '../core/dom.js';

const $ = (id) => document.getElementById(id);
const raiz = $('temporada');
let datos = null;
try { datos = JSON.parse(raiz?.dataset.temporada ?? 'null'); } catch (err) { console.error('[temporada] datos ilegibles:', err); }
if (!raiz || !datos) { if (raiz) raiz.insertAdjacentHTML('afterbegin', '<p class="text-bad text-sm">No se pudieron cargar los datos de la temporada.</p>'); }
else iniciar();

function iniciar() {
  const estado = { ...datos.cfg };
  const n1 = datos.d1.length; const n2 = datos.d2.length;
  const CONTROLES = [
    { k: 'suben', t: 'Suben y bajan', ayuda: 'Cuántos descienden de Primera y ascienden de Segunda (siempre el mismo número).', max: () => Math.max(0, Math.min(8, Math.floor(n1 / 2), n2)) },
    { k: 'copa1', t: 'Clasifican de Primera', ayuda: 'Los mejores de la Primera División que juegan la copa.', max: () => Math.min(16, n1) },
    { k: 'copa2', t: 'Clasifican de Segunda', ayuda: 'Los mejores de la Segunda División que juegan la copa.', max: () => Math.min(16, n2) },
  ];
  const pintarControles = () => {
    $('tmp-controles').innerHTML = CONTROLES.map((c) => `
      <div class="space-y-1.5"><label for="c-${c.k}" class="block font-display font-bold text-sm text-white uppercase tracking-wider">${c.t}</label>
        <div class="flex items-stretch gap-2"><button type="button" data-paso="${c.k}:-1" class="adv-chip !min-h-10 !px-4" aria-label="Menos ${escapeHTML(c.t)}"><i class="fa-solid fa-minus"></i></button>
          <output id="c-${c.k}" class="flex-1 grid place-items-center rounded-lg border border-galaxy-border bg-black/30 font-display font-extrabold text-xl text-white tabular-nums">${estado[c.k]}</output>
          <button type="button" data-paso="${c.k}:1" class="adv-chip !min-h-10 !px-4" aria-label="Más ${escapeHTML(c.t)}"><i class="fa-solid fa-plus"></i></button></div>
        <p class="text-[11px] text-gray-500 leading-snug">${c.ayuda}</p></div>`).join('');
  };

  const ETIQ = { copa: ['Copa', 'tmp-copa', 'fa-trophy'], sube: ['Ascenso', 'tmp-sube', 'fa-arrow-up'], baja: ['Descenso', 'tmp-baja', 'fa-arrow-down'] };
  const tabla = (filas, nivel, cfg, titulo, nota) => {
    const zonas = zonasDivision(filas.map((f) => f.nombre), nivel, cfg);
    const cuerpo = filas.length ? filas.map((f, i) => {
      const z = zonas.get(f.nombre) ?? []; const clase = z.includes('baja') ? 'tmp-baja' : z.includes('sube') ? 'tmp-sube' : z.includes('copa') ? 'tmp-copa' : '';
      const marcas = z.map((x) => `<span class="tmp-tag ${ETIQ[x][1]}" title="${ETIQ[x][0]}"><i class="fa-solid ${ETIQ[x][2]}"></i></span>`).join('');
      return `<tr class="tmp-fila ${clase}"><td class="text-left font-display font-bold text-gray-300">${i + 1}</td><td class="text-left"><span class="font-display font-bold text-white">${escapeHTML(f.nombre)}</span>${f.club ? `<span class="block text-[11px] text-gray-400 leading-tight uppercase">${escapeHTML(f.club)}</span>` : ''}</td><td class="text-left">${marcas}</td><td class="font-display font-extrabold text-white">${f.pts}</td><td>${f.pj}</td><td>${f.dg > 0 ? `+${f.dg}` : f.dg}</td></tr>`;
    }).join('') : `<tr><td colspan="6" class="text-sm text-gray-400 py-4 text-center">Aún no hay jugadores en esta división.</td></tr>`;
    return `<h2 class="font-display font-bold text-base text-white uppercase tracking-widest">${escapeHTML(titulo)}${nota ? ` <span class="liga-sello liga-sello-prox ml-2 align-middle">${nota}</span>` : ''}</h2>
      <div class="glass-panel rounded-2xl px-3 sm:px-5 py-2 sm:py-3"><table class="liga-tabla w-full"><thead><tr><th class="text-left w-8">#</th><th class="text-left">Jugador</th><th class="text-left"></th><th>PTS</th><th>PJ</th><th>DIF</th></tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  };

  const nombres = (l) => l.map((f) => f.nombre);
  const lista = (arr, vacio = '—') => (arr.length ? arr.map((x) => `<b class="text-white">${escapeHTML(x)}</b>`).join(', ') : vacio);
  const cierre = (r) => `<h2 class="font-display font-bold text-base text-white uppercase tracking-widest"><i class="fa-solid fa-flag-checkered text-galaxy-400 mr-2"></i>Si la temporada terminara hoy</h2>
    <div class="grid gap-3 md:grid-cols-2">
      <div class="glass-panel rounded-xl p-4 text-sm text-gray-300 space-y-1"><p><span class="tmp-tag tmp-sube"><i class="fa-solid fa-arrow-up"></i></span> Suben a ${escapeHTML(datos.nombres.d1)}: ${lista(r.suben, 'nadie')}</p><p><span class="tmp-tag tmp-baja"><i class="fa-solid fa-arrow-down"></i></span> Bajan a ${escapeHTML(datos.nombres.d2)}: ${lista(r.bajan, 'nadie')}</p></div>
      <div class="glass-panel rounded-xl p-4 text-sm text-gray-300 space-y-1"><p><b class="text-galaxy-400 font-display uppercase text-xs tracking-wider">Próxima ${escapeHTML(datos.nombres.d1)}</b><br>${lista(r.div1)}</p><p><b class="text-galaxy-400 font-display uppercase text-xs tracking-wider">Próxima ${escapeHTML(datos.nombres.d2)}</b><br>${lista(r.div2)}</p></div>
    </div>`;

  const equipo = (t, ph) => (t ? `<span class="min-w-0"><span class="block font-display font-bold text-white truncate">${escapeHTML(t.nombre)}</span><span class="block text-[10px] text-gray-400 uppercase tracking-wider">${t.nivel === 1 ? 'Liga 1' : 'Liga 2'} · ${t.pos}.º</span></span>` : `<span class="text-xs text-gray-500 italic">${ph}</span>`);
  const cuadro = (k) => {
    if (!k.rondas.length) return `<p class="text-sm text-gray-400">${escapeHTML(k.avisos[0] ?? 'Sin cuadro todavía.')}</p>`;
    const cols = k.rondas.map((r, ri) => `<div class="space-y-3"><h3 class="font-display font-bold text-xs text-galaxy-400 uppercase tracking-[.2em]">${escapeHTML(r.nombre)}</h3>
      ${r.partidos.map((p) => { const gan = p.ganador?.nombre; const marc = Number.isInteger(p.ga) && Number.isInteger(p.gb) ? `${p.ga} : ${p.gb}${Number.isInteger(p.pa) ? ` <span class="text-[10px] text-gray-400">(${p.pa}-${p.pb} pen.)</span>` : ''}` : 'vs';
        const ph = ri === 0 ? 'Por definir' : 'Ganador por definir';
        return `<div class="tmp-cruce ${p.libre ? 'tmp-libre' : ''}"><div class="tmp-lado ${gan && gan === p.a?.nombre ? 'tmp-gana' : ''}">${equipo(p.a, ph)}</div><div class="tmp-marc font-display font-extrabold tabular-nums">${p.libre ? '<span class="text-[10px] text-gray-400 uppercase">pasa libre</span>' : marc}</div><div class="tmp-lado ${gan && gan === p.b?.nombre ? 'tmp-gana' : ''}">${equipo(p.b, ph)}</div></div>`; }).join('')}</div>`).join('');
    const camp = k.campeon ? `<p class="text-sm text-gray-200"><i class="fa-solid fa-crown text-gold-400 mr-1.5"></i>Campeón: <b class="text-white">${escapeHTML(k.campeon.nombre)}</b></p>` : '';
    return `<div class="grid gap-6 ${k.rondas.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} sm:grid-cols-1">${cols}</div>${camp}`;
  };

  const pintar = () => {
    try {
      const { cfg, avisos } = normalizarConfig(estado, n1, n2); Object.assign(estado, cfg);
      CONTROLES.forEach((c) => { const o = $(`c-${c.k}`); if (o) o.textContent = String(estado[c.k]); });
      $('tmp-d1').innerHTML = tabla(datos.d1, 1, cfg, datos.nombres.d1, datos.edicion1 ? escapeHTML(datos.edicion1) : '');
      $('tmp-d2').innerHTML = tabla(datos.d2, 2, cfg, datos.nombres.d2, datos.demo2 ? 'Datos de ejemplo' : '');
      const r = resolverAscensos(nombres(datos.d1), nombres(datos.d2), cfg.suben);
      $('tmp-cierre').innerHTML = cierre(r);
      const clas = clasificadosCopa(nombres(datos.d1), nombres(datos.d2), cfg.copa1, cfg.copa2);
      const k = construirCopa(clas, datos.resultados ?? {});
      $('tmp-copa').innerHTML = `<h2 class="font-display font-bold text-base text-white uppercase tracking-widest"><i class="fa-solid fa-trophy text-galaxy-400 mr-2"></i>${escapeHTML(datos.nombres.copa)}</h2>${cuadro(k)}`;
      const todos = [...avisos, ...r.avisos, ...k.avisos.filter((a) => clas.length < 2 && a)];
      $('tmp-avisos').innerHTML = [...new Set(todos)].map((a) => `<span class="block"><i class="fa-solid fa-circle-info mr-1.5"></i>${escapeHTML(a)}</span>`).join('');
    } catch (err) {
      console.error('[temporada] no se pudo calcular el sistema:', err);
      $('tmp-avisos').textContent = 'Ocurrió un error al calcular. Recarga la página.';
    }
  };

  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-paso]'); if (!b) return;
    const [k, d] = b.dataset.paso.split(':'); const c = CONTROLES.find((x) => x.k === k); if (!c) return;
    estado[k] = Math.min(c.max(), Math.max(0, estado[k] + Number(d))); pintar();
  });
  pintarControles(); pintar();
}
