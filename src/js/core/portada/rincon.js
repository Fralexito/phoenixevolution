// «TU RINCÓN» (perfil propio, rediseño 27-oct-2026). Lógica pura: con tus nombres posibles (usuario, nombre visible, ficha)
// busca si juegas la Galaxy League, tu puesto y tu próximo partido. Sin DOM ni Supabase. Pruebas: tests/rincon.test.mjs
import { calcularTabla } from '../competicion/tabla.js';
import { proximoPartido, nombreEnLiga, puestoDe } from './pase.js';

/**
 * @param {string[]} candidatos  nombres con los que te pueden haber anotado en la liga
 * @param {{fechas?:Array, clubes?:Object, jugadores?:string[]}|null} ed  edición en curso
 * @returns {{enLiga:false} | {enLiga:true, nombre:string, club:string|null, puesto:{puesto:number,de:number,fila:Object}|null, proximo:{fecha:number,rival:string,local:boolean,clubRival:string|null}|null}}
 */
export function datosRincon(candidatos, ed) {
  const fechas = ed?.fechas ?? [];
  const nombres = [...new Set([...(ed?.jugadores ?? []), ...Object.keys(ed?.clubes ?? {}), ...fechas.flatMap((f) => (f.partidos ?? []).flatMap((m) => [m.l, m.v]))])];
  const nombre = nombreEnLiga(nombres, candidatos);
  if (!nombre) return { enLiga: false };
  const tabla = calcularTabla(fechas.flatMap((f) => f.partidos ?? [])).tabla;
  const px = proximoPartido(fechas, nombre);
  return {
    enLiga: true, nombre, club: ed?.clubes?.[nombre] ?? null,
    puesto: puestoDe(tabla, [nombre]),
    proximo: px ? { ...px, clubRival: ed?.clubes?.[px.rival] ?? null } : null,
  };
}
