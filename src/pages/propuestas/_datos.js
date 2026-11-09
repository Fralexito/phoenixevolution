// Datos compartidos de las PROPUESTAS de «descentralizar la Galaxy» (oct-2026).
// Archivo con «_» delante: Astro no lo publica como página. Solo lo usan las páginas de /propuestas/.
// Todo sale de los datos reales (LIGAS + EDICIONES + PODIO); nada inventado salvo la tarjeta «Tu liga aquí».
import { LIGAS } from '../../data/ligas.js';
import { EDICIONES } from '../../data/ligaResultados.js';
import { PODIO } from '../../data/palmares.js';
import { calcularTabla } from '../../js/core/competicion/tabla.js';

// Color de cada liga (chip, borde y brillo). Si llega una liga nueva sin color, usa el violeta de la marca.
const COLORES = { galaxy: '#00e5ff', sudario: '#f59e0b' };
const FUNDADORA = 'galaxy';

const jugados = (p) => p.gl !== null && p.gl !== undefined && p.gv !== null && p.gv !== undefined;

export const LIGAS_P = LIGAS.map((liga) => {
  const ed = (EDICIONES[liga.id] ?? []).find((e) => e.estado === 'en_curso') ?? (EDICIONES[liga.id] ?? [])[0] ?? null;
  const fechas = ed?.fechas ?? [];
  const partidos = fechas.flatMap((f) => f.partidos.map((p) => ({ ...p, fecha: f.n })));
  const tabla = partidos.length
    ? calcularTabla(partidos).tabla.filter((t) => t.pj > 0)
    : (ed?.tablaOficial ?? []);
  const ultimaJugada = [...fechas].reverse().find((f) => f.partidos.some(jugados));
  const proxima = fechas.find((f) => f.partidos.some((p) => !jugados(p)));
  return {
    id: liga.id,
    nombre: liga.titulo.join(' '),
    titulo: liga.titulo,
    juego: liga.juego,
    icono: liga.icono,
    imagen: liga.imagen,
    sede: liga.sede,
    organizador: liga.organizador,
    division: liga.division ?? '',
    estado: liga.estado,
    color: COLORES[liga.id] ?? '#8000ff',
    fundadora: liga.id === FUNDADORA,
    edicion: ed ? `${ed.nombre} · ${ed.temporada}` : '',
    fase: ed?.fase ?? '',
    clubes: ed?.clubes ?? {},
    tabla,
    lider: tabla[0] ?? null,
    resultados: (ultimaJugada?.partidos ?? []).filter(jugados).map((p) => ({ ...p, fecha: ultimaJugada.n })),
    proximos: (proxima?.partidos ?? []).filter((p) => !jugados(p)).map((p) => ({ ...p, fecha: proxima.n })),
    href: `liga/#liga-${liga.id}`,
  };
}).sort((a, b) => Number(b.fundadora) - Number(a.fundadora));   // la fundadora siempre primera

// «Jornada global»: resultados y próximos de TODAS las ligas mezclados, cada uno con el chip de su liga.
export const JORNADA = {
  resultados: LIGAS_P.flatMap((l) => l.resultados.slice(0, 4).map((p) => ({ ...p, liga: l }))),
  proximos: LIGAS_P.flatMap((l) => l.proximos.slice(0, 4).map((p) => ({ ...p, liga: l }))),
};

// Campeones: hoy solo hay podio de la Galaxy; las demás ligas muestran «En disputa» con su líder actual.
export const CAMPEONES_P = LIGAS_P.map((l) => {
  const oro = l.fundadora ? PODIO.find((c) => c.gold) : null;
  return oro
    ? { liga: l, dt: oro.dt, club: oro.club, copa: oro.copa, vigente: true }
    : { liga: l, dt: l.lider?.nombre ?? '—', club: l.clubes[l.lider?.nombre] ?? '', copa: 'Líder actual', vigente: false };
});

export const PROPUESTAS = [
  { id: 'a', nombre: 'A · Vitrina de ligas', lema: 'Todas las ligas en tarjetas iguales; la Galaxy primera y con sello.' },
  { id: 'b', nombre: 'B · Marcador global', lema: 'Estilo portal deportivo: la jornada de todas las ligas manda.' },
  { id: 'c', nombre: 'C · Elige tu liga', lema: 'Cada visitante elige su liga; por defecto, la Galaxy.' },
];

