// Página «Formatos»: genera cruces con core/formatos.js y muestra retos/ruleta de core/retos.js. Sin red ni base de datos.
import { escapeHTML as esc } from '../core/dom.js';
import { FORMATOS, formatoPorId, generar, limpiarJugadores, mezclar, etiquetaSlot, jugarColina, retarEscalera } from '../core/formatos.js';
import { RETOS_DIARIOS, REGLAS_RULETA, NOCHES_TEMATICAS } from '../../data/modalidades.js';
import { retoDelDia, retoSemanal, girarRuleta, nocheTematica } from '../core/retos.js';

const $ = (id) => document.getElementById(id);
const st = { formato: 'eliminacion', res: null };

function hoy() {
  const d = retoDelDia(RETOS_DIARIOS); const s = retoSemanal(RETOS_DIARIOS); const n = nocheTematica(NOCHES_TEMATICAS);
  $('fm-reto-t').textContent = d.titulo; $('fm-reto-x').textContent = d.texto;
  $('fm-sem-t').textContent = s.titulo; $('fm-sem-x').textContent = s.texto;
  $('fm-noche-t').textContent = n.nombre; $('fm-noche-x').textContent = n.texto;
}

function nombresDelCuadro() { return limpiarJugadores($('fm-jugadores').value.split('\n')); }
function actualizarCuenta() { $('fm-cuenta').textContent = String(nombresDelCuadro().length); }
function avisar(texto) { const a = $('fm-aviso'); a.hidden = !texto; a.textContent = texto ?? ''; }

function lado(s) { const t = etiquetaSlot(s); return `<span class="${typeof s === 'string' ? 'fm-nombre' : 'fm-ref'}">${esc(t)}</span>`; }
function partido(m) {
  if (m.bye) return `<li class="fm-partido fm-bye"><span class="fm-id">${esc(m.id)}</span>${lado(m.a ?? m.b)}<em>pasa directo</em></li>`;
  return `<li class="fm-partido${m.tercerPuesto ? ' fm-tercero' : ''}"><span class="fm-id">${esc(m.id)}</span>${lado(m.a)}<b>vs</b>${lado(m.b)}${m.tercerPuesto ? '<em>3.er puesto</em>' : ''}</li>`;
}
function rondas(lista) {
  return lista.map((r) => `<section class="fm-ronda"><h3>${esc(r.nombre)}</h3><ul>${r.partidos.map(partido).join('')}</ul>${r.descansa ? `<p class="fm-descansa">Descansa: ${esc(r.descansa)}</p>` : ''}</section>`).join('');
}

