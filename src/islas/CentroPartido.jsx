// Isla de React (ronda 340, PRUEBA). Datos inventados. La lógica (marcador al minuto N) vive en core/centroPartido.js (sin React, con test).
import { useMemo, useState } from 'react';
import { marcadorAl, eventosHasta, estadisticasAl } from '../js/core/centroPartido.js';

const PESTANAS = [['resumen', 'Resumen'], ['stats', 'Estadísticas'], ['alin', 'Alineaciones']];
const ICONO = { gol: 'ph-soccer-ball', amarilla: 'ph-cards', roja: 'ph-cards', cambio: 'ph-arrows-left-right' };

export default function CentroPartido({ partido }) {
  const [min, setMin] = useState(0);
  const [pestana, setPestana] = useState('resumen');
  const [lado, setLado] = useState('local');
  const marc = useMemo(() => marcadorAl(partido.eventos, min), [partido, min]);
  const evs = useMemo(() => eventosHasta(partido.eventos, min), [partido, min]);
  const st = useMemo(() => estadisticasAl(partido.stats, min, partido.duracion), [partido, min]);
  const fin = min >= partido.duracion;
  const saltar = (m) => setMin(Math.max(0, Math.min(partido.duracion, m)));
  const proximo = partido.eventos.find((e) => e.min > min);

  return (
    <div className="space-y-3">
      <section className="glass-panel rounded-2xl p-4 border-l-4 border-galaxy-400">
        <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-gray-300">
          <span>{partido.competicion}</span>
          <span className={fin ? 'text-gray-300' : 'text-emerald-300'}>{fin ? 'Final' : min === 0 ? 'Por empezar' : `Min ${min}'`}</span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="text-right font-display font-extrabold text-white uppercase text-sm sm:text-lg">{partido.local.nombre}</p>
          <p className="font-display font-extrabold text-3xl sm:text-5xl text-white tabular-nums px-3 py-1 rounded-xl bg-black/40" aria-live="polite">{marc.local} - {marc.visita}</p>
          <p className="font-display font-extrabold text-white uppercase text-sm sm:text-lg">{partido.visita.nombre}</p>
        </div>
        <div className="mt-4">
          <input type="range" min="0" max={partido.duracion} value={min} onChange={(e) => saltar(+e.target.value)} className="w-full accent-cyan-400" aria-label="Minuto del partido" />
          <div className="relative h-4 -mt-1" aria-hidden="true">
            {partido.eventos.filter((e) => e.tipo === 'gol').map((e, i) => (
              <span key={i} className="absolute top-0 w-1.5 h-3 rounded bg-galaxy-400" style={{ left: `calc(${(e.min / partido.duracion) * 100}% - 3px)` }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button type="button" className="btn-ghost px-3 py-2 text-xs uppercase tracking-widest" onClick={() => saltar(min - 5)}>−5 min</button>
            <button type="button" className="btn-primary px-3 py-2 text-xs uppercase tracking-widest" onClick={() => saltar(min + 5)}>+5 min</button>
            <button type="button" className="btn-ghost px-3 py-2 text-xs uppercase tracking-widest" disabled={!proximo} onClick={() => proximo && saltar(proximo.min)}>Siguiente jugada</button>
            <button type="button" className="btn-ghost px-3 py-2 text-xs uppercase tracking-widest" onClick={() => saltar(0)}>Reiniciar</button>
          </div>
        </div>
      </section>

      <nav className="flex gap-1 glass-panel rounded-xl p-1" role="tablist" aria-label="Secciones del partido">
        {PESTANAS.map(([id, t]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs uppercase tracking-widest font-bold transition-colors ${pestana === id ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'}`}>{t}</button>
        ))}
      </nav>

      {pestana === 'resumen' && (
        <ol className="glass-panel rounded-2xl p-3 space-y-2">
          {evs.length === 0 && <li className="text-xs text-gray-300 p-2">Aún no pasó nada. Mueve la barra o pulsa «+5 min».</li>}
          {evs.map((e, i) => (
            <li key={`${e.min}-${i}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 bg-black/30 ${e.lado === 'local' ? '' : 'flex-row-reverse text-right'}`}>
              <span className="text-xs font-bold text-galaxy-400 tabular-nums w-9">{e.min}'</span>
              <i className={`ph-bold ${ICONO[e.tipo] || 'ph-circle'} ${e.tipo === 'roja' ? 'text-red-400' : e.tipo === 'amarilla' ? 'text-yellow-300' : 'text-white'}`} aria-hidden="true" />
              <span className="text-sm text-white"><b>{e.jugador}</b> <span className="text-xs text-gray-300">{e.texto}</span></span>
            </li>
          ))}
        </ol>
      )}

      {pestana === 'stats' && (
        <div className="glass-panel rounded-2xl p-4 space-y-4">
          {st.map((f) => {
            const total = f.local + f.visita || 1;
            return (
              <div key={f.id}>
                <div className="flex justify-between text-sm text-white tabular-nums"><b>{f.local}{f.sufijo}</b><span className="text-xs uppercase tracking-widest text-gray-300">{f.nombre}</span><b>{f.visita}{f.sufijo}</b></div>
                <div className="flex h-2 mt-1 rounded overflow-hidden bg-black/40">
                  <div className="bg-galaxy-400 transition-[flex-grow] duration-300" style={{ flexGrow: f.local / total }} />
                  <div className="bg-purple-500 transition-[flex-grow] duration-300" style={{ flexGrow: f.visita / total }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pestana === 'alin' && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex gap-2 mb-3">
            {['local', 'visita'].map((l) => (
              <button key={l} type="button" onClick={() => setLado(l)} className={`px-3 py-2 rounded-lg text-xs uppercase tracking-widest font-bold ${lado === l ? 'bg-cyan-400 text-black' : 'bg-black/40 text-gray-200'}`}>{partido[l].nombre}</button>
            ))}
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {partido[lado].alineacion.map((j) => (
              <li key={j.n} className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2">
                <span className="w-8 h-8 grid place-items-center rounded-full bg-purple-600/70 text-xs font-bold text-white">{j.n}</span>
                <span className="text-sm text-white">{j.nombre}</span><span className="ml-auto text-xs text-gray-300 uppercase">{j.pos}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400">Prueba de React: datos inventados. Nada se mueve solo; todo responde a ti.</p>
    </div>
  );
}
