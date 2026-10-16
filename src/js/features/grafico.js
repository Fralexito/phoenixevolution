// Gráficos livianos (uPlot, se carga solo al pintar uno). Uso: pintarLinea(div, { x: [1,2,3], series: [{ nombre: 'Puntos', datos: [3,6,9] }] })
const COLORES = ['#00e5ff', '#7c3aed', '#fbbf24', '#00ff85'];
export async function pintarLinea(el, { x, series, alto = 160 }) {
  const { default: uPlot } = await import('uplot'); // los estilos viven en styles/uplot.css
  const ancho = Math.max(240, el.clientWidth || 320);
  const opts = {
    width: ancho, height: alto, legend: { show: series.length > 1 }, cursor: { drag: { x: false, y: false } },
    scales: { x: { time: false } },
    axes: [{ stroke: '#94a3b8', grid: { stroke: 'rgb(255 255 255 / .06)' }, font: '12px Rajdhani, sans-serif' }, { stroke: '#94a3b8', grid: { stroke: 'rgb(255 255 255 / .06)' }, font: '12px Rajdhani, sans-serif' }],
    series: [{ label: 'Fecha' }, ...series.map((s, i) => ({ label: s.nombre, stroke: COLORES[i % COLORES.length], width: 2, points: { show: false } }))],
  };
  el.replaceChildren();
  return new uPlot(opts, [x, ...series.map((s) => s.datos)], el);
}