function pintarColina() {
  const e = st.res.estado; const retador = e.cola[0];
  const coronas = Object.entries(e.coronas).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<li>${esc(n)} <b>${c}</b></li>`).join('') || '<li>Aún nadie.</li>';
  return `<div class="fm-colina"><div class="fm-trono"><span class="fm-etiqueta">Campeón</span><b>${esc(e.campeon)}</b><small>Racha ${e.racha} de ${e.maxRacha}</small></div>
    <div class="fm-vs">vs</div><div class="fm-trono fm-retador"><span class="fm-etiqueta">Retador</span><b>${esc(retador)}</b><small>Siguen: ${esc(e.cola.slice(1).join(', ') || '—')}</small></div></div>
    <div class="fm-botones"><button type="button" class="btn btn-primary" data-colina="${esc(e.campeon)}">Gana ${esc(e.campeon)}</button><button type="button" class="btn btn-ghost" data-colina="${esc(retador)}">Gana ${esc(retador)}</button></div>
    <h3 class="fm-sub">Coronas</h3><ul class="fm-coronas">${coronas}</ul>`;
}
function pintarEscalera() {
  const o = st.res.orden;
  return `<ol class="fm-escalera">${o.map((n, i) => `<li><span class="fm-pos">${i + 1}</span>${esc(n)}</li>`).join('')}</ol>
    <p class="fm-ayuda">Prueba un reto: elige quién reta, a quién y quién ganó. Solo se puede retar hasta 3 puestos por encima.</p>
    <div class="fm-form-escalera"><select id="fm-esc-a" aria-label="Retador">${o.map((n) => `<option>${esc(n)}</option>`).join('')}</select><select id="fm-esc-b" aria-label="Retado">${o.map((n) => `<option>${esc(n)}</option>`).join('')}</select>
    <select id="fm-esc-g" aria-label="Ganador"><option value="a">Gana el retador</option><option value="b">Gana el retado</option></select><button type="button" id="fm-esc-ok" class="btn btn-ghost">Aplicar</button></div>`;
}
function pintarCircuito() {
  return `<p class="fm-ayuda">Cada fecha reparte puntos según el puesto final. Con este baremo:</p><ol class="fm-baremo">${st.res.baremo.map((p, i) => `<li><span>${i + 1}.º</span><b>${p}</b></li>`).join('')}</ol>`;
}

function pintar() {
  const r = st.res; const cont = $('fm-resultado');
  if (!r) { cont.innerHTML = ''; return; }
  const resumen = `<p class="fm-resumen"><b>${esc(r.formato.nombre)}</b> · ${r.jugadores.length} jugadores${r.totalPartidos ? ` · ${r.totalPartidos} partidos` : ''}${r.totalRondas ? ` · ${r.totalRondas} rondas` : ''}</p>`;
  const notas = r.notas.map((n) => `<li>${esc(n)}</li>`).join('');
  let cuerpo = '';
  if (r.tipo === 'grupos') {
    cuerpo = `<div class="fm-grupos">${r.grupos.map((g) => `<article class="fm-grupo"><h3>Grupo ${esc(g.grupo)}</h3><p>${g.jugadores.map(esc).join(' · ')}</p><details><summary>${g.fechas.length} fechas</summary>${rondas(g.fechas)}</details></article>`).join('')}</div><h3 class="fm-sub">Playoffs</h3><div class="fm-llave">${rondas(r.rondas)}</div>`;
  } else if (r.tipo === 'colina') cuerpo = pintarColina();
  else if (r.tipo === 'escalera') cuerpo = pintarEscalera();
  else if (r.tipo === 'circuito') cuerpo = pintarCircuito();
  else cuerpo = `<div class="${r.tipo === 'llave' ? 'fm-llave' : 'fm-fechas'}">${rondas(r.rondas)}</div>`;
  cont.innerHTML = `${resumen}${cuerpo}<ul class="fm-notas">${notas}</ul>`;
}

function elegirFormato(id) {
  st.formato = id; st.res = null;
  document.querySelectorAll('.fm-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.formato === id)));
  const f = formatoPorId(id);
  $('fm-frase').innerHTML = `<b>${esc(f.frase)}</b> ${esc(f.cuando)} <span>(${f.exacto ? f.exacto.join(', ') : `${f.min} a ${f.max}`} jugadores)</span>`;
  $('fm-tercer').parentElement.hidden = !['eliminacion', 'grupos'].includes(id);
  avisar(null); pintar();
}

function armar() {
  let js = nombresDelCuadro();
  if ($('fm-sortear').checked) js = mezclar(js, Date.now() % 1e6);
  const r = generar(st.formato, js, { tercerPuesto: $('fm-tercer').checked });
  if (!r.ok) { avisar(r.motivo); st.res = null; pintar(); return; }
  avisar(null); st.res = r; pintar();
}

document.addEventListener('click', (ev) => {
  const chip = ev.target.closest('.fm-chip'); if (chip) { elegirFormato(chip.dataset.formato); return; }
  if (ev.target.closest('#fm-generar')) { armar(); return; }
  if (ev.target.closest('#fm-ejemplo')) { $('fm-jugadores').value = ['Fralex', 'Mirko', 'Hugo', 'Nico', 'Diego', 'Luis', 'Andrés', 'Pablo'].join('\n'); actualizarCuenta(); return; }
  if (ev.target.closest('#fm-girar')) { const [regla] = girarRuleta(REGLAS_RULETA, Math.floor(Math.random() * 1e9)); const p = $('fm-ruleta-x'); p.textContent = regla; p.classList.remove('fm-pop'); void p.offsetWidth; p.classList.add('fm-pop'); return; }
  const c = ev.target.closest('[data-colina]');
  if (c && st.res?.tipo === 'colina') { st.res.estado = jugarColina(st.res.estado, c.dataset.colina); pintar(); return; }
  if (ev.target.closest('#fm-esc-ok') && st.res?.tipo === 'escalera') {
    const a = $('fm-esc-a').value; const b = $('fm-esc-b').value; const g = $('fm-esc-g').value === 'a' ? a : b;
    const out = retarEscalera(st.res.orden, a, b, g);
    if (!out.ok) { avisar(out.motivo); return; }
    avisar(null); st.res.orden = out.orden; pintar();
  }
});
$('fm-jugadores').addEventListener('input', actualizarCuenta);

hoy(); elegirFormato('eliminacion'); actualizarCuenta();
void FORMATOS;
