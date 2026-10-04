// Países para el perfil (perfiles.pais_codigo = código ISO de 2 letras). Para añadir uno: una línea aquí.
export const PAISES = [
  ['PE', 'Perú'], ['AR', 'Argentina'], ['BO', 'Bolivia'], ['BR', 'Brasil'], ['CL', 'Chile'], ['CO', 'Colombia'],
  ['CR', 'Costa Rica'], ['CU', 'Cuba'], ['EC', 'Ecuador'], ['SV', 'El Salvador'], ['ES', 'España'], ['US', 'Estados Unidos'],
  ['GT', 'Guatemala'], ['HN', 'Honduras'], ['MX', 'México'], ['NI', 'Nicaragua'], ['PA', 'Panamá'], ['PY', 'Paraguay'],
  ['DO', 'Rep. Dominicana'], ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['PR', 'Puerto Rico'], ['XX', 'Otro'],
];
export const paisNombre = (code) => PAISES.find(([c]) => c === code)?.[1] ?? '';
